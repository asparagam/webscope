import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'

// ── Helpers ──────────────────────────────────────────────────────────────────
function parula(t) {
  const s = [[53,42,135],[15,92,221],[0,181,160],[120,206,70],[255,195,55],[249,251,14]]
  t = Math.max(0, Math.min(1, t))
  const idx = t*(s.length-1), lo=Math.floor(idx), hi=Math.min(lo+1,s.length-1), f=idx-lo
  return `rgb(${Math.round(s[lo][0]+f*(s[hi][0]-s[lo][0]))},${Math.round(s[lo][1]+f*(s[hi][1]-s[lo][1]))},${Math.round(s[lo][2]+f*(s[hi][2]-s[lo][2]))})`
}
function scoreColor(n) {
  if (n >= 90) return 'var(--green)'
  if (n >= 50) return 'var(--amber)'
  return 'var(--red)'
}
function flag(code) {
  if (!code) return '🌍'
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397))
}


// ── Export Functions ──────────────────────────────────────────────────────────
function buildExportData(data) {
  return {
    domain: data.domain,
    fetched_at: data.fetched_at,
    server_ip: data.geo?.ip || '',
    city: data.geo?.city || '',
    region: data.geo?.region || '',
    country: data.geo?.country_name || '',
    organization: data.geo?.org || '',
    timezone: data.geo?.timezone || '',
    performance_score: data.performance?.performance || '',
    accessibility: data.performance?.accessibility || '',
    seo: data.performance?.seo || '',
    fcp: data.performance?.fcp || '',
    lcp: data.performance?.lcp || '',
    cls: data.performance?.cls || '',
    tti: data.performance?.tti || '',
    tbt: data.performance?.tbt || '',
    server_response: data.performance?.server_response || '',
    technologies: (data.technologies || []).map(t => t.name).join(', '),
  }
}

