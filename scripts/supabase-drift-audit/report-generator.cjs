"use strict";

const path = require("node:path");

const {
  createTimestampSlug,
  ensureDirSync,
  maskProjectRef,
  writeTextFile,
} = require("./utils.cjs");

function generateMarkdownReport(report) {
  const lines = [
    "# Supabase Drift Audit",
    "",
    `- Mode: \`${report.mode}\``,
    `- Status: \`${report.status}\``,
    `- Started at: \`${report.startedAt}\``,
    `- Finished at: \`${report.finishedAt}\``,
    "",
    "## Project Refs",
    "",
    `- Env URL ref: \`${report.refs.envProjectRef || "missing"}\``,
    `- Linked ref: \`${report.refs.linkedProjectRef || "missing"}\``,
    "",
    "## Execution",
    "",
    `- Remote types: \`${report.execution.remoteTypes.ok ? `ok via ${report.execution.remoteTypes.method}` : "failed"}\``,
    `- Remote schema dump: \`${report.execution.remoteSchema.ok ? `ok via ${report.execution.remoteSchema.method}` : "failed"}\``,
    `- Typecheck: \`${report.execution.typecheck ? (report.execution.typecheck.ok ? "ok" : "failed") : "skipped"}\``,
    "",
    "## Summary",
    "",
    `- Critical: ${report.summary.critical}`,
    `- Warning: ${report.summary.warning}`,
    `- Info: ${report.summary.info}`,
    "",
    "## Findings",
    "",
  ];

  if (!report.findings.length) {
    lines.push("- No drift detected.");
  } else {
    report.findings.forEach((finding, index) => {
      lines.push(`### ${index + 1}. ${finding.title}`);
      lines.push("");
      lines.push(`- Severity: \`${finding.severity}\``);
      lines.push(`- Drift code: \`${finding.driftCode}\``);
      lines.push(`- Description: ${finding.description}`);
      lines.push(`- Recommendation: ${finding.recommendation}`);
      if (finding.affectedFiles.length) {
        lines.push(`- Affected files: ${finding.affectedFiles.join(", ")}`);
      }
      if (finding.evidence.length) {
        lines.push("- Evidence:");
        for (const evidence of finding.evidence) {
          lines.push(`  - \`${JSON.stringify(evidence)}\``);
        }
      }
      lines.push("");
    });
  }

  if (report.appliedFixes.length) {
    lines.push("## Applied Safe Fixes");
    lines.push("");
    for (const fix of report.appliedFixes) {
      lines.push(`- ${fix.kind}: ${fix.filePath} (${fix.description})`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function createSerializableReport(report) {
  return {
    mode: report.mode,
    status: report.status,
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    refs: report.refs,
    execution: report.execution,
    summary: report.summary,
    findings: report.findings,
    appliedFixes: report.appliedFixes,
  };
}

function writeReports(cwd, report) {
  const outputDir = path.join(cwd, ".context/reports/supabase-audit");
  ensureDirSync(outputDir);

  const timestamp = createTimestampSlug(new Date(report.finishedAt));
  const latestJsonPath = path.join(outputDir, "latest.json");
  const latestMarkdownPath = path.join(outputDir, "latest.md");
  const timestampedJsonPath = path.join(outputDir, `${timestamp}.json`);
  const timestampedMarkdownPath = path.join(outputDir, `${timestamp}.md`);

  const serializableReport = createSerializableReport(report);
  const markdown = generateMarkdownReport(report);
  const json = `${JSON.stringify(serializableReport, null, 2)}\n`;

  for (const filePath of [
    latestJsonPath,
    latestMarkdownPath,
    timestampedJsonPath,
    timestampedMarkdownPath,
  ]) {
    ensureDirSync(path.dirname(filePath));
  }

  writeTextFile(latestJsonPath, json);
  writeTextFile(latestMarkdownPath, markdown);
  writeTextFile(timestampedJsonPath, json);
  writeTextFile(timestampedMarkdownPath, markdown);

  return {
    latestJsonPath: path.relative(cwd, latestJsonPath),
    latestMarkdownPath: path.relative(cwd, latestMarkdownPath),
    timestampedJsonPath: path.relative(cwd, timestampedJsonPath),
    timestampedMarkdownPath: path.relative(cwd, timestampedMarkdownPath),
  };
}

function printTerminalSummary(report, artifactPaths) {
  const lines = [
    "Supabase Drift Audit",
    `Mode: ${report.mode}`,
    `Status: ${report.status}`,
    `Env ref: ${maskProjectRef(report.refs.envProjectRef) || "missing"}`,
    `Linked ref: ${maskProjectRef(report.refs.linkedProjectRef) || "missing"}`,
    `Remote types: ${report.execution.remoteTypes.ok ? `ok via ${report.execution.remoteTypes.method}` : "failed"}`,
    `Remote schema dump: ${report.execution.remoteSchema.ok ? `ok via ${report.execution.remoteSchema.method}` : "failed"}`,
    `Typecheck: ${report.execution.typecheck ? (report.execution.typecheck.ok ? "ok" : "failed") : "skipped"}`,
    `Findings: critical=${report.summary.critical}, warning=${report.summary.warning}, info=${report.summary.info}`,
  ];

  if (report.appliedFixes.length) {
    lines.push(`Applied safe fixes: ${report.appliedFixes.length}`);
  }

  if (report.findings.length) {
    lines.push("");
    lines.push("Top findings:");
    for (const finding of report.findings.slice(0, 5)) {
      lines.push(`- [${finding.severity}] ${finding.title}`);
    }
  }

  lines.push("");
  lines.push("Artifacts:");
  lines.push(`- ${artifactPaths.latestMarkdownPath}`);
  lines.push(`- ${artifactPaths.latestJsonPath}`);

  return `${lines.join("\n")}\n`;
}

module.exports = {
  printTerminalSummary,
  writeReports,
};
