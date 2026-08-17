import { useId } from 'react'

/**
 * EduGuide brand mark — graduation cap over an open book, drawn as inline SVG
 * so it stays crisp at every size and picks up the indigo → violet system used
 * by both the marketing site and the signed-in app.
 *
 * To ship the exact raster artwork instead, drop the file at
 * public/eduguide-logo.png and swap the <svg> below for an <img>.
 */
export function BrandMark({ size, className, style }) {
  const uid = useId().replace(/:/g, '')
  const deep = `eg-deep-${uid}`
  const bright = `eg-bright-${uid}`

  return (
    <svg
      viewBox="0 0 64 64"
      /* size is optional on purpose — when omitted the surrounding CSS owns the
         dimensions, so media queries can shrink the mark in tight spots. */
      width={size || undefined}
      height={size || undefined}
      className={`brand-mark${className ? ` ${className}` : ''}`}
      style={{ display: 'block', flexShrink: 0, ...style }}
      role="img"
      aria-label="EduGuide"
    >
      <defs>
        <linearGradient id={deep} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4338CA" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        <linearGradient id={bright} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>

      {/* cap band — sits behind the mortarboard, wings visible either side */}
      <path
        d="M19 28 L32 37 L45 28 L45 35 L32 44 L19 35 Z"
        fill={`url(#${bright})`}
        stroke={`url(#${bright})`}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* mortarboard */}
      <path
        d="M32 7 L56 20 L32 33 L8 20 Z"
        fill={`url(#${deep})`}
        stroke={`url(#${deep})`}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d="M32 15.5 L36.2 18.6 L27.8 18.6 Z" fill="#1E1B4B" opacity="0.5" />

      {/* tassel — cord and bead, kept clear of the book below */}
      <path d="M55 20 L55 28.5" stroke={`url(#${deep})`} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path
        d="M55 28 C57.5 30.5 58.4 32.7 58.4 34.4 C58.4 36.7 56.9 38.2 55 38.2 C53.1 38.2 51.6 36.7 51.6 34.4 C51.6 32.7 52.5 30.5 55 28 Z"
        fill={`url(#${deep})`}
      />

      {/* book covers */}
      <path
        d="M9 48 L9 57.5 C15.5 57.5 22.5 59 27.8 61.8"
        fill="none"
        stroke={`url(#${deep})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M55 48 L55 57.5 C48.5 57.5 41.5 59 36.2 61.8"
        fill="none"
        stroke={`url(#${bright})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* book pages */}
      <path
        d="M30 50.4 C25.4 47.4 19.6 46.4 13.6 46.4 L13.6 54.6 C19.6 54.6 25.4 55.8 30 58.8 Z"
        fill={`url(#${deep})`}
      />
      <path
        d="M34 50.4 C38.6 47.4 44.4 46.4 50.4 46.4 L50.4 54.6 C44.4 54.6 38.6 55.8 34 58.8 Z"
        fill={`url(#${bright})`}
      />
    </svg>
  )
}

/**
 * The mark inside its tinted disc — the framed treatment from the brand sheet.
 * Sized by CSS (`.brand-disc`, 40px default) so each placement can scale it.
 */
export function BrandDisc({ className }) {
  return (
    <span className={`brand-disc${className ? ` ${className}` : ''}`}>
      <BrandMark />
    </span>
  )
}

/**
 * Full lockup: disc + wordmark + optional tagline.
 * `tone="light"` renders the text for placement on a dark/photographic panel.
 */
export function BrandLockup({ tagline, tone = 'default', className }) {
  const light = tone === 'light'
  return (
    <span className={`brand-lockup${className ? ` ${className}` : ''}`}>
      <BrandDisc />
      <span className="brand-lockup-text">
        <span className="brand-wordmark" style={light ? { color: '#fff' } : undefined}>
          EduGuide
        </span>
        {tagline && (
          <span
            className="brand-tagline"
            style={light ? { color: 'rgba(255,255,255,0.66)' } : undefined}
          >
            {tagline}
          </span>
        )}
      </span>
    </span>
  )
}

export default BrandMark
