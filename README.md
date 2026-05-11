# AgentQL MCP Server

MCP server for web data extraction and browser automation via [AgentQL](https://agentql.com). Supports one-shot stateless extraction and full cloud browser sessions with semantic queries.

## Features

### Tools

| Tool | Description |
|------|-------------|
| `extract-web-data` | One-shot data extraction from a URL using natural language. No browser session needed — just provide a URL and describe what you want. |
| `create_session` | Provision a Tetra cloud browser and get a CDP URL for direct Playwright control. Use when you need to browse, interact, or handle multi-step workflows. |
| `close_session` | Tear down a browser session. |
| `query_data` | Extract structured data from a page in an active browser session using AgentQL's semantic query language. |
| `query_elements` | Find interactive elements on a page and get actionable CSS selectors you can use over CDP to click, type, or interact. |

### When to use what

```
"I need web data"
        │
  Single URL, no interaction needed?
        │
    YES │           NO
        ▼           ▼
 extract-web-data   create_session → browse via CDP
 (one call, done)   → query_data / query_elements
                    → close_session
```

- **`extract-web-data`**: Quick, stateless. Give it a URL and a prompt, get JSON back. Best for scraping a single page.
- **`create_session` + browser tools**: Full browser control. Navigate across pages, click buttons, fill forms, handle auth flows, extract data along the way.

## Installation

Get an API key from the [AgentQL Dev Portal](https://dev.agentql.com), then configure in your MCP client.

### Install the package

```bash
npm install -g agentql-mcp
```

### Configure Claude

- Open Claude Desktop **Settings** via `⌘`+`,` (don't confuse with Claude Account Settings)
- Go to **Developer** sidebar section
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

### Configure VS Code

For one-click installation, click one of the install buttons below:

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-NPM-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=agentql&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22agentql-mcp%22%5D%2C%22env%22%3A%7B%22AGENTQL_API_KEY%22%3A%22%24%7Binput%3AapiKey%7D%22%7D%7D&inputs=%5B%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22apiKey%22%2C%22description%22%3A%22AgentQL+API+Key%22%2C%22password%22%3Atrue%7D%5D) [![Install with NPX in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-NPM-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=agentql&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22agentql-mcp%22%5D%2C%22env%22%3A%7B%22AGENTQL_API_KEY%22%3A%22%24%7Binput%3AapiKey%7D%22%7D%7D&inputs=%5B%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22apiKey%22%2C%22description%22%3A%22AgentQL+API+Key%22%2C%22password%22%3Atrue%7D%5D&quality=insiders)

#### Manual Installation

Add the following JSON block to your User Settings (JSON) file in VS Code. You can do this by pressing `Ctrl + Shift + P` and typing `Preferences: Open User Settings (JSON)`.

```json
{
  "mcp": {
    "inputs": [
      {
        "type": "promptString",
        "id": "apiKey",
        "description": "AgentQL API Key",
        "password": true
      }
    ],
    "servers": {
      "agentql": {
        "command": "npx",
        "args": ["-y", "agentql-mcp"],
        "env": {
          "AGENTQL_API_KEY": "${input:apiKey}"
        }
      }
    }
  }
}
```

Optionally, you can add it to a file called `.vscode/mcp.json` in your workspace. This will allow you to share the configuration with others.

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "apiKey",
      "description": "AgentQL API Key",
      "password": true
    }
  ],
  "servers": {
    "agentql": {
      "command": "npx",
      "args": ["-y", "agentql-mcp"],
      "env": {
        "AGENTQL_API_KEY": "${input:apiKey}"
      }
    }
  }
}
```

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

### Validate MCP integration

Give your agent a task that will require extracting data from the web:

```text
Extract the list of videos from the page https://www.youtube.com/results?search_query=agentql, every video should have a title, an author name, a number of views and a url to the video. Make sure to exclude ads items. Format this as a markdown table.
```

Or try a browser session workflow:

```text
Go to https://agentql.com/pricing, find all the plan names and their prices, then click on the Professional plan's sign-up button and tell me what page it navigates to.
```

> [!TIP]
> In case your agent complains that it can't open urls or load content from the web instead of using AgentQL, try adding "use tools" or "use agentql tool" hint.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        Agent                             │
│  ┌────────────┐         ┌────────────────────────────┐   │
│  │ MCP Client │         │ Native Browser (Playwright) │  │
│  └─────┬──────┘         └─────────────┬──────────────┘   │
└────────┼──────────────────────────────┼──────────────────┘
         │ stdio                        │ CDP WebSocket
         ▼                              ▼
┌────────────────────────┐   ┌─────────────────────────┐
│     MCP Server         │   │  Tetra Cloud Browser    │
│                        │   │  (Chromium instance)    │
│  extract-web-data ─REST─▶ AgentQL API               │
│                        │   │                         │
│  create_session ───────┼──▶│  wss://cdp-url          │
│  close_session         │   │                         │
│  query_data ───────────┼──▶│  (semantic queries)     │
│  query_elements ───────┼──▶│                         │
└────────────────────────┘   └─────────────────────────┘
```

- **`extract-web-data`** hits the AgentQL REST API directly — no browser management needed
- **Browser session tools** provision a Tetra cloud browser and hold a CDP connection. The agent connects to the same browser via CDP for direct control. Semantic queries (`query_data`, `query_elements`) run through AgentQL SDK on the MCP server's connection.

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
