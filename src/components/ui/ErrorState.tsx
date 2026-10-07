interface ErrorStateProps {
  title?: string;
  message: string;
}

export function ErrorState({ title = "Terjadi Kesalahan", message }: ErrorStateProps) {
  return (
    <div className="rounded-3xl border border-nkk-pink/35 bg-nkk-pink/10 p-8 text-center shadow-soft">
      <h2 className="text-2xl font-black text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-300">{message}</p>
    </div>
  );
}
