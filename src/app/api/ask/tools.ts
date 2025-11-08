import type { RunnableToolFunctionWithParse } from "openai/lib/RunnableFunction.mjs";
import type { RunnableToolFunctionWithoutParse } from "openai/lib/RunnableFunction.mjs";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import GoogleImages from "google-images";
import type { JSONSchema } from "openai/lib/jsonschema.mjs";
import { MCPClient } from "./mcpClient";

const client = new GoogleImages(
  process.env.GOOGLE_CSE_ID!,
  process.env.GOOGLE_API_KEY!,
);

type ThinkingStateCallback = (title: string, description: string) => void;

// Global MCP client instance
let mcpClient: MCPClient | null = null;

export function getImageSearchTool(
  writeThinkItem?: ThinkingStateCallback,
): RunnableToolFunctionWithParse<{ altText: string }> {
  return {
    type: "function",
    function: {
      name: "getImageSrc",
      description: "Get the image src for the given alt text",
      parse: JSON.parse,
      parameters: zodToJsonSchema(
        z.object({
          altText: z.string().describe("The alt text of the image"),
        }),
      ) as JSONSchema,
      function: async ({ altText }: { altText: string }) => {
        // Write thinking state when image search tool is called
        if (writeThinkItem) {
          writeThinkItem(
            "Searching for images...",
            `Finding the perfect image for your canvas.`,
          );
        }

        const results = await client.search(altText, {
          size: "huge",
        });
        return results[0].url;
      },
      strict: true,
    },
  };
}

// Initialize MCP client
async function getMCPClient(): Promise<MCPClient> {
  if (!mcpClient) {
    mcpClient = new MCPClient();
    await mcpClient.connect();
  }
  return mcpClient;
}

// Create MCP tool wrappers
function createMCPToolWrappers(
  mcpTools: ChatCompletionTool[],
  writeThinkItem?: ThinkingStateCallback
): RunnableToolFunctionWithParse<Record<string, unknown>>[] {
  return mcpTools.map((mcpTool) => ({
    type: "function" as const,
    function: {
      name: mcpTool.function.name,
          description: mcpTool.function.description || "No description available",
      parse: JSON.parse,
      parameters: (mcpTool.function.parameters || {}) as JSONSchema,
      function: async (args: Record<string, unknown>) => {
        // Write thinking state when MCP tool is called
        if (writeThinkItem) {
          writeThinkItem(
            `Using ${mcpTool.function.name}...`,
            `Calling external tool: ${mcpTool.function.description}`,
          );
        }

        const client = await getMCPClient();
        const tool_call_id = `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
          const result = await client.runTool({
            tool_call_id,
            name: mcpTool.function.name,
            args,
          });
          
          // Parse the result content to return the actual data
          const parsedContent = JSON.parse(result.content);
          return parsedContent;
        } catch (error) {
          console.error(`Error in MCP tool ${mcpTool.function.name}:`, error);
          throw error;
        }
      },
      strict: true,
    },
  }));
}

// Enhanced tools function that includes MCP tools
export async function getTools(
  writeThinkItem?: ThinkingStateCallback
): Promise<RunnableToolFunctionWithParse<Record<string, unknown>>[]> {
  const tools: RunnableToolFunctionWithParse<Record<string, unknown>>[] = [
    getImageSearchTool(writeThinkItem) as unknown as RunnableToolFunctionWithParse<Record<string, unknown>>,
  ];
  
  try {
    const mcpClient = await getMCPClient();
    const mcpToolWrappers = createMCPToolWrappers(mcpClient.tools, writeThinkItem);
    tools.push(...mcpToolWrappers);
  } catch (error) {
    console.error("Failed to load MCP tools:", error);
    // Continue without MCP tools if connection fails
  }
  
  return tools;
}

// Default tools without thinking states for backwards compatibility
export const tools: (
  | RunnableToolFunctionWithoutParse
  | RunnableToolFunctionWithParse<{ altText: string }>
)[] = [getImageSearchTool()];
