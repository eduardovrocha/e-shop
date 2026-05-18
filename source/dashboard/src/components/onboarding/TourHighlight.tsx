import { cloneElement, isValidElement, useEffect, type ReactElement, type ReactNode } from 'react'

interface SupportedChildProps {
  className?: string
  ref?: React.Ref<unknown>
}

export interface TourHighlightProps {
  /**
   * When false, the ring is not applied. Lets callers toggle the highlight
   * without remounting the wrapped tree.
   */
  active?: boolean
  /**
   * Wrap a single React element. Its className is augmented with
   * `tour-highlight` while active. Use this for declarative tour steps
   * where the target lives inside the same render tree.
   */
  children?: ReactNode
  /**
   * Or, point at an element already mounted elsewhere via a CSS selector.
   * The class is toggled imperatively. Useful when the target is rendered
   * by code we don't own (page components, third-party widgets).
   */
  targetSelector?: string
}

export function TourHighlight({ active = true, children, targetSelector }: TourHighlightProps) {
  useEffect(() => {
    if (!targetSelector) return
    const node = document.querySelector(targetSelector)
    if (!node) return

    if (active) node.classList.add('tour-highlight')
    return () => {
      node.classList.remove('tour-highlight')
    }
  }, [active, targetSelector])

  if (!children) return null
  if (!isValidElement(children)) return <>{children}</>

  if (!active) return <>{children}</>

  const element = children as ReactElement<SupportedChildProps>
  const existing = element.props.className ?? ''
  const merged   = existing ? `${existing} tour-highlight` : 'tour-highlight'

  return cloneElement(element, { className: merged })
}
