"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const DEFAULT_IGNORED_DIRS = new Set([
  ".git",
  ".next",
  ".pnpm-store",
  "coverage",
  "dist",
  "node_modules",
]);

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function readTextIfExists(filePath) {
  if (!fileExists(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

function writeTextFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function ensureDirSync(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function createTimestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function createTempDir(prefix = "supabase-drift-audit-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanupDir(dirPath) {
  if (!dirPath || !fileExists(dirPath)) return;
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function normalizeIdentifier(value) {
  if (!value) return "";
  const normalized = value.replace(/[",;]/g, "").trim();
  const parts = normalized.split(".");
  return (parts[parts.length - 1] || "").toLowerCase();
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function stripSqlComments(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ");
}

function projectRefFromSupabaseUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    if (!host.includes("supabase")) {
      return null;
    }

    return host.split(".")[0] || null;
  } catch {
    return null;
  }
}

function maskProjectRef(value) {
  if (!value) return null;
  if (value.length <= 8) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function maskCommandForLogs(command, args) {
  return [command, ...args]
    .map((segment) =>
      segment.includes("postgresql://") ? "<redacted-db-url>" : segment,
    )
    .join(" ");
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: { ...process.env, ...(options.env || {}) },
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    command: maskCommandForLogs(command, args),
    error: result.error ? String(result.error.message || result.error) : null,
  };
}

function walkFiles(rootDir, options = {}) {
  const results = [];
  const ignoredDirs = new Set([
    ...DEFAULT_IGNORED_DIRS,
    ...(options.ignoredDirs || []),
  ]);
  const allowedExtensions = options.allowedExtensions || null;

  function visit(currentPath) {
    const stat = fs.statSync(currentPath);

    if (stat.isDirectory()) {
      const directoryName = path.basename(currentPath);
      if (ignoredDirs.has(directoryName)) {
        return;
      }

      const children = fs.readdirSync(currentPath);
      for (const child of children) {
        visit(path.join(currentPath, child));
      }
      return;
    }

    if (
      allowedExtensions &&
      !allowedExtensions.includes(path.extname(currentPath).toLowerCase())
    ) {
      return;
    }

    results.push(currentPath);
  }

  if (fileExists(rootDir)) {
    visit(rootDir);
  }

  return results.sort();
}

function lineNumberFromIndex(text, index) {
  return text.slice(0, index).split("\n").length;
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort();
}

function toRelative(cwd, filePath) {
  return path.relative(cwd, filePath) || ".";
}

module.exports = {
  cleanupDir,
  createTempDir,
  createTimestampSlug,
  ensureDirSync,
  fileExists,
  lineNumberFromIndex,
  maskProjectRef,
  normalizeIdentifier,
  normalizeWhitespace,
  projectRefFromSupabaseUrl,
  readTextIfExists,
  runCommand,
  stripSqlComments,
  toRelative,
  uniqueSorted,
  walkFiles,
  writeTextFile,
};
