# Kubernetes Version Maintenance

## Ownership

Platform maintainers own updates to:

- `supportedKubernetesTargetVersions` in `src/lib/k8s/deprecations.ts`
- `kubernetesApiDeprecations` in the same file

## When to update

1. **New minor release** — Add the version to `supportedKubernetesTargetVersions` when teams you support begin targeting it (typically within one release cycle of GA).
2. **Deprecation changes** — Extend `kubernetesApiDeprecations` using the [official deprecation guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/).
3. **Rule behavior** — If a rule gates on `kubernetesTargetVersion`, add or adjust tests under `src/lib/k8s/__tests__/`.

## Default version

The analyzer UI defaults to the **last entry** in `supportedKubernetesTargetVersions` (`latestSupportedKubernetesTargetVersion`).

## Verification checklist

- [ ] `pnpm typecheck`
- [ ] `pnpm test` (especially `schema-api-version-operations.test.ts`)
- [ ] Update snapshots only when user-visible export text intentionally changes
- [ ] Confirm the version `<Select>` in `K8sAnalyzerApp` lists the new range
