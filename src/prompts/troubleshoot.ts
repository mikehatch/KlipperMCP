import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";

export function getTroubleshootPrompt(
  printer?: string,
  issue?: string
): GetPromptResult {
  const printerArg = printer ? ` with printer: "${printer}"` : "";
  const issueContext = issue
    ? `The user reports the following issue: "${issue}"\n\n`
    : "";

  return {
    description: "Klipper printer troubleshooting workflow",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `${issueContext}Please help me troubleshoot my Klipper 3D printer. Follow this systematic workflow:

## Step 1: Check Printer State
Use the \`get_printer_status\` tool${printerArg} to check the current printer state, temperatures, and any error messages.

## Step 2: Review Recent Print History
Use the \`get_print_history\` tool${printerArg} to check for recent failed prints and their statuses.

## Step 3: Examine Klipper Logs
Read the actual log files to find what errors occurred. Start by reading the end of klippy.log with \`get_log_file\`${printerArg} (last 200 lines) to see recent activity. Read the actual errors from the logs — do not assume or guess what errors occurred.

If the initial read doesn't show errors, use the \`search\` parameter to find them — but base your search terms on what you've already seen in the printer state and print history (e.g., if a print shows "klippy_shutdown" status, search for "shutdown").

## Step 4: Check System Health (if relevant)
Use the \`get_system_info\` tool${printerArg} if logs suggest resource issues (CPU, memory, throttling).

## Step 5: Check Moonraker Logs (if relevant)
Use \`get_log_file\` with filename "moonraker.log"${printerArg} if the issue appears API or connectivity related.

## Step 6: Review Configuration (if relevant)
If the logs point to a configuration issue, use \`read_config_file\`${printerArg} to examine the relevant config sections.

## Diagnosis
After gathering information from the actual logs, provide:
1. The specific error(s) found in the logs, with exact messages
2. A clear explanation of what went wrong
3. The root cause based on log evidence
4. Specific steps to fix the issue
5. Any config changes needed (show exact values)

## Reference
The \`troubleshooting-guide\` resource contains a reference of common Klipper errors and their resolutions — consult it if you encounter errors you need more context on.`,
        },
      },
    ],
  };
}
