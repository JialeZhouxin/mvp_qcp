interface StructuredDetail {
  code?: unknown;
  message?: unknown;
  summary?: unknown;
  suggestions?: unknown;
}

function toStructuredMessage(detail: StructuredDetail): string | null {
  const summary = typeof detail.summary === "string" ? detail.summary : null;
  const message = typeof detail.message === "string" ? detail.message : null;
  const code = typeof detail.code === "string" ? detail.code : null;
  const suggestions = Array.isArray(detail.suggestions)
    ? detail.suggestions.filter((item): item is string => typeof item === "string")
    : [];
  const lines: string[] = [];
  if (summary) {
    lines.push(summary);
  } else if (message) {
    lines.push(message);
  }
  if (code) {
    lines.push(`错误码：${code}`);
  }
  if (suggestions.length > 0) {
    lines.push(`建议：${suggestions.join("；")}`);
  }
  if (lines.length === 0) {
    return null;
  }
  return lines.join(" | ");
}

export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    const rawMessage = error.message;
    try {
      const parsed = JSON.parse(rawMessage);
      if (typeof parsed === "object" && parsed !== null) {
        const message = toStructuredMessage(parsed as StructuredDetail);
        if (message) {
          return message;
        }
      }
    } catch {
      return rawMessage;
    }
    return rawMessage;
  }
  return fallback;
}
