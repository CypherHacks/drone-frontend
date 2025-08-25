import React, { useMemo, useEffect } from 'react'
import { useDroneStore } from '../state/droneStore.js'
import { useMetricsStore, ensureMetricsStarted } from '../state/metricsStore.js'

export default function Dashboard(){
  // live fleet snapshot
  const drones = useDroneStore(s=>s.drones)
  const red = useDroneStore(s=>s.redCount)
  const total = drones.size
  const green = Math.max(0, total - red)

  // start metrics sampler once
  useEffect(()=>{ ensureMetricsStarted() }, [])

  const samples = useMetricsStore(s=>s.samples)

  const avgAltitude = useMemo(()=>{
    let sum=0, n=0
    for(const d of drones.values()){ sum += Number(d.altitude||0); n++ }
    return n? Math.round(sum/n) : 0
  }, [drones])

  const topPilots = useMemo(()=>{
    const counts = {}
    for(const d of drones.values()){
      const k = d.pilot || '—'
      counts[k] = (counts[k]||0) + 1
    }
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5)
  }, [drones])

  const topOrgs = useMemo(()=>{
    const counts = {}
    for(const d of drones.values()){
      const k = d.organization || '—'
      counts[k] = (counts[k]||0) + 1
    }
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5)
  }, [drones])

  const recent = useMemo(()=>{
    return Array.from(drones.values())
      .sort((a,b)=>b.lastSeen - a.lastSeen)
      .slice(0,8)
  }, [drones])

  return (
    <div style={styles.wrap}>
      {/* KPIs */}
      <div style={styles.gridKPI}>
        <KPI title="Drones in Sky" value={total} accent="linear-gradient(135deg,#2563eb,#60a5fa)" sub={<Trend fromSamples={samples} keyName="total"/>}/>
        <KPI title="Green (B regs)" value={green} accent="linear-gradient(135deg,#059669,#34d399)" sub={<Trend fromSamples={samples} keyName="green"/>}/>
        <KPI title="Red (others)" value={red} accent="linear-gradient(135deg,#dc2626,#f97316)" sub={<Trend fromSamples={samples} keyName="red"/>}/>
        <KPI title="Avg Altitude" value={`${avgAltitude} m`} accent="linear-gradient(135deg,#7c3aed,#a78bfa)" sub={<Trend fromSamples={samples} keyName="avgAlt" decimals={0}/>}/>
      </div>

      {/* Charts row */}
      <div style={styles.gridCharts}>
        <Card title="Fleet Status">
          <div style={styles.flexRow}>
            <Donut green={green} red={red}/>
            <div style={{display:'grid', gap:10}}>
              <Legend color="#10b981" label="Green (B regs)" value={green}/>
              <Legend color="#ef4444" label="Red (others)" value={red}/>
              <Legend color="#64748b" label="Total" value={total}/>
            </div>
          </div>
          <div style={{marginTop:14, fontSize:12, color:'#9aa3b2'}}>
            Green if registration after hyphen starts with <strong>B</strong> (e.g., <em>SG-BA</em>), else Red.
          </div>
        </Card>

        <Card title="Drones In Sky (last few minutes)">
          <Sparkline samples={samples} keyName="total" height={90}/>
          <div style={styles.sparkMeta}>
            <MiniStat label="Now" value={samples.at(-1)?.total ?? total}/>
            <MiniStat label="Peak" value={Math.max(0, ...samples.map(s=>s.total), total)}/>
            <MiniStat label="Min" value={Math.min(...(samples.length? samples.map(s=>s.total) : [total]))}/>
          </div>
        </Card>

        <Card title="Altitude Trend (avg)">
          <Sparkline samples={samples} keyName="avgAlt" height={90}/>
          <div style={styles.sparkMeta}>
            <MiniStat label="Now" value={`${Math.round(samples.at(-1)?.avgAlt ?? avgAltitude)} m`}/>
            <MiniStat label="Peak" value={`${Math.round(Math.max(0, ...samples.map(s=>s.avgAlt), avgAltitude))} m`}/>
            <MiniStat label="Min" value={`${Math.round(Math.min(...(samples.length? samples.map(s=>s.avgAlt) : [avgAltitude])))} m`}/>
          </div>
        </Card>
      </div>

      {/* Lists row */}
      <div style={styles.gridLists}>
        <Card title="Top Pilots">
          {topPilots.length === 0 ? <Empty/> :
            <Table rows={topPilots} headers={['Pilot','Drones']} />
          }
        </Card>
        <Card title="Top Organizations">
          {topOrgs.length === 0 ? <Empty/> :
            <Table rows={topOrgs} headers={['Organization','Drones']} />
          }
        </Card>
        <Card title="Live Activity">
          {recent.length === 0 ? <Empty/> :
            <div style={{display:'grid', gap:10}}>
              {recent.map(d=>(
                <div key={d.id} style={styles.activityRow}>
                  <span style={{...styles.dot, background: statusColor(d) }} />
                  <div style={{display:'grid', gap:2}}>
                    <div style={{fontWeight:700, fontSize:13}}>{d.name || 'Drone'} <span style={{color:'#94a3b8', fontWeight:500}}>({d.registration || '—'})</span></div>
                    <div style={{fontSize:12, color:'#94a3b8'}}>Pilot: {d.pilot || '—'} • Org: {d.organization || '—'}</div>
                  </div>
                  <div style={{marginLeft:'auto', fontSize:12, color:'#94a3b8'}}>{timeAgo(d.lastSeen)}</div>
                </div>
              ))}
            </div>
          }
        </Card>
      </div>
    </div>
  )
}

