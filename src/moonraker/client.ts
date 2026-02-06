import { PrinterConfig } from "../config.js";
import { MoonrakerError } from "./errors.js";
import type {
  DirectoryInfo,
  FileInfo,
  UploadResult,
  RootInfo,
  PrinterInfo,
  QueryResult,
  ObjectsList,
  GCodeFileInfo,
  GCodeMetadata,
  JobHistoryResult,
  JobHistoryTotals,
  SystemInfo,
  ProcStats,
} from "./types.js";
import { logger } from "../utils/logger.js";

export class MoonrakerClient {
  private baseUrl: string;
  private apiKey?: string;
  public readonly printerName: string;

  constructor(printerConfig: PrinterConfig) {
    this.printerName = printerConfig.name;
    this.baseUrl = printerConfig.url.replace(/\/$/, "");
    this.apiKey = printerConfig.apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      query?: Record<string, string>;
      isFormData?: boolean;
    } = {}
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers["X-Api-Key"] = this.apiKey;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (options.body && method !== "GET") {
      if (options.isFormData && options.body instanceof FormData) {
        fetchOptions.body = options.body;
        // Don't set Content-Type for FormData, let browser set it with boundary
      } else {
        headers["Content-Type"] = "application/json";
        fetchOptions.body = JSON.stringify(options.body);
      }
    }

    fetchOptions.headers = headers;

    logger.debug(`[${this.printerName}] ${method} ${url.toString()}`);

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new MoonrakerError(
        `Moonraker API error: ${response.status} ${response.statusText}`,
        response.status,
        errorText
      );
    }

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const json = (await response.json()) as { result?: T };
      return (json.result ?? json) as T;
    }

    return (await response.text()) as T;
  }

  async listRoots(): Promise<RootInfo[]> {
    return this.request<RootInfo[]>("GET", "/server/files/roots");
  }

  async getDirectory(path: string, extended = false): Promise<DirectoryInfo> {
    return this.request<DirectoryInfo>("GET", "/server/files/directory", {
      query: { path, extended: String(extended) },
    });
  }

  async listFiles(root = "config"): Promise<FileInfo[]> {
    return this.request<FileInfo[]>("GET", "/server/files/list", {
      query: { root },
    });
  }

  async downloadFile(root: string, filename: string): Promise<string> {
    return this.request<string>("GET", `/server/files/${root}/${filename}`);
  }

  async uploadFile(
    root: string,
    filename: string,
    content: string
  ): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("root", root);
    formData.append(
      "file",
      new Blob([content], { type: "text/plain" }),
      filename
    );

    return this.request<UploadResult>("POST", "/server/files/upload", {
      body: formData,
      isFormData: true,
    });
  }

  async deleteFile(root: string, filename: string): Promise<void> {
    await this.request("DELETE", `/server/files/${root}/${filename}`);
  }

  async moveFile(source: string, dest: string): Promise<UploadResult> {
    return this.request<UploadResult>("POST", "/server/files/move", {
      body: { source, dest },
    });
  }

  async copyFile(source: string, dest: string): Promise<UploadResult> {
    return this.request<UploadResult>("POST", "/server/files/copy", {
      body: { source, dest },
    });
  }

  // ============================================
  // Printer Status & Control
  // ============================================

  async getPrinterInfo(): Promise<PrinterInfo> {
    return this.request<PrinterInfo>("GET", "/printer/info");
  }

  async queryObjects(objects: Record<string, string[] | null>): Promise<QueryResult> {
    // Build query string for objects
    // Format: ?extruder=temperature,target&heater_bed
    const params: Record<string, string> = {};

    for (const [obj, attrs] of Object.entries(objects)) {
      if (attrs === null || attrs.length === 0) {
        params[obj] = "";
      } else {
        params[obj] = attrs.join(",");
      }
    }

    return this.request<QueryResult>("GET", "/printer/objects/query", {
      query: params,
    });
  }

  async listAvailableObjects(): Promise<ObjectsList> {
    return this.request<ObjectsList>("GET", "/printer/objects/list");
  }

  async executeGcode(script: string): Promise<string> {
    return this.request<string>("POST", "/printer/gcode/script", {
      body: { script },
    });
  }

  // ============================================
  // Print Control
  // ============================================

  async startPrint(filename: string): Promise<void> {
    await this.request("POST", "/printer/print/start", {
      body: { filename },
    });
  }

  async pausePrint(): Promise<void> {
    await this.request("POST", "/printer/print/pause");
  }

  async resumePrint(): Promise<void> {
    await this.request("POST", "/printer/print/resume");
  }

  async cancelPrint(): Promise<void> {
    await this.request("POST", "/printer/print/cancel");
  }

  async emergencyStop(): Promise<void> {
    await this.request("POST", "/printer/emergency_stop");
  }

  // ============================================
  // GCode Files
  // ============================================

  async listGcodeFiles(): Promise<GCodeFileInfo[]> {
    return this.request<GCodeFileInfo[]>("GET", "/server/files/list", {
      query: { root: "gcodes" },
    });
  }

  async getGcodeMetadata(filename: string): Promise<GCodeMetadata> {
    return this.request<GCodeMetadata>("GET", "/server/files/metadata", {
      query: { filename },
    });
  }

  async getGcodeThumbnail(relativePath: string): Promise<Buffer> {
    // Thumbnails are stored relative to the gcodes root
    // relativePath comes from metadata.thumbnails[].relative_path
    const url = new URL(`/server/files/gcodes/${relativePath}`, this.baseUrl);

    const headers: Record<string, string> = {};
    if (this.apiKey) {
      headers["X-Api-Key"] = this.apiKey;
    }

    logger.debug(`[${this.printerName}] GET ${url.toString()} (thumbnail)`);

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new MoonrakerError(
        `Failed to fetch thumbnail: ${response.status} ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ============================================
  // Job History
  // ============================================

  async getJobHistory(options?: {
    limit?: number;
    start?: number;
    order?: "asc" | "desc";
  }): Promise<JobHistoryResult> {
    const query: Record<string, string> = {};
    if (options?.limit !== undefined) query.limit = String(options.limit);
    if (options?.start !== undefined) query.start = String(options.start);
    if (options?.order) query.order = options.order;

    return this.request<JobHistoryResult>("GET", "/server/history/list", {
      query,
    });
  }

  async getJobHistoryTotals(): Promise<JobHistoryTotals> {
    const result = await this.request<{ job_totals: JobHistoryTotals }>(
      "GET",
      "/server/history/totals"
    );
    return result.job_totals;
  }

  // ============================================
  // System Info
  // ============================================

  async getSystemInfo(): Promise<SystemInfo> {
    const result = await this.request<{ system_info: SystemInfo }>(
      "GET",
      "/machine/system_info"
    );
    return result.system_info;
  }

  async getProcStats(): Promise<ProcStats> {
    return this.request<ProcStats>("GET", "/machine/proc_stats");
  }

  // ============================================
  // Service Control
  // ============================================

  async restartKlipper(): Promise<void> {
    await this.request("POST", "/printer/restart");
  }

  async firmwareRestart(): Promise<void> {
    await this.request("POST", "/printer/firmware_restart");
  }

  async restartMoonraker(): Promise<void> {
    await this.request("POST", "/server/restart");
  }
}
