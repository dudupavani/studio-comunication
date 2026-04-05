"use strict";

const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const {
  fileExists,
  projectRefFromSupabaseUrl,
  readTextIfExists,
} = require("./utils.cjs");

const ENV_FILES = [".env", ".env.local"];

function loadEnvFile(filePath) {
  if (!fileExists(filePath)) {
    return { path: filePath, present: false, values: {} };
  }

  const raw = fs.readFileSync(filePath, "utf8");
  return {
    path: filePath,
    present: true,
    values: dotenv.parse(raw),
  };
}

function mergeEnvValues(envFiles) {
  const merged = {};

  for (const envFile of envFiles) {
    Object.assign(merged, envFile.values);
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value.length > 0) {
      merged[key] = value;
    }
  }

  return merged;
}

function buildDirectDbUrl(projectRef, dbPassword) {
  if (!projectRef || !dbPassword) return null;
  const encodedPassword = encodeURIComponent(dbPassword);
  return `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`;
}

function inspectEnvironment(cwd) {
  const envFiles = ENV_FILES.map((fileName) =>
    loadEnvFile(path.join(cwd, fileName)),
  );
  const mergedEnv = mergeEnvValues(envFiles);

  const linkedProjectRef = readTextIfExists(
    path.join(cwd, "supabase/.temp/project-ref"),
  )?.trim() || null;
  const poolerUrl =
    readTextIfExists(path.join(cwd, "supabase/.temp/pooler-url"))?.trim() ||
    null;
  const envProjectRef = projectRefFromSupabaseUrl(
    mergedEnv.NEXT_PUBLIC_SUPABASE_URL,
  );

  return {
    envFiles: envFiles.map((envFile) => ({
      path: envFile.path,
      present: envFile.present,
      keys: Object.keys(envFile.values).sort(),
    })),
    linkedProjectRef,
    envProjectRef,
    nextPublicSupabaseUrl: mergedEnv.NEXT_PUBLIC_SUPABASE_URL || null,
    poolerUrl,
    credentials: {
      hasAnonKey: Boolean(mergedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasServiceRoleKey: Boolean(mergedEnv.SUPABASE_SERVICE_ROLE_KEY),
      hasAccessToken: Boolean(mergedEnv.SUPABASE_ACCESS_TOKEN),
      hasDbPassword: Boolean(mergedEnv.SUPABASE_DB_PASSWORD),
    },
    secrets: {
      accessToken: mergedEnv.SUPABASE_ACCESS_TOKEN || null,
      dbPassword: mergedEnv.SUPABASE_DB_PASSWORD || null,
    },
    remoteAccess: {
      directDbUrl: buildDirectDbUrl(
        envProjectRef || linkedProjectRef,
        mergedEnv.SUPABASE_DB_PASSWORD,
      ),
    },
  };
}

module.exports = {
  inspectEnvironment,
};
