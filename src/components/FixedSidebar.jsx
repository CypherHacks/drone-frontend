import React from 'react'
import { useUIStore } from '../state/uiStore.js'

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
      <Item id="dashboard" icon="/icons/dashboard.svg" label="Dashboard" />
      <Item id="map" icon="/icons/map.svg" label="Map" />
    </>
  )
}
