import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="items-center text-center">
        <div className="bg-background-muted text-muted flex h-12 w-12 items-center justify-center rounded-2xl">
          {icon ?? <Inbox className="h-5 w-5" />}
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid justify-items-center gap-4 text-center">
        <p className="text-muted max-w-md text-sm leading-6">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
