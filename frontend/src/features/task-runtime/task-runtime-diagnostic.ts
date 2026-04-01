import { getTaskCenterDetail } from "../../api/task-center";

export async function getTaskDiagnosticText(taskId: number): Promise<string | null> {
  try {
    const detail = await getTaskCenterDetail(taskId);
    const diagnostic = detail.diagnostic;
    if (!diagnostic) {
      return null;
    }

    const line = `[${diagnostic.code}] ${diagnostic.summary ?? diagnostic.message}`;
    const tips = diagnostic.suggestions.join("; ");
    return tips ? `${line} | Suggestions: ${tips}` : line;
  } catch {
    return null;
  }
}
