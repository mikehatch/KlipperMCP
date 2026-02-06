import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError } from "../moonraker/errors.js";

export const getPrintHistorySchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .describe("Maximum number of jobs to return (1-100). Default: 10"),
  includeTotals: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include overall job statistics (total jobs, time, filament). Default: true"),
  order: z
    .enum(["asc", "desc"])
    .optional()
    .default("desc")
    .describe("Sort order by start time. 'desc' for most recent first. Default: desc"),
};

export type GetPrintHistoryParams = z.infer<
  z.ZodObject<typeof getPrintHistorySchema>
>;

export async function getPrintHistory(
  printerManager: PrinterManager,
  params: GetPrintHistoryParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, limit = 10, includeTotals = true, order = "desc" } = params;

    const client = printerManager.getClient(printer);

    // Get job history
    const history = await client.getJobHistory({ limit, order });

    // Format jobs
    const formattedJobs = history.jobs.map((job) => ({
      jobId: job.job_id,
      filename: job.filename,
      status: job.status,
      startTime: new Date(job.start_time * 1000).toISOString(),
      endTime: new Date(job.end_time * 1000).toISOString(),
      printDuration: formatDuration(job.print_duration),
      printDurationSeconds: job.print_duration,
      totalDuration: formatDuration(job.total_duration),
      totalDurationSeconds: job.total_duration,
      filamentUsed: job.filament_used
        ? `${(job.filament_used / 1000).toFixed(2)}m`
        : undefined,
      filamentUsedMm: job.filament_used,
      exists: job.exists,
    }));

    const result: Record<string, unknown> = {
      printer: client.printerName,
      jobCount: history.count,
      jobs: formattedJobs,
    };

    // Get totals if requested
    if (includeTotals) {
      const totals = await client.getJobHistoryTotals();
      result.totals = {
        totalJobs: totals.total_jobs,
        totalPrintTime: formatDuration(totals.total_print_time),
        totalPrintTimeSeconds: totals.total_print_time,
        totalTime: formatDuration(totals.total_time),
        totalTimeSeconds: totals.total_time,
        totalFilamentUsed: `${(totals.total_filament_used / 1000).toFixed(2)}m`,
        totalFilamentUsedMm: totals.total_filament_used,
        longestJob: formatDuration(totals.longest_job),
        longestJobSeconds: totals.longest_job,
        longestPrint: formatDuration(totals.longest_print),
        longestPrintSeconds: totals.longest_print,
      };
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
