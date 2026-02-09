/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { NodeProps, useStore } from "@xyflow/react";
import { annotationFactory } from "./annotation-factory";

export const peerCursorAnnotations =
  annotationFactory<PeerCursorAnnotationData>(
    "annotation:peerCursor",
    PeerCursorAnnotation,
    { forceProps: { zIndex: 9999 } }
  );

export type PeerCursorAnnotation = ReturnType<
  (typeof peerCursorAnnotations)["make"]
>;

type PeerCursorAnnotationData = {
  name: string;
  color: string;
};

function PeerCursorAnnotation(props: NodeProps) {
  const zoom = useStore((s) => s.transform[2]);

  const { color } = props.data as PeerCursorAnnotationData;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      transform={`scale(${1 / zoom}) translate(12 12)`}
      fill={color}
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
    </svg>
  );
}
