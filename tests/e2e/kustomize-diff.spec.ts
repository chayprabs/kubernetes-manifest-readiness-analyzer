import { expect, test } from "@playwright/test";

test("kustomize diff reviewer loads sample comparison", async ({ page }) => {
  await page.goto("/?tool=kustomize-output-diff", {
    waitUntil: "load",
  });

  await page.getByRole("tab", { name: "Kustomize Diff" }).click();

  await page.getByRole("button", { name: "Load sample diff" }).click();
  await expect(
    page.getByRole("heading", { name: /changed Deployment\/api/i }),
  ).toBeVisible({ timeout: 15_000 });
});
