/**
 * Deployment facts discovered from the public GitHub repository metadata.
 * Update this file when production hosting is configured.
 */
export const deploymentFacts = {
  githubOwner: "chayprabs",
  githubRepository: "kubernetes-manifest-readiness-analyzer",
  githubRepositoryUrl:
    "https://github.com/chayprabs/kubernetes-manifest-readiness-analyzer",
  /** Set to true after the first production deploy with NEXT_PUBLIC_SITE_URL. */
  productionOriginConfigured: false,
  lastVerifiedAt: "2026-05-19",
  suiteVersion: "1.0.0",
  liveToolCount: 4,
} as const;

/** Suggested origins to set as `NEXT_PUBLIC_SITE_URL` after deploy. */
export const suggestedProductionOrigins = {
  vercelDefault: `https://${deploymentFacts.githubRepository}.vercel.app`,
  githubPages: `https://${deploymentFacts.githubOwner}.github.io/${deploymentFacts.githubRepository}`,
} as const;

export const localDevelopmentOrigin = "http://localhost:3000";
