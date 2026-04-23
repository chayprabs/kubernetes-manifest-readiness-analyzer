import { describe, expect, it } from "vitest";
import { analyzeK8sManifests } from "@/lib/k8s/analyzer";
import {
  buildK8sCsvFindingsExport,
  buildK8sJsonExportObject,
  buildK8sMarkdownExport,
} from "@/lib/k8s/report-export";
import {
  fixedGeneratedAt,
  loadK8sFixture,
  normalizeMarkdownSnapshot,
} from "@/lib/k8s/__tests__/fixture-loader";

describe("Kubernetes export snapshots", () => {
  it("keeps the Markdown export stable for the broken production sample", () => {
    const report = analyzeK8sManifests(
      loadK8sFixture("missing-probes-resources.yaml"),
    );

    expect(
      normalizeMarkdownSnapshot(
        buildK8sMarkdownExport(report, {
          generatedAt: fixedGeneratedAt,
          maxFindings: 12,
        }),
      ),
    ).toMatchSnapshot();
  });

  it("keeps JSON export redaction stable for the secret fixture", () => {
    const report = analyzeK8sManifests(loadK8sFixture("secret-redaction.yaml"));
    const exported = buildK8sJsonExportObject(report, {
      generatedAt: fixedGeneratedAt,
      includeRawInput: true,
    });

    expect({
      exportMetadata: exported.exportMetadata,
      report: {
        headline: exported.report.headline,
        summary: exported.report.summary,
        canShareReportSafely: exported.report.canShareReportSafely,
        privacy: exported.report.privacy,
        analysisMetadata: {
          ...exported.report.analysisMetadata,
          parseMs: "<timing>",
          analyzeMs: "<timing>",
          totalMs: "<timing>",
        },
        parseResult: {
          ...exported.report.parseResult,
          documents: exported.report.parseResult.documents.map((document) => ({
            index: document.index,
            apiVersion: document.apiVersion,
            kind: document.kind,
            metadata: document.metadata,
          })),
        },
        findings: exported.report.findings.map((finding) => ({
          ruleId: finding.ruleId,
          severity: finding.severity,
          category: finding.category,
          title: finding.title,
          message: finding.message,
          recommendation: finding.recommendation,
          fix: finding.fix
            ? {
                type: finding.fix.type,
                title: finding.fix.title,
                copyableContent: finding.fix.copyableContent,
              }
            : undefined,
        })),
        rawInput: exported.report.rawInput,
      },
    }).toMatchSnapshot();
  });

  it("keeps CSV findings stable for the deprecated-api sample", () => {
    const report = analyzeK8sManifests(loadK8sFixture("deprecated-apis.yaml"), {
      kubernetesTargetVersion: "1.25",
    });

    expect(buildK8sCsvFindingsExport(report)).toMatchSnapshot();
  });
});
