
import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import GraphView from './components/GraphView'

const API = 'http://localhost:8000'

/* ═══════════════════════════════════════════════════════════════════════
   GLOBAL STYLES — injected once
   ═══════════════════════════════════════════════════════════════════ */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,sans-serif;background:#06060f;color:#e2e8f0}
    ::-webkit-scrollbar{width:5px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
    ::-webkit-scrollbar-thumb:hover{background:#475569}
    input:focus,textarea:focus{outline:none;border-color:#6366f1 !important;box-shadow:0 0 0 3px rgba(99,102,241,0.15) !important}
    button{cursor:pointer;transition:all .2s ease}
    button:hover{filter:brightness(1.12);transform:translateY(-1px)}
    button:active{transform:translateY(0)}

    @keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
    @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(99,102,241,0.3)}50%{box-shadow:0 0 24px rgba(99,102,241,0.5)}}
    @keyframes slideRight{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
    @keyframes growBar{from{width:0}to{width:var(--bar-width)}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes breathe{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.4)}50%{box-shadow:0 0 0 8px rgba(99,102,241,0)}}

    .card{background:rgba(15,23,42,0.6);backdrop-filter:blur(12px);border:1px solid rgba(51,65,85,0.4);border-radius:12px;transition:all .3s ease}
    .card:hover{border-color:rgba(99,102,241,0.3);box-shadow:0 4px 24px rgba(0,0,0,0.3)}
    .shimmer{background:linear-gradient(90deg,rgba(99,102,241,0.05) 25%,rgba(99,102,241,0.1) 50%,rgba(99,102,241,0.05) 75%);background-size:200% 100%;animation:shimmer 2s infinite}
  `}</style>
)

/* ═══════════════════════════════════════════════════════════════════════
   TYPEWRITER HOOK
   ═══════════════════════════════════════════════════════════════════ */
function useTypewriter(text, speed = 18) {
  const [display, setDisplay] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!text) { setDisplay(''); setDone(false); return }
    setDisplay(''); setDone(false)
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplay(text.slice(0, i))
      if (i >= text.length) { clearInterval(id); setDone(true) }
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return [display, done]
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════ */
export default function App() {
  // ── State ──────────────────────────────────────────────────────────
  const [userId, setUserId] = useState('dev123')
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState(null)
  const [history, setHistory] = useState([])
  const [stats, setStats] = useState({})
  const [rememberForm, setRememberForm] = useState({ bug: '', file: '', solution: '' })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('ask')
  const [graphData, setGraphData] = useState(null)
  const [detectiveData, setDetectiveData] = useState(null)
  const [detectiveLoading, setDetectiveLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const inputRef = useRef(null)

  const [typedAnswer, typingDone] = useTypewriter(answer?.answer || '', 14)

  // ── Data Fetching ──────────────────────────────────────────────────
  const fetchStats   = useCallback(async () => { try { const r = await axios.get(`${API}/stats`);                setStats(r.data)              } catch {} }, [])
  const fetchHistory = useCallback(async () => { try { const r = await axios.get(`${API}/history/${userId}`);    setHistory(r.data.history||[]) } catch {} }, [userId])
  const fetchGraph   = useCallback(async () => { try { const r = await axios.get(`${API}/graph/${userId}`);      setGraphData(r.data)          } catch {} }, [userId])

  useEffect(() => { fetchStats(); fetchHistory() }, [fetchStats, fetchHistory])
  useEffect(() => { if (activeTab === 'graph') fetchGraph() }, [activeTab, fetchGraph])

  const fetchDetective = useCallback(async () => {
    setDetectiveLoading(true)
    try { const r = await axios.get(`${API}/analyze/${userId}`); setDetectiveData(r.data) } catch {}
    setDetectiveLoading(false)
  }, [userId])

  useEffect(() => { if (activeTab === 'detective') fetchDetective() }, [activeTab, fetchDetective])

  // ── Handlers ───────────────────────────────────────────────────────
  const handleAsk = async () => {
    if (!query.trim()) return
    setLoading(true); setAnswer(null)
    try {
      const r = await axios.post(`${API}/ask`, { user_id: userId, query })
      setAnswer(r.data); fetchStats(); fetchGraph()
    } catch (e) { setAnswer({ answer: 'Backend connect nahi ho raha. ' + e.message }) }
    setLoading(false)
  }

  const handleRemember = async () => {
    if (!rememberForm.bug) return
    setLoading(true)
    try {
      await axios.post(`${API}/remember`, { user_id: userId, bug: rememberForm.bug, file: rememberForm.file, solution: rememberForm.solution })
      setRememberForm({ bug: '', file: '', solution: '' })
      fetchHistory(); fetchStats(); fetchGraph()
      setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 2500)
    } catch {}
    setLoading(false)
  }

  const seedDemo = async () => {
    setLoading(true)
    await axios.get(`${API}/demo-seed/${userId}`)
    fetchHistory(); fetchStats(); fetchGraph()
    setLoading(false)
  }

  const importGithub = async () => {
    setLoading(true)
    try { await axios.post(`${API}/github/import`, { user_id: userId }); fetchHistory(); fetchStats(); fetchGraph() } catch {}
    setLoading(false)
  }

  // ── Tab config ─────────────────────────────────────────────────────
  const tabs = [
    { id: 'ask',       icon: '🧠', label: 'Ask Brain' },
    { id: 'graph',     icon: '🕸️', label: 'Graph Canvas' },
    { id: 'detective', icon: '🔍', label: 'Detective' },
  ]

  // ═══════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <>
      <GlobalStyles />
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
        <div style={{
          width: 320, minWidth: 320, background: 'rgba(13,13,26,0.95)',
          borderRight: '1px solid rgba(51,65,85,0.3)', display: 'flex',
          flexDirection: 'column', overflowY: 'auto', position: 'relative',
        }}>
          {/* Gradient accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, #6366f1, #a855f7, #ec4899, #6366f1)', backgroundSize: '100% 400%', animation: 'shimmer 4s linear infinite' }} />

          <div style={{ padding: '24px 20px 20px 20px' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, animation: 'breathe 3s infinite' }}>🧠</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Sathi</div>
                <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Graph Memory Agent</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '4px 10px', borderRadius: 6, display: 'inline-block', marginTop: 8, border: '1px solid rgba(99,102,241,0.2)' }}>
              FalkorDB • Track 02: Memory & Coordination
            </div>

            {/* User ID */}
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>User ID</label>
              <input value={userId} onChange={e => setUserId(e.target.value)} style={{
                width: '100%', padding: '8px 12px', marginTop: 4, background: 'rgba(30,41,59,0.5)',
                border: '1px solid rgba(51,65,85,0.5)', borderRadius: 8, color: '#e2e8f0', fontSize: 13,
              }} />
            </div>

            {/* Graph Stats */}
            <div className="card" style={{ padding: 14, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Graph Status</span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{stats.mode || '...'}</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                <Stat label="Nodes" value={stats.nodes || 0} color="#6366f1" />
                <Stat label="Edges" value={stats.edges || 0} color="#a855f7" />
                <Stat label="Files" value={stats.unique_files || 0} color="#f59e0b" />
                <Stat label="Tags"  value={stats.unique_tags  || 0} color="#10b981" />
              </div>
            </div>

            {/* Remember Form */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>💾</span> Naya Bug Yaad Dilao
              </div>
              <FormInput placeholder="Bug: JWT expired" value={rememberForm.bug} onChange={v => setRememberForm({ ...rememberForm, bug: v })} />
              <FormInput placeholder="File: auth.js" value={rememberForm.file} onChange={v => setRememberForm({ ...rememberForm, file: v })} />
              <FormInput placeholder="Solution: Added refresh token" value={rememberForm.solution} onChange={v => setRememberForm({ ...rememberForm, solution: v })} />
              <button onClick={handleRemember} disabled={loading || !rememberForm.bug} style={{
                width: '100%', padding: '9px 0', marginTop: 4,
                background: saveSuccess ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, fontSize: 13,
                opacity: (!rememberForm.bug) ? 0.5 : 1,
              }}>
                {saveSuccess ? '✓ Saved to Graph!' : loading ? 'Saving…' : 'Save to Graph'}
              </button>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={seedDemo} style={{ flex: 1, padding: '6px 0', background: 'transparent', border: '1px dashed rgba(51,65,85,0.6)', borderRadius: 8, color: '#64748b', fontSize: 11 }}>
                  Seed Demo Data
                </button>
                <button onClick={importGithub} style={{ flex: 1, padding: '6px 0', background: 'transparent', border: '1px dashed rgba(51,65,85,0.6)', borderRadius: 8, color: '#64748b', fontSize: 11 }}>
                  Import GitHub
                </button>
              </div>
            </div>

            {/* Recent History */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>
                Recent ({history.length})
              </div>
              {history.slice(0, 6).map((h, i) => (
                <div key={i} className="card" style={{
                  padding: '8px 10px', marginBottom: 6, borderLeft: '3px solid',
                  borderLeftColor: ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#a855f7', '#ec4899'][i % 6],
                  animation: `fadeInUp .3s ease ${i * 0.05}s both`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{h.bug || h.raw || ''}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{h.solution || h.file || ''}</div>
                </div>
              ))}
              {!history.length && <div style={{ fontSize: 11, color: '#334155', textAlign: 'center', padding: 16 }}>No memories yet. Seed demo data ↑</div>}
            </div>
          </div>
        </div>

        {/* ── MAIN AREA ───────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Top bar + tabs */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(51,65,85,0.3)', background: 'rgba(6,6,15,0.8)', backdropFilter: 'blur(12px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Ask your Second Brain</h1>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Cross-session memory • explainable path • multi-hop reasoning</p>
              </div>
              {answer?.query_time_ms != null && (
                <div style={{ fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(16,185,129,0.2)', animation: 'fadeIn .3s ease' }}>
                  ⚡ {answer.query_time_ms}ms
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 500,
                  background: activeTab === t.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(30,41,59,0.4)',
                  color: activeTab === t.id ? '#fff' : '#94a3b8',
                  boxShadow: activeTab === t.id ? '0 2px 12px rgba(99,102,241,0.3)' : 'none',
                }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

            {/* ── ASK TAB ──────────────────────────────────────── */}
            {activeTab === 'ask' && (
              <div style={{ animation: 'fadeInUp .35s ease' }}>
                {!answer && (
                  <div style={{ textAlign: 'center', marginTop: 80, animation: 'fadeIn .5s ease' }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🕸️</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#334155' }}>Ask your graph memory</div>
                    <div style={{ fontSize: 13, color: '#1e293b', marginTop: 6 }}>Try: "auth fail" • "cors error" • "react state" • "payment bug"</div>
                  </div>
                )}

                {answer && (
                  <div style={{ animation: 'fadeInUp .4s ease' }}>
                    {/* Answer card */}
                    <div className="card" style={{ padding: 20, borderLeft: '3px solid #6366f1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: answer.found ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                          {answer.found ? '✓' : '?'}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: answer.found ? '#10b981' : '#f59e0b' }}>
                          {answer.found ? 'Memory Found in Graph' : 'No Match — New Issue'}
                        </span>
                      </div>
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, color: '#e2e8f0', fontFamily: "'Inter', sans-serif" }}>
                        {typedAnswer}{!typingDone && <span style={{ animation: 'pulse 1s infinite' }}>▊</span>}
                      </pre>
                    </div>

                    {/* Explainability Panel */}
                    {answer.explain && (
                      <div style={{ marginTop: 16, animation: 'fadeInUp .5s ease .2s both' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🔬</span> Explainability Panel
                        </div>

                        {/* Traversal Path */}
                        <div className="card" style={{ padding: 14, marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Traversal Path</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                            {answer.explain.traversal_path?.map((step, i) => (
                              <React.Fragment key={i}>
                                {step.node ? (
                                  <span style={{
                                    fontSize: 11, padding: '4px 10px', borderRadius: 6, fontWeight: 500,
                                    background: { user: '#3b82f620', bug: '#ef444420', file: '#f59e0b20', solution: '#10b98120' }[step.type] || '#6366f120',
                                    color: { user: '#3b82f6', bug: '#ef4444', file: '#f59e0b', solution: '#10b981' }[step.type] || '#6366f1',
                                    border: `1px solid ${{ user: '#3b82f640', bug: '#ef444440', file: '#f59e0b40', solution: '#10b98140' }[step.type] || '#6366f140'}`,
                                    animation: `slideRight .3s ease ${i * 0.08}s both`,
                                  }}>
                                    {step.node}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: 10, color: '#6366f1', fontFamily: "'JetBrains Mono', monospace", animation: `slideRight .3s ease ${i * 0.08}s both` }}>
                                    →[:{step.edge}]→
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        {/* Cypher + Tokens */}
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div className="card" style={{ flex: 2, padding: 14 }}>
                            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Cypher Query</div>
                            <code style={{ fontSize: 11, color: '#a5b4fc', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6, wordBreak: 'break-all' }}>
                              {answer.explain.cypher_query || answer.cypher_used}
                            </code>
                          </div>
                          <div className="card" style={{ flex: 1, padding: 14 }}>
                            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Expanded Tokens</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {answer.explain.expanded_tokens?.slice(0, 12).map((t, i) => (
                                <span key={i} style={{ fontSize: 9, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '2px 6px', borderRadius: 4 }}>{t}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Graph Model */}
                        <div className="card" style={{ padding: 12, marginTop: 10, textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>Graph Model</div>
                          <code style={{ fontSize: 12, color: '#8b5cf6', fontFamily: "'JetBrains Mono', monospace" }}>
                            {answer.explain.graph_model}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── GRAPH TAB ────────────────────────────────────── */}
            {activeTab === 'graph' && (
              <div style={{ height: '100%', animation: 'fadeInUp .35s ease' }}>
                {graphData?.nodes?.length ? (
                  <GraphView graphData={graphData} />
                ) : (
                  <div style={{ textAlign: 'center', marginTop: 80, color: '#334155' }}>
                    <div style={{ fontSize: 48 }}>🕸️</div>
                    <div style={{ marginTop: 12 }}>No graph data yet. Seed demo data first.</div>
                  </div>
                )}
              </div>
            )}

            {/* ── DETECTIVE TAB ─────────────────────────────────── */}
            {activeTab === 'detective' && (
              <div style={{ animation: 'fadeInUp .35s ease' }}>
                {detectiveLoading ? (
                  <div style={{ textAlign: 'center', marginTop: 80 }}>
                    <div style={{ width: 40, height: 40, border: '3px solid #1e293b', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <div style={{ color: '#64748b' }}>Detective Agent analyzing graph…</div>
                  </div>
                ) : detectiveData ? (
                  <div>
                    {/* Report header */}
                    <div className="card" style={{ padding: 20, borderLeft: '3px solid #f59e0b', marginBottom: 16 }}>
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.8, fontFamily: "'Inter', sans-serif", color: '#e2e8f0' }}>
                        {detectiveData.report}
                      </pre>
                      {detectiveData.analysis_time_ms != null && (
                        <div style={{ marginTop: 10, fontSize: 11, color: '#10b981' }}>⚡ Analysis completed in {detectiveData.analysis_time_ms}ms</div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {/* Buggy Files */}
                      <div className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>📁 Buggy Files (PageRank)</div>
                        {detectiveData.buggy_files?.map((f, i) => (
                          <div key={i} style={{ marginBottom: 10, animation: `fadeInUp .3s ease ${i * 0.1}s both` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                              <span style={{ color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace" }}>{f.file}</span>
                              <span style={{ color: f.riskScore > 50 ? '#ef4444' : f.riskScore > 30 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                                {f.riskScore}% risk
                              </span>
                            </div>
                            <div style={{ height: 6, background: 'rgba(30,41,59,0.5)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 3,
                                background: f.riskScore > 50 ? 'linear-gradient(90deg,#ef4444,#f97316)' : f.riskScore > 30 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#10b981,#34d399)',
                                width: `${f.riskScore}%`, '--bar-width': `${f.riskScore}%`,
                                animation: 'growBar .8s ease both',
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Concept Patterns */}
                      <div className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>🏷️ Concept Patterns</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {detectiveData.patterns?.map((p, i) => (
                            <span key={i} style={{
                              fontSize: 12, padding: '5px 12px', borderRadius: 20,
                              background: `hsl(${(i * 60) % 360}, 60%, 20%)`,
                              color: `hsl(${(i * 60) % 360}, 70%, 70%)`,
                              border: `1px solid hsl(${(i * 60) % 360}, 60%, 30%)`,
                              animation: `fadeInUp .3s ease ${i * 0.08}s both`,
                            }}>
                              #{p.tag} <span style={{ opacity: 0.6 }}>×{p.frequency}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Multi-hop Reasoning */}
                    {detectiveData.multi_hop?.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>🔗 Multi-hop Reasoning</div>
                        {detectiveData.multi_hop.map((hop, i) => (
                          <div key={i} className="card" style={{ padding: 14, marginBottom: 8, borderLeft: '3px solid #a855f7', animation: `fadeInUp .3s ease ${i * 0.1}s both` }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#a855f7', marginBottom: 4 }}>{hop.file}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{hop.reasoning}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {hop.connected_concepts?.map((c, j) => (
                                <span key={j} style={{ fontSize: 9, background: 'rgba(168,85,247,0.15)', color: '#c084fc', padding: '2px 6px', borderRadius: 4 }}>#{c}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Cypher Used */}
                    {detectiveData.cypher_used && (
                      <div className="card" style={{ padding: 14, marginTop: 16 }}>
                        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>Detective Cypher Query</div>
                        <code style={{ fontSize: 11, color: '#a5b4fc', fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all' }}>
                          {detectiveData.cypher_used}
                        </code>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', marginTop: 80, color: '#334155' }}>
                    <div style={{ fontSize: 48 }}>🔍</div>
                    <div style={{ marginTop: 12 }}>No data to analyze. Seed demo data first.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Input bar (always visible) ─────────────────────── */}
          <div style={{
            padding: '14px 24px', borderTop: '1px solid rgba(51,65,85,0.3)',
            background: 'rgba(6,6,15,0.9)', backdropFilter: 'blur(12px)', display: 'flex', gap: 10,
          }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              placeholder="Pucho: mera auth wala bug yaad hai?"
              style={{
                flex: 1, padding: '12px 18px', background: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(51,65,85,0.5)', borderRadius: 12, color: '#e2e8f0',
                fontSize: 14, fontFamily: "'Inter', sans-serif",
              }}
            />
            <button onClick={handleAsk} disabled={loading || !query.trim()} style={{
              padding: '12px 24px', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', opacity: (!query.trim()) ? 0.5 : 1,
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}>
              {loading ? (
                <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
              ) : 'Ask Graph 🧠'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

function FormInput({ placeholder, value, onChange }) {
  return (
    <input
      placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: '100%', padding: '8px 12px', marginBottom: 6,
        background: 'rgba(30,41,59,0.4)', border: '1px solid rgba(51,65,85,0.4)',
        borderRadius: 8, color: '#e2e8f0', fontSize: 12, transition: 'all .2s',
      }}
    />
  )
}
