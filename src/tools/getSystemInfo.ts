import { z } from "zod";
import { PrinterManager } from "../printerManager.js";
import { MoonrakerError } from "../moonraker/errors.js";

export const getSystemInfoSchema = {
  printer: z
    .string()
    .optional()
    .describe("Name of the printer (e.g., 'voron', 'ender'). Uses default if not specified."),
  includeProcStats: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include live process stats (CPU temp, usage, memory). Default: true"),
};

export type GetSystemInfoParams = z.infer<
  z.ZodObject<typeof getSystemInfoSchema>
>;

export async function getSystemInfo(
  printerManager: PrinterManager,
  params: GetSystemInfoParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const { printer, includeProcStats = true } = params;

    const client = printerManager.getClient(printer);

    // Get system info
    const sysInfo = await client.getSystemInfo();

    const result: Record<string, unknown> = {
      printer: client.printerName,
      cpu: {
        processor: sysInfo.cpu_info.processor,
        cpuCount: sysInfo.cpu_info.cpu_count,
        bits: sysInfo.cpu_info.bits,
        model: sysInfo.cpu_info.model,
        totalMemory: `${sysInfo.cpu_info.total_memory} ${sysInfo.cpu_info.memory_units}`,
      },
      distribution: {
        name: sysInfo.distribution.name,
        version: sysInfo.distribution.version,
        codename: sysInfo.distribution.codename,
      },
      network: Object.entries(sysInfo.network).map(([iface, info]) => ({
        interface: iface,
        macAddress: info.mac_address,
        ipAddresses: info.ip_addresses
          .filter((ip) => !ip.is_link_local)
          .map((ip) => ip.address),
      })),
    };

    if (sysInfo.python) {
      result.python = {
        version: sysInfo.python.version_string,
      };
    }

    if (sysInfo.virtualization) {
      result.virtualization = {
        type: sysInfo.virtualization.virt_type,
        identifier: sysInfo.virtualization.virt_identifier,
      };
    }

    if (sysInfo.canbus) {
      result.canbus = Object.entries(sysInfo.canbus).map(([iface, info]) => ({
        interface: iface,
        bitrate: info.bitrate,
        driver: info.driver,
      }));
    }

    // Get proc stats if requested
    if (includeProcStats) {
      try {
        const procStats = await client.getProcStats();

        result.liveStats = {
          cpuTemp: procStats.cpu_temp ? `${procStats.cpu_temp.toFixed(1)}°C` : undefined,
          cpuTempC: procStats.cpu_temp,
          systemCpuUsage: `${procStats.system_cpu_usage.cpu.toFixed(1)}%`,
          systemCpuUsagePercent: procStats.system_cpu_usage.cpu,
          systemMemory: {
            total: formatBytes(procStats.system_memory.total),
            used: formatBytes(procStats.system_memory.used),
            available: formatBytes(procStats.system_memory.available),
            usagePercent: `${((procStats.system_memory.used / procStats.system_memory.total) * 100).toFixed(1)}%`,
          },
          uptime: formatUptime(procStats.system_uptime),
          uptimeSeconds: procStats.system_uptime,
          websocketConnections: procStats.websocket_connections,
        };

        if (procStats.throttled_state && procStats.throttled_state.flags.length > 0) {
          result.throttledState = {
            flags: procStats.throttled_state.flags,
            warning: "System may be throttled due to thermal or power issues",
          };
        }

        // Moonraker stats (latest)
        if (procStats.moonraker_stats && procStats.moonraker_stats.length > 0) {
          const latest = procStats.moonraker_stats[procStats.moonraker_stats.length - 1];
          result.moonrakerStats = {
            cpuUsage: `${latest.cpu_usage.toFixed(1)}%`,
            cpuUsagePercent: latest.cpu_usage,
            memory: `${latest.memory.toFixed(1)} ${latest.mem_units}`,
          };
        }
      } catch {
        result.liveStats = {
          error: "Failed to fetch process stats",
        };
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(" ");
}
