import type { K8sFixPreview } from "@/lib/k8s/types";
import { YamlSnippetBlock } from "@/components/tool/yaml-snippet-block";

type BeforeAfterPreviewProps = {
  preview: K8sFixPreview;
};

export function BeforeAfterPreview({ preview }: BeforeAfterPreviewProps) {
  if (!preview.before && !preview.after) {
    return null;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {preview.before ? (
        <PreviewPane
          label="Before"
          description="Current manifest shape from the analyzed draft."
          value={preview.before}
        />
      ) : null}
      {preview.after ? (
        <PreviewPane
          label="After"
          description="Suggested shape after a reviewed patch."
          value={preview.after}
        />
      ) : null}
    </div>
  );
}

function PreviewPane({
  label,
  description,
  value,
}: {
  label: string;
  description: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="space-y-1">
        <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
          {label}
        </p>
        <p className="text-muted text-xs leading-5">{description}</p>
      </div>
      <YamlSnippetBlock content={value} />
    </div>
  );
}
