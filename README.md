# @datalanguage/datagraphs-mcp-server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that exposes the [Data Graphs](https://www.datalanguage.com/data-graphs) knowledge graph platform to AI assistants such as Claude, ChatGPT, Cursor, and other MCP-compatible clients.

## Prerequisites

- Node.js 18+
- A Data Graphs project with an API key

## Installation

```bash
npm install @datalanguage/datagraphs-mcp-server
```

Or run directly with npx:

```bash
npx @datalanguage/datagraphs-mcp-server
```

## Configuration

### Obtaining Credentials

To generate the API key, client ID, and client secret:

1. Sign in to Data Graphs and open your project.
2. Click **Manage Project**.
3. Go to **Applications** and click **Add Application**.
4. Once the application is created, the API key, client ID, and client secret will be displayed.

> **Important:** The client secret is shown **only once** at creation time. Copy it immediately and store it somewhere secure — if lost, you will need to rotate the credentials or create a new application to obtain a new secret.

Your project ID can also be found on the project page in Data Graphs.

### Environment Variables

The server reads credentials from environment variables:

| Variable                   | Required | Description                                       |
| -------------------------- | -------- | ------------------------------------------------- |
| `DATAGRAPHS_PROJECT_ID`    | Yes      | Your Data Graphs project ID                       |
| `DATAGRAPHS_API_KEY`       | Yes      | API key for authentication                        |
| `DATAGRAPHS_CLIENT_ID`     | For GQL  | OAuth client ID (required for `graph_search`)     |
| `DATAGRAPHS_CLIENT_SECRET` | For GQL  | OAuth client secret (required for `graph_search`) |

## MCP Client Setup

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "datagraphs": {
      "command": "npx",
      "args": ["-y", "@datalanguage/datagraphs-mcp-server"],
      "env": {
        "DATAGRAPHS_PROJECT_ID": "your-project-id",
        "DATAGRAPHS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add datagraphs -- npx -y @datalanguage/datagraphs-mcp-server
```

Then set the required environment variables in your shell before launching Claude Code.

### Cursor

Add to your Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "datagraphs": {
      "command": "npx",
      "args": ["-y", "@datalanguage/datagraphs-mcp-server"],
      "env": {
        "DATAGRAPHS_PROJECT_ID": "your-project-id",
        "DATAGRAPHS_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Tools

The server provides the following tools:

### list_datasets

List all datasets available in the Data Graphs project.

| Parameter  | Type   | Description                |
| ---------- | ------ | -------------------------- |
| `pageSize` | number | Number of results per page |
| `pageNo`   | number | Page number to return      |

### search_concepts

Search for concepts (nodes) across datasets using text queries, filters, and facets.

| Parameter           | Type     | Description                                                    |
| ------------------- | -------- | -------------------------------------------------------------- |
| `dataset`           | string   | Dataset ID to search (defaults to all datasets)                |
| `q`                 | string   | Text search query                                              |
| `filter`            | string   | NQL filter expression                                          |
| `facets`            | string[] | Property names to return facet counts for                      |
| `pageSize`          | number   | Number of results per page (default 10)                        |
| `pageNo`            | number   | Page number to return (default 1)                              |
| `sort`              | string   | Sort order, e.g. `name:asc,modified:desc`                      |
| `embed`             | string[] | Relationship properties to embed (use `["_all"]` to embed all) |
| `fields`            | string[] | Specific fields to return for each concept                     |
| `includeDateFields` | boolean  | Include created and last modified dates                        |

### get_concept

Get a single concept (node) by its URN identifier.

| Parameter           | Type     | Description                                                    |
| ------------------- | -------- | -------------------------------------------------------------- |
| `id`                | string   | Concept URN, e.g. `urn:project:Type:identifier`                |
| `embed`             | string[] | Relationship properties to embed (use `["_all"]` to embed all) |
| `fields`            | string[] | Specific fields to return                                      |
| `includeDateFields` | boolean  | Include created and last modified dates                        |

### graph_search

Execute a GQL graph query against the knowledge graph. Requires `DATAGRAPHS_CLIENT_ID` and `DATAGRAPHS_CLIENT_SECRET`.

| Parameter | Type   | Description                                          |
| --------- | ------ | ---------------------------------------------------- |
| `query`   | string | GQL query, e.g. `MATCH (n:Person) RETURN n LIMIT 10` |

### search_transactions

Search the transaction/audit log for the project.

| Parameter  | Type   | Description                     |
| ---------- | ------ | ------------------------------- |
| `filter`   | string | NQL filter expression           |
| `pageSize` | number | Number of results per page      |
| `pageNo`   | number | Page number to return           |
| `sort`     | string | Sort order, e.g. `property:asc` |

### get_model

Get the currently active data model for the project. Takes no parameters.

## Development

```bash
git clone <repo-url>
cd datagraphs-client-mcp-server
npm install
npm start
```

## License

UNLICENSED
