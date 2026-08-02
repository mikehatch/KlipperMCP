import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError } from "../moonraker/errors.js";

export const listLogFilesSchema = {
  printer: z
    .string()
    .optional()
    .describe(
      "Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."
    ),
};

export type ListLogFilesParams = z.infer<
  z.ZodObject<typeof listLogFilesSchema>
>;

export async function listLogFiles(
  printerManager: PrinterManager,
  params: ListLogFilesParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer } = params;

    const client = printerManager.getClient(printer);

    const files = await client.listFiles("logs");

    // Moonraker returns 'path' for file lists, but FileInfo type uses 'filename'
    const formattedFiles = files.map((f) => ({
      filename: f.filename || (f as unknown as { path: string }).path,
      size: f.size,
      sizeFormatted: formatFileSize(f.size),
      modified: new Date(f.modified * 1000).toISOString(),
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              printer: client.printerName,
              fileCount: formattedFiles.length,
              files: formattedFiles,
              hint: "Use get_log_file to read file contents. Use the 'search' parameter to filter for specific errors.",
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

    if (error instanceof Error) {
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
