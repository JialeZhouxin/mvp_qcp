import ResultChart from "../../components/ResultChart";

interface CodeTasksResultPanelProps {
  readonly probabilities: Record<string, number> | null;
  readonly resultText: string;
}

function CodeTasksResultPanel({ probabilities, resultText }: CodeTasksResultPanelProps) {
  return (
    <>
      {probabilities ? (
        <section style={{ marginTop: 16 }}>
          <ResultChart probabilities={probabilities} compact height={280} showTitle={false} />
        </section>
      ) : (
        <section style={{ marginTop: 16, padding: 12, background: "#f7f7f7" }}>
          <p style={{ margin: 0, color: "#666" }}>提交成功后将在这里展示概率分布图和可视化结果。</p>
        </section>
      )}

      {resultText ? <pre style={{ marginTop: 16, background: "#f4f4f4", padding: 12 }}>{resultText}</pre> : null}
    </>
  );
}

export default CodeTasksResultPanel;
