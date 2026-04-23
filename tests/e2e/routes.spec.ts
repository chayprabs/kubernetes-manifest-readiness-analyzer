import { expect, test } from "@playwright/test";

test("home page renders the product message", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", {
      name: "Authos launches with a local Kubernetes manifest analyzer for production-readiness reviews.",
    }),
  ).toBeVisible();
});

test("tools index links to the Kubernetes analyzer", async ({ page }) => {
  await page.goto("/tools", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Authos tools" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "View tool page" }).click();
  await expect(page).toHaveURL(/\/tools\/kubernetes-manifest-analyzer$/u);
  await expect(
    page.getByRole("heading", {
      name: "Kubernetes Manifest Analyzer",
    }),
  ).toBeVisible();
});

test("privacy page renders without errors", async ({ page }) => {
  await page.goto("/privacy", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      name: "Local browser processing is the default direction",
    }),
  ).toBeVisible();
});

test("mobile navigation exposes the primary routes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(
    page.locator('[data-radix-popper-content-wrapper] a[href="/tools"]'),
  ).toBeVisible();
  await page
    .locator('[data-radix-popper-content-wrapper] a[href="/tools"]')
    .click();
  await expect(page).toHaveURL(/\/tools$/u);
});

test("theme toggle can switch the site into dark mode", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open theme selector" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.classList.contains("dark"),
      ),
    )
    .toBe(true);
});
