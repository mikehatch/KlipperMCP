import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError } from "../moonraker/errors.js";

export const getPrinterStatusSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  objects: z
    .array(z.string())
    .optional()
    .describe(
      "Specific objects to query (e.g., ['extruder', 'heater_bed', 'toolhead']). " +
      "If not specified, queries common objects: extruder, heater_bed, toolhead, print_stats, display_status."
    ),
};

export type GetPrinterStatusParams = z.infer<
  z.ZodObject<typeof getPrinterStatusSchema>
>;

const DEFAULT_OBJECTS = [
  "extruder",
  "heater_bed",
  "toolhead",
  "print_stats",
  "display_status",
  "fan",
  "virtual_sdcard",
];

export async function getPrinterStatus(
  printerManager: PrinterManager,
  params: GetPrinterStatusParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, objects } = params;

    const client = printerManager.getClient(printer);

    // Get printer info
    const printerInfo = await client.getPrinterInfo();

    // Query objects
    const objectsToQuery = objects || DEFAULT_OBJECTS;
    const queryMap: Record<string, null> = {};
    for (const obj of objectsToQuery) {
      queryMap[obj] = null; // null means query all attributes
    }

    let status: Record<string, Record<string, unknown>> = {};
    try {
      const queryResult = await client.queryObjects(queryMap);
      status = queryResult.status;
    } catch (e) {
      // Some objects may not exist, continue with what we can get
      if (!(e instanceof MoonrakerError && e.statusCode === 400)) {
        throw e;
      }
    }

    // Format the response
    const result: Record<string, unknown> = {
      printer: client.printerName,
      state: printerInfo.state,
      stateMessage: printerInfo.state_message,
      hostname: printerInfo.hostname,
      softwareVersion: printerInfo.software_version,
    };

    // Extract key status info if available
    if (status.extruder) {
      result.extruder = {
        temperature: status.extruder.temperature,
        target: status.extruder.target,
        power: status.extruder.power,
      };
    }

    if (status.heater_bed) {
      result.heaterBed = {
        temperature: status.heater_bed.temperature,
        target: status.heater_bed.target,
        power: status.heater_bed.power,
      };
    }

    if (status.toolhead) {
      result.toolhead = {
        position: status.toolhead.position,
        homedAxes: status.toolhead.homed_axes,
        maxVelocity: status.toolhead.max_velocity,
        maxAccel: status.toolhead.max_accel,
      };
    }

    if (status.print_stats) {
      result.printStats = {
        state: status.print_stats.state,
        filename: status.print_stats.filename,
        totalDuration: status.print_stats.total_duration,
        printDuration: status.print_stats.print_duration,
        filamentUsed: status.print_stats.filament_used,
      };
    }

    if (status.display_status) {
      result.displayStatus = {
        progress: status.display_status.progress,
        message: status.display_status.message,
      };
    }

    if (status.fan) {
      result.fan = {
        speed: status.fan.speed,
        rpm: status.fan.rpm,
      };
    }

    if (status.virtual_sdcard) {
      result.virtualSdcard = {
        progress: status.virtual_sdcard.progress,
        isActive: status.virtual_sdcard.is_active,
        filePath: status.virtual_sdcard.file_path,
      };
    }

    // Include any additional queried objects
    const knownObjects = new Set([
      "extruder",
      "heater_bed",
      "toolhead",
      "print_stats",
      "display_status",
      "fan",
      "virtual_sdcard",
    ]);
    for (const [key, value] of Object.entries(status)) {
      if (!knownObjects.has(key)) {
        result[key] = value;
      }
    }

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
