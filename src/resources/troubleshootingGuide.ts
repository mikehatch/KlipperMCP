export const TROUBLESHOOTING_GUIDE = `# Klipper Troubleshooting Guide

## Log File Reference

| File | Contains | When to Check |
|------|----------|---------------|
| klippy.log | Klipper firmware logs, config parsing, MCU communication, print events | Printer errors, shutdowns, config issues |
| moonraker.log | API server logs, update manager, file operations | API errors, connectivity issues |
| crowsnail.log / webcamd.log | Camera/webcam service logs | Camera/streaming issues |

## Common Klipper Errors

### "Timer too close" (MCU Shutdown)
**Meaning:** The MCU could not schedule the next step event in time.
**Causes:**
- Host CPU overload (check with get_system_info)
- USB communication latency or disconnects
- Excessive stepper activity at high speeds
**Resolution:**
- Check CPU usage via get_system_info
- Reduce max_velocity/max_accel in printer.cfg
- Use a dedicated USB cable (not a hub)
- Check for thermal throttling on Raspberry Pi

### "MCU 'mcu' shutdown: ..."
**Meaning:** The microcontroller entered a shutdown state.
**Causes:** Various - the message after "shutdown:" contains the specific reason.
**Resolution:** Search klippy.log for "shutdown" to find the full error context.

### "Heater <name> not heating at expected rate"
**Meaning:** PID control detected the heater is not reaching target temperature fast enough.
**Causes:**
- Incorrect PID tuning
- Faulty thermistor or heater cartridge
- Loose wiring connections
- Wrong thermistor type configured
**Resolution:**
- Run PID_CALIBRATE for the affected heater
- Check wiring connections
- Verify sensor_type in config matches actual thermistor

### "Move out of range"
**Meaning:** A requested move would exceed configured position limits.
**Causes:**
- Incorrect position_min/position_max in stepper config
- Home position offset issues
- GCode requesting positions outside the print area
**Resolution:**
- Check [stepper_x], [stepper_y], [stepper_z] position limits
- Verify home offset and endstop positions
- Check slicer bed size settings

### "Probe triggered prior to movement"
**Meaning:** The Z probe reported as triggered before the probing move started.
**Causes:**
- Z offset too low (nozzle already pressing bed)
- Probe wiring issue (stuck triggered)
- Electrical noise on probe signal line
**Resolution:**
- Increase z_offset (make less negative)
- Check probe wiring and connections
- Use QUERY_PROBE to check current probe state

### "Lost communication with MCU '<name>'"
**Meaning:** Klipper lost serial/USB connection to the microcontroller.
**Causes:**
- USB cable disconnect or failure
- MCU hardware fault or reset
- Kernel USB driver issues
- Power supply issues
**Resolution:**
- Check USB cable connection
- Try a different USB cable/port
- Check dmesg/journalctl for USB errors
- Verify power supply stability

### "ADC out of range"
**Meaning:** An analog-to-digital converter reading is outside expected bounds.
**Causes:**
- Disconnected thermistor
- Short circuit in thermistor wiring
- Wrong pullup resistor configuration
**Resolution:**
- Check thermistor wiring continuity
- Verify pullup_pin configuration
- Inspect for damaged wiring

## Shutdown/Disconnect Patterns

- **"klippy_shutdown"** in print history: Klipper entered a controlled shutdown (usually from an error).
- **"klippy_disconnect"** in print history: Klipper process crashed or restarted during a print.

Search klippy.log for "shutdown" or "error" around the timestamp of the failed print.

## Troubleshooting Decision Tree

1. **Printer not responding?**
   - Check get_printer_status for state
   - If "error" or "shutdown": check klippy.log
   - If unreachable: check moonraker.log, verify network

2. **Print failed?**
   - Check get_print_history for the job status
   - Search klippy.log for errors near the print time
   - If "klippy_shutdown": search for "shutdown" in logs
   - If "klippy_disconnect": check USB and system stability

3. **Temperature issues?**
   - Check get_printer_status objects: extruder, heater_bed
   - Search klippy.log for "heater" or "temperature"
   - Run PID calibration if temps are unstable

4. **Movement issues?**
   - Check klippy.log for "move" or "range" or "endstop"
   - Verify stepper config with read_config_file
   - Check position limits and homing settings
`;
