import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/finalize-invite/route";

jest.mock("@/lib/log", () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
}));

// ---------- Mock helpers ----------

function makeSupabaseUserClient(overrides: Record<string, any> = {}) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "user-1", user_metadata: {} } },
        error: null,
        ...overrides.getUser,
      }),
    },
  };
}

function makeAdminClient(overrides: {
  getUserById?: any;
  profilesInsert?: any;
  profilesInviterGlobalRole?: string | null;
  orgMembersSelect?: any;             // 1ª call: idempotência (default null → não existe)
  orgMembersInviterMembership?: any;  // 2ª call: membership do inviter na org
  orgMembersInsert?: any;
  updateUserById?: any;
} = {}) {
  const profilesInsertChain = {
    insert: jest.fn().mockResolvedValue(overrides.profilesInsert ?? { error: null }),
  };
  const profilesSelectChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: { global_role: overrides.profilesInviterGlobalRole ?? null },
      error: null,
    }),
  };

  // Call order in finalize-invite for privileged roles (org_master):
  //   1st org_members select → inviter membership check (step 5b)
  //   2nd org_members select → idempotency check (step 6)
  // For non-privileged roles (unit_user) or org_admin:
  //   only 1 org_members select → idempotency check (step 6)
  const maybeSingleMock = jest.fn();
  if (overrides.orgMembersInviterMembership !== undefined) {
    maybeSingleMock
      .mockResolvedValueOnce(overrides.orgMembersInviterMembership)
      .mockResolvedValueOnce(overrides.orgMembersSelect ?? { data: null, error: null });
  } else {
    maybeSingleMock.mockResolvedValue(
      overrides.orgMembersSelect ?? { data: null, error: null }
    );
  }
  const orgMembersSelectChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: maybeSingleMock,
  };
  const orgMembersInsertChain = {
    insert: jest.fn().mockResolvedValue(overrides.orgMembersInsert ?? { error: null }),
  };

  return {
    auth: {
      admin: {
        getUserById: jest.fn().mockResolvedValue(
          overrides.getUserById ?? {
            data: {
              user: {
                user_metadata: {
                  invited_org_id: "org-1",
                  invited_role: "unit_user",
                  invited_by: "admin-1",
                  full_name: "Test User",
                },
                app_metadata: {},
              },
            },
            error: null,
          }
        ),
        updateUserById: jest.fn().mockResolvedValue(
          overrides.updateUserById ?? { data: {}, error: null }
        ),
      },
    },
    from: jest.fn((table: string) => {
      if (table === "profiles") {
        // select → check inviter global_role; insert → ensure profile exists
        return {
          ...profilesSelectChain,
          ...profilesInsertChain,
        };
      }
      if (table === "org_members") {
        return {
          select: orgMembersSelectChain.select,
          eq: orgMembersSelectChain.eq,
          maybeSingle: orgMembersSelectChain.maybeSingle,
          insert: orgMembersInsertChain.insert,
        };
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) };
    }),
    _profilesInsertChain: profilesInsertChain,
    _profilesSelectChain: profilesSelectChain,
    _orgMembersInsertChain: orgMembersInsertChain,
    _orgMembersSelectChain: orgMembersSelectChain,
  };
}

// ---------- Module mocks ----------

jest.mock("@/lib/supabase/server", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: jest.fn() }));

