import { useState } from "react";

import type { ProjectItem } from "../../../api/projects";

interface CodeProjectPanelProps {
  projects: ProjectItem[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  onRefresh: () => void;
  onSave: (name: string) => void;
  onLoad: (projectId: number) => void;
}

function CodeProjectPanel({
  projects,
  loading,
  saving,
  error,
  success,
  onRefresh,
  onSave,
  onLoad,
}: CodeProjectPanelProps) {
  const [name, setName] = useState("");
  const codeProjects = projects.filter((project) => project.entry_type === "code");

  return (
    <section
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
        padding: 12,
        background: "var(--surface-panel)",
      }}
    >
      <h3 style={{ marginTop: 0 }}>{"\u4EE3\u7801\u9879\u76EE"}</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          placeholder={"\u8F93\u5165\u9879\u76EE\u540D\u79F0"}
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
          {saving ? "\u4FDD\u5B58\u4E2D..." : "\u4FDD\u5B58\u9879\u76EE"}
        </button>
        <button type="button" onClick={onRefresh} disabled={loading}>
          {"\u5237\u65B0\u5217\u8868"}
        </button>
      </div>
      {error ? <p style={{ color: "var(--accent-danger)", margin: "4px 0" }}>{error}</p> : null}
      {success ? <p style={{ color: "var(--accent-success)", margin: "4px 0" }}>{success}</p> : null}
      <div style={{ display: "grid", gap: 6, maxHeight: 180, overflow: "auto" }}>
        {codeProjects.map((project) => (
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
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {"\u66F4\u65B0\u65F6\u95F4\uFF1A"}{project.updated_at}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default CodeProjectPanel;
