import { z } from "zod";

/**
 * Registers all DataGraphs MCP tools on the given server.
 * @param {import("@modelcontextprotocol/sdk/server/mcp.js").McpServer} server
 * @param {() => import("@datalanguage/datagraphs-client")} getClient
 */
export function registerTools(server, getClient) {
  /**
   * Wraps a tool handler with error handling and lazy client access.
   */
  function handle(fn) {
    return async (args) => {
      try {
        const client = getClient();
        return await fn(client, args);
      } catch (error) {
        return toError(error);
      }
    };
  }

  // ── Read Tools ──────────────────────────────────────────────────────

  server.registerTool(
    "list_datasets",
    {
      description:
        "List all datasets available in the Data Graphs project",
      inputSchema: {
        pageSize: z.number().optional().describe("Number of results per page"),
        pageNo: z.number().optional().describe("Page number to return"),
      },
      annotations: { readOnlyHint: true },
    },
    handle(async (client, { pageSize, pageNo }) => {
      const result = await client.datasets.all({ pageSize, pageNo });
      return toResult(result);
    })
  );

  server.registerTool(
    "search_concepts",
    {
      description:
        "Search for concepts (nodes) across datasets using text queries, filters, and facets",
      inputSchema: {
        dataset: z
          .string()
          .optional()
          .describe(
            'Dataset ID to search. Defaults to "_all" (all datasets)'
          ),
        q: z.string().optional().describe("Text search query"),
        filter: z.string().optional().describe("NQL filter expression"),
        facets: z
          .array(z.string())
          .optional()
          .describe("Property names to return facet counts for"),
        pageSize: z
          .number()
          .optional()
          .describe("Number of results per page (default 10)"),
        pageNo: z
          .number()
          .optional()
          .describe("Page number to return (default 1)"),
        sort: z
          .string()
          .optional()
          .describe(
            "Sort order in format property:asc|desc (e.g. name:asc,modified:desc)"
          ),
        embed: z
          .array(z.string())
          .optional()
          .describe(
            'Relationship properties to embed in response. Use ["_all"] to embed all'
          ),
        fields: z
          .array(z.string())
          .optional()
          .describe("Specific fields to return for each concept"),
        includeDateFields: z
          .boolean()
          .optional()
          .describe("Include created and last modified dates"),
      },
      annotations: { readOnlyHint: true },
    },
    handle(
      async (
        client,
        {
          dataset,
          q,
          filter,
          facets,
          pageSize,
          pageNo,
          sort,
          embed,
          fields,
          includeDateFields,
        }
      ) => {
        const result = await client.concepts.search({
          dataset,
          q,
          filter,
          facets,
          pageSize,
          pageNo,
          sort,
          embed,
          fields,
          includeDateFields,
        });
        return toResult(result);
      }
    )
  );

  server.registerTool(
    "get_concept",
    {
      description: "Get a single concept (node) by its URN identifier",
      inputSchema: {
        id: z
          .string()
          .describe("Concept URN (e.g. urn:project:Type:identifier)"),
        embed: z
          .array(z.string())
          .optional()
          .describe(
            'Relationship properties to embed. Use ["_all"] to embed all'
          ),
        fields: z
          .array(z.string())
          .optional()
          .describe("Specific fields to return"),
        includeDateFields: z
          .boolean()
          .optional()
          .describe("Include created and last modified dates"),
      },
      annotations: { readOnlyHint: true },
    },
    handle(async (client, { id, embed, fields, includeDateFields }) => {
      const result = await client.concepts.get(id, {
        embed,
        fields,
        includeDateFields,
      });
      return toResult(result);
    })
  );

  server.registerTool(
    "graph_search",
    {
      description:
        "Execute a GQL graph query against the knowledge graph. Requires client credentials (DATAGRAPHS_CLIENT_ID and DATAGRAPHS_CLIENT_SECRET).",
      inputSchema: {
        query: z
          .string()
          .describe(
            'GQL query to execute (e.g. "MATCH (n:Person) RETURN n LIMIT 10")'
          ),
      },
      annotations: { readOnlyHint: true },
    },
    handle(async (client, { query }) => {
      const result = await client.concepts.graphSearch({ query });
      return toResult(result);
    })
  );

  server.registerTool(
    "search_transactions",
    {
      description: "Search the transaction/audit log for the project",
      inputSchema: {
        filter: z.string().optional().describe("NQL filter expression"),
        pageSize: z
          .number()
          .optional()
          .describe("Number of results per page"),
        pageNo: z.number().optional().describe("Page number to return"),
        sort: z
          .string()
          .optional()
          .describe("Sort order in format property:asc|desc"),
      },
      annotations: { readOnlyHint: true },
    },
    handle(async (client, { filter, pageSize, pageNo, sort }) => {
      const result = await client.transactions.search({
        filter,
        pageSize,
        pageNo,
        sort,
      });
      return toResult(result);
    })
  );

  server.registerTool(
    "get_model",
    {
      description:
        "Get the currently active model for the Data Graphs project",
      annotations: { readOnlyHint: true },
    },
    handle(async (client) => {
      const result = await client.models.getActive();
      return toResult(result);
    })
  );

}

/**
 * Wraps an API result as an MCP tool result.
 */
function toResult(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Converts an error into an MCP error result with helpful context.
 */
function toError(error) {
  let message = error.message || String(error);

  if (error.constructor?.name === "ConfigurationError") {
    message +=
      "\n\nRequired environment variables: DATAGRAPHS_PROJECT_ID, DATAGRAPHS_API_KEY. GQL queries also require DATAGRAPHS_CLIENT_ID and DATAGRAPHS_CLIENT_SECRET.";
  } else if (error.statusCode) {
    message = `API Error ${error.statusCode} ${error.statusText || ""}`;
    if (error.json) {
      message += "\n" + JSON.stringify(error.json, null, 2);
    } else if (error.body) {
      message += "\n" + error.body;
    }
  } else if (error.constructor?.name === "InvalidUrnError") {
    message += "\n\nURN format: urn:{project}:{type}:{identifier}";
  }

  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