import { createClient as createUserClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const mockedCreateUserClient = createUserClient as jest.Mock;
const mockedCreateAdminClient = createAdminClient as jest.Mock;

// ---------- Test helpers ----------

function makeRequest() {
  return new NextRequest("http://localhost/api/auth/finalize-invite", {
    method: "POST",
  });
}

// ---------- Tests ----------

describe("POST /api/auth/finalize-invite", () => {
  beforeEach(() => jest.clearAllMocks());

  it("retorna 401 quando não há sessão", async () => {
    mockedCreateUserClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: "no session" } }) },
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("noop quando não há metadados de convite", async () => {
    mockedCreateUserClient.mockReturnValue(makeSupabaseUserClient());
    const admin = makeAdminClient({
      getUserById: {
        data: { user: { user_metadata: {}, app_metadata: {} } },
        error: null,
      },
    });
    mockedCreateAdminClient.mockReturnValue(admin);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.noop).toBe(true);
    expect(body.reason).toBe("no-invite-metadata");
  });

  it("happy path: cria profile e org_members quando nenhum existe", async () => {
    mockedCreateUserClient.mockReturnValue(makeSupabaseUserClient());
    const admin = makeAdminClient();
    mockedCreateAdminClient.mockReturnValue(admin);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.orgId).toBe("org-1");
    expect(body.role).toBe("unit_user");

    // garante que o profile foi inserido ANTES do insert em org_members
    const profilesInsertCalls = admin._profilesInsertChain.insert.mock.calls;
    expect(profilesInsertCalls).toHaveLength(1);
    expect(profilesInsertCalls[0][0]).toMatchObject({ id: "user-1" });

    const insertCalls = admin._orgMembersInsertChain.insert.mock.calls;
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0][0]).toMatchObject({
      org_id: "org-1",
      user_id: "user-1",
      role: "unit_user",
    });
  });

  it("idempotente: não insere org_members se vínculo já existe", async () => {
    mockedCreateUserClient.mockReturnValue(makeSupabaseUserClient());
    const admin = makeAdminClient({
      orgMembersSelect: { data: { user_id: "user-1" }, error: null },
    });
    mockedCreateAdminClient.mockReturnValue(admin);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // profile insert NÃO é chamado quando o vínculo já existe
    expect(admin._profilesInsertChain.insert).not.toHaveBeenCalled();
    expect(admin._orgMembersInsertChain.insert).not.toHaveBeenCalled();
  });

  it("retorna 500 quando o insert de profile falha", async () => {
    mockedCreateUserClient.mockReturnValue(makeSupabaseUserClient());
    const admin = makeAdminClient({
      profilesInsert: { error: { message: "db error", code: "XXXXX" } },
    });
    mockedCreateAdminClient.mockReturnValue(admin);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.ok).toBe(false);
    // insert em org_members não deve ser chamado se profile falhou
    expect(admin._orgMembersInsertChain.insert).not.toHaveBeenCalled();
  });

  it("rejeita role inválido (não insere nada)", async () => {
    mockedCreateUserClient.mockReturnValue(makeSupabaseUserClient());
    const admin = makeAdminClient({
      getUserById: {
        data: {
          user: {
            user_metadata: {
              invited_org_id: "org-1",
              invited_role: "superadmin", // inválido
            },
            app_metadata: {},
          },
        },
        error: null,
      },
    });
    mockedCreateAdminClient.mockReturnValue(admin);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.noop).toBe(true);
  });

  // --- testes de escalada de papel ---

  it("bloqueia org_admin quando inviter não é platform_admin", async () => {
    mockedCreateUserClient.mockReturnValue(makeSupabaseUserClient());
    const admin = makeAdminClient({
      getUserById: {
        data: {
          user: {
            user_metadata: {
              invited_org_id: "org-1",
              invited_role: "org_admin",
              invited_by: "inviter-not-platform",
            },
            app_metadata: {},
          },
        },
        error: null,
      },
      profilesInviterGlobalRole: null,
    });
    mockedCreateAdminClient.mockReturnValue(admin);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.noop).toBe(true);
    expect(body.reason).toBe("role-not-authorized");
    expect(admin._orgMembersInsertChain.insert).not.toHaveBeenCalled();
  });

  it("permite org_master quando inviter é org_admin da mesma org", async () => {
    mockedCreateUserClient.mockReturnValue(makeSupabaseUserClient());
    const admin = makeAdminClient({
      getUserById: {
        data: {
          user: {
            user_metadata: {
              invited_org_id: "org-1",
              invited_role: "org_master",
              invited_by: "org-admin-id",
            },
            app_metadata: {},
          },
        },
        error: null,
      },
      profilesInviterGlobalRole: null,
      orgMembersSelect: { data: null, error: null },             // idempotência: sem vínculo existente
      orgMembersInviterMembership: { data: { role: "org_admin" }, error: null }, // inviter é org_admin
    });
    mockedCreateAdminClient.mockReturnValue(admin);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(admin._orgMembersInsertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ role: "org_master" })
    );
  });

  it("bloqueia org_master quando inviter é org_master (não pode elevar ao próprio nível)", async () => {
    mockedCreateUserClient.mockReturnValue(makeSupabaseUserClient());
    const admin = makeAdminClient({
      getUserById: {
        data: {
          user: {
            user_metadata: {
              invited_org_id: "org-1",
              invited_role: "org_master",
              invited_by: "org-master-id",
            },
            app_metadata: {},
          },
        },
        error: null,
      },
      profilesInviterGlobalRole: null,
      orgMembersSelect: { data: null, error: null },                      // idempotência: sem vínculo
      orgMembersInviterMembership: { data: { role: "org_master" }, error: null }, // inviter é org_master
    });
    mockedCreateAdminClient.mockReturnValue(admin);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.noop).toBe(true);
    expect(body.reason).toBe("role-not-authorized");
    expect(admin._orgMembersInsertChain.insert).not.toHaveBeenCalled();
  });

  it("bloqueia papel privilegiado quando não há invitedBy", async () => {
    mockedCreateUserClient.mockReturnValue(makeSupabaseUserClient());
    const admin = makeAdminClient({
      getUserById: {
        data: {
          user: {
            user_metadata: {
              invited_org_id: "org-1",
              invited_role: "org_master",
              // sem invited_by
            },
            app_metadata: {},
          },
        },
        error: null,
      },
    });
    mockedCreateAdminClient.mockReturnValue(admin);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.noop).toBe(true);
    expect(body.reason).toBe("role-not-authorized");
    expect(admin._orgMembersInsertChain.insert).not.toHaveBeenCalled();
  });

  it("permite papel privilegiado quando inviter é platform_admin", async () => {
    mockedCreateUserClient.mockReturnValue(makeSupabaseUserClient());
    const admin = makeAdminClient({
      getUserById: {
        data: {
          user: {
            user_metadata: {
              invited_org_id: "org-1",
              invited_role: "org_admin",
              invited_by: "platform-admin-id",
            },
            app_metadata: {},
          },
        },
        error: null,
      },
      profilesInviterGlobalRole: "platform_admin",
    });
    mockedCreateAdminClient.mockReturnValue(admin);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(admin._orgMembersInsertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ role: "org_admin" })
    );
  });

  it("papel não-privilegiado não passa pelo check do inviter", async () => {
    mockedCreateUserClient.mockReturnValue(makeSupabaseUserClient());
    const admin = makeAdminClient({
      profilesInviterGlobalRole: null, // inviter não é platform_admin, mas não importa
    });
    mockedCreateAdminClient.mockReturnValue(admin);

    const res = await POST(makeRequest()); // invited_role = "unit_user" por padrão
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // profiles.select (check inviter) não deve ter sido chamado para role não-privilegiado
    expect(admin._profilesSelectChain.maybeSingle).not.toHaveBeenCalled();
  });
});
