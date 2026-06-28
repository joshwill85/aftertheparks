import Module from "node:module";

type ModuleWithLoad = typeof Module & {
  _load: (request: string, parent: NodeModule | null | undefined, isMain: boolean) => unknown;
};

const globalKey = "__afterTheParksServerOnlyStubInstalled";
const globalState = globalThis as typeof globalThis & Record<typeof globalKey, boolean | undefined>;

if (!globalState[globalKey]) {
  const moduleWithLoad = Module as ModuleWithLoad;
  const originalLoad = moduleWithLoad._load;

  moduleWithLoad._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") return {};
    return originalLoad.call(this, request, parent, isMain);
  };

  globalState[globalKey] = true;
}
