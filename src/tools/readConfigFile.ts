import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError, ValidationError } from "../moonraker/errors.js";

export const readConfigFileSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  filename: z
    .string()
    .describe(
      "Name of the config file to read (e.g., 'printer.cfg', 'macros/print_start.cfg')"
    ),
};

export type ReadConfigFileParams = z.infer<
  z.ZodObject<typeof readConfigFileSchema>
>;

export async function readConfigFile(
  printerManager: PrinterManager,
  params: ReadConfigFileParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, filename } = params;

    // Get the client for the specified printer
    const client = printerManager.getClient(printer);

    // Validate filename doesn't escape config directory
    if (filename.includes("..")) {
      throw new ValidationError(
        "Invalid filename: path traversal not allowed"
      );
    }

    const content = await client.downloadFile("config", filename);

    return {
      content: [
        {
          type: "text",
          text: `# Printer: ${client.printerName}\n# File: ${filename}\n# ----------------------------------------\n\n${content}`,
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
                filename: params.filename,
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
