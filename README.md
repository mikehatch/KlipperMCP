# Klipper MCP Server

An MCP (Model Context Protocol) server that enables Claude to read, manage, and control Klipper 3D printers through the Moonraker API.

With it, you can ask Claude to evaluate your configuration, write macros, monitor prints, execute GCode, and more.

- Search for configuration values when the file is unknown
- Reorganize and add comments / section headers
- Evaluate macros for safety
- Monitor temperatures and print progress
- Start, pause, resume, or cancel prints
- Evaluate Jinja2 templates with live printer data

## Features

- **Multi-printer support** - Configure multiple printers and reference them by name
- **Read configuration files** - View printer.cfg and all included config files
- **Write with safety** - Automatic `.bkp` backups before changes
- **Search across configs** - Find settings across all configuration files
- **Printer status monitoring** - Query temperatures, position, and print progress
- **GCode execution** - Run GCode commands with safety checks for dangerous operations
- **Print control** - Start, pause, resume, or cancel print jobs
- **Template evaluation** - Evaluate Jinja2-style templates with live printer data
- **Job history** - View print history and statistics
- **GCode thumbnails** - Retrieve and display thumbnail images embedded in GCode files
- **System monitoring** - Check CPU, memory, and network status
- **Works with Claude Desktop and VS Code** - Use with any MCP-compatible client

## Prerequisites

- Node.js 20 or higher
- A Klipper printer with Moonraker API accessible on your network
- Claude Desktop or VS Code with Claude extension

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mikehatch/KlipperMCP.git
   cd KlipperMCP
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the server**
   ```bash
   npm run build
   ```

## Configuration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "klipper": {
      "command": "node",
      "args": ["/path/to/KlipperMCP/dist/index.js"],
      "env": {
        "PRINTER_VORON": "http://192.168.1.100:7125",
        "PRINTER_ENDER": "http://192.168.1.101:7125"
      }
    }
  }
}
```

### VS Code

Copy the example configuration:
```bash
cp .vscode/mcp.json.example .vscode/mcp.json
```

Edit `.vscode/mcp.json` with your printer details:
```json
{
  "servers": {
    "klipper": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "PRINTER_VORON": "http://192.168.1.100:7125"
      }
    }
  }
}
```

### Configuration Options

| Environment Variable | Description |
|---------------------|-------------|
| `PRINTER_<NAME>` | Moonraker URL for a printer. Name becomes the printer identifier (lowercase). |
| `PRINTER_<NAME>_API_KEY` | Optional API key if Moonraker requires authentication |
| `MOONRAKER_URL` | Legacy single-printer mode (still supported) |
| `LOG_LEVEL` | Logging level: `debug`, `info`, `warn`, `error` (default: `info`) |

## Available Tools

### Configuration Management

| Tool | Description |
|------|-------------|
| `list_printers` | List all configured printers and their URLs |
| `list_config_files` | List configuration files in the config directory |
| `read_config_file` | Read the contents of a configuration file |
| `write_config_file` | Write or update a configuration file (with automatic backups) |
| `search_configs` | Search for patterns across all configuration files |
| `get_config_info` | Get detailed info about a file including sections and includes |

### Printer Status & Control

| Tool | Description |
|------|-------------|
| `get_printer_status` | Query temperatures, position, print progress, and other status |
| `execute_gcode` | Run GCode commands (with safety confirmation for dangerous commands) |
| `control_print` | Start, pause, resume, or cancel print jobs |
| `emergency_stop` | Immediately halt the printer (requires confirmation) |

### Template Evaluation

| Tool | Description |
|------|-------------|
| `evaluate_template` | Evaluate Jinja2-style templates with live printer data |

The template evaluator supports:
- Variable access: `{{ printer.extruder.temperature }}`
- Bracket notation: `{{ printer["heater_generic chamber"].temperature }}`
- Filters: `{{ value | round(1) }}`, `{{ value | int }}`
- Conditionals: `{% if printer.extruder.temperature > 200 %}Hot{% endif %}`

### GCode Files & History

| Tool | Description |
|------|-------------|
| `list_gcode_files` | List available GCode files with optional metadata (slicer, time, filament, thumbnails) |
| `get_gcode_thumbnail` | Get the thumbnail image for a GCode file (small, medium, large, or largest) |
| `get_print_history` | Query job history and statistics |

### System Information

| Tool | Description |
|------|-------------|
| `get_system_info` | Get system CPU, memory, network, and process stats |
| `restart_services` | Restart Klipper, firmware, or Moonraker (requires confirmation) |

## Safety Features

Dangerous operations require explicit confirmation:

- **GCode execution** - Commands that heat, move, or could damage the printer show warnings
- **Emergency stop** - Requires confirmation
- **Print cancellation** - Requires confirmation to prevent accidental job loss
- **Service restarts** - Klipper, firmware, and Moonraker restarts require confirmation
- **Config writes** - Automatic backups using `.bkp` extension (hidden by Mainsail's "hide backup files" option)

Dangerous GCode patterns detected include:
- Heating commands (M104, M109, M140, M190)
- Movement commands (G0, G1, G28)
- Motor disable (M84, M18)
- Emergency stop (M112)
- Calibration commands (PID_CALIBRATE, PROBE_CALIBRATE)
- Config changes (SAVE_CONFIG, RESTART, FIRMWARE_RESTART)

## Usage Examples

Once configured, you can ask Claude:

**Configuration:**
- "List my printers"
- "Show the config files on my Voron"
- "Read the printer.cfg from Ender"
- "Search for 'pressure_advance' across all configs"
- "What sections are in my printer.cfg?"
- "Update the max_velocity in the [printer] section to 300"

**Monitoring:**
- "What's the current temperature of my extruder?"
- "Show me the printer status"
- "What's the print progress?"

**Control:**
- "Home the printer" (will ask for confirmation)
- "Set the bed temperature to 60°C" (will ask for confirmation)
- "Pause the current print"
- "Cancel the print" (will ask for confirmation)

**Templates:**
- "Evaluate this template: Extruder is at {{ printer.extruder.temperature }}°C"

**Files & History:**
- "List the GCode files available for printing"
- "Show me the thumbnail for benchy.gcode"
- "Show my recent print history"
- "What are my total print statistics?"

**System:**
- "What's the CPU temperature of the printer host?"
- "Restart Klipper to apply config changes" (will ask for confirmation)

When writing files, the server will:
1. Show a preview of changes and ask for confirmation
2. Create an automatic backup before overwriting
3. Remind you to restart Klipper to apply changes

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start the built server
npm start
```

## How It Works

This MCP server connects to your Klipper printer's Moonraker API to access configuration files and control the printer. It runs locally on your machine and communicates with Claude through the Model Context Protocol.

```
Claude <--MCP--> Klipper MCP Server <--HTTP--> Moonraker <---> Klipper
```

## Resources

- [Klipper Documentation](https://www.klipper3d.org/)
- [Moonraker API Documentation](https://moonraker.readthedocs.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

MIT
