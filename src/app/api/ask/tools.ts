import GoogleImages from "google-images";
import type { JSONSchema } from "openai/lib/jsonschema.mjs";
import type {
  RunnableToolFunctionWithoutParse,
  RunnableToolFunctionWithParse,
} from "openai/lib/RunnableFunction.mjs";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

import { logger } from "@/utils/logger";
import { MCPClient } from "./mcpClient";

let googleImagesClient: GoogleImages | null = null;
function getGoogleImagesClient(): GoogleImages {
  const cseId = process.env.GOOGLE_CSE_ID;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!(cseId && apiKey)) {
    throw new Error("Missing GOOGLE_CSE_ID or GOOGLE_API_KEY");
  }
  if (!googleImagesClient) {
    googleImagesClient = new GoogleImages(cseId, apiKey);
  }
  return googleImagesClient;
}

type ThinkingStateCallback = (title: string, description: string) => void;

// Tool display configuration for better UX
type ToolDisplayConfig = {
  friendlyName: string;
  description: string;
  category: "search" | "data" | "utility";
};

// Global MCP client instance
let mcpClient: MCPClient | null = null;

export function getImageSearchTool(
  writeThinkItem?: ThinkingStateCallback
): RunnableToolFunctionWithParse<{ altText: string }> {
  return {
    type: "function",
    function: {
      name: "getImageSrc",
      description: "Get image src for the given alt text",
      parse: JSON.parse,
      parameters: {
        type: "object",
        properties: {
          altText: { type: "string", description: "The alt text of the image" },
        },
        required: ["altText"],
        additionalProperties: false,
      } as JSONSchema,
      function: async ({ altText }: { altText: string }) => {
        const displayName = formatToolName("getImageSrc");
        logger.info(`${displayName} Tool Called`, "tools", { altText });

        // Write thinking state when image search tool is called
        if (writeThinkItem) {
          writeThinkItem(
            "Searching for images...",
            `Finding the perfect image: "${altText}"`
          );
        }

        try {
          const results = await getGoogleImagesClient().search(altText, {
            size: "huge",
          });
          const imageUrl = results[0]?.url;
          logger.info("Image Search Success", "tools", { altText, imageUrl });
          return imageUrl;
        } catch (error) {
          logger.error("Image Search Failed", "tools", { altText, error });
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

// Dynamic tool display configurations - works with any tool name
function getToolConfig(
  toolName: string,
  description?: string
): ToolDisplayConfig {
  const friendlyName = formatToolName(toolName);
  const firstSentence = description
    ? `${description.split(".")[0]}.`
    : "No description available";

  return {
    friendlyName,
    description: firstSentence,
    category: "utility" as const, // Default category - no assumptions
  };
}

// Create MCP tool wrappers with enhanced logging and UX
function createMCPToolWrappers(
  mcpTools: ChatCompletionTool[],
  writeThinkItem?: ThinkingStateCallback
): RunnableToolFunctionWithParse<Record<string, unknown>>[] {
  return mcpTools.map((mcpTool) => {
    // Dynamic tool configuration - works with any tool name
    const config = getToolConfig(
      mcpTool.function.name,
      mcpTool.function.description
    );
    const description =
      mcpTool.function.description || "No description available";
    const firstSentence = `${description.split(".")[0]}.`;

    return {
      type: "function" as const,
      function: {
        name: mcpTool.function.name,
        description: firstSentence,
        parse: JSON.parse,
        parameters: (mcpTool.function.parameters || {}) as JSONSchema,
        function: async (args: Record<string, unknown>) => {
          const displayName = formatToolName(mcpTool.function.name);
          logger.info(`${displayName} Tool Called`, "tools", { args });

          // Write thinking state when MCP tool is called
          if (writeThinkItem) {
            writeThinkItem(`Using ${displayName}...`, `${config.description}`);
          }

          const mcp = await getMCPClient();
          const tool_call_id = `mcp_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 11)}`;

          try {
            const result = await mcp.runTool({
              tool_call_id,
              name: mcpTool.function.name,
              args,
            });

            // Parse result content to return actual data
            const parsedContent = JSON.parse(result.content);
            logger.info(`${displayName} Success`, "tools");
            return parsedContent;
          } catch (error) {
            logger.error(`${displayName} Failed`, "tools", error);
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
    getImageSearchTool(
      writeThinkItem
    ) as unknown as RunnableToolFunctionWithParse<Record<string, unknown>>,
  ];

  try {
    const mcp = await getMCPClient();
    const mcpToolWrappers = createMCPToolWrappers(mcp.tools, writeThinkItem);
    tools.push(...mcpToolWrappers);

    logger.info(`Tools Loaded: ${tools.length} tools available`, "tools", {
      tools: tools.map((t) => t.function.name),
      mcpTools: mcp.getToolNames(),
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
