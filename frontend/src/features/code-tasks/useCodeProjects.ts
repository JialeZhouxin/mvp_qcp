import { useEffect, useState } from "react";

import { toErrorMessage } from "../../api/errors";
import { getProjectDetail, getProjectList, saveProject, type ProjectItem } from "../../api/projects";

interface UseCodeProjectsOptions {
  readonly code: string;
  readonly taskId: number | null;
  readonly onProjectLoaded: (code: string) => void;
}

export function useCodeProjects({ code, taskId, onProjectLoaded }: UseCodeProjectsOptions) {
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectSuccess, setProjectSuccess] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  const loadProjects = async () => {
    setProjectLoading(true);
    setProjectError(null);
    try {
      const response = await getProjectList(50, 0);
      setProjects(response.projects);
    } catch (nextError) {
      setProjectError(toErrorMessage(nextError, "\u52A0\u8F7D\u9879\u76EE\u5217\u8868\u5931\u8D25"));
    } finally {
      setProjectLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const saveCurrentProject = async (name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setProjectError("\u9879\u76EE\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
      return;
    }
    setProjectSaving(true);
    setProjectError(null);
    setProjectSuccess(null);
    try {
      await saveProject(normalizedName, {
        entry_type: "code",
        payload: { code },
        last_task_id: taskId,
      });
      setProjectSuccess("\u9879\u76EE\u4FDD\u5B58\u6210\u529F");
      await loadProjects();
    } catch (nextError) {
      setProjectError(toErrorMessage(nextError, "\u4FDD\u5B58\u9879\u76EE\u5931\u8D25"));
    } finally {
      setProjectSaving(false);
    }
  };

  const loadProjectById = async (projectId: number) => {
    setProjectError(null);
    setProjectSuccess(null);
    try {
      const detail = await getProjectDetail(projectId);
      const loadedCode = detail.payload.code;
      if (typeof loadedCode !== "string") {
        throw new Error("\u9879\u76EE\u5185\u5BB9\u7F3A\u5C11 code \u5B57\u6BB5");
      }
      onProjectLoaded(loadedCode);
      setProjectSuccess(`\u5DF2\u52A0\u8F7D\u9879\u76EE\uFF1A${detail.name}`);
    } catch (nextError) {
      setProjectError(toErrorMessage(nextError, "\u52A0\u8F7D\u9879\u76EE\u5931\u8D25"));
    }
  };

  return {
    projectLoading,
    projectSaving,
    projectError,
    projectSuccess,
    projects,
    loadProjects,
    saveCurrentProject,
    loadProjectById,
  };
}
