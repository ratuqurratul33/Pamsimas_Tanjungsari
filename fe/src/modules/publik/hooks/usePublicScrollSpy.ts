import { useEffect, useState } from 'react'

export const publicSectionIds = ['home', 'map', 'transparency', 'about', 'faq'] as const

export type PublicSectionId = typeof publicSectionIds[number]

export function usePublicScrollSpy() {
  const [activeSection, setActiveSection] = useState<PublicSectionId>('home')

  useEffect(() => {
    const sections = publicSectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null)

    if (sections.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0]

        if (visibleEntry?.target.id) {
          setActiveSection(visibleEntry.target.id as PublicSectionId)
        }
      },
      {
        rootMargin: '-24% 0px -58% 0px',
        threshold: [0.12, 0.24, 0.4, 0.6],
      },
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])

  return activeSection
}

export function scrollToPublicSection(id: PublicSectionId) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
