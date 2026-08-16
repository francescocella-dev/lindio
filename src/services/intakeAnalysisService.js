import { deterministicIntakeAnalyzer } from "../application/deterministicIntakeAnalyzer.ts";
import { parseIntakeAnalysisResult } from "../domain/intakeAnalysis.ts";

export async function analyzeLead(message) {
  const result = await deterministicIntakeAnalyzer.analyze({ message });
  return parseIntakeAnalysisResult(result);
}