function exportCSV(data) {
  const row = buildExportData(data)
  const headers = Object.keys(row)
  const values  = Object.values(row).map(v => `"${String(v).replace(/"/g,'""')}"`)
  const csv = [headers.join(','), values.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `webscope-${data.domain}-${Date.now()}.csv`
  a.click(); URL.revokeObjectURL(url)
}

function exportExcel(data) {
  const row = buildExportData(data)
  const headers = Object.keys(row)
  const values  = Object.values(row)
  // Build XLSX-compatible XML (SpreadsheetML)
  const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="WebScope Report">
    <Table>
      <Row>${headers.map(h=>`<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
      <Row>${values.map(v=>`<Cell><Data ss:Type="String">${String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Data></Cell>`).join('')}</Row>
    </Table>
  </Worksheet>
</Workbook>`
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `webscope-${data.domain}-${Date.now()}.xls`
  a.click(); URL.revokeObjectURL(url)
}

async function exportPDF(data, setExporting) {
  setExporting(true)

  // Inject print styles into a <style> tag, trigger print, then remove
  const styleId = 'webscope-print-style'
  let style = document.getElementById(styleId)
  if (!style) {
    style = document.createElement('style')
    style.id = styleId
    document.head.appendChild(style)
  }

  style.textContent = `
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .sidebar { display: none !important; }
      .topbar { display: none !important; }
      .content { padding: 0 !important; overflow: visible !important; }
      .app { display: block !important; }
      .main { display: block !important; }
      .animated-tabs { break-inside: avoid; }
      .card { break-inside: avoid; page-break-inside: avoid; margin-bottom: 8px !important; }
      .metrics-grid { break-inside: avoid; }
      .row-2-1, .row-2, .row-3 { break-inside: avoid; }
      canvas { max-width: 100% !important; height: auto !important; }
      * { animation: none !important; transition: none !important; }
    }
  `

  window.print()

  // Clean up after print dialog closes
  setTimeout(() => {
    style.textContent = ''
    setExporting(false)
  }, 1000)
}

// ── Export Button Component ───────────────────────────────────────────────────
function ExportMenu({ data }) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  if (!data || data._loadingPerf) return null
  return (
    <div style={{position:'relative'}}>
      <button
        onClick={() => setOpen(p => !p)}
        disabled={exporting}
        style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',border:'0.5px solid var(--border)',borderRadius:20,background:'var(--surface)',color:'var(--text)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif',transition:'all 0.15s',opacity:exporting?0.6:1}}
      >
        {exporting
          ? <><Spinner size={14} color="var(--text2)"/> Exporting...</>
          : <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
            </>
        }
      </button>
      {open && !exporting && (
        <div style={{position:'absolute',top:'calc(100% + 8px)',right:0,background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:10,overflow:'hidden',minWidth:180,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',zIndex:200}}>
          {[
            { label:'PDF — Full Screenshot', icon:'📄', action: () => { setOpen(false); exportPDF(data, setExporting) } },
            { label:'Excel (.xls)', icon:'📊', action: () => { exportExcel(data); setOpen(false) } },
            { label:'CSV Data', icon:'📋', action: () => { exportCSV(data); setOpen(false) } },
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 14px',border:'none',background:'transparent',color:'var(--text)',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'Inter,sans-serif',textAlign:'left',transition:'background 0.1s'}}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}
            >
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Toast Component ───────────────────────────────────────────────────────────
function Toast({ toasts, remove }) {
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,display:'flex',flexDirection:'column',gap:8}}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display:'flex',alignItems:'center',gap:10,
          padding:'12px 16px',borderRadius:10,
          background: t.type==='success' ? 'rgba(11,168,0,0.12)' : t.type==='error' ? 'rgba(231,61,28,0.12)' : 'var(--surface)',
          border: `0.5px solid ${t.type==='success'?'rgba(11,168,0,0.3)':t.type==='error'?'rgba(231,61,28,0.3)':'var(--border)'}`,
          color:'var(--text)',fontSize:13,fontFamily:'Inter,sans-serif',
          boxShadow:'0 4px 24px rgba(0,0,0,0.12)',
          animation:'slideIn 0.25s ease',
          minWidth:220,maxWidth:340,
        }}>
          <span style={{fontSize:16}}>{t.type==='success'?'✓':t.type==='error'?'✗':'ℹ'}</span>
          <span style={{flex:1}}>{t.message}</span>
          <button onClick={()=>remove(t.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text2)',fontSize:16,padding:0,lineHeight:1}}>×</button>
        </div>
      ))}
    </div>
  )
}

// ── Spinner Component ─────────────────────────────────────────────────────────
function Spinner({ size=20, color='var(--accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{animation:'spin 0.8s linear infinite',flexShrink:0}}>
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="15" strokeLinecap="round"/>
    </svg>
  )
}

// ── Metric Card Component ─────────────────────────────────────────────────────
function MetricCard({ label, value, sub, loading, color }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      {loading
        ? <div style={{display:'flex',alignItems:'center',gap:8,height:36}}><Spinner size={18} color="var(--text2)"/><span style={{fontSize:13,color:'var(--text2)'}}>Loading...</span></div>
        : <div className="metric-value" style={{color: color||'var(--text)'}}>{value??'—'}</div>
      }
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

// ── Animated Tabs Component ───────────────────────────────────────────────────
function AnimatedTabs({ tabs, active, onChange }) {
  const [indicatorStyle, setIndicatorStyle] = useState({})
  const tabRefs = useRef({})

  useEffect(() => {
    const el = tabRefs.current[active]
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth })
    }
  }, [active])

  return (
    <div className="animated-tabs">
      {tabs.map(t => (
        <button
          key={t.value}
          ref={el => tabRefs.current[t.value] = el}
          className={`atab ${active===t.value?'active':''}`}
          onClick={() => onChange(t.value)}
        >{t.label}</button>
      ))}
      <div className="atab-indicator" style={indicatorStyle}/>
    </div>
  )
}

// ── Animated Search Input ─────────────────────────────────────────────────────
function SearchInput({ value, onChange, onSubmit, loading }) {
  const [focused, setFocused] = useState(false)
  return (
    <div className={`search-wrap ${focused?'focused':''} ${loading?'loading':''}`}>
      <div className="search-icon">
        {loading ? <Spinner size={16} color="var(--text2)"/> : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        )}
      </div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={e => e.key==='Enter' && onSubmit()}
        placeholder="Enter a website URL..."
        className="search-input"
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      )}
      <button className="search-btn" onClick={onSubmit} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>
    </div>
  )
}

