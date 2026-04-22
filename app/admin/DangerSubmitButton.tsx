"use client";

interface DangerSubmitButtonProps {
  label: string;
  confirmMessage: string;
  className?: string;
}

export default function DangerSubmitButton({
  label,
  confirmMessage,
  className,
}: DangerSubmitButtonProps) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {label}
    </button>
  );
}
