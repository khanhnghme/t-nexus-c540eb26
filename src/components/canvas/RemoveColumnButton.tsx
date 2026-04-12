import { X } from "lucide-react";

interface RemoveColumnButtonProps {
  onClick: () => void;
}

export default function RemoveColumnButton({ onClick }: RemoveColumnButtonProps) {
  return (
    <button
      type="button"
      className="remove-column-button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title="Remove column"
    >
      <X className="h-3 w-3" />
    </button>
  );
}
