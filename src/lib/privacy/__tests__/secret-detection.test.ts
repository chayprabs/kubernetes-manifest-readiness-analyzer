import { describe, expect, it } from "vitest";
import { detectSensitiveStringMatches } from "@/lib/privacy/secret-detection";

describe("detectSensitiveStringMatches", () => {
  it("detects literal secret-like values when the field name is sensitive", () => {
    expect(
      detectSensitiveStringMatches("super-secret-password-123", {
        keyName: "CLIENT_SECRET",
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "secret-like",
        }),
      ]),
    );
  });

  it("detects cloud credential and internal hostname patterns", () => {
    const matches = detectSensitiveStringMatches(
      "token=AKIAABCDEFGHIJKLMNOP host=payments.api.svc.cluster.local",
    );
    const kinds = matches.map((match) => match.kind);

    expect(kinds).toContain("cloud-credential");
    expect(kinds).toContain("internal-hostname");
  });
});
