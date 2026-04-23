import { cn } from "@/lib/utils";

type YamlSnippetBlockProps = {
  content: string;
  className?: string;
};

export function YamlSnippetBlock({
  content,
  className,
}: YamlSnippetBlockProps) {
  const normalizedContent = content.trimEnd();
  const lines = normalizedContent.length > 0 ? normalizedContent.split("\n") : [];

  return (
    <pre
      className={cn(
        "overflow-x-auto rounded-2xl border border-slate-800 bg-[#071120] p-4 text-sm leading-7 whitespace-pre text-slate-100 shadow-inner",
        className,
      )}
    >
      <code className="block min-w-full">
        {lines.map((line, index) => (
          <span key={`${line}:${index}`} className="block">
            {renderYamlLine(line)}
          </span>
        ))}
      </code>
    </pre>
  );
}

function renderYamlLine(line: string) {
  if (line.trim().length === 0) {
    return <span>&nbsp;</span>;
  }

  const trimmedStart = line.trimStart();
  const indentation = line.slice(0, line.length - trimmedStart.length);

  if (trimmedStart.startsWith("#")) {
    return (
      <>
        {indentation}
        <span className="text-emerald-300">{trimmedStart}</span>
      </>
    );
  }

  const listPrefix = trimmedStart.startsWith("- ") ? "- " : "";
  const remainder = listPrefix ? trimmedStart.slice(2) : trimmedStart;
  const keyMatch = remainder.match(/^([^:]+:)(\s*)(.*)$/);

  if (!keyMatch) {
    return (
      <>
        {indentation}
        {listPrefix ? <span className="text-slate-400">{listPrefix}</span> : null}
        <span className={getValueClassName(remainder)}>{remainder}</span>
      </>
    );
  }

  const [, key, spacing, value] = keyMatch;
  const [mainValue, inlineComment] = splitInlineComment(value);

  return (
    <>
      {indentation}
      {listPrefix ? <span className="text-slate-400">{listPrefix}</span> : null}
      <span className="text-sky-300">{key}</span>
      {spacing}
      {mainValue.length > 0 ? (
        <span className={getValueClassName(mainValue)}>{mainValue}</span>
      ) : null}
      {inlineComment ? (
        <span className="text-emerald-300">{inlineComment}</span>
      ) : null}
    </>
  );
}

function splitInlineComment(value: string) {
  const commentIndex = value.indexOf(" #");

  if (commentIndex < 0) {
    return [value, ""] as const;
  }

  return [
    value.slice(0, commentIndex),
    value.slice(commentIndex + 1),
  ] as const;
}

function getValueClassName(value: string) {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return "text-slate-100";
  }

  if (
    normalized.includes("CHANGE_ME") ||
    normalized.includes("your-namespace") ||
    normalized.includes("app-secrets") ||
    normalized.includes("platform-team") ||
    normalized.includes("gitops-or-helm") ||
    normalized.includes("example")
  ) {
    return "text-amber-300";
  }

  if (/^["'].+["']$/.test(normalized)) {
    return "text-amber-200";
  }

  if (/^(true|false|null|\{\}|\[\])$/.test(normalized)) {
    return "text-fuchsia-300";
  }

  if (/^-?\d+(\.\d+)?%?$/.test(normalized) || /^-?\d+(m|Mi|Gi|Ki)$/.test(normalized)) {
    return "text-cyan-300";
  }

  return "text-slate-100";
}
