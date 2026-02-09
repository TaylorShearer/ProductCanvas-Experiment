/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Avatar } from "@/auth/Avatar";
import { Tooltip } from "@radix-ui/themes";
import cn from "classnames";
import styles from "./PeerFacePile.module.scss";
import { PeerList } from "./PresenceProvider";

export function PeerFacePile({
  peers,
  connected,
  className,
}: {
  peers: PeerList;
  className?: string;
  connected?: boolean;
}) {
  return (
    <div
      className={cn(styles.pile, className)}
      style={connected === false ? { opacity: 0.5 } : {}}
    >
      {(peers || []).map(({ uid, photoURL, displayName, color }) => (
        <Tooltip key={uid} content={displayName}>
          <Avatar
            className={styles.peer}
            src={photoURL}
            displayName={displayName || ""}
            style={{ ["--user-color" as any]: color }}
          />
        </Tooltip>
      ))}
    </div>
  );
}
