import React from 'react'
import { useUIStore } from '../state/uiStore.js'

// ✅ Import SVGs properly with ?url so Vite bundles them
import dashboardIcon from '../assets/dashboard-svgrepo-com-2.svg?url'
import mapIcon from '../assets/location-svgrepo-com-2.svg?url'

export default function FixedSidebar(){
  const active = useUIStore(s=>s.active)
  const setActive = useUIStore(s=>s.setActive)

  const Item = ({id, icon, label}) => (
    <div
      className={"nav-item"+(active===id?" active":"")}
      title={label}
      onClick={()=>setActive(id)}
      role="button"
      aria-label={label}
    >
      <img src={icon} alt={label}/>
    </div>
  )

  return (
    <>
      <Item id="dashboard" icon={dashboardIcon} label="Dashboard" />
      <Item id="map" icon={mapIcon} label="Map" />
    </>
  )
}
