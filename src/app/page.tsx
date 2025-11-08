"use client";

import { useEffect } from "react";
import "@crayonai/react-ui/styles/index.css";
import "tldraw/tldraw.css";
import { HotkeysProvider } from "react-hotkeys-hook";
import {
  DefaultToolbar,
  type TLUiComponents,
  type TLUiOverrides,
  Tldraw,
} from "tldraw";
import { C1SelectionUI } from "./components/C1SelectionUI";
import { PromptInput } from "./components/PromptInput";
import { FOCUS_PROMPT_EVENT } from "./events";
import { shapeUtils } from "./shapeUtils";

const components: Partial<TLUiComponents> = {
  Toolbar: () => (
    <div style={{ position: "fixed", top: 8 }}>
      <DefaultToolbar />
    </div>
  ),
};

const overrides: TLUiOverrides = {
  actions: (_editor, actions) => {
    return {
      ...actions,
      "focus-prompt-input": {
        id: "focus-prompt-input",
        label: "Focus Prompt Input",
        kbd: "$k",
        onSelect: () => {
          // Dispatch custom event to focus the prompt input
          window.dispatchEvent(new CustomEvent(FOCUS_PROMPT_EVENT));
        },
      },
    };
  },
};

const Page = () => {
  useEffect(() => {
    // Handle system color scheme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = () => {
      // Only apply system preference if no explicit theme is set (auto mode)
      if (!document.documentElement.hasAttribute("data-theme")) {
        // The CSS media query will automatically handle the variable updates
        // We just need to ensure tldraw is notified if needed
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  return (
    <HotkeysProvider>
      <div
        className="min-h-screen w-full bg-gray-50"
        style={{ position: "fixed", inset: 0 }}
      >
        <Tldraw
          components={components}
          onMount={(editor) => {
            // Set initial color scheme based on editor settings
            const colorScheme = editor.user.getUserPreferences().colorScheme;
            if (colorScheme === "dark") {
              document.documentElement.setAttribute("data-theme", "dark");
            } else if (colorScheme === "light" || !colorScheme) {
              document.documentElement.setAttribute("data-theme", "light");
            } else if (colorScheme === "system") {
              // Remove data-theme attribute to allow system preference to take effect
              document.documentElement.removeAttribute("data-theme");
            }
          }}
          onUiEvent={(event, eventData) => {
            if (event === "color-scheme") {
              const { value: mode } = eventData as {
                value: "light" | "dark" | "system" | undefined;
              };
              if (mode === "dark") {
                document.documentElement.setAttribute("data-theme", "dark");
              } else if (mode === "light" || !mode) {
                // Default to light theme if mode is undefined
                document.documentElement.setAttribute("data-theme", "light");
              } else if (mode === "system") {
                // Remove data-theme attribute to allow system preference to take effect
                document.documentElement.removeAttribute("data-theme");
              }
            }
          }}
          overrides={overrides}
          persistenceKey="c1-canvas"
          shapeUtils={shapeUtils}
        >
          <PromptInput focusEventName={FOCUS_PROMPT_EVENT} />
          <C1SelectionUI />
        </Tldraw>
      </div>
    </HotkeysProvider>
  );
};

export default Page;
