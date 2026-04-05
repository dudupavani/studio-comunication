"use strict";

const path = require("node:path");

const { lineNumberFromIndex, readTextIfExists, walkFiles } = require("./utils.cjs");

const CODE_EXTENSIONS = [".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"];

function pushUsage(target, name, filePath, line) {
  if (!target[name]) {
    target[name] = [];
  }

  target[name].push({ filePath, line });
}

function scanContentUsages(content, filePath, rpcUsages, tableUsages) {
  const rpcRegex = /\.rpc\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g;
  const tableRegex = /\.from\(\s*["'`]([a-zA-Z0-9_.-]+)["'`]/g;

  let rpcMatch = rpcRegex.exec(content);
  while (rpcMatch) {
    pushUsage(rpcUsages, rpcMatch[1].toLowerCase(), filePath, lineNumberFromIndex(content, rpcMatch.index));
    rpcMatch = rpcRegex.exec(content);
  }

  let tableMatch = tableRegex.exec(content);
  while (tableMatch) {
    pushUsage(tableUsages, tableMatch[1].toLowerCase(), filePath, lineNumberFromIndex(content, tableMatch.index));
    tableMatch = tableRegex.exec(content);
  }
}

function scanCodebase(cwd) {
  const roots = [path.join(cwd, "src"), path.join(cwd, "scripts")];
  const rpcUsages = {};
  const tableUsages = {};

  for (const rootPath of roots) {
    const files = walkFiles(rootPath, { allowedExtensions: CODE_EXTENSIONS });
    for (const filePath of files) {
      const content = readTextIfExists(filePath);
      if (!content) continue;
      scanContentUsages(
        content,
        path.relative(cwd, filePath),
        rpcUsages,
        tableUsages,
      );
    }
  }

  return {
    rpcUsages,
    tableUsages,
  };
}

module.exports = {
  scanCodebase,
};
