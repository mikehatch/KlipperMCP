import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerClient } from "../moonraker/client.js";
import { MoonrakerError, ValidationError } from "../moonraker/errors.js";
import { logger } from "../utils/logger.js";

export const searchConfigsSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  pattern: z.string().describe("Text pattern to search for (case-insensitive)"),
  filePattern: z
    .string()
    .optional()
    .default("*.cfg")
    .describe("Glob pattern for files to search (e.g., '*.cfg', 'macros/*.cfg')"),
  includeLineNumbers: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include line numbers in results"),
};

export type SearchConfigsParams = z.infer<
  z.ZodObject<typeof searchConfigsSchema>
>;

function matchGlob(filename: string, pattern: string): boolean {
  // Simple glob matching for *.cfg patterns
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special regex chars except * and ?
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  const regex = new RegExp(`^${regexPattern}$`, "i");
  return regex.test(filename);
}

async function getAllConfigFiles(
  client: MoonrakerClient,
  path = "config"
): Promise<string[]> {
  const files: string[] = [];

  try {
    const dirInfo = await client.getDirectory(path, false);

    // Add files from current directory
    for (const file of dirInfo.files) {
      const relativePath = path === "config" ? file.filename : `${path.replace("config/", "")}/${file.filename}`;
      files.push(relativePath.replace(/^\//, ""));
    }

    // Recursively get files from subdirectories
    for (const dir of dirInfo.dirs) {
      const subPath = path === "config" ? `config/${dir.dirname}` : `${path}/${dir.dirname}`;
      const subFiles = await getAllConfigFiles(client, subPath);
      files.push(...subFiles);
    }
  } catch (error) {
    logger.warn(`Failed to list directory ${path}:`, error);
  }

  return files;
}

export async function searchConfigs(
  printerManager: PrinterManager,
  params: SearchConfigsParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, pattern, filePattern = "*.cfg", includeLineNumbers = true } = params;

    // Get the client for the specified printer
    const client = printerManager.getClient(printer);

    if (!pattern || pattern.trim() === "") {
      throw new ValidationError("Search pattern cannot be empty");
    }

    // Get list of all config files
    const allFiles = await getAllConfigFiles(client);

    // Filter files by glob pattern
    const matchingFiles = allFiles.filter((f) => {
      const filename = f.split("/").pop() || f;
      return matchGlob(filename, filePattern);
    });

    logger.debug(`[${client.printerName}] Searching ${matchingFiles.length} files for pattern: ${pattern}`);

    const results: Array<{
      file: string;
      matches: Array<{ line: number; content: string }>;
    }> = [];

    const searchRegex = new RegExp(pattern, "gi");

    for (const file of matchingFiles) {
      try {
        const content = await client.downloadFile("config", file);
        const lines = content.split("\n");
        const matches: Array<{ line: number; content: string }> = [];

        lines.forEach((line, index) => {
          if (searchRegex.test(line)) {
            matches.push({
              line: includeLineNumbers ? index + 1 : 0,
              content: line.trim(),
            });
          }
          searchRegex.lastIndex = 0; // Reset regex state
        });

        if (matches.length > 0) {
          results.push({ file, matches });
        }
      } catch (error) {
        logger.warn(`Failed to read file ${file}:`, error);
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              printer: client.printerName,
              pattern,
              filePattern,
              totalMatches: results.reduce((sum, r) => sum + r.matches.length, 0),
              filesSearched: matchingFiles.length,
              filesWithMatches: results.length,
              results,
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
