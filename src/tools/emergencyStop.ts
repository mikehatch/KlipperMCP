import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError } from "../moonraker/errors.js";
import { DANGEROUS_ACTION_MESSAGES } from "../utils/safety.js";
import { logger } from "../utils/logger.js";

export const emergencyStopSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  confirmed: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "REQUIRED: Set to true to confirm the emergency stop. " +
      "This action will immediately halt the printer."
    ),
};

export type EmergencyStopParams = z.infer<
  z.ZodObject<typeof emergencyStopSchema>
>;

export async function emergencyStop(
  printerManager: PrinterManager,
  params: EmergencyStopParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, confirmed = false } = params;

    const client = printerManager.getClient(printer);

    // Always require confirmation for emergency stop
    if (!confirmed) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                requiresConfirmation: true,
                printer: client.printerName,
                action: "emergency_stop",
                message: DANGEROUS_ACTION_MESSAGES.emergencyStop,
                warning: "This will immediately halt all printer motion and heaters!",
                instruction: "Call again with confirmed: true to execute emergency stop.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Execute emergency stop
    logger.warn(`[${client.printerName}] EMERGENCY STOP triggered`);
    await client.emergencyStop();

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              printer: client.printerName,
              action: "emergency_stop",
              message: "Emergency stop executed. Printer is now halted.",
              nextSteps: [
                "Check for any issues that caused the emergency",
                "Use FIRMWARE_RESTART to restart the printer",
                "Re-home all axes before printing",
              ],
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
