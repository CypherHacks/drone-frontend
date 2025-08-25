/**
 * Load an SVG (or raster) and register it as a Mapbox image using a canvas.
 * Ensures consistent results for SVGs (Mapbox loadImage can be unreliable with inline/complex SVGs).
 * Usage:
 *   await addSvgAsImage(map, '/icons/drone.svg', 'drone-icon', 64)
 */
export function addSvgAsImage(map, url, name, size=64){
  return new Promise((resolve, reject)=>{
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const w = size
      const h = size
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      let scale = Math.min(w / img.width, h / img.height)
      if(!isFinite(scale) || scale<=0) scale = 1
      const dw = img.width * scale
      const dh = img.height * scale
      const dx = (w - dw)/2
      const dy = (h - dh)/2
      ctx.clearRect(0,0,w,h)
      ctx.drawImage(img, dx, dy, dw, dh)
      const imageData = ctx.getImageData(0,0,w,h)
      if(map.hasImage(name)) map.removeImage(name)
      map.addImage(name, imageData, { pixelRatio: 2 })
      resolve()
    }
    img.onerror = reject
    img.src = url
  })
}
