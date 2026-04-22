export type K8sFindingSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type K8sSeverity = K8sFindingSeverity;

export type K8sFindingCategory =
  | "reliability"
  | "security"
  | "scalability"
  | "networking"
  | "operations"
  | "api-version"
  | "cost"
  | "schema"
  | "best-practice";

export type K8sFindingConfidence = "high" | "medium" | "low";

export type K8sResourceKind =
  | "ConfigMap"
  | "CronJob"
  | "DaemonSet"
  | "Deployment"
  | "HorizontalPodAutoscaler"
  | "Ingress"
  | "Job"
  | "Namespace"
  | "NetworkPolicy"
  | "PersistentVolumeClaim"
  | "Pod"
  | "PodDisruptionBudget"
  | "ReplicaSet"
  | "Role"
  | "RoleBinding"
  | "Secret"
  | "Service"
  | "ServiceAccount"
  | "StatefulSet"
  | "ClusterRole"
  | "ClusterRoleBinding"
  | (string & {});

export type K8sSourceLocation = {
  offset: number;
  line: number;
  column: number;
  endOffset: number;
  endLine: number;
  endColumn: number;
};

export type K8sMetadata = {
  name: string | undefined;
  namespace: string | undefined;
  labels: Record<string, string>;
  annotations: Record<string, string>;
};

export type K8sObjectRef = {
  documentIndex: number;
  apiVersion: string | undefined;
  kind: K8sResourceKind | undefined;
  name: string | undefined;
  namespace: string | undefined;
};

export type K8sFieldLocationKey =
  | "apiVersion"
  | "kind"
  | "metadata"
  | "metadata.name"
  | "metadata.namespace"
  | "metadata.labels"
  | "metadata.annotations"
  | "spec";

export type K8sManifestDocument = {
  index: number;
  apiVersion: string | undefined;
  kind: K8sResourceKind | undefined;
  metadata: K8sMetadata;
  spec: Record<string, unknown> | undefined;
  raw: Record<string, unknown>;
  objectRef: K8sObjectRef;
  location: K8sSourceLocation;
  fieldLocations: Partial<Record<K8sFieldLocationKey, K8sSourceLocation>>;
};

export type K8sParseErrorCode =
  | "input-too-large"
  | "missing-api-version"
  | "missing-kind"
  | "missing-metadata-name"
  | "non-object-document"
  | "yaml-syntax"
  | "yaml-warning";

export type K8sParseError = {
  code: K8sParseErrorCode;
  severity: "error" | "warning";
  message: string;
  detail?: string;
  documentIndex?: number;
  path?: string;
  location?: K8sSourceLocation;
  snippet?: string;
  ref?: K8sObjectRef;
  yamlCode?: string;
};

export type K8sEmptyDocument = {
  index: number;
  location: K8sSourceLocation;
};

export type K8sAnalysisInput = {
  raw: string;
  sizeBytes: number;
  recommendedMaxBytes: number;
  documents: K8sManifestDocument[];
  emptyDocumentCount: number;
};

export type K8sParseResult = {
  ok: boolean;
  documents: K8sManifestDocument[];
  errors: K8sParseError[];
  warnings: K8sParseError[];
  emptyDocuments: K8sEmptyDocument[];
  input: K8sAnalysisInput;
};

export type K8sFindingLocation = {
  documentIndex: number;
  path?: string | undefined;
  source?: K8sSourceLocation | undefined;
};

export type K8sFixSuggestionType =
  | "yaml-snippet"
  | "strategic-merge-patch-like"
  | "json-patch-like"
  | "manual-instruction"
  | "new-resource";

export type K8sFixPreview = {
  before?: string | undefined;
  after?: string | undefined;
};

export type K8sJsonPatchLikeOperation = {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  from?: string;
  value?: unknown;
};

type K8sFixSuggestionBase = {
  type: K8sFixSuggestionType;
  title: string;
  riskNote: string;
  safeToAutoApply: boolean;
  summary: string;
  yamlPath?: string | undefined;
  preview?: K8sFixPreview | undefined;
  copyableContent?: string | undefined;
  snippet?: string | undefined;
};

