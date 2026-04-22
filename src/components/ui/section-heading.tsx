type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="max-w-3xl space-y-3">
      <p className="text-accent font-mono text-xs tracking-[0.24em] uppercase">
        {eyebrow}
      </p>
      <h2 className="text-foreground text-3xl font-semibold sm:text-4xl">
        {title}
      </h2>
      <p className="text-muted text-base leading-7 sm:text-lg">{description}</p>
    </div>
  );
}
