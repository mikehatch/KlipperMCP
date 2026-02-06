/**
 * Safety utilities for GCode and printer control operations
 */

export interface SafetyWarning {
  pattern: string;
  message: string;
  severity: "warning" | "danger";
}

/**
 * Dangerous GCode patterns that require user confirmation
 */
export const DANGEROUS_GCODE_PATTERNS: Array<{
  pattern: RegExp;
  message: string;
  severity: "warning" | "danger";
}> = [
  // Emergency stop
  {
    pattern: /\bM112\b/i,
    message: "M112 triggers an emergency stop",
    severity: "danger",
  },
  // Heating commands
  {
    pattern: /\bM104\b/i,
    message: "M104 sets extruder temperature",
    severity: "warning",
  },
  {
    pattern: /\bM109\b/i,
    message: "M109 waits for extruder temperature",
    severity: "warning",
  },
  {
    pattern: /\bM140\b/i,
    message: "M140 sets bed temperature",
    severity: "warning",
  },
  {
    pattern: /\bM190\b/i,
    message: "M190 waits for bed temperature",
    severity: "warning",
  },
  {
    pattern: /\bSET_HEATER_TEMPERATURE\b/i,
    message: "SET_HEATER_TEMPERATURE modifies heater settings",
    severity: "warning",
  },
  // Movement without homing
  {
    pattern: /\bG28\b/i,
    message: "G28 homes the printer axes",
    severity: "warning",
  },
  {
    pattern: /\bG0\b/i,
    message: "G0 performs rapid movement",
    severity: "warning",
  },
  {
    pattern: /\bG1\b/i,
    message: "G1 performs linear movement",
    severity: "warning",
  },
  // Motor control
  {
    pattern: /\bM84\b/i,
    message: "M84 disables stepper motors",
    severity: "warning",
  },
  {
    pattern: /\bM18\b/i,
    message: "M18 disables stepper motors",
    severity: "warning",
  },
  // Fan control
  {
    pattern: /\bM106\b/i,
    message: "M106 sets fan speed",
    severity: "warning",
  },
  {
    pattern: /\bM107\b/i,
    message: "M107 turns off fan",
    severity: "warning",
  },
  // Dangerous Klipper macros
  {
    pattern: /\bFIRMWARE_RESTART\b/i,
    message: "FIRMWARE_RESTART restarts the printer firmware",
    severity: "danger",
  },
  {
    pattern: /\bRESTART\b/i,
    message: "RESTART reloads Klipper configuration",
    severity: "danger",
  },
  // Probe and calibration
  {
    pattern: /\bPROBE\b/i,
    message: "PROBE performs a probe measurement",
    severity: "warning",
  },
  {
    pattern: /\bPROBE_CALIBRATE\b/i,
    message: "PROBE_CALIBRATE starts probe calibration",
    severity: "warning",
  },
  {
    pattern: /\bBED_MESH_CALIBRATE\b/i,
    message: "BED_MESH_CALIBRATE performs bed mesh probing",
    severity: "warning",
  },
  {
    pattern: /\bZ_TILT_ADJUST\b/i,
    message: "Z_TILT_ADJUST adjusts Z tilt",
    severity: "warning",
  },
  {
    pattern: /\bQUAD_GANTRY_LEVEL\b/i,
    message: "QUAD_GANTRY_LEVEL levels the gantry",
    severity: "warning",
  },
  // PID tuning
  {
    pattern: /\bPID_CALIBRATE\b/i,
    message: "PID_CALIBRATE runs PID tuning (heats components)",
    severity: "danger",
  },
  // Save config
  {
    pattern: /\bSAVE_CONFIG\b/i,
    message: "SAVE_CONFIG saves settings and restarts Klipper",
    severity: "danger",
  },
];

/**
 * Check GCode script for dangerous patterns
 * @param script The GCode script to check
 * @returns Array of warnings for dangerous patterns found
 */
export function checkGcodeSafety(script: string): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];

  for (const { pattern, message, severity } of DANGEROUS_GCODE_PATTERNS) {
    if (pattern.test(script)) {
      warnings.push({
        pattern: pattern.source,
        message,
        severity,
      });
    }
  }

  return warnings;
}

/**
 * Messages for dangerous actions requiring confirmation
 */
export const DANGEROUS_ACTION_MESSAGES = {
  emergencyStop: "Emergency stop will immediately halt the printer. This may cause print failures and require re-homing.",
  cancelPrint: "Canceling the print will abort the current job. The printer will stop and cool down.",
  restartKlipper: "Restarting Klipper will reload all configuration. Any unsaved changes will be lost.",
  firmwareRestart: "Firmware restart will reset the microcontroller. The printer will need to be re-homed.",
  restartMoonraker: "Restarting Moonraker will temporarily disconnect all clients.",
  dangerousGcode: "The GCode script contains potentially dangerous commands that could cause damage or injury if used incorrectly.",
} as const;

/**
 * Check if any warnings are of danger severity
 */
export function hasDangerousWarnings(warnings: SafetyWarning[]): boolean {
  return warnings.some(w => w.severity === "danger");
}
