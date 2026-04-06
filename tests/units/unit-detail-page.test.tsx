import { renderToStaticMarkup } from "react-dom/server";

import UnitDetailPage from "@/app/(app)/units/[unitSlug]/page";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getOrgWithDetails } from "@/lib/actions/orgs";
import { getUnitBySlug } from "@/lib/actions/units";
import { isOrgAdminFor, isUnitMasterFor } from "@/lib/permissions-org";
import MembersTabServer from "@/components/units/members/members-tab.server";

const mockUnitDetailsForm = jest.fn(() => null);

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("lucide-react", () => ({
  ArrowLeft: () => <span>ArrowLeft</span>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/lib/auth-context", () => ({
  getAuthContext: jest.fn(),
}));

jest.mock("@/lib/actions/orgs", () => ({
  getOrgWithDetails: jest.fn(),
}));

jest.mock("@/lib/actions/units", () => ({
  getUnitBySlug: jest.fn(),
}));

jest.mock("@/lib/permissions-org", () => ({
  isOrgAdminFor: jest.fn(),
  isUnitMasterFor: jest.fn(),
}));

jest.mock("@/components/units/members/members-tab.server", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/components/units/unit-details-form", () => ({
  __esModule: true,
  default: (props: any) => {
    mockUnitDetailsForm(props);
    return null;
  },
}));

const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockedGetAuthContext =
  getAuthContext as jest.MockedFunction<typeof getAuthContext>;
const mockedGetOrgWithDetails =
  getOrgWithDetails as jest.MockedFunction<typeof getOrgWithDetails>;
const mockedGetUnitBySlug =
  getUnitBySlug as jest.MockedFunction<typeof getUnitBySlug>;
const mockedIsOrgAdminFor =
  isOrgAdminFor as jest.MockedFunction<typeof isOrgAdminFor>;
const mockedIsUnitMasterFor =
  isUnitMasterFor as jest.MockedFunction<typeof isUnitMasterFor>;
const mockedMembersTabServer =
  MembersTabServer as jest.MockedFunction<typeof MembersTabServer>;

describe("app/(app)/units/[unitSlug]/page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRedirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
  });

  it("redirects to /login when auth is missing", async () => {
    mockedGetAuthContext.mockResolvedValue(null as any);

    await expect(
      UnitDetailPage({ params: Promise.resolve({ unitSlug: "alpha" }) })
    ).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects to /dashboard when auth has no orgId", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: null,
    } as any);

    await expect(
      UnitDetailPage({ params: Promise.resolve({ unitSlug: "alpha" }) })
    ).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("redirects to /dashboard when org lookup fails", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
    } as any);
    mockedGetOrgWithDetails.mockResolvedValue({ ok: false, data: null } as any);

    await expect(
      UnitDetailPage({ params: Promise.resolve({ unitSlug: "alpha" }) })
    ).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("redirects to /units when unit does not exist", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
    } as any);
    mockedGetOrgWithDetails.mockResolvedValue({
      ok: true,
      data: { id: "org-1", slug: "org-slug" },
    } as any);
    mockedGetUnitBySlug.mockResolvedValue({ ok: false, data: null } as any);

    await expect(
      UnitDetailPage({ params: Promise.resolve({ unitSlug: "alpha" }) })
    ).rejects.toThrow("REDIRECT:/units");
  });

  it("redirects to /units when user has no access", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: null,
    } as any);
    mockedGetOrgWithDetails.mockResolvedValue({
      ok: true,
      data: { id: "org-1", slug: "org-slug" },
    } as any);
    mockedGetUnitBySlug.mockResolvedValue({
      ok: true,
      data: { id: "unit-1", slug: "alpha", name: "Alpha" },
    } as any);
    mockedIsOrgAdminFor.mockResolvedValue(false);
    mockedIsUnitMasterFor.mockResolvedValue(false);

    await expect(
      UnitDetailPage({ params: Promise.resolve({ unitSlug: "alpha" }) })
    ).rejects.toThrow("REDIRECT:/units");
  });

  it("renders details and members tab when org admin has access", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      platformRole: null,
    } as any);
    mockedGetOrgWithDetails.mockResolvedValue({
      ok: true,
      data: { id: "org-1", slug: "org-slug" },
    } as any);
    mockedGetUnitBySlug.mockResolvedValue({
      ok: true,
      data: { id: "unit-1", slug: "alpha", name: "Alpha" },
    } as any);
    mockedIsOrgAdminFor.mockResolvedValue(true);
    mockedMembersTabServer.mockResolvedValue(<div>Membros</div> as any);

    const element = await UnitDetailPage({
      params: Promise.resolve({ unitSlug: "alpha" }),
    });
    renderToStaticMarkup(element as any);

    expect(mockedIsUnitMasterFor).not.toHaveBeenCalled();
    expect(mockedMembersTabServer).toHaveBeenCalledWith({
      orgId: "org-1",
      unitId: "unit-1",
      unitSlug: "alpha",
    });
    expect(mockUnitDetailsForm).toHaveBeenCalledTimes(1);
    expect(mockUnitDetailsForm).toHaveBeenCalledWith({
      unit: { id: "unit-1", slug: "alpha", name: "Alpha" },
    });
  });

  it("checks unit master permission when user is not platform/org admin", async () => {
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-2",
      orgId: "org-1",
      platformRole: null,
    } as any);
    mockedGetOrgWithDetails.mockResolvedValue({
      ok: true,
      data: { id: "org-1", slug: "org-slug" },
    } as any);
    mockedGetUnitBySlug.mockResolvedValue({
      ok: true,
      data: { id: "unit-1", slug: "alpha", name: "Alpha" },
    } as any);
    mockedIsOrgAdminFor.mockResolvedValue(false);
    mockedIsUnitMasterFor.mockResolvedValue(true);
    mockedMembersTabServer.mockResolvedValue(<div>Membros</div> as any);

    const element = await UnitDetailPage({
      params: Promise.resolve({ unitSlug: "alpha" }),
    });
    renderToStaticMarkup(element as any);

    expect(mockedIsUnitMasterFor).toHaveBeenCalledWith(
      "org-1",
      "unit-1",
      "user-2"
    );
    expect(mockedMembersTabServer).toHaveBeenCalled();
    expect(mockUnitDetailsForm).toHaveBeenCalledTimes(1);
  });
});
