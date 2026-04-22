import { stringify } from "yaml";
import type {
  K8sFixPreview,
  K8sJsonPatchLikeOperation,
  K8sObjectRef,
} from "@/lib/k8s/types";

type PatchTargetRef = Pick<
  K8sObjectRef,
  "apiVersion" | "kind" | "name" | "namespace"
>;

type YamlBuildOptions = {
  commentLines?: readonly string[];
};

const YAML_STRINGIFY_OPTIONS = {
  lineWidth: 0,
  minContentWidth: 0,
} as const;

export function stringifyStableYaml(value: unknown) {
  if (value === undefined) {
    return "";
  }

  return stringify(value, YAML_STRINGIFY_OPTIONS).trimEnd();
}

export function buildYamlSnippetContent(
  value: unknown,
  options: YamlBuildOptions = {},
) {
  return withCommentLines(stringifyStableYaml(value), options.commentLines);
}

export function buildStrategicMergePatchLikeContent(
  targetRef: PatchTargetRef,
  patch: Record<string, unknown>,
  options: YamlBuildOptions = {},
) {
  return withCommentLines(
    stringifyStableYaml({
      apiVersion: targetRef.apiVersion,
      kind: targetRef.kind,
      metadata: buildMetadata(targetRef),
      ...patch,
    }),
    options.commentLines,
  );
}

export function buildJsonPatchLikeContent(
  operations: readonly K8sJsonPatchLikeOperation[],
  options: YamlBuildOptions = {},
) {
  return withCommentLines(stringifyStableYaml(operations), options.commentLines);
}

export function buildNewResourceContent(
  resource: Record<string, unknown>,
  options: YamlBuildOptions = {},
) {
  return withCommentLines(stringifyStableYaml(resource), options.commentLines);
}

export function buildFixPreview(input: {
  before?: string | Record<string, unknown> | undefined;
  after?: string | Record<string, unknown> | undefined;
}): K8sFixPreview | undefined {
  const before = normalizePreviewValue(input.before);
  const after = normalizePreviewValue(input.after);

  if (!before && !after) {
    return undefined;
  }

  return {
    before,
    after,
  };
}

function buildMetadata(targetRef: PatchTargetRef) {
  return {
    ...(targetRef.name ? { name: targetRef.name } : {}),
    ...(targetRef.namespace ? { namespace: targetRef.namespace } : {}),
  };
}

function normalizePreviewValue(
  value: string | Record<string, unknown> | undefined,
) {
  if (!value) {
    return undefined;
  }

  return typeof value === "string" ? value.trimEnd() : stringifyStableYaml(value);
}

function withCommentLines(
  content: string,
  commentLines: readonly string[] | undefined,
) {
  const comments = (commentLines ?? [])
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => (line.startsWith("#") ? line : `# ${line}`));

  if (comments.length === 0) {
    return content;
  }

  return content.length > 0
    ? [...comments, content].join("\n")
    : comments.join("\n");
}
