import React, { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { useDroneStore, formatFlightTime } from '../state/droneStore.js'
import { addSvgAsImage } from '../utils/mapImages.js'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

const START = { lng: 35.9106, lat: 31.9539, zoom: 12.2 }
const STATUS_CIRCLE_RADIUS_PX = 14
const ARROW_RIM_OFFSET_PX = STATUS_CIRCLE_RADIUS_PX + 2

export default function MapView(){
  const mapRef = useRef(null)
  const containerRef = useRef(null)

  const getPointsFC = useDroneStore(s=>s.getPointsFC)
  const getLinesFC = useDroneStore(s=>s.getLinesFC)
  const select = useDroneStore(s=>s.select)
  const selectedId = useDroneStore(s=>s.selectedId)

  // Build arrow positions on the rim using heading (in pixels → lng/lat)
  const buildArrowsFC = (map) => {
    const pf = getPointsFC()
    const features = []
    for(const f of pf.features){
      const p = f.properties || {}
      const heading = Number(p.heading || 0)
      const rad = heading * Math.PI / 180
      const center = map.project(f.geometry.coordinates)
      const px = center.x + ARROW_RIM_OFFSET_PX * Math.sin(rad)
      const py = center.y - ARROW_RIM_OFFSET_PX * Math.cos(rad)
      const ll = map.unproject([px, py])
      features.push({
        type:'Feature',
        geometry:{ type:'Point', coordinates:[ll.lng, ll.lat] },
        properties:{ ...p, heading }
      })
    }
    return { type:'FeatureCollection', features }
  }

  useEffect(()=>{
    if(mapRef.current) return
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [START.lng, START.lat],
      zoom: START.zoom,
    })
    mapRef.current = map

    map.on('load', async () => {
      await addSvgAsImage(map, '/icons/drone.svg', 'drone-icon', 64)

      map.addSource('drones', { type:'geojson', data: getPointsFC() })
      map.addSource('paths',  { type:'geojson', data: getLinesFC() })
      map.addSource('arrows', { type:'geojson', data: buildArrowsFC(map) })

      // Trails
      map.addLayer({
        id: 'paths',
        type: 'line',
        source: 'paths',
        layout: { 'line-join':'round', 'line-cap':'round' },
        paint: { 'line-color': ['coalesce', ['get','color'], '#999'], 'line-width': 4, 'line-opacity': 1.0 }
      })

      // Status circle
      map.addLayer({
        id: 'drone-status',
        type: 'circle',
        source: 'drones',
        paint: {
          'circle-radius': STATUS_CIRCLE_RADIUS_PX,
          'circle-color': ['get','color'],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0b0d11'
        }
      })

      // White drone icon (upright)
      map.addLayer({
        id: 'drone-icon',
        type: 'symbol',
        source: 'drones',
        layout: {
          'icon-image': 'drone-icon',
          'icon-size': 0.33,
          'icon-allow-overlap': true,
          'icon-rotation-alignment': 'map'
        }
      })

      // Caret arrow on rim — rotated & colored per drone
      map.addLayer({
        id: 'drone-arrow',
        type: 'symbol',
        source: 'arrows',
        layout: {
          'text-field': '^',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular'],
          'text-size': 16,
          'text-allow-overlap': true,
          'text-rotation-alignment': 'map',
          'text-rotate': ['to-number', ['get','heading']]
        },
        paint: {
          'text-color': ['coalesce', ['get','color'], '#ffffff'],
          'text-halo-color': '#0b0d11',
          'text-halo-width': 0.8
        }
      })

      // Selected ring
      map.addLayer({
        id: 'selected-ring',
        type: 'circle',
        source: 'drones',
        filter: ['==', ['get','id'], '___none___'],
        paint: {
          'circle-radius': STATUS_CIRCLE_RADIUS_PX + 6,
          'circle-color': 'rgba(96,165,250,0.10)',
          'circle-stroke-color': '#60a5fa',
          'circle-stroke-width': 2
        }
      })

      // Cursor
      const setPtr = ()=> map.getCanvas().style.cursor = 'pointer'
      const clrPtr = ()=> map.getCanvas().style.cursor = ''
      map.on('mouseenter', 'drone-icon', setPtr)
      map.on('mouseleave', 'drone-icon', clrPtr)
      map.on('mouseenter', 'drone-status', setPtr)
      map.on('mouseleave', 'drone-status', clrPtr)
      map.on('mouseenter', 'drone-arrow', setPtr)
      map.on('mouseleave', 'drone-arrow', clrPtr)

      // Popup
      const popup = new mapboxgl.Popup({ className:'drone-popup', closeButton:false, closeOnClick:false, offset:18, anchor:'top' })
      function showPopup(e){
        const f = e.features && e.features[0]
        if(!f) return
        const p = f.properties
        const coords = e.lngLat || (f.geometry && f.geometry.coordinates)
        const firstSeen = Number(p.firstSeen)
        const lastSeen = Number(p.lastSeen)
        const flight = formatFlightTime((lastSeen || Date.now()) - firstSeen)
        popup.setLngLat(coords).setHTML(`
          <div class="drp">
            <div class="drp-top">
              <span class="drp-dot" style="background:${p.color || '#999'}"></span>
              <span class="drp-title">${p.name || 'Drone'}</span>
            </div>
            <div class="drp-sub">Reg: ${p.registration || '—'}</div>
            <div class="drp-grid">
              <div class="drp-label">Altitude</div><div class="drp-value">${p.altitude ?? 0} m</div>
              <div class="drp-label">Flight Time</div><div class="drp-value">${flight}</div>
            </div>
          </div>
        `).addTo(map)
      }
      map.on('mousemove', 'drone-icon', showPopup)
      map.on('mousemove', 'drone-status', showPopup)
      map.on('mousemove', 'drone-arrow', showPopup)
      map.on('mouseleave', 'drone-icon', () => popup.remove())
      map.on('mouseleave', 'drone-status', () => popup.remove())
      map.on('mouseleave', 'drone-arrow', () => popup.remove())

      // Click → select & pan
      const onClick = (e) => {
        const f = e.features && e.features[0]
        if(!f) return
        const id = f.properties.id
        select(id)
        const coords = f.geometry?.coordinates || [e.lngLat.lng, e.lngLat.lat]
        map.easeTo({ center: coords, duration: 600, zoom: Math.max(map.getZoom(), 12.5) })
      }
      map.on('click', 'drone-icon', onClick)
      map.on('click', 'drone-status', onClick)
      map.on('click', 'drone-arrow', onClick)

      // Live updates: points, trails, and arrows
      let raf = null
      const updateAll = () => {
        raf = null
        map.getSource('drones')?.setData(getPointsFC())
        map.getSource('paths')?.setData(getLinesFC())
        map.getSource('arrows')?.setData(buildArrowsFC(map))
      }
      const schedule = () => { if(!raf) raf = requestAnimationFrame(updateAll) }
      const unsubData = useDroneStore.subscribe(schedule)
      updateAll()

      // Recompute arrows when map view changes
      const resyncArrows = () => map.getSource('arrows')?.setData(buildArrowsFC(map))
      map.on('move', resyncArrows)
      map.on('zoom', resyncArrows)
      map.on('rotate', resyncArrows)

      return () => {
        unsubData()
        popup.remove()
        map.off('click', 'drone-icon', onClick)
        map.off('click', 'drone-status', onClick)
        map.off('click', 'drone-arrow', onClick)
        map.off('mousemove', 'drone-icon', showPopup)
        map.off('mousemove', 'drone-status', showPopup)
        map.off('mousemove', 'drone-arrow', showPopup)
        map.off('move', resyncArrows)
        map.off('zoom', resyncArrows)
        map.off('rotate', resyncArrows)
      }
    })

    return () => { map.remove(); mapRef.current = null }
  }, [])

  // React to list selections
  useEffect(()=>{
    const map = mapRef.current
    if(!map || !selectedId) return
    const d = useDroneStore.getState().drones.get(selectedId)
    if(!d || !Array.isArray(d.coords)) return
    if(map.getLayer('selected-ring')){
      try { map.setFilter('selected-ring', ['==', ['get','id'], selectedId]) } catch {}
    }
    map.easeTo({ center: d.coords, duration: 600, zoom: Math.max(map.getZoom() || 12, 12.5) })
    map.getSource('arrows')?.setData(buildArrowsFC(map))
  }, [selectedId])

  return <div ref={containerRef} className="map" />
}
