import { z } from "zod";

export interface ToolContext {
  organizationId: number;
}

export interface ToolDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  parameters: TSchema;
  execute: (args: z.infer<TSchema>, ctx: ToolContext) => Promise<unknown>;
}

export function defineTool<TSchema extends z.ZodTypeAny>(
  def: ToolDefinition<TSchema>,
): ToolDefinition<TSchema> {
  return def;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  registerAll(tools: ToolDefinition[]): void {
    for (const tool of tools) this.register(tool);
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async dispatch(
    name: string,
    rawArgs: unknown,
    ctx: ToolContext,
  ): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const parsed = tool.parameters.safeParse(rawArgs ?? {});
    if (!parsed.success) {
      throw new Error(
        `Invalid arguments for ${name}: ${parsed.error.message}`,
      );
    }
    return tool.execute(parsed.data, ctx);
  }
}