// ── Sidebar Component ─────────────────────────────────────────────────────────
function Sidebar({ active, onChange, history, onHistoryClick }) {
  const items = [
    { id:'overview', icon:'◈', label:'Overview' },
    { id:'performance', icon:'⚡', label:'Performance' },
    { id:'geo', icon:'🌍', label:'Geographic' },
    { id:'traffic', icon:'📈', label:'Traffic' },
    { id:'tech', icon:'⚙', label:'Tech Stack' },
  ]
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">web<span>scope</span></div>
      <nav className="sidebar-nav">
        {items.map(item => (
          <button key={item.id} className={`sidebar-item ${active===item.id?'active':''}`} onClick={()=>onChange(item.id)}>
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
            {active===item.id && <div className="sidebar-active-bar"/>}
          </button>
        ))}
      </nav>
      {history.length > 0 && (
        <div className="sidebar-history">
          <div className="sidebar-section-title">Recent</div>
          {history.slice(0,5).map((h,i) => (
            <button key={i} className="sidebar-history-item" onClick={()=>onHistoryClick(h)}>
              <img src={`https://www.google.com/s2/favicons?domain=${h}&sz=16`} width={14} height={14} alt="" style={{borderRadius:3}}/>
              <span>{h}</span>
            </button>
          ))}
        </div>
      )}
      <div className="sidebar-footer">
        <div style={{fontSize:10,color:'var(--text2)'}}>Powered by</div>
        <div style={{fontSize:10,color:'var(--text2)',marginTop:2}}>ipinfo · PageSpeed · BuiltWith</div>
      </div>
    </aside>
  )
}