/* ---------- Components ---------- */

function KPI({ title, value, accent, sub }){
  return (
    <div style={{...styles.kpi, background: '#0e1320', border:'1px solid #1f2937'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{fontSize:12, color:'#9aa3b2'}}>{title}</div>
        <div style={{width:10, height:10, borderRadius:2, background: accent, boxShadow:'0 0 0 1px rgba(255,255,255,0.06) inset'}}/>
      </div>
      <div style={{fontSize:28, fontWeight:800, marginTop:6}}>{value}</div>
      <div style={{marginTop:8}}>{sub}</div>
    </div>
  )
}

function Trend({ fromSamples, keyName, decimals=0 }){
  const last = fromSamples.at(-1)?.[keyName]
  const prev = fromSamples.at(-2)?.[keyName]
  const diff = (last ?? 0) - (prev ?? 0)
  const sign = diff > 0 ? '+' : diff < 0 ? '–' : ''
  const color = diff > 0 ? '#10b981' : diff < 0 ? '#ef4444' : '#94a3b8'
  const val = (last ?? 0).toFixed(decimals)
  return (
    <div style={{display:'flex', alignItems:'center', gap:8}}>
      <span style={{fontSize:12, color:'#9aa3b2'}}>Now:</span>
      <strong style={{fontSize:13}}>{val}</strong>
      <span style={{fontSize:12, color}}>{sign}{Math.abs(diff).toFixed(decimals)}</span>
    </div>
  )
}

function Donut({ green, red, size=140, stroke=14 }){
  const total = Math.max(0, green + red)
  const g = total ? green/total : 0
  const r = total ? red/total : 0
  const cx = size/2, cy = size/2
  const radius = (size - stroke) / 2
  const C = 2 * Math.PI * radius
  const gLen = C * g
  const rLen = C * r

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* track */}
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1f2937" strokeWidth={stroke}/>
      {/* green arc */}
      <circle cx={cx} cy={cy} r={radius} fill="none"
        stroke="#10b981" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${gLen} ${C - gLen}`} transform={`rotate(-90 ${cx} ${cy})`} />
      {/* red arc (follows green) */}
      <circle cx={cx} cy={cy} r={radius} fill="none"
        stroke="#ef4444" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${rLen} ${C - rLen}`} transform={`rotate(${(g*360)-90} ${cx} ${cy})`} />
      {/* center label */}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#e5e7eb" fontWeight="800" fontSize="20">
        {total}
      </text>
      <text x={cx} y={cy+18} textAnchor="middle" dominantBaseline="central" fill="#9aa3b2" fontSize="11">
        total
      </text>
    </svg>
  )
}

