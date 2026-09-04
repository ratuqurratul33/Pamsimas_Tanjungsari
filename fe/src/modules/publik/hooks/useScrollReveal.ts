import { useEffect, useRef } from 'react'

/**
 * Adds 'pub-revealed' class to ref element when it enters viewport.
 * CSS handles the actual transition (opacity + translateY).
 * ponytail: single observer per element, no cleanup leak risk
 */
export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('pub-revealed')
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return ref
}
