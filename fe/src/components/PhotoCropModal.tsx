import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

const BOX_SIZE = 260
const OUTPUT_SIZE = 480
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.08

type PhotoCropModalProps = {
  description?: string
  imageUrl: string
  onApply: (result: { blob: Blob; dataUrl: string }) => void
  onCancel: () => void
  title: string
}

type Offset = { x: number; y: number }

/**
 * Shared photo cropper for admin's own photo, an officer's photo, and a
 * public-profile member's photo — replaces three near-identical slider-based
 * (Zoom/Geser X/Geser Y) crop modals that each had their own copy of the
 * "cover" sizing math. That math double-applied the aspect-ratio factor for
 * portrait images, over-zooming them; this uses a single correct formula for
 * both orientations. Interaction is direct drag-to-pan on the image plus
 * wheel/button zoom, instead of three separate labeled sliders.
 */
export function PhotoCropModal({ description, imageUrl, onApply, onCancel, title }: PhotoCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; startOffset: Offset } | null>(null)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      imageRef.current = image
      setZoom(MIN_ZOOM)
      setOffset({ x: 0, y: 0 })
      setIsReady(true)
    }
    image.src = imageUrl
    return () => { cancelled = true }
  }, [imageUrl])

  useEffect(() => {
    if (!isReady || !canvasRef.current) return
    draw(canvasRef.current, imageRef.current, zoom, offset, BOX_SIZE)
  }, [isReady, zoom, offset])

  function clampOffset(nextOffset: Offset, nextZoom: number): Offset {
    const image = imageRef.current
    if (!image) return nextOffset

    const { drawWidth, drawHeight } = coverSize(image.width, image.height, BOX_SIZE, nextZoom)
    const maxX = Math.max(0, (drawWidth - BOX_SIZE) / 2)
    const maxY = Math.max(0, (drawHeight - BOX_SIZE) / 2)

    return {
      x: Math.min(maxX, Math.max(-maxX, nextOffset.x)),
      y: Math.min(maxY, Math.max(-maxY, nextOffset.y)),
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { startOffset: offset, startX: event.clientX, startY: event.clientY }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return
    const { startOffset, startX, startY } = dragRef.current
    const nextOffset = { x: startOffset.x + (event.clientX - startX), y: startOffset.y + (event.clientY - startY) }
    setOffset(clampOffset(nextOffset, zoom))
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
  }

  function applyZoom(nextZoom: number) {
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom))
    setZoom(clampedZoom)
    setOffset((current) => clampOffset(current, clampedZoom))
  }

  function handleWheel(event: React.WheelEvent<HTMLCanvasElement>) {
    event.preventDefault()
    applyZoom(zoom - Math.sign(event.deltaY) * ZOOM_STEP)
  }

  function handleApply() {
    const image = imageRef.current
    if (!image) return

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const scaleUp = OUTPUT_SIZE / BOX_SIZE
    draw(canvas, image, zoom, { x: offset.x * scaleUp, y: offset.y * scaleUp }, OUTPUT_SIZE)

    canvas.toBlob((blob) => {
      if (!blob) return
      onApply({ blob, dataUrl: canvas.toDataURL('image/jpeg', 0.9) })
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal compact-modal photo-crop-modal">
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            <p>{description ?? 'Geser gambar untuk atur posisi, scroll untuk perbesar/perkecil.'}</p>
          </div>
          <button className="icon-btn" onClick={onCancel} type="button"><Icon name="close" /></button>
        </div>
        <div className="photo-crop-body">
          <canvas
            className="photo-crop-canvas"
            height={BOX_SIZE}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            ref={canvasRef}
            width={BOX_SIZE}
          />
          <div className="photo-crop-zoom">
            <button aria-label="Perkecil" onClick={() => applyZoom(zoom - ZOOM_STEP)} type="button">−</button>
            <input
              max={MAX_ZOOM}
              min={MIN_ZOOM}
              onChange={(event) => applyZoom(Number(event.target.value))}
              step={0.01}
              type="range"
              value={zoom}
            />
            <button aria-label="Perbesar" onClick={() => applyZoom(zoom + ZOOM_STEP)} type="button">+</button>
          </div>
        </div>
        <div className="modal-foot">
          <button className="ghost" onClick={onCancel} type="button">Batal</button>
          <button className="primary" onClick={handleApply} type="button">Gunakan Foto</button>
        </div>
      </div>
    </div>
  )
}

function coverSize(imageWidth: number, imageHeight: number, boxSize: number, zoom: number) {
  const coverScale = Math.max(boxSize / imageWidth, boxSize / imageHeight)

  return {
    drawWidth: imageWidth * coverScale * zoom,
    drawHeight: imageHeight * coverScale * zoom,
  }
}

function draw(canvas: HTMLCanvasElement, image: HTMLImageElement | null, zoom: number, offset: Offset, boxSize: number) {
  const context = canvas.getContext('2d')
  if (!context || !image) return

  const { drawWidth, drawHeight } = coverSize(image.width, image.height, boxSize, zoom)
  const x = (boxSize - drawWidth) / 2 + offset.x
  const y = (boxSize - drawHeight) / 2 + offset.y

  context.save()
  context.clearRect(0, 0, boxSize, boxSize)
  context.beginPath()
  context.arc(boxSize / 2, boxSize / 2, boxSize / 2, 0, Math.PI * 2)
  context.clip()
  context.fillStyle = '#e9f4fb'
  context.fillRect(0, 0, boxSize, boxSize)
  context.drawImage(image, x, y, drawWidth, drawHeight)
  context.restore()
}
