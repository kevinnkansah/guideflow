"use client";

import { useEffect, useState } from "react";
import { createShapeId, track, useEditor } from "tldraw";
import { makeApiCall } from "@/app/helpers/api";
import { createArrowBetweenShapes } from "@/app/utils/connection";
import { extractC1ShapeContext } from "@/app/utils/shapeContext";
import type { C1ComponentShape } from "../../shapes/C1ComponentShape";
import { InputField } from "./InputField";

export const C1SelectionUI = track(() => {
  const editor = useEditor();
  const [selectedC1Shape, setSelectedC1Shape] =
    useState<C1ComponentShape | null>(null);
  const [showInputField, setShowInputField] = useState(false);
  const [inputPosition, setInputPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleSelectionChange = () => {
      const selectedShapes = editor.getSelectedShapes();

      // Find if any selected shape is a C1 component
      const c1Shape = selectedShapes.find(
        (shape): shape is C1ComponentShape => shape.type === "c1-component"
      );

      if (c1Shape && selectedShapes.length === 1) {
        setSelectedC1Shape(c1Shape);
      } else {
        setSelectedC1Shape(null);
        setShowInputField(false);
      }
    };

    // Listen for selection changes and camera movements
    const unsubscribe = editor.store.listen(() => {
      handleSelectionChange();
    });

    // Initial check
    handleSelectionChange();

    return unsubscribe;
  }, [editor]);

  // Handle clicks outside to close input field
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showInputField) {
        // Check if click is outside the input area
        const target = event.target as Element;
        if (!target.closest("[data-c1-input-area]")) {
          setShowInputField(false);
        }
      }
    };

    if (showInputField) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showInputField]);

  const handlePlusButtonClick = () => {
    if (!selectedC1Shape) return;

    // Calculate position for input field (to the right of the shape)
    const shapePageBounds = editor.getShapePageBounds(selectedC1Shape);
    if (!shapePageBounds) return;

    // Convert page coordinates to screen coordinates
    const screenPoint = editor.pageToScreen({
      x: shapePageBounds.maxX + 20, // 20px to the right of the shape
      y: shapePageBounds.center.y - 20, // Centered vertically, adjusted for input height
    });

    setInputPosition({ x: screenPoint.x, y: screenPoint.y });
    setShowInputField(true);
  };

  const handleInputSubmit = async (prompt: string) => {
    if (!selectedC1Shape) return;

    setShowInputField(false);

    try {
      // Calculate position for the new shape (to the right of the selected shape)
      const shapePageBounds = editor.getShapePageBounds(selectedC1Shape);
      if (!shapePageBounds) return;

      const newShapeWidth = 600;
      const newShapeHeight = 300;
      const padding = 50;

      // Position the new shape to the right of the current one
      const newX = shapePageBounds.maxX + padding;
      const newY = shapePageBounds.center.y - newShapeHeight / 2;

      // Create the shape using the low-level API for precise positioning

      const shapeId = createShapeId();
      const additionalContext = extractC1ShapeContext(editor);

      // Create the shape at the calculated position
      editor.createShape({
        id: shapeId,
        type: "c1-component",
        x: newX,
        y: newY,
        props: {
          w: newShapeWidth,
          h: newShapeHeight,
          prompt,
        },
      });

      const originShapeId = selectedC1Shape.id;

      // Make API call to populate the shape with content
      await makeApiCall({
        searchQuery: prompt,
        additionalContext,
        onResponseStreamStart: () => {
          createArrowBetweenShapes(editor, originShapeId, shapeId);

          editor.updateShape({
            id: shapeId,
            type: "c1-component",
            props: { isStreaming: true },
          });
        },
        onResponseUpdate: (response) => {
          editor.updateShape({
            id: shapeId,
            type: "c1-component",
            props: { c1Response: response, isStreaming: true },
          });
        },
        onResponseStreamEnd: () => {
          const currentShape = editor.getShape(shapeId);
          if (!currentShape) return;

          editor.updateShape({
            id: shapeId,
            type: "c1-component",
            props: { ...currentShape.props, isStreaming: false },
          });
        },
      });
    } catch (error) {
      console.error("Failed to create C1 component:", error);
    }
  };

  const handleInputCancel = () => {
    setShowInputField(false);
  };

  if (!selectedC1Shape) {
    return null;
  }

  // Get the shape's screen bounds for positioning the plus button
  const shapePageBounds = editor.getShapePageBounds(selectedC1Shape);
  if (!shapePageBounds) {
    return null;
  }

  // Convert shape bounds to screen coordinates
  const buttonScreenPoint = editor.pageToScreen({
    x: shapePageBounds.maxX,
    y: shapePageBounds.center.y,
  });

  return (
    <>
      {showInputField ? (
        <InputField
          onCancel={handleInputCancel}
          onSubmit={handleInputSubmit}
          x={inputPosition.x}
          y={inputPosition.y}
        />
      ) : (
        // Plus button
        <div
          style={{
            position: "absolute",
            left: buttonScreenPoint.x + 5, // Slightly to the right of the shape edge
            top: buttonScreenPoint.y - 12, // Centered vertically (button height / 2)
            zIndex: 999,
            pointerEvents: "all",
          }}
        >
          <button
            className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-colors duration-200 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={handlePlusButtonClick}
            title="Add connected component"
          >
            <span className="font-bold text-xs leading-none">+</span>
          </button>
        </div>
      )}
    </>
  );
});
