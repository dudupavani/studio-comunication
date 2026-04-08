import { createGroupAction } from "@/app/(app)/groups/actions";
import { createServerClientWithCookies } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

jest.mock("@/lib/supabase/server", () => ({
  createServerClientWithCookies: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockedCreateServerClientWithCookies =
  createServerClientWithCookies as jest.MockedFunction<typeof createServerClientWithCookies>;
const mockedRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;

describe("app/(app)/groups/actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validData = {
    orgId: "550e8400-e29b-41d4-a716-446655440000",
    name: "Novo Grupo",
    description: "Uma descrição",
    color: "#00ff00",
  };

  it("returns error for invalid data", async () => {
    const result = await createGroupAction({ name: "" }); // Missing orgId, empty name
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Dados inválidos.");
  });

  it("calls supabase insert and revalidates path on success", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    const mockFrom = jest.fn((table: string) => {
      if (table === "user_groups") return { insert: mockInsert };
      return {};
    });

    mockedCreateServerClientWithCookies.mockReturnValue({ from: mockFrom } as any);

    const result = await createGroupAction(validData);

    expect(result.ok).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("user_groups");
    expect(mockInsert).toHaveBeenCalledWith([
      {
        org_id: validData.orgId,
        name: validData.name,
        description: validData.description,
        color: validData.color,
      },
    ]);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/groups");
  });

  it("returns error when supabase insert fails", async () => {
    const mockInsert = jest.fn().mockResolvedValue({
      error: { message: "Erro ao inserir" },
    });
    const mockFrom = jest.fn(() => ({ insert: mockInsert }));

    mockedCreateServerClientWithCookies.mockReturnValue({ from: mockFrom } as any);

    const result = await createGroupAction(validData);

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Erro ao inserir");
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});
