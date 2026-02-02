# Klipper MCP Server

An MCP (Model Context Protocol) server that enables Claude to read and manage Klipper 3D printer configuration files through the Moonraker API.

## Features

- **Multi-printer support** - Configure multiple printers and reference them by name
- **Read configuration files** - View printer.cfg and all included config files
- **Write with safety** - Two-phase confirmation and automatic backups before changes
- **Search across configs** - Find settings across all configuration files
- **Works with Claude Desktop and VS Code** - Use with any MCP-compatible client

## Prerequisites

- Node.js 20 or higher
- A Klipper printer with Moonraker API accessible on your network
- Claude Desktop or VS Code with Claude extension

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/KlipperClaudeMCP.git
   cd KlipperClaudeMCP
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
      "args": ["/path/to/KlipperClaudeMCP/dist/index.js"],
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
| `WRITE_CONFIRMATION_REQUIRED` | Require confirmation for writes (default: `true`) |

## Available Tools

| Tool | Description |
|------|-------------|
| `list_printers` | List all configured printers and their URLs |
| `list_config_files` | List configuration files in the config directory |
| `read_config_file` | Read the contents of a configuration file |
| `write_config_file` | Write or update a configuration file (with confirmation) |
| `search_configs` | Search for patterns across all configuration files |
| `get_config_info` | Get detailed info about a file including sections and includes |

## Usage Examples

Once configured, you can ask Claude:

- "List my printers"
- "Show the config files on my Voron"
- "Read the printer.cfg from Ender"
- "Search for 'pressure_advance' across all configs"
- "What sections are in my printer.cfg?"
- "Update the max_velocity in the [printer] section to 300"

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

This MCP server connects to your Klipper printer's Moonraker API to access configuration files. It runs locally on your machine and communicates with Claude through the Model Context Protocol.

```
Claude <--MCP--> Klipper MCP Server <--HTTP--> Moonraker <---> Klipper
```

## Resources

- [Klipper Documentation](https://www.klipper3d.org/)
- [Moonraker API Documentation](https://moonraker.readthedocs.io/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

MIT
