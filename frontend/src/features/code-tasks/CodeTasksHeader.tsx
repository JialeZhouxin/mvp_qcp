import { Link } from "react-router-dom";

interface CodeTasksHeaderProps {
  readonly onLogout: () => void;
}

function CodeTasksHeader({ onLogout }: CodeTasksHeaderProps) {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h1 className="tasks-theme-title" style={{ margin: 0 }}>
        {"Python / Qibo \u4EE3\u7801\u4EFB\u52A1"}
        <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 400 }}>
          <Link to="/tasks/center">{"\u8FDB\u5165\u4EFB\u52A1\u4E2D\u5FC3"}</Link>
        </span>
      </h1>
      <button type="button" onClick={onLogout}>
        {"\u9000\u51FA\u767B\u5F55"}
      </button>
    </header>
  );
}

export default CodeTasksHeader;
