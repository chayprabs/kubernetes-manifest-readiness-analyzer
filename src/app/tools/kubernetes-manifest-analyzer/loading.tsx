import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container size="workspace" className="grid gap-8">
      <Card>
        <CardHeader className="space-y-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-96 max-w-full" />
          <Skeleton className="h-5 w-full max-w-3xl" />
          <Skeleton className="h-5 w-3/4" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[0.7fr_0.3fr]">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-[0.7fr_0.3fr]">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </Container>
  );
}
