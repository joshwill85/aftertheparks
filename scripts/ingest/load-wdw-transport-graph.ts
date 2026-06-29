import {
  DEFAULT_TRANSPORT_GRAPH_PATH,
  assertValidTransportGraph,
  buildResortTransportModeSnapshot,
  createSupabaseServiceClient,
  importTransportGraphToSupabase,
  loadResortSlugMap,
  loadTransportGraph,
  validateTransportGraph,
  writeResortTransportModeSnapshot,
} from "@/scripts/ingest/wdw_transport_graph";

interface CliOptions {
  file: string;
  target: "snapshot" | "linked";
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    file: DEFAULT_TRANSPORT_GRAPH_PATH,
    target: "snapshot",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--file") {
      options.file = argv[++index];
    } else if (arg === "--target") {
      const target = argv[++index];
      if (target !== "snapshot" && target !== "linked") {
        throw new Error("--target must be snapshot or linked");
      }
      options.target = target;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const graph = loadTransportGraph(options.file);
  const validation = validateTransportGraph(graph, options.file);
  assertValidTransportGraph(validation);

  const resortSlugMap = loadResortSlugMap();
  const snapshot = buildResortTransportModeSnapshot(graph, options.file, resortSlugMap);
  writeResortTransportModeSnapshot(snapshot);

  if (options.target === "linked") {
    await importTransportGraphToSupabase(
      graph,
      options.file,
      createSupabaseServiceClient(),
      resortSlugMap
    );
  }

  console.log(
    JSON.stringify(
      {
        status: "ok",
        target: options.target,
        graphId: snapshot.graphId,
        counts: validation.counts,
        resortModeRows: snapshot.resorts.length,
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
