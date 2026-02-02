import { Config, PrinterConfig } from "./config.js";
import { MoonrakerClient } from "./moonraker/client.js";

export class PrinterManager {
  private clients: Map<string, MoonrakerClient> = new Map();
  private config: Config;

  constructor(config: Config) {
    this.config = config;

    // Create a MoonrakerClient for each configured printer
    for (const [name, printerConfig] of config.printers) {
      this.clients.set(name, new MoonrakerClient(printerConfig));
    }
  }

  /**
   * Get a client for a specific printer.
   * If no name is provided, returns the default printer's client.
   * @throws Error if printer not found
   */
  getClient(printerName?: string): MoonrakerClient {
    const name = printerName?.toLowerCase() || this.config.defaultPrinter;

    if (!name) {
      throw new Error("No printer specified and no default printer configured");
    }

    const client = this.clients.get(name);
    if (!client) {
      const available = this.getPrinterNames().join(", ");
      throw new Error(
        `Printer "${printerName}" not found. Available printers: ${available}`
      );
    }

    return client;
  }

  /**
   * Get all printer names
   */
  getPrinterNames(): string[] {
    return Array.from(this.clients.keys()).sort();
  }

  /**
   * Get printer info for all configured printers
   */
  getPrinterInfo(): Array<{ name: string; url: string }> {
    const info: Array<{ name: string; url: string }> = [];

    for (const [name, printerConfig] of this.config.printers) {
      info.push({
        name,
        url: printerConfig.url,
      });
    }

    return info.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get the default printer name
   */
  getDefaultPrinter(): string | null {
    return this.config.defaultPrinter;
  }

  /**
   * Check if write confirmation is required
   */
  isWriteConfirmationRequired(): boolean {
    return this.config.writeConfirmationRequired;
  }
}
