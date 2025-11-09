"use client";

import { IconButton } from "@crayonai/react-ui";
import { PulsingBorder } from "@paper-design/shaders-react";
import { clsx } from "clsx";
import { ArrowUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { track, useEditor, useValue } from "tldraw";
import { MicrophoneButton } from "@/app/components/MicrophoneButton";
import { createC1ComponentShape, isMac } from "@/app/utils";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { LiveWaveform } from "@/components/ui/live-waveform";

interface PromptInputProps {
  focusEventName: string;
}

export const PromptInput = track(({ focusEventName }: PromptInputProps) => {
  const editor = useEditor();
  const isDarkMode = useValue("isDarkMode", () => editor.user.getIsDarkMode(), [
    editor,
  ]);

  const [isFocused, setIsFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [justTranscribed, setJustTranscribed] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const showMacKeybinds = isMac();
  const inputRef = useRef<HTMLInputElement>(null);
  const isCanvasZeroState = editor.getCurrentPageShapes().length === 0;
  const flagTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle mobile keyboard appearance
  useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const viewport = window.visualViewport;
        const heightDiff = window.innerHeight - viewport.height;
        setKeyboardOffset(heightDiff > 150 ? heightDiff : 0); // Only adjust if significant height change
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportChange);
      return () => {
        window.visualViewport?.removeEventListener(
          "resize",
          handleViewportChange
        );
      };
    }
  }, []);

  // Cleanup timeouts on unmount
  useEffect(
    () => () => {
      if (flagTimeoutRef.current) {
        clearTimeout(flagTimeoutRef.current);
      }
    },
    []
  );

  const onInputSubmit = useCallback(
    async (promptText: string) => {
      // Validate input
      const trimmedPrompt = promptText.trim();
      if (!trimmedPrompt || trimmedPrompt.length > 1000) {
        return; // Invalid input
      }

      setPrompt("");
      setJustSubmitted(true);

      // Clear any existing timeout
      if (flagTimeoutRef.current) {
        clearTimeout(flagTimeoutRef.current);
      }

      try {
        await createC1ComponentShape(editor, {
          searchQuery: trimmedPrompt,
          width: 600,
          height: 300,
          centerCamera: true,
          animationDuration: 200,
        });
      } catch (error) {
        console.error("Failed to create C1 component shape:", error);
        // Reset flag immediately on error to allow retry
        setJustSubmitted(false);
        return;
      }

      // Clear the flag after a short delay to prevent automatic microphone activation
      flagTimeoutRef.current = setTimeout(() => {
        setJustSubmitted(false);
        flagTimeoutRef.current = null;
      }, 1000);
    },
    [editor]
  );

  const handleTranscriptionComplete = useCallback((transcribedText: string) => {
    // Validate transcription result
    const trimmedText = transcribedText?.trim();
    if (!trimmedText || trimmedText.length > 1000) {
      return; // Invalid transcription
    }

    // Only populate the input field, let user decide when to submit
    setPrompt(trimmedText);
    setJustTranscribed(true);

    // Clear any existing timeout
    if (flagTimeoutRef.current) {
      clearTimeout(flagTimeoutRef.current);
    }

    // Focus the input so user can easily edit or submit
    if (inputRef.current) {
      inputRef.current.focus();
      setIsFocused(true);
    }

    // Clear the flag after a short delay to prevent auto-submission
    flagTimeoutRef.current = setTimeout(() => {
      setJustTranscribed(false);
      flagTimeoutRef.current = null;
    }, 500);
  }, []);

  return (
    <div
      className="transition-all duration-300 ease-in-out"
      style={{
        position: "fixed",
        left: "50%",
        top: isCanvasZeroState ? "50%" : "auto",
        bottom: isCanvasZeroState
          ? "auto"
          : `max(${3 + keyboardOffset / 16}rem, env(safe-area-inset-bottom) + 1rem)`,
        transform: isCanvasZeroState
          ? "translate(-50%, -50%)"
          : "translateX(-50%)",
        width: isFocused ? "min(90vw, 800px)" : "min(90vw, 500px)",
        maxWidth: "800px",
      }}
    >
      {!isFocused && (
        <div
          className="-inset-[3px] pointer-events-none absolute overflow-hidden rounded-4xl"
          style={{ filter: "blur(4px)" }}
        >
          <PulsingBorder
            bloom={1.5}
            colorBack="#3dc8ff"
            colors={["#0dc1fd", "#1477f0", "#00f2ff7d"]}
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
          "interactive-el relative flex min-h-[70px] items-center gap-2 rounded-4xl border-none bg-container py-m pr-l pl-xl text-md text-primary sm:gap-xs",
          "touch-manipulation" // Optimize for touch on mobile
        )}
        onSubmit={(e) => {
          e.preventDefault();
          // Prevent submission if it just happened after transcription
          if (justTranscribed) {
            return;
          }
          if (prompt.trim()) {
            onInputSubmit(prompt);
            setIsFocused(false);
            inputRef.current?.blur();
          }
        }}
      >
        {isRecording ? (
          <LiveWaveform
            active={isRecording}
            barColor={isDarkMode ? "#f9fafb" : "#1f2937"}
            barGap={1}
            barWidth={2}
            fftSize={2048}
            height={40}
            mode="static"
            sensitivity={1.2}
            smoothingTimeConstant={0.7}
            updateRate={16}
          />
        ) : (
          <input
            autoCapitalize="sentences"
            autoComplete="off"
            autoCorrect="on"
            className="relative z-10 flex-1 bg-transparent font-semibold text-base text-primary placeholder:text-secondary-text focus:outline-none sm:text-lg"
            maxLength={1000}
            name="prompt-input"
            onBlur={() => setIsFocused(false)}
            onBlurCapture={() => setIsFocused(false)}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Ask anything..."
            ref={inputRef}
            spellCheck="true"
            type="text"
            value={prompt}
          />
        )}
        {isFocused ? (
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-2">
            <MicrophoneButton
              justSubmitted={justSubmitted}
              onRecordingStart={() => setIsRecording(true)}
              onRecordingStop={() => setIsRecording(false)}
              onTranscriptionComplete={handleTranscriptionComplete}
            />
            <IconButton
              className="!rounded-full !border-0 min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px]"
              icon={<ArrowUp />}
              onMouseDown={(e) => {
                // Prevent the input from losing focus when clicking the submit button
                e.preventDefault();
              }}
              size="medium"
              style={{
                backgroundColor:
                  "var(--container-fill-hover, #374151) !important",
                color: "var(--primary-text, #d1d5db) !important",
                border: "none !important",
                borderRadius: "50% !important",
              }}
              type="submit"
            />
          </div>
        ) : (
          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-2">
            <MicrophoneButton
              justSubmitted={justSubmitted}
              onRecordingStart={() => setIsRecording(true)}
              onRecordingStop={() => setIsRecording(false)}
              onTranscriptionComplete={handleTranscriptionComplete}
            />
            <span className="hidden text-xs opacity-30 sm:inline">
              {showMacKeybinds ? (
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </KbdGroup>
              ) : (
                <KbdGroup>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>K</Kbd>
                </KbdGroup>
              )}
            </span>
          </div>
        )}
      </form>
    </div>
  );
});
