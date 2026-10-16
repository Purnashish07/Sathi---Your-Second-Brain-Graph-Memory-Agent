
import React, { useEffect, useRef, useCallback } from 'react'

const COLORS = {
  user:     '#3b82f6',
  bug:      '#ef4444',
  file:     '#f59e0b',
  solution: '#10b981',
  tag:      '#a855f7',
}

const NODE_RADIUS = { user: 22, bug: 18, file: 18, solution: 16, tag: 14 }

export default function GraphView({ graphData }) {
  const canvasRef = useRef(null)
  const nodesRef  = useRef([])
  const frameRef  = useRef(null)
  const hoverRef  = useRef(null)
  const mouseRef  = useRef({ x: 0, y: 0 })

  // ── Initialise simulation nodes from graphData ─────────────────────
  useEffect(() => {
    if (!graphData?.nodes?.length) { nodesRef.current = []; return }
    const W = canvasRef.current?.offsetWidth  || 700
    const H = canvasRef.current?.offsetHeight || 420

    const simNodes = graphData.nodes.map((n, i) => {
      const angle = (i / graphData.nodes.length) * Math.PI * 2
      const r = Math.min(W, H) * 0.3
      return {
        ...n,
        x:  W / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 40,
        y:  H / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 40,
        vx: 0, vy: 0,
      }
    })
    nodesRef.current = simNodes
  }, [graphData])

  // ── Mouse tracking for hover ───────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }

    const nodes = nodesRef.current
    let found = null
    for (const n of nodes) {
      const r = NODE_RADIUS[n.group] || 16
      if (Math.hypot(n.x - mouseRef.current.x, n.y - mouseRef.current.y) < r + 4) {
        found = n; break
      }
    }
    hoverRef.current = found
    canvasRef.current.style.cursor = found ? 'pointer' : 'default'
  }, [])

  // ── Animation loop ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let tick = 0

    function frame() {
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      canvas.width  = W * (window.devicePixelRatio || 1)
      canvas.height = H * (window.devicePixelRatio || 1)
      ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0)

      const nodes = nodesRef.current
      const edges = graphData?.edges || []
      const nodeMap = {}
      nodes.forEach(n => { nodeMap[n.id] = n })

      // ── Physics: repulsion + attraction + damping ────────────────
      const REPULSION = 1200
      const ATTRACTION = 0.005
      const DAMPING = 0.88
      const CENTER_PULL = 0.001

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const dist = Math.max(Math.hypot(dx, dy), 1)
          const force = REPULSION / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          nodes[i].vx -= fx; nodes[i].vy -= fy
          nodes[j].vx += fx; nodes[j].vy += fy
        }
      }

      edges.forEach(e => {
        const a = nodeMap[e.from], b = nodeMap[e.to]
        if (!a || !b) return
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.hypot(dx, dy) || 1
        const target = 90
        const force = (dist - target) * ATTRACTION
        const fx = (dx / dist) * force, fy = (dy / dist) * force
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy
      })

      nodes.forEach(n => {
        n.vx += (W / 2 - n.x) * CENTER_PULL
        n.vy += (H / 2 - n.y) * CENTER_PULL
        n.vx *= DAMPING; n.vy *= DAMPING
        n.x += n.vx; n.y += n.vy
        n.x = Math.max(30, Math.min(W - 30, n.x))
        n.y = Math.max(30, Math.min(H - 30, n.y))
      })

      // ── Draw ─────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H)

      // Background grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.15)'
      ctx.lineWidth = 0.5
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      // Edges
      edges.forEach(e => {
        const a = nodeMap[e.from], b = nodeMap[e.to]
        if (!a || !b) return
        const isHover = hoverRef.current && (hoverRef.current.id === e.from || hoverRef.current.id === e.to)
        const alpha = isHover ? 0.9 : 0.35
        const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
        gradient.addColorStop(0, COLORS[a.group] || '#6366f1')
        gradient.addColorStop(1, COLORS[b.group] || '#6366f1')
        ctx.strokeStyle = gradient
        ctx.globalAlpha = alpha
        ctx.lineWidth = isHover ? 2.5 : 1.2
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()

        // Edge label
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
        ctx.globalAlpha = isHover ? 0.95 : 0.45
        ctx.fillStyle = '#94a3b8'
        ctx.font = `${isHover ? 10 : 8}px "JetBrains Mono", monospace`
        ctx.textAlign = 'center'
        ctx.fillText(e.label, mx, my - 4)
        ctx.globalAlpha = 1
      })

      // Nodes
      nodes.forEach(n => {
        const r = NODE_RADIUS[n.group] || 16
        const color = COLORS[n.group] || '#6366f1'
        const isHover = hoverRef.current?.id === n.id

        // Glow
        const glowPulse = 6 + Math.sin(tick * 0.03 + n.x * 0.1) * 3
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + glowPulse, 0, Math.PI * 2)
        const grd = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r + glowPulse)
        grd.addColorStop(0, color + (isHover ? '60' : '30'))
        grd.addColorStop(1, color + '00')
        ctx.fillStyle = grd
        ctx.fill()

        // Main circle
        ctx.beginPath()
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
        ctx.fillStyle = color + (isHover ? 'ff' : 'cc')
        ctx.fill()
        ctx.strokeStyle = isHover ? '#ffffff' : color
        ctx.lineWidth = isHover ? 2.5 : 1
        ctx.stroke()

        // Icon inside circle
        ctx.fillStyle = '#ffffff'
        ctx.font = `${r * 0.7}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const icon = { user: '👤', bug: '🐛', file: '📄', solution: '✅', tag: '#' }[n.group] || '●'
        ctx.fillText(icon, n.x, n.y)

        // Label below
        ctx.fillStyle = isHover ? '#e2e8f0' : '#94a3b8'
        ctx.font = `${isHover ? 11 : 9}px "Inter", sans-serif`
        ctx.textBaseline = 'top'
        const label = n.label.length > 20 ? n.label.slice(0, 18) + '…' : n.label
        ctx.fillText(label, n.x, n.y + r + 5)
      })

      // Hover tooltip
      if (hoverRef.current) {
        const n = hoverRef.current
        const tx = n.x + 30, ty = n.y - 20
        const text = n.label
        ctx.font = '11px "Inter", sans-serif'
        const tw = ctx.measureText(text).width + 16
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
        ctx.strokeStyle = COLORS[n.group] || '#6366f1'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(tx - 4, ty - 14, tw, 24, 6)
        ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#e2e8f0'
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
        ctx.fillText(text, tx + 4, ty)
      }

      tick++
      frameRef.current = requestAnimationFrame(frame)
    }

    frameRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(frameRef.current)
  }, [graphData])

  return (
    <div style={{ background: 'rgba(2, 6, 23, 0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>🕸️ Live Graph Traversal</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Force-directed • {graphData?.nodes?.length || 0} nodes • {graphData?.edges?.length || 0} edges</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.entries(COLORS).map(([k, c]) => (
            <span key={k} style={{ fontSize: 9, background: c + '30', color: c, padding: '2px 8px', borderRadius: 10, border: `1px solid ${c}40`, textTransform: 'capitalize' }}>{k}</span>
          ))}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        style={{ width: '100%', flex: 1, minHeight: 380, background: 'rgba(2, 6, 23, 0.6)', borderRadius: 12, border: '1px solid rgba(51, 65, 85, 0.3)' }}
      />
    </div>
  )
}
