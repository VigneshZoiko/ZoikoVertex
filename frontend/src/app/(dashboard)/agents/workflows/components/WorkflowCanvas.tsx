import React from 'react';
import { Network } from 'lucide-react';

interface GraphData {
  nodes: { id: string; type: string; label: string; x: number; y: number }[];
  edges: { id: string; source: string; target: string; label?: string }[];
}

export default function WorkflowCanvas({ graph }: { graph?: GraphData }) {
  if (!graph) {
    return (
      <div className="h-96 flex flex-col items-center justify-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse">
        <Network className="w-8 h-8 text-[var(--text-muted)] mb-4" />
        <p className="text-[var(--text-secondary)]">Loading logic pathways...</p>
      </div>
    );
  }

  // Determine styles by node type
  const getNodeStyle = (type: string) => {
    switch (type) {
      case 'trigger': return 'bg-indigo-500 text-white border-indigo-600 shadow-indigo-500/30';
      case 'agent': return 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/30';
      case 'condition': return 'bg-amber-500 text-white border-amber-600 shadow-amber-500/30 rotate-45 scale-75';
      case 'human': return 'bg-rose-500 text-white border-rose-600 shadow-rose-500/30';
      case 'action': return 'bg-[var(--sidebar-active)] text-indigo-400 border-indigo-500/20 shadow-indigo-500/10';
      default: return 'bg-gray-500 text-white border-gray-600';
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col h-[500px] overflow-hidden relative group">
      <div className="absolute top-0 left-0 w-full p-4 z-10 bg-gradient-to-b from-[var(--surface)] to-transparent flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Workflow Canvas</h2>
          <p className="text-xs text-[var(--text-secondary)]">Multi-agent orchestration logic</p>
        </div>
      </div>

      <div className="flex-1 w-full relative overflow-auto bg-[var(--surface-hover)]/20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
        <svg className="absolute inset-0 w-[1000px] h-[400px] pointer-events-none">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="rgb(156 163 175)" />
            </marker>
          </defs>
          {graph.edges.map((edge) => {
            const source = graph.nodes.find(n => n.id === edge.source);
            const target = graph.nodes.find(n => n.id === edge.target);
            if (!source || !target) return null;

            // Simple line routing
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Adjust start/end slightly so it doesn't overlap center of nodes
            const padding = 20;
            const startX = source.x + (dx / distance) * padding;
            const startY = source.y + (dy / distance) * padding;
            const endX = target.x - (dx / distance) * (padding + 5);
            const endY = target.y - (dy / distance) * (padding + 5);

            return (
              <g key={edge.id}>
                <line 
                  x1={startX} 
                  y1={startY} 
                  x2={endX} 
                  y2={endY} 
                  stroke="rgb(156 163 175)" 
                  strokeWidth="2" 
                  markerEnd="url(#arrowhead)"
                  className="opacity-50"
                />
                {edge.label && (
                  <text 
                    x={(startX + endX) / 2} 
                    y={(startY + endY) / 2 - 10} 
                    fill="rgb(156 163 175)" 
                    fontSize="10" 
                    textAnchor="middle"
                    className="font-medium"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {graph.nodes.map((node) => (
          <div 
            key={node.id} 
            className={`absolute flex items-center justify-center shadow-lg border-2 rounded-xl text-xs font-semibold px-4 py-2 transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 cursor-pointer ${getNodeStyle(node.type)}`}
            style={{ left: node.x, top: node.y }}
            title={node.label}
          >
            {/* If condition, un-rotate text */}
            <span className={node.type === 'condition' ? '-rotate-45' : ''}>{node.type === 'condition' ? '?' : node.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
