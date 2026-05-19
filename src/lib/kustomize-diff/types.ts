export type KustomizeDiffChangeType = "added" | "removed" | "changed";

export type KustomizeDiffCategory =
  | "image"
  | "probes"
  | "resources"
  | "labels"
  | "exposure"
  | "other";

export type ResourceDiff = {
  id: string;
  key: string;
  kind: string;
  namespace: string;
  name: string;
  changeType: KustomizeDiffChangeType;
  category: KustomizeDiffCategory;
  summary: string;
  leftSummary?: string | undefined;
  rightSummary?: string | undefined;
};

export type KustomizeDiffReport = {
  ok: boolean;
  message: string;
  summary: string;
  leftDocumentCount: number;
  rightDocumentCount: number;
  added: ResourceDiff[];
  removed: ResourceDiff[];
  changed: ResourceDiff[];
  parseErrors: {
    side: "left" | "right";
    messages: string[];
  }[];
};
