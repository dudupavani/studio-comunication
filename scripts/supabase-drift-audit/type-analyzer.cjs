"use strict";

const {
  normalizeIdentifier,
  normalizeWhitespace,
  readTextIfExists,
} = require("./utils.cjs");

function extractSection(text, sectionName, nextSectionNames) {
  const startRegex = new RegExp(`^\\s{4}${sectionName}: \\{$`, "m");
  const startMatch = startRegex.exec(text);

  if (!startMatch) {
    return "";
  }

  const startIndex = startMatch.index + startMatch[0].length;
  let endIndex = text.length;

  for (const nextSectionName of nextSectionNames) {
    const nextRegex = new RegExp(`^\\s{4}${nextSectionName}:`, "m");
    const nextMatch = nextRegex.exec(text.slice(startIndex));
    if (!nextMatch) continue;

    const candidateEndIndex = startIndex + nextMatch.index;
    if (candidateEndIndex < endIndex) {
      endIndex = candidateEndIndex;
    }
  }

  return text.slice(startIndex, endIndex);
}

function parseNamesFromSection(sectionText) {
  const names = [];
  const entryRegex = /^ {6}("?[\w.]+"?):/gm;
  let match = entryRegex.exec(sectionText);

  while (match) {
    names.push(normalizeIdentifier(match[1]));
    match = entryRegex.exec(sectionText);
  }

  return names.sort();
}

function parseFunctions(sectionText) {
  const functions = {};
  const entryRegex = /^ {6}("?[\w.]+"?):\s*(.*)$/gm;
  const matches = Array.from(sectionText.matchAll(entryRegex));

  for (let index = 0; index < matches.length; index += 1) {
    const currentMatch = matches[index];
    const nextMatch = matches[index + 1];
    const functionName = normalizeIdentifier(currentMatch[1]);
    const startIndex = currentMatch.index;
    const endIndex = nextMatch ? nextMatch.index : sectionText.length;
    const signatureText = sectionText.slice(startIndex, endIndex);

    functions[functionName] = {
      name: functionName,
      signature: normalizeWhitespace(signatureText),
    };
  }

  return functions;
}

function parseSupabaseTypesContent(text) {
  const tablesSection = extractSection(text, "Tables", ["Views"]);
  const viewsSection = extractSection(text, "Views", ["Functions"]);
  const functionsSection = extractSection(text, "Functions", ["Enums"]);
  const enumsSection = extractSection(text, "Enums", ["CompositeTypes"]);

  return {
    tables: parseNamesFromSection(tablesSection),
    views: parseNamesFromSection(viewsSection),
    functions: parseFunctions(functionsSection),
    enums: parseNamesFromSection(enumsSection),
  };
}

function loadLocalSupabaseTypes(cwd) {
  const typesPath = `${cwd}/src/types/supabase.ts`;
  const content = readTextIfExists(typesPath);

  return {
    filePath: typesPath,
    exists: Boolean(content),
    content: content || "",
    parsed: content ? parseSupabaseTypesContent(content) : null,
  };
}

module.exports = {
  loadLocalSupabaseTypes,
  parseSupabaseTypesContent,
};