export type K8sYamlSnippetFixSuggestion = K8sFixSuggestionBase & {
  type: "yaml-snippet";
  copyableContent: string;
};

export type K8sStrategicMergePatchLikeFixSuggestion =
  K8sFixSuggestionBase & {
    type: "strategic-merge-patch-like";
    targetRef: Pick<K8sObjectRef, "apiVersion" | "kind" | "name" | "namespace">;
    copyableContent: string;
  };

export type K8sJsonPatchLikeFixSuggestion = K8sFixSuggestionBase & {
  type: "json-patch-like";
  targetRef: Pick<K8sObjectRef, "apiVersion" | "kind" | "name" | "namespace">;
  operations: readonly K8sJsonPatchLikeOperation[];
  copyableContent: string;
};

export type K8sManualInstructionFixSuggestion = K8sFixSuggestionBase & {
  type: "manual-instruction";
  instructions: string;
};

export type K8sNewResourceFixSuggestion = K8sFixSuggestionBase & {
  type: "new-resource";
  resourceKind: K8sResourceKind | undefined;
  copyableContent: string;
};

export type K8sFixSuggestion =
  | K8sYamlSnippetFixSuggestion
  | K8sStrategicMergePatchLikeFixSuggestion
  | K8sJsonPatchLikeFixSuggestion
  | K8sManualInstructionFixSuggestion
  | K8sNewResourceFixSuggestion;

export type K8sLegacyFixSuggestion = {
  summary: string;
  yamlPath?: string | undefined;
  snippet?: string | undefined;
};

export type K8sFixSuggestionInput =
  | K8sFixSuggestion
  | K8sLegacyFixSuggestion;

export type K8sFinding = {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: K8sFindingSeverity;
  category: K8sFindingCategory;
  resourceRef: K8sObjectRef;
  location?: K8sFindingLocation | undefined;
  whyItMatters: string;
  recommendation: string;
  fix?: K8sFixSuggestion | undefined;
  docsUrl?: string | undefined;
  confidence: K8sFindingConfidence;
  suggestion: string;
};

export type K8sScorecardCategory =
  | "reliability"
  | "security"
  | "networking"
  | "operations"
  | "api-version";

export type K8sReadinessGrade =
  | "Production ready with minor notes"
  | "Mostly ready, review warnings"
  | "Needs production fixes"
  | "High risk"
  | "Not production ready";

export type K8sRiskLevel = "low" | "moderate" | "high" | "critical";

export type K8sPositiveCheck = {
  id: string;
  title: string;
  summary: string;
};

export type K8sResourceSummary = {
  totalObjects: number;
  namespacesFound: string[];
  workloadsFound: number;
  servicesFound: number;
  ingressesFound: number;
  pdbsFound: number;
  networkPoliciesFound: number;
};

export type K8sScoreBreakdown = {
  startingScore: number;
  deductions: number;
  bonusPoints: number;
  fatalPenalty: number;
  deductionsByCategory: Record<K8sScorecardCategory, number>;
  categoryCaps: Record<K8sScorecardCategory, number>;
  profilePenaltyMultipliers: Record<K8sScorecardCategory, number>;
};

export type K8sAnalyzerProfileId =
  | "balanced"
  | "strict"
  | "security"
  | "beginner";

export type K8sAnalyzerProfileRuleOverride = {
  enabled?: boolean;
  severity?: K8sFindingSeverity;
};

export type K8sAnalyzerProfile = {
  id: K8sAnalyzerProfileId;
  label: string;
  description: string;
  includeInfoFindingsByDefault: boolean;
  strictSecurityByDefault: boolean;
  ruleOverrides: Record<string, K8sAnalyzerProfileRuleOverride>;
};

export type K8sAnalyzerOptions = {
  kubernetesTargetVersion?: string;
  profile?: K8sAnalyzerProfileId;
  namespaceFilter?: string;
  includeInfoFindings?: boolean;
  strictSecurity?: boolean;
  rules?: readonly K8sRule[];
};

export type K8sNamespacedKind =
  | "ConfigMap"
  | "CronJob"
  | "DaemonSet"
  | "Deployment"
  | "HorizontalPodAutoscaler"
  | "Ingress"
  | "Job"
  | "NetworkPolicy"
  | "Pod"
  | "PodDisruptionBudget"
  | "ReplicaSet"
  | "Role"
  | "RoleBinding"
  | "Secret"
  | "Service"
  | "ServiceAccount"
  | "StatefulSet";

