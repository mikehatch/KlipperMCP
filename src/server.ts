import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Config } from "./config.js";
import { PrinterManager } from "./printerManager.js";
import { registerTools } from "./tools/index.js";
import { TROUBLESHOOTING_GUIDE } from "./resources/troubleshootingGuide.js";
import { getTroubleshootPrompt } from "./prompts/troubleshoot.js";

export function createServer(config: Config): McpServer {
  const server = new McpServer({
    name: "klipper-mcp",
    version: "1.0.0",
  });

  const printerManager = new PrinterManager(config);

  registerTools(server, printerManager);

  // ============================================
  // Resources
  // ============================================

  server.registerResource(
    "troubleshooting-guide",
    "klipper://troubleshooting-guide",
    {
      description:
        "Comprehensive Klipper troubleshooting reference including common errors, log file locations, and diagnostic decision trees.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: TROUBLESHOOTING_GUIDE,
        },
      ],
    })
  );

  // ============================================
  // Prompts
  // ============================================

  server.registerPrompt(
    "troubleshoot",
    {
      description:
        "Structured troubleshooting workflow for diagnosing Klipper printer issues. Guides through status checks, log analysis, and common error resolution.",
      argsSchema: {
        printer: z
          .string()
          .optional()
          .describe(
            "Printer name to troubleshoot. Uses default if not specified."
          ),
        issue: z
          .string()
          .optional()
          .describe(
            "Brief description of the issue (e.g., 'printer shutdown', 'heating error', 'probe failed')"
          ),
      },
    },
    (args) => getTroubleshootPrompt(args.printer, args.issue)
  );

  return server;
}
