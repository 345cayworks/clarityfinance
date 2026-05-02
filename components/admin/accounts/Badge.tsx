export function Badge({ tone, children }: { tone: string; children: string }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${tone}`}>{children}</span>;
}
