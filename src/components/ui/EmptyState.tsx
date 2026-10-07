interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-nkk-panel p-8 text-center shadow-soft">
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-300">{description}</p>
    </div>
  );
}
