export function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <img src="/favicon.svg" alt="Avia Travel" className={className} />
  );
}
