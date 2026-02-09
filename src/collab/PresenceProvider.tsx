/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuthContext } from "@/auth/AuthProvider";
import { PresenceAppData } from "@/document/model-and-db";
import { db } from "@/firebase";
import {
  child,
  DatabaseReference,
  onDisconnect,
  onValue,
  ref,
  set,
} from "firebase/database";
import {
  createContext,
  SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export const PEER_COLORS = [
  "#C58AF9",
  "#5BB974",
  "#8AB4F8",
  "#FF8BCB",
  "#FCAD70",
  "#FCC934",
  "#F28B82",
];

type RawPresenceDatum = {
  uid: string;
  displayName: string;
  photoURL: string;
  clientIds: string[];
  appData?: PresenceAppData;
};

export type PresenceContext = {
  peers: PeerList;
  clientId: string;
  selfClientIds: string[];
  connected: boolean;
  appData: PresenceAppData | undefined;
  setAppData: React.Dispatch<SetStateAction<PresenceAppData | undefined>>;
};

type RawPresenceData = {
  [uid: string]: RawPresenceDatum;
};

export type PeerList = Array<
  RawPresenceDatum & {
    color: string;
  }
>;

const PresenceContext = createContext<PresenceContext>({} as PresenceContext);

export function usePresenceContext() {
  return useContext(PresenceContext);
}

export function PresenceProvider({
  presenceRef,
  clientId,
  children,
}: React.PropsWithChildren<{
  presenceRef: DatabaseReference;
  clientId?: string;
}>) {
  const defaultClientId = useMemo(() => crypto.randomUUID(), []);
  clientId ||= defaultClientId;

  const [appData, setAppData] = useState<PresenceAppData | undefined>();
  const { user } = useAuthContext();
  const [connected, setConnected] = useState(true);
  const [rawPresenceData, setRawPresenceData] = useState<RawPresenceData>({});
  const clientRef = child(presenceRef, String(clientId));
  const clearPresenceTimeoutRef = useRef<any>();

  useEffect(() => {
    if (!user) return;

    const reconnectUnsubscribe = onValue(ref(db, ".info/connected"), (ss) => {
      const connected = !!ss.val();
      setConnected(connected);
      if (!connected) {
        return;
      }

      clearPresenceTimeoutRef.current &&
        clearTimeout(clearPresenceTimeoutRef.current);
      let obj = {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL || "",
      };
      if (appData !== undefined) {
        (obj as any).appData = appData;
      }
      set(clientRef, obj);
    });

    const onDisconnectRef = onDisconnect(clientRef);
    onDisconnectRef.set(null);

    return () => {
      reconnectUnsubscribe();
      clearPresenceTimeoutRef.current = setTimeout(
        () => onDisconnectRef.cancel().then(() => set(clientRef, null)),
        100
      );
    };
  }, [user, appData, String(clientRef)]);

  // Observe presence state from RTDB
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    let unsub = onValue(presenceRef, (ss) => {
      let rawPresenceData: RawPresenceData = {};
      for (let [clientId, val] of Object.entries(ss.val() || {})) {
        let { uid, ...user } = val as any;
        rawPresenceData[uid] = {
          uid,
          ...user,
          clientIds: [...(rawPresenceData?.[uid]?.clientIds || []), clientId],
        };
      }
      timeout && clearTimeout(timeout);
      timeout = setTimeout(() => {
        setRawPresenceData(rawPresenceData);
      }, 10);
    });
    return () => unsub();
  }, [String(presenceRef)]);

  const peers: PeerList = Object.values(rawPresenceData)
    .filter((u) => u.uid !== user?.uid)
    .sort((a, b) => a.uid.localeCompare(b.uid))
    .map((u, idx) => ({
      ...(u as RawPresenceDatum),
      color: PEER_COLORS[idx % PEER_COLORS.length],
    }));

  const selfClientIds = rawPresenceData?.[user?.uid || ""]?.clientIds || [];

  return (
    <PresenceContext.Provider
      value={{ peers, clientId, selfClientIds, connected, appData, setAppData }}
    >
      {children}
    </PresenceContext.Provider>
  );
}
