import { Plus } from "lucide-react";

interface AddColumnButtonProps {
  onClick: () => void;
  visible: boolean;
}

export default function AddColumnButton({ onClick, visible }: AddColumnButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      className="add-column-button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title="Add column"
    >
      <Plus className="h-3.5 w-3.5" />
    </button>
  );
}
