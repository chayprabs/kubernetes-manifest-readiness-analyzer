import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { privacyMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = privacyMetadata;

export default function PrivacyPage() {
  return (
    <AppShell showSeoStrip={false}>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-foreground mb-2 text-3xl font-semibold">
          Privacy Policy
        </h1>
        <p className="text-muted mb-8 text-sm">Last updated: May 30, 2026</p>

        <div className="text-foreground space-y-6 text-sm leading-7">
          <section>
            <h2 className="mb-2 text-lg font-semibold">Local-first analysis</h2>
            <p>
              {siteConfig.name} runs parsing, scoring, and report generation in
              your browser. We do not operate a backend that receives your pasted
              or uploaded YAML for the core review tools.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">What stays on your device</h2>
            <p>
              The Kubernetes Manifest Analyzer may store explicit analyzer
              settings (profile, target version, auto-analyze preference) in
              your browser&apos;s local storage when you opt in. Raw manifest
              text is not written to local storage by default.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Exports and sharing</h2>
            <p>
              Report exports are generated locally. Sensitive fields may be
              redacted in the UI and in JSON exports when redaction is enabled.
              You are responsible for reviewing exports before sharing them.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Analytics</h2>
            <p>
              Product analytics are disabled unless you configure optional public
              environment variables documented in <code>.env.example</code>.
              When enabled, events are sanitized and must not include raw YAML.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">No accounts</h2>
            <p>
              This site does not require sign-in, and we do not maintain user
              accounts or server-side manifest databases for the review tools.
            </p>
          </section>
        </div>

        <p className="text-muted mt-10 text-sm">
          <Link href="/" className="text-accent hover:underline">
            ← Back to tools
          </Link>
        </p>
      </article>
    </AppShell>
  );
}
