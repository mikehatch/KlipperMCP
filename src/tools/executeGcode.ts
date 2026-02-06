import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError } from "../moonraker/errors.js";
import { checkGcodeSafety, DANGEROUS_ACTION_MESSAGES } from "../utils/safety.js";
import { logger } from "../utils/logger.js";

export const executeGcodeSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  script: z
    .string()
    .describe(
      "GCode script to execute. Can be a single command or multiple commands separated by newlines."
    ),
  confirmed: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Set to true to confirm execution of potentially dangerous commands. " +
      "First call without this to check for warnings."
    ),
};

export type ExecuteGcodeParams = z.infer<
  z.ZodObject<typeof executeGcodeSchema>
>;

export async function executeGcode(
  printerManager: PrinterManager,
  params: ExecuteGcodeParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, script, confirmed = false } = params;

    const client = printerManager.getClient(printer);

    // Check for dangerous patterns
    const warnings = checkGcodeSafety(script);

    // If there are warnings and not confirmed, return warning
    if (warnings.length > 0 && !confirmed) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                requiresConfirmation: true,
                printer: client.printerName,
                script,
                warnings,
                message: DANGEROUS_ACTION_MESSAGES.dangerousGcode,
                instruction: "Review the warnings above. Call again with confirmed: true to execute.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Execute the GCode
    logger.info(`[${client.printerName}] Executing GCode: ${script.substring(0, 100)}...`);
    const result = await client.executeGcode(script);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              printer: client.printerName,
              script,
              result: result || "Command executed successfully",
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
                script: params.script,
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
