import { PrinterConfig } from "../config.js";
import { MoonrakerError } from "./errors.js";
import type {
  DirectoryInfo,
  FileInfo,
  UploadResult,
  RootInfo,
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
}
