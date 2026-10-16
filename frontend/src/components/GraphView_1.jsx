
import React, { useEffect, useRef } from 'react'
export default function GraphView({ graphData }){
  const ref = useRef(null)
  useEffect(()=>{
    if(!graphData || !graphData.nodes) return
    const canvas = ref.current
    if(!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = 300
    ctx.clearRect(0,0,canvas.width, canvas.height)
    const nodes = graphData.nodes.slice(0, 15)
    const centerX = canvas.width/2
    const centerY = canvas.height/2
    const radius = 100
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    graphData.edges?.slice(0,15).forEach((e)=>{
      const fromIdx = nodes.findIndex(n=>n.id===e.from)
      const toIdx = nodes.findIndex(n=>n.id===e.to)
      if(fromIdx==-1 || toIdx==-1) return
      const a = {x: centerX + radius*Math.cos(fromIdx*0.8), y: centerY + radius*Math.sin(fromIdx*0.8)}
      const b = {x: centerX + radius*Math.cos(toIdx*0.8 + 1), y: centerY + radius*Math.sin(toIdx*0.8 + 1)}
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
      ctx.fillStyle = '#475569'; ctx.font = '9px monospace'
      ctx.fillText(e.label, (a.x+b.x)/2, (a.y+b.y)/2)
    })
    nodes.forEach((node, i)=>{
      const x = centerX + radius*Math.cos(i*0.8)
      const y = centerY + radius*Math.sin(i*0.8)
      const color = node.group==='bug' ? '#ef4444' : node.group==='file' ? '#f59e0b' : '#10b981'
      ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI*2); ctx.fillStyle = color; ctx.fill()
      ctx.fillStyle = 'white'; ctx.font = '10px Inter'
      ctx.fillText(node.label.slice(0,12), x-18, y+30)
    })
  }, [graphData])
  return (
    <div style={{background:'#0f172a', border:'1px solid #1e293b', borderRadius:'12px', padding:'12px', marginTop:'12px'}}>
      <div style={{fontSize:'12px', color:'#94a3b8', marginBottom:'8px'}}>🕸️ LIVE GRAPH TRAVERSAL (FalkorDB Browser jaisa)</div>
      <canvas ref={ref} style={{width:'100%', height:'300px', background:'#020617', borderRadius:'8px'}}></canvas>
      <div style={{display:'flex', gap:'8px', marginTop:'8px'}}>
        <span style={{fontSize:'10px', background:'#ef4444', padding:'2px 6px', borderRadius:'10px'}}>Bug</span>
        <span style={{fontSize:'10px', background:'#f59e0b', color:'black', padding:'2px 6px', borderRadius:'10px'}}>File</span>
        <span style={{fontSize:'10px', background:'#10b981', padding:'2px 6px', borderRadius:'10px'}}>Solution</span>
      </div>
    </div>
  )
}
