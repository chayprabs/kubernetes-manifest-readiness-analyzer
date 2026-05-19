import { expect, test } from "@playwright/test";

test("home page renders the product message", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });

  await expect(
    page.getByRole("heading", {
      name: "Authos ships a four-tool Kubernetes review suite for local production-readiness workflows.",
    }),
  ).toBeVisible();
});

test("tools index links to the Kubernetes analyzer", async ({ page }) => {
  await page.goto("/tools", { waitUntil: "load" });
  await expect(
    page.getByRole("heading", { name: "Authos tools" }),
  ).toBeVisible();

  await page
    .locator('a[href="/tools/kubernetes-manifest-analyzer"]')
    .filter({ hasText: "View tool page" })
    .click();
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
  await page.goto("/", { waitUntil: "load" });

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const toolsLink = page.getByRole("menuitem", { name: "Tools" });
  await expect(toolsLink).toBeVisible();
  await toolsLink.click();
  await expect(page).toHaveURL(/\/tools$/u);
});

test("theme toggle can switch the site into dark mode", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  const themeButton = page.getByRole("button", { name: "Open theme selector" });
  await expect(themeButton).toBeEnabled();
  await themeButton.click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.classList.contains("dark"),
      ),
    )
    .toBe(true);
});
