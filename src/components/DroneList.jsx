import React, { useMemo } from 'react'
import { useDroneStore } from '../state/droneStore.js'

export default function DroneList(){
  const rawList = useDroneStore(s=>s.list())
  const selectedId = useDroneStore(s=>s.selectedId)
  const setSearch = useDroneStore(s=>s.setSearch)
  const select = useDroneStore(s=>s.select)

  // Keep the selected drone pinned at the top so the highlight doesn't jump
  const list = useMemo(()=>{
    if(!selectedId) return rawList
    const sel = rawList.find(d=>d.id === selectedId)
    if(!sel) return rawList
    return [sel, ...rawList.filter(d=>d.id !== selectedId)]
  }, [rawList, selectedId])

  return (
    <div>
      <div style={{padding:'0 4px 8px 4px'}}>
        <input
          placeholder="Search by id or registration..."
          onChange={e=>setSearch(e.target.value)}
          style={{width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid #1f2430', background:'#0d1117', color:'#e6e8ee'}}
        />
      </div>
      <div style={{fontSize:12, color:'#9aa3b2', padding:'0 6px 8px'}}>
        Showing {list.length} drone{list.length!==1?'s':''}
      </div>

      <div>
        {list.map((d, idx) => {
          const isSelected = selectedId === d.id
          const color = (d.registration.split('-')[1]||'').startsWith('B') ? '#10b981' : '#ef4444'
          return (
            <div
              key={d.id}
              className="list-item"
              style={{
                outline: isSelected ? '2px solid #2563eb' : 'none',
                position: idx === 0 && isSelected ? 'sticky' : 'static',
                top: idx === 0 && isSelected ? 0 : 'auto',
                zIndex: idx === 0 && isSelected ? 1 : 0
              }}
              onClick={()=>select(d.id)}  // LIST CLICK → updates selectedId; MapView subscribes and flies to it
            >
              <div className="row">
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <div style={{fontWeight:700}}>{d.name || 'DJI Drone'}</div>
                  {isSelected && (
                    <span style={{
                      fontSize:10, padding:'2px 6px', borderRadius:999,
                      background:'#0b3b85', border:'1px solid #1f3a7a', color:'#cde1ff'
                    }}>Selected</span>
                  )}
                </div>
                <div className="badge" style={{background:color}}></div>
              </div>
              <div className="meta">
                <div>Serial # <span>{d.id}</span></div>
                <div>Registration # <span>{d.registration || '—'}</span></div>
                <div>Pilot <span>{d.pilot || '—'}</span></div>
                <div>Organization <span>{d.organization || '—'}</span></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
