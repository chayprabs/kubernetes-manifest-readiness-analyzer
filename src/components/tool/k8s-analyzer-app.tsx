"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  startTransition,
  type ComponentType,
  type ReactNode,
} from "react";
import type { OnMount } from "@monaco-editor/react";
import {
  ChevronDown,
  ClipboardPaste,
  LoaderCircle,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import { supportedKubernetesTargetVersions } from "@/lib/k8s/deprecations";
import {
  defaultK8sManifestExample,
  k8sManifestExamples,
  type K8sManifestExample,
} from "@/lib/k8s/examples";
import {
  formatBytes,
  getInputSizeBytes,
  RECOMMENDED_MAX_PASTE_BYTES,
} from "@/lib/k8s/errors";
import { parseK8sYaml } from "@/lib/k8s/parser";
import { k8sAnalyzerProfiles } from "@/lib/k8s/profiles";
import type { K8sAnalysisReport, K8sAnalyzerProfileId } from "@/lib/k8s/types";
import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/container";
import { useTheme } from "@/components/theme/theme-provider";
import { CopyButton } from "@/components/tool/copy-button";
import { FileDropzone } from "@/components/tool/file-dropzone";
import { K8sReportExportMenu } from "@/components/tool/k8s-report-export-menu";
import { K8sResultsDashboard } from "@/components/tool/k8s-results-dashboard";
import { LocalOnlyNotice } from "@/components/tool/local-only-notice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type MonacoEditorProps = {
  value: string;
  defaultLanguage?: string;
  height?: string;
  loading?: ReactNode;
  onMount: OnMount;
  onChange: (value: string | undefined) => void;
  options?: Record<string, unknown>;
  theme: string;
};

type UploadedFileMeta = {
  name: string;
  sizeBytes: number;
  documentCount: number;
};

type AnalyzerNotice = {
  tone: "info" | "success" | "warning";
  text: string;
};

type AnalysisStatus =
  | {
      phase: "idle";
      message: string;
      progress: number;
      trigger: "manual" | "auto" | null;
    }
  | {
      phase: "analyzing";
      message: string;
      progress: number;
      trigger: "manual" | "auto";
    }
  | {
      phase: "ready";
      message: string;
      progress: number;
      trigger: "manual" | "auto";
      finishedAt: string;
    };

type StoredAnalyzerSettings = {
  rememberSettings: boolean;
  kubernetesTargetVersion: string;
  profile: K8sAnalyzerProfileId;
  namespaceFilter: string;
  autoAnalyze: boolean;
  softWrap: boolean;
};

const SETTINGS_STORAGE_KEY = "authos-k8s-analyzer-settings";
const HARD_MAX_ANALYSIS_BYTES = 5 * 1024 * 1024;
const AUTO_ANALYZE_MAX_BYTES = 512 * 1024;
const AUTO_ANALYZE_DEBOUNCE_MS = 550;
const MIN_ANALYSIS_FEEDBACK_MS = 260;

const profileOptions = [
  k8sAnalyzerProfiles.balanced,
  k8sAnalyzerProfiles.strict,
  k8sAnalyzerProfiles.security,
  k8sAnalyzerProfiles.beginner,
] as const;

const defaultSettings: StoredAnalyzerSettings = {
  rememberSettings: false,
  kubernetesTargetVersion: supportedKubernetesTargetVersions.at(-1) ?? "1.30",
  profile: "balanced",
  namespaceFilter: "",
  autoAnalyze: true,
  softWrap: true,
};

