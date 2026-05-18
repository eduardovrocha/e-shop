import '@testing-library/jest-dom'

// jsdom does not implement matchMedia. Polyfill with a no-op MediaQueryList
// so components that listen to `prefers-reduced-motion`, viewport widths, or
// `prefers-color-scheme` render without throwing in tests.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener:    () => {},
    removeListener: () => {},
    addEventListener:    () => {},
    removeEventListener: () => {},
    dispatchEvent:       () => false,
  })
}
