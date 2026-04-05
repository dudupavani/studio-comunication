#!/usr/bin/env node
/* eslint-disable no-console */
"use strict";

const path = require("node:path");
const dotenv = require("dotenv");

const { inspectEnvironment } = require("./supabase-drift-audit/env-inspector.cjs");
const { parseLocalMigrations } = require("./supabase-drift-audit/migration-parser.cjs");
const { loadLocalSupabaseTypes } = require("./supabase-drift-audit/type-analyzer.cjs");
const { scanCodebase } = require("./supabase-drift-audit/code-scanner.cjs");
const {
  fetchRemoteSchemaDump,
  fetchRemoteTypes,
} = require("./supabase-drift-audit/remote-introspection.cjs");
const { analyzeDrift } = require("./supabase-drift-audit/drift-analyzer.cjs");
const {
  printTerminalSummary,
  writeReports,
} = require("./supabase-drift-audit/report-generator.cjs");
const { applySafeFixes } = require("./supabase-drift-audit/fix-safe-executor.cjs");
const { runCommand } = require("./supabase-drift-audit/utils.cjs");

function parseArgs(argv) {
  const modeArgIndex = argv.indexOf("--mode");
  const modeValue =
    modeArgIndex >= 0 && argv[modeArgIndex + 1]
      ? argv[modeArgIndex + 1]
      : "default";

  return {
    mode:
      modeValue === "ci" || modeValue === "fix-safe" ? modeValue : "default",
  };
}

function loadDotenvFiles(cwd) {
  for (const fileName of [".env", ".env.local"]) {
    dotenv.config({
      path: path.join(cwd, fileName),
      override: false,
    });
  }
}

function executeTypecheck(cwd) {
  return runCommand("npm", ["run", "typecheck", "--", "--pretty", "false"], {
    cwd,
  });
}

async function main() {
  const cwd = process.cwd();
  const startedAt = new Date().toISOString();
  const { mode } = parseArgs(process.argv.slice(2));

  loadDotenvFiles(cwd);

  const envInfo = inspectEnvironment(cwd);
  const remoteTypes = fetchRemoteTypes(cwd, envInfo);

  const safeFixResult =
    mode === "fix-safe" ? applySafeFixes(cwd, remoteTypes) : null;

  const localTypes = loadLocalSupabaseTypes(cwd);
  const localMigrations = parseLocalMigrations(cwd);
  const codeUsage = scanCodebase(cwd);
  const remoteSchema =
    mode === "ci"
      ? { ok: false, method: null, parsed: null, attempts: [] }
      : fetchRemoteSchemaDump(cwd, envInfo);
  const typecheck =
    mode === "ci"
      ? null
      : safeFixResult?.typecheck || executeTypecheck(cwd);

  const analysis = analyzeDrift({
    cwd,
    mode,
    envInfo,
    localTypes,
    remoteTypes,
    localMigrations,
    remoteSchema,
    codeUsage,
    typecheck,
  });

  const report = {
    mode,
    status: analysis.status,
    startedAt,
    finishedAt: new Date().toISOString(),
    refs: {
      envProjectRef: envInfo.envProjectRef,
      linkedProjectRef: envInfo.linkedProjectRef,
    },
    execution: {
      remoteTypes: {
        ok: remoteTypes.ok,
        method: remoteTypes.method,
      },
      remoteSchema: {
        ok: remoteSchema.ok,
        method: remoteSchema.method,
      },
      typecheck: typecheck
        ? {
            ok: typecheck.ok,
            status: typecheck.status,
          }
        : null,
    },
    findings: analysis.findings,
    summary: analysis.summary,
    appliedFixes: safeFixResult?.appliedFixes || [],
  };

  const artifacts = writeReports(cwd, report);
  process.stdout.write(printTerminalSummary(report, artifacts));
  process.exitCode = report.summary.critical > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error("Supabase drift audit failed unexpectedly.");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
