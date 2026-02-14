export interface PrinterConfig {
  name: string;
  url: string;
  apiKey?: string;
}

export interface Config {
  printers: Map<string, PrinterConfig>;
  defaultPrinter: string | null;
  logLevel: "debug" | "info" | "warn" | "error";
}

export function loadConfig(): Config {
  const printers = new Map<string, PrinterConfig>();

  // Scan for PRINTER_* environment variables
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("PRINTER_") && value) {
      const name = key.replace("PRINTER_", "").toLowerCase();
      printers.set(name, {
        name,
        url: value,
        apiKey: process.env[`PRINTER_${name.toUpperCase()}_API_KEY`],
      });
    }
  }

  // Backward compatibility: if no PRINTER_* vars, use MOONRAKER_URL
  if (printers.size === 0 && process.env.MOONRAKER_URL) {
    printers.set("default", {
      name: "default",
      url: process.env.MOONRAKER_URL,
      apiKey: process.env.MOONRAKER_API_KEY,
    });
  }

  if (printers.size === 0) {
    console.error(
      "Configuration error: No printers configured. Set PRINTER_<NAME>=<url> or MOONRAKER_URL environment variables."
    );
    process.exit(1);
  }

  // Determine default printer (first one alphabetically, or "default" if it exists)
  const printerNames = Array.from(printers.keys()).sort();
  const defaultPrinter = printers.has("default") ? "default" : printerNames[0];

  const logLevel = (process.env.LOG_LEVEL as Config["logLevel"]) || "info";

  return {
    printers,
    defaultPrinter,
    logLevel,
  };
}

export function getPrinterNames(config: Config): string[] {
  return Array.from(config.printers.keys()).sort();
}

export function getPrinter(
  config: Config,
  name?: string
): PrinterConfig | null {
  if (!name) {
    return config.defaultPrinter
      ? config.printers.get(config.defaultPrinter) || null
      : null;
  }
  return config.printers.get(name.toLowerCase()) || null;
}
