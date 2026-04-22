"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ToolErrorStateProps = {
  error?: Error & { digest?: string };
  reset?: () => void;
  footer?: ReactNode;
};

export function ToolErrorState({ error, reset, footer }: ToolErrorStateProps) {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <div className="bg-destructive/12 text-destructive flex h-12 w-12 items-center justify-center rounded-2xl">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <CardTitle>Tool page error</CardTitle>
        <CardDescription>
          Something failed while rendering this tool workspace. You can retry
          the route without losing the rest of the site shell.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error?.message ? (
          <pre className="bg-background-muted text-muted overflow-x-auto rounded-2xl p-4 text-sm leading-6">
            <code>{error.message}</code>
          </pre>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {reset ? (
            <Button type="button" onClick={reset}>
              Try again
            </Button>
          ) : null}
          {footer}
        </div>
      </CardContent>
    </Card>
  );
}
