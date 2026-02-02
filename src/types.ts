export interface FlavorNode {
  name: string;
  description: string;
  children?: Record<string, FlavorNode>;
}

export type FlavorWheelData = Record<string, FlavorNode>;

export interface WheelSegment {
  id: string;
  ring: 1 | 2 | 3;
  name: string;
  description: string;
  startAngle: number;
  endAngle: number;
  parentId?: string;
  /** Top-level category id for color (e.g. vegetale, animale). */
  categoryId: string;
}
