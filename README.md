# Drone Frontend (React + Mapbox + Socket.IO)

Minimal frontend focused on **pulling the right data** from the provided backend over WebSocket and rendering it efficiently on a Mapbox map.

## Quick start

1) Copy `.env.sample` to `.env` and set:
```
VITE_MAPBOX_TOKEN=your_mapbox_access_token
VITE_SOCKET_URL=http://localhost:9013
```

2) Install deps & run:
```
npm install
npm run dev
```

3) Make sure the backend (Socket.IO server) is running on `VITE_SOCKET_URL`. The app listens to the `message` event that emits a GeoJSON FeatureCollection.

## What it does

- Connects to Socket.IO (`transports: ['polling']`) and listens for `message` events.
- Expects **GeoJSON FeatureCollection**; each feature should contain:
  - `properties`: `serial`, `registration`, `Name`, `altitude`, `pilot`, `organization`, `yaw`
  - `geometry`: `Point` with `[lng, lat]`
- Tracks each drone by `serial` (fallback to `registration`) and accumulates the **path since page load**.
- Renders:
  - A **symbol layer** for drones with an oriented arrow (`yaw`) and data-driven color (green if registration's first letter *after the hyphen* is `B`, else red).
  - A **line layer** for each drone path.
  - A **sidebar list** and a **bottom-right red-drone counter**.
- Interactions:
  - Hover on a drone → popup with **flight time** (since first seen on this page) and **altitude**.
  - Click a drone on the **map** → highlights it in the list.
  - Click a drone in the **list** → map pans to that drone.

## Notes

- Designed to scale: uses a single GeoJSON source for points and another for lines (no heavy React markers).
- State management via **Zustand**.
- Responsive without design polish (focus is data plumbing + correctness).