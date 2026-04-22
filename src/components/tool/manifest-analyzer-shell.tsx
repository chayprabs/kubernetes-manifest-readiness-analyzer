"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import {
  defaultManifestExample,
  faqItems,
  kubernetesVersions,
  manifestExamples,
  manifestProfiles,
  relatedKubernetesToolPlaceholders,
} from "@/lib/k8s/manifest-analyzer-content";
import { cn } from "@/lib/utils";
import { Container } from "@/components/layout/container";
import { CopyButton } from "@/components/tool/copy-button";
import { EmptyState } from "@/components/tool/empty-state";
import { FileDropzone } from "@/components/tool/file-dropzone";
import { KeyboardShortcutHint } from "@/components/tool/keyboard-shortcut-hint";
import { LocalOnlyNotice } from "@/components/tool/local-only-notice";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Notice = {
  tone: "default" | "success";
  text: string;
};

export function ManifestAnalyzerShell() {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [yamlInput, setYamlInput] = useState("");
  const [selectedVersion, setSelectedVersion] =
    useState<(typeof kubernetesVersions)[number]>("1.30");
  const [selectedProfile, setSelectedProfile] =
    useState<(typeof manifestProfiles)[number]>("Balanced");
  const [namespaceFilter, setNamespaceFilter] = useState("");
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [selectedSampleLabel, setSelectedSampleLabel] =
    useState("Select sample");
  const [notice, setNotice] = useState<Notice | null>(null);

  const hasYaml = yamlInput.trim().length > 0;

  function focusEditor() {
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      editorRef.current?.focus();
    }, 120);
  }

  function loadSample(exampleId: string) {
    const example =
      manifestExamples.find((item) => item.id === exampleId) ??
      defaultManifestExample;

    setYamlInput(example.manifest);
    setSelectedSampleLabel(example.title);
    setNotice({
      tone: "success",
      text: `${example.title} loaded into the editor. The analysis engine is the next step, but the full workspace is now ready for it.`,
    });
    focusEditor();
  }

  async function handlePasteYaml() {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText.trim()) {
        setNotice({
          tone: "default",
          text: "Clipboard is empty. Copy a manifest first, then use Paste YAML again.",
        });
        return;
      }

      setYamlInput(clipboardText);
      setNotice({
        tone: "success",
        text: "Clipboard contents loaded locally into the editor.",
      });
      focusEditor();
    } catch {
      setNotice({
        tone: "default",
        text: "Paste YAML is ready, but this browser blocked clipboard access. You can still paste directly into the editor.",
      });
      focusEditor();
    }
  }

  function handleClear() {
    setYamlInput("");
    setSelectedSampleLabel("Select sample");
    setNotice({
      tone: "default",
      text: "Editor cleared. Paste YAML, upload a file, or load a sample manifest to continue.",
    });
    focusEditor();
  }

  function handleAnalyzePlaceholder() {
    setNotice({
      tone: "default",
      text: "TODO: connect manifest parsing, scoring, findings, and copyable fixes to this workspace. The page shell and controls are now in place.",
    });
  }

  async function handleUploadedFile(file: File) {
    const text = await file.text();
    setYamlInput(text);
    setSelectedSampleLabel(file.name);
    setNotice({
      tone: "success",
      text: `${file.name} loaded locally. Report generation and findings will connect to this editor next.`,
    });
    focusEditor();
  }

  const howToUseSteps = useMemo(
    () => [
      "Paste YAML, upload a local file, or load one of the sample manifests to stage content in the editor.",
      "Choose a Kubernetes version and review profile so the future analyzer can score your manifest against the context you care about.",
      "Use Analyze when the rules engine lands to populate the scorecard, risky findings, and copyable fix guidance.",
      "Copy or download the final report once result generation is wired into the output workspace.",
    ],
    [],
  );

  return (
    <div className="space-y-14">
      <Container size="workspace" className="space-y-6">
        <Card>
          <CardContent className="grid gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="space-y-6">
              <Badge variant="info">Runs locally in your browser.</Badge>
              <div className="space-y-4">
                <h1 className="text-foreground text-4xl font-semibold sm:text-5xl">
                  Kubernetes Manifest Production-Readiness Analyzer
                </h1>
                <p className="text-muted max-w-3xl text-lg leading-8">
                  Paste Kubernetes YAML and get a production-readiness score,
                  risky manifest findings, and copyable fixes before you deploy.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" onClick={focusEditor}>
                  Analyze YAML
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => loadSample(defaultManifestExample.id)}
                >
                  Load sample manifest.
                </Button>
              </div>
            </div>

            <Card className="bg-background-muted/50 shadow-none">
              <CardHeader>
                <CardTitle>What this shell is ready for</CardTitle>
                <CardDescription>
                  The page layout is already structured like a serious review
                  tool: input on the left, settings and report space on the
                  right, with privacy messaging close to the workflow.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="border-border bg-card rounded-2xl border p-4">
                  <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                    Workspace
                  </p>
                  <p className="text-foreground mt-2 text-sm leading-6">
                    Input staging, report actions, and responsive review panels.
                  </p>
                </div>
                <div className="border-border bg-card rounded-2xl border p-4">
                  <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                    Trust
                  </p>
                  <p className="text-foreground mt-2 text-sm leading-6">
                    Local-first messaging is visible before users paste
                    production manifests into the tool.
                  </p>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        <LocalOnlyNotice />

        {notice ? (
          <div
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm leading-6",
              notice.tone === "success"
                ? "border-success/30 bg-success/10 text-foreground"
                : "border-info/30 bg-info/10 text-foreground",
            )}
          >
            {notice.text}
          </div>
        ) : null}

        <section
          aria-labelledby="manifest-workspace"
          className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]"
        >
          <div className="space-y-6">
            <Card>
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle id="manifest-workspace">
                      Input workspace
                    </CardTitle>
                    <CardDescription>
                      Stage YAML locally before the scoring and findings engine
                      is connected.
                    </CardDescription>
                  </div>
                  <KeyboardShortcutHint keys={["Ctrl", "Enter"]} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePasteYaml}
                  >
                    Paste YAML
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload YAML
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline">
                        Load sample dropdown
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Sample manifests</DropdownMenuLabel>
                      {manifestExamples.map((example) => (
                        <DropdownMenuItem
                          key={example.id}
                          onClick={() => loadSample(example.id)}
                        >
                          {example.title}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClear}
                    disabled={!hasYaml}
                  >
                    Clear
                  </Button>
                  <Button type="button" onClick={handleAnalyzePlaceholder}>
                    Analyze button
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".yaml,.yml,.json,.txt"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (!file) {
                      return;
                    }

                    void handleUploadedFile(file);
                    event.target.value = "";
                  }}
                />

                <div className="border-border bg-background-muted/40 rounded-2xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                        Current draft
                      </p>
                      <p className="text-foreground text-sm">
                        {selectedSampleLabel}
                      </p>
                    </div>
                    {hasYaml ? <CopyButton value={yamlInput} /> : null}
                  </div>
                </div>

                <Textarea
                  id="manifest-input"
                  ref={editorRef}
                  value={yamlInput}
                  onChange={(event) => setYamlInput(event.target.value)}
                  placeholder={`apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-app`}
                  aria-label="Kubernetes manifest editor"
                />

                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div>
                    <p className="text-muted text-sm leading-6">
                      The real analyzer will read from this editor and populate
                      the scorecard, risky findings, and report actions on the
                      right-hand side.
                    </p>
                  </div>
                  <FileDropzone
                    title="Drag a YAML file here"
                    description="Local upload only. This is already wired to load file contents into the editor."
                    onTextLoaded={({ text, file }) => {
                      setYamlInput(text);
                      setSelectedSampleLabel(file.name);
                      setNotice({
                        tone: "success",
                        text: `${file.name} dropped into the workspace and loaded locally.`,
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>
                  These controls are visible now so the real analyzer logic can
                  slot in without reworking the page shell.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                    Kubernetes version selector
                  </label>
                  <Select
                    value={selectedVersion}
                    onValueChange={(value) =>
                      setSelectedVersion(
                        value as (typeof kubernetesVersions)[number],
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {kubernetesVersions.map((version) => (
                        <SelectItem key={version} value={version}>
                          Kubernetes {version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <label className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                    Profile selector
                  </label>
                  <Select
                    value={selectedProfile}
                    onValueChange={(value) =>
                      setSelectedProfile(
                        value as (typeof manifestProfiles)[number],
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {manifestProfiles.map((profile) => (
                        <SelectItem key={profile} value={profile}>
                          {profile}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <label className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                    Namespace filter placeholder
                  </label>
                  <Input
                    value={namespaceFilter}
                    onChange={(event) => setNamespaceFilter(event.target.value)}
                    placeholder="e.g. payments"
                  />
                  <p className="text-muted text-xs leading-5">
                    Reserved for future scoped analysis across multi-document
                    manifest bundles.
                  </p>
                </div>

                <label className="border-border bg-background-muted/40 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-foreground text-sm font-medium">
                      Auto-analyze toggle
                    </p>
                    <p className="text-muted text-xs leading-5">
                      This will automatically rerun checks once the analysis
                      engine is connected.
                    </p>
                  </div>
                  <Switch
                    checked={autoAnalyze}
                    onCheckedChange={setAutoAnalyze}
                    aria-label="Toggle auto analyze"
                  />
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle>Results workspace</CardTitle>
                    <CardDescription>
                      Scorecard, findings, and copyable fixes will appear here
                      after the analyzer logic is implemented.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" disabled>
                      Copy report button
                    </Button>
                    <Button type="button" variant="outline" disabled>
                      Download report button
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-6">
                <EmptyState
                  title="Your scorecard will appear here"
                  description="Paste YAML, upload a manifest, or load a sample to prepare the input side. The right-hand side is intentionally honest about being a placeholder until scoring and findings are connected."
                  icon={<Sparkles className="h-5 w-5" />}
                />

                <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="border-border bg-background-muted/40 rounded-2xl border border-dashed p-4">
                    <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                      Scorecard empty state
                    </p>
                    <div className="mt-4 flex items-center gap-4">
                      <Skeleton className="h-20 w-20 rounded-full" />
                      <div className="grid flex-1 gap-3">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  </div>
                  <div className="border-border bg-background-muted/40 rounded-2xl border border-dashed p-4">
                    <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                      Findings placeholder
                    </p>
                    <div className="mt-4 grid gap-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                </div>

                <div className="border-border bg-background-muted/40 rounded-2xl border border-dashed p-4">
                  <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                    Planned report structure
                  </p>
                  <p className="text-muted mt-3 text-sm leading-6">
                    The completed tool will use this area for summary scoring,
                    grouped findings, actionable fix text, and exportable report
                    actions for review workflows.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </Container>

      <Container size="page" className="space-y-12">
        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">
              What this Kubernetes analyzer checks
            </p>
            <h2 className="text-foreground text-3xl font-semibold">
              What this Kubernetes analyzer checks
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              "Health checks such as readiness, liveness, and startup probes.",
              "Resource requests and limits that affect scheduling and cluster stability.",
              "Security context defaults such as non-root execution and privilege boundaries.",
              "Service exposure choices like LoadBalancer, ingress shape, and network-risk review cues.",
              "Image tagging, deterministic rollout posture, and safer runtime defaults.",
              "Configuration gaps that commonly turn into noisy deploys or hard-to-debug incidents.",
            ].map((item) => (
              <Card key={item}>
                <CardContent className="text-muted p-5 text-sm leading-6">
                  {item}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">
              Common Kubernetes production-readiness problems
            </p>
            <h2 className="text-foreground text-3xl font-semibold">
              Common Kubernetes production-readiness problems
            </h2>
          </div>
          <div className="grid gap-4">
            {[
              "Workloads that roll out without probes often look healthy to Kubernetes long before the application is ready for traffic.",
              "Missing requests and limits make it difficult to reason about cluster capacity, noisy-neighbor behavior, and pod eviction pressure.",
              "Public exposure through a LoadBalancer or overly permissive ingress path can turn a simple service manifest into an unintended internet-facing surface.",
              "Security context drift, especially root execution or privilege escalation, creates risk that is easy to miss during a rushed deployment review.",
            ].map((paragraph) => (
              <Card key={paragraph}>
                <CardContent className="text-muted p-5 text-sm leading-7">
                  {paragraph}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">
              How to use this tool
            </p>
            <h2 className="text-foreground text-3xl font-semibold">
              How to use this tool
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {howToUseSteps.map((step, index) => (
              <Card key={step}>
                <CardHeader>
                  <Badge variant="secondary">Step {index + 1}</Badge>
                  <CardDescription>{step}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">
              Privacy and local processing
            </p>
            <h2 className="text-foreground text-3xl font-semibold">
              Privacy and local processing
            </h2>
          </div>
          <Card>
            <CardContent className="text-muted grid gap-4 p-6 text-sm leading-7">
              <p>
                Authos is approaching this tool as a browser-first workflow
                because Kubernetes manifests often contain deployment details
                teams do not want to send to a remote service by default.
              </p>
              <p>
                The current page shell already keeps upload and paste flows
                local to the browser. As the real analyzer logic lands, the same
                trust boundary should stay visible near the editor and report
                surface, not hidden only in supporting pages.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">
              FAQ
            </p>
            <h2 className="text-foreground text-3xl font-semibold">FAQ</h2>
          </div>
          <div className="grid gap-4">
            {faqItems.map((item) => (
              <Card key={item.question}>
                <CardHeader>
                  <CardTitle className="text-xl">{item.question}</CardTitle>
                  <CardDescription>{item.answer}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">
              Examples
            </p>
            <h2 className="text-foreground text-3xl font-semibold">
              Example manifests to test in this workspace
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {manifestExamples.map((example) => (
              <Card key={example.id}>
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <CardTitle>{example.title}</CardTitle>
                      <CardDescription>{example.summary}</CardDescription>
                    </div>
                    <CopyButton value={example.manifest} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <pre className="overflow-x-auto rounded-2xl bg-[#0b1324] p-4 text-sm leading-7 text-slate-100">
                    <code>{example.manifest}</code>
                  </pre>
                  <div className="border-border bg-background-muted/40 rounded-2xl border p-4">
                    <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                      Planned analyzer callout
                    </p>
                    <p className="text-foreground mt-2 text-sm leading-6">
                      {example.plannedOutcome}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">
              Related tools
            </p>
            <h2 className="text-foreground text-3xl font-semibold">
              Related Kubernetes workflows planned for Authos
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {relatedKubernetesToolPlaceholders.map((item) => (
              <Card key={item.name}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-xl">{item.name}</CardTitle>
                    <Badge variant="secondary">Coming soon</Badge>
                  </div>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </Container>
    </div>
  );
}
