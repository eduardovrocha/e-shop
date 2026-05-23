import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom doesn't implement scrollIntoView; AccordionStep uses it on
// active-state transitions via a setTimeout, which fires after a test
// finishes and raises an unhandled exception otherwise.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

afterEach(() => {
  cleanup()
})
