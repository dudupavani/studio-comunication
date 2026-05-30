import { NextRequest } from "next/server";
import { POST } from "@/app/api/messages/messages/route";

jest.mock("@/lib/log", () => ({ logError: jest.fn(), logInfo: jest.fn() }));
jest.mock("@/lib/notifications", () => ({
  publishNotificationEvent: jest.fn().mockResolvedValue(undefined),
}));

// ---------- fixtures ----------

const ORG_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const SENDER_ID = "a1b2c3d4-0000-0000-0000-000000000002";
const SAME_ORG_USER = "a1b2c3d4-0000-0000-0000-000000000003";
const OTHER_ORG_USER = "a1b2c3d4-0000-0000-0000-000000000099";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/messages/messages", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function groupPayload(userIds: string[]) {
  return {
    title: "Teste",
    message: "olá",
    mode: "group",
    userIds,
    groupIds: [],
    teamIds: [],
  };
}

function individualPayload(userIds: string[]) {
  return {
    title: "Teste",
    message: "olá",
    mode: "individual",
    userIds,
    groupIds: [],
    teamIds: [],
  };
}

// ---------- module mocks ----------

jest.mock("@/lib/supabase/server", () => ({ createServerClientWithCookies: jest.fn() }));
jest.mock("@/lib/supabase/service", () => ({ createServiceClient: jest.fn() }));
jest.mock("@/lib/messages/auth-context", () => ({
  default: jest.fn(),
  getAuthContext: jest.fn(),
}));

import { createServerClientWithCookies } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/messages/auth-context";

const mockedGetAuthContext = getAuthContext as jest.Mock;
const mockedCreateServiceClient = createServiceClient as jest.Mock;
const mockedCreateServerClient = createServerClientWithCookies as jest.Mock;

function makeAuthContext(overrides = {}) {
  return {
    userId: SENDER_ID,
    orgId: ORG_ID,
    isPlatformAdmin: false,
    isOrgAdmin: true,
    isUnitMaster: false,
    unitIds: [],
    ...overrides,
  };
}

// Build a mock Supabase client.
// orgMembersRows: rows returned for org_members validation (scope check)
function makeMockClient(orgMembersRows: { user_id: string }[] = []) {
  function makeChain(resolvedData: any) {
    const chain: any = {};
    const self = () => chain;
    chain.select = jest.fn(self);
    chain.eq = jest.fn(self);
    chain.in = jest.fn(self);
    chain.insert = jest.fn().mockResolvedValue({ data: null, error: null });
    chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    chain.then = jest.fn((onFulfilled: any) =>
      Promise.resolve(onFulfilled({ data: resolvedData, error: null }))
    );
    return chain;
  }

  const rpc = jest.fn().mockResolvedValue({ data: 1, error: null });

  const from = jest.fn((table: string) => {
    if (table === "org_members") return makeChain(orgMembersRows);

    if (table === "chats") {
      const chain = makeChain(null);
      chain.insert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: "chat-new-1" }, error: null }),
      });
      return chain;
    }

    if (table === "chat_members") {
      const chain = makeChain([]);
      chain.insert = jest.fn().mockResolvedValue({ data: null, error: null });
      return chain;
    }

    return makeChain([]);
  });

  return { from, rpc };
}

// ---------- tests ----------

describe("POST /api/messages/messages — tenant scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("retorna 401 sem sessão", async () => {
    mockedGetAuthContext.mockResolvedValue(null);
    mockedCreateServerClient.mockReturnValue(makeMockClient());
    mockedCreateServiceClient.mockReturnValue(makeMockClient());

    const res = await POST(makeRequest(groupPayload([SAME_ORG_USER])));
    expect(res.status).toBe(401);
  });

  it("permite destinatários da mesma org (mode group)", async () => {
    mockedGetAuthContext.mockResolvedValue(makeAuthContext());
    const client = makeMockClient([{ user_id: SAME_ORG_USER }]);
    mockedCreateServerClient.mockReturnValue(client);
    mockedCreateServiceClient.mockReturnValue(client);

    const res = await POST(makeRequest(groupPayload([SAME_ORG_USER])));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("group");
  });

  it("rejeita destinatário de outra org — userIds direto (mode group)", async () => {
    mockedGetAuthContext.mockResolvedValue(makeAuthContext());
    // org_members retorna vazio → OTHER_ORG_USER não pertence ao ORG_ID
    const client = makeMockClient([]);
    mockedCreateServerClient.mockReturnValue(client);
    mockedCreateServiceClient.mockReturnValue(client);

    const res = await POST(makeRequest(groupPayload([OTHER_ORG_USER])));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBeDefined();
    // erro genérico — não vaza informação do tenant alheio
    expect(JSON.stringify(body)).not.toMatch(/other-org|a1b2c3d4-0000-0000-0000-000000000099/i);
  });

  it("rejeita payload misto — um válido, um inválido", async () => {
    mockedGetAuthContext.mockResolvedValue(makeAuthContext());
    // org_members retorna apenas SAME_ORG_USER
    const client = makeMockClient([{ user_id: SAME_ORG_USER }]);
    mockedCreateServerClient.mockReturnValue(client);
    mockedCreateServiceClient.mockReturnValue(client);

    const res = await POST(makeRequest(groupPayload([SAME_ORG_USER, OTHER_ORG_USER])));
    expect(res.status).toBe(403);
  });

  it("não executa escrita no banco quando scope falha", async () => {
    mockedGetAuthContext.mockResolvedValue(makeAuthContext());
    const client = makeMockClient([]); // nenhum user válido
    mockedCreateServerClient.mockReturnValue(client);
    mockedCreateServiceClient.mockReturnValue(client);

    await POST(makeRequest(groupPayload([OTHER_ORG_USER])));

    // nenhum insert em chats deve ter ocorrido
    const chatsCalls = (client.from as jest.Mock).mock.calls.filter(
      ([t]: [string]) => t === "chats"
    );
    expect(chatsCalls).toHaveLength(0);
  });

  it("rejeita destinatário de outra org — mode individual", async () => {
    mockedGetAuthContext.mockResolvedValue(makeAuthContext());
    const client = makeMockClient([]);
    mockedCreateServerClient.mockReturnValue(client);
    mockedCreateServiceClient.mockReturnValue(client);

    const res = await POST(makeRequest(individualPayload([OTHER_ORG_USER])));
    expect(res.status).toBe(403);
  });
});
