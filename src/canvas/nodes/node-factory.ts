/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Node, NodeProps } from "@xyflow/react";
import { memo } from "react";

type ReactComponent<Props> =
  | React.ComponentType
  | React.MemoExoticComponent<React.ComponentType<any>>
  | React.FC<Props>;

export function nodeFactory<TData extends Record<string, unknown>>(
  type: string,
  component: ReactComponent<NodeProps<any>>,
  {
    forceProps,
    inspector,
  }: {
    forceProps?: Partial<NodeProps>;
    inspector?: ReactComponent<NodeProps<any>>;
  } = {}
) {
  component = memo(component);
  return {
    type,
    component,
    inspector,
    make: (node: Omit<Node<TData>, "type">) =>
      ({
        type,
        ...forceProps,
        ...node,
      } satisfies Node),
  };
}
