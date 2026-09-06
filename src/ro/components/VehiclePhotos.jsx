import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react'

export default function VehiclePhotos({ vehicle, thumb }) {
  const photos =
    vehicle.images && vehicle.images.length
      ? vehicle.images
      : vehicle.photoUrl
        ? [vehicle.photoUrl]
        : []
  const thumbSize = { width: 74, height: 54, borderRadius: 10, ...thumb }
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!open || photos.length === 0) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, photos.length])

  if (photos.length === 0) return null

  return (
    <>
      <button
        type="button"
        onClick={() => { setIndex(0); setOpen(true) }}
        aria-label={`View photos of ${vehicle.model}`}
        style={{
          position: 'relative',
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <img
          src={photos[0]}
          alt={vehicle.model}
          style={{ width: thumbSize.width, height: thumbSize.height, objectFit: 'cover', borderRadius: thumbSize.borderRadius, display: 'block' }}
        />
        {photos.length > 1 && (
          <span
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              background: 'rgba(15, 23, 42, .75)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 999,
              padding: '2px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              pointerEvents: 'none',
            }}
          >
            <Camera size={11} /> {photos.length}
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(10, 15, 30, .92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 18,
              right: 22,
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 6,
            }}
          >
            <X size={28} />
          </button>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              width: '100%',
              maxWidth: 'min(1040px, 92vw)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
              aria-label="Previous photo"
              style={{
                flexShrink: 0,
                background: 'rgba(15, 23, 42, .8)',
                border: '1px solid rgba(255,255,255,.35)',
                color: '#fff',
                borderRadius: '50%',
                width: 44,
                height: 44,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={28} />
            </button>
            <img
              src={photos[index]}
              alt={`${vehicle.model} photo ${index + 1}`}
              style={{ minWidth: 0, flex: 1, maxHeight: '74vh', maxWidth: '100%', objectFit: 'contain', borderRadius: 8 }}
            />
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % photos.length)}
              aria-label="Next photo"
              style={{
                flexShrink: 0,
                background: 'rgba(15, 23, 42, .8)',
                border: '1px solid rgba(255,255,255,.35)',
                color: '#fff',
                borderRadius: '50%',
                width: 44,
                height: 44,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={28} />
            </button>
          </div>

          <div style={{ marginTop: 18, color: '#fff', fontSize: 14, fontWeight: 600 }}>
            {index + 1} / {photos.length}
          </div>

          {photos.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 14,
                flexWrap: 'wrap',
                justifyContent: 'center',
                maxWidth: '92vw',
              }}
            >
              {photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Photo ${i + 1}`}
                  style={{
                    padding: 0,
                    border: i === index ? '2px solid #fff' : '2px solid transparent',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: 'none',
                  }}
                >
                  <img src={src} alt="" style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}