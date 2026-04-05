"use strict";

const path = require("node:path");

const { uniqueSorted } = require("./utils.cjs");

function setDifference(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

function findSignatureMismatches(localFunctions, remoteFunctions) {
  const mismatches = [];

  for (const [functionName, localSignature] of Object.entries(localFunctions)) {
    const remoteSignature = remoteFunctions[functionName];
    if (!remoteSignature) continue;

    if (localSignature.signature !== remoteSignature.signature) {
      mismatches.push(functionName);
    }
  }

  return mismatches.sort();
}

function mapUsageFiles(usages) {
  return uniqueSorted(
    usages.map((usage) =>
      usage.line ? `${usage.filePath}:${usage.line}` : usage.filePath,
    ),
  );
}

function createFinding(params) {
  return {
    id: params.id,
    driftCode: params.driftCode,
    severity: params.severity,
    title: params.title,
    description: params.description,
    recommendation: params.recommendation,
    evidence: params.evidence || [],
    affectedFiles: params.affectedFiles || [],
  };
}

function analyzeTypecheck(typecheckResult) {
  if (!typecheckResult) {
    return [];
  }

  const errors = [];
  const errorRegex =
    /^(.+\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx))\((\d+),(\d+)\): error TS\d+: (.+)$/gm;
  let match = errorRegex.exec(typecheckResult.stdout + typecheckResult.stderr);

  while (match) {
    errors.push({
      filePath: match[1],
      line: Number(match[2]),
      column: Number(match[3]),
      message: match[4],
    });
    match = errorRegex.exec(typecheckResult.stdout + typecheckResult.stderr);
  }

  return errors;
}

