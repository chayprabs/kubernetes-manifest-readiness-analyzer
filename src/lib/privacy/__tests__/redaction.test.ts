import { describe, expect, it } from "vitest";
import {
  redactSensitiveText,
  redactYamlLikeText,
} from "@/lib/privacy/redaction";

describe("privacy redaction", () => {
  it("redacts private keys and internal hostnames from visible text", () => {
    const redacted = redactSensitiveText(
      "-----BEGIN PRIVATE KEY-----\nconnect payments.api.svc.cluster.local",
    );

    expect(redacted).toContain("[REDACTED PRIVATE KEY]");
    expect(redacted).toContain("[REDACTED INTERNAL HOST]");
    expect(redacted).not.toContain("payments.api.svc.cluster.local");
  });

  it("redacts Secret data, sensitive env values, and risky annotations in yaml-like text", () => {
    const redacted = redactYamlLikeText(`apiVersion: v1
kind: Secret
metadata:
  name: demo-secret
  annotations:
    example.com/token: xoxb-1234567890-secret
stringData:
  password: dont-print-me
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo
spec:
  template:
    spec:
      containers:
        - name: api
          env:
            - name: API_TOKEN
              value: super-secret-password-123
          args:
            - --upstream=payments.api.svc.cluster.local`);

    expect(redacted).toContain("[REDACTED SECRET]");
    expect(redacted).toContain("[REDACTED ENV VALUE]");
    expect(redacted).toContain("[REDACTED ANNOTATION]");
    expect(redacted).toContain("[REDACTED INTERNAL HOST]");
    expect(redacted).not.toContain("dont-print-me");
    expect(redacted).not.toContain("super-secret-password-123");
    expect(redacted).not.toContain("xoxb-1234567890-secret");
  });
});
