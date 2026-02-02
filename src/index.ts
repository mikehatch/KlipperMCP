#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, getPrinterNames } from "./config.js";
import { createServer } from "./server.js";
import { logger } from "./utils/logger.js";

async function main() {
  try {
    const config = loadConfig();
    const printerNames = getPrinterNames(config);

    logger.info("Starting Klipper MCP server");
    logger.info(`Configured printers: ${printerNames.join(", ")}`);
    logger.info(`Default printer: ${config.defaultPrinter}`);

    const server = createServer(config);
    const transport = new StdioServerTransport();

    await server.connect(transport);
    logger.info("Server connected and ready");
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
