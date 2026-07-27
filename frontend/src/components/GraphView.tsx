// Prereq graph: layered layout (BFS depth from root) rendered with React Flow.
// OR-groups share an edge hue per AND-group index so alternatives read as one
// visual bundle; postreqs hang below the root.

import { useEffect, useMemo, useState } from 'react'
import ReactFlow, { Background, Controls, MarkerType } from 'reactflow'
import type { Edge, Node } from 'reactflow'
import { api } from '../api'
import type { GraphPayload } from '../api'

const GROUP_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#64748b']

function layout(payload: GraphPayload): { nodes: Node[]; edges: Edge[] } {
  const { root } = payload
  const prereqEdges = payload.edges.filter((e) => e.to !== undefined)

  // Depth of each node above the root (prereq side): BFS over reversed edges.
  const depth = new Map<string, number>([[root, 0]])
  let frontier = [root]
  while (frontier.length) {
    const next: string[] = []
    for (const code of frontier) {
      for (const e of prereqEdges) {
        if (e.to === code && !depth.has(e.from)) {
          depth.set(e.from, (depth.get(code) ?? 0) + 1)
          next.push(e.from)
        }
      }
    }
    frontier = next
  }

  const levels = new Map<number, string[]>()
  for (const n of payload.nodes) {
    const d = n.role === 'postreq' ? -1 : (depth.get(n.code) ?? 1)
    levels.set(d, [...(levels.get(d) ?? []), n.code])
  }

  const nodes: Node[] = []
  for (const [d, codes] of levels) {
    codes.forEach((code, i) => {
      const info = payload.nodes.find((n) => n.code === code)!
      const width = 170
      nodes.push({
        id: code,
        position: {
          x: (i - (codes.length - 1) / 2) * (width + 30),
          y: 120 * -d + (d === -1 ? 40 : 0),
        },
        data: {
          label: (
            <div className="text-center">
              <div className="font-semibold">{info.display_code}</div>
              <div className="max-w-[150px] text-[10px] leading-tight text-slate-500">{info.title}</div>
            </div>
          ),
        },
        style: {
          borderColor:
            info.role === 'root' ? '#0284c7' : info.role === 'postreq' ? '#10b981' : '#cbd5e1',
          borderWidth: info.role === 'root' ? 2 : 1,
          borderRadius: 8,
          padding: 6,
          background: info.role === 'missing' ? '#fee2e2' : 'white',
          fontSize: 12,
        },
      })
    })
  }

  const edges: Edge[] = payload.edges.map((e, i) => ({
    id: `${e.from}-${e.to}-${i}`,
    source: e.from,
    target: e.to,
    animated: e.to === root || e.from === root,
    style: { stroke: GROUP_COLORS[e.group % GROUP_COLORS.length], strokeWidth: 1.6 },
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
  }))
  return { nodes, edges }
}

export default function GraphView({ code }: { code: string }) {
  const [payload, setPayload] = useState<GraphPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPayload(null)
    setError(null)
    api
      .courseGraph(code)
      .then(setPayload)
      .catch((e) => setError(String(e.message ?? e)))
  }, [code])

  const graph = useMemo(() => (payload ? layout(payload) : null), [payload])

  if (error) return <p className="p-4 text-sm text-red-600">graph failed: {error}</p>
  if (!graph) return <p className="p-4 text-sm text-slate-400">loading graph…</p>
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="h-[420px]">
        <ReactFlow nodes={graph.nodes} edges={graph.edges} fitView proOptions={{ hideAttribution: true }}>
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <p className="border-t border-slate-100 px-2 py-1 text-[10px] text-slate-400">
        Arrows point from prerequisite to unlocked course. Edge colors group OR-alternatives;
        green-bordered nodes are what this course unlocks. Red = referenced course not in the
        current catalog.
      </p>
    </div>
  )
}
