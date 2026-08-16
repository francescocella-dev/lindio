import type { IntakeAnalysisInput, IntakeAnalysisResult } from "../domain/intakeAnalysis.ts";

export interface IntakeAnalyzer {
  analyze(input: IntakeAnalysisInput): Promise<IntakeAnalysisResult>;
}
