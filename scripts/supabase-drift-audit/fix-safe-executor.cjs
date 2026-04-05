"use strict";

const path = require("node:path");

const { normalizeWhitespace, readTextIfExists, runCommand, writeTextFile } = require("./utils.cjs");

const CANONICAL_REEXPORT = `// Fonte única dos tipos do Supabase.
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "@/types/supabase";
`;

function applySafeFixes(cwd, remoteTypes) {
  const appliedFixes = [];
  const localTypesPath = path.join(cwd, "src/types/supabase.ts");
  const localTypesContent = readTextIfExists(localTypesPath) || "";

  if (
    remoteTypes.ok &&
    remoteTypes.content &&
    normalizeWhitespace(remoteTypes.content) !== normalizeWhitespace(localTypesContent)
  ) {
    writeTextFile(
      localTypesPath,
      remoteTypes.content.endsWith("\n")
        ? remoteTypes.content
        : `${remoteTypes.content}\n`,
    );
    appliedFixes.push({
      kind: "regenerate-types",
      filePath: path.relative(cwd, localTypesPath),
      description: "Regenerated src/types/supabase.ts from the active Supabase project.",
    });
  }

  const reexportPath = path.join(cwd, "src/lib/supabase/types.ts");
  const currentReexport = readTextIfExists(reexportPath) || "";

  if (normalizeWhitespace(currentReexport) !== normalizeWhitespace(CANONICAL_REEXPORT)) {
    writeTextFile(reexportPath, CANONICAL_REEXPORT);
    appliedFixes.push({
      kind: "normalize-reexport",
      filePath: path.relative(cwd, reexportPath),
      description: "Normalized src/lib/supabase/types.ts to reexport from src/types/supabase.ts only.",
    });
  }

  const typecheck = runCommand("npm", ["run", "typecheck", "--", "--pretty", "false"], {
    cwd,
  });

  return {
    appliedFixes,
    typecheck,
  };
}

module.exports = {
  applySafeFixes,
};
