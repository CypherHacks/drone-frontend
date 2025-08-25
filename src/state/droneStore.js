import { create } from 'zustand'

// ---------- helpers ----------
function regStartsWithB(reg){
  if(!reg || typeof reg !== 'string') return false
  const parts = reg.split('-')
  const tail = (parts[1] || parts[0] || '').toUpperCase()
  return tail.startsWith('B')
}

function stableId(props, coords){
  if(props.serial && String(props.serial).length >= 3) return String(props.serial)
  if(props.id && String(props.id).length >= 3) return String(props.id)
  if(props.registration && String(props.registration).length >= 3) return String(props.registration)
  const base = [props.Name || props.name || 'Drone', props.pilot || '', props.organization || ''].join('|')
  const lng = Math.round((coords?.[0] ?? 0) * 10)/10
  const lat = Math.round((coords?.[1] ?? 0) * 10)/10
  return base + '|' + lng + ',' + lat
}

function now(){ return Date.now() }

// flat-earth approx (meters) — good enough for NN matching
function distanceMeters(a, b){
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const toRad = Math.PI/180
  const x = (lng2 - lng1) * Math.cos(((lat1 + lat2)/2) * toRad) * 111320
  const y = (lat2 - lat1) * 110540
  return Math.hypot(x, y)
}

// Bearing from p1 -> p2 in degrees [0,360)
function bearingFrom(p1, p2){
  const [lng1, lat1] = p1, [lng2, lat2] = p2
  const toRad = Math.PI/180, toDeg = 180/Math.PI
  const φ1 = lat1*toRad, φ2 = lat2*toRad, Δλ = (lng2-lng1)*toRad
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ)
  const θ = Math.atan2(y, x) * toDeg
  return (θ + 360) % 360
}

function normalizeDeg(v){
  let d = Number(v || 0)
  if(!isFinite(d)) d = 0
  d = ((d % 360) + 360) % 360
  return d
}

// Smooth angles with wrap-around (alpha in (0,1])
function smoothAngle(prev, next, alpha=0.6){
  if(prev == null || !isFinite(prev)) return normalizeDeg(next)
  let delta = ((next - prev + 540) % 360) - 180 // shortest signed diff
  return normalizeDeg(prev + alpha * delta)
}

const initialFC = { type:'FeatureCollection', features: [] }

// Distance threshold for NN association (meters)
const DMAX_METERS = 1500

