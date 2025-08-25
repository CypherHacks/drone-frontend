import React from 'react'
import MapView from './map/MapView.jsx'
import BottomCounter from './components/BottomCounter.jsx'
import Dashboard from './components/Dashboard.jsx'
import HeaderBar from './components/HeaderBar.jsx'
import FixedSidebar from './components/FixedSidebar.jsx'
import FlyingPanel from './components/FlyingPanel.jsx'
import { useSocket } from './utils/socket.js'
import { useUIStore } from './state/uiStore.js'

export default function App(){
  useSocket(); // start socket connection & data flow
  const active = useUIStore(s=>s.active)

  return (
    <div className="app">
      <HeaderBar/>
      <nav className="nav">
        <FixedSidebar/>
      </nav>
      <main className="content">
        {active === 'dashboard' ? (
          <div className="dashboard">
            <Dashboard/>
          </div>
        ) : (
          <div className="map-wrap">
            <MapView/>
            <FlyingPanel/>
            <BottomCounter/>
          </div>
        )}
      </main>
    </div>
  )
}
