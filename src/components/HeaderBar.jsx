import React from 'react'

// ✅ Import icons with ?url so Vite rewrites the paths correctly for GitHub Pages
import bellIcon from '../assets/bell.svg?url'
import cameraIcon from '../assets/capture-svgrepo-com.svg?url'
import langIcon from '../assets/language-svgrepo-com.svg?url'

export default function HeaderBar(){
  return (
    <header className="appbar">
      <div className="brand">
        <div className="logo">S</div>
        <div className="name">SAGER</div>
      </div>
      <div className="top-actions">
        <button className="icon-btn" title="Notifications">
          <img src={bellIcon} alt="bell"/>
        </button>
        <button className="icon-btn" title="Snapshot">
          <img src={cameraIcon} alt="camera"/>
        </button>
        <button className="icon-btn" title="Language">
          <img src={langIcon} alt="lang"/>
        </button>
        <div className="sep"></div>
        <div className="user">
          <div className="hi">Hello, <strong>Fadi Baqain</strong></div>
          <div className="role">Technical Support</div>
        </div>
      </div>
    </header>
  )
}
