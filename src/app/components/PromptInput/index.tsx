import { IconButton, ThemeProvider } from "@crayonai/react-ui";
import { clsx } from "clsx";
import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { track, useEditor } from "tldraw";
import { createC1ComponentShape, isMac } from "@/app/utils";

interface PromptInputProps {
  focusEventName: string;
}

export const PromptInput = track(({ focusEventName }: PromptInputProps) => {
  const editor = useEditor();
  const isDarkMode = editor.user.getIsDarkMode();
  // Ensure we always have a valid theme mode for ThemeProvider
  const themeMode = isDarkMode === true ? "dark" : "light";
  const [isFocused, setIsFocused] = useState(false);
  const [prompt, setPrompt] = useState("");
  const showMacKeybinds = isMac();
  const inputRef = useRef<HTMLInputElement>(null);
  const isCanvasZeroState = editor.getCurrentPageShapes().length === 0;

  // Listen for the custom focus event from tldraw
  useEffect(() => {
    const handleFocusEvent = () => {
      if (inputRef.current) {
        inputRef.current.focus();
        setIsFocused(true);
      }
    };

    window.addEventListener(focusEventName, handleFocusEvent);
    return () => {
      window.removeEventListener(focusEventName, handleFocusEvent);
    };
  }, [focusEventName]);

  const onInputSubmit = async (prompt: string) => {
    setPrompt("");
    try {
      await createC1ComponentShape(editor, {
        searchQuery: prompt,
        width: 600,
        height: 300,
        centerCamera: true,
        animationDuration: 200,
      });
    } catch (error) {
      console.error("Failed to create C1 component shape:", error);
    }
  };

  return (
    <form
      className={clsx(
        "-translate-x-1/2 fixed left-1/2 flex min-h-[60px] items-center gap-xs rounded-2xl border border-interactive-el bg-container py-m pr-l pl-xl text-md text-primary shadow-md transition-all duration-300 ease-in-out",
        {
          "w-[400px]": !isFocused,
          "w-1/2": isFocused,
          // Position based on canvas state
          "-translate-y-1/2 top-1/2": isCanvasZeroState,
          "bottom-4": !isCanvasZeroState,
        }
      )}
      onSubmit={(e) => {
        e.preventDefault();
        onInputSubmit(prompt);
        setIsFocused(false);
        inputRef.current?.blur();
      }}
    >
      <ThemeProvider mode={themeMode}>
        <input
          className="flex-1"
          name="prompt-input"
          onBlur={() => setIsFocused(false)}
          onBlurCapture={() => setIsFocused(false)}
          onChange={(e) => setPrompt(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Ask anything..."
          ref={inputRef}
          type="text"
          value={prompt}
        />
        {isFocused ? (
          <IconButton
            icon={<ArrowUp />}
            onMouseDown={(e) => {
              // Prevent the input from losing focus when clicking the submit button
              e.preventDefault();
            }}
            size="medium"
            type="submit"
            variant="secondary"
          />
        ) : (
          <span className="text-xs opacity-30">
            {showMacKeybinds ? "⌘ + K" : "Ctrl + K"}
          </span>
        )}
      </ThemeProvider>
    </form>
  );
});
