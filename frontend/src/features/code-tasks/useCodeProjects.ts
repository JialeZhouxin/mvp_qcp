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
      setProjectError(toErrorMessage(nextError, "加载项目列表失败"));
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
      setProjectError("项目名称不能为空");
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
      setProjectSuccess("项目保存成功");
      await loadProjects();
    } catch (nextError) {
      setProjectError(toErrorMessage(nextError, "保存项目失败"));
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
        throw new Error("项目内容缺少 code 字段");
      }
      onProjectLoaded(loadedCode);
      setProjectSuccess(`已加载项目：${detail.name}`);
    } catch (nextError) {
      setProjectError(toErrorMessage(nextError, "加载项目失败"));
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
