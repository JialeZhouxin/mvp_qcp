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
      style={{ border: "1px solid #91caff", background: "#e6f4ff", padding: 12, borderRadius: 8 }}
    >
      <strong>快速引导</strong>
      <p style={{ margin: "6px 0 0 0" }}>
        1. 从左侧门库拖拽到线路。2. 双比特门需要在同一层完成第二步选择。3. 下方会实时显示测量概率直方图。
      </p>
      <button type="button" onClick={onDismiss} style={{ marginTop: 8 }}>
        我知道了
      </button>
    </section>
  );
}

export default WorkbenchGuide;
