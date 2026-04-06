import UnitsPage from "@/app/(app)/units/page";
import { renderToStaticMarkup } from "react-dom/server";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getOrgWithDetails } from "@/lib/actions/orgs";
import { listUnits } from "@/lib/actions/units";
import { createUnitAction } from "@/app/(app)/units/unit-actions";
import { isOrgAdminFor } from "@/lib/permissions-org";
import { AddUnitModal } from "@/components/units/add-unit-modal";
import UnitsTable from "@/components/units/units-table";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/auth-context", () => ({
  getAuthContext: jest.fn(),
}));

jest.mock("@/lib/actions/orgs", () => ({
  getOrgWithDetails: jest.fn(),
}));

jest.mock("@/lib/actions/units", () => ({
  listUnits: jest.fn(),
}));

jest.mock("@/app/(app)/units/unit-actions", () => ({
  createUnitAction: jest.fn(),
}));

jest.mock("@/lib/permissions-org", () => ({
  isOrgAdminFor: jest.fn(),
}));

jest.mock("@/components/units/add-unit-modal", () => ({
  AddUnitModal: jest.fn(() => null),
}));

jest.mock("@/components/units/units-table", () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockedGetAuthContext =
  getAuthContext as jest.MockedFunction<typeof getAuthContext>;
const mockedGetOrgWithDetails =
  getOrgWithDetails as jest.MockedFunction<typeof getOrgWithDetails>;
const mockedListUnits = listUnits as jest.MockedFunction<typeof listUnits>;
const mockedCreateUnitAction =
  createUnitAction as jest.MockedFunction<typeof createUnitAction>;
const mockedIsOrgAdminFor =
  isOrgAdminFor as jest.MockedFunction<typeof isOrgAdminFor>;
const mockedAddUnitModal = AddUnitModal as unknown as jest.Mock;
const mockedUnitsTable = UnitsTable as unknown as jest.Mock;

describe("app/(app)/units/page", () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRedirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("redirects to /login when auth context is missing", async () => {
    mockedGetAuthContext.mockResolvedValue(null as any);

    await expect(UnitsPage()).rejects.toThrow("REDIRECT:/login");
    expect(mockedRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /dashboard when effective org id is unavailable", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: null,
      orgId: null,
      platformRole: "platform_admin",
      orgRole: null,
    } as any);

    await expect(UnitsPage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(mockedRedirect).toHaveBeenCalledWith("/dashboard");
    expect(mockedGetOrgWithDetails).not.toHaveBeenCalled();
  });

  it("redirects to /dashboard when organization cannot be loaded", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: null,
      orgRole: "org_admin",
    } as any);
    mockedGetOrgWithDetails.mockResolvedValue({ ok: false, data: null } as any);

    await expect(UnitsPage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(mockedRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects to /dashboard when user is not allowed to manage units", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: null,
      orgRole: "unit_user",
    } as any);
    mockedGetOrgWithDetails.mockResolvedValue({
      ok: true,
      data: { id: "org-1", slug: "org-slug" },
    } as any);
    mockedIsOrgAdminFor.mockResolvedValue(false);

    await expect(UnitsPage()).rejects.toThrow("REDIRECT:/dashboard");
    expect(mockedRedirect).toHaveBeenCalledWith("/dashboard");
    expect(mockedListUnits).not.toHaveBeenCalled();
  });

  it("renders empty state with AddUnitModal when there are no units", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: null,
      orgRole: "org_master",
    } as any);
    mockedGetOrgWithDetails.mockResolvedValue({
      ok: true,
      data: { id: "org-1", slug: "org-slug" },
    } as any);
    mockedListUnits.mockResolvedValue({ ok: true, data: [] } as any);

    const element = (await UnitsPage()) as any;
    renderToStaticMarkup(element);

    expect(element.props.className).toBe("p-6");
    expect(mockedAddUnitModal).toHaveBeenCalledTimes(1);
    const addModalProps = mockedAddUnitModal.mock.calls[0][0];
    expect(addModalProps.orgId).toBe("org-1");
    expect(addModalProps.slug).toBe("org-slug");
    expect(typeof addModalProps.action).toBe("function");
    expect(mockedUnitsTable).not.toHaveBeenCalled();
  });

  it("renders units table and wires create action wrapper for valid submission", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: "platform_admin",
      orgRole: null,
    } as any);
    mockedGetOrgWithDetails.mockResolvedValue({
      ok: true,
      data: { id: "org-1", slug: "org-slug" },
    } as any);
    mockedListUnits.mockResolvedValue({
      ok: true,
      data: [{ id: "unit-1", slug: "unit-1", name: "Unidade 1" }],
    } as any);
    mockedCreateUnitAction.mockResolvedValue({ ok: true } as any);

    const element = (await UnitsPage()) as any;
    renderToStaticMarkup(element);

    expect(element.props.className).toBe("p-6");
    expect(mockedAddUnitModal).toHaveBeenCalledTimes(1);
    expect(mockedUnitsTable).toHaveBeenCalledTimes(1);
    expect(mockedUnitsTable.mock.calls[0][0]).toMatchObject({
      orgId: "org-1",
      orgSlug: "org-slug",
      units: [{ id: "unit-1", slug: "unit-1", name: "Unidade 1" }],
    });

    const addModalProps = mockedAddUnitModal.mock.calls[0][0];
    const action = addModalProps.action as (fd: FormData) => Promise<void>;
    const formData = new FormData();
    formData.set("name", "  Unidade Nova  ");

    await action(formData);

    expect(mockedCreateUnitAction).toHaveBeenCalledWith("org-1", "Unidade Nova");
  });

  it("throws when create wrapper receives empty name", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: "platform_admin",
      orgRole: null,
    } as any);
    mockedGetOrgWithDetails.mockResolvedValue({
      ok: true,
      data: { id: "org-1", slug: "org-slug" },
    } as any);
    mockedListUnits.mockResolvedValue({
      ok: true,
      data: [{ id: "unit-1", slug: "unit-1", name: "Unidade 1" }],
    } as any);

    const element = await UnitsPage();
    renderToStaticMarkup(element as any);
    const addModalProps = mockedAddUnitModal.mock.calls[0][0];
    const action = addModalProps.action as (fd: FormData) => Promise<void>;
    const formData = new FormData();
    formData.set("name", "   ");

    await expect(action(formData)).rejects.toThrow("Nome da unidade é obrigatório.");
    expect(mockedCreateUnitAction).not.toHaveBeenCalled();
  });

  it("throws when create action returns failure", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: "platform_admin",
      orgRole: null,
    } as any);
    mockedGetOrgWithDetails.mockResolvedValue({
      ok: true,
      data: { id: "org-1", slug: "org-slug" },
    } as any);
    mockedListUnits.mockResolvedValue({
      ok: true,
      data: [{ id: "unit-1", slug: "unit-1", name: "Unidade 1" }],
    } as any);
    mockedCreateUnitAction.mockResolvedValue({
      ok: false,
      error: "Falha ao criar",
    } as any);

    const element = await UnitsPage();
    renderToStaticMarkup(element as any);
    const addModalProps = mockedAddUnitModal.mock.calls[0][0];
    const action = addModalProps.action as (fd: FormData) => Promise<void>;
    const formData = new FormData();
    formData.set("name", "Unidade X");

    await expect(action(formData)).rejects.toThrow("Falha ao criar");
  });
});
