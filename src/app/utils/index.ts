// Platform detection utilities

// C1 Shape management utilities
export {
  type C1ShapeCreationOptions,
  createC1ComponentShape,
} from "./c1ShapeManager";
export { isMac } from "./platform";

// Shape context utilities
export { extractC1ShapeContext } from "./shapeContext";
// Shape positioning utilities
export {
  centerCameraOnShape,
  getOptimalShapePosition,
  type Position,
  type ShapePositionOptions,
} from "./shapePositioning";
