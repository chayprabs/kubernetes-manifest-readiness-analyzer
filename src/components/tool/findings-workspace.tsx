"use client";

import { useMemo, useState } from "react";
import { ReadinessFindingList } from "@/components/tool/readiness-finding-list";
import type { K8sFinding, K8sFindingSeverity } from "@/lib/k8s/types";
import { formatFindingCount } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type FindingsWorkspaceProps = {
  findings: K8sFinding[];
};

const severityWeight: Record<K8sFindingSeverity, number> = {
  critical: 5,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export function FindingsWorkspace({ findings }: FindingsWorkspaceProps) {
  const [severityFloor, setSeverityFloor] = useState<K8sFindingSeverity>("low");
  const [compactCards, setCompactCards] = useState(false);

  const filteredFindings = useMemo(() => {
    return findings
      .filter(
        (finding) =>
          severityWeight[finding.severity] >= severityWeight[severityFloor],
      )
      .sort(
        (left, right) =>
          severityWeight[right.severity] - severityWeight[left.severity],
      );
  }, [findings, severityFloor]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detected findings</CardTitle>
        <CardDescription>
          Adjust the severity floor or tighten the card density without leaving
          the current review context.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="border-border bg-background-muted/60 grid gap-4 rounded-2xl border p-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-1">
            <p className="text-foreground text-sm font-semibold">
              {formatFindingCount(filteredFindings.length)}
            </p>
            <p className="text-muted text-sm leading-6">
              Filtering is local to this workspace and designed for fast
              keyboard review.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_auto]">
            <div className="grid gap-2">
              <label className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                Severity floor
              </label>
              <Select
                value={severityFloor}
                onValueChange={(value) =>
                  setSeverityFloor(value as K8sFindingSeverity)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Include info findings</SelectItem>
                  <SelectItem value="low">Show all findings</SelectItem>
                  <SelectItem value="medium">Medium and high only</SelectItem>
                  <SelectItem value="high">High only</SelectItem>
                  <SelectItem value="critical">Critical only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="border-border bg-card flex items-center justify-between gap-4 rounded-2xl border px-4 py-3">
              <div className="space-y-1">
                <p className="text-foreground text-sm font-medium">
                  Compact cards
                </p>
                <p className="text-muted text-xs leading-5">
                  Reduce card height for faster scanning.
                </p>
              </div>
              <Switch
                checked={compactCards}
                onCheckedChange={setCompactCards}
                aria-label="Toggle compact finding cards"
              />
            </label>
          </div>
        </div>

        <ReadinessFindingList
          findings={filteredFindings}
          compact={compactCards}
        />
      </CardContent>
    </Card>
  );
}
