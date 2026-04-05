"use strict";

const fs = require("node:fs");
const path = require("node:path");

const {
  createTempDir,
  cleanupDir,
  readTextIfExists,
  runCommand,
} = require("./utils.cjs");
const { parseSupabaseTypesContent } = require("./type-analyzer.cjs");
const { parseSqlArtifacts } = require("./migration-parser.cjs");

function attemptRemoteTypesViaLinked(cwd) {
  return runCommand(
    "supabase",
    ["gen", "types", "--linked", "--lang", "typescript", "--schema", "public"],
    { cwd },
  );
}

function attemptRemoteTypesViaProjectId(cwd, projectRef) {
  if (!projectRef) {
    return null;
  }

  return runCommand(
    "supabase",
    [
      "gen",
      "types",
      "--project-id",
      projectRef,
      "--lang",
      "typescript",
      "--schema",
      "public",
    ],
    { cwd },
  );
}

function attemptRemoteTypesViaDbUrl(cwd, dbUrl) {
  if (!dbUrl) {
    return null;
  }

  return runCommand(
    "supabase",
    ["gen", "types", "--db-url", dbUrl, "--lang", "typescript", "--schema", "public"],
    { cwd },
  );
}

function fetchRemoteTypes(cwd, envInfo) {
  const attempts = [];
  const linkedAttempt = attemptRemoteTypesViaLinked(cwd);
  attempts.push({ method: "linked", ...linkedAttempt });
  if (linkedAttempt.ok && linkedAttempt.stdout.trim()) {
    return {
      ok: true,
      method: "linked",
      content: linkedAttempt.stdout,
      parsed: parseSupabaseTypesContent(linkedAttempt.stdout),
      attempts,
    };
  }

  const projectIdAttempt = attemptRemoteTypesViaProjectId(
    cwd,
    envInfo.envProjectRef || envInfo.linkedProjectRef,
  );
  if (projectIdAttempt) {
    attempts.push({ method: "project-id", ...projectIdAttempt });
    if (projectIdAttempt.ok && projectIdAttempt.stdout.trim()) {
      return {
        ok: true,
        method: "project-id",
        content: projectIdAttempt.stdout,
        parsed: parseSupabaseTypesContent(projectIdAttempt.stdout),
        attempts,
      };
    }
  }

  const dbUrlAttempt = attemptRemoteTypesViaDbUrl(
    cwd,
    envInfo.remoteAccess.directDbUrl,
  );
  if (dbUrlAttempt) {
    attempts.push({ method: "db-url", ...dbUrlAttempt });
    if (dbUrlAttempt.ok && dbUrlAttempt.stdout.trim()) {
      return {
        ok: true,
        method: "db-url",
        content: dbUrlAttempt.stdout,
        parsed: parseSupabaseTypesContent(dbUrlAttempt.stdout),
        attempts,
      };
    }
  }

  return {
    ok: false,
    method: null,
    content: "",
    parsed: null,
    attempts,
  };
}

function attemptSchemaDump(cwd, args) {
  const tempDir = createTempDir();
  const tempFile = path.join(tempDir, "remote-schema.sql");

  const result = runCommand("supabase", [...args, "--file", tempFile], { cwd });
  const content = readTextIfExists(tempFile) || "";

  cleanupDir(tempDir);

  return {
    ...result,
    content,
  };
}

function fetchRemoteSchemaDump(cwd, envInfo) {
  const attempts = [];

  if (envInfo.credentials.hasDbPassword) {
    const linkedAttempt = attemptSchemaDump(cwd, [
      "db",
      "dump",
      "--linked",
      "--schema",
      "public",
      "--password",
      envInfo.secrets.dbPassword,
    ]);
    attempts.push({ method: "linked-password", ...linkedAttempt });
    if (linkedAttempt.ok && linkedAttempt.content.trim()) {
      return {
        ok: true,
        method: "linked-password",
        content: linkedAttempt.content,
        parsed: parseSqlArtifacts(linkedAttempt.content, "remote"),
        attempts,
      };
    }
  }

  if (envInfo.remoteAccess.directDbUrl) {
    const dbUrlAttempt = attemptSchemaDump(cwd, [
      "db",
      "dump",
      "--db-url",
      envInfo.remoteAccess.directDbUrl,
      "--schema",
      "public",
    ]);
    attempts.push({ method: "db-url", ...dbUrlAttempt });
    if (dbUrlAttempt.ok && dbUrlAttempt.content.trim()) {
      return {
        ok: true,
        method: "db-url",
        content: dbUrlAttempt.content,
        parsed: parseSqlArtifacts(dbUrlAttempt.content, "remote"),
        attempts,
      };
    }
  }

  return {
    ok: false,
    method: null,
    content: "",
    parsed: null,
    attempts,
  };
}

module.exports = {
  fetchRemoteSchemaDump,
  fetchRemoteTypes,
};