export type K8sWorkloadKind =
  | "Pod"
  | "Deployment"
  | "StatefulSet"
  | "DaemonSet"
  | "ReplicaSet"
  | "Job"
  | "CronJob";

export type K8sLabelSelectorOperator =
  | "In"
  | "NotIn"
  | "Exists"
  | "DoesNotExist";

export type K8sLabelMatchExpression = {
  key: string;
  operator: K8sLabelSelectorOperator;
  values: string[];
};

export type K8sLabelSelector = {
  matchLabels: Record<string, string>;
  matchExpressions: K8sLabelMatchExpression[];
};

export type K8sContainerReference = {
  name: string;
  image: string | undefined;
};

export type K8sPodTemplate = {
  labels: Record<string, string>;
  annotations: Record<string, string>;
  spec: Record<string, unknown>;
  containers: K8sContainerReference[];
  initContainers: K8sContainerReference[];
  ephemeralContainers: K8sContainerReference[];
};

export type K8sExtractedResourceCategory =
  | "workload"
  | "service"
  | "ingress"
  | "pod-disruption-budget"
  | "horizontal-pod-autoscaler"
  | "namespace"
  | "config"
  | "secret"
  | "service-account"
  | "rbac"
  | "network-policy";

export type K8sExtractedResourceBase = {
  id: string;
  kind: K8sResourceKind;
  apiVersion: string | undefined;
  name: string;
  namespace: string | undefined;
  scope: "Namespaced" | "Cluster";
  category: K8sExtractedResourceCategory;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  documentIndex: number;
  ref: K8sObjectRef;
};

export type K8sWorkloadResource = K8sExtractedResourceBase & {
  category: "workload";
  kind: K8sWorkloadKind;
  podTemplate: K8sPodTemplate;
  selector: K8sLabelSelector | undefined;
};

export type K8sServiceResource = K8sExtractedResourceBase & {
  category: "service";
  kind: "Service";
  selector: K8sLabelSelector | undefined;
};

export type K8sPodDisruptionBudgetResource = K8sExtractedResourceBase & {
  category: "pod-disruption-budget";
  kind: "PodDisruptionBudget";
  selector: K8sLabelSelector | undefined;
};

export type K8sHorizontalPodAutoscalerTargetRef = {
  apiVersion: string | undefined;
  kind: K8sResourceKind | undefined;
  name: string | undefined;
  namespace: string | undefined;
};

export type K8sHorizontalPodAutoscalerResource = K8sExtractedResourceBase & {
  category: "horizontal-pod-autoscaler";
  kind: "HorizontalPodAutoscaler";
  scaleTargetRef: K8sHorizontalPodAutoscalerTargetRef | undefined;
};

export type K8sNetworkPolicyResource = K8sExtractedResourceBase & {
  category: "network-policy";
  kind: "NetworkPolicy";
  podSelector: K8sLabelSelector | undefined;
};

export type K8sNamespaceResource = K8sExtractedResourceBase & {
  category: "namespace";
  kind: "Namespace";
};

export type K8sIngressResource = K8sExtractedResourceBase & {
  category: "ingress";
  kind: "Ingress";
};

export type K8sConfigResource = K8sExtractedResourceBase & {
  category: "config";
  kind: "ConfigMap";
};

export type K8sSecretResource = K8sExtractedResourceBase & {
  category: "secret";
  kind: "Secret";
  secretType: string | undefined;
};

export type K8sServiceAccountResource = K8sExtractedResourceBase & {
  category: "service-account";
  kind: "ServiceAccount";
};

export type K8sRbacResource = K8sExtractedResourceBase & {
  category: "rbac";
  kind: "Role" | "ClusterRole" | "RoleBinding" | "ClusterRoleBinding";
};

export type K8sExtractedResource =
  | K8sWorkloadResource
  | K8sServiceResource
  | K8sIngressResource
  | K8sPodDisruptionBudgetResource
  | K8sHorizontalPodAutoscalerResource
  | K8sNamespaceResource
  | K8sConfigResource
  | K8sSecretResource
  | K8sServiceAccountResource
  | K8sRbacResource
  | K8sNetworkPolicyResource;

