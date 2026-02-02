import { PrinterManager } from "../printerManager.js";

export const listPrintersSchema = {};

export type ListPrintersParams = Record<string, never>;

export async function listPrinters(
  printerManager: PrinterManager,
  _params: ListPrintersParams
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const printers = printerManager.getPrinterInfo();
  const defaultPrinter = printerManager.getDefaultPrinter();

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            printers: printers.map((p) => ({
              ...p,
              isDefault: p.name === defaultPrinter,
            })),
            defaultPrinter,
            count: printers.length,
          },
          null,
          2
        ),
      },
    ],
  };
}
