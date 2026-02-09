/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { MiniAppHost } from "@/miniapp/MiniAppHost";
import { NodeProps } from "@xyflow/react";
import styles from "./MiniAppInspector.module.scss";
import { MiniAppNodeData } from "./MiniAppNode";

export function MiniAppInspector(props: NodeProps) {
  const { appCode } = props.data as MiniAppNodeData;

  return (
    <div className={styles.inspector}>
      <MiniAppHost
        namespace={props.id}
        className={styles.preview}
        appCode={appCode}
      />
    </div>
  );
}