function Sparkline({ samples, keyName, height=80, padding=6 }){
  const w = 360
  const h = height
  const data = samples && samples.length ? samples.map(s => Number(s[keyName] || 0)) : [0]
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const span = Math.max(1, max - min)
  const step = (w - padding*2) / Math.max(1, data.length - 1)

  const points = data.map((v, i) => {
    const x = padding + i * step
    const y = padding + (h - padding*2) * (1 - (v - min) / span)
    return `${x},${y}`
  }).join(' ')

  const last = data.at(-1) ?? 0
  const color = '#60a5fa'

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <rect x="0" y="0" width={w} height={h} rx="8" fill="#0b1220" stroke="#1f2937"/>
      <polyline fill="none" stroke={color} strokeWidth="2.5" points={points}/>
      {/* last point */}
      <circle r="3.5" cx={padding + (data.length-1)*step} cy={padding + (h - padding*2) * (1 - (last - min)/span)} fill={color} />
    </svg>
  )
}

function Legend({ color, label, value }){
  return (
    <div style={{display:'flex', alignItems:'center', gap:10}}>
      <span style={{width:10, height:10, borderRadius:3, background:color}}/>
      <div style={{fontSize:13}}>{label}</div>
      <div style={{marginLeft:'auto', fontWeight:700}}>{value}</div>
    </div>
  )
}

function MiniStat({ label, value }){
  return (
    <div style={{display:'grid', gap:4}}>
      <div style={{fontSize:11, color:'#94a3b8'}}>{label}</div>
      <div style={{fontWeight:700}}>{value}</div>
    </div>
  )
}

function Table({ rows, headers }){
  return (
    <div style={{border:'1px solid #1f2937', borderRadius:10, overflow:'hidden'}}>
      <div style={{display:'grid', gridTemplateColumns:'1fr 90px', background:'#0b1220', borderBottom:'1px solid #1f2937', padding:'8px 12px', fontSize:12, color:'#94a3b8'}}>
        <div>{headers[0]}</div><div style={{textAlign:'right'}}>{headers[1]}</div>
      </div>
      <div>
        {rows.map(([name, count])=>(
          <div key={name} style={{display:'grid', gridTemplateColumns:'1fr 90px', padding:'10px 12px', borderBottom:'1px solid #111827'}}>
            <div>{name}</div><div style={{textAlign:'right', fontWeight:700}}>{count}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Empty(){
  return <div style={{color:'#9aa3b2'}}>No data yet.</div>
}

function statusColor(d){
  const reg = d.registration || ''
  const tail = (reg.split('-')[1]||reg).toUpperCase()
  return tail.startsWith('B') ? '#10b981' : '#ef4444'
}

function timeAgo(ts){
  const s = Math.max(0, Math.round((Date.now() - Number(ts||0))/1000))
  if(s < 60) return `${s}s ago`
  const m = Math.round(s/60)
  if(m < 60) return `${m}m ago`
  const h = Math.round(m/60)
  return `${h}h ago`
}

/* ---------- Styles ---------- */

const styles = {
  wrap: { padding:'22px', display:'grid', gap:18 },
  gridKPI: {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fit, minmax(210px, 1fr))',
    gap:16
  },
  kpi: {
    borderRadius:14, padding:16,
    boxShadow:'0 8px 24px rgba(2,6,23,0.35)',
    minHeight:92
  },
  gridCharts: {
    display:'grid',
    gridTemplateColumns:'1.1fr 1fr 1fr',
    gap:16
  },
  gridLists: {
    display:'grid',
    gridTemplateColumns:'1fr 1fr 1.2fr',
    gap:16
  },
  flexRow: { display:'flex', alignItems:'center', gap:18 },
  sparkMeta: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', marginTop:10 },
  activityRow: {
    display:'flex', alignItems:'center', gap:10,
    background:'#0b1220', border:'1px solid #1f2937', padding:'10px 12px', borderRadius:10
  },
  dot: { width:10, height:10, borderRadius:'50%' },
}

function Card({ title, children }){
  return (
    <div style={{background:'#0f131b', border:'1px solid #1f2430', borderRadius:12, padding:16}}>
      <div style={{fontWeight:800, marginBottom:10}}>{title}</div>
      {children}
    </div>
  )
}
