import ResultChart from "../../components/ResultChart";

interface CodeTasksResultPanelProps {
  readonly probabilities: Record<string, number> | null;
  readonly resultText: string;
}

function CodeTasksResultPanel({ probabilities, resultText }: CodeTasksResultPanelProps) {
  return (
    <>
      {probabilities ? (
        <section style={{ marginTop: 16 }} className="tasks-theme-panel">
          <ResultChart probabilities={probabilities} compact height={280} showTitle={false} />
        </section>
      ) : (
        <section
          style={{ marginTop: 16, padding: 12 }}
          className="tasks-theme-panel tasks-theme-panel--muted"
        >
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            {
              "\u4EFB\u52A1\u6210\u529F\u540E\uFF0C\u8FD9\u91CC\u4F1A\u5C55\u793A\u6D4B\u91CF\u6982\u7387\u5206\u5E03\u548C\u53EF\u89C6\u5316\u7ED3\u679C\u3002"
            }
          </p>
        </section>
      )}

      {resultText ? (
        <pre style={{ marginTop: 16, padding: 12 }} className="tasks-theme-codeblock">
          {resultText}
        </pre>
      ) : null}
    </>
  );
}

export default CodeTasksResultPanel;
