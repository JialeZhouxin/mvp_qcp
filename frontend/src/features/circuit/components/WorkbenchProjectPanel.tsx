import { useState } from "react";

import type { ProjectItem } from "../../../api/projects";

interface WorkbenchProjectPanelProps {
  projects: ProjectItem[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  onRefresh: () => void;
  onSave: (name: string) => void;
  onLoad: (projectId: number) => void;
}

function WorkbenchProjectPanel({
  projects,
  loading,
  saving,
  error,
  success,
  onRefresh,
  onSave,
  onLoad,
}: WorkbenchProjectPanelProps) {
  const [name, setName] = useState("");
  const circuitProjects = projects.filter((project) => project.entry_type === "circuit");

  return (
    <section
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
        padding: 12,
        background: "var(--surface-panel)",
      }}
    >
      <h3 style={{ marginTop: 0 }}>项目面板</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          placeholder="输入电路项目名称"
          value={name}
          onChange={(event) => setName(event.target.value)}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={() => {
            onSave(name);
            setName("");
          }}
          disabled={saving}
        >
          {saving ? "保存中..." : "保存项目"}
        </button>
        <button type="button" onClick={onRefresh} disabled={loading}>
          刷新列表
        </button>
      </div>
      {error ? <p style={{ color: "var(--accent-danger)", margin: "4px 0" }}>{error}</p> : null}
      {success ? <p style={{ color: "var(--accent-success)", margin: "4px 0" }}>{success}</p> : null}
      <div style={{ display: "grid", gap: 6, maxHeight: 180, overflow: "auto" }}>
        {circuitProjects.map((project) => (
          <button
            type="button"
            key={project.id}
            onClick={() => onLoad(project.id)}
            style={{
              textAlign: "left",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              background: "var(--surface-panel-muted)",
              padding: 8,
            }}
          >
            <div>{project.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>更新时间：{project.updated_at}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default WorkbenchProjectPanel;
