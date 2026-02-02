import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PrinterManager } from "../printerManager.js";

import {
  listPrintersSchema,
  listPrinters,
} from "./listPrinters.js";
import {
  listConfigFilesSchema,
  listConfigFiles,
} from "./listConfigFiles.js";
import {
  readConfigFileSchema,
  readConfigFile,
} from "./readConfigFile.js";
import {
  writeConfigFileSchema,
  writeConfigFile,
} from "./writeConfigFile.js";
import {
  searchConfigsSchema,
  searchConfigs,
} from "./searchConfigs.js";
import {
  getConfigInfoSchema,
  getConfigInfo,
} from "./getConfigInfo.js";

export function registerTools(
  server: McpServer,
  printerManager: PrinterManager
): void {
  server.tool(
    "list_printers",
    "List all configured Klipper printers and their Moonraker URLs",
    listPrintersSchema,
    async (params) => listPrinters(printerManager, params)
  );

  server.tool(
    "list_config_files",
    "List Klipper configuration files in the config directory. Specify printer name or uses default.",
    listConfigFilesSchema,
    async (params) => listConfigFiles(printerManager, params)
  );

  server.tool(
    "read_config_file",
    "Read the contents of a Klipper configuration file. Specify printer name or uses default.",
    readConfigFileSchema,
    async (params) => readConfigFile(printerManager, params)
  );

  server.tool(
    "write_config_file",
    "Write or update a Klipper configuration file. Requires confirmation for safety. Creates automatic backups. Specify printer name or uses default.",
    writeConfigFileSchema,
    async (params) => writeConfigFile(printerManager, params)
  );

  server.tool(
    "search_configs",
    "Search for patterns within Klipper configuration files. Specify printer name or uses default.",
    searchConfigsSchema,
    async (params) => searchConfigs(printerManager, params)
  );

  server.tool(
    "get_config_info",
    "Get detailed information about a config file or directory, including sections and includes. Specify printer name or uses default.",
    getConfigInfoSchema,
    async (params) => getConfigInfo(printerManager, params)
  );
}
