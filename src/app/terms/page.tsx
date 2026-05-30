import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { siteConfig, termsMetadata } from "@/lib/site";

export const metadata: Metadata = termsMetadata;

export default function TermsPage() {
  return (
    <AppShell showSeoStrip={false}>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-foreground mb-2 text-3xl font-semibold">
          Terms &amp; Conditions
        </h1>
        <p className="text-muted mb-8 text-sm">
          Last updated: May 30, 2026. These terms apply to your use of{" "}
          {siteConfig.name} at {siteConfig.baseUrl}.
        </p>

        <div className="text-foreground space-y-6 text-sm leading-7">
          <section>
            <h2 className="mb-2 text-lg font-semibold">1. Acceptance</h2>
            <p>
              By accessing or using this website and its browser-based tools,
              you agree to these Terms. If you do not agree, do not use the
              service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">
              2. What the service provides
            </h2>
            <p>
              {siteConfig.name} offers static, local analysis of Kubernetes-related
              YAML and related configuration you choose to paste or upload into
              your browser. The tools do not connect to your clusters, do not
              guarantee admission-controller or policy-engine parity, and do not
              constitute professional security, legal, or compliance advice.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">
              3. Your responsibilities
            </h2>
            <p>
              You are solely responsible for the configuration data you enter,
              the decisions you make based on tool output, and compliance with
              your organization&apos;s policies. Do not submit content you are
              not authorized to process. You must not attempt to disrupt the
              site, scrape it at abusive rates, or use it in violation of
              applicable law.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">
              4. Disclaimer of warranties
            </h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE,&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS,
              IMPLIED, OR STATUTORY, INCLUDING MERCHANTABILITY, FITNESS FOR A
              PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT
              RESULTS WILL BE ACCURATE, COMPLETE, OR ERROR-FREE.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">
              5. Limitation of liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATOR OF{" "}
              {siteConfig.name} AND ITS CONTRIBUTORS WILL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
              OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS INTERRUPTION,
              ARISING FROM YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE
              POSSIBILITY OF SUCH DAMAGES. OUR AGGREGATE LIABILITY FOR ANY
              CLAIM RELATING TO THE SERVICE SHALL NOT EXCEED ONE HUNDRED U.S.
              DOLLARS (USD $100) OR THE AMOUNT YOU PAID TO USE THE SERVICE IN
              THE TWELVE MONTHS BEFORE THE CLAIM, WHICHEVER IS GREATER.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">6. Indemnity</h2>
            <p>
              You agree to defend and indemnify the operator against claims
              arising from your misuse of the service, your content, or your
              violation of these Terms, except where caused by our intentional
              misconduct.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">7. Changes</h2>
            <p>
              We may update these Terms or the tools at any time. Continued use
              after changes are posted constitutes acceptance of the revised
              Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">8. Contact</h2>
            <p>
              Questions about these Terms may be directed via{" "}
              <a
                href={siteConfig.websiteUrl}
                className="text-accent hover:underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                the operator&apos;s website
              </a>
              .
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
