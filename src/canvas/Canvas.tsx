/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { usePresenceContext } from "@/collab/PresenceProvider";
import {
  Background,
  Edge,
  EdgeTypes,
  FitBoundsOptions,
  FitViewOptions,
  Node,
  NodeTypes,
  ReactFlow,
  ReactFlowInstance,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import cn from "classnames";
import { toPng } from "html-to-image";
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PeerCursorAnnotation,
  peerCursorAnnotations,
} from "./annotations/PeerCursorAnnotation";
import styles from "./Canvas.module.scss";
import { useCanvasDataContext } from "./CanvasDataProvider";
import { annotationFactories, nodeFactories } from "./factories";
import FloatingConnectionLine from "./FloatingConnectionLine";
import FloatingEdge from "./FloatingEdge";
import { commentNodes } from "./nodes/CommentNode";

const edgeTypes: EdgeTypes = {
  floating: FloatingEdge,
};

const nodeTypes: NodeTypes = Object.fromEntries(
  Object.values({ ...nodeFactories, ...annotationFactories }).map((n) => [
    n.type,
    n.component as React.ComponentType<any>,
  ])
);

const fitViewOptions: FitViewOptions = {
  padding: { left: 0.1, top: 0.1, right: 0.1, bottom: 0.5 },
  duration: 400,
};

const fitBoundsOptions: FitBoundsOptions = {
  padding: 0.1,
  duration: 400,
};

export type CanvasRef = {
  fit: () => void;
  panTo: (...nodes: Node[]) => void;
  captureScreenshot: () => Promise<string>;
};

type Props = { className?: string };

export const Canvas = forwardRef<CanvasRef, Props>(({ className }, ref) => {
  const reactFlowNodeRef = useRef<HTMLDivElement>(null);
  const [reactFlow, setReactFlow] = useState<ReactFlowInstance>();
  const { nodes, edges, setNodes, setEdges, commentMode } =
    useCanvasDataContext();
  const { peers, setAppData } = usePresenceContext();

  const annotations = useMemo<PeerCursorAnnotation[]>(() => {
    return peers.flatMap((p) => {
      return p.appData?.canvasCursorPos
        ? [
            peerCursorAnnotations.make({
              id: `annotation:peerCursor:${p.uid}`,
              position: {
                x: p.appData?.canvasCursorPos?.x || 0,
                y: p.appData?.canvasCursorPos?.y || 0,
              },
              data: { name: p.displayName, color: p.color },
            }),
          ]
        : [];
    });
  }, [peers]);

  useImperativeHandle(
    ref,
    () => ({
      fit: () => {
        if (!reactFlow) return;
        // this stopped working for some reason
        // reactFlow.fitView(fitViewOptions);
        let bounds = reactFlow.getNodesBounds(reactFlow.getNodes());
        bounds.height += 100;
        reactFlow.fitBounds(bounds, fitBoundsOptions);
      },
      panTo: (...nodes: Node[]) => {
        if (nodes.length === 0 || !reactFlow) return;
        else if (nodes.length === 1) {
          let node = nodes[0];
          reactFlow.setCenter(node.position.x, node.position.y, {
            duration: 400,
            zoom: reactFlow.getZoom(),
          });
        } else {
          let bounds = reactFlow.getNodesBounds(nodes);
          reactFlow.fitBounds(bounds);
        }
      },
      captureScreenshot: async () => {
        if (!reactFlow) throw new Error("ReactFlow not initialized");
        let nodes = reactFlow.getNodes();
        let nodesToHide = [
          ...reactFlowNodeRef.current!.querySelectorAll(".no-screenshot"),
        ].map((n) => [n, document.createElement("span")]);
        nodesToHide.forEach(([n, s]) => n.replaceWith(s));
        let revert = () =>
          nodesToHide.forEach(([n, s]) => void s.replaceWith(n));
        let imageWidth = 800;
        let imageHeight = 800;

        // we calculate a transform for the nodes so that all nodes are visible
        // we then overwrite the transform of the `.react-flow__viewport` element
        // with the style option of the html-to-image library
        const nodesBounds = getNodesBounds(nodes);
        const viewport = getViewportForBounds(
          nodesBounds,
          imageWidth,
          imageHeight,
          0.5,
          2,
          { x: 0, y: 0 }
        );

        let png: string | null = null;
        try {
          png = await toPng(
            reactFlowNodeRef.current!.querySelector(
              ".react-flow__viewport"
            ) as HTMLElement,
            {
              backgroundColor: "#000",
              width: imageWidth,
              height: imageHeight,
              style: {
                width: `${imageWidth}px`,
                height: `${imageHeight}px`,
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              },
            }
          );
        } finally {
          revert();
        }
        return png;
      },
    }),
    [reactFlow]
  );

  function maybeCreateComment(ev: React.MouseEvent) {
    if (!commentMode) return;
    let position = reactFlow?.screenToFlowPosition({
      x: ev.clientX,
      y: ev.clientY,
    }) || { x: 0, y: 0 };
    let newNode = commentNodes.make({
      id: crypto.randomUUID(),
      selected: true,
      data: { resolved: false, messages: [] },
      position,
    });
    setNodes((n) => [...n, newNode]);
  }

  return (
    <div
      className={cn(styles.canvas, className, {
        [styles.isCommentMode]: commentMode,
      })}
    >
      <ReactFlow
        ref={reactFlowNodeRef}
        onInit={(reactFlow) =>
          setReactFlow(reactFlow as unknown as ReactFlowInstance<Node, Edge>)
        }
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        nodes={annotations.length ? [...annotations, ...nodes] : nodes}
        edges={edges}
        nodeOrigin={[0.5, 0.5]}
        onNodesChange={(chg) => {
          let onlyAnnotations = !chg.find(
            (c) => "id" in c && !c.id.startsWith("annotation:"),
          );
          if (onlyAnnotations) return;
          setNodes((n) => applyNodeChanges(chg, n));
        }}
        onEdgesChange={(chg) => setEdges((e) => applyEdgeChanges(chg, e))}
        onConnect={(params) => setEdges((e) => addEdge(params, e))}
        onPaneMouseMove={(ev) => {
          let { x, y } = reactFlow?.screenToFlowPosition({
            x: ev.clientX,
            y: ev.clientY,
          }) || { x: 0, y: 0 };
          setAppData({ canvasCursorPos: { x, y } });
        }}
        onNodeClick={(ev, node) => {
          node.type !== commentNodes.type && maybeCreateComment(ev);
        }}
        onPaneClick={(ev) => maybeCreateComment(ev)}
        onPaneMouseLeave={() => setAppData({ canvasCursorPos: null })}
        defaultEdgeOptions={{ type: "floating" }}
        colorMode="dark"
        panOnScroll={true}
        selectNodesOnDrag={true}
        connectionLineComponent={FloatingConnectionLine}
        fitView
        fitViewOptions={{ ...fitViewOptions, duration: 0 }} // no animation on first fit
      >
        <Background bgColor="var(--gray-2)" color="var(--gray-6)" size={2} />
      </ReactFlow>
    </div>
  );
});
