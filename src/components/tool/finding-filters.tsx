"use client";

import type { Ref } from "react";
import type { K8sFindingCategory, K8sFindingSeverity } from "@/lib/k8s/types";
import { formatFindingCount } from "@/lib/utils";
import { formatK8sCategoryLabel } from "@/components/tool/k8s-dashboard-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type FindingFilterState = {
  severity: "all" | K8sFindingSeverity;
  category: "all" | K8sFindingCategory;
  namespace: "all" | "__cluster__" | string;
  resourceKind: "all" | string;
  search: string;
  warningsOnly: boolean;
};

export type FindingFilterOptions = {
  categories: readonly K8sFindingCategory[];
  namespaces: readonly { value: string; label: string }[];
  resourceKinds: readonly string[];
};

export const defaultFindingFilterState: FindingFilterState = {
  severity: "all",
  category: "all",
  namespace: "all",
  resourceKind: "all",
  search: "",
  warningsOnly: false,
};

type FindingFiltersProps = {
  filters: FindingFilterState;
  options: FindingFilterOptions;
  matchCount: number;
  totalCount: number;
  searchInputId?: string;
  searchInputRef?: Ref<HTMLInputElement>;
  onChange: (nextFilters: FindingFilterState) => void;
  onReset: () => void;
};

const severityOptions: ReadonlyArray<{
  label: string;
  value: FindingFilterState["severity"];
}> = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
  { label: "Info", value: "info" },
];

export function FindingFilters({
  filters,
  options,
  matchCount,
  totalCount,
  searchInputId,
  searchInputRef,
  onChange,
  onReset,
}: FindingFiltersProps) {
  const searchFieldId = searchInputId ?? "finding-search-input";

  return (
    <div className="border-border bg-background-muted/35 grid gap-4 rounded-3xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-foreground text-sm font-semibold">
            {formatFindingCount(matchCount)}
          </p>
          <p className="text-muted text-sm leading-6">
            {matchCount === totalCount
              ? "All findings are currently visible."
              : `Showing ${matchCount} of ${totalCount} findings after local filtering.`}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Reset filters
        </Button>
      </div>

      <div className="grid gap-2">
        <label className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
          Severity
        </label>
        <div className="flex flex-wrap gap-2">
          {severityOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={
                filters.severity === option.value ? "default" : "outline"
              }
              onClick={() => onChange({ ...filters, severity: option.value })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="grid gap-2">
          <label className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
            Category
          </label>
          <Select
            value={filters.category}
            onValueChange={(value) =>
              onChange({
                ...filters,
                category: value as FindingFilterState["category"],
              })
            }
          >
            <SelectTrigger aria-label="Filter findings by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {options.categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {formatK8sCategoryLabel(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <label className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
            Namespace
          </label>
          <Select
            value={filters.namespace}
            onValueChange={(value) =>
              onChange({
                ...filters,
                namespace: value,
              })
            }
          >
            <SelectTrigger aria-label="Filter findings by namespace">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All namespaces</SelectItem>
              {options.namespaces.map((namespace) => (
                <SelectItem key={namespace.value} value={namespace.value}>
                  {namespace.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <label className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
            Resource kind
          </label>
          <Select
            value={filters.resourceKind}
            onValueChange={(value) =>
              onChange({
                ...filters,
                resourceKind: value,
              })
            }
          >
            <SelectTrigger aria-label="Filter findings by resource kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              {options.resourceKinds.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {kind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="border-border bg-card flex items-center justify-between gap-4 rounded-2xl border px-4 py-3">
          <div className="space-y-1">
            <p className="text-foreground text-sm font-medium">
              Show warnings only
            </p>
            <p className="text-muted text-xs leading-5">
              Hide informational findings while you focus on action items.
            </p>
          </div>
          <Switch
            checked={filters.warningsOnly}
            onCheckedChange={(warningsOnly) =>
              onChange({
                ...filters,
                warningsOnly,
              })
            }
            aria-label="Toggle warnings-only finding view"
          />
        </label>
      </div>

      <div className="grid gap-2">
        <label
          htmlFor={searchFieldId}
          className="text-muted text-xs font-semibold tracking-[0.18em] uppercase"
        >
          Search
        </label>
        <Input
          id={searchFieldId}
          ref={searchInputRef}
          value={filters.search}
          onChange={(event) =>
            onChange({
              ...filters,
              search: event.target.value,
            })
          }
          aria-label="Search findings"
          placeholder="Search title, resource, message, recommendation, or fix text (Ctrl/Cmd + K)"
        />
      </div>
    </div>
  );
}
