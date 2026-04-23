import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const invalidYamlFixture = path.join(
  process.cwd(),
  "src",
  "lib",
  "k8s",
  "__fixtures__",
  "invalid-yaml.yaml",
);

test("analyzer loads a sample and produces findings", async ({ page }) => {
  await gotoAnalyzer(page);
  await loadStarterSample(page);
  await waitForAnalysisResults(page);

  await expect(
    page.getByRole("heading", { name: "Missing readiness probe" }),
  ).toBeVisible();
});

test("user can paste YAML and start analysis from the keyboard", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await gotoAnalyzer(page);

  const autoAnalyzeToggle = page.getByRole("switch", { name: "Auto-analyze" });
  await expect(autoAnalyzeToggle).toBeChecked();
  await autoAnalyzeToggle.click();
  await expect(autoAnalyzeToggle).not.toBeChecked();

  await page.evaluate(async (manifest) => {
    await navigator.clipboard.writeText(manifest);
  }, buildMissingProbeManifest());

  await page
    .getByRole("button", {
      name: "Paste Kubernetes YAML from the clipboard",
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Analyze the current Kubernetes manifest draft",
    }),
  ).toBeEnabled();

  await page
    .getByRole("button", {
      name: "Analyze the current Kubernetes manifest draft",
    })
    .focus();
  await page.keyboard.press("Enter");
  await waitForAnalysisResults(page);

  await expect(
    page.getByRole("heading", { name: "Missing readiness probe" }),
  ).toBeVisible();
});

test("user uploads invalid YAML and sees parse feedback", async ({ page }) => {
  await gotoAnalyzer(page);
  await manifestUploadInput(page).setInputFiles(invalidYamlFixture);
  await waitForAnalysisResults(page);

  await expect(
    page.getByText("Fix parse blockers before trusting runtime advice"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Parse feedback" }),
  ).toBeVisible();
  await expect(page.getByText(/Line \d+, column \d+/)).toBeVisible();
});

test("user can drag and drop YAML into the analyzer", async ({ page }) => {
  await gotoAnalyzer(page);
  await dropManifest(page, buildMissingProbeManifest());
  await waitForAnalysisResults(page);

  await expect(
    page.getByRole("heading", { name: "Missing readiness probe" }),
  ).toBeVisible();
});

test("large manifest drafts show the browser warning before the hard limit", async ({
  page,
}) => {
  await gotoAnalyzer(page);
  await manifestUploadInput(page).setInputFiles({
    name: "large-bundle.yaml",
    mimeType: "text/yaml",
    buffer: Buffer.from(buildLargeManifestBundle()),
  });

  await expect(page.getByText("Large manifest set")).toBeVisible();
  await expect(
    page.getByText("Auto-analyze paused for this draft"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Analyze the current Kubernetes manifest draft",
    }),
  ).toBeEnabled();
});

test("user can copy a Markdown report after analysis", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await gotoAnalyzer(page);
  await loadStarterSample(page);
  await waitForAnalysisResults(page);
  await expect(
    page.getByRole("heading", { name: "Missing readiness probe" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Open export report menu" }).click();
  await page.getByRole("menuitem", { name: "Copy Markdown" }).click();

  await expect(page.getByText("Markdown report copied.")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("# Kubernetes Manifest Review");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain("Missing readiness probe");
});

async function gotoAnalyzer(page: Page) {
  await page.goto("/tools/kubernetes-manifest-analyzer", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", {
      name: "Kubernetes Manifest Analyzer",
    }),
  ).toBeVisible();
  await waitForAnalyzerInteractivity(page);
}

async function loadStarterSample(page: Page) {
  await expect
    .poll(
      async () => {
        await page
          .getByRole("button", {
            name: "Reset to the starter sample manifest",
          })
          .click();

        return page
          .getByRole("button", {
            name: "Analyze the current Kubernetes manifest draft",
          })
          .isEnabled();
      },
      { timeout: 15000 },
    )
    .toBe(true);
}

function manifestUploadInput(page: Page) {
  return page.locator(
    'input[type="file"][accept=".yaml,.yml,.json,.txt"]',
  ).first();
}

async function waitForAnalyzerInteractivity(page: Page) {
  await expect
    .poll(
      async () => {
        await page
          .getByRole("button", {
            name: "Focus the Kubernetes manifest editor",
          })
          .click();

        return page.evaluate(() => {
          const activeElement = document.activeElement;

          if (!activeElement) {
            return false;
          }

          if (
            activeElement.getAttribute("aria-label") ===
            "Kubernetes manifest editor"
          ) {
            return true;
          }

          return (
            activeElement.closest?.(
              '[aria-label="Kubernetes manifest editor"]',
            ) !== null
          );
        });
      },
      { timeout: 15000 },
    )
    .toBe(true);
}

async function waitForAnalysisResults(page: Page) {
  await expect(
    page.getByRole("button", { name: "Open export report menu" }),
  ).toBeEnabled({
    timeout: 15000,
  });
  await expect(
    page.getByRole("region", { name: "Analysis results" }),
  ).toBeVisible({
    timeout: 15000,
  });
}

async function dropManifest(page: Page, manifest: string) {
  const dataTransfer = await page.evaluateHandle(({ manifestText, name }) => {
    const transfer = new DataTransfer();
    const file = new File([manifestText], name, {
      type: "text/yaml",
    });

    transfer.items.add(file);
    return transfer;
  }, {
    manifestText: manifest,
    name: "dropped-manifest.yaml",
  });

  await page
    .locator('label[role="button"]')
    .filter({ hasText: "Drag and drop YAML files" })
    .first()
    .dispatchEvent("drop", { dataTransfer });
}

function buildMissingProbeManifest() {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-api
  namespace: apps
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: checkout-api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: checkout-api
    spec:
      containers:
        - name: api
          image: ghcr.io/example/checkout-api:latest
          ports:
            - name: http
              containerPort: 8080`;
}

function buildLargeManifestBundle() {
  const block = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: perf-app-INDEX
  namespace: perf
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: perf-app-INDEX
  template:
    metadata:
      labels:
        app.kubernetes.io/name: perf-app-INDEX
    spec:
      containers:
        - name: api
          image: ghcr.io/example/perf-app:latest
          ports:
            - name: http
              containerPort: 8080`;
  const targetBytes = Math.ceil(2.3 * 1024 * 1024);
  const documents: string[] = [];
  let index = 1;

  while (Buffer.byteLength(documents.join("\n---\n"), "utf8") < targetBytes) {
    documents.push(block.replaceAll("INDEX", String(index)));
    index += 1;
  }

  return documents.join("\n---\n");
}
