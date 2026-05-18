import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TourHighlight } from '../TourHighlight'

describe('TourHighlight', () => {
  it('wraps the child and applies tour-highlight class while active', () => {
    render(
      <TourHighlight active>
        <button>Target</button>
      </TourHighlight>
    )
    const button = screen.getByText('Target')
    expect(button.className).toContain('tour-highlight')
  })

  it('preserves existing className on the child', () => {
    render(
      <TourHighlight active>
        <button className="existing-class">Target</button>
      </TourHighlight>
    )
    const button = screen.getByText('Target')
    expect(button.className).toContain('existing-class')
    expect(button.className).toContain('tour-highlight')
  })

  it('does not apply the class when inactive', () => {
    render(
      <TourHighlight active={false}>
        <button>Target</button>
      </TourHighlight>
    )
    expect(screen.getByText('Target').className).not.toContain('tour-highlight')
  })

  it('imperatively toggles class on an existing DOM node when targetSelector is provided', () => {
    const external = document.createElement('div')
    external.id = 'external-target'
    document.body.appendChild(external)

    const { rerender, unmount } = render(
      <TourHighlight active targetSelector="#external-target" />
    )
    expect(external.classList.contains('tour-highlight')).toBe(true)

    rerender(<TourHighlight active={false} targetSelector="#external-target" />)
    expect(external.classList.contains('tour-highlight')).toBe(false)

    unmount()
    document.body.removeChild(external)
  })

  it('returns null gracefully when given no children and no selector', () => {
    const { container } = render(<TourHighlight />)
    expect(container.firstChild).toBeNull()
  })
})
