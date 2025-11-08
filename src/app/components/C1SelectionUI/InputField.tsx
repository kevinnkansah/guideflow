import { IconButton } from "@crayonai/react-ui";
import clsx from "clsx";
import { ArrowUp, X } from "lucide-react";
import { useState } from "react";

interface InputFieldProps {
  x: number;
  y: number;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const InputField = ({ x, y, onSubmit, onCancel }: InputFieldProps) => {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 1000,
        pointerEvents: "all",
      }}
    >
      <form
        className={clsx(
          "flex min-h-[60px] w-[400px] items-center gap-xs rounded-2xl border border-interactive-el bg-container py-m pr-l pl-xl text-md text-primary shadow-md transition-all duration-300"
        )}
        data-c1-input-area
        onSubmit={handleSubmit}
      >
        <input
          autoFocus
          className="flex-1"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter prompt..."
          type="text"
          value={value}
        />
        <IconButton
          disabled={!value.trim()}
          icon={<ArrowUp />}
          onMouseDown={(e) => {
            // Prevent the input from losing focus when clicking the submit button
            e.preventDefault();
          }}
          size="medium"
          type="submit"
          variant="secondary"
        />
        <IconButton
          icon={<X />}
          onClick={onCancel}
          onMouseDown={(e) => {
            // Prevent the input from losing focus when clicking the cancel button
            e.preventDefault();
          }}
          size="medium"
          type="button"
          variant="secondary"
        />
      </form>
    </div>
  );
};
