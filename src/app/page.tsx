"use client";

import { useEffect, useState } from "react";
import "@crayonai/react-ui/styles/index.css";
import "tldraw/tldraw.css";
import { HotkeysProvider } from "react-hotkeys-hook";
import {
  DefaultToolbar,
  DefaultToolbarContent,
  type TLUiComponents,
  type TLUiOverrides,
  Tldraw,
  TldrawUiButton,
  TldrawUiIcon,
  useEditor,
} from "tldraw";
import { C1SelectionUI } from "./components/C1SelectionUI";
import { PromptInput } from "./components/PromptInput";
import { FOCUS_PROMPT_EVENT } from "./events";
import { shapeUtils } from "./shapeUtils";

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || "ontouchstart" in window);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
};

const components: Partial<TLUiComponents> = {
  Toolbar: (props) => {
    const editor = useEditor();
    const isDarkMode = editor.user.getIsDarkMode();
    const isMobile = useIsMobile();

    return (
      <div
        style={{
          position: "fixed",
          top: 8,
          left: isMobile ? 8 : "50%",
          right: isMobile ? 8 : "auto",
          transform: isMobile ? "none" : "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: isMobile ? "space-between" : "center",
          width: isMobile ? "calc(100% - 16px)" : "auto",
        }}
      >
        <DefaultToolbar {...props}>
          <DefaultToolbarContent />
        </DefaultToolbar>
        <TldrawUiButton
          onClick={() => {
            const isDark = editor.user.getIsDarkMode();
            editor.user.updateUserPreferences({
              colorScheme: isDark ? "light" : "dark",
            });
          }}
          title="Toggle Dark Mode"
          type="icon"
        >
          <TldrawUiIcon
            icon={isDarkMode ? "sun-icon" : "moon-icon"}
            label="Toggle Dark Mode"
          />
        </TldrawUiButton>
      </div>
    );
  },
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

const assetUrls = {
  icons: {
    "sun-icon": "/sun.svg",
    "moon-icon": "/moon.svg",
  },
};

const Page = () => {
  useEffect(() => {
    // Handle system color scheme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = () => {
      // Only apply system preference if no explicit theme is set (auto mode)
      if (!document.documentElement.hasAttribute("data-theme")) {
        if (mediaQuery.matches) {
          document.documentElement.setAttribute("data-theme", "dark");
        } else {
          document.documentElement.setAttribute("data-theme", "light");
        }
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    // Mobile-specific optimizations
    const isMobile = window.innerWidth <= 768 || "ontouchstart" in window;
    if (isMobile) {
      // Prevent zoom on double-tap
      let lastTouchEnd = 0;
      document.addEventListener(
        "touchend",
        (event) => {
          const now = Date.now();
          if (now - lastTouchEnd <= 300) {
            event.preventDefault();
          }
          lastTouchEnd = now;
        },
        false
      );

      // Prevent context menu on long press
      document.addEventListener("contextmenu", (e) => {
        if (e.target && (e.target as HTMLElement).closest(".tl-canvas")) {
          e.preventDefault();
        }
      });
    }

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
          assetUrls={assetUrls}
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

            // Mobile-specific optimizations
            const isMobile =
              window.innerWidth <= 768 || "ontouchstart" in window;
            if (isMobile) {
              // Mobile optimizations are handled via options above
              console.log("Mobile mode detected, optimizations applied");
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
          options={{
            // Mobile performance optimizations
            coarseDragDistanceSquared: 625, // Larger drag threshold for mobile
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
