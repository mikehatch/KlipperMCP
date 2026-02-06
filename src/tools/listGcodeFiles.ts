import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError } from "../moonraker/errors.js";

export const listGcodeFilesSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  includeMetadata: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "If true, fetch detailed metadata for each file (slicer info, estimated time, etc.). " +
      "This requires additional API calls and may be slower for large file lists."
    ),
};

export type ListGcodeFilesParams = z.infer<
  z.ZodObject<typeof listGcodeFilesSchema>
>;

export async function listGcodeFiles(
  printerManager: PrinterManager,
  params: ListGcodeFilesParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, includeMetadata = false } = params;

    const client = printerManager.getClient(printer);

    // Get list of GCode files
    const files = await client.listGcodeFiles();

    // Format basic file info
    const formattedFiles = files.map((f) => ({
      filename: f.path,
      size: f.size,
      sizeFormatted: formatFileSize(f.size),
      modified: new Date(f.modified * 1000).toISOString(),
    }));

    // If metadata requested, fetch it for each file
    if (includeMetadata) {
      const filesWithMetadata = await Promise.all(
        files.map(async (f) => {
          try {
            const metadata = await client.getGcodeMetadata(f.path);
            return {
              filename: f.path,
              size: f.size,
              sizeFormatted: formatFileSize(f.size),
              modified: new Date(f.modified * 1000).toISOString(),
              metadata: {
                slicer: metadata.slicer,
                slicerVersion: metadata.slicer_version,
                estimatedTime: metadata.estimated_time
                  ? formatDuration(metadata.estimated_time)
                  : undefined,
                estimatedTimeSeconds: metadata.estimated_time,
                layerCount: metadata.layer_count,
                layerHeight: metadata.layer_height,
                firstLayerHeight: metadata.first_layer_height,
                objectHeight: metadata.object_height,
                filamentTotal: metadata.filament_total
                  ? `${(metadata.filament_total / 1000).toFixed(2)}m`
                  : undefined,
                filamentTotalMm: metadata.filament_total,
                filamentWeight: metadata.filament_weight_total
                  ? `${metadata.filament_weight_total.toFixed(2)}g`
                  : undefined,
                filamentType: metadata.filament_type,
                nozzleDiameter: metadata.nozzle_diameter,
                firstLayerExtruderTemp: metadata.first_layer_extr_temp,
                firstLayerBedTemp: metadata.first_layer_bed_temp,
                thumbnails: metadata.thumbnails?.map((t) => ({
                  width: t.width,
                  height: t.height,
                  size: t.size,
                })) ?? [],
                hasThumbnail: (metadata.thumbnails?.length ?? 0) > 0,
              },
            };
          } catch {
            // If metadata fetch fails, return basic info
            return {
              filename: f.path,
              size: f.size,
              sizeFormatted: formatFileSize(f.size),
              modified: new Date(f.modified * 1000).toISOString(),
              metadata: null,
              metadataError: "Failed to fetch metadata",
            };
          }
        })
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                printer: client.printerName,
                fileCount: filesWithMetadata.length,
                files: filesWithMetadata,
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
              printer: client.printerName,
              fileCount: formattedFiles.length,
              files: formattedFiles,
              hint: "Use includeMetadata: true to get slicer info, estimated time, etc.",
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
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
