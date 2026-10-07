export function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-lg border border-white/10 bg-white/8" />
      ))}
    </div>
  );
}
