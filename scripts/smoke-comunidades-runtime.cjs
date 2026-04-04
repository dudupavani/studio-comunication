#!/usr/bin/env node
/* eslint-disable no-console */

const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const { chromium } = require("@playwright/test");

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.SMOKE_BASE_URL || "http://127.0.0.1:9002";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const runId = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
const report = [];

const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function assertOk(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 50);
}

function unwrap(result, context) {
  if (result.error) {
    const error = new Error(`${context}: ${result.error.message}`);
    error.code = result.error.code;
    throw error;
  }
  return result.data;
}

async function step(id, description, fn) {
  try {
    await fn();
    report.push({ id, description, status: "PASS" });
  } catch (error) {
    report.push({
      id,
      description,
      status: "FAIL",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function createUser(label, createdUserIds) {
  const email = `smoke.${label}.${runId}@example.com`;
  const password = `Sm0ke!${runId}${label}`.slice(0, 30);

  const created = unwrap(
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Smoke ${label}` },
    }),
    `create auth user ${label}`
  );

  const user = created.user;
  assertOk(user?.id, `Missing user id for ${label}`);
  const userId = user.id;
  createdUserIds.push(userId);

  const profileLookup = unwrap(
    await service.from("profiles").select("id").eq("id", userId).maybeSingle(),
    `lookup profile ${label}`
  );

  if (!profileLookup) {
    unwrap(
      await service.from("profiles").insert({
        id: userId,
        full_name: `Smoke ${label}`,
      }),
      `insert profile ${label}`
    );
  }

  return { label, email, password, userId };
}

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
}

async function apiRequest(context, method, pathname, body) {
  const res = await context.request.fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    data: body,
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
    // ignore json parse failure
  }
  return { status: res.status(), json };
}

async function uiSmoke({ manager, names, ids }) {
  const browser = await chromium.launch({ headless: true });
  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();

  try {
    await login(managerPage, manager.email, manager.password);

    await step("03.1", "Gestor cria comunidades via API do app", async () => {
      const globalRes = await apiRequest(managerContext, "POST", "/api/communities", {
        name: names.globalCommunity,
        visibility: "global",
        segmentType: null,
        segmentTargetIds: [],
        allowUnitMasterPost: true,
        allowUnitUserPost: false,
      });
      assertOk(globalRes.status === 201, `expected 201, got ${globalRes.status}`);

      ids.globalCommunityId = globalRes.json.item.id;

      const groupRes = await apiRequest(managerContext, "POST", "/api/communities", {
        name: names.segmentedGroupCommunity,
        visibility: "segmented",
        segmentType: "group",
        segmentTargetIds: [ids.groupId],
        allowUnitMasterPost: true,
        allowUnitUserPost: true,
      });
      assertOk(groupRes.status === 201, `expected 201, got ${groupRes.status}`);
      ids.segmentedGroupCommunityId = groupRes.json.item.id;

      const teamRes = await apiRequest(managerContext, "POST", "/api/communities", {
        name: names.segmentedTeamCommunity,
        visibility: "segmented",
        segmentType: "team",
        segmentTargetIds: [ids.teamId],
        allowUnitMasterPost: true,
        allowUnitUserPost: true,
      });
      assertOk(teamRes.status === 201, `expected 201, got ${teamRes.status}`);
      ids.segmentedTeamCommunityId = teamRes.json.item.id;
    });

    await step("03.2", "Nome de comunidade duplicado é recusado", async () => {
      const duplicate = await apiRequest(managerContext, "POST", "/api/communities", {
        name: names.globalCommunity,
        visibility: "global",
        segmentType: null,
        segmentTargetIds: [],
        allowUnitMasterPost: true,
        allowUnitUserPost: false,
      });
      assertOk(duplicate.status === 409, `expected 409, got ${duplicate.status}`);
    });

    await step("06.1", "Gestor cria espaços por tipo", async () => {
      const groupSpace = await apiRequest(
        managerContext,
        "POST",
        `/api/communities/${ids.segmentedGroupCommunityId}/spaces`,
        {
          name: `Espaco Grupo ${runId}`,
          spaceType: "publicacoes",
        }
      );
      assertOk(groupSpace.status === 201, `expected 201, got ${groupSpace.status}`);
      ids.groupSpaceId = groupSpace.json.item.id;

      const teamSpace = await apiRequest(
        managerContext,
        "POST",
        `/api/communities/${ids.segmentedTeamCommunityId}/spaces`,
        {
          name: `Espaco Equipe ${runId}`,
          spaceType: "eventos",
        }
      );
      assertOk(teamSpace.status === 201, `expected 201, got ${teamSpace.status}`);
      ids.teamSpaceId = teamSpace.json.item.id;
    });

    await step("06.2", "Nome de espaço duplicado é recusado", async () => {
      const duplicateSpace = await apiRequest(
        managerContext,
        "POST",
        `/api/communities/${ids.segmentedTeamCommunityId}/spaces`,
        {
          name: `Espaco Equipe ${runId}`,
          spaceType: "publicacoes",
        }
      );
      assertOk(duplicateSpace.status === 409, `expected 409, got ${duplicateSpace.status}`);
    });

    await step("04.1", "Gestor edita comunidade e espaço", async () => {
      const patchCommunity = await apiRequest(
        managerContext,
        "PATCH",
        `/api/communities/${ids.segmentedTeamCommunityId}`,
        {
          name: `${names.segmentedTeamCommunity} Editada`,
          visibility: "segmented",
          segmentType: "team",
          segmentTargetIds: [ids.teamId],
          allowUnitMasterPost: true,
          allowUnitUserPost: false,
        }
      );
      assertOk(patchCommunity.status === 200, `expected 200, got ${patchCommunity.status}`);

      const patchSpace = await apiRequest(
        managerContext,
        "PATCH",
        `/api/communities/${ids.segmentedTeamCommunityId}/spaces/${ids.teamSpaceId}`,
        {
          name: `Espaco Equipe ${runId} Editado`,
          spaceType: "eventos",
        }
      );
      assertOk(patchSpace.status === 200, `expected 200, got ${patchSpace.status}`);
    });

    await managerPage.goto(`${BASE_URL}/comunidades`, { waitUntil: "networkidle" });
    await managerPage.getByText("Selecionar comunidade").waitFor({ timeout: 10000 });
    await managerPage.getByRole("button", { name: names.globalCommunity }).click();
    await managerPage.getByRole("button", { name: "Feed" }).waitFor({ timeout: 10000 });
    await managerPage.getByRole("button", { name: "Criar espaço" }).waitFor({ timeout: 10000 });
  } finally {
    await managerContext.close();
    await browser.close();
  }
}

async function main() {
  const createdUserIds = [];
  let orgId = null;
  const ids = {
    groupId: null,
    teamId: null,
    globalCommunityId: null,
    segmentedGroupCommunityId: null,
    segmentedTeamCommunityId: null,
    groupSpaceId: null,
    teamSpaceId: null,
  };
  let manager;
  let unitMaster;
  let unitUser;
  let outsider;
  const names = {
    globalCommunity: `Global ${runId}`,
    segmentedGroupCommunity: `Segmentada Grupo ${runId}`,
    segmentedTeamCommunity: `Segmentada Equipe ${runId}`,
  };

  try {
    const org = unwrap(
      await service
        .from("orgs")
        .insert({
          name: `Smoke Comunidades ${runId}`,
          slug: `smoke-comunidades-${slugify(runId)}`,
        })
        .select("id")
        .single(),
      "create org"
    );
    orgId = org.id;

    manager = await createUser("manager", createdUserIds);
    unitMaster = await createUser("unitmaster", createdUserIds);
    unitUser = await createUser("unituser", createdUserIds);
    outsider = await createUser("outsider", createdUserIds);

    unwrap(
      await service.from("org_members").insert([
        { org_id: orgId, user_id: manager.userId, role: "org_admin" },
        { org_id: orgId, user_id: unitMaster.userId, role: "unit_master" },
        { org_id: orgId, user_id: unitUser.userId, role: "unit_user" },
      ]),
      "insert org members"
    );

    const group = unwrap(
      await service
        .from("user_groups")
        .insert({
          org_id: orgId,
          name: `Smoke Group ${runId}`,
          color: "#1d4ed8",
          created_by: manager.userId,
        })
        .select("id")
        .single(),
      "create group"
    );
    ids.groupId = group.id;

    const team = unwrap(
      await service
        .from("equipes")
        .insert({
          org_id: orgId,
          name: `Smoke Team ${runId}`,
          leader_user_id: manager.userId,
          created_by: manager.userId,
        })
        .select("id")
        .single(),
      "create team"
    );
    ids.teamId = team.id;

    unwrap(
      await service.from("user_group_members").insert({
        org_id: orgId,
        group_id: group.id,
        user_id: unitUser.userId,
      }),
      "insert user group membership"
    );

    unwrap(
      await service.from("equipe_members").insert({
        org_id: orgId,
        equipe_id: team.id,
        user_id: unitMaster.userId,
      }),
      "insert team membership"
    );

    await step("03.3", "Não gestor recebe bloqueio ao criar comunidade", async () => {
      const browser = await chromium.launch({ headless: true });
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      try {
        await login(page, unitUser.email, unitUser.password);
        const denied = await apiRequest(ctx, "POST", "/api/communities", {
          name: `Denied ${runId}`,
          visibility: "global",
          segmentType: null,
          segmentTargetIds: [],
          allowUnitMasterPost: true,
          allowUnitUserPost: false,
        });
        assertOk(denied.status === 403, `expected 403, got ${denied.status}`);
      } finally {
        await ctx.close();
        await browser.close();
      }
    });

    await step("06.3", "Não gestor recebe bloqueio ao criar espaço", async () => {
      const browser = await chromium.launch({ headless: true });
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      try {
        await login(page, unitMaster.email, unitMaster.password);
        const denied = await apiRequest(
          ctx,
          "POST",
          `/api/communities/${ids.globalCommunityId}/spaces`,
          {
            name: `Denied Space ${runId}`,
            spaceType: "publicacoes",
          }
        );
        assertOk(denied.status === 403, `expected 403, got ${denied.status}`);
      } finally {
        await ctx.close();
        await browser.close();
      }
    });

    await step("07.1", "unit_user vê global + segmentada por grupo", async () => {
      const browser = await chromium.launch({ headless: true });
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      try {
        await login(page, unitUser.email, unitUser.password);
        const list = await apiRequest(ctx, "GET", "/api/communities");
        assertOk(list.status === 200, `expected 200, got ${list.status}`);
        const namesSeen = new Set((list.json.items || []).map((it) => it.name));
        assertOk(namesSeen.has(names.globalCommunity), "must include global");
        assertOk(namesSeen.has(names.segmentedGroupCommunity), "must include segmented group");
        assertOk(!namesSeen.has(names.segmentedTeamCommunity), "must not include segmented team");
      } finally {
        await ctx.close();
        await browser.close();
      }
    });

    await step("07.2", "unit_master vê global + segmentada por equipe", async () => {
      const browser = await chromium.launch({ headless: true });
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      try {
        await login(page, unitMaster.email, unitMaster.password);
        const list = await apiRequest(ctx, "GET", "/api/communities");
        assertOk(list.status === 200, `expected 200, got ${list.status}`);
        const namesSeen = new Set((list.json.items || []).map((it) => it.name));
        assertOk(namesSeen.has(names.globalCommunity), "must include global");
        assertOk(namesSeen.has(names.segmentedTeamCommunity), "must include segmented team");
        assertOk(!namesSeen.has(names.segmentedGroupCommunity), "must not include segmented group");
      } finally {
        await ctx.close();
        await browser.close();
      }
    });

    await step("07.3", "Usuário sem org_members não acessa listagem", async () => {
      const browser = await chromium.launch({ headless: true });
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      try {
        await login(page, outsider.email, outsider.password);
        const list = await apiRequest(ctx, "GET", "/api/communities");
        assertOk(list.status === 400, `expected 400, got ${list.status}`);
      } finally {
        await ctx.close();
        await browser.close();
      }
    });

    await step("07.4", "Feed respeita visibilidade da comunidade", async () => {
      const browser = await chromium.launch({ headless: true });
      const userCtx = await browser.newContext();
      const userPage = await userCtx.newPage();
      const masterCtx = await browser.newContext();
      const masterPage = await masterCtx.newPage();
      try {
        await login(userPage, unitUser.email, unitUser.password);
        const deniedUser = await apiRequest(
          userCtx,
          "GET",
          `/api/communities/${ids.segmentedTeamCommunityId}/feed`
        );
        assertOk(deniedUser.status === 403, `expected 403, got ${deniedUser.status}`);

        await login(masterPage, unitMaster.email, unitMaster.password);
        const okMaster = await apiRequest(
          masterCtx,
          "GET",
          `/api/communities/${ids.segmentedTeamCommunityId}/feed`
        );
        assertOk(okMaster.status === 200, `expected 200, got ${okMaster.status}`);
        assertOk(Array.isArray(okMaster.json.item.items), "feed payload should contain items array");
      } finally {
        await userCtx.close();
        await masterCtx.close();
        await browser.close();
      }
    });

    await step("07.5", "Mudança de segmentação reflete em novos acessos", async () => {
      const browser = await chromium.launch({ headless: true });
      const managerCtx = await browser.newContext();
      const managerPage = await managerCtx.newPage();
      const userCtx = await browser.newContext();
      const userPage = await userCtx.newPage();
      const masterCtx = await browser.newContext();
      const masterPage = await masterCtx.newPage();
      try {
        await login(managerPage, manager.email, manager.password);
        const patch = await apiRequest(
          managerCtx,
          "PATCH",
          `/api/communities/${ids.segmentedGroupCommunityId}`,
          {
            name: names.segmentedGroupCommunity,
            visibility: "segmented",
            segmentType: "team",
            segmentTargetIds: [ids.teamId],
            allowUnitMasterPost: true,
            allowUnitUserPost: true,
          }
        );
        assertOk(patch.status === 200, `expected 200, got ${patch.status}`);

        await login(userPage, unitUser.email, unitUser.password);
        const listUser = await apiRequest(userCtx, "GET", "/api/communities");
        const userNames = new Set((listUser.json.items || []).map((it) => it.name));
        assertOk(!userNames.has(names.segmentedGroupCommunity), "unit_user must lose access");

        await login(masterPage, unitMaster.email, unitMaster.password);
        const listMaster = await apiRequest(masterCtx, "GET", "/api/communities");
        const masterNames = new Set((listMaster.json.items || []).map((it) => it.name));
        assertOk(masterNames.has(names.segmentedGroupCommunity), "unit_master must gain access");
      } finally {
        await managerCtx.close();
        await userCtx.close();
        await masterCtx.close();
        await browser.close();
      }
    });

    await step("01.1/05.1", "UI: entrada do módulo + seleção + navegação interna", async () => {
      await uiSmoke({
        manager,
        names,
        ids,
      });
    });
  } finally {
    if (orgId) {
      await service.from("orgs").delete().eq("id", orgId);
    }

    for (const userId of createdUserIds) {
      try {
        await service.auth.admin.deleteUser(userId);
      } catch {
        // best effort cleanup
      }
    }
  }

  console.log("\n=== Smoke Report: Comunidades V1 ===");
  for (const item of report) {
    if (item.status === "PASS") {
      console.log(`PASS [${item.id}] ${item.description}`);
    } else {
      console.log(`FAIL [${item.id}] ${item.description}`);
      console.log(`  -> ${item.error}`);
    }
  }

  const failed = report.filter((item) => item.status === "FAIL");
  console.log(`\nSummary: ${report.length - failed.length}/${report.length} checks passed.`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\nSmoke run failed before finishing checks.");
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
