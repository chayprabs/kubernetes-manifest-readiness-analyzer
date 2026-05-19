export type ToolAnalysisPhase = "idle" | "analyzing" | "ready" | "error";

export type ToolAnalysisStatus = {
  phase: ToolAnalysisPhase;
  message: string;
  progress: number;
};
