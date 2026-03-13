import { getProjectDetail, getProjectList, saveProject } from "../api/projects";
import { submitTask } from "../api/tasks";
import { apiRequest } from "../api/client";

vi.mock("../api/client", () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

describe("projects api", () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it("calls saveProject with PUT and auth", async () => {
    mockedApiRequest.mockResolvedValue({
      id: 1,
      name: "demo",
      entry_type: "code",
      last_task_id: null,
      updated_at: "2026-03-13T00:00:00Z",
      payload: {},
    });

    await saveProject("demo", { entry_type: "code", payload: { code: "print(1)" } });

    expect(mockedApiRequest).toHaveBeenCalledWith("/api/projects/demo", {
      method: "PUT",
      body: { entry_type: "code", payload: { code: "print(1)" } },
      withAuth: true,
    });
  });

  it("builds project list query", async () => {
    mockedApiRequest.mockResolvedValue({ projects: [] });

    await getProjectList(10, 20);

    expect(mockedApiRequest).toHaveBeenCalledWith("/api/projects?limit=10&offset=20", {
      withAuth: true,
    });
  });

  it("loads single project detail", async () => {
    mockedApiRequest.mockResolvedValue({ id: 2 });

    await getProjectDetail(2);

    expect(mockedApiRequest).toHaveBeenCalledWith("/api/projects/2", { withAuth: true });
  });

  it("submits task with idempotency header when provided", async () => {
    mockedApiRequest.mockResolvedValue({
      task_id: 12,
      status: "PENDING",
      deduplicated: false,
    });

    await submitTask("print(1)", { idempotencyKey: "idem-abc" });

    expect(mockedApiRequest).toHaveBeenCalledWith("/api/tasks/submit", {
      method: "POST",
      body: { code: "print(1)" },
      withAuth: true,
      headers: { "Idempotency-Key": "idem-abc" },
    });
  });

  it("submits task without idempotency header by default", async () => {
    mockedApiRequest.mockResolvedValue({
      task_id: 13,
      status: "PENDING",
      deduplicated: true,
    });

    const response = await submitTask("print(2)");

    expect(mockedApiRequest).toHaveBeenCalledWith("/api/tasks/submit", {
      method: "POST",
      body: { code: "print(2)" },
      withAuth: true,
      headers: undefined,
    });
    expect(response.deduplicated).toBe(true);
  });
});
