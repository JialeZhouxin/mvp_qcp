interface WorkbenchGuideProps {
  readonly visible: boolean;
  readonly onDismiss: () => void;
}

function WorkbenchGuide({ visible, onDismiss }: WorkbenchGuideProps) {
  if (!visible) {
    return null;
  }
  return (
    <section
      data-testid="workbench-guide"
      style={{
        border: "1px solid color-mix(in srgb, var(--border-subtle) 40%, var(--accent-primary))",
        background: "color-mix(in srgb, var(--surface-panel) 84%, var(--accent-primary))",
        padding: 12,
        borderRadius: 8,
      }}
    >
      <strong>工作台提示</strong>
      <p style={{ margin: "6px 0 0 0" }}>
        1. 从左侧门库拖入量子门。2. 在中间画布编辑电路并查看时间步预览。3. 在右侧 OpenQASM 与下方结果区观察电路状态。
      </p>
      <button type="button" onClick={onDismiss} style={{ marginTop: 8 }}>
        关闭提示
      </button>
    </section>
  );
}

export default WorkbenchGuide;
