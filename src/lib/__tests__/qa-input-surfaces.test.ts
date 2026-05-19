import { describe, expect, it } from "vitest";
import { analyzeHelmValues } from "@/lib/helm/analyzer";
import { parseHelmValuesYaml } from "@/lib/helm/parser";
import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import {
  RECOMMENDED_MAX_PASTE_BYTES,
  getInputSizeBytes,
} from "@/lib/k8s/errors";
import { parseK8sYaml } from "@/lib/k8s/parser";
import { getK8sAnalyzerProfile, resolveAnalyzerOptions } from "@/lib/k8s/profiles";
import { normalizeKubernetesVersion } from "@/lib/k8s/deprecations";
import { compareKustomizeOutputs } from "@/lib/kustomize-diff/differ";
import { analyzeNetworkPolicies } from "@/lib/netpol-review/analyzer";

describe("QA input surfaces — Helm values checker", () => {
  it("rejects non-mapping root YAML (array)", () => {
    const parsed = parseHelmValuesYaml("- item\n- two");
    expect(parsed.ok).toBe(false);
    expect(parsed.errors[0]).toContain("mapping");
  });

  it("rejects invalid YAML syntax", () => {
    const parsed = parseHelmValuesYaml("replicaCount: [\n");
    expect(parsed.ok).toBe(false);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });

  it("returns guided empty state for whitespace-only input", () => {
    const report = analyzeHelmValues("\n\t  ");
    expect(report.ok).toBe(true);
    expect(report.findings).toEqual([]);
    expect(report.message).toContain("Paste Helm values");
  });

  it("returns parse-blocked report when YAML cannot be parsed", () => {
    const report = analyzeHelmValues("image:\n  tag: [");
    expect(report.ok).toBe(false);
    expect(report.findings).toEqual([]);
    expect(report.message).toContain("parse errors");
  });
});

describe("QA input surfaces — NetworkPolicy reviewer", () => {
  it("returns parse-blocked report for invalid YAML", () => {
    const report = analyzeNetworkPolicies("kind: NetworkPolicy\n  bad:");
    expect(report.ok).toBe(false);
    expect(report.findings).toEqual([]);
    expect(report.message).toContain("parse errors");
  });

  it("returns empty-bundle guidance when no NetworkPolicy documents exist", () => {
    const report = analyzeNetworkPolicies(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 1`);
    expect(report.ok).toBe(true);
    expect(report.findings).toEqual([]);
    expect(report.message).toContain("No NetworkPolicy");
  });

  it("accepts unicode policy names and namespaces", () => {
    const report = analyzeNetworkPolicies(`apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress-日本
  namespace: team-α
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - {}
`);
    expect(report.resources).toHaveLength(1);
    expect(report.resources[0]?.name).toBe("allow-egress-日本");
    expect(report.resources[0]?.namespace).toBe("team-α");
    expect(report.findings.map((finding) => finding.ruleId)).toContain(
      "egress-wide-open",
    );
  });
});

describe("QA input surfaces — Kustomize diff", () => {
  const validDoc = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: apps
spec:
  replicas: 1
`;

  it("blocks comparison when left side has parse errors", () => {
    const report = compareKustomizeOutputs("not: [valid", validDoc);
    expect(report.ok).toBe(false);
    expect(report.parseErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ side: "left" })]),
    );
    expect(report.added).toEqual([]);
    expect(report.changed).toEqual([]);
  });

  it("blocks comparison when right side has parse errors", () => {
    const report = compareKustomizeOutputs(validDoc, "{{");
    expect(report.ok).toBe(false);
    expect(report.parseErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ side: "right" })]),
    );
  });

  it("returns successful empty diff for two identical valid bundles", () => {
    const report = compareKustomizeOutputs(validDoc, validDoc);
    expect(report.ok).toBe(true);
    expect(report.added).toEqual([]);
    expect(report.removed).toEqual([]);
    expect(report.changed).toEqual([]);
  });

  it("handles empty left and right without throwing", () => {
    const report = compareKustomizeOutputs("", "");
    expect(report.ok).toBe(true);
    expect(report.leftDocumentCount).toBe(0);
    expect(report.rightDocumentCount).toBe(0);
  });
});

describe("QA input surfaces — Kubernetes manifest analyzer", () => {
  it("coerces non-string raw input via parser", () => {
    const result = parseK8sYaml(123 as unknown as string);
    expect(result.input.raw).toBe("123");
  });

  it("warns but still parses input above recommended paste size", () => {
    const large = "x".repeat(RECOMMENDED_MAX_PASTE_BYTES + 1);
    const result = parseK8sYaml(large);
    expect(result.warnings.some((w) => w.code === "input-too-large")).toBe(true);
    expect(getInputSizeBytes(large)).toBeGreaterThan(RECOMMENDED_MAX_PASTE_BYTES);
  });

  it("falls back to balanced profile for unknown profile ids", () => {
    const profile = getK8sAnalyzerProfile(
      "not-a-real-profile" as "balanced",
    );
    expect(profile.id).toBe("balanced");
    const { profile: resolved } = resolveAnalyzerOptions({
      profile: "not-a-real-profile" as "balanced",
    });
    expect(resolved.id).toBe("balanced");
  });

  it("filters findings to namespaceFilter when set", () => {
    const manifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: team-a-api
  namespace: team-a
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: demo:latest
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: team-b-api
  namespace: team-b
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: demo:latest`;

    const unfiltered = analyzeK8sManifests(manifest);
    const filtered = analyzeK8sManifests(manifest, {
      namespaceFilter: "team-a",
    });

    expect(filtered.findings.length).toBeLessThanOrEqual(unfiltered.findings.length);
    for (const finding of filtered.findings) {
      if (finding.resourceRef.namespace !== undefined) {
        expect(finding.resourceRef.namespace).toBe("team-a");
      }
    }
  });

  it("normalizes kubernetes target versions for deprecation checks", () => {
    expect(normalizeKubernetesVersion("v1.30")).toBeUndefined();
    expect(normalizeKubernetesVersion("1.30")).toBe("1.30");
    expect(normalizeKubernetesVersion("01.08")).toBe("1.8");
  });
});
