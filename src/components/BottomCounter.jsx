import React from 'react'
import { useDroneStore } from '../state/droneStore.js'
import { useUIStore } from '../state/uiStore.js'

export default function BottomCounter(){
  const red = useDroneStore(s=>s.redCount)
  const toggle = useUIStore(s=>s.toggleFlying)
  return (
    <button className="counter" onClick={toggle} title="Toggle Drone Flying panel">
      <strong>{red}</strong> Drone Flying
    </button>
  )
}
