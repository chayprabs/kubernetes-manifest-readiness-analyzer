import type { Metadata } from "next";
import { NetpolReviewApp } from "@/components/tool/netpol-review-app";
import { getToolMetadata } from "@/lib/tools/registry";

export const metadata: Metadata = getToolMetadata("networkpolicy-reviewer");

export default function NetworkPolicyReviewerPage() {
  return <NetpolReviewApp />;
}
