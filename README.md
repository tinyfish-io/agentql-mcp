# AgentQL MCP Server

This is a Model Context Protocol (MCP) server that integrates AgentQL data extraction capabilities.

## Features

### Tools

- `extract-web-data` - extract structured data from a given 'url', using 'prompt' as a description of actual data and its fields to extract.

## Installation

### Install the package

```bash
npm install -g agentql-mcp
```

### Configure Claude

- Go to **Settings > Developer**
- Click **Edit Config** and open `claude_desktop_config.json` file
- Add `agentql` server inside `mcpServers` dictionary in the config file
- Restart the app

```json title="claude_desktop_config.json"
{
  "mcpServers": {
    "agentql": {
      "command": "npx",
      "args": ["-y", "agentql-mcp"],
      "env": {
        "AGENTQL_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

Read more about MCP configuration in Claude [here](https://modelcontextprotocol.io/quickstart/user).

### Configure Cursor

- Open **Cursor Settings**
- Go to **MCP > MCP Servers**
- Click **+ Add new MCP Server**
- Enter the following:
  - Name: "agentql" (or your preferred name)
  - Type: "command"
  - Command: `env AGENTQL_API_KEY=YOUR_API_KEY npx -y agentql-mcp`

Read more about MCP configuration in Cursor [here](https://docs.cursor.com/context/model-context-protocol).

### Configure Windsurf

- Open **Windsurf: MCP Configuration Panel**
- Click **Add custom server+**
- Alternatively you can open `~/.codeium/windsurf/mcp_config.json` directly
- Add `agentql` server inside `mcpServers` dictionary in the config file

```json title="mcp_config.json"
{
  "mcpServers": {
    "agentql": {
      "command": "npx",
      "args": ["-y", "agentql-mcp"],
      "env": {
        "AGENTQL_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

Read more about MCP configuration in Windsurf [here](https://docs.codeium.com/windsurf/mcp).

### Validate

Now you can give your agent a task that will be able to use newly added tool. For example:

```text
Extract the list of videos from the page https://www.youtube.com/results?search_query=agentql using tools. Make sure every video has a title, an author name, a number of views and a url to the video. Make sure to exclude ads items. Format this as a markdown table.
```

![AQL Tool Execution](../images/aql_tool_result.png)

> [!TIP]
> In case your agent complains that it can't open urls or load content from the web instead of using AgentQL, try adding "use tools" or "use agentql tool" hint.

## Development

Install dependencies:

```bash
npm install
```

Build the server:

```bash
npm run build
```

For development with auto-rebuild:

```bash
npm run watch
```

If you want to try out development version, you can use the following config instead of the default one:

```json
{
  "mcpServers": {
    "agentql": {
      "command": "/path/to/agentql-mcp/dist/index.js",
      "env": {
        "AGENTQL_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

> [!NOTE]
> Don't forget to remove the default AgentQL MCP server config to not confuse Claude with two similar servers.

## Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.
