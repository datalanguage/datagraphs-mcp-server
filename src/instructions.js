/**
 * Auto-discovers the knowledge graph schema and generates MCP server
 * instructions so LLM clients know what data this server contains
 * and when to use it.
 */

const GENERIC_PROPERTIES = new Set(["name", "description", "image", "label"]);

/**
 * Fetches the model and datasets from the Data Graphs API.
 * Returns partial results gracefully if some calls fail.
 */
export async function discoverSchema(getClient) {
  if (process.env.DATAGRAPHS_INSTRUCTIONS) {
    return { model: null, datasets: null, explicit: true };
  }

  try {
    const client = getClient();
    const [model, datasets] = await Promise.allSettled([
      client.models.getActive(),
      client.datasets.all(),
    ]);

    return {
      model: model.status === "fulfilled" ? model.value : null,
      datasets: datasets.status === "fulfilled" ? datasets.value : null,
    };
  } catch {
    return { model: null, datasets: null };
  }
}

/**
 * Generates MCP server instructions from the discovered schema.
 */
export function generateInstructions(schema) {
  if (schema.explicit) {
    return process.env.DATAGRAPHS_INSTRUCTIONS;
  }

  const { model, datasets } = schema;

  if (!model && !datasets) {
    return fallbackInstructions();
  }

  const parts = [];

  // Header with model name
  if (model?.name) {
    parts.push(
      `This MCP server provides access to "${model.name}", a Data Graphs knowledge graph.`
    );
  } else {
    parts.push(
      "This MCP server provides access to a Data Graphs knowledge graph."
    );
  }

  // Datasets summary
  if (datasets?.results?.length) {
    const total = datasets.search?.totalConcepts || 0;
    parts.push("");
    parts.push(`Datasets (${total.toLocaleString()} total items):`);
    for (const ds of datasets.results) {
      const types = ds.conceptTypes?.join(", ") || "";
      parts.push(
        `- ${ds.name}: ${ds.totalConcepts.toLocaleString()} ${types}`
      );
    }
  }

  // Data model summary
  if (model?.classes?.length) {
    parts.push("");
    parts.push("Data model:");

    // Identify which types live in datasets (these are the primary queryable types)
    const datasetTypes = new Set(
      (datasets?.results || []).flatMap((ds) => ds.conceptTypes || [])
    );

    // Identify base classes (classes that other classes extend)
    const baseClassNames = new Set(
      model.classes.map((c) => c.subClassOf).filter(Boolean)
    );

    // Identify types referenced by relationships from dataset types
    const referencedTypes = new Set();
    for (const cls of model.classes) {
      if (datasetTypes.has(cls.name)) {
        for (const prop of cls.properties) {
          if (prop.type === "ObjectProperty") {
            referencedTypes.add(prop.range);
          }
        }
      }
    }

    for (const cls of model.classes) {
      // Show classes that have data in datasets, or are referenced by those
      // that do, or have non-trivial properties — but skip pure base classes
      // that only define generic inherited fields
      const inDataset = datasetTypes.has(cls.name);
      const isReferenced = referencedTypes.has(cls.name);
      const hasUniqueProps = cls.properties.some(
        (p) =>
          p.type === "DatatypeProperty" && !GENERIC_PROPERTIES.has(p.name)
      );

      if (
        !inDataset &&
        !isReferenced &&
        !hasUniqueProps &&
        baseClassNames.has(cls.name)
      ) {
        continue;
      }

      const dataProps = cls.properties
        .filter(
          (p) =>
            p.type === "DatatypeProperty" && !GENERIC_PROPERTIES.has(p.name)
        )
        .map((p) => p.name);

      const relationships = cls.properties
        .filter((p) => p.type === "ObjectProperty")
        .map((p) => `${p.name} → ${p.range}`);

      let line = `- ${cls.name}`;
      if (dataProps.length) line += `: ${dataProps.join(", ")}`;
      if (relationships.length) line += ` [${relationships.join("; ")}]`;
      parts.push(line);
    }
  }

  parts.push("");
  parts.push(
    "Use search_concepts to find data, get_concept to fetch details by URN, " +
      "get_model for the full schema, and graph_search for complex relationship queries (GQL/Cypher syntax)."
  );

  return parts.join("\n");
}

function fallbackInstructions() {
  return (
    "This MCP server provides access to a Data Graphs knowledge graph. " +
    "Use list_datasets to discover available data, search_concepts to search, " +
    "get_concept to fetch by URN, get_model to understand the schema, " +
    "and graph_search for complex relationship queries."
  );
}
