import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError, ValidationError } from "../moonraker/errors.js";
import { logger } from "../utils/logger.js";

export const renameConfigFileSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  source: z
    .string()
    .describe("Current filename (e.g., 'macros/old_name.cfg')"),
  dest: z
    .string()
    .describe("New filename (e.g., 'macros/new_name.cfg')"),
};

export type RenameConfigFileParams = z.infer<
  z.ZodObject<typeof renameConfigFileSchema>
>;

export async function renameConfigFile(
  printerManager: PrinterManager,
  params: RenameConfigFileParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, source, dest } = params;
    const client = printerManager.getClient(printer);

    for (const path of [source, dest]) {
      if (path.includes("..")) {
        throw new ValidationError("Invalid path: path traversal not allowed");
      }
      if (path.startsWith("/")) {
        throw new ValidationError("Invalid path: absolute paths not allowed");
      }
    }

    logger.info(`[${client.printerName}] Renaming: ${source} -> ${dest}`);
    const result = await client.moveFile(`config/${source}`, `config/${dest}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              printer: client.printerName,
              source,
              dest: result.item.path,
              size: result.item.size,
              action: result.action,
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
                source: params.source,
                dest: params.dest,
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
