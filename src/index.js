#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import DataGraphs from "@datalanguage/datagraphs-client";
import { registerTools } from "./tools.js";

const server = new McpServer({
  name: "datagraphs",
  version: "1.0.0",
});

// Lazy-initialize client on first tool call so the server can always start,
// even if env vars aren't set yet. Missing config is reported as tool errors.
let client;
function getClient() {
  if (!client) {
    client = new DataGraphs();
  }
  return client;
}

registerTools(server, getClient);

const transport = new StdioServerTransport();
await server.connect(transport);
