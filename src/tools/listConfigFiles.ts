import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError, ValidationError } from "../moonraker/errors.js";

export const listConfigFilesSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  path: z
    .string()
    .optional()
    .describe(
      "Subdirectory path within config root (e.g., 'macros'). Leave empty for root."
    ),
};

export type ListConfigFilesParams = z.infer<
  z.ZodObject<typeof listConfigFilesSchema>
>;

export async function listConfigFiles(
  printerManager: PrinterManager,
  params: ListConfigFilesParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, path = "" } = params;

    // Get the client for the specified printer
    const client = printerManager.getClient(printer);

    // Validate path doesn't escape config directory
    if (path.includes("..")) {
      throw new ValidationError("Invalid path: directory traversal not allowed");
    }

    const fullPath = path ? `config/${path}` : "config";

    const result = await client.getDirectory(fullPath, false);

    // Format output for Claude
    const files = result.files.map((f) => ({
      name: f.filename,
      size: f.size,
      modified: new Date(f.modified * 1000).toISOString(),
      permissions: f.permissions,
    }));

    const dirs = result.dirs.map((d) => ({
      name: d.dirname,
      modified: new Date(d.modified * 1000).toISOString(),
      permissions: d.permissions,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              printer: client.printerName,
              path: fullPath,
              files,
              directories: dirs,
              disk_usage: {
                total_gb: (result.disk_usage.total / 1024 / 1024 / 1024).toFixed(2),
                used_gb: (result.disk_usage.used / 1024 / 1024 / 1024).toFixed(2),
                free_gb: (result.disk_usage.free / 1024 / 1024 / 1024).toFixed(2),
              },
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    if (error instanceof MoonrakerError) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: true,
                message: error.toUserMessage(),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (error instanceof ValidationError || error instanceof Error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: true,
                message: error.message,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: true,
              message: "An unexpected error occurred",
              details: String(error),
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