// ---------- store ----------
export const useDroneStore = create((set, get) => ({
  drones: new Map(),   // id -> { id, coords, heading, ... }
  paths: new Map(),    // id -> [[lng,lat], ...]
  _pointsFC: initialFC,
  _linesFC: initialFC,

  selectedId: null,
  search: '',
  redCount: 0,
  _nextTrack: 1,

  setSearch: (s) => set({search: s}),
  select: (id) => set({ selectedId: id }),

  upsertFromFeatureCollection: (fc) => {
    if(!fc || !fc.features) return

    const drones = new Map(get().drones)
    const paths = new Map(get().paths)

    // snapshot existing tracks for NN association
    const existing = Array.from(drones.entries()).map(([id, d]) => ({ id, coords: d.coords }))
    const matchedExisting = new Set()

    for(const feat of fc.features){
      if(!feat || feat.type !== 'Feature') continue
      const props = feat.properties || {}
      const geom = feat.geometry || {}
      if(geom.type !== 'Point' || !Array.isArray(geom.coordinates)) continue

      const coord = [geom.coordinates[0], geom.coordinates[1]]
      let id = stableId(props, coord)

      // Prefer true stable id; else nearest neighbor track within threshold
      if(!drones.has(id)){
        let best = null
        for(const cand of existing){
          if(matchedExisting.has(cand.id)) continue
          const dist = distanceMeters(cand.coords, coord)
          if(dist <= DMAX_METERS && (!best || dist < best.dist)){
            best = { id: cand.id, dist }
          }
        }
        if(best){
          id = best.id
          matchedExisting.add(best.id)
        }else if(drones.has(id)){ // edge collision
          const n = get()._nextTrack
          id = `trk-${String(n).padStart(4,'0')}`
          set({ _nextTrack: n + 1 })
        }
      }

      const prev = drones.get(id)
      const firstSeen = prev?.firstSeen || now()

      // Update / append to path
      const prior = paths.get(id) || []
      const last = prior[prior.length-1]
      if(!last || last[0] !== coord[0] || last[1] !== coord[1]){
        if(prior.length > 8000) prior.shift()
        prior.push(coord)
        paths.set(id, prior)
      }

      // Compute heading: prefer backend yaw; else course-over-ground
      let yawRaw = Number(props.yaw)
      if(!isFinite(yawRaw)) yawRaw = 0
      // if looks like radians, convert to deg
      if(Math.abs(yawRaw) <= Math.PI + 1e-6) yawRaw = yawRaw * (180/Math.PI)
      yawRaw = normalizeDeg(yawRaw)

      let candidate = yawRaw
      if(prior.length >= 2){
        const cog = bearingFrom(prior[prior.length-2], prior[prior.length-1])
        const yawMissing = !isFinite(Number(props.yaw)) || Math.abs(Number(props.yaw)) < 1e-3
        candidate = yawMissing ? cog : candidate
        const diff = Math.abs(((candidate - cog + 540) % 360) - 180)
        if(diff > 120) candidate = cog // snap if way off
      }

      const heading = smoothAngle(prev?.heading, candidate, 0.6)

      // Write record
      const record = {
        id,
        name: props.Name || props.name || prev?.name || 'DJI Drone',
        registration: props.registration ?? prev?.registration ?? '',
        altitude: Number(props.altitude ?? prev?.altitude ?? 0),
        yaw: yawRaw,     // normalized raw yaw (for debugging)
        heading,         // smoothed heading used by UI
        pilot: props.pilot ?? prev?.pilot ?? '—',
        organization: props.organization ?? prev?.organization ?? '—',
        coords: coord,
        firstSeen,
        lastSeen: now(),
      }
      drones.set(id, record)
    }

    // Build GeoJSON
    const pointFeatures = []
    const lineFeatures = []
    let red = 0
    const colors = new Map()

    for(const [id, d] of drones){
      const color = regStartsWithB(d.registration) ? '#10b981' : '#ef4444'
      if(color === '#ef4444') red++
      colors.set(id, color)

      pointFeatures.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: d.coords },
        properties: {
          id,
          name: d.name,
          registration: d.registration,
          altitude: d.altitude,
          yaw: d.yaw,
          heading: d.heading,   // ← map will use this
          pilot: d.pilot,
          organization: d.organization,
          firstSeen: d.firstSeen,
          lastSeen: d.lastSeen,
          color
        }
      })
    }

    for(const [id, coords] of paths){
      if(coords.length < 2) continue
      lineFeatures.push({
        type:'Feature',
        geometry: { type:'LineString', coordinates: coords },
        properties: { id, color: colors.get(id) || '#999' }
      })
    }

    set({
      drones,
      paths,
      redCount: red,
      _pointsFC: { type:'FeatureCollection', features: pointFeatures },
      _linesFC: { type:'FeatureCollection', features: lineFeatures }
    })
  },

  getPointsFC: () => get()._pointsFC,
  getLinesFC: () => get()._linesFC,

  list: () => {
    const s = get().search.toLowerCase()
    const arr = Array.from(get().drones.values())
    return arr
      .filter(d => !s || d.id.toLowerCase().includes(s) || d.registration.toLowerCase().includes(s))
      .sort((a,b)=> (b.lastSeen - a.lastSeen))
  },
}))

export function formatFlightTime(ms){
  const total = Math.max(0, Math.floor(ms/1000))
  const h = Math.floor(total/3600)
  const m = Math.floor((total%3600)/60)
  const s = total%60
  return (h>0? `${h}h `: '') + `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}
