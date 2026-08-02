import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError } from "../moonraker/errors.js";

export const getLogFileSchema = {
  filename: z
    .string()
    .describe(
      'Log filename to read (e.g., "klippy.log", "moonraker.log"). Use list_log_files to see available files.'
    ),
  lines: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .optional()
    .default(100)
    .describe(
      "Number of lines to return from the end of the file. Default: 100. Max: 10000."
    ),
  search: z
    .string()
    .optional()
    .describe(
      'Filter lines matching this pattern (case-insensitive). Applied before tail. Useful for finding specific errors (e.g., "shutdown", "error", "heater", "timeout").'
    ),
  printer: z
    .string()
    .optional()
    .describe(
      "Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."
    ),
};

export type GetLogFileParams = z.infer<z.ZodObject<typeof getLogFileSchema>>;

export async function getLogFile(
  printerManager: PrinterManager,
  params: GetLogFileParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { filename, lines = 100, search, printer } = params;

    const client = printerManager.getClient(printer);

    const content = await client.downloadFile("logs", filename);

    const allLines = content.split("\n");
    const totalLines = allLines.length;

    let resultLines = allLines;
    let matchedLines: number | undefined;

    // Filter by search pattern if provided
    if (search) {
      const searchLower = search.toLowerCase();
      resultLines = resultLines.filter((line) =>
        line.toLowerCase().includes(searchLower)
      );
      matchedLines = resultLines.length;
    }

    // Take last N lines
    const truncated = resultLines.length > lines;
    resultLines = resultLines.slice(-lines);

    const result: Record<string, unknown> = {
      printer: client.printerName,
      filename,
      totalLines,
      returnedLines: resultLines.length,
      truncated,
    };

    if (search) {
      result.searchPattern = search;
      result.matchedLines = matchedLines;
    }

    result.content = resultLines.join("\n");

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
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
