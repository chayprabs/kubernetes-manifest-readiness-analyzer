import { expect, test } from "@playwright/test";

test("home page renders the tool workspace", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });

  await expect(page.getByRole("link", { name: "K8s Readiness" })).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "K8s Analyzer" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Product summary" }),
  ).toBeVisible();
});

test("home page can switch to Helm values checker tab", async ({ page }) => {
  await page.goto("/?tool=helm-values-checker", { waitUntil: "load" });
  await expect(page.getByRole("tab", { name: "Helm Values" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Analyze values" }),
  ).toBeVisible();
});

test("privacy page renders without errors", async ({ page }) => {
  await page.goto("/privacy", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /privacy/i }),
  ).toBeVisible();
});

test("terms page renders without errors", async ({ page }) => {
  await page.goto("/terms", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /terms/i }),
  ).toBeVisible();
});

test("external links are present in the header", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await expect(
    page.getByRole("link", { name: /github/i }),
  ).toHaveAttribute("href", /github\.com\/chayprabs/u);
});

test("/tools redirects to home", async ({ page }) => {
  await page.goto("/tools", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/$/u);
});
