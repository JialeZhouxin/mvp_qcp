import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useTasksTheme } from "../../theme/AppTheme";
import "./TasksWorkspaceLayout.css";

interface TaskModule {
  readonly path: string;
  readonly label: string;
}

const TASK_MODULES: readonly TaskModule[] = [
  { path: "/tasks/center", label: "\u4EFB\u52A1\u4E2D\u5FC3" },
  { path: "/tasks/circuit", label: "\u56FE\u5F62\u5316\u7F16\u7A0B" },
  { path: "/tasks/code", label: "\u4EE3\u7801\u4EFB\u52A1" },
  { path: "/tasks/help", label: "\u5E2E\u52A9\u6587\u6863" },
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
  const { mode } = useTasksTheme();
  const currentModule = resolveCurrentModule(location.pathname);

  return (
    <div className="tasks-theme-scope tasks-workspace-layout" data-theme={mode}>
      <header className="tasks-workspace-layout__header">
        <div className="tasks-workspace-layout__header-inner">
          <div className="tasks-workspace-layout__brand">
            <strong className="tasks-workspace-layout__brand-title">
              {"\u91CF\u5B50\u4EFB\u52A1\u5DE5\u4F5C\u533A"}
            </strong>
            <span className="tasks-workspace-layout__brand-subtitle">
              {"\u7EDF\u4E00\u5904\u7406\u7535\u8DEF\u5B9E\u9A8C\u3001\u4EE3\u7801\u4EFB\u52A1\u4E0E\u7ED3\u679C\u8BCA\u65AD"}
            </span>
          </div>
          <nav className="tasks-workspace-layout__nav" aria-label={"\u4EFB\u52A1\u6A21\u5757\u5BFC\u822A"}>
            {TASK_MODULES.map((module) => (
              <NavLink
                key={module.path}
                to={module.path}
                className={({ isActive }) =>
                  isActive
                    ? "tasks-workspace-layout__nav-link tasks-workspace-layout__nav-link--active"
                    : "tasks-workspace-layout__nav-link"
                }
                style={LINK_BASE_STYLE}
              >
                {module.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <section className="tasks-workspace-layout__breadcrumb">
        <NavLink to="/tasks/center" className="tasks-workspace-layout__breadcrumb-link">
          {"\u4EFB\u52A1\u533A"}
        </NavLink>
        <span className="tasks-workspace-layout__breadcrumb-separator">/</span>
        <span className="tasks-workspace-layout__breadcrumb-current">{currentModule.label}</span>
      </section>

      <Outlet />
    </div>
  );
}

export default TasksWorkspaceLayout;
