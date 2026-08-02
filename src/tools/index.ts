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
  renameConfigFileSchema,
  renameConfigFile,
} from "./renameConfigFile.js";
import {
  searchConfigsSchema,
  searchConfigs,
} from "./searchConfigs.js";
import {
  getConfigInfoSchema,
  getConfigInfo,
} from "./getConfigInfo.js";
import {
  getPrinterStatusSchema,
  getPrinterStatus,
} from "./getPrinterStatus.js";
import {
  executeGcodeSchema,
  executeGcode,
} from "./executeGcode.js";
import {
  controlPrintSchema,
  controlPrint,
} from "./controlPrint.js";
import {
  emergencyStopSchema,
  emergencyStop,
} from "./emergencyStop.js";
import {
  evaluateTemplateSchema,
  evaluateTemplate,
} from "./evaluateTemplate.js";
import {
  listGcodeFilesSchema,
  listGcodeFiles,
} from "./listGcodeFiles.js";
import {
  getGcodeThumbnailSchema,
  getGcodeThumbnail,
} from "./getGcodeThumbnail.js";
import {
  getPrintHistorySchema,
  getPrintHistory,
} from "./getPrintHistory.js";
import {
  getSystemInfoSchema,
  getSystemInfo,
} from "./getSystemInfo.js";
import {
  restartServicesSchema,
  restartServices,
} from "./restartServices.js";
import {
  listLogFilesSchema,
  listLogFiles,
} from "./listLogFiles.js";
import {
  getLogFileSchema,
  getLogFile,
} from "./getLogFile.js";

export function registerTools(
  server: McpServer,
  printerManager: PrinterManager
): void {
  // ============================================
  // Configuration Management Tools
  // ============================================

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
    "Write or update a Klipper configuration file. Creates automatic .bkp backups. Specify printer name or uses default.",
    writeConfigFileSchema,
    async (params) => writeConfigFile(printerManager, params)
  );

  server.tool(
    "rename_config_file",
    "Rename or move a Klipper configuration file. Uses Moonraker's native move API. Specify printer name or uses default.",
    renameConfigFileSchema,
    async (params) => renameConfigFile(printerManager, params)
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

  // ============================================
  // Printer Status & Control Tools
  // ============================================

  server.tool(
    "get_printer_status",
    "Query printer status including temperatures, position, print progress. Optionally specify which objects to query. If the printer is in an error or shutdown state, use get_log_file to check klippy.log for details.",
    getPrinterStatusSchema,
    async (params) => getPrinterStatus(printerManager, params)
  );

  server.tool(
    "execute_gcode",
    "Execute GCode commands on the printer. Requires confirmation for potentially dangerous commands (heating, movement, etc.).",
    executeGcodeSchema,
    async (params) => executeGcode(printerManager, params)
  );

  server.tool(
    "control_print",
    "Start, pause, resume, or cancel a print job. Cancel requires confirmation.",
    controlPrintSchema,
    async (params) => controlPrint(printerManager, params)
  );

  server.tool(
    "emergency_stop",
    "Immediately halt the printer. Always requires confirmation. Use only in emergencies.",
    emergencyStopSchema,
    async (params) => emergencyStop(printerManager, params)
  );

  // ============================================
  // Template Evaluation
  // ============================================

  server.tool(
    "evaluate_template",
    "Evaluate Jinja2-style templates with live printer data. Access data via printer object (e.g., '{{ printer.extruder.temperature }}'). Supports filters and conditionals.",
    evaluateTemplateSchema,
    async (params) => evaluateTemplate(printerManager, params)
  );

  // ============================================
  // GCode File Management
  // ============================================

  server.tool(
    "list_gcode_files",
    "List available GCode files for printing. Optionally include metadata (slicer info, estimated time, filament usage).",
    listGcodeFilesSchema,
    async (params) => listGcodeFiles(printerManager, params)
  );

  server.tool(
    "get_gcode_thumbnail",
    "Get the thumbnail image for a GCode file. Returns the actual image that can be displayed. Choose size preference: small, medium, large, or largest.",
    getGcodeThumbnailSchema,
    async (params) => getGcodeThumbnail(printerManager, params)
  );

  // ============================================
  // Job History & Statistics
  // ============================================

  server.tool(
    "get_print_history",
    "Query print job history and statistics. Returns recent jobs with status, duration, and filament used. For failed prints, use get_log_file to search klippy.log for errors around the failure time.",
    getPrintHistorySchema,
    async (params) => getPrintHistory(printerManager, params)
  );

  // ============================================
  // System Information
  // ============================================

  server.tool(
    "get_system_info",
    "Get system information including CPU, memory, network, and live process stats.",
    getSystemInfoSchema,
    async (params) => getSystemInfo(printerManager, params)
  );

  // ============================================
  // Log File Access & Troubleshooting
  // ============================================

  server.tool(
    "list_log_files",
    "List available log files (klippy.log, moonraker.log, etc.) from the printer. Use get_log_file to read contents.",
    listLogFilesSchema,
    async (params) => listLogFiles(printerManager, params)
  );

  server.tool(
    "get_log_file",
    "Read log file content with optional tail and search filtering. Use list_log_files first to see available files. Essential for troubleshooting printer errors, shutdowns, and failed prints.",
    getLogFileSchema,
    async (params) => getLogFile(printerManager, params)
  );

  // ============================================
  // Service Control
  // ============================================

  server.tool(
    "restart_services",
    "Restart Klipper (config reload), firmware (MCU reset), or Moonraker (API server). Always requires confirmation.",
    restartServicesSchema,
    async (params) => restartServices(printerManager, params)
  );
}
