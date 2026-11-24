declare module "react-scrollama" {
  import type { ReactElement, ReactNode } from "react";

  export type ScrollDirection = "up" | "down";

  export interface StepEvent<T = unknown> {
    data: T;
    direction: ScrollDirection;
    element: HTMLElement;
    entry: IntersectionObserverEntry;
  }

  export interface StepProgressEvent<T = unknown> {
    data: T;
    element: HTMLElement;
    entry: IntersectionObserverEntry;
    progress: number;
  }

  export interface ScrollamaProps<T = unknown> {
    children: ReactNode;
    offset?: number | string;
    threshold?: number;
    debug?: boolean;
    onStepEnter?: (event: StepEvent<T>) => void;
    onStepExit?: (event: StepEvent<T>) => void;
    onStepProgress?: (event: StepProgressEvent<T>) => void;
  }

  export interface StepProps<T = unknown> {
    data: T;
    children: ReactElement;
  }

  export function Scrollama<T = unknown>(props: ScrollamaProps<T>): ReactElement | null;
  export function Step<T = unknown>(props: StepProps<T>): ReactElement | null;
}
