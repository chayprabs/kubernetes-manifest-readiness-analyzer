import { expect, test } from "@playwright/test";

test("networkpolicy reviewer flags open egress", async ({ page }) => {
  await page.goto("/?tool=networkpolicy-reviewer", {
    waitUntil: "load",
  });

  await page.getByRole("tab", { name: "NetPol Review" }).click();

  const loadSample = page.getByRole("button", { name: "Load permissive sample" });
  await expect(loadSample).toBeEnabled();
  await loadSample.click();

  await expect(page.getByLabel("NetworkPolicy YAML editor")).toContainText(
    "allow-all-egress",
    { timeout: 15_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Egress allows all destinations" }),
  ).toBeVisible({ timeout: 15_000 });
});
