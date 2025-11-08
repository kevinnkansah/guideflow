import type { RunnableToolFunctionWithParse } from "openai/lib/RunnableFunction.mjs";
import type { RunnableToolFunctionWithoutParse } from "openai/lib/RunnableFunction.mjs";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import GoogleImages from "google-images";
import type { JSONSchema } from "openai/lib/jsonschema.mjs";
import { MCPClient } from "./mcpClient";
import { logger } from "@/utils/logger";

const client = new GoogleImages(
  process.env.GOOGLE_CSE_ID!,
  process.env.GOOGLE_API_KEY!,
);

type ThinkingStateCallback = (title: string, description: string) => void;

// Tool display configuration for better UX
interface ToolDisplayConfig {
  friendlyName: string;
  description: string;
  category: 'search' | 'data' | 'utility';
}

// Global MCP client instance
let mcpClient: MCPClient | null = null;

export function getImageSearchTool(
  writeThinkItem?: ThinkingStateCallback,
): RunnableToolFunctionWithParse<{ altText: string }> {
  return {
    type: "function",
    function: {
      name: "getImageSrc",
      description: "Get image src for the given alt text",
      parse: JSON.parse,
      parameters: zodToJsonSchema(
        z.object({
          altText: z.string().describe("The alt text of the image"),
        }),
      ) as JSONSchema,
      function: async ({ altText }: { altText: string }) => {
        logger.info(`Image Search Tool Called`, "tools", { altText });
        
        // Write thinking state when image search tool is called
        if (writeThinkItem) {
          writeThinkItem(
            "Searching for images...",
            `Finding the perfect image: "${altText}"`,
          );
        }

        try {
          const results = await client.search(altText, {
            size: "huge",
          });
          const imageUrl = results[0]?.url;
          logger.info(`Image Search Success`, "tools", { altText, imageUrl });
          return imageUrl;
        } catch (error) {
          logger.error(`Image Search Failed`, "tools", { altText, error });
          throw error;
        }
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

// Tool display configurations for better UX
const toolConfigs: Record<string, ToolDisplayConfig> = {
  getImageSrc: {
    friendlyName: "Image Search",
    description: "Find images from web",
    category: "search"
  },
  // Tavily MCP Tools
  tavily_search: {
    friendlyName: "Web Search",
    description: "Search web for real-time information",
    category: "search"
  },
  tavily_extract: {
    friendlyName: "Content Extract",
    description: "Extract content from web pages",
    category: "utility"
  },
  tavily_crawl: {
    friendlyName: "Web Crawler",
    description: "Crawl websites for detailed information",
    category: "search"
  },
  tavily_map: {
    friendlyName: "Map Search",
    description: "Search for location-based information",
    category: "search"
  },
};

// Create MCP tool wrappers with enhanced logging and UX
function createMCPToolWrappers(
  mcpTools: ChatCompletionTool[],
  writeThinkItem?: ThinkingStateCallback
): RunnableToolFunctionWithParse<Record<string, unknown>>[] {
  return mcpTools.map((mcpTool) => {
    const config = toolConfigs[mcpTool.function.name] || {
      friendlyName: mcpTool.function.name,
      description: mcpTool.function.description || "No description available",
      category: "utility" as const
    };

    return {
      type: "function" as const,
      function: {
        name: mcpTool.function.name,
        description: mcpTool.function.description || "No description available",
        parse: JSON.parse,
        parameters: (mcpTool.function.parameters || {}) as JSONSchema,
        function: async (args: Record<string, unknown>) => {
          logger.info(`${config.friendlyName} Tool Called: ${mcpTool.function.name}`, "tools", { args });
          
          // Write thinking state when MCP tool is called
          if (writeThinkItem) {
            writeThinkItem(
              `Using ${config.friendlyName}...`,
              `${config.description}`,
            );
          }

          const client = await getMCPClient();
          const tool_call_id = `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          
          try {
            const result = await client.runTool({
              tool_call_id,
              name: mcpTool.function.name,
              args,
            });
            
            // Parse result content to return actual data
            const parsedContent = JSON.parse(result.content);
            logger.info(`${config.friendlyName} Success: ${mcpTool.function.name}`, "tools");
            return parsedContent;
          } catch (error) {
            logger.error(`${config.friendlyName} Failed: ${mcpTool.function.name}`, "tools", error);
            throw error;
          }
        },
        strict: true,
      },
    };
  });
}

// Enhanced tools function that includes all tools
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
    
    logger.info(`Tools Loaded: ${tools.length} tools available`, "tools", {
      tools: tools.map(t => t.function.name),
      mcpTools: mcpClient.getToolNames()
    });
  } catch (error) {
    logger.error("Failed to load MCP tools", "tools", error);
    // Continue without MCP tools if connection fails
  }
  
  return tools;
}

// Default tools without thinking states for backwards compatibility
export const tools: (
  | RunnableToolFunctionWithoutParse
  | RunnableToolFunctionWithParse<{ altText: string }>
)[] = [getImageSearchTool()];