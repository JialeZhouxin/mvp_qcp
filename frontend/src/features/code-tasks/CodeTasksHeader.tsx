import { Link } from "react-router-dom";

interface CodeTasksHeaderProps {
  readonly onLogout: () => void;
}

function CodeTasksHeader({ onLogout }: CodeTasksHeaderProps) {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h1 style={{ margin: 0 }}>
        Python / Qibo 代码任务
        <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 400 }}>
          <Link to="/tasks/center">进入任务中心</Link>
        </span>
      </h1>
      <button type="button" onClick={onLogout}>
        退出登录
      </button>
    </header>
  );
}

export default CodeTasksHeader;
