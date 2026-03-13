import { getProjectDetail, getProjectList, saveProject } from "../api/projects";
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
});
