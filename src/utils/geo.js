/**
 * The backend sends a GeoJSON FeatureCollection with one or many Features.
 * We don't assume any specific number of features.
 * Each Feature has properties including serial, registration, altitude, yaw, etc,
 * and geometry Point [lng, lat].
 */
export function isFeatureCollection(obj){
  return obj && obj.type === 'FeatureCollection' && Array.isArray(obj.features)
}