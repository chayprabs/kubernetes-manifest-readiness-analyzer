"use client";

import Link from "next/link";
import { Container } from "@/components/layout/container";
import { ToolErrorState } from "@/components/tool/tool-error-state";
import { Button } from "@/components/ui/button";

export default function ToolsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container size="workspace">
      <ToolErrorState
        error={error}
        reset={reset}
        footer={
          <Button asChild variant="outline">
            <Link href="/tools">Back to tools</Link>
          </Button>
        }
      />
    </Container>
  );
}
