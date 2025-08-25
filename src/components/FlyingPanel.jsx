import React from 'react'
import { useUIStore } from '../state/uiStore.js'
import DroneList from './DroneList.jsx'

export default function FlyingPanel(){
  const open = useUIStore(s=>s.flyingOpen)
  const toggle = useUIStore(s=>s.toggleFlying)
  const tab = useUIStore(s=>s.tab)
  const setTab = useUIStore(s=>s.setTab)

  if(!open){
    return null
  }

  return (
    <aside className="panel">
      <div className="panel-header">
        <div className="panel-title">DRONE FLYING</div>
        <button className="panel-close" onClick={toggle} aria-label="Close">×</button>
      </div>
      <div className="tabs">
        <div className={"tab"+(tab==='drones'?' active':'')} onClick={()=>setTab('drones')}>Drones</div>
        <div className={"tab"+(tab==='history'?' active':'')} onClick={()=>setTab('history')}>Flights History</div>
      </div>
      <div className="panel-body">
        {tab === 'drones' ? (
          <DroneList/>
        ) : (
          <div style={{padding:'8px 2px', color:'#9aa3b2', fontSize:13}}>
            No history API provided. This tab is for show.
          </div>
        )}
      </div>
    </aside>
  )
}
