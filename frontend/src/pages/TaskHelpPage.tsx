import { Link } from "react-router-dom";

function TaskHelpPage() {
  return (
    <main style={{ maxWidth: 980, margin: "20px auto 24px", display: "grid", gap: 12 }}>
      <header>
        <h1 style={{ marginBottom: 8 }}>帮助文档（任务工作流）</h1>
        <p style={{ margin: 0, color: "#486581" }}>
          这里汇总任务执行的常用入口与建议路径，帮助你快速定位当前步骤。
        </p>
      </header>

      <section style={{ border: "1px solid #d9e2ec", borderRadius: 8, padding: 12, background: "#fff" }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>推荐路径</h2>
        <p style={{ margin: "0 0 8px 0" }}>
          任务中心确认状态与结果诊断 → 进入图形化编程或代码提交进行修改 → 返回任务中心复查结果。
        </p>
        <p style={{ margin: 0 }}>
          <Link to="/tasks/center">任务中心</Link> · <Link to="/tasks/circuit">图形化编程</Link> ·{" "}
          <Link to="/tasks/code">代码提交</Link>
        </p>
      </section>

      <section style={{ border: "1px solid #d9e2ec", borderRadius: 8, padding: 12, background: "#fff" }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>文档索引</h2>
        <p style={{ margin: 0, color: "#334e68" }}>
          项目完整使用说明位于仓库文件：<code>docs/project-usage-guide.md</code>
        </p>
      </section>
    </main>
  );
}

export default TaskHelpPage;
