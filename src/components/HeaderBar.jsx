import React from 'react'

export default function HeaderBar(){
  return (
    <header className="appbar">
      <div className="brand">
        <div className="logo">S</div>
        <div className="name">SAGER</div>
      </div>
      <div className="top-actions">
        <button className="icon-btn" title="Notifications"><img src="../assets/bell.svg?url" alt="bell"/></button>
        <button className="icon-btn" title="Snapshot"><img src="../assets/camera.svg?url" alt="camera"/></button>
        <button className="icon-btn" title="Language"><img src="../assets/language.svg?url" alt="lang"/></button>
        <div className="sep"></div>
        <div className="user">
          <div className="hi">Hello, <strong>Fadi Baqain</strong></div>
          <div className="role">Technical Support</div>
        </div>
      </div>
    </header>
  )
}
