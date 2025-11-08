"use client";

import { IconButton, ThemeProvider } from "@crayonai/react-ui";
import { PulsingBorder } from "@paper-design/shaders-react";
import { clsx } from "clsx";
import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { track, useEditor } from "tldraw";
import { MicrophoneButton } from "@/app/components/MicrophoneButton";
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

  const onInputSubmit = async (promptText: string) => {
    setPrompt("");
    try {
      await createC1ComponentShape(editor, {
        searchQuery: promptText,
        width: 600,
        height: 300,
        centerCamera: true,
        animationDuration: 200,
      });
    } catch (error) {
      console.error("Failed to create C1 component shape:", error);
    }
  };

  const handleTranscriptionComplete = (transcribedText: string) => {
    // Only populate the input field, let user decide when to submit
    setPrompt(transcribedText);
    // Focus the input so user can easily edit or submit
    if (inputRef.current) {
      inputRef.current.focus();
      setIsFocused(true);
    }
  };

  return (
    <div
      className="transition-all duration-300 ease-in-out"
      style={{
        position: "fixed",
        left: "50%",
        top: isCanvasZeroState ? "50%" : "auto",
        bottom: isCanvasZeroState ? "auto" : "1rem",
        transform: isCanvasZeroState
          ? "translate(-50%, -50%)"
          : "translateX(-50%)",
        width: isFocused ? "50%" : "400px",
      }}
    >
      {!isFocused && (
        <div
          className="-inset-[3px] pointer-events-none absolute overflow-hidden rounded-2xl"
          style={{ filter: "blur(4px)" }}
        >
          <PulsingBorder
            bloom={1.5}
            colorBack="#ffffff"
            colors={["#0dc1fd", "#87f500", "#2effb6cc"]}
            intensity={1}
            offsetX={0}
            offsetY={0}
            pulse={0.4}
            rotation={0}
            roundness={0.75}
            scale={1}
            smoke={0.2}
            smokeSize={0.3}
            softness={0.67}
            speed={1}
            spotSize={0.15}
            spots={2}
            style={{ width: "100%", height: "100%" }}
            thickness={0.5}
          />
        </div>
      )}
      <form
        className={clsx(
          "interactive-el relative flex min-h-[60px] items-center gap-xs rounded-2xl border-none bg-container py-m pr-l pl-xl text-md text-primary"
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
            className="relative z-10 flex-1"
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
            <div className="flex items-center gap-2">
              <MicrophoneButton
                isDarkMode={isDarkMode}
                onTranscriptionComplete={handleTranscriptionComplete}
              />
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
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MicrophoneButton
                isDarkMode={isDarkMode}
                onTranscriptionComplete={handleTranscriptionComplete}
              />
              <span className="text-xs opacity-30">
                {showMacKeybinds ? "⌘ + K" : "Ctrl + K"}
              </span>
            </div>
          )}
        </ThemeProvider>
      </form>
    </div>
  );
});
