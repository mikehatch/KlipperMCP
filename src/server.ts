import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Config } from "./config.js";
import { PrinterManager } from "./printerManager.js";
import { registerTools } from "./tools/index.js";

export function createServer(config: Config): McpServer {
  const server = new McpServer({
    name: "klipper-mcp",
    version: "1.0.0",
  });

  const printerManager = new PrinterManager(config);

  registerTools(server, printerManager);

  return server;
}
