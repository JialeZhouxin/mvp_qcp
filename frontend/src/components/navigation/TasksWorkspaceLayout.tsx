import { NavLink, Outlet, useLocation } from "react-router-dom";

interface TaskModule {
  readonly path: string;
  readonly label: string;
}

const TASK_MODULES: readonly TaskModule[] = [
  { path: "/tasks/center", label: "任务中心" },
  { path: "/tasks/circuit", label: "图形化编程" },
  { path: "/tasks/code", label: "代码提交" },
  { path: "/tasks/help", label: "帮助文档" },
];

const LINK_BASE_STYLE = {
  textDecoration: "none",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 13,
  border: "1px solid transparent",
} as const;

function resolveCurrentModule(pathname: string): TaskModule {
  return (
    TASK_MODULES.find((module) => pathname === module.path || pathname.startsWith(`${module.path}/`)) ??
    TASK_MODULES[0]
  );
}

function TasksWorkspaceLayout() {
  const location = useLocation();
  const currentModule = resolveCurrentModule(location.pathname);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fb" }}>
      <header style={{ borderBottom: "1px solid #d9e2ec", background: "#ffffff" }}>
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            padding: "12px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <strong style={{ color: "#102a43" }}>任务工作台</strong>
            <span style={{ color: "#627d98", fontSize: 12 }}>统一导航与路径定位</span>
          </div>
          <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }} aria-label="任务模块导航">
            {TASK_MODULES.map((module) => (
              <NavLink
                key={module.path}
                to={module.path}
                style={({ isActive }) => ({
                  ...LINK_BASE_STYLE,
                  color: isActive ? "#0b5fff" : "#334e68",
                  background: isActive ? "#e8f0ff" : "transparent",
                  borderColor: isActive ? "#c6dafc" : "#d9e2ec",
                })}
              >
                {module.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <section style={{ maxWidth: 1320, margin: "0 auto", padding: "12px 24px 0", fontSize: 13 }}>
        <NavLink to="/tasks/center" style={{ textDecoration: "none", color: "#486581" }}>
          任务
        </NavLink>
        <span style={{ color: "#7b8794", margin: "0 6px" }}>/</span>
        <span style={{ color: "#102a43" }}>{currentModule.label}</span>
      </section>

      <Outlet />
    </div>
  );
}

export default TasksWorkspaceLayout;
