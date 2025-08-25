import { create } from 'zustand'
import { useDroneStore } from './droneStore.js'

/**
 * Lightweight time-series sampler for the dashboard.
 * Samples every 2s: total, green, red, avg altitude.
 * Keeps up to 120 samples (~4 minutes at 2s/sample).
 */

let started = false
let timer = null

export const useMetricsStore = create((set, get) => ({
  samples: [],              // [{ t, total, green, red, avgAlt }]
  maxSamples: 120,
}))

export function ensureMetricsStarted(){
  if (started) return
  started = true

  const sample = () => {
    const s = useDroneStore.getState()
    const total = s.drones.size
    const red = s.redCount
    const green = Math.max(0, total - red)
    let sumAlt = 0, n = 0
    for (const d of s.drones.values()) { sumAlt += Number(d.altitude || 0); n++ }
    const avgAlt = n ? sumAlt / n : 0

    const snap = { t: Date.now(), total, green, red, avgAlt }
    useMetricsStore.setState(st => {
      const keep = Math.max(0, (st.samples?.length || 0) - (st.maxSamples - 1))
      const next = (st.samples || []).slice(keep)
      next.push(snap)
      return { samples: next }
    })
  }

  // start immediately, then at an interval
  sample()
  timer = setInterval(sample, 2000)
}
