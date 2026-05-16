#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer as createHttpServer } from "node:http";
import { randomUUID } from "node:crypto";
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

    const portArg = process.argv.find((a) => a.startsWith("--port="));
    if (portArg) {
      const port = parseInt(portArg.split("=")[1], 10);
      const transports = new Map<string, StreamableHTTPServerTransport>();

      const httpServer = createHttpServer((req, res) => {
        if (req.url !== "/mcp") {
          res.writeHead(404).end();
          return;
        }
        const sessionId = req.headers["mcp-session-id"] as string | undefined;
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));

        if (req.method === "POST") {
          req.on("end", async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString());
              let transport = sessionId ? transports.get(sessionId) : undefined;
              if (!transport) {
                // Declare with definite assignment so the onsessioninitialized
                // closure can close over `t` without a circular-reference error.
                let t!: StreamableHTTPServerTransport;
                t = new StreamableHTTPServerTransport({
                  sessionIdGenerator: () => randomUUID(),
                  onsessioninitialized: (sid) => { transports.set(sid, t); },
                });
                await createServer(config).connect(t);
                transport = t;
              }
              await (transport as StreamableHTTPServerTransport).handleRequest(req, res, body);
            } catch (err) {
              logger.error("HTTP request error:", err);
              if (!res.headersSent) res.writeHead(500).end();
            }
          });
        } else if (req.method === "GET" && sessionId) {
          const t = transports.get(sessionId);
          if (!t) { res.writeHead(404).end(); return; }
          t.handleRequest(req, res).catch((err) => logger.error("SSE error:", err));
        } else if (req.method === "DELETE" && sessionId) {
          const t = transports.get(sessionId);
          if (t) { t.close().then(() => transports.delete(sessionId!)); }
          res.writeHead(200).end();
        } else {
          res.writeHead(405).end();
        }
      });

      httpServer.listen(port, () =>
        logger.info(`HTTP transport listening on :${port} — endpoint: POST /mcp`)
      );
    } else {
      const transport = new StdioServerTransport();
      await createServer(config).connect(transport);
      logger.info("Server connected and ready");
    }
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
