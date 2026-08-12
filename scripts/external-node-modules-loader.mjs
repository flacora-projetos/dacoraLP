import { builtinModules, createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const requireFromPortal = createRequire(
  "C:\\Users\\Flávio Corá\\Documents\\PROJETOS PARTICULARES\\SITE DACORA LP\\repo\\package.json",
);

export async function resolve(specifier, context, nextResolve) {
  const isBare =
    !builtinModules.includes(specifier) &&
    !specifier.startsWith(".") &&
    !specifier.startsWith("/") &&
    !specifier.includes(":");
  if (isBare) {
    try {
      return {
        url: pathToFileURL(requireFromPortal.resolve(specifier)).href,
        shortCircuit: true,
      };
    } catch {
      // Let Node and the TSX loader handle built-ins and unresolved specifiers.
    }
  }

  return nextResolve(specifier, context);
}
