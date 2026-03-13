import { useEffect, useState } from "react";

import { toErrorMessage } from "../../../api/errors";
import {
  getProjectDetail,
  getProjectList,
  saveProject,
  type ProjectItem,
} from "../../../api/projects";
import type { CircuitModel } from "../model/types";
import type { ProbabilityDisplayMode } from "../simulation/probability-filter";
import { isCircuitModel } from "./workbench-model-utils";

interface LoadedProjectPayload {
  readonly circuit: CircuitModel;
  readonly qasm: string;
  readonly displayMode: ProbabilityDisplayMode;
  readonly name: string;
}

interface UseWorkbenchProjectsParams {
  readonly circuit: CircuitModel;
  readonly qasm: string;
  readonly displayMode: ProbabilityDisplayMode;
  readonly onProjectLoaded: (payload: LoadedProjectPayload) => void;
}

export function useWorkbenchProjects({
  circuit,
  qasm,
  displayMode,
  onProjectLoaded,
}: UseWorkbenchProjectsParams) {
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [projectSuccess, setProjectSuccess] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  async function loadProjects() {
    setProjectLoading(true);
    setProjectError(null);
    try {
      const response = await getProjectList(50, 0);
      setProjects(response.projects);
    } catch (error) {
      setProjectError(toErrorMessage(error, "项目列表加载失败"));
    } finally {
      setProjectLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function saveCurrentProject(name: string) {
    if (!name.trim()) {
      setProjectError("项目名不能为空");
      return;
    }
    setProjectSaving(true);
    setProjectError(null);
    setProjectSuccess(null);
    try {
      await saveProject(name.trim(), {
        entry_type: "circuit",
        payload: {
          circuit,
          qasm,
          display_mode: displayMode,
        },
      });
      setProjectSuccess("项目已保存");
      await loadProjects();
    } catch (error) {
      setProjectError(toErrorMessage(error, "项目保存失败"));
    } finally {
      setProjectSaving(false);
    }
  }

  async function loadProjectById(projectId: number) {
    setProjectError(null);
    setProjectSuccess(null);
    try {
      const detail = await getProjectDetail(projectId);
      if (!isCircuitModel(detail.payload.circuit)) {
        throw new Error("项目内容缺少有效 circuit");
      }
      if (typeof detail.payload.qasm !== "string") {
        throw new Error("项目内容缺少 qasm");
      }
      const restoredMode = detail.payload.display_mode === "ALL" ? "ALL" : "FILTERED";
      onProjectLoaded({
        circuit: detail.payload.circuit,
        qasm: detail.payload.qasm,
        displayMode: restoredMode,
        name: detail.name,
      });
      setProjectSuccess(`已加载项目：${detail.name}`);
    } catch (error) {
      setProjectError(toErrorMessage(error, "项目加载失败"));
    }
  }

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
