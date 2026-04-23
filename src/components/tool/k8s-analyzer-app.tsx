"use client";

import Link from "next/link";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  startTransition,
  type ComponentType,
  type RefObject,
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
import {
  createK8sAnalyzerWorkerClient,
  isK8sAnalyzerAbortError,
  K8sAnalyzerWorkerClientError,
} from "@/lib/k8s/analyzer-worker-client";
import {
  BROWSER_ANALYSIS_HARD_MAX_BYTES,
  estimateYamlDocumentCount,
  formatDurationMs,
  getAutoAnalyzeDelayMs,
} from "@/lib/k8s/analyzer-runtime";
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
import { buildVisibleK8sReportJson } from "@/lib/k8s/privacy";
import { k8sAnalyzerProfiles } from "@/lib/k8s/profiles";
import type {
  K8sAnalysisReport,
  K8sAnalyzerOptions,
  K8sAnalyzerProfileId,
} from "@/lib/k8s/types";
import { kubernetesManifestAnalyzerH1 } from "@/lib/k8s/landing-content";
import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/container";
import { useTheme } from "@/components/theme/theme-provider";
import { K8sAnalyzerLandingContent } from "@/components/tool/k8s-analyzer-landing-content";
import { CopyButton } from "@/components/tool/copy-button";
import { FileDropzone } from "@/components/tool/file-dropzone";
import { KeyboardShortcutHint } from "@/components/tool/keyboard-shortcut-hint";
import { KeyboardShortcutsDialog } from "@/components/tool/keyboard-shortcuts-dialog";
import { K8sReportExportMenu } from "@/components/tool/k8s-report-export-menu";
import { K8sResultsDashboard } from "@/components/tool/k8s-results-dashboard";
import { LocalOnlyNotice } from "@/components/tool/local-only-notice";
import { PrivacyDetailsDialog } from "@/components/tool/privacy-details-dialog";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type MonacoStandaloneEditor = Parameters<OnMount>[0];

type UploadedFileMeta = {
  name: string;
  sizeBytes: number;
  documentCount: number;
};

type AnalyzerNotice = {
  tone: "info" | "success" | "warning";
  text: string;
};

type LoadExampleOptions = {
  scrollToEditor?: boolean;
  focusEditor?: boolean;
};

