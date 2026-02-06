import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError } from "../moonraker/errors.js";
import { DANGEROUS_ACTION_MESSAGES } from "../utils/safety.js";
import { logger } from "../utils/logger.js";

export const restartServicesSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  service: z
    .enum(["klipper", "firmware", "moonraker"])
    .describe(
      "Service to restart: " +
      "'klipper' reloads config, " +
      "'firmware' restarts MCU, " +
      "'moonraker' restarts the API server."
    ),
  confirmed: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "REQUIRED: Set to true to confirm the restart. " +
      "Service restarts can interrupt prints and disconnect clients."
    ),
};

export type RestartServicesParams = z.infer<
  z.ZodObject<typeof restartServicesSchema>
>;

const SERVICE_MESSAGES: Record<string, string> = {
  klipper: DANGEROUS_ACTION_MESSAGES.restartKlipper,
  firmware: DANGEROUS_ACTION_MESSAGES.firmwareRestart,
  moonraker: DANGEROUS_ACTION_MESSAGES.restartMoonraker,
};

export async function restartServices(
  printerManager: PrinterManager,
  params: RestartServicesParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, service, confirmed = false } = params;

    const client = printerManager.getClient(printer);

    // Always require confirmation
    if (!confirmed) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                requiresConfirmation: true,
                printer: client.printerName,
                service,
                message: SERVICE_MESSAGES[service],
                warning: getServiceWarning(service),
                instruction: "Call again with confirmed: true to restart the service.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Execute the restart
    logger.info(`[${client.printerName}] Restarting service: ${service}`);

    switch (service) {
      case "klipper":
        await client.restartKlipper();
        break;
      case "firmware":
        await client.firmwareRestart();
        break;
      case "moonraker":
        await client.restartMoonraker();
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
              service,
              message: `${getServiceName(service)} restart initiated`,
              nextSteps: getNextSteps(service),
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
                service: params.service,
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

function getServiceName(service: string): string {
  switch (service) {
    case "klipper":
      return "Klipper";
    case "firmware":
      return "Firmware";
    case "moonraker":
      return "Moonraker";
    default:
      return service;
  }
}

function getServiceWarning(service: string): string {
  switch (service) {
    case "klipper":
      return "This will reload Klipper configuration. Any active print will be interrupted.";
    case "firmware":
      return "This will reset the microcontroller. The printer will need to be re-homed.";
    case "moonraker":
      return "This will temporarily disconnect all clients including this one.";
    default:
      return "This action may interrupt printer operation.";
  }
}

function getNextSteps(service: string): string[] {
  switch (service) {
    case "klipper":
      return [
        "Wait a few seconds for Klipper to reload",
        "Check printer status to verify config loaded correctly",
        "Re-home axes if needed before printing",
      ];
    case "firmware":
      return [
        "Wait for firmware to restart (may take 10-30 seconds)",
        "Re-home all axes before printing",
        "Verify communication with MCU",
      ];
    case "moonraker":
      return [
        "Wait for Moonraker to restart (connection may drop briefly)",
        "Reconnect clients if needed",
        "Verify API is responding",
      ];
    default:
      return [];
  }
}
