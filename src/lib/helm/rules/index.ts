import { helmImageRules } from "@/lib/helm/rules/images";
import { helmResourceRules } from "@/lib/helm/rules/resources";
import { helmSecretRules } from "@/lib/helm/rules/secrets";
import { helmSecurityRules } from "@/lib/helm/rules/security";
import { helmStructureRules } from "@/lib/helm/rules/structure";
import type { HelmRule } from "@/lib/helm/types";

export const helmRules: HelmRule[] = [
  ...helmSecretRules,
  ...helmImageRules,
  ...helmResourceRules,
  ...helmSecurityRules,
  ...helmStructureRules,
];
