import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type OpenAI from "openai";
import { logger } from "@/utils/logger";

export type MCPTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

// Dynamic tool name formatter - works with any tool name format
function formatToolName(toolName: string): string {
  if (!toolName || typeof toolName !== "string") {
    return "Unknown Tool";
  }

  // Handle any separator pattern dynamically
  const separators = /[_\-\s]+/;

  // Split on any separator, filter out empty strings
  const words = toolName.split(separators).filter((word) => word.length > 0);

  // Capitalize each word (handle empty strings safely)
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function truncateDescription(description?: string): string {
  if (!description) {
    return "No description available";
  }
  return `${description.split(".")[0]}.`;
}

export class MCPClient {
  private tavilyClient: Client;
  private remoteClient: Client;
  private manifoldClient: Client;
  private tavilyTransport: StreamableHTTPClientTransport | null = null;
  private remoteTransport: StreamableHTTPClientTransport | null = null;
  private manifoldTransport: StreamableHTTPClientTransport | null = null;
  tools: OpenAI.ChatCompletionTool[] = [];
  originalTools: OpenAI.ChatCompletionTool[] = [];
  private isTavilyConnected = false;
  private isRemoteConnected = false;
  private isManifoldConnected = false;

  constructor() {
    this.tavilyClient = new Client({
      name: "c1-chat-tavily-client",
      version: "1.0.0",
    });
    this.remoteClient = new Client({
      name: "c1-chat-remote-client",
      version: "1.0.0",
    });
    this.manifoldClient = new Client({
      name: "c1-chat-manifold-client",
      version: "1.0.0",
    });
  }

  async connect() {
    if (
      this.isTavilyConnected &&
      this.isRemoteConnected &&
      this.isManifoldConnected
    ) {
      return;
    }

    try {
      // Connect to Tavily
      if (!this.isTavilyConnected) {
        try {
          this.tavilyTransport = new StreamableHTTPClientTransport(
            new URL(
              "https://mcp.tavily.com/mcp/?tavilyApiKey=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"
            )
          );
          await this.tavilyClient.connect(this.tavilyTransport);
          const toolsResult = await this.tavilyClient.listTools();
          const tavilyTools = toolsResult.tools.map((tool) => {
            const toolName =
              (tool as any).name || (tool as any).id || "unknown";
            return {
              type: "function" as const,
              function: {
                name: toolName,
                description:
                  (tool as { description?: string }).description ||
                  "No description available",
                parameters: (tool as { inputSchema: Record<string, unknown> })
                  .inputSchema,
              },
            };
          });
          this.originalTools.push(...tavilyTools);
          const truncatedTavilyTools = tavilyTools.map((tool) => ({
            ...tool,
            function: {
              ...tool.function,
              description: truncateDescription(tool.function.description),
            },
          }));
          this.tools.push(...truncatedTavilyTools);
          this.isTavilyConnected = true;
        } catch (error) {
          console.error("Failed to connect to Tavily MCP server:", error);
        }
      }

      // Connect to Remote MCP server
      if (!this.isRemoteConnected) {
        try {
          this.remoteTransport = new StreamableHTTPClientTransport(
            new URL("https://remote.mcpservers.org/fetch/mcp")
          );
          await this.remoteClient.connect(this.remoteTransport);
          const remoteToolsResult = await this.remoteClient.listTools();
          const remoteTools = remoteToolsResult.tools.map((tool) => {
            const toolName =
              (tool as any).name || (tool as any).id || "unknown";
            return {
              type: "function" as const,
              function: {
                name: toolName,
                description:
                  (tool as { description?: string }).description ||
                  "No description available",
                parameters: (tool as { inputSchema: Record<string, unknown> })
                  .inputSchema,
              },
            };
          });
          this.originalTools.push(...remoteTools);
          const truncatedRemoteTools = remoteTools.map((tool) => ({
            ...tool,
            function: {
              ...tool.function,
              description: truncateDescription(tool.function.description),
            },
          }));
          this.tools.push(...truncatedRemoteTools);
          this.isRemoteConnected = true;
        } catch (error) {
          console.error("Failed to connect to Remote MCP server:", error);
        }
      }

      // Connect to Manifold MCP server
      if (!this.isManifoldConnected) {
        try {
          this.manifoldTransport = new StreamableHTTPClientTransport(
            new URL("https://api.manifold.markets/v0/mcp")
          );
          await this.manifoldClient.connect(this.manifoldTransport);
          const manifoldToolsResult = await this.manifoldClient.listTools();
          const manifoldTools = manifoldToolsResult.tools.map((tool) => {
            const toolName =
              (tool as any).name || (tool as any).id || "unknown";
            return {
              type: "function" as const,
              function: {
                name: toolName,
                description:
                  (tool as { description?: string }).description ||
                  "No description available",
                parameters: (tool as { inputSchema: Record<string, unknown> })
                  .inputSchema,
              },
            };
          });
          this.originalTools.push(...manifoldTools);
          const truncatedManifoldTools = manifoldTools.map((tool) => ({
            ...tool,
            function: {
              ...tool.function,
              description: truncateDescription(tool.function.description),
            },
          }));
          this.tools.push(...truncatedManifoldTools);
          this.isManifoldConnected = true;
        } catch (error) {
          console.error("Failed to connect to Manifold MCP server:", error);
        }
      }
    } catch (error) {
      console.error("Unexpected error during MCP connection:", error);
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
    if (!this.isClientConnected()) {
      throw new Error("MCP client not connected. Call connect() first.");
    }

    const displayName = formatToolName(name);
    logger.info(`Using ${displayName}`, "mcp-client", { args });

    try {
      let result;

      // Try Tavily client first
      if (this.isTavilyConnected) {
        try {
          result = await this.tavilyClient.callTool({
            name,
            arguments: args,
          });
        } catch (error) {
          // Tool not found on Tavily, try next client
        }
      }

      // Try Remote client
      if (!result && this.isRemoteConnected) {
        try {
          result = await this.remoteClient.callTool({
            name,
            arguments: args,
          });
        } catch (error) {
          // Tool not found on Remote, try next client
        }
      }

      // Try Manifold client
      if (!result && this.isManifoldConnected) {
        try {
          result = await this.manifoldClient.callTool({
            name,
            arguments: args,
          });
        } catch (error) {
          // Tool not found on Manifold
        }
      }

      if (!result) {
        const displayName = formatToolName(name);
        throw new Error(`${displayName} not found on any connected MCP server`);
      }

      return {
        tool_call_id,
        role: "tool" as const,
        content: JSON.stringify(result.content),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const displayName = formatToolName(name);
      logger.error(`${displayName} failed:`, "mcp-client", error);
      return {
        tool_call_id,
        role: "tool" as const,
        content: JSON.stringify({
          error: `${formatToolName(name)} call failed: ${errorMessage}`,
        }),
      };
    }
  }

  async disconnect() {
    const disconnectPromises = [];

    if (this.tavilyTransport) {
      disconnectPromises.push(
        this.tavilyTransport.close().then(() => {
          this.isTavilyConnected = false;
        })
      );
    }

    if (this.remoteTransport) {
      disconnectPromises.push(
        this.remoteTransport.close().then(() => {
          this.isRemoteConnected = false;
        })
      );
    }

    if (this.manifoldTransport) {
      disconnectPromises.push(
        this.manifoldTransport.close().then(() => {
          this.isManifoldConnected = false;
        })
      );
    }

    if (disconnectPromises.length > 0) {
      await Promise.all(disconnectPromises);
    }
  }

  isClientConnected(): boolean {
    return (
      this.isTavilyConnected ||
      this.isRemoteConnected ||
      this.isManifoldConnected
    );
  }

  getToolNames(): string[] {
    return this.tools.map((t) => t.function.name);
  }
}
