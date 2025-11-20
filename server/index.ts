import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { notifySystemError } from "./lib/notification-service";
import { emailScheduler } from "./lib/email-scheduler";
import fileUpload from "express-fileupload";
import Stripe from "stripe";
import * as creditService from "./services/credit-service";
import { db } from "./db";
import { creditTransactions } from "@shared/schema";
import { sql } from "drizzle-orm";

const app = express();

// ------------------------
// STRIPE WEBHOOK (MUST COME FIRST)
// ------------------------
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      const sig = req.headers["stripe-signature"];
      
      if (!sig) {
        console.error("❌ Webhook error: Missing stripe-signature header");
        return res.status(400).send("Missing signature");
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2025-11-17.clover",
      });

      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );

      console.log("🔥 WEBHOOK RECEIVED:", event.type);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        const metadata = session.metadata || {};
        const credits = Number(metadata.credits || 0);
        const organizationId = metadata.organizationId;
        const type = metadata.type || "unknown";

        console.log("🔥 Adding credits:", {
          organizationId,
          credits,
          type,
          sessionId: session.id,
        });

        if (!organizationId || !credits) {
          console.error("❌ Missing required metadata:", { organizationId, credits });
          return res.status(400).send("Missing metadata");
        }

        // Idempotency check
        const paymentIntentId = session.payment_intent?.toString() || '';
        const existingTransaction = await db.select()
          .from(creditTransactions)
          .where(
            sql`(${creditTransactions.metadata}->>'stripe_session_id' = ${session.id} 
                 OR ${creditTransactions.metadata}->>'stripe_payment_intent' = ${paymentIntentId})`
          )
          .limit(1);

        if (existingTransaction.length > 0) {
          console.log(`⚠️  Session ${session.id} already processed, skipping duplicate`);
          return res.status(200).send("ok");
        }

        await creditService.addCredits(Number(organizationId), credits, "topup", {
          source: "stripe",
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          bundle_type: type,
          amount_total: session.amount_total,
          currency: session.currency,
        });

        console.log(`✅ Successfully added ${credits} credits to organization ${organizationId}`);
        return res.status(200).send("ok");
      }

      console.log("ℹ️  Ignoring event type:", event.type);
      return res.status(200).send("ignored");
    } catch (err) {
      console.error("❌ Webhook error:", err);
      return res.status(400).send("Webhook Error");
    }
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  useTempFiles: false,
  abortOnLimit: true
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Only log server errors (status 500) to the admin notification system
    if (status === 500) {
      notifySystemError(
        err instanceof Error ? err : new Error(message),
        `Global Error Handler - ${req.method} ${req.path}`,
        {
          url: req.url,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          timestamp: new Date().toISOString(),
          statusCode: status
        }
      ).catch(notifError => console.error("Failed to send error notification:", notifError));
    }

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start the email scheduler
    emailScheduler.start(30000); // Check every 30 seconds
    log("Email scheduler started");
  });
})();
