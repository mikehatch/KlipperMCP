import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError, ValidationError } from "../moonraker/errors.js";

export const getConfigInfoSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  path: z
    .string()
    .optional()
    .default("")
    .describe("Path to file or directory within config root"),
};

export type GetConfigInfoParams = z.infer<
  z.ZodObject<typeof getConfigInfoSchema>
>;

export async function getConfigInfo(
  printerManager: PrinterManager,
  params: GetConfigInfoParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, path = "" } = params;

    // Get the client for the specified printer
    const client = printerManager.getClient(printer);

    // Validate path
    if (path.includes("..")) {
      throw new ValidationError("Invalid path: directory traversal not allowed");
    }

    const fullPath = path ? `config/${path}` : "config";

    // Try to get as directory first
    try {
      const dirInfo = await client.getDirectory(fullPath, false);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                printer: client.printerName,
                type: "directory",
                path: fullPath,
                fileCount: dirInfo.files.length,
                directoryCount: dirInfo.dirs.length,
                diskUsage: {
                  total_gb: (dirInfo.disk_usage.total / 1024 / 1024 / 1024).toFixed(2),
                  used_gb: (dirInfo.disk_usage.used / 1024 / 1024 / 1024).toFixed(2),
                  free_gb: (dirInfo.disk_usage.free / 1024 / 1024 / 1024).toFixed(2),
                },
                files: dirInfo.files.slice(0, 20).map((f) => ({
                  name: f.filename,
                  size: f.size,
                  modified: new Date(f.modified * 1000).toISOString(),
                })),
                directories: dirInfo.dirs.map((d) => ({
                  name: d.dirname,
                  modified: new Date(d.modified * 1000).toISOString(),
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (dirError) {
      // Not a directory, try as file
      if (
        !(dirError instanceof MoonrakerError) ||
        dirError.statusCode !== 404
      ) {
        throw dirError;
      }
    }

    // Try as file
    const content = await client.downloadFile("config", path);
    const lines = content.split("\n");

    // Parse sections from config file
    const sections = lines
      .filter(
        (line) => line.trim().startsWith("[") && line.trim().endsWith("]")
      )
      .map((line) => line.trim().slice(1, -1));

    // Find includes
    const includes = lines
      .filter((line) => line.trim().startsWith("[include"))
      .map((line) => {
        const match = line.match(/\[include\s+(.+)\]/);
        return match ? match[1] : null;
      })
      .filter((inc): inc is string => inc !== null);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              printer: client.printerName,
              type: "file",
              path: path,
              lineCount: lines.length,
              characterCount: content.length,
              sections: sections,
              includes: includes,
              sectionCount: sections.length,
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
