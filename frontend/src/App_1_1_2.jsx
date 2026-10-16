
import React, { useState, useEffect } from 'react'
import axios from 'axios'
const API = 'http://localhost:8000'
export default function App(){
  const [userId, setUserId] = useState('dev123')
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState(null)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({})
  const [rememberForm, setRememberForm] = useState({bug:'', file:'', solution:''})
  const [loading, setLoading] = useState(false)
  const fetchStats = async()=>{
    try{ const r = await axios.get(`${API}/stats`); setStats(r.data)}catch{}
  }
  const fetchHistory = async()=>{
    try{ const r = await axios.get(`${API}/history/${userId}`); setHistory(r.data.history || []) }catch{}
  }
  useEffect(()=>{ fetchStats(); fetchHistory(); }, [userId])
  const handleAsk = async()=>{
    if(!query.trim()) return
    setLoading(true)
    try{ const r = await axios.post(`${API}/ask`, {user_id: userId, query}); setAnswer(r.data); fetchStats() }catch(e){ setAnswer({answer: 'Backend connect nahi ho raha. '+ e.message}) }
    setLoading(false)
  }
  const handleRemember = async()=>{
    if(!rememberForm.bug) return
    setLoading(true)
    try{ await axios.post(`${API}/remember`, {user_id: userId, bug: rememberForm.bug, file: rememberForm.file, solution: rememberForm.solution}); setRememberForm({bug:'', file:'', solution:''}); fetchHistory(); fetchStats(); alert('Memory saved to FalkorDB Graph!') }catch(e){ alert('Error: '+e.message) }
    setLoading(false)
  }
  const seedDemo = async()=>{
    await axios.get(`${API}/demo-seed/${userId}`); fetchHistory(); fetchStats(); alert('Demo data seeded! Ab auth ya cors search karo.')
  }
  return (
    <div style={{display:'flex', height:'100vh', fontFamily:'Inter,sans-serif', background:'#0a0a0f', color:'#e2e8f0'}}>
      <div style={{width:'340px', background:'#11111b', borderRight:'1px solid #1e293b', padding:'20px', overflowY:'auto'}}>
        <h2 style={{fontSize:'22px', marginBottom:'6px'}}>🧠 Sathi</h2>
        <p style={{fontSize:'12px', color:'#94a3b8', marginBottom:'20px'}}>Graph Memory Agent | FalkorDB<br/>Track 02: Memory & Coordination</p>
        <label style={{fontSize:'12px'}}>User ID</label>
        <input value={userId} onChange={e=>setUserId(e.target.value)} style={{width:'100%', padding:'8px', background:'#1e293b', border:'1px solid #334155', borderRadius:'6px', color:'white', marginBottom:'12px'}}/>
        <div style={{background:'#1e293b', padding:'12px', borderRadius:'8px', marginBottom:'16px'}}>
          <div style={{fontSize:'11px', color:'#94a3b8'}}>GRAPH STATUS</div>
          <div style={{fontSize:'13px', marginTop:'4px'}}>Mode: {stats.mode || '...'}</div>
          <div style={{fontSize:'13px'}}>Nodes: {stats.nodes || 0} | Edges: {stats.edges || 0}</div>
        </div>
        <h3 style={{fontSize:'14px', marginBottom:'8px'}}>💾 Naya Bug Yaad Dilao</h3>
        <input placeholder="Bug: JWT expired" value={rememberForm.bug} onChange={e=>setRememberForm({...rememberForm, bug:e.target.value})} style={{width:'100%', padding:'8px', marginBottom:'6px', background:'#1e293b', border:'1px solid #334155', borderRadius:'6px', color:'white', fontSize:'12px'}}/>
        <input placeholder="File: auth.js" value={rememberForm.file} onChange={e=>setRememberForm({...rememberForm, file:e.target.value})} style={{width:'100%', padding:'8px', marginBottom:'6px', background:'#1e293b', border:'1px solid #334155', borderRadius:'6px', color:'white', fontSize:'12px'}}/>
        <input placeholder="Solution?" value={rememberForm.solution} onChange={e=>setRememberForm({...rememberForm, solution:e.target.value})} style={{width:'100%', padding:'8px', marginBottom:'8px', background:'#1e293b', border:'1px solid #334155', borderRadius:'6px', color:'white', fontSize:'12px'}}/>
        <button onClick={handleRemember} style={{width:'100%', padding:'8px', background:'#6366f1', border:'none', borderRadius:'6px', color:'white', cursor:'pointer', fontWeight:'600'}}>Save to Graph</button>
        <button onClick={seedDemo} style={{width:'100%', marginTop:'10px', padding:'6px', background:'#0f172a', border:'1px dashed #334155', borderRadius:'6px', color:'#94a3b8', cursor:'pointer', fontSize:'12px'}}>Seed Demo Data</button>
        <h3 style={{fontSize:'13px', marginTop:'20px', marginBottom:'8px'}}>Recent ({history.length})</h3>
        {history.slice(0,5).map((h,i)=>(<div key={i} style={{background:'#1e293b', padding:'8px', borderRadius:'6px', marginBottom:'6px', fontSize:'11px'}}><div style={{fontWeight:'600'}}>{h.bug || h.raw || ''}</div><div style={{color:'#94a3b8'}}>{h.solution || h.file || ''}</div></div>))}
      </div>
      <div style={{flex:1, display:'flex', flexDirection:'column'}}>
        <div style={{padding:'20px', borderBottom:'1px solid #1e293b'}}><h1 style={{fontSize:'20px'}}>Ask your Second Brain</h1><p style={{fontSize:'13px', color:'#94a3b8'}}>Cross-session memory + explainable path</p></div>
        <div style={{flex:1, padding:'20px', overflowY:'auto'}}>
          {!answer && <div style={{textAlign:'center', marginTop:'60px', color:'#475569'}}><div style={{fontSize:'48px'}}>🕸️</div><div>Try: auth fail / cors error / react state</div></div>}
          {answer && <div><div style={{background:'#11111b', border:'1px solid #1e293b', borderRadius:'12px', padding:'16px', whiteSpace:'pre-wrap', fontSize:'14px'}}>{answer.answer}</div>{answer.cypher_used && <div style={{marginTop:'12px', background:'#0f172a', padding:'12px', borderRadius:'8px'}}><code style={{fontSize:'11px', color:'#a5b4fc'}}>{answer.cypher_used}</code></div>}</div>}
        </div>
        <div style={{padding:'16px', borderTop:'1px solid #1e293b', display:'flex', gap:'10px'}}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter' && handleAsk()} placeholder="Pucho: mera auth wala bug yaad hai?" style={{flex:1, padding:'12px 16px', background:'#11111b', border:'1px solid #334155', borderRadius:'10px', color:'white'}}/>
          <button onClick={handleAsk} disabled={loading} style={{padding:'12px 20px', background:'#6366f1', border:'none', borderRadius:'10px', color:'white', fontWeight:'600', cursor:'pointer'}}>{loading?'...':'Ask Graph 🧠'}</button>
        </div>
      </div>
    </div>
  )
}
