import { GET, POST } from "@/app/api/calendar/events/route";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/auth-context", () => ({
  getAuthContext: jest.fn(),
}));

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockedGetAuthContext =
  getAuthContext as jest.MockedFunction<typeof getAuthContext>;

function makeAwaitableQuery<T>(result: T) {
  const query: any = {
    lte: jest.fn(() => query),
    gte: jest.fn(() => query),
    order: jest.fn(() => query),
    eq: jest.fn(() => query),
    then: (onFulfilled: (value: T) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => Promise.resolve(result).catch(onRejected),
    finally: (onFinally: () => void) => Promise.resolve(result).finally(onFinally),
  };
  return query;
}

describe("GET /api/calendar/events", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for invalid query params", async () => {
    const req = new Request("http://localhost/api/calendar/events");

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("CAL-VAL-001");
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("returns 401 when user is unauthenticated", async () => {
    mockedCreateClient.mockReturnValue({ from: jest.fn() } as any);
    mockedGetAuthContext.mockResolvedValue(null as any);

    const req = new Request(
      "http://localhost/api/calendar/events?from=2026-01-01T00:00:00.000Z&to=2026-01-02T00:00:00.000Z"
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.code).toBe("CAL-AUTH-001");
  });

  it("returns events for a valid request", async () => {
    const query = makeAwaitableQuery({
      data: [{ id: "evt-1", title: "Reunião" }],
      error: null,
    });

    const select = jest.fn(() => query);
    const from = jest.fn(() => ({ select }));

    mockedCreateClient.mockReturnValue({ from } as any);
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      unitIds: [],
      platformRole: null,
      orgRole: null,
    } as any);

    const req = new Request(
      "http://localhost/api/calendar/events?from=2026-01-01T00:00:00.000Z&to=2026-01-02T00:00:00.000Z&orgId=org-1"
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("calendar_events");
    expect(select).toHaveBeenCalledWith("*");
    expect(query.lte).toHaveBeenCalled();
    expect(query.gte).toHaveBeenCalled();
  });
});

describe("POST /api/calendar/events", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for invalid body", async () => {
    mockedCreateClient.mockReturnValue({ from: jest.fn() } as any);
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      unitIds: [],
      platformRole: null,
      orgRole: null,
    } as any);

    const req = new Request("http://localhost/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe("CAL-VAL-002");
  });

  it("creates event and returns 201 for valid payload", async () => {
    const single = jest.fn().mockResolvedValue({
      data: { id: "evt-1", title: "Planejamento" },
      error: null,
    });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    const from = jest.fn(() => ({ insert }));

    mockedCreateClient.mockReturnValue({ from } as any);
    mockedGetAuthContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      unitIds: [],
      platformRole: null,
      orgRole: null,
    } as any);

    const req = new Request("http://localhost/api/calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Planejamento",
        start_time: "2026-01-01T10:00:00.000Z",
        end_time: "2026-01-01T11:00:00.000Z",
        all_day: false,
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.error).toBeNull();
    expect(body.data.id).toBe("evt-1");
    expect(from).toHaveBeenCalledWith("calendar_events");
    expect(insert).toHaveBeenCalled();
  });
});
