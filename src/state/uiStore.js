import { create } from 'zustand'

export const useUIStore = create((set)=>({
  active: 'map', // 'dashboard' | 'map'
  setActive: (a)=> set({active:a}),
  flyingOpen: true,
  toggleFlying: ()=> set(s=>({flyingOpen: !s.flyingOpen})),
  tab: 'drones', // 'drones' | 'history'
  setTab: (t)=> set({tab:t})
}))
