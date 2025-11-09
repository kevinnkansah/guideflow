"use client";

import { IconButton } from "@crayonai/react-ui";
import { PulsingBorder } from "@paper-design/shaders-react";
import { clsx } from "clsx";
import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    setJustTranscribed(true);
    // Focus the input so user can easily edit or submit
    if (inputRef.current) {
      inputRef.current.focus();
      setIsFocused(true);
    }
    // Clear the flag after a short delay to prevent auto-submission
    setTimeout(() => setJustTranscribed(false), 500);
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
        width: isFocused ? "50%" : "500px",
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
          "interactive-el relative flex min-h-[70px] items-center gap-xs rounded-4xl border-none bg-container py-m pr-l pl-xl text-md text-primary"
        )}
        onSubmit={(e) => {
          e.preventDefault();
          console.log(
            "Form onSubmit called, justTranscribed:",
            justTranscribed,
            "prompt:",
            prompt
          );
          // Prevent submission if it just happened after transcription
          if (justTranscribed) {
            console.log("Preventing auto-submission after transcription");
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
            className="relative z-10 flex-1 bg-transparent font-semibold text-lg text-primary placeholder:text-secondary-text"
            name="prompt-input"
            onBlur={() => setIsFocused(false)}
            onBlurCapture={() => setIsFocused(false)}
            onChange={(e) => {
              console.log(
                "Input onChange called, value:",
                e.target.value,
                "justTranscribed:",
                justTranscribed
              );
              setPrompt(e.target.value);
            }}
            onFocus={() => {
              console.log(
                "Input onFocus called, justTranscribed:",
                justTranscribed
              );
              setIsFocused(true);
            }}
            placeholder="Ask anything..."
            ref={inputRef}
            type="text"
            value={prompt}
          />
        )}
        {isFocused ? (
          <div className="flex items-center gap-2">
            <MicrophoneButton
              onRecordingStart={() => setIsRecording(true)}
              onRecordingStop={() => setIsRecording(false)}
              onTranscriptionComplete={handleTranscriptionComplete}
            />
            <IconButton
              className="!rounded-full !border-0"
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
          <div className="flex items-center gap-2">
            <MicrophoneButton
              onRecordingStart={() => setIsRecording(true)}
              onRecordingStop={() => setIsRecording(false)}
              onTranscriptionComplete={handleTranscriptionComplete}
            />
            <span className="text-xs opacity-30">
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
