import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError, ValidationError } from "../moonraker/errors.js";
import { logger } from "../utils/logger.js";

export const writeConfigFileSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  filename: z
    .string()
    .describe(
      "Name of the config file to write (e.g., 'printer.cfg', 'macros/custom.cfg')"
    ),
  content: z.string().describe("Full content to write to the file"),
  createBackup: z
    .boolean()
    .optional()
    .default(true)
    .describe("Create a backup of the existing file before overwriting"),
  confirmed: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Set to true to confirm the write operation. First call without this to preview changes."
    ),
};

export type WriteConfigFileParams = z.infer<
  z.ZodObject<typeof writeConfigFileSchema>
>;

function generateSimpleDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  const added = newLines.length - oldLines.length;
  const addedText = added > 0 ? `+${added}` : added < 0 ? `${added}` : "0";

  // Find changed sections
  const oldSections = oldLines
    .filter((l) => l.trim().startsWith("[") && l.trim().endsWith("]"))
    .map((l) => l.trim());
  const newSections = newLines
    .filter((l) => l.trim().startsWith("[") && l.trim().endsWith("]"))
    .map((l) => l.trim());

  const addedSections = newSections.filter((s) => !oldSections.includes(s));
  const removedSections = oldSections.filter((s) => !newSections.includes(s));

  let summary = `Lines: ${oldLines.length} → ${newLines.length} (${addedText})`;

  if (addedSections.length > 0) {
    summary += `\nNew sections: ${addedSections.join(", ")}`;
  }
  if (removedSections.length > 0) {
    summary += `\nRemoved sections: ${removedSections.join(", ")}`;
  }

  return summary;
}

export async function writeConfigFile(
  printerManager: PrinterManager,
  params: WriteConfigFileParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, filename, content, createBackup = true, confirmed = false } = params;

    // Get the client for the specified printer
    const client = printerManager.getClient(printer);

    // Validate filename
    if (filename.includes("..")) {
      throw new ValidationError(
        "Invalid filename: path traversal not allowed"
      );
    }

    if (filename.startsWith("/")) {
      throw new ValidationError(
        "Invalid filename: absolute paths not allowed"
      );
    }

    // Check if file exists for backup/comparison
    let existingContent: string | null = null;
    try {
      existingContent = await client.downloadFile("config", filename);
    } catch (e) {
      // File doesn't exist, which is fine for new files
      if (e instanceof MoonrakerError && e.statusCode !== 404) {
        throw e;
      }
    }

    // If confirmation is required and not confirmed, return preview
    if (printerManager.isWriteConfirmationRequired() && !confirmed) {
      const preview: Record<string, unknown> = {
        printer: client.printerName,
        action: existingContent ? "update" : "create",
        filename,
        currentSize: existingContent?.length ?? 0,
        newSize: content.length,
        willCreateBackup: createBackup && !!existingContent,
        message:
          "Please confirm this write operation by calling again with confirmed: true",
      };

      if (existingContent) {
        preview.diff = generateSimpleDiff(existingContent, content);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(preview, null, 2),
          },
        ],
      };
    }

    // Create backup if requested and file exists
    if (createBackup && existingContent) {
      const timestamp = Date.now();
      const backupName = `${filename}.backup.${timestamp}`;
      logger.info(`[${client.printerName}] Creating backup: ${backupName}`);
      await client.uploadFile("config", backupName, existingContent);
    }

    // Upload the new content
    logger.info(`[${client.printerName}] Writing file: ${filename}`);
    const result = await client.uploadFile("config", filename, content);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              printer: client.printerName,
              filename: result.item.path,
              size: result.item.size,
              modified: new Date(result.item.modified * 1000).toISOString(),
              action: result.action,
              message:
                "File written successfully. Run RESTART or FIRMWARE_RESTART in Klipper to apply changes.",
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
