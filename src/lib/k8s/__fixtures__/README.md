# Kubernetes Test Fixtures

These fixtures back the analyzer's unit, snapshot, and end-to-end tests.

## Guidelines

- Each file models one review scenario with realistic Kubernetes object shapes.
- Secrets are always fake placeholders. Never add production values here.
- Prefer a small number of objects that clearly explain the scenario over giant bundles.
- Keep fixtures deterministic. If a test snapshots exported output, pass a fixed `generatedAt` value from the test instead of relying on the current clock.

## Typical usage

- Unit tests load a fixture as raw YAML and run `parseK8sYaml()` or `analyzeK8sManifests()`.
- Golden snapshot tests normalize timing fields before snapshotting analyzer output.
- Playwright uses `invalid-yaml.yaml` to exercise the browser upload and parse-error flow without relying on network access.

## Fixture map

- `clean-production-deployment.yaml`: healthy baseline with probes, resources, security hardening, a Service, PDB, NetworkPolicy, and dedicated ServiceAccount.
- `missing-probes-resources.yaml`: production-style app with missing probes, resources, PDB, and network isolation.
- `service-selector-mismatch.yaml`: Service selector drift that no longer matches the intended Deployment.
- `insecure-security-context.yaml`: deliberately unsafe workload settings for security-focused analysis.
- `public-loadbalancer-ingress-no-tls.yaml`: internet-facing Service and Ingress exposure without TLS.
- `deprecated-apis.yaml`: legacy Kubernetes APIs that should surface migration findings.
- `cronjob-risk.yaml`: CronJob missing concurrency and history controls.
- `pdb-mismatch.yaml`: PodDisruptionBudget selector that protects nothing.
- `multi-namespace-bundle.yaml`: realistic multi-namespace bundle for parser and resource-summary coverage.
- `invalid-yaml.yaml`: broken YAML used for parser and e2e error-path coverage.
- `secret-redaction.yaml`: fake secret and literal env var data used to verify privacy safeguards.
