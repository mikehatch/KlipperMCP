import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError } from "../moonraker/errors.js";
import { DANGEROUS_ACTION_MESSAGES } from "../utils/safety.js";
import { logger } from "../utils/logger.js";

export const controlPrintSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  action: z
    .enum(["start", "pause", "resume", "cancel"])
    .describe("The print control action to perform."),
  filename: z
    .string()
    .optional()
    .describe("Filename to print (required for 'start' action). Path relative to gcodes root."),
  confirmed: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Set to true to confirm cancel action. Not required for start/pause/resume."
    ),
};

export type ControlPrintParams = z.infer<
  z.ZodObject<typeof controlPrintSchema>
>;

export async function controlPrint(
  printerManager: PrinterManager,
  params: ControlPrintParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, action, filename, confirmed = false } = params;

    const client = printerManager.getClient(printer);

    // Validate filename for start action
    if (action === "start" && !filename) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: true,
                message: "Filename is required for start action",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Cancel requires confirmation
    if (action === "cancel" && !confirmed) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                requiresConfirmation: true,
                printer: client.printerName,
                action,
                message: DANGEROUS_ACTION_MESSAGES.cancelPrint,
                instruction: "Call again with confirmed: true to cancel the print.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Execute the action
    logger.info(`[${client.printerName}] Print control: ${action}${filename ? ` (${filename})` : ""}`);

    switch (action) {
      case "start":
        await client.startPrint(filename!);
        break;
      case "pause":
        await client.pausePrint();
        break;
      case "resume":
        await client.resumePrint();
        break;
      case "cancel":
        await client.cancelPrint();
        break;
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              printer: client.printerName,
              action,
              filename: action === "start" ? filename : undefined,
              message: `Print ${action} command executed successfully`,
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
                action: params.action,
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