export function K8sAnalyzerApp() {
  const { resolvedTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisRequestIdRef = useRef(0);
  const [MonacoEditor, setMonacoEditor] =
    useState<ComponentType<MonacoEditorProps> | null>(null);
  const [editorMode, setEditorMode] = useState<"loading" | "monaco" | "fallback">(
    "loading",
  );
  const initialSettings = useMemo(readStoredSettings, []);
  const [yamlInput, setYamlInput] = useState("");
  const [selectedVersion, setSelectedVersion] = useState(
    initialSettings.kubernetesTargetVersion,
  );
  const [selectedProfile, setSelectedProfile] = useState<K8sAnalyzerProfileId>(
    initialSettings.profile,
  );
  const [namespaceFilter, setNamespaceFilter] = useState(
    initialSettings.namespaceFilter,
  );
  const [autoAnalyze, setAutoAnalyze] = useState(initialSettings.autoAnalyze);
  const [softWrap, setSoftWrap] = useState(initialSettings.softWrap);
  const [rememberSettings, setRememberSettings] = useState(
    initialSettings.rememberSettings,
  );
  const [sourceLabel, setSourceLabel] = useState("New draft");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMeta[]>([]);
  const [notice, setNotice] = useState<AnalyzerNotice | null>(null);
  const [report, setReport] = useState<K8sAnalysisReport | null>(null);
  const [lastAnalyzedSignature, setLastAnalyzedSignature] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>({
    phase: "idle",
    message: "Paste YAML, upload files, or load a sample to begin.",
    progress: 0,
    trigger: null,
  });

  useEffect(() => {
    let cancelled = false;

    void import("@monaco-editor/react")
      .then((module) => {
        if (cancelled) {
          return;
        }

        setMonacoEditor(() => module.default as ComponentType<MonacoEditorProps>);
        setEditorMode("monaco");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setEditorMode("fallback");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasInput = yamlInput.trim().length > 0;
  const inputSizeBytes = useMemo(() => getInputSizeBytes(yamlInput), [yamlInput]);
  const hardLimitReached = inputSizeBytes > HARD_MAX_ANALYSIS_BYTES;
  const inputAboveRecommendedLimit =
    inputSizeBytes > RECOMMENDED_MAX_PASTE_BYTES && !hardLimitReached;
  const autoAnalyzeEligible =
    autoAnalyze &&
    hasInput &&
    !hardLimitReached &&
    inputSizeBytes <= AUTO_ANALYZE_MAX_BYTES;
  const currentSignature = useMemo(
    () =>
      [
        yamlInput,
        selectedVersion,
        selectedProfile,
        namespaceFilter.trim(),
      ].join("\u0000"),
    [namespaceFilter, selectedProfile, selectedVersion, yamlInput],
  );
  const resultsAreStale =
    report !== null &&
    hasInput &&
    lastAnalyzedSignature.length > 0 &&
    currentSignature !== lastAnalyzedSignature;
  const reportJson = useMemo(
    () => (report ? JSON.stringify(report, null, 2) : ""),
    [report],
  );

  const persistSettings = useEffectEvent((settings: StoredAnalyzerSettings) => {
    if (typeof window === "undefined") {
      return;
    }

    if (!settings.rememberSettings) {
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  });

  useEffect(() => {
    persistSettings({
      rememberSettings,
      kubernetesTargetVersion: selectedVersion,
      profile: selectedProfile,
      namespaceFilter,
      autoAnalyze,
      softWrap,
    });
  }, [
    autoAnalyze,
    namespaceFilter,
    persistSettings,
    rememberSettings,
    selectedProfile,
    selectedVersion,
    softWrap,
  ]);

  useEffect(() => {
    if (!hasInput && report) {
      setReport(null);
      setLastAnalyzedSignature("");
      setAnalysisStatus({
        phase: "idle",
        message: "Paste YAML, upload files, or load a sample to begin.",
        progress: 0,
        trigger: null,
      });
    }
  }, [hasInput, report]);

  const runAnalysis = useEffectEvent(
    async (trigger: "manual" | "auto", inputOverride?: string) => {
      const source = inputOverride ?? yamlInput;
      const normalizedSource = source.trim();

      if (!normalizedSource) {
        setNotice({
          tone: "info",
          text: "Paste YAML, upload files, or load a sample manifest before running analysis.",
        });
        setReport(null);
        setLastAnalyzedSignature("");
        return;
      }

      const sizeBytes = getInputSizeBytes(source);

      if (sizeBytes > HARD_MAX_ANALYSIS_BYTES) {
        setNotice({
          tone: "warning",
          text: `This draft is ${formatBytes(sizeBytes)}, above the hard local-analysis limit of ${formatBytes(HARD_MAX_ANALYSIS_BYTES)}. Trim the input before analyzing.`,
        });
        return;
      }

      const signature = [
        source,
        selectedVersion,
        selectedProfile,
        namespaceFilter.trim(),
      ].join("\u0000");
      const requestId = ++analysisRequestIdRef.current;
      const startedAt = Date.now();

      setAnalysisStatus({
        phase: "analyzing",
        message:
          trigger === "auto"
            ? "Auto-analyzing locally after the latest edit."
            : "Analyzing locally in this browser.",
        progress: 18,
        trigger,
      });

      await sleep(70);

      if (requestId !== analysisRequestIdRef.current) {
        return;
      }

      setAnalysisStatus({
        phase: "analyzing",
        message: "Parsing manifests and building the relationship graph.",
        progress: 54,
        trigger,
      });

      await sleep(50);

      if (requestId !== analysisRequestIdRef.current) {
        return;
      }

      const nextReport = analyzeK8sManifests(source, {
        kubernetesTargetVersion: selectedVersion,
        profile: selectedProfile,
        ...(namespaceFilter.trim()
          ? {
              namespaceFilter: namespaceFilter.trim(),
            }
          : {}),
      });
      const elapsed = Date.now() - startedAt;

      if (elapsed < MIN_ANALYSIS_FEEDBACK_MS) {
        await sleep(MIN_ANALYSIS_FEEDBACK_MS - elapsed);
      }

      if (requestId !== analysisRequestIdRef.current) {
        return;
      }

      startTransition(() => {
        setReport(nextReport);
        setLastAnalyzedSignature(signature);
        setAnalysisStatus({
          phase: "ready",
          message: nextReport.message,
          progress: 100,
          trigger,
          finishedAt: new Date().toLocaleTimeString(),
        });
        setNotice(null);
      });
    },
  );

  useEffect(() => {
    if (!autoAnalyzeEligible) {
      return;
    }

    if (currentSignature === lastAnalyzedSignature) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runAnalysis("auto");
    }, AUTO_ANALYZE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    autoAnalyzeEligible,
    currentSignature,
    lastAnalyzedSignature,
    runAnalysis,
  ]);

  const handleEditorMount = useEffectEvent<OnMount>((editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      void runAnalysis("manual");
    });
  });

  async function loadExample(example: K8sManifestExample) {
    setYamlInput(example.manifest);
    setSourceLabel(example.title);
    setUploadedFiles([]);
    setNotice({
      tone: "success",
      text: `${example.title} loaded locally. ${autoAnalyze ? "Analysis will run automatically if the draft stays within the auto-analyze size limit." : "Click Analyze when you are ready."}`,
    });
  }

  async function handlePasteFromClipboard() {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText.trim()) {
        setNotice({
          tone: "info",
          text: "Clipboard is empty. Copy a Kubernetes manifest first, then paste again.",
        });
        return;
      }

      setYamlInput(clipboardText);
      setSourceLabel("Clipboard paste");
      setUploadedFiles([]);
      setNotice({
        tone: "success",
        text: "Clipboard contents loaded locally into the analyzer workspace.",
      });
    } catch {
      setNotice({
        tone: "warning",
        text: "Clipboard access was blocked by the browser. You can still paste directly into the editor.",
      });
    }
  }

  async function handleSelectedFiles(files: File[]) {
    if (!files.length) {
      return;
    }

    const acceptedFiles = files.filter((file) =>
      /\.(ya?ml|json|txt)$/i.test(file.name),
    );

    if (!acceptedFiles.length) {
      setNotice({
        tone: "warning",
        text: "Only .yaml, .yml, .json, or .txt manifest files can be loaded into the editor.",
      });
      return;
    }

    const payloads = await Promise.all(
      acceptedFiles.map(async (file) => {
        const text = await file.text();

        return {
          file,
          text,
          documentCount: getDocumentCountForSource(text),
        };
      }),
    );

    setYamlInput(payloads.map((entry) => entry.text.trim()).join("\n---\n"));
    setUploadedFiles(
      payloads.map((entry) => ({
        name: entry.file.name,
        sizeBytes: entry.file.size,
        documentCount: entry.documentCount,
      })),
    );
    setSourceLabel(
      payloads.length === 1
        ? payloads[0]!.file.name
        : `${payloads.length} uploaded files`,
    );
    setNotice({
      tone: "success",
      text:
        payloads.length === 1
          ? `${payloads[0]!.file.name} loaded locally.`
          : `${payloads.length} files merged into the editor locally for one combined analysis pass.`,
    });
  }

  function clearWorkspace() {
    analysisRequestIdRef.current += 1;
    setYamlInput("");
    setUploadedFiles([]);
    setSourceLabel("New draft");
    setNotice({
      tone: "info",
      text: "Draft cleared. Raw YAML is not persisted unless you explicitly choose to remember settings, and settings storage never includes the manifest itself.",
    });
    setReport(null);
    setLastAnalyzedSignature("");
    setAnalysisStatus({
      phase: "idle",
      message: "Paste YAML, upload files, or load a sample to begin.",
      progress: 0,
      trigger: null,
    });
  }

  return (
    <div className="space-y-10">
      <Container size="workspace" className="space-y-6">
        <Card>
          <CardContent className="grid gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="space-y-5">
              <Badge variant="info">Client-side Kubernetes review</Badge>
              <div className="space-y-3">
                <h1 className="text-foreground text-4xl font-semibold sm:text-5xl">
                  Kubernetes Manifest Production-Readiness Analyzer
                </h1>
                <p className="text-muted max-w-3xl text-lg leading-8">
                  Paste YAML, upload manifest files, load real examples, and
                  analyze everything locally in the browser with the real
                  scoring and findings engine.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={() => void runAnalysis("manual")}>
                  Analyze now
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadExample(defaultK8sManifestExample)}
                >
                  Load starter sample
                </Button>
              </div>
            </div>

            <Card className="bg-background-muted/50 shadow-none">
              <CardHeader>
                <CardTitle>What is live now</CardTitle>
                <CardDescription>
                  The editor, upload flow, analyzer, scorecard, findings, parse
                  feedback, and report JSON all run without a backend roundtrip.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <InfoPill
                  label="Input"
                  text="Clipboard paste, drag and drop, multi-file upload, clear, and sample loading all write into one local draft."
                />
                <InfoPill
                  label="Trust"
                  text="Your manifest is analyzed in this browser. It is not uploaded."
                />
                <InfoPill
                  label="Results"
                  text="Real readiness scoring, findings, parse errors, positive checks, and fix suggestions are wired into the UI."
                />
                <InfoPill
                  label="State"
                  text="Only explicit settings can be remembered locally. Raw YAML is never stored in localStorage."
                />
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle>Manifest input</CardTitle>
                    <CardDescription>
                      Load one or more manifests into the editor, then analyze
                      the combined draft locally.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">Ctrl/Cmd + Enter</Badge>
                </div>

                <LocalOnlyNotice description="Your manifest is analyzed in this browser. It is not uploaded." />

                {notice ? (
                  <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice>
                ) : null}

                {hardLimitReached ? (
                  <Alert variant="destructive">
                    <AlertTitle>Draft exceeds the hard local-analysis limit</AlertTitle>
                    <AlertDescription>
                      This editor currently contains {formatBytes(inputSizeBytes)}.
                      Trim it below {formatBytes(HARD_MAX_ANALYSIS_BYTES)} to run
                      the browser-side analyzer safely.
                    </AlertDescription>
                  </Alert>
                ) : inputAboveRecommendedLimit ? (
                  <Alert variant="warning">
                    <AlertTitle>Large manifest set</AlertTitle>
                    <AlertDescription>
                      This draft is {formatBytes(inputSizeBytes)}, above the
                      recommended {formatBytes(RECOMMENDED_MAX_PASTE_BYTES)} size
                      for instant local analysis. Analysis is still allowed, but
                      it may feel slower.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {autoAnalyze && hasInput && !autoAnalyzeEligible && !hardLimitReached ? (
                  <Alert variant="info">
                    <AlertTitle>Auto-analyze paused for larger drafts</AlertTitle>
                    <AlertDescription>
                      Auto-analyze stays on by default for smaller inputs. This
                      draft is above {formatBytes(AUTO_ANALYZE_MAX_BYTES)}, so
                      click Analyze to run a deliberate pass.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={handlePasteFromClipboard}>
                    <ClipboardPaste className="h-4 w-4" />
                    Paste
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Upload files
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline">
                        Load sample
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Sample manifests</DropdownMenuLabel>
                      {k8sManifestExamples.map((example) => (
                        <DropdownMenuItem
                          key={example.id}
                          onClick={() => void loadExample(example)}
                        >
                          {example.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={clearWorkspace}
                    disabled={!hasInput && !report}
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void runAnalysis("manual")}
                    disabled={!hasInput || hardLimitReached || analysisStatus.phase === "analyzing"}
                  >
                    {analysisStatus.phase === "analyzing" ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Analyze
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".yaml,.yml,.json,.txt"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    void handleSelectedFiles(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />

                <div className="border-border bg-background-muted/40 grid gap-4 rounded-2xl border p-4 lg:grid-cols-[1fr_auto]">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <StatTile label="Source" value={sourceLabel} />
                    <StatTile
                      label="Draft size"
                      value={hasInput ? formatBytes(inputSizeBytes) : "0 B"}
                    />
                    <StatTile
                      label="Auto-analyze"
                      value={
                        autoAnalyzeEligible
                          ? "On"
                          : autoAnalyze
                            ? "Paused"
                            : "Off"
                      }
                    />
                  </div>
                  {hasInput ? <CopyButton value={yamlInput} /> : null}
                </div>

                {uploadedFiles.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {uploadedFiles.map((file) => (
                      <Card key={file.name} className="bg-background-muted/30 shadow-none">
                        <CardContent className="grid gap-2 p-4">
                          <p className="text-foreground text-sm font-medium">
                            {file.name}
                          </p>
                          <p className="text-muted text-sm">
                            {formatBytes(file.sizeBytes)} - {file.documentCount}{" "}
                            {file.documentCount === 1 ? "document" : "documents"}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : null}

                <EditorWorkspace
                  editorMode={editorMode}
                  MonacoEditor={MonacoEditor}
                  resolvedTheme={resolvedTheme}
                  softWrap={softWrap}
                  value={yamlInput}
                  onChange={setYamlInput}
                  onMount={handleEditorMount}
                  onRequestAnalyze={() => void runAnalysis("manual")}
                />

                <FileDropzone
                  multiple
                  title="Drag and drop YAML files"
                  description="Drop one or more manifest files here. They will be merged into the local editor for one combined browser-side analysis run."
                  onFilesSelected={(files) => {
                    void handleSelectedFiles(files);
                  }}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analysis settings</CardTitle>
                <CardDescription>
                  Settings change only the local analysis pass. Raw YAML is not
                  persisted or uploaded.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                    Kubernetes target version
                  </label>
                  <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedKubernetesTargetVersions.map((version) => (
                        <SelectItem key={version} value={version}>
                          Kubernetes {version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <label className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                    Profile
                  </label>
                  <Select
                    value={selectedProfile}
                    onValueChange={(value) =>
                      setSelectedProfile(value as K8sAnalyzerProfileId)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {profileOptions.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted text-xs leading-5">
                    {k8sAnalyzerProfiles[selectedProfile].description}
                  </p>
                </div>

                <div className="grid gap-2">
                  <label className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                    Namespace filter
                  </label>
                  <Input
                    value={namespaceFilter}
                    onChange={(event) => setNamespaceFilter(event.target.value)}
                    placeholder="Optional namespace scope"
                  />
                </div>

                <SettingToggle
                  checked={autoAnalyze}
                  description="When enabled, the analyzer reruns after a short debounce for smaller drafts."
                  label="Auto-analyze"
                  onCheckedChange={setAutoAnalyze}
                />
                <SettingToggle
                  checked={softWrap}
                  description="Wrap long manifest lines in the editor instead of forcing horizontal scrolling."
                  label="Soft wrap"
                  onCheckedChange={setSoftWrap}
                />
                <SettingToggle
                  checked={rememberSettings}
                  description="Persist version, profile, namespace filter, and editor preferences locally. Raw YAML is never stored."
                  label="Remember settings on this device"
                  onCheckedChange={setRememberSettings}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle>Results</CardTitle>
                    <CardDescription>
                      Real analyzer output, local parse feedback, and report JSON
                      for the current draft.
                    </CardDescription>
                  </div>
                  <K8sReportExportMenu report={report} />
                </div>
                {analysisStatus.phase === "analyzing" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <LoaderCircle className="text-accent h-4 w-4 animate-spin" />
                      <span className="text-foreground">{analysisStatus.message}</span>
                    </div>
                    <Progress value={analysisStatus.progress} />
                  </div>
                ) : null}
                {analysisStatus.phase === "ready" ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">
                      {analysisStatus.trigger === "auto"
                        ? "Auto-analyzed"
                        : "Manual analysis"}
                    </Badge>
                    <span className="text-muted">
                      Finished at {analysisStatus.finishedAt}
                    </span>
                    {resultsAreStale ? (
                      <Badge variant="warning">Results need refresh</Badge>
                    ) : null}
                  </div>
                ) : null}
              </CardHeader>
              <CardContent>
                <K8sResultsDashboard
                  report={report}
                  reportJson={reportJson}
                  hasInput={hasInput}
                  isAnalyzing={analysisStatus.phase === "analyzing"}
                  analysisMessage={analysisStatus.message}
                  stale={resultsAreStale}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <p className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">
              Sample manifests
            </p>
            <h2 className="text-foreground text-3xl font-semibold">
              Load realistic examples into the analyzer
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {k8sManifestExamples.map((example) => (
              <Card key={example.id}>
                <CardHeader className="gap-3">
                  <CardTitle>{example.title}</CardTitle>
                  <CardDescription>{example.summary}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void loadExample(example)}
                    >
                      Load sample
                    </Button>
                    <CopyButton value={example.manifest} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
}

function EditorWorkspace({
  editorMode,
  MonacoEditor,
  resolvedTheme,
  softWrap,
  value,
  onChange,
  onMount,
  onRequestAnalyze,
}: {
  editorMode: "loading" | "monaco" | "fallback";
  MonacoEditor: ComponentType<MonacoEditorProps> | null;
  resolvedTheme: "light" | "dark";
  softWrap: boolean;
  value: string;
  onChange: (value: string) => void;
  onMount: OnMount;
  onRequestAnalyze: () => void;
}) {
  if (editorMode === "loading") {
    return <Skeleton className="h-[560px] w-full rounded-3xl" />;
  }

  if (editorMode === "monaco" && MonacoEditor) {
    return (
      <div className="overflow-hidden rounded-3xl border">
        <MonacoEditor
          defaultLanguage="yaml"
          height="min(68vh, 760px)"
          value={value}
          onChange={(nextValue) => onChange(nextValue ?? "")}
          onMount={onMount}
          options={{
            automaticLayout: true,
            fontFamily: "var(--font-geist-mono)",
            fontSize: 14,
            glyphMargin: false,
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            minimap: { enabled: false },
            padding: { top: 16, bottom: 20 },
            renderLineHighlight: "gutter",
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            wordWrap: softWrap ? "on" : "off",
          }}
          theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
          loading={<Skeleton className="h-[560px] w-full rounded-3xl" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Alert variant="warning">
        <AlertTitle>Using the simple editor fallback</AlertTitle>
        <AlertDescription>
          Monaco did not load in this browser session, so the analyzer is using
          a plain textarea instead. Analysis still runs locally.
        </AlertDescription>
      </Alert>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app`}
        className={cn(
          "min-h-[560px] font-mono text-sm leading-7",
          softWrap ? "whitespace-pre-wrap" : "whitespace-pre",
        )}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            onRequestAnalyze();
          }
        }}
      />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
        {label}
      </p>
      <p className="text-foreground mt-2 text-sm font-medium break-words">
        {value}
      </p>
    </div>
  );
}

function SettingToggle({
  checked,
  description,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="border-border bg-background-muted/40 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3">
      <div className="space-y-1">
        <p className="text-foreground text-sm font-medium">{label}</p>
        <p className="text-muted text-xs leading-5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function InfoPill({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
        {label}
      </p>
      <p className="text-foreground mt-2 text-sm leading-6">{text}</p>
    </div>
  );
}

function InlineNotice({
  tone,
  children,
}: {
  tone: AnalyzerNotice["tone"];
  children: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm leading-6",
        tone === "success" && "border-success/30 bg-success/8 text-foreground",
        tone === "warning" && "border-warning/30 bg-warning/8 text-foreground",
        tone === "info" && "border-info/30 bg-info/8 text-foreground",
      )}
    >
      {children}
    </div>
  );
}

function readStoredSettings(): StoredAnalyzerSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (!raw) {
    return defaultSettings;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAnalyzerSettings>;

    return {
      rememberSettings: parsed.rememberSettings === true,
      kubernetesTargetVersion:
        typeof parsed.kubernetesTargetVersion === "string" &&
        supportedKubernetesTargetVersions.includes(
          parsed.kubernetesTargetVersion as (typeof supportedKubernetesTargetVersions)[number],
        )
          ? parsed.kubernetesTargetVersion
          : defaultSettings.kubernetesTargetVersion,
      profile:
        parsed.profile && parsed.profile in k8sAnalyzerProfiles
          ? parsed.profile
          : defaultSettings.profile,
      namespaceFilter:
        typeof parsed.namespaceFilter === "string"
          ? parsed.namespaceFilter
          : defaultSettings.namespaceFilter,
      autoAnalyze:
        typeof parsed.autoAnalyze === "boolean"
          ? parsed.autoAnalyze
          : defaultSettings.autoAnalyze,
      softWrap:
        typeof parsed.softWrap === "boolean"
          ? parsed.softWrap
          : defaultSettings.softWrap,
    };
  } catch {
    return defaultSettings;
  }
}

function getDocumentCountForSource(source: string) {
  const parsed = parseK8sYaml(source);
  const indexes = new Set<number>();

  for (const document of parsed.documents) {
    indexes.add(document.index);
  }

  for (const document of parsed.emptyDocuments) {
    indexes.add(document.index);
  }

  for (const issue of [...parsed.errors, ...parsed.warnings]) {
    if (issue.documentIndex !== undefined) {
      indexes.add(issue.documentIndex);
    }
  }

  return indexes.size > 0 ? indexes.size : source.trim() ? 1 : 0;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
