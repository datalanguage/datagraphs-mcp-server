#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import DataGraphs from "@datalanguage/datagraphs-client";
import { registerTools } from "./tools.js";
import { discoverSchema, generateInstructions } from "./instructions.js";

// Lazy-initialize client on first tool call so the server can always start,
// even if env vars aren't set yet. Missing config is reported as tool errors.
let client;
function getClient() {
  if (!client) {
    client = new DataGraphs();
  }
  return client;
}

// Discover schema and generate instructions before starting the server.
// This fetches the data model and datasets so the LLM client knows what
// data this server contains and when to use it.
const schema = await discoverSchema(getClient);
const instructions = generateInstructions(schema);

const serverName = process.env.DATAGRAPHS_SERVER_NAME || "datagraphs";

const server = new McpServer(
  { name: serverName, version: "1.0.0" },
  { instructions }
);

registerTools(server, getClient);

// Expose the data model as a resource so the LLM can read the full schema
// on demand for building precise queries.
if (schema.model) {
  server.registerResource(
    "data-model",
    "datagraphs://model",
    {
      description:
        "The data model (ontology) for this knowledge graph — all entity types, properties, and relationships",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(schema.model, null, 2),
          mimeType: "application/json",
        },
      ],
    })
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
