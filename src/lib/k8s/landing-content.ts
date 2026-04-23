export const kubernetesManifestAnalyzerPath =
  "/tools/kubernetes-manifest-analyzer";

export const kubernetesManifestAnalyzerTitle =
  "Kubernetes Manifest Analyzer - Production Readiness YAML Checker | Authos";

export const kubernetesManifestAnalyzerMetaDescription =
  "Analyze Kubernetes YAML locally for probes, resource limits, security context, service selectors, exposure risks, and readiness gaps before production deploys.";

export const kubernetesManifestAnalyzerH1 = "Kubernetes Manifest Analyzer";

export const kubernetesManifestAnalyzerKeywords = [
  "Kubernetes manifest analyzer",
  "Kubernetes YAML checker",
  "Kubernetes production readiness",
  "Kubernetes linter online",
  "Kubernetes security context checker",
  "Kubernetes probes checker",
  "Kubernetes resource limits checker",
  "Kubernetes service selector checker",
];

export const kubernetesManifestAnalyzerFeatureList = [
  "Analyzes pasted or uploaded Kubernetes YAML locally in the browser",
  "Checks production-readiness signals such as probes, resource requests, and resource limits",
  "Reviews security context hardening such as non-root execution and privilege escalation settings",
  "Highlights service selector mismatches, exposure risks, and TLS or ingress concerns",
  "Provides remediation guidance with suggested patches and review notes",
] as const;

export const k8sAnalyzerFaqs = [
  {
    question: "Is this a Kubernetes YAML validator?",
    answer:
      "It is a Kubernetes manifest checker and production-readiness reviewer, not a full server-side schema validator. It parses YAML and looks for reliability, security, networking, and operational risks that basic syntax validation misses.",
  },
  {
    question: "Does this upload my manifests?",
    answer:
      "No. Analysis runs in your browser, no manifest upload is required, and exports exclude raw YAML by default unless you explicitly choose otherwise.",
  },
  {
    question: "Can this replace kube-score, Polaris, or KubeLinter?",
    answer:
      "No. It is best used as a fast local review tool with clear remediation guidance. CLI and CI tools such as kube-score, Polaris, or KubeLinter are still useful for pipeline enforcement and broader policy coverage.",
  },
  {
    question: "Does it support Helm or Kustomize?",
    answer:
      "It analyzes rendered YAML from Helm, Kustomize, or any other source that produces Kubernetes manifests. It does not render charts or overlays for you inside this page.",
  },
  {
    question: "What Kubernetes versions does it check?",
    answer:
      "The analyzer checks against the Kubernetes target version you choose in the page settings, so deprecation and compatibility guidance can match the version you are preparing to deploy.",
  },
  {
    question: "Can I use this in CI?",
    answer:
      "Not directly from this browser page. The current experience is optimized for interactive local review, triage, and remediation before you commit or hand the manifest off to CI.",
  },
  {
    question: "Does it check Pod Security Standards?",
    answer:
      "It checks several runtime hardening signals related to Pod Security Standards, such as non-root execution, privilege escalation, seccomp, and service account token handling, but it is not a complete Pod Security Standards implementation.",
  },
  {
    question: "Why does it warn about missing resource requests?",
    answer:
      "Missing requests make scheduling less predictable, make capacity planning harder, and can increase the chance of noisy-neighbor behavior or eviction pressure. The warning is there to help teams set deliberate baseline resources instead of relying on cluster defaults.",
  },
] as const;

export const k8sAnalyzerComingSoonTools = [
  {
    title: "Kubernetes Helm Values Checker",
    description:
      "Planned for reviewing risky or incomplete Helm values before chart rendering and release promotion.",
    href: "/tools#coming-soon",
  },
  {
    title: "Kustomize Output Diff Reviewer",
    description:
      "Planned for comparing rendered Kustomize output between overlays without claiming live cluster drift analysis.",
    href: "/tools#coming-soon",
  },
  {
    title: "NetworkPolicy Builder and Reviewer",
    description:
      "Planned for helping teams review allowlists carefully, with strong warnings around default-deny traffic breakage.",
    href: "/tools#coming-soon",
  },
] as const;
