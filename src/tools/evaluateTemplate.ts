import { z } from "zod";
import nunjucks from "nunjucks";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError } from "../moonraker/errors.js";

export const evaluateTemplateSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  template: z
    .string()
    .describe(
      "Jinja2-style template to evaluate. " +
      "Access printer data via 'printer' object (e.g., '{{ printer.extruder.temperature }}'). " +
      "Supports filters like round(), int(), and conditionals."
    ),
  additionalObjects: z
    .array(z.string())
    .optional()
    .describe(
      "Additional printer objects to query beyond those detected in the template. " +
      "Use this if you need objects not directly referenced in variable expressions."
    ),
};

export type EvaluateTemplateParams = z.infer<
  z.ZodObject<typeof evaluateTemplateSchema>
>;

// Configure nunjucks to be more Jinja2-compatible
const env = new nunjucks.Environment(null, {
  autoescape: false,
  throwOnUndefined: false,
});

// Add custom filters that Klipper uses
env.addFilter("round", (val: number, precision = 0) => {
  if (typeof val !== "number" || isNaN(val)) return val;
  return Number(val.toFixed(precision));
});

env.addFilter("int", (val: unknown) => {
  const num = Number(val);
  return isNaN(num) ? 0 : Math.floor(num);
});

env.addFilter("float", (val: unknown) => {
  const num = Number(val);
  return isNaN(num) ? 0.0 : num;
});

env.addFilter("abs", (val: number) => Math.abs(val));

env.addFilter("min", (...args: number[]) => Math.min(...args));

env.addFilter("max", (...args: number[]) => Math.max(...args));

/**
 * Extract printer object references from a template
 * Handles both dot notation (printer.extruder.temperature)
 * and bracket notation (printer["heater_generic chamber"].temperature)
 */
function extractPrinterObjects(template: string): string[] {
  const objects = new Set<string>();

  // Match printer.object patterns
  // Handles: printer.extruder, printer.heater_bed, etc.
  const dotPattern = /printer\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = dotPattern.exec(template)) !== null) {
    objects.add(match[1]);
  }

  // Match printer["object"] or printer['object'] patterns
  // Handles: printer["heater_generic chamber"], printer['temperature_sensor ambient']
  const bracketPattern = /printer\[["']([^"']+)["']\]/g;
  while ((match = bracketPattern.exec(template)) !== null) {
    objects.add(match[1]);
  }

  return Array.from(objects);
}

export async function evaluateTemplate(
  printerManager: PrinterManager,
  params: EvaluateTemplateParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, template, additionalObjects = [] } = params;

    const client = printerManager.getClient(printer);

    // Extract objects referenced in template
    const detectedObjects = extractPrinterObjects(template);
    const allObjects = [...new Set([...detectedObjects, ...additionalObjects])];

    if (allObjects.length === 0) {
      // No printer objects referenced, just render the template
      const rendered = env.renderString(template, { printer: {} });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                printer: client.printerName,
                template,
                rendered,
                queriedObjects: [],
                note: "No printer objects were referenced in the template",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Query the required objects
    const queryMap: Record<string, null> = {};
    for (const obj of allObjects) {
      queryMap[obj] = null; // null means query all attributes
    }

    let status: Record<string, Record<string, unknown>> = {};
    const missingObjects: string[] = [];

    try {
      const queryResult = await client.queryObjects(queryMap);
      status = queryResult.status;
    } catch (e) {
      // If query fails, try objects one by one to find which exist
      if (e instanceof MoonrakerError && e.statusCode === 400) {
        for (const obj of allObjects) {
          try {
            const result = await client.queryObjects({ [obj]: null });
            status[obj] = result.status[obj];
          } catch {
            missingObjects.push(obj);
          }
        }
      } else {
        throw e;
      }
    }

    // Build the printer context
    const printerContext = status;

    // Render the template
    let rendered: string;
    let renderError: string | undefined;

    try {
      rendered = env.renderString(template, { printer: printerContext });
    } catch (e) {
      rendered = "";
      renderError = e instanceof Error ? e.message : String(e);
    }

    const result: Record<string, unknown> = {
      printer: client.printerName,
      template,
      rendered,
      queriedObjects: Object.keys(status),
      context: printerContext,
    };

    if (missingObjects.length > 0) {
      result.missingObjects = missingObjects;
      result.note = `Some objects were not found: ${missingObjects.join(", ")}`;
    }

    if (renderError) {
      result.error = true;
      result.renderError = renderError;
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