type PendingDestructiveAction =
  | { type: "clear-workspace" }
  | { type: "load-sample"; example: K8sManifestExample }
  | null;

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
      durationMs: number;
      runtime: "worker" | "main-thread";
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
  const manifestInputSectionRef = useRef<HTMLElement | null>(null);
  const monacoEditorRef = useRef<MonacoStandaloneEditor | null>(null);
  const fallbackTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const analysisRequestIdRef = useRef(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const inFlightSignatureRef = useRef<string | null>(null);
  const workerClientRef = useRef<ReturnType<
    typeof createK8sAnalyzerWorkerClient
  > | null>(null);
  const workerDisabledForSessionRef = useRef(false);
  const [MonacoEditor, setMonacoEditor] =
    useState<ComponentType<MonacoEditorProps> | null>(null);
  const [editorMode, setEditorMode] = useState<
    "loading" | "monaco" | "fallback"
  >("loading");
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
  const [redactVisibleOutput, setRedactVisibleOutput] = useState(true);
  const [sourceLabel, setSourceLabel] = useState("New draft");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileMeta[]>([]);
  const [notice, setNotice] = useState<AnalyzerNotice | null>(null);
  const [report, setReport] = useState<K8sAnalysisReport | null>(null);
  const [lastAnalyzedSignature, setLastAnalyzedSignature] = useState("");
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [pendingDestructiveAction, setPendingDestructiveAction] =
    useState<PendingDestructiveAction>(null);
  const [activeResultsTab, setActiveResultsTab] = useState("findings");
  const [focusResultsRequestKey, setFocusResultsRequestKey] = useState(0);
  const [focusSearchRequestKey, setFocusSearchRequestKey] = useState(0);
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

        setMonacoEditor(
          () => module.default as ComponentType<MonacoEditorProps>,
        );
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
  const inputSizeBytes = useMemo(
    () => getInputSizeBytes(yamlInput),
    [yamlInput],
  );
  const hardLimitReached = inputSizeBytes > BROWSER_ANALYSIS_HARD_MAX_BYTES;
  const autoAnalyzeDelayMs = useMemo(
    () => getAutoAnalyzeDelayMs(inputSizeBytes),
    [inputSizeBytes],
  );
  const inputAboveRecommendedLimit =
    inputSizeBytes > RECOMMENDED_MAX_PASTE_BYTES && !hardLimitReached;
  const autoAnalyzePausedForLargeInput =
    autoAnalyze && hasInput && !hardLimitReached && autoAnalyzeDelayMs === null;
  const autoAnalyzeEligible =
    autoAnalyze && hasInput && !hardLimitReached && autoAnalyzeDelayMs !== null;
  const currentSignature = useMemo(
    () =>
      buildAnalysisSignature(
        yamlInput,
        selectedVersion,
        selectedProfile,
        namespaceFilter,
      ),
    [namespaceFilter, selectedProfile, selectedVersion, yamlInput],
  );
  const resultsAreStale =
    report !== null &&
    hasInput &&
    lastAnalyzedSignature.length > 0 &&
    currentSignature !== lastAnalyzedSignature;
  const reportJson = useMemo(
    () =>
      report
        ? buildVisibleK8sReportJson(report, {
            redactSensitiveOutput: redactVisibleOutput,
          })
        : "",
    [redactVisibleOutput, report],
  );
  const hasWorkspaceContent =
    hasInput || uploadedFiles.length > 0 || report !== null;

  const focusEditor = useEffectEvent(
    (options: { scroll?: boolean; placeCursorAtEnd?: boolean } = {}) => {
      const { scroll = true, placeCursorAtEnd = true } = options;

      if (scroll) {
        manifestInputSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }

      window.requestAnimationFrame(() => {
        if (editorMode === "monaco" && monacoEditorRef.current) {
          const editor = monacoEditorRef.current;

          editor.focus();

          if (placeCursorAtEnd) {
            const model = editor.getModel();

            if (model) {
              const lastLine = model.getLineCount();
              const lastColumn = model.getLineMaxColumn(lastLine);

              editor.setPosition({
                lineNumber: lastLine,
                column: lastColumn,
              });
              editor.revealPositionInCenterIfOutsideViewport({
                lineNumber: lastLine,
                column: lastColumn,
              });
            }
          }

          return;
        }

        if (fallbackTextareaRef.current) {
          const textarea = fallbackTextareaRef.current;
          textarea.focus();

          if (placeCursorAtEnd) {
            const cursorPosition = textarea.value.length;
            textarea.setSelectionRange(cursorPosition, cursorPosition);
          }

          return;
        }

        manifestInputSectionRef.current?.focus();
      });
    },
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
    return () => {
      activeAbortControllerRef.current?.abort();
      activeAbortControllerRef.current = null;
      workerClientRef.current?.dispose();
      workerClientRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      !hasInput &&
      (report !== null ||
        lastAnalyzedSignature.length > 0 ||
        analysisStatus.phase !== "idle")
    ) {
      analysisRequestIdRef.current += 1;
      inFlightSignatureRef.current = null;
      activeAbortControllerRef.current?.abort();
      activeAbortControllerRef.current = null;
      setReport(null);
      setLastAnalyzedSignature("");
      setAnalysisStatus(createIdleAnalysisStatus());
    }
  }, [analysisStatus.phase, hasInput, lastAnalyzedSignature, report]);

  const runAnalysis = useEffectEvent(
    async (trigger: "manual" | "auto", inputOverride?: string) => {
      const source = inputOverride ?? yamlInput;
      const normalizedSource = source.trim();

      if (!normalizedSource) {
        activeAbortControllerRef.current?.abort();
        activeAbortControllerRef.current = null;
        setNotice({
          tone: "info",
          text: "Paste YAML, upload files, or load a sample manifest before running analysis.",
        });
        setReport(null);
        setLastAnalyzedSignature("");
        inFlightSignatureRef.current = null;
        setAnalysisStatus(createIdleAnalysisStatus());
        return;
      }

      const sizeBytes = getInputSizeBytes(source);

      if (sizeBytes > BROWSER_ANALYSIS_HARD_MAX_BYTES) {
        setNotice({
          tone: "warning",
          text: buildHardLimitDescription(sizeBytes),
        });
        setAnalysisStatus(
          createIdleAnalysisStatus(
            "Input is too large for browser analysis. Split the bundle or use rendered output sections.",
          ),
        );
        return;
      }

      const signature = buildAnalysisSignature(
        source,
        selectedVersion,
        selectedProfile,
        namespaceFilter,
      );
      const requestId = ++analysisRequestIdRef.current;
      const options = buildAnalyzerOptions(
        selectedVersion,
        selectedProfile,
        namespaceFilter,
      );
      let runtime: "worker" | "main-thread" = "worker";
      let completionNotice: AnalyzerNotice | null = null;

      activeAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      activeAbortControllerRef.current = abortController;
      inFlightSignatureRef.current = signature;

      setAnalysisStatus({
        phase: "analyzing",
        message: "Analyzing locally...",
        progress: 10,
        trigger,
      });

      const updateProgress = (message: string, progress: number) => {
        if (requestId !== analysisRequestIdRef.current) {
          return;
        }

        setAnalysisStatus({
          phase: "analyzing",
          message,
          progress,
          trigger,
        });
      };

      const executeDirectAnalysis = () => {
        runtime = "main-thread";
        return analyzeK8sManifests(source, options, {
          onProgress(progress) {
            updateProgress(progress.message, progress.progress);
          },
        });
      };

      try {
        let nextReport: K8sAnalysisReport;

        if (workerDisabledForSessionRef.current) {
          nextReport = executeDirectAnalysis();
        } else {
          try {
            const workerClient =
              workerClientRef.current ?? createK8sAnalyzerWorkerClient();

            workerClientRef.current = workerClient;
            nextReport = await workerClient.analyze({
              raw: source,
              options,
              signal: abortController.signal,
              onProgress(progress) {
                updateProgress(progress.message, progress.progress);
              },
            });
          } catch (error) {
            if (isK8sAnalyzerAbortError(error)) {
              return;
            }

            workerDisabledForSessionRef.current = true;
            workerClientRef.current?.dispose();
            workerClientRef.current = null;
            completionNotice = buildWorkerFallbackNotice(error);
            nextReport = executeDirectAnalysis();
          }
        }

        if (requestId !== analysisRequestIdRef.current) {
          return;
        }

        startTransition(() => {
          setReport(nextReport);
          setLastAnalyzedSignature(signature);
          setAnalysisStatus({
            phase: "ready",
            message: `Analysis finished in ${formatDurationMs(nextReport.analysisMetadata.totalMs)}.`,
            progress: 100,
            trigger,
            finishedAt: new Date().toLocaleTimeString(),
            durationMs: nextReport.analysisMetadata.totalMs,
            runtime,
          });
          setNotice(completionNotice);
          if (trigger === "manual") {
            setFocusResultsRequestKey((value) => value + 1);
          }
        });
      } catch (error) {
        if (requestId !== analysisRequestIdRef.current) {
          return;
        }

        setNotice({
          tone: "warning",
          text:
            error instanceof Error
              ? error.message
              : "Local analysis stopped unexpectedly. Review the manifest and try again.",
        });
        setAnalysisStatus(
          createIdleAnalysisStatus(
            "Analysis stopped before a report was produced.",
          ),
        );
      } finally {
        if (activeAbortControllerRef.current === abortController) {
          activeAbortControllerRef.current = null;
        }

        if (
          requestId === analysisRequestIdRef.current &&
          inFlightSignatureRef.current === signature
        ) {
          inFlightSignatureRef.current = null;
        }
      }
    },
  );

  useEffect(() => {
    if (!autoAnalyzeEligible) {
      return;
    }

    if (
      currentSignature === lastAnalyzedSignature ||
      currentSignature === inFlightSignatureRef.current
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runAnalysis("auto");
    }, autoAnalyzeDelayMs ?? 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    autoAnalyzeDelayMs,
    autoAnalyzeEligible,
    currentSignature,
    lastAnalyzedSignature,
    runAnalysis,
  ]);

  const handleEditorMount = useEffectEvent<OnMount>((editor, monaco) => {
    monacoEditorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      void runAnalysis("manual");
    });
  });

  useEffect(() => {
    function handleGlobalKeydown(event: KeyboardEvent) {
      if (event.defaultPrevented) {
        return;
      }

      if (shortcutHelpOpen || pendingDestructiveAction !== null) {
        return;
      }

      const key = event.key.toLowerCase();
      const editableTarget = isEditableShortcutTarget(event.target);

      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        if (editableTarget) {
          return;
        }

        event.preventDefault();
        void runAnalysis("manual");
        return;
      }

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        if (editableTarget) {
          return;
        }

        event.preventDefault();

        if (!report) {
          setNotice({
            tone: "info",
            text: "Run analysis first, then Ctrl/Cmd + K will focus the findings search.",
          });
          focusEditor();
          return;
        }

        setActiveResultsTab("findings");
        setFocusSearchRequestKey((value) => value + 1);
      }
    }

    window.addEventListener("keydown", handleGlobalKeydown);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeydown);
    };
  }, [
    focusEditor,
    pendingDestructiveAction,
    report,
    runAnalysis,
    shortcutHelpOpen,
  ]);

  function loadExample(
    example: K8sManifestExample,
    options: LoadExampleOptions = {},
  ) {
    setYamlInput(example.manifest);
    setSourceLabel(example.title);
    setUploadedFiles([]);
    setNotice({
      tone: "success",
      text: `${example.title} loaded locally. ${autoAnalyze ? "Analysis will run automatically if the draft stays within the auto-analyze size limit." : "Click Analyze when you are ready."}`,
    });

    if (options.scrollToEditor || options.focusEditor) {
      focusEditor({
        scroll: options.scrollToEditor ?? true,
      });
    }
  }

  function requestLoadExample(
    example: K8sManifestExample,
    options: LoadExampleOptions = {},
  ) {
    const sampleSignature = buildAnalysisSignature(
      example.manifest,
      selectedVersion,
      selectedProfile,
      namespaceFilter,
    );

    if (hasWorkspaceContent && currentSignature !== sampleSignature) {
      setPendingDestructiveAction({
        type: "load-sample",
        example,
      });
      return;
    }

    loadExample(example, options);
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
      focusEditor({ scroll: true });
    } catch {
      setNotice({
        tone: "warning",
        text: "Clipboard access was blocked by the browser. You can still paste directly into the editor.",
      });
      focusEditor({ scroll: true });
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
          documentCount: estimateYamlDocumentCount(text),
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
    focusEditor({ scroll: true });
  }

  function clearWorkspace() {
    analysisRequestIdRef.current += 1;
    inFlightSignatureRef.current = null;
    activeAbortControllerRef.current?.abort();
    activeAbortControllerRef.current = null;
    setYamlInput("");
    setUploadedFiles([]);
    setSourceLabel("New draft");
    setNotice({
      tone: "info",
      text: "Draft cleared. Raw YAML is not persisted unless you explicitly choose to remember settings, and settings storage never includes the manifest itself.",
    });
    setReport(null);
    setLastAnalyzedSignature("");
    setAnalysisStatus(createIdleAnalysisStatus());
    focusEditor({ scroll: true, placeCursorAtEnd: false });
  }

  function requestClearWorkspace() {
    if (!hasWorkspaceContent) {
      clearWorkspace();
      return;
    }

    setPendingDestructiveAction({ type: "clear-workspace" });
  }

  function confirmPendingDestructiveAction() {
    if (!pendingDestructiveAction) {
      return;
    }

    if (pendingDestructiveAction.type === "clear-workspace") {
      clearWorkspace();
    }

    if (pendingDestructiveAction.type === "load-sample") {
      loadExample(pendingDestructiveAction.example, {
        scrollToEditor: true,
        focusEditor: true,
      });
    }

    setPendingDestructiveAction(null);
  }

  return (
    <div className="space-y-10">
      <Container size="workspace" className="space-y-6">
        <Card>
          <CardContent className="grid gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Link
                  href="/"
                  className="text-muted hover:text-foreground transition"
                >
                  Home
                </Link>
                <span className="text-muted">/</span>
                <Link
                  href="/tools"
                  className="text-muted hover:text-foreground transition"
                >
                  Tools
                </Link>
                <span className="text-muted">/</span>
                <span className="text-foreground">
                  {kubernetesManifestAnalyzerH1}
                </span>
              </div>
              <Badge variant="info">Client-side Kubernetes review</Badge>
              <div className="space-y-3">
                <h1 className="text-foreground text-4xl font-semibold sm:text-5xl">
                  {kubernetesManifestAnalyzerH1}
                </h1>
                <p className="text-muted max-w-3xl text-lg leading-8">
                  A production-readiness Kubernetes YAML checker for probes,
                  resources, security context, service selectors, and exposure
                  risks. Paste YAML, upload manifest files, load examples, and
                  analyze everything locally in the browser.
                </p>
                <p className="text-muted text-sm leading-6">
                  Static review only; verify against your cluster policies
                  before deployment.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => focusEditor()}
                  aria-label="Focus the Kubernetes manifest editor"
                >
                  Focus editor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    requestLoadExample(defaultK8sManifestExample, {
                      scrollToEditor: true,
                      focusEditor: true,
                    })
                  }
                  aria-label="Reset to the starter sample manifest"
                >
                  Reset to starter sample
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

        <section
          ref={manifestInputSectionRef}
          className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]"
          tabIndex={-1}
        >
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">Local-only</Badge>
                    <PrivacyDetailsDialog />
                    <KeyboardShortcutHint keys={["Ctrl/Cmd", "Enter"]} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShortcutHelpOpen(true)}
                      aria-label="Open keyboard shortcuts help"
                    >
                      Shortcuts
                    </Button>
                  </div>
                </div>

                <LocalOnlyNotice
                  description="Your manifest is analyzed in this browser. It is not uploaded."
                  showPrivacyDetails={false}
                />

                {notice ? (
                  <InlineNotice tone={notice.tone}>{notice.text}</InlineNotice>
                ) : null}

                {hardLimitReached ? (
                  <Alert variant="destructive">
                    <AlertTitle>
                      Input is too large for browser analysis
                    </AlertTitle>
                    <AlertDescription>
                      {buildHardLimitDescription(inputSizeBytes)}
                    </AlertDescription>
                  </Alert>
                ) : inputAboveRecommendedLimit ? (
                  <Alert variant="warning">
                    <AlertTitle>Large manifest set</AlertTitle>
                    <AlertDescription>
                      This draft is {formatBytes(inputSizeBytes)}, above the
                      recommended {formatBytes(RECOMMENDED_MAX_PASTE_BYTES)}{" "}
                      size for instant local analysis. Analysis still runs
                      locally, but larger Helm or Kustomize output may take
                      longer.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {autoAnalyzePausedForLargeInput ? (
                  <Alert variant="info">
                    <AlertTitle>Auto-analyze paused for this draft</AlertTitle>
                    <AlertDescription>
                      Large manifest detected. Auto-analyze is paused; click
                      Analyze when ready.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePasteFromClipboard}
                    aria-label="Paste Kubernetes YAML from the clipboard"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                    Paste
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Upload Kubernetes manifest files"
                  >
                    <Upload className="h-4 w-4" />
                    Upload files
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        aria-label="Open sample manifest menu"
                      >
                        Load sample
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Sample manifests</DropdownMenuLabel>
                      {k8sManifestExamples.map((example) => (
                        <DropdownMenuItem
                          key={example.id}
                          onClick={() =>
                            requestLoadExample(example, {
                              scrollToEditor: true,
                              focusEditor: true,
                            })
                          }
                        >
                          {example.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={requestClearWorkspace}
                    disabled={!hasWorkspaceContent}
                    aria-label="Clear all manifest input and results"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear all
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void runAnalysis("manual")}
                    disabled={
                      !hasInput ||
                      hardLimitReached ||
                      analysisStatus.phase === "analyzing"
                    }
                    aria-label="Analyze the current Kubernetes manifest draft"
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
                    void handleSelectedFiles(
                      Array.from(event.target.files ?? []),
                    );
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
                          : autoAnalyzePausedForLargeInput
                            ? "Paused"
                            : autoAnalyze
                              ? "Waiting"
                              : "Off"
                      }
                    />
                  </div>
                  {hasInput ? (
                    <CopyButton
                      value={yamlInput}
                      label="Copy draft"
                      ariaLabel="Copy the current manifest draft"
                      showInlineFeedback
                    />
                  ) : null}
                </div>

                {uploadedFiles.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {uploadedFiles.map((file) => (
                      <Card
                        key={file.name}
                        className="bg-background-muted/30 shadow-none"
                      >
                        <CardContent className="grid gap-2 p-4">
                          <p className="text-foreground text-sm font-medium">
                            {file.name}
                          </p>
                          <p className="text-muted text-sm">
                            {formatBytes(file.sizeBytes)} - {file.documentCount}{" "}
                            {file.documentCount === 1
                              ? "document"
                              : "documents"}
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
                  textareaRef={fallbackTextareaRef}
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

                {hasInput || analysisStatus.phase === "analyzing" ? (
                  <div className="sticky bottom-3 z-10 md:hidden">
                    <div className="border-border bg-background/95 grid gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur">
                      <div className="space-y-1">
                        <p className="text-foreground text-sm font-medium">
                          {analysisStatus.phase === "analyzing"
                            ? analysisStatus.message
                            : "Analyze this draft locally"}
                        </p>
                        <p className="text-muted text-xs leading-5">
                          Static review only. Verify against your cluster
                          policies before deployment.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => void runAnalysis("manual")}
                        disabled={
                          !hasInput ||
                          hardLimitReached ||
                          analysisStatus.phase === "analyzing"
                        }
                        aria-label="Analyze the current draft from the mobile action bar"
                      >
                        {analysisStatus.phase === "analyzing" ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {analysisStatus.phase === "analyzing"
                          ? "Analyzing locally..."
                          : "Analyze current draft"}
                      </Button>
                    </div>
                  </div>
                ) : null}
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
                  <Select
                    value={selectedVersion}
                    onValueChange={setSelectedVersion}
                  >
                    <SelectTrigger aria-label="Select Kubernetes target version">
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
                    <SelectTrigger aria-label="Select analysis profile">
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
                    aria-label="Namespace filter"
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
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle>Results</CardTitle>
                    <CardDescription>
                      Real analyzer output, local parse feedback, and report
                      JSON for the current draft.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <label className="border-border bg-background-muted/40 flex items-center gap-3 rounded-2xl border px-3 py-2">
                      <span className="text-sm font-medium">
                        Redact visible output
                      </span>
                      <Switch
                        checked={redactVisibleOutput}
                        onCheckedChange={setRedactVisibleOutput}
                        aria-label="Toggle visible output redaction"
                      />
                    </label>
                    <K8sReportExportMenu
                      report={report}
                      redactVisibleOutput={redactVisibleOutput}
                    />
                  </div>
                </div>
                {analysisStatus.phase === "analyzing" ? (
                  <div className="space-y-3" aria-live="polite">
                    <div className="flex items-center gap-3 text-sm">
                      <LoaderCircle className="text-accent h-4 w-4 animate-spin" />
                      <span className="text-foreground">
                        {analysisStatus.message}
                      </span>
                    </div>
                    <Progress value={analysisStatus.progress} />
                  </div>
                ) : null}
                {analysisStatus.phase === "ready" ? (
                  <div
                    className="flex flex-wrap items-center gap-2 text-sm"
                    aria-live="polite"
                  >
                    <Badge variant="secondary">
                      {analysisStatus.trigger === "auto"
                        ? "Auto-analyzed"
                        : "Manual analysis"}
                    </Badge>
                    <Badge
                      variant={
                        analysisStatus.runtime === "worker" ? "info" : "warning"
                      }
                    >
                      {analysisStatus.runtime === "worker"
                        ? "Browser worker"
                        : "Main-thread fallback"}
                    </Badge>
                    <span className="text-foreground">
                      {analysisStatus.message}
                    </span>
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
                  redactVisibleOutput={redactVisibleOutput}
                  hasInput={hasInput}
                  isAnalyzing={analysisStatus.phase === "analyzing"}
                  analysisMessage={analysisStatus.message}
                  stale={resultsAreStale}
                  activeTab={activeResultsTab}
                  onActiveTabChange={setActiveResultsTab}
                  focusSearchRequestKey={focusSearchRequestKey}
                  focusResultsRequestKey={focusResultsRequestKey}
                  onAnalyzeCurrentDraft={() => void runAnalysis("manual")}
                  onFocusManifestInput={() => focusEditor()}
                  onLoadStarterSample={() =>
                    requestLoadExample(defaultK8sManifestExample, {
                      scrollToEditor: true,
                      focusEditor: true,
                    })
                  }
                />
              </CardContent>
            </Card>
          </div>
        </section>

        <K8sAnalyzerLandingContent
          onLoadExample={(example) =>
            requestLoadExample(example, {
              scrollToEditor: true,
              focusEditor: true,
            })
          }
        />
      </Container>

      <KeyboardShortcutsDialog
        open={shortcutHelpOpen}
        onOpenChange={setShortcutHelpOpen}
      />

      <Dialog
        open={pendingDestructiveAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDestructiveAction(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingDestructiveAction?.type === "clear-workspace"
                ? "Clear the current draft?"
                : "Replace the current draft with a sample?"}
            </DialogTitle>
            <DialogDescription>
              {pendingDestructiveAction?.type === "clear-workspace"
                ? "This removes the current manifest text and clears the last local report from the page."
                : "Loading a sample replaces the current manifest text in the editor. Use this when you want to reset to a known example."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 text-sm leading-6">
            <p>
              {pendingDestructiveAction?.type === "clear-workspace"
                ? "Clear all is treated as destructive enough to ask once before the page state is wiped."
                : "Sample loading is treated as destructive when it would overwrite a real draft."}
            </p>
            <p>
              Raw YAML is still local-only, but this action changes what is
              currently visible in the editor.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDestructiveAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={
                pendingDestructiveAction?.type === "clear-workspace"
                  ? "destructive"
                  : "default"
              }
              onClick={confirmPendingDestructiveAction}
            >
              {pendingDestructiveAction?.type === "clear-workspace"
                ? "Clear all"
                : "Replace with sample"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditorWorkspace({
  editorMode,
  MonacoEditor,
  resolvedTheme,
  softWrap,
  textareaRef,
  value,
  onChange,
  onMount,
  onRequestAnalyze,
}: {
  editorMode: "loading" | "monaco" | "fallback";
  MonacoEditor: ComponentType<MonacoEditorProps> | null;
  resolvedTheme: "light" | "dark";
  softWrap: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
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
      <div
        className="overflow-hidden rounded-3xl border"
        role="group"
        aria-label="Kubernetes manifest editor"
      >
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
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app`}
        aria-label="Kubernetes manifest editor"
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
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
      />
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
      role={tone === "warning" ? "alert" : "status"}
      aria-live="polite"
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

function createIdleAnalysisStatus(message?: string): AnalysisStatus {
  return {
    phase: "idle",
    message: message ?? "Paste YAML, upload files, or load a sample to begin.",
    progress: 0,
    trigger: null,
  };
}

function buildAnalysisSignature(
  source: string,
  kubernetesTargetVersion: string,
  profile: K8sAnalyzerProfileId,
  namespaceFilter: string,
) {
  return [
    source,
    kubernetesTargetVersion,
    profile,
    namespaceFilter.trim(),
  ].join("\u0000");
}

function buildAnalyzerOptions(
  kubernetesTargetVersion: string,
  profile: K8sAnalyzerProfileId,
  namespaceFilter: string,
): K8sAnalyzerOptions {
  const trimmedNamespaceFilter = namespaceFilter.trim();

  return {
    kubernetesTargetVersion,
    profile,
    ...(trimmedNamespaceFilter
      ? { namespaceFilter: trimmedNamespaceFilter }
      : {}),
  };
}

function buildHardLimitDescription(sizeBytes: number) {
  return `Input is too large for browser analysis. Split the bundle or use rendered output sections. This draft is ${formatBytes(sizeBytes)} and the browser-safe limit is ${formatBytes(BROWSER_ANALYSIS_HARD_MAX_BYTES)}.`;
}

function buildWorkerFallbackNotice(error: unknown): AnalyzerNotice {
  const detail =
    error instanceof K8sAnalyzerWorkerClientError ? error.message : null;

  return {
    tone: "warning",
    text: detail
      ? `The background worker could not continue (${detail}). This run fell back to direct local analysis in the main thread, so larger bundles may feel slower.`
      : "The background worker could not continue, so this run fell back to direct local analysis in the main thread. Larger bundles may feel slower in this browser session.",
  };
}

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }

  return target.closest(".monaco-editor") !== null;
}
