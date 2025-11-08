import { C1Component, ThemeProvider } from "@thesysai/genui-sdk";
import clsx from "clsx";
import { BaseBoxShapeUtil, HTMLContainer, type TLResizeInfo } from "tldraw";
import { AiIcon } from "../components/AiIcon";
import { ResizableContainer } from "../components/ResizableContainer";
import type { C1ComponentShape } from "../shapes/C1ComponentShape";

export class C1ComponentShapeUtil extends BaseBoxShapeUtil<C1ComponentShape> {
  static override type = "c1-component" as const;

  getDefaultProps(): C1ComponentShape["props"] {
    return { w: 300, h: 150 };
  }

  // Override onResize to allow only width resizing
  override onResize = (
    shape: C1ComponentShape,
    info: TLResizeInfo<C1ComponentShape>
  ) => {
    const { scaleX } = info;

    // Calculate new width based on horizontal scale
    const newWidth = Math.max(400, shape.props.w * scaleX); // Minimum width of 400px

    return {
      props: {
        ...shape.props,
        w: newWidth,
        // Keep height unchanged - don't apply scaleY
        h: shape.props.h,
      },
    };
  };

  component = (shape: C1ComponentShape) => {
    const isDarkMode = this.editor.user.getIsDarkMode();
    // Ensure we always have a valid theme mode for ThemeProvider
    const themeMode = isDarkMode === true ? "dark" : "light";

    if (!shape.props.c1Response) {
      return (
        <HTMLContainer>
          <div
            className={clsx(
              "flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border border-[#7F56D917] bg-[#7F56D914] text-primary outline-[#0000000F]"
            )}
          >
            <AiIcon />
            <p className="text-md">Magic will happen here</p>
          </div>
        </HTMLContainer>
      );
    }

    return (
      <HTMLContainer
        className="flex flex-col gap-s"
        style={{
          overflow: "visible",
          pointerEvents: "all",
        }}
      >
        <ResizableContainer
          isStreaming={!!shape.props.isStreaming}
          shape={shape}
        >
          <ThemeProvider mode={themeMode}>
            {shape.props.prompt && (
              <div className="line-clamp-1 min-h-[30px] w-fit max-w-full overflow-hidden rounded-md border border-default bg-container px-m py-xs">
                {shape.props.prompt}
              </div>
            )}
            <C1Component
              c1Response={shape.props.c1Response}
              isStreaming={!!shape.props.isStreaming}
              key={shape.id}
            />
          </ThemeProvider>
        </ResizableContainer>
      </HTMLContainer>
    );
  };

  indicator(shape: C1ComponentShape) {
    return <rect height={shape.props.h} width={shape.props.w} />;
  }
}
