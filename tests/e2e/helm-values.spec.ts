import { expect, test } from "@playwright/test";

test("helm values checker loads sample and produces findings", async ({
  page,
}) => {
  await page.goto("/?tool=helm-values-checker", {
    waitUntil: "load",
  });

  await page.getByRole("tab", { name: "Helm Values" }).click();

  const loadSample = page.getByRole("button", { name: "Risky chart values" });
  await expect(loadSample).toBeEnabled();
  await loadSample.click();

  await expect(page.getByLabel("Helm values editor")).toContainText("latest", {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("heading", { name: "Mutable image tag in values" }),
  ).toBeVisible({ timeout: 15_000 });
});