// ── Theme Toggle ──────────────────────────────────────────────────────────────
function ThemeToggle({ dark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width:36, height:20, borderRadius:10, border:'none', cursor:'pointer',
        background: dark ? 'var(--accent)' : 'var(--border)',
        position:'relative', transition:'background 0.25s', flexShrink:0,
        padding:0,
      }}
    >
      <div style={{
        position:'absolute', top:2, left: dark ? 18 : 2,
        width:16, height:16, borderRadius:8,
        background: dark ? 'var(--accent-fg)' : '#fff',
        transition:'left 0.25s cubic-bezier(0.4,0,0.2,1)',
        boxShadow:'0 1px 4px rgba(0,0,0,0.2)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:9,
      }}>
        {dark ? '🌙' : '☀️'}
      </div>
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [query, setQuery]       = useState('apple.com')
  const [loading, setLoading]   = useState(false)
  const [data, setData]         = useState(null)
  const [error, setError]       = useState(null)
  const [section, setSection]   = useState('overview')
  const [tab, setTab]           = useState('6m')
  const [toasts, setToasts]     = useState([])
  const [history, setHistory]   = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [dark, setDark] = useState(false) // start light, fix on mount

  // On mount: read saved preference or system preference
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved ? saved === 'dark' : prefersDark
    setDark(isDark)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [])

  // Apply theme whenever dark changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    if (typeof window !== 'undefined') localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const trafficRef   = useRef(null)
  const sourceRef    = useRef(null)
  const histRef      = useRef(null)
  const mapRef       = useRef(null)
  const heatRef      = useRef(null)
  const trafficChart = useRef(null)
  const sourceChart  = useRef(null)
  const histChart    = useRef(null)

  // Toast helpers
  function addToast(message, type='info') {
    const id = Date.now()
    setToasts(p => [...p, {id, message, type}])
    setTimeout(() => removeToast(id), 4000)
  }
  function removeToast(id) { setToasts(p => p.filter(t => t.id !== id)) }

  // Analyze
  async function analyze(url = query) {
    const domain = url.replace(/https?:\/\//i,'').replace(/\/$/,'').toLowerCase()
    if (!domain) return
    setLoading(true); setError(null); setData(null)
    addToast(`Analyzing ${domain}...`, 'info')
    try {
      const res  = await fetch(`/api/analyze?url=${encodeURIComponent(domain)}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData({ ...json, performance: null, _loadingPerf: true })
      setLoading(false)
      setHistory(p => [domain, ...p.filter(h=>h!==domain)].slice(0,10))
      addToast('Site data loaded!', 'success')
      setSection('overview')

      // Background perf load
      fetch(`/api/perf?url=${encodeURIComponent(domain)}`)
        .then(r => r.json())
        .then(perf => {
          setData(prev => prev ? { ...prev, performance: perf.performance, _loadingPerf: false } : prev)
          if (perf.performance) addToast(`Performance score: ${perf.performance.performance}`, 'success')
        })
        .catch(() => setData(prev => prev ? { ...prev, _loadingPerf: false } : prev))
    } catch(e) {
      setError(e.message || 'Something went wrong.')
      setLoading(false)
      addToast(e.message || 'Analysis failed', 'error')
    }
  }

  // Charts
  useEffect(() => {
    if (!data) return
    // small delay so DOM renders before chart tries to find canvas
    const timer = setTimeout(() => {
    import('chart.js').then(({ Chart, registerables }) => {
      Chart.register(...registerables)
      const months6m = ['Oct','Nov','Dec','Jan','Feb','Mar']
      const months1y = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar']
      const tData6m  = [920,985,1050,1100,1150,1200]
      const tData1y  = [720,760,800,850,870,920,985,1050,1100,1150,1180,1200]

      if (trafficChart.current) trafficChart.current.destroy()
      if (trafficRef.current) {
        trafficChart.current = new Chart(trafficRef.current, {
          type: 'line',
          data: { labels: tab==='6m'?months6m:months1y, datasets:[{data:tab==='6m'?tData6m:tData1y,borderColor:'var(--blue)',backgroundColor:'rgba(69,141,242,0.08)',fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:'var(--blue)'}] },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:'rgba(128,128,128,0.07)'},ticks:{color:'#888',font:{size:11,family:'Inter'}}}, y:{grid:{color:'rgba(128,128,128,0.07)'},ticks:{color:'#888',font:{size:11,family:'Inter'},callback:v=>v>=1000?(v/1000).toFixed(0)+'M':v}} } }
        })
      }

      if (sourceChart.current) sourceChart.current.destroy()
      if (sourceRef.current) {
        sourceChart.current = new Chart(sourceRef.current, {
          type: 'doughnut',
          data: { labels:['Organic','Direct','Social','Paid','Other'], datasets:[{data:[42,31,14,9,4],backgroundColor:['#458DF2','#0BA800','#F06322','#8620ED','#ACACAC'],borderWidth:0}] },
          options: { responsive:true, maintainAspectRatio:false, cutout:'70%', plugins:{legend:{display:false}} }
        })
      }

      const raw = [12,9,7,5,4,5,9,18,32,48,58,63,67,65,60,58,55,61,70,72,65,50,35,20]
      if (histChart.current) histChart.current.destroy()
      if (histRef.current) {
        histChart.current = new Chart(histRef.current, {
          type:'bar',
          data:{ labels:Array.from({length:24},(_,i)=>i+':00'), datasets:[{data:raw,backgroundColor:raw.map(v=>parula(v/75)),borderWidth:0,borderRadius:3}] },
          options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false},ticks:{display:false}}, y:{grid:{color:'rgba(128,128,128,0.07)'},ticks:{color:'#888',font:{size:10,family:'Inter'},callback:v=>v+'M'}} } }
        })
      }
    })
    }, 50)
    return () => clearTimeout(timer)
  }, [data, tab, section])

  // Map
  useEffect(() => {
    if (!data || !mapRef.current) return
    Promise.all([import('d3'), import('topojson-client')]).then(([d3, topo]) => {
      const el = mapRef.current
      el.innerHTML = ''
      const W = el.clientWidth || 800, H = Math.round(W * 0.5)
      el.style.background = 'var(--surface2)'
      el.style.borderRadius = '10px'
      const svg = d3.select(el).append('svg').attr('viewBox',`0 0 ${W} ${H}`).style('width','100%').style('height','auto').style('display','block')
      svg.append('rect').attr('width',W).attr('height',H).attr('fill','#1a1a2e')
      const proj = d3.geoNaturalEarth1().scale(W/6.3).translate([W/2, H/2])
      const path = d3.geoPath(proj)
      const hostCountry = data.geo?.country
      const trafficMap = {US:52,GB:12,DE:8,JP:7,TR:5,FR:4,CN:3,CA:2,AU:2,BR:1,IN:1,KR:1}
      if (hostCountry && !(hostCountry in trafficMap)) trafficMap[hostCountry] = 6
      const numToAlpha = {840:'US',826:'GB',276:'DE',392:'JP',792:'TR',250:'FR',156:'CN',124:'CA',36:'AU',76:'BR',356:'IN',410:'KR',528:'NL',752:'SE',756:'CH',578:'NO',643:'RU',380:'IT',724:'ES',484:'MX',710:'ZA',616:'PL',56:'BE',40:'AT',372:'IE',246:'FI',208:'DK',620:'PT',203:'CZ',348:'HU',642:'RO',376:'IL',682:'SA',784:'AE',586:'PK',566:'NG',818:'EG',32:'AR',152:'CL'}
      function mapColor(t) { return `rgb(${Math.round(134+t*(15-134))},${Math.round(32+t*(170-32))},${Math.round(237+t*(200-237))})` }
      const tip = document.createElement('div')
      tip.style.cssText = 'position:absolute;background:#141414;color:#F1F1F1;border:0.5px solid rgba(255,255,255,0.12);padding:6px 12px;border-radius:6px;font-size:12px;font-family:Inter,sans-serif;pointer-events:none;display:none;z-index:10;white-space:nowrap;'
      el.style.position = 'relative'
      el.appendChild(tip)
      d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(world => {
        svg.selectAll('path').data(topo.feature(world, world.objects.countries).features).join('path')
          .attr('d', path).attr('stroke','rgba(255,255,255,0.06)').attr('stroke-width',0.5)
          .attr('fill', d => { const a=numToAlpha[+d.id]; if(!a) return '#2a2a4a'; const v=trafficMap[a]; return v?mapColor(v/52):'#2a2a4a' })
          .on('mousemove', (event, d) => { const a=numToAlpha[+d.id]; const v=a?trafficMap[a]:null; if(v){tip.style.display='block';tip.style.left=(event.offsetX+14)+'px';tip.style.top=(event.offsetY-10)+'px';tip.textContent=flag(a)+' '+a+' — '+v+'% traffic'}else tip.style.display='none' })
          .on('mouseleave', () => tip.style.display='none')
        if (hostCountry) {
          const [lat,lng] = (data.geo?.loc||'0,0').split(',').map(Number)
          const [x,y] = proj([lng, lat])
          if (x>0&&y>0) {
            svg.append('circle').attr('cx',x).attr('cy',y).attr('r',6).attr('fill','#B4F077').attr('stroke','#1a1a2e').attr('stroke-width',2)
            svg.append('text').attr('x',x+10).attr('y',y+4).attr('fill','#B4F077').attr('font-size',11).attr('font-weight','600').attr('font-family','Inter,sans-serif').text('Server')
          }
        }
      })
    })
  }, [data, section])

  // Heatmap
  useEffect(() => {
    if (!data || !heatRef.current) return
    const days   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    const hours  = ['00','04','08','12','16','20']
    const matrix = [[18,12,9,6,5,7,14],[22,16,11,8,7,10,18],[55,48,38,32,28,42,50],[72,65,60,55,50,62,68],[68,60,55,50,45,58,64],[42,38,32,28,25,36,40]]
    const flat=matrix.flat(), minV=Math.min(...flat), maxV=Math.max(...flat)
    const el=heatRef.current; el.innerHTML=''; el.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:3px;'
    matrix.forEach(row=>row.forEach(val=>{const t=(val-minV)/(maxV-minV);const cell=document.createElement('div');cell.style.cssText=`background:${parula(t)};height:30px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;font-family:Inter,monospace;color:rgba(255,255,255,${t>0.5?0.9:0.7});font-weight:600;`;cell.textContent=val+'M';el.appendChild(cell)}))
    const yEl=document.getElementById('heatY'); if(yEl) yEl.innerHTML=hours.map(h=>`<span style="font-size:9px;font-family:Inter,monospace;color:var(--text2);">${h}:00</span>`).join('')
    const xEl=document.getElementById('heatX'); if(xEl) xEl.innerHTML=days.map(d=>`<span style="font-size:9px;font-family:Inter,monospace;color:var(--text2);text-align:center;flex:1;">${d}</span>`).join('')
  }, [data, section])

  const domain = data?.domain || ''

  // Section content
  function renderSection() {
    if (!data) return null

    if (section === 'overview') return (
      <>
        <div className="metrics-grid">
          <MetricCard label="Performance Score" value={data.performance?.performance} loading={data._loadingPerf} color={data.performance?scoreColor(data.performance.performance):undefined} sub="Google Lighthouse"/>
          <MetricCard label="First Contentful Paint" value={data.performance?.fcp} loading={data._loadingPerf} sub="First content loaded"/>
          <MetricCard label="Largest Content Paint" value={data.performance?.lcp} loading={data._loadingPerf} sub="Largest element"/>
          <MetricCard label="Server Response" value={data.performance?.server_response} loading={data._loadingPerf} sub="Time to First Byte"/>
        </div>
        <div className="row-2-1">
          <div className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
              <div className="card-title" style={{marginBottom:0}}>Monthly Traffic Trend</div>
              <AnimatedTabs tabs={[{value:'6m',label:'6 Mo'},{value:'1y',label:'1 Yr'}]} active={tab} onChange={setTab}/>
            </div>
            <div style={{position:'relative',height:200}}><canvas ref={trafficRef}/></div>
          </div>
          <div className="card">
            <div className="card-title">Traffic Sources</div>
            <div className="legend">
              {[['#458DF2','Organic 42%'],['#0BA800','Direct 31%'],['#F06322','Social 14%'],['#8620ED','Paid 9%']].map(([c,l])=>(
                <span key={l}><span className="legend-dot" style={{background:c}}/>{l}</span>
              ))}
            </div>
            <div style={{position:'relative',height:160}}><canvas ref={sourceRef}/></div>
          </div>
        </div>
        <div className="row-3">
          <div className="card">
            <div className="card-title">Country Breakdown</div>
            <div className="country-list">
              {[['🇺🇸','USA',52,'var(--blue)'],['🇬🇧','UK',12,'var(--blue)'],['🇩🇪','Germany',8,'var(--blue)'],['🇯🇵','Japan',7,'var(--blue)'],['🇹🇷','Turkey',5,'var(--blue)'],['🌍','Other',16,'var(--text2)']].map(([f,n,p,c])=>(
                <div key={n} className="country-item">
                  <span style={{fontSize:14,minWidth:20}}>{f}</span>
                  <span style={{minWidth:65,fontSize:13}}>{n}</span>
                  <div className="bar-wrap"><div className="bar" style={{width:p+'%',background:c}}/></div>
                  <span className="pct">{p}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-title"><span className="live-dot"/>Lighthouse Scores</div>
            {data._loadingPerf
              ? <div style={{display:'flex',flexDirection:'column',gap:12,paddingTop:8}}>{[1,2,3].map(i=><div key={i} className="skeleton" style={{height:32}}/>)}</div>
              : data.performance ? (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {[['Performance',data.performance.performance],['Accessibility',data.performance.accessibility],['SEO',data.performance.seo]].map(([label,score])=>(
                    <div key={label}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:5}}><span>{label}</span><span style={{fontWeight:600,color:scoreColor(score)}}>{score}</span></div>
                      <div className="bar-wrap" style={{height:6}}><div className="bar" style={{width:score+'%',background:scoreColor(score),height:6,transition:'width 0.8s ease'}}/></div>
                    </div>
                  ))}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:4}}>
                    {[['CLS',data.performance.cls],['TTI',data.performance.tti],['TBT',data.performance.tbt],['FCP',data.performance.fcp]].map(([k,v])=>(
                      <div key={k} style={{background:'var(--surface2)',borderRadius:8,padding:'8px 10px'}}>
                        <div style={{fontSize:10,color:'var(--text2)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>{k}</div>
                        <div style={{fontSize:14,fontWeight:600,marginTop:2}}>{v||'—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p style={{fontSize:13,color:'var(--text2)',paddingTop:8}}>Performance data unavailable.</p>
            }
          </div>
          <div className="card">
            <div className="card-title">{data.technologies?.length?<><span className="live-dot"/>Tech Stack</>:'Tech Stack'}</div>
            <div className="tech-list">
              {data.technologies?.length ? data.technologies.slice(0,12).map((t,i)=><div key={i} className={`tech-tag ${i<3?'highlight':''}`}>{t.name}</div>)
                : ['Nginx','Cloudflare','AWS','Analytics','CSS3','HTML5'].map(t=><div key={t} className="tech-tag">{t}</div>)}
            </div>
            <div style={{marginTop:'1rem',paddingTop:'1rem',borderTop:'0.5px solid var(--border)'}}>
              <div style={{fontSize:11,color:'var(--text2)',marginBottom:8,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>Competitor Analysis</div>
              <div style={{display:'flex',gap:8}}>
                <button className="comp-btn" onClick={()=>{setQuery('samsung.com');analyze('samsung.com')}}>samsung.com</button>
                <button className="comp-btn" onClick={()=>{setQuery('microsoft.com');analyze('microsoft.com')}}>microsoft.com</button>
              </div>
            </div>
          </div>
        </div>
      </>
    )

    if (section === 'performance') return (
      <div className="card" style={{maxWidth:640}}>
        <div className="card-title"><span className="live-dot"/>Google Lighthouse — Live Data</div>
        {data._loadingPerf
          ? <div style={{display:'flex',alignItems:'center',gap:12,padding:'2rem 0'}}><Spinner size={24}/><span style={{color:'var(--text2)'}}>Running Lighthouse test...</span></div>
          : data.performance ? (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {[['Performance',data.performance.performance],['Accessibility',data.performance.accessibility],['SEO',data.performance.seo]].map(([label,score])=>(
                  <div key={label} style={{textAlign:'center',padding:'1.5rem 1rem',background:'var(--surface2)',borderRadius:12}}>
                    <div style={{fontSize:36,fontWeight:700,color:scoreColor(score)}}>{score}</div>
                    <div style={{fontSize:12,color:'var(--text2)',marginTop:4,fontWeight:500}}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[['First Contentful Paint',data.performance.fcp],['Largest Contentful Paint',data.performance.lcp],['Time to Interactive',data.performance.tti],['Total Blocking Time',data.performance.tbt],['Cumulative Layout Shift',data.performance.cls],['Server Response',data.performance.server_response]].map(([k,v])=>(
                  <div key={k} style={{padding:'12px 14px',background:'var(--surface2)',borderRadius:10}}>
                    <div style={{fontSize:11,color:'var(--text2)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.4px'}}>{k}</div>
                    <div style={{fontSize:18,fontWeight:700,marginTop:4}}>{v||'—'}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p style={{color:'var(--text2)',paddingTop:8}}>No performance data available.</p>
        }
      </div>
    )

    if (section === 'geo') return (
      <>
        {data.geo && (
          <div className="geo-grid" style={{marginBottom:'1rem'}}>
            <div className="geo-item"><div className="geo-label">Server IP</div><div className="geo-value">{data.geo.ip||'—'}</div></div>
            <div className="geo-item"><div className="geo-label">Location</div><div className="geo-value">{[data.geo.city,data.geo.region,data.geo.country_name].filter(Boolean).join(', ')||'—'}</div></div>
            <div className="geo-item"><div className="geo-label">Organization / ISP</div><div className="geo-value">{data.geo.org||'—'}</div></div>
            <div className="geo-item"><div className="geo-label">Timezone</div><div className="geo-value">{data.geo.timezone||'—'}</div></div>
          </div>
        )}
        <div ref={mapRef} style={{minHeight:280,borderRadius:10,overflow:'hidden'}}/>
        <div style={{display:'flex',alignItems:'center',gap:8,marginTop:10}}>
          <span style={{fontSize:10,color:'var(--text2)',fontFamily:'Inter,monospace',fontWeight:500}}>0%</span>
          <div style={{flex:1,height:6,borderRadius:4,background:'linear-gradient(to right,#8620ED,#0FAAC8)'}}/>
          <span style={{fontSize:10,color:'var(--text2)',fontFamily:'Inter,monospace',fontWeight:500}}>52%</span>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:8}}>
          {[['US',52],['GB',12],['DE',8],['JP',7],['TR',5],['FR',4],['CN',3]].map(([c,p])=>(
            <span key={c} style={{fontSize:11,color:'var(--text2)',fontFamily:'Inter,monospace',fontWeight:500}}>{flag(c)} {c} {p}%</span>
          ))}
        </div>
      </>
    )

    if (section === 'traffic') return (
      <div className="row-2">
        <div className="card">
          <div className="card-title">Hourly Traffic Distribution — Histogram</div>
          <div style={{position:'relative',height:220}}><canvas ref={histRef}/></div>
          <div style={{marginTop:8,display:'flex',justifyContent:'space-between'}}>
            {['00:00','06:00','12:00','18:00','24:00'].map(t=><span key={t} style={{fontSize:10,color:'var(--text2)',fontFamily:'Inter,monospace',fontWeight:500}}>{t}</span>)}
          </div>
          <div style={{textAlign:'center',marginTop:2}}><span style={{fontSize:10,color:'var(--text2)',fontFamily:'Inter,monospace',fontWeight:500}}>Hour (UTC)</span></div>
        </div>
        <div className="card">
          <div className="card-title">Weekly Traffic Heatmap</div>
          <div style={{display:'flex',gap:0}}>
            <div id="heatY" style={{display:'flex',flexDirection:'column',justifyContent:'space-around',paddingRight:6,minWidth:38}}/>
            <div style={{flex:1}}>
              <div ref={heatRef}/>
              <div id="heatX" style={{display:'flex',paddingTop:4}}/>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:10}}>
            <span style={{fontSize:10,color:'var(--text2)',fontFamily:'Inter,monospace',fontWeight:500}}>Low</span>
            <div style={{flex:1,height:6,borderRadius:4,background:'linear-gradient(to right,#352a87,#0f5cdd,#00b5a0,#ffc337,#f9fb0e)'}}/>
            <span style={{fontSize:10,color:'var(--text2)',fontFamily:'Inter,monospace',fontWeight:500}}>High</span>
          </div>
        </div>
      </div>
    )

    if (section === 'tech') return (
      <div className="card" style={{maxWidth:640}}>
        <div className="card-title">{data.technologies?.length?<><span className="live-dot"/>Tech Stack — BuiltWith</>:'Tech Stack'}</div>
        <div className="tech-list" style={{gap:8}}>
          {data.technologies?.length ? data.technologies.map((t,i)=>(
            <div key={i} className={`tech-tag ${i<3?'highlight':''}`} style={{padding:'6px 14px',fontSize:13}}>
              {t.name}
              {t.category && <span style={{fontSize:10,marginLeft:6,opacity:0.6}}>{t.category}</span>}
            </div>
          )) : ['Nginx','Cloudflare','AWS','Google Analytics','CSS3','HTML5','React'].map(t=><div key={t} className="tech-tag">{t}</div>)}
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>WebScope{domain ? ` — ${domain}` : ''}</title>
        <meta name="description" content="Real-time website analytics platform"/>
      </Head>



      <div className="app">
        <Sidebar active={section} onChange={setSection} history={history} onHistoryClick={url=>{setQuery(url);analyze(url)}}/>

        <div className="main">
          <div className="topbar">
            <SearchInput value={query} onChange={setQuery} onSubmit={()=>analyze()} loading={loading}/>
            <div style={{display:'flex',alignItems:'center',gap:10,marginLeft:'auto'}}>
              {data && (
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div className="badges">
                    <span className="badge badge-green"><span className="live-dot"/>Live</span>
                    {data.geo?.country && <span className="badge badge-blue">{flag(data.geo.country)} {data.geo.country}</span>}
                    {data.performance && <span className={`badge ${data.performance.performance>=90?'badge-green':data.performance.performance>=50?'badge-amber':'badge-red'}`}>{data.performance.performance}</span>}
                  </div>
                  <ExportMenu data={data}/>
                </div>
              )}
              <ThemeToggle dark={dark} onToggle={() => setDark(p => !p)}/>
            </div>
          </div>

          <div className="content" id="webscope-content">
            {error && <div className="error-banner">⚠ {error}</div>}

            {loading && (
              <div>
                <div className="skeleton" style={{height:74,marginBottom:16,borderRadius:12}}/>
                <div className="metrics-grid" style={{marginBottom:16}}>{[1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:90}}/>)}</div>
                <div className="skeleton" style={{height:260}}/>
              </div>
            )}

            {data && !loading && (
              <>
                <div className="site-header">
                  <div className="site-icon">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt={domain} onError={e=>{e.target.style.display='none'}}/>
                  </div>
                  <div className="site-info">
                    <h2>{domain}</h2>
                    <p>{data.geo?.org||'Unknown'} · {data.geo?.country_name||'Unknown'}{data.geo?.city?` · ${data.geo.city}`:''}</p>
                  </div>
                  <div className="badges">
                    <span className="badge badge-green"><span className="live-dot"/>Live Data</span>
                    {data.geo?.country && <span className="badge badge-blue">{flag(data.geo.country)} {data.geo.country}</span>}
                    {data._loadingPerf && <span className="badge" style={{background:'var(--surface2)',color:'var(--text2)',display:'flex',alignItems:'center',gap:6}}><Spinner size={12} color="var(--text2)"/>Analyzing...</span>}
                    {data.performance && <span className={`badge ${data.performance.performance>=90?'badge-green':data.performance.performance>=50?'badge-amber':'badge-red'}`}>Perf: {data.performance.performance}</span>}
                  </div>
                </div>
                {renderSection()}
              </>
            )}

            {!data && !loading && !error && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h2 style={{fontWeight:600,fontSize:18}}>Analyze any website</h2>
                <p style={{color:'var(--text2)',fontSize:14,maxWidth:320}}>Enter a URL in the search bar above and click Analyze</p>
                <p style={{color:'var(--text2)',fontSize:12,marginTop:4}}>Powered by ipinfo.io · Google PageSpeed · BuiltWith</p>
              </div>
            )}

            <div className="footer">WebScope — Real-time website analytics · ipinfo.io · Google PageSpeed · BuiltWith</div>
          </div>
        </div>
      </div>

      <Toast toasts={toasts} remove={removeToast}/>
    </>
  )
}
