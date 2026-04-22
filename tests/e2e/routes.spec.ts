import { expect, test } from "@playwright/test";

test("home page renders the product message", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Authos is building serious browser-first tooling for engineering teams.",
    }),
  ).toBeVisible();
});

test("tool routes and privacy route render without errors", async ({
  page,
}) => {
  await page.goto("/tools");
  await expect(
    page.getByRole("heading", { name: "Authos tools" }),
  ).toBeVisible();

  await page.goto("/tools/kubernetes-manifest-analyzer");
  await expect(
    page.getByRole("heading", {
      name: "Kubernetes Manifest Production-Readiness Analyzer",
    }),
  ).toBeVisible();

  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", {
      name: "Local browser processing is the default direction",
    }),
  ).toBeVisible();
});
