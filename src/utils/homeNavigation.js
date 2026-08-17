import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export function scrollToPageTop(behavior = 'smooth') {
  window.scrollTo({ top: 0, left: 0, behavior })
}

export function useNavigatePageTop(path) {
  const location = useLocation()
  const navigate = useNavigate()

  return useCallback((event) => {
    event?.preventDefault()

    if (location.pathname === path) {
      scrollToPageTop()
      return
    }

    navigate(path, { state: { scrollToTop: true } })
  }, [location.pathname, navigate, path])
}

export function useNavigateHomeTop() {
  return useNavigatePageTop('/')
}

export function RouteScrollRestoration() {
  const location = useLocation()

  useEffect(() => {
    // A hash means the link is aiming at a section (e.g. /product#analytics),
    // so jumping to the top would undo it.
    if (location.hash) {
      const frameId = requestAnimationFrame(() => {
        const target = document.getElementById(location.hash.slice(1))
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        else scrollToPageTop('auto')
      })
      return () => cancelAnimationFrame(frameId)
    }

    const frameId = requestAnimationFrame(() => {
      scrollToPageTop(location.state?.scrollToTop ? 'smooth' : 'auto')
    })

    return () => cancelAnimationFrame(frameId)
  }, [location.key, location.pathname, location.hash, location.state])

  return null
}

export function useScrollHomeTopOnArrival() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname !== '/' || !location.state?.scrollToTop) return

    const frameId = requestAnimationFrame(() => {
      scrollToPageTop()
    })

    return () => cancelAnimationFrame(frameId)
  }, [location.key, location.pathname, location.state])
}
