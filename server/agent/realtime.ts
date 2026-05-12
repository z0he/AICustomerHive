import type { IncomingMessage, Server as HttpServer } from "http";
import type { Duplex } from "stream";
import type OpenAI from "openai";
import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { organizations } from "@shared/schema";
import { handleUserText } from "./brain";
import { REALTIME_PATH, type ClientEvent, type ServerEvent } from "./protocol";

const JWT_SECRET =
  process.env.JWT_SECRET || "super-secret-jwt-key-change-in-production";

interface SessionState {
  userId: number;
  organizationId: number;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
}

export function attachRealtimeServer(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    if (!req.url) return;

    const url = parseUpgradeUrl(req);
    if (!url || url.pathname !== REALTIME_PATH) return;

    const token = url.searchParams.get("token");
    if (!token) {
      reject(socket, 401, "Unauthorized");
      return;
    }

    let payload: { id: number };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { id: number };
    } catch {
      reject(socket, 401, "Unauthorized");
      return;
    }

    resolveOrgFromHost(req.headers.host || "")
      .then((organizationId) => {
        if (!organizationId) {
          reject(socket, 404, "Organization Not Found");
          return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          handleConnection(ws, {
            userId: payload.id,
            organizationId,
            messages: [],
          });
        });
      })
      .catch((err) => {
        console.error("[agent] org resolution failed:", err);
        reject(socket, 500, "Internal Server Error");
      });
  });

  console.log(`[agent] realtime WS attached at ${REALTIME_PATH}`);
}

function parseUpgradeUrl(req: IncomingMessage): URL | null {
  try {
    return new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`);
  } catch {
    return null;
  }
}

function reject(socket: Duplex, status: number, reason: string): void {
  socket.write(`HTTP/1.1 ${status} ${reason}\r\n\r\n`);
  socket.destroy();
}

async function resolveOrgFromHost(host: string): Promise<number | null> {
  const hostname = host.split(":")[0];

  let subdomain: string | null = null;
  let customDomain: string | null = null;

  if (hostname.includes("aicrm.co.uk")) {
    const parts = hostname.split(".");
    subdomain = parts.length > 2 ? parts[0] : "app";
  } else if (hostname.includes("replit")) {
    subdomain = "app";
  } else {
    customDomain = hostname;
  }

  let org: { id: number } | undefined;

  if (customDomain) {
    [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.customDomain, customDomain))
      .limit(1);
  } else if (subdomain) {
    [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.subdomain, subdomain))
      .limit(1);
  }

  if (!org) {
    [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, "default"))
      .limit(1);
  }

  return org?.id ?? null;
}

function handleConnection(ws: WebSocket, state: SessionState): void {
  const send = (event: ServerEvent) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  };

  send({ type: "ready" });

  ws.on("message", async (raw) => {
    let msg: unknown;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      send({ type: "error", message: "Invalid JSON" });
      return;
    }

    try {
      await routeMessage(msg as ClientEvent, state, send);
    } catch (err) {
      send({
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  ws.on("error", (err) => {
    console.error("[agent] ws error:", err);
  });
}

async function routeMessage(
  msg: ClientEvent,
  state: SessionState,
  send: (event: ServerEvent) => void,
): Promise<void> {
  if (msg?.type === "ping") {
    send({ type: "pong" });
    return;
  }

  if (msg?.type === "user.text" && typeof msg.text === "string") {
    await handleUserText(msg.text, {
      organizationId: state.organizationId,
      messages: state.messages,
      send,
    });
    return;
  }

  send({
    type: "error",
    message: `Unknown or malformed message: ${JSON.stringify(msg)}`,
  });
}