function analyzeDrift(context) {
  const findings = [];
  const localTypes = context.localTypes.parsed || {
    tables: [],
    views: [],
    functions: {},
    enums: [],
  };
  const remoteTypes = context.remoteTypes.parsed || {
    tables: [],
    views: [],
    functions: {},
    enums: [],
  };
  const migrationObjects = context.localMigrations.parsed;
  const rpcUsages = context.codeUsage.rpcUsages;
  const tableUsages = context.codeUsage.tableUsages;

  if (!context.envInfo.nextPublicSupabaseUrl) {
    findings.push(
      createFinding({
        id: "env-missing-url",
        driftCode: "D1",
        severity: "critical",
        title: "NEXT_PUBLIC_SUPABASE_URL ausente",
        description:
          "A auditoria não encontrou NEXT_PUBLIC_SUPABASE_URL no ambiente carregado.",
        recommendation:
          "Defina NEXT_PUBLIC_SUPABASE_URL no .env.local ou no ambiente do processo.",
        evidence: context.envInfo.envFiles.map((envFile) => ({
          file: path.relative(context.cwd, envFile.path),
          present: envFile.present,
        })),
      }),
    );
  }

  if (
    context.envInfo.envProjectRef &&
    context.envInfo.linkedProjectRef &&
    context.envInfo.envProjectRef !== context.envInfo.linkedProjectRef
  ) {
    findings.push(
      createFinding({
        id: "env-linked-ref-mismatch",
        driftCode: "D1",
        severity: "critical",
        title: "Project ref do ambiente difere do projeto linkado",
        description:
          "O project ref derivado de NEXT_PUBLIC_SUPABASE_URL difere do project ref persistido em supabase/.temp/project-ref.",
        recommendation:
          "Confirme qual projeto Supabase é o canônico e alinhe env + supabase link antes de qualquer correção estrutural.",
        evidence: [
          {
            envProjectRef: context.envInfo.envProjectRef,
            linkedProjectRef: context.envInfo.linkedProjectRef,
          },
        ],
        affectedFiles: [".env.local", "supabase/.temp/project-ref"],
      }),
    );
  }

  if (!context.remoteTypes.ok) {
    findings.push(
      createFinding({
        id: "remote-types-unavailable",
        driftCode: "D1",
        severity: "critical",
        title: "Não foi possível gerar tipos remotos do Supabase",
        description:
          "A auditoria não conseguiu introspectar o projeto Supabase remoto, então a comparação com o banco ativo ficou incompleta.",
        recommendation:
          "Garanta SUPABASE_ACCESS_TOKEN ou SUPABASE_DB_PASSWORD válidos e confirme que o projeto linkado/env está correto.",
        evidence: context.remoteTypes.attempts.map((attempt) => ({
          method: attempt.method,
          status: attempt.status,
          stderr: attempt.stderr.trim() || null,
          error: attempt.error,
        })),
      }),
    );
  }

  if (!context.localTypes.exists) {
    findings.push(
      createFinding({
        id: "local-types-missing",
        driftCode: "D4",
        severity: "critical",
        title: "Arquivo src/types/supabase.ts ausente",
        description:
          "A fonte única dos tipos do Supabase não foi encontrada no repositório.",
        recommendation:
          "Regere src/types/supabase.ts a partir do projeto Supabase correto.",
        affectedFiles: ["src/types/supabase.ts"],
      }),
    );
  }

  if (!context.localMigrations.files.length) {
    findings.push(
      createFinding({
        id: "migrations-missing",
        driftCode: "D3",
        severity: "critical",
        title: "Nenhuma migration local encontrada",
        description:
          "O diretório database/migrations não contém arquivos SQL versionados.",
        recommendation:
          "Versione o schema real do banco em database/migrations antes de continuar.",
        affectedFiles: ["database/migrations"],
      }),
    );
  }

  if (context.remoteTypes.ok && context.localTypes.exists) {
    const missingLocalTables = setDifference(remoteTypes.tables, localTypes.tables);
    const staleLocalTables = setDifference(localTypes.tables, remoteTypes.tables);
    const missingLocalFunctions = setDifference(
      Object.keys(remoteTypes.functions),
      Object.keys(localTypes.functions),
    );
    const staleLocalFunctions = setDifference(
      Object.keys(localTypes.functions),
      Object.keys(remoteTypes.functions),
    );
    const missingLocalEnums = setDifference(remoteTypes.enums, localTypes.enums);
    const staleLocalEnums = setDifference(localTypes.enums, remoteTypes.enums);
    const signatureMismatches = findSignatureMismatches(
      localTypes.functions,
      remoteTypes.functions,
    );

    if (
      missingLocalTables.length ||
      missingLocalFunctions.length ||
      missingLocalEnums.length ||
      signatureMismatches.length
    ) {
      const affectedFiles = ["src/types/supabase.ts"];
      for (const functionName of signatureMismatches) {
        affectedFiles.push(...mapUsageFiles(rpcUsages[functionName] || []));
      }

      findings.push(
        createFinding({
          id: "local-types-stale",
          driftCode: "D4",
          severity: "critical",
          title: "Tipos locais do Supabase estão desalinhados com o projeto remoto",
          description:
            "Os tipos gerados em src/types/supabase.ts não refletem o schema remoto atual do Supabase.",
          recommendation:
            "Regere src/types/supabase.ts a partir do projeto correto e só depois ajuste o código que quebrar.",
          evidence: [
            { missingLocalTables },
            { missingLocalFunctions },
            { missingLocalEnums },
            { signatureMismatches },
          ],
          affectedFiles: uniqueSorted(affectedFiles),
        }),
      );
    }

    if (staleLocalTables.length || staleLocalFunctions.length || staleLocalEnums.length) {
      findings.push(
        createFinding({
          id: "local-types-clone-residue",
          driftCode: "D6",
          severity: "warning",
          title: "Tipos locais contêm artefatos ausentes no projeto remoto",
          description:
            "Há objetos tipados localmente que não aparecem no projeto remoto atual. Isso pode ser resíduo da aplicação original duplicada.",
          recommendation:
            "Confirme o projeto canônico e regenere os tipos antes de remover referências herdadas.",
          evidence: [
            { staleLocalTables },
            { staleLocalFunctions },
            { staleLocalEnums },
          ],
          affectedFiles: ["src/types/supabase.ts"],
        }),
      );
    }
  }

  if (context.remoteTypes.ok) {
    const remoteFunctionsWithoutMigration = setDifference(
      Object.keys(remoteTypes.functions),
      Object.keys(migrationObjects.functions),
    );
    const remoteTablesWithoutMigration = setDifference(
      remoteTypes.tables,
      Object.keys(migrationObjects.tables),
    );
    const remoteEnumsWithoutMigration = setDifference(
      remoteTypes.enums,
      Object.keys(migrationObjects.enums),
    );

    if (
      remoteFunctionsWithoutMigration.length ||
      remoteTablesWithoutMigration.length ||
      remoteEnumsWithoutMigration.length
    ) {
      findings.push(
        createFinding({
          id: "remote-objects-not-versioned",
          driftCode: "D3",
          severity: "critical",
          title: "O banco remoto possui objetos sem migration versionada",
          description:
            "A auditoria encontrou objetos no projeto Supabase remoto que não aparecem em database/migrations.",
          recommendation:
            "Backfille migrations para refletir o estado real do banco antes de corrigir wrappers ou tipos manualmente.",
          evidence: [
            { remoteFunctionsWithoutMigration },
            { remoteTablesWithoutMigration },
            { remoteEnumsWithoutMigration },
          ],
          affectedFiles: context.localMigrations.files.length
            ? context.localMigrations.files
            : ["database/migrations"],
        }),
      );
    }
  }

  if (!context.remoteSchema.ok && context.mode !== "ci") {
    findings.push(
      createFinding({
        id: "remote-schema-dump-unavailable",
        driftCode: "D2",
        severity: "warning",
        title: "Dump remoto do schema indisponível",
        description:
          "A auditoria não conseguiu obter um dump SQL remoto. A verificação de policies e triggers ficou parcial.",
        recommendation:
          "Forneça acesso remoto suficiente para habilitar supabase db dump no modo completo.",
        evidence: context.remoteSchema.attempts.map((attempt) => ({
          method: attempt.method,
          status: attempt.status,
          stderr: attempt.stderr.trim() || null,
          error: attempt.error,
        })),
      }),
    );
  }

  const rpcNamesUsed = Object.keys(rpcUsages);
  const missingRemoteRpcUsages = context.remoteTypes.ok
    ? setDifference(rpcNamesUsed, Object.keys(remoteTypes.functions))
    : [];
  const missingLocalRpcUsages = context.localTypes.exists
    ? setDifference(rpcNamesUsed, Object.keys(localTypes.functions))
    : rpcNamesUsed;

  if (missingRemoteRpcUsages.length) {
    const affectedFiles = uniqueSorted(
      missingRemoteRpcUsages.flatMap((rpcName) =>
        mapUsageFiles(rpcUsages[rpcName] || []),
      ),
    );

    findings.push(
      createFinding({
        id: "rpc-usage-missing-remote",
        driftCode: "D5",
        severity: "critical",
        title: "O código chama RPCs inexistentes no banco remoto",
        description:
          "Há chamadas .rpc(...) no código que não existem no projeto Supabase atualmente auditado.",
        recommendation:
          "Confirme se o banco correto está em uso. Se estiver, versione ou remova as RPCs faltantes.",
        evidence: missingRemoteRpcUsages,
        affectedFiles,
      }),
    );
  }

  if (missingLocalRpcUsages.length) {
    const affectedFiles = uniqueSorted(
      missingLocalRpcUsages.flatMap((rpcName) =>
        mapUsageFiles(rpcUsages[rpcName] || []),
      ),
    );

    findings.push(
      createFinding({
        id: "rpc-usage-missing-local-types",
        driftCode: "D5",
        severity: "critical",
        title: "O código usa RPCs ausentes nos tipos locais",
        description:
          "Há chamadas .rpc(...) no código que não aparecem em src/types/supabase.ts.",
        recommendation:
          "Regere os tipos locais a partir do projeto correto e só depois ajuste o código remanescente.",
        evidence: missingLocalRpcUsages,
        affectedFiles,
      }),
    );
  }

  if (context.remoteTypes.ok) {
    const tableNamesUsed = Object.keys(tableUsages);
    const missingRemoteTables = setDifference(tableNamesUsed, remoteTypes.tables);

    if (missingRemoteTables.length) {
      findings.push(
        createFinding({
          id: "table-usage-missing-remote",
          driftCode: "D5",
          severity: "critical",
          title: "O código consulta tabelas ausentes no banco remoto",
          description:
            "Há chamadas .from(...) no código que não aparecem no projeto remoto auditado.",
          recommendation:
            "Confirme o projeto Supabase ativo e alinhe migrations/tipos antes de alterar a camada de acesso.",
          evidence: missingRemoteTables,
          affectedFiles: uniqueSorted(
            missingRemoteTables.flatMap((tableName) =>
              mapUsageFiles(tableUsages[tableName] || []),
            ),
          ),
        }),
      );
    }
  }

  if (context.typecheck && !context.typecheck.ok) {
    const typecheckErrors = analyzeTypecheck(context.typecheck);
    findings.push(
      createFinding({
        id: "typecheck-failed",
        driftCode: "D5",
        severity: "critical",
        title: "TypeScript falhou após a auditoria",
        description:
          "O typecheck do repositório não está limpo. Isso pode refletir drift já materializado no código local.",
        recommendation:
          "Use os arquivos apontados pelo typecheck para priorizar a correção do drift confirmado.",
        evidence: typecheckErrors.slice(0, 25),
        affectedFiles: uniqueSorted(typecheckErrors.map((error) => error.filePath)),
      }),
    );
  }

  const summary = {
    critical: findings.filter((finding) => finding.severity === "critical").length,
    warning: findings.filter((finding) => finding.severity === "warning").length,
    info: findings.filter((finding) => finding.severity === "info").length,
  };

  return {
    findings,
    summary,
    status:
      summary.critical > 0
        ? "DRIFT_DETECTED"
        : summary.warning > 0
          ? "WARNING"
          : "OK",
  };
}

module.exports = {
  analyzeDrift,
};
