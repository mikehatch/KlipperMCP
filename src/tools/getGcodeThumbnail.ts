import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError } from "../moonraker/errors.js";

export const getGcodeThumbnailSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  filename: z
    .string()
    .describe("The GCode filename to get the thumbnail for (e.g., 'benchy.gcode')"),
  size: z
    .enum(["small", "medium", "large", "largest"])
    .optional()
    .default("large")
    .describe(
      "Preferred thumbnail size: 'small' (~32px), 'medium' (~64px), 'large' (~256px), or 'largest' (biggest available). " +
      "Returns closest available size if exact match not found."
    ),
};

export type GetGcodeThumbnailParams = z.infer<
  z.ZodObject<typeof getGcodeThumbnailSchema>
>;

// Size preferences in pixels for each category
const SIZE_PREFERENCES: Record<string, number> = {
  small: 32,
  medium: 64,
  large: 256,
  largest: Infinity,
};

export async function getGcodeThumbnail(
  printerManager: PrinterManager,
  params: GetGcodeThumbnailParams
): Promise<{ content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> }> {
  try {
    const { printer, filename, size = "large" } = params;

    const client = printerManager.getClient(printer);

    // Get metadata to find available thumbnails
    const metadata = await client.getGcodeMetadata(filename);

    if (!metadata.thumbnails || metadata.thumbnails.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: true,
                message: `No thumbnails available for '${filename}'`,
                hint: "This file may not have embedded thumbnails. Check your slicer settings to enable thumbnail generation.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Find the best matching thumbnail based on size preference
    const targetSize = SIZE_PREFERENCES[size];
    let selectedThumbnail = metadata.thumbnails[0];

    if (size === "largest") {
      // Find the largest thumbnail
      for (const thumb of metadata.thumbnails) {
        const thumbArea = thumb.width * thumb.height;
        const selectedArea = selectedThumbnail.width * selectedThumbnail.height;
        if (thumbArea > selectedArea) {
          selectedThumbnail = thumb;
        }
      }
    } else {
      // Find the closest match to target size
      let bestDiff = Infinity;
      for (const thumb of metadata.thumbnails) {
        const thumbSize = Math.max(thumb.width, thumb.height);
        const diff = Math.abs(thumbSize - targetSize);
        if (diff < bestDiff) {
          bestDiff = diff;
          selectedThumbnail = thumb;
        }
      }
    }

    // Fetch the actual thumbnail image
    const imageBuffer = await client.getGcodeThumbnail(selectedThumbnail.relative_path);
    const base64Image = imageBuffer.toString("base64");

    // Determine mime type from path
    const mimeType = selectedThumbnail.relative_path.toLowerCase().endsWith(".png")
      ? "image/png"
      : selectedThumbnail.relative_path.toLowerCase().endsWith(".jpg") ||
        selectedThumbnail.relative_path.toLowerCase().endsWith(".jpeg")
      ? "image/jpeg"
      : "image/png"; // Default to PNG

    // Return both the image and metadata about available thumbnails
    return {
      content: [
        {
          type: "image",
          data: base64Image,
          mimeType,
        },
        {
          type: "text",
          text: JSON.stringify(
            {
              printer: client.printerName,
              filename: metadata.filename,
              thumbnail: {
                width: selectedThumbnail.width,
                height: selectedThumbnail.height,
                size: selectedThumbnail.size,
                path: selectedThumbnail.relative_path,
              },
              availableThumbnails: metadata.thumbnails.map((t) => ({
                width: t.width,
                height: t.height,
                size: t.size,
              })),
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
