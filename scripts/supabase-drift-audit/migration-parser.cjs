"use strict";

const path = require("node:path");

const {
  normalizeIdentifier,
  readTextIfExists,
  stripSqlComments,
  walkFiles,
} = require("./utils.cjs");

function createArtifactBucket() {
  return {
    tables: {},
    views: {},
    functions: {},
    enums: {},
    policies: {},
    triggers: {},
  };
}

function registerArtifact(bucket, kind, name, source) {
  if (!name) return;
  if (!bucket[kind][name]) {
    bucket[kind][name] = [];
  }
  bucket[kind][name].push(source);
}

function parseSqlArtifacts(sqlText, source) {
  const bucket = createArtifactBucket();
  const sql = stripSqlComments(sqlText);

  const patterns = [
    {
      kind: "tables",
      regex:
        /create\s+table(?:\s+if\s+not\s+exists)?\s+([a-zA-Z0-9_."-]+)\s*\(/gi,
    },
    {
      kind: "views",
      regex:
        /create\s+(?:materialized\s+)?view(?:\s+if\s+not\s+exists)?\s+([a-zA-Z0-9_."-]+)/gi,
    },
    {
      kind: "functions",
      regex:
        /create\s+(?:or\s+replace\s+)?function\s+([a-zA-Z0-9_."-]+)\s*\(/gi,
    },
    {
      kind: "enums",
      regex:
        /create\s+type(?:\s+if\s+not\s+exists)?\s+([a-zA-Z0-9_."-]+)\s+as\s+enum/gi,
    },
    {
      kind: "triggers",
      regex:
        /create\s+(?:or\s+replace\s+)?trigger\s+("[^"]+"|[a-zA-Z0-9_.-]+)\s+/gi,
    },
  ];

  for (const pattern of patterns) {
    let match = pattern.regex.exec(sql);
    while (match) {
      registerArtifact(
        bucket,
        pattern.kind,
        normalizeIdentifier(match[1]),
        source,
      );
      match = pattern.regex.exec(sql);
    }
  }

  const policyRegex =
    /create\s+policy\s+("[^"]+"|[a-zA-Z0-9_.-]+)\s+on\s+([a-zA-Z0-9_."-]+)/gi;
  let policyMatch = policyRegex.exec(sql);

  while (policyMatch) {
    const policyName = normalizeIdentifier(policyMatch[1]);
    const tableName = normalizeIdentifier(policyMatch[2]);
    registerArtifact(bucket, "policies", `${tableName}:${policyName}`, source);
    policyMatch = policyRegex.exec(sql);
  }

  return bucket;
}

function mergeArtifacts(target, source) {
  for (const kind of Object.keys(target)) {
    for (const [name, sources] of Object.entries(source[kind])) {
      if (!target[kind][name]) {
        target[kind][name] = [];
      }
      target[kind][name].push(...sources);
    }
  }
}

function parseLocalMigrations(cwd) {
  const migrationsDir = path.join(cwd, "database/migrations");
  const files = walkFiles(migrationsDir, {
    allowedExtensions: [".sql"],
  });
  const aggregated = createArtifactBucket();

  for (const filePath of files) {
    const content = readTextIfExists(filePath);
    if (!content) continue;
    mergeArtifacts(
      aggregated,
      parseSqlArtifacts(content, path.relative(cwd, filePath)),
    );
  }

  return {
    directory: migrationsDir,
    files: files.map((filePath) => path.relative(cwd, filePath)),
    parsed: aggregated,
  };
}

module.exports = {
  parseLocalMigrations,
  parseSqlArtifacts,
};
