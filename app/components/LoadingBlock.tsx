interface LoadingBlockProps {
  className?: string;
}

export default function LoadingBlock({ className = "" }: LoadingBlockProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-[1.5rem] bg-[#e9eee9] ${className}`}
    />
  );
}
