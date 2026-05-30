import { expect, type Page } from "@playwright/test";

export async function gotoAnalyzer(page: Page) {
  await page.goto("/", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("tab", { name: "K8s Analyzer" })).toBeVisible({
    timeout: 60_000,
  });
  await waitForAnalyzerInteractivity(page);
}

export async function loadStarterSample(page: Page) {
  await page.getByRole("button", { name: "Open sample manifest menu" }).click();
  await page.getByRole("menuitem").first().click();

  await expect(
    page.getByRole("button", {
      name: "Analyze the current Kubernetes manifest draft",
    }),
  ).toBeEnabled({ timeout: 60_000 });
}

export function manifestUploadInput(page: Page) {
  return page
    .locator('input[type="file"][accept=".yaml,.yml,.json,.txt"]')
    .first();
}

async function waitForAnalyzerInteractivity(page: Page) {
  await expect(page.getByText("Manifest input")).toBeVisible({
    timeout: 120_000,
  });
  await expect(
    page.getByRole("button", { name: "Open sample manifest menu" }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("button", {
      name: "Analyze the current Kubernetes manifest draft",
    }),
  ).toBeVisible({ timeout: 60_000 });
}

export async function waitForAnalysisResults(page: Page) {
  await expect(
    page.getByRole("button", { name: "Open export report menu" }),
  ).toBeEnabled({
    timeout: 60_000,
  });
  await expect(
    page.getByRole("region", { name: "Analysis results" }),
  ).toBeVisible({
    timeout: 60_000,
  });
}