export type K8sRelationshipType =
  | "service-targets"
  | "pod-disruption-budget-targets"
  | "horizontal-pod-autoscaler-targets"
  | "network-policy-targets";

export type K8sRelationship = {
  type: K8sRelationshipType;
  sourceId: string;
  targetId: string;
  sourceRef: K8sObjectRef;
  targetRef: K8sObjectRef;
  namespace: string | undefined;
};

export type K8sRelationshipIssueCode =
  | "service-selector-matches-nothing"
  | "pdb-selector-matches-nothing"
  | "hpa-target-not-found"
  | "deployment-selector-mismatch";

export type K8sRelationshipIssue = {
  code: K8sRelationshipIssueCode;
  severity: "warning" | "error";
  message: string;
  sourceId: string;
  sourceRef: K8sObjectRef;
  targetRef?: K8sObjectRef;
  namespace: string | undefined;
};

export type K8sRelationshipGraph = {
  resources: K8sExtractedResource[];
  workloads: K8sWorkloadResource[];
  services: K8sServiceResource[];
  podDisruptionBudgets: K8sPodDisruptionBudgetResource[];
  horizontalPodAutoscalers: K8sHorizontalPodAutoscalerResource[];
  networkPolicies: K8sNetworkPolicyResource[];
  relationships: K8sRelationship[];
  issues: K8sRelationshipIssue[];
  namespaces: string[];
};

export type K8sResolvedAnalyzerOptions = {
  kubernetesTargetVersion: string | undefined;
  profile: K8sAnalyzerProfileId;
  namespaceFilter: string | undefined;
  includeInfoFindings: boolean;
  strictSecurity: boolean;
};

export type K8sRuleContext = {
  raw: string;
  parseResult: K8sParseResult;
  relationshipGraph: K8sRelationshipGraph;
  documents: K8sManifestDocument[];
  resources: K8sExtractedResource[];
  workloads: K8sWorkloadResource[];
  services: K8sServiceResource[];
  podDisruptionBudgets: K8sPodDisruptionBudgetResource[];
  horizontalPodAutoscalers: K8sHorizontalPodAutoscalerResource[];
  networkPolicies: K8sNetworkPolicyResource[];
  profile: K8sAnalyzerProfile;
  options: K8sResolvedAnalyzerOptions;
};

export type K8sRule = {
  id: string;
  title: string;
  description: string;
  category: K8sFindingCategory;
  defaultSeverity: K8sFindingSeverity;
  docsUrl?: string;
  run: (context: K8sRuleContext) => K8sFinding[] | K8sFinding | void;
};

export type K8sCategorySummary = {
  category: K8sFindingCategory;
  total: number;
  bySeverity: Record<K8sFindingSeverity, number>;
};

export type K8sResourceCounts = {
  total: number;
  byKind: Record<string, number>;
};

export type K8sAnalysisReport = {
  ok: boolean;
  state: "empty" | "invalid" | "ready";
  message: string;
  headline: string;
  summary: string;
  nextSteps: string;
  raw: string;
  options: K8sResolvedAnalyzerOptions;
  profile: K8sAnalyzerProfile;
  parseResult: K8sParseResult;
  relationshipGraph: K8sRelationshipGraph;
  findings: K8sFinding[];
  fatalParseErrors: K8sParseError[];
  readinessScore: number;
  readinessGrade: K8sReadinessGrade;
  riskLevel: K8sRiskLevel;
  canShareReportSafely: boolean;
  categoryCounts: Record<K8sFindingCategory, number>;
  severityCounts: Record<K8sFindingSeverity, number>;
  categorySummaries: Record<K8sFindingCategory, K8sCategorySummary>;
  categoryScores: Record<K8sScorecardCategory, number>;
  resourceCounts: K8sResourceCounts;
  resourceSummary: K8sResourceSummary;
  fixFirstFindings: K8sFinding[];
  positiveChecks: K8sPositiveCheck[];
  scoreBreakdown: K8sScoreBreakdown;
};
