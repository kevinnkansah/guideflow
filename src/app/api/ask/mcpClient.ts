import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type OpenAI from "openai";
import { logger } from "@/utils/logger";

export type MCPTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export class MCPClient {
  private readonly mcp: Client;
  private transport: StreamableHTTPClientTransport | null = null;
  tools: OpenAI.ChatCompletionTool[] = [];
  private isConnected = false;

  constructor() {
    this.mcp = new Client({ name: "c1-chat-mcp-client", version: "1.0.0" });
  }

  async connect() {
    if (this.isConnected) {
      logger.info("MCP client already connected", "mcp-client");
      return;
    }

    try {
      logger.info("Connecting to Tavily MCP server", "mcp-client");
      this.transport = new StreamableHTTPClientTransport(
        new URL("https://mcp.tavily.com/mcp/?tavilyApiKey=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"),
      );
      await this.mcp.connect(this.transport);
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => ({
        type: "function" as const,
        function: {
          name: (tool as { name: string }).name,
          description:
            (tool as { description?: string }).description ||
            "No description available",
          parameters: (tool as { inputSchema: Record<string, unknown> })
            .inputSchema,
        },
      }));
      this.isConnected = true;
      logger.info(
        `Connected with ${this.tools.length} tools: ${this.tools
          .map((t) => t.function.name)
          .join(", ")}`,
        "mcp-client",
      );
    } catch (error) {
      logger.error("Failed to connect to MCP server", "mcp-client", error);
      throw error;
    }
  }

  async runTool({
    tool_call_id,
    name,
    args,
  }: {
    tool_call_id: string;
    name: string;
    args: Record<string, unknown>;
  }) {
    if (!this.isConnected) {
      throw new Error("MCP client not connected. Call connect() first.");
    }

    logger.info(
      `Calling tool: ${name} with args`,
      "mcp-client",
      { args }
    );
    try {
      const result = await this.mcp.callTool({
        name,
        arguments: args,
      });
      logger.info(`Tool ${name} result received`, "mcp-client");
      return {
        tool_call_id,
        role: "tool" as const,
        content: JSON.stringify(result.content),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`Error calling tool ${name}:`, "mcp-client", error);
      return {
        tool_call_id,
        role: "tool" as const,
        content: JSON.stringify({
          error: `Tool call failed: ${errorMessage}`,
        }),
      };
    }
  }

  async disconnect() {
    if (this.transport) {
      await this.transport.close();
      this.isConnected = false;
      logger.info("MCP client disconnected", "mcp-client");
    }
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }

  getToolNames(): string[] {
    return this.tools.map((t) => t.function.name);
  }
}
