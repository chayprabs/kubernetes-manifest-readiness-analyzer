import { describe, expect, it } from "vitest";
import { createFinding } from "@/lib/k8s/findings";
import {
  buildDisplayFixSnippet,
  buildFixBuckets,
  buildSafeCopyFixBundle,
  getFixCustomizationWarnings,
} from "@/lib/k8s/fix-checklist";
import type {
  K8sFinding,
  K8sFixSuggestion,
  K8sObjectRef,
} from "@/lib/k8s/types";

describe("Kubernetes fix checklist utilities", () => {
  it("groups copyable fixes by category and resource, and separates manual-only fixes", () => {
    const findings = [
      makeFinding({
        id: "probe",
        ruleId: "missing-readiness-probe",
        title: "Missing readiness probe",
        category: "reliability",
        severity: "high",
        resourceRef: makeResourceRef("Deployment", "worker", "prod"),
        fix: makeYamlFix(
          "Add a readiness probe template",
          "readinessProbe:\n  httpGet:\n    path: /readyz",
        ),
      }),
      makeFinding({
        id: "namespace",
        ruleId: "missing-namespace",
        title: "Missing namespace",
        category: "operations",
        severity: "low",
        resourceRef: makeResourceRef("Deployment", "api", "prod"),
        fix: makeYamlFix(
          "Add namespace",
          "metadata:\n  namespace: your-namespace",
        ),
      }),
      makeFinding({
        id: "owner",
        ruleId: "missing-owner-team-annotations",
        title: "Missing owner metadata",
        category: "operations",
        severity: "low",
        resourceRef: makeResourceRef("Deployment", "api", "prod"),
        fix: makeYamlFix(
          "Add owner metadata",
          "metadata:\n  annotations:\n    owner: platform-team",
        ),
      }),
      makeFinding({
        id: "selector",
        ruleId: "service-selector-matches-nothing",
        title: "Service selector needs manual review",
        category: "networking",
        severity: "medium",
        resourceRef: makeResourceRef("Service", "api", "prod"),
        fix: {
          type: "manual-instruction",
          title: "Review the Service selector manually",
          summary: "Review the Service selector manually",
          instructions:
            "Compare spec.selector with the intended workload labels and update it manually.",
          riskNote:
            "A wrong selector can send traffic to the wrong pods or to no pods at all.",
          safeToAutoApply: false,
          yamlPath: "spec.selector",
        },
      }),
    ] satisfies K8sFinding[];

    const [safeCopyBucket, manualReviewBucket] = buildFixBuckets(findings);

    expect(safeCopyBucket.count).toBe(3);
    expect(safeCopyBucket.categories.map((group) => group.category)).toEqual([
      "reliability",
      "operations",
    ]);
    expect(safeCopyBucket.categories[1]?.resources).toHaveLength(1);
    expect(safeCopyBucket.categories[1]?.resources[0]?.count).toBe(2);
    expect(
      safeCopyBucket.categories[1]?.resources[0]?.findings.map(
        (finding) => finding.id,
      ),
    ).toEqual(["namespace", "owner"]);

    expect(manualReviewBucket.count).toBe(1);
    expect(manualReviewBucket.categories[0]?.category).toBe("networking");
    expect(
      manualReviewBucket.categories[0]?.resources[0]?.findings[0]?.id,
    ).toBe("selector");
  });

  it("builds the safe copy bundle without manual-only fixes", () => {
    const safeFinding = makeFinding({
      id: "safe",
      ruleId: "missing-owner-team-annotations",
      title: "Missing owner metadata",
      category: "operations",
      severity: "low",
      resourceRef: makeResourceRef("Deployment", "api", "prod"),
      fix: makeYamlFix(
        "Add owner metadata",
        "metadata:\n  annotations:\n    owner: platform-team",
      ),
    });
    const manualFinding = makeFinding({
      id: "manual",
      ruleId: "service-selector-matches-nothing",
      title: "Service selector needs manual review",
      category: "networking",
      severity: "medium",
      resourceRef: makeResourceRef("Service", "api", "prod"),
      fix: {
        type: "manual-instruction",
        title: "Review the Service selector manually",
        summary: "Review the Service selector manually",
        instructions:
          "Compare spec.selector with the intended workload labels and update it manually.",
        riskNote:
          "A wrong selector can send traffic to the wrong pods or to no pods at all.",
        safeToAutoApply: false,
        yamlPath: "spec.selector",
      },
    });

    const bundle = buildSafeCopyFixBundle([safeFinding, manualFinding]);

    expect(bundle).toContain("Add owner metadata");
    expect(bundle).toContain("platform-team");
    expect(bundle).not.toContain("Review the Service selector manually");
  });

  it("creates a comment-only snippet for manual review fixes without copyable content", () => {
    const fix: K8sFixSuggestion = {
      type: "manual-instruction",
      title: "Review the Service selector manually",
      summary: "Review the Service selector manually",
      instructions:
        "Compare spec.selector with the intended workload labels and update it manually.",
      riskNote:
        "A wrong selector can send traffic to the wrong pods or to no pods at all.",
      safeToAutoApply: false,
      yamlPath: "spec.selector",
    };

    expect(buildDisplayFixSnippet(fix)).toBe(
      [
        "# Manual review required",
        "# Review the Service selector manually",
        "# Compare spec.selector with the intended workload labels and update it manually.",
        "# Risk note: A wrong selector can send traffic to the wrong pods or to no pods at all.",
      ].join("\n"),
    );
  });

  it("surfaces customization warnings for default-deny templates", () => {
    const finding = makeFinding({
      id: "networkpolicy",
      ruleId: "networkpolicy-absent-for-namespace",
      title: "Namespace has no NetworkPolicy",
      category: "networking",
      severity: "low",
      resourceRef: makeResourceRef("Deployment", "api", "prod"),
      fix: makeYamlFix(
        "Start with a minimal default-deny policy and stage explicit allow rules carefully.",
        [
          "apiVersion: networking.k8s.io/v1",
          "kind: NetworkPolicy",
          "metadata:",
          "  name: default-deny",
          "spec:",
          "  podSelector: {}",
        ].join("\n"),
      ),
    });

    expect(getFixCustomizationWarnings(finding)).toContain(
      "A default-deny NetworkPolicy can break ingress or egress immediately. Stage explicit allow rules before rollout.",
    );
  });
});

function makeFinding({
  id,
  ruleId = id,
  title,
  category,
  severity,
  resourceRef,
  fix,
}: {
  id: string;
  ruleId?: string;
  title: string;
  category: K8sFinding["category"];
  severity: K8sFinding["severity"];
  resourceRef: K8sObjectRef;
  fix: K8sFixSuggestion;
}) {
  return createFinding({
    id,
    ruleId,
    title,
    message: `${title} message`,
    severity,
    category,
    resourceRef,
    whyItMatters: `${title} matters`,
    recommendation: `${title} recommendation`,
    fix,
  });
}

function makeResourceRef(
  kind: string,
  name: string,
  namespace: string | undefined,
): K8sObjectRef {
  return {
    documentIndex: 0,
    apiVersion: "apps/v1",
    kind,
    name,
    namespace,
  };
}

function makeYamlFix(title: string, copyableContent: string): K8sFixSuggestion {
  return {
    type: "yaml-snippet",
    title,
    summary: title,
    riskNote: "Review before applying.",
    safeToAutoApply: false,
    yamlPath: "spec",
    copyableContent,
  };
}
