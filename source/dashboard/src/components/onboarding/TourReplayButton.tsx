import { HelpCircle } from 'lucide-react'
import { useTour } from './useTour'
import { Button } from '@/components/ui/button'

/**
 * "Refazer tour" entry point that lives in the dashboard chrome.
 *
 * Calls TourProvider#replayTour which resets the user's progress on the
 * backend, rewinds the local state to step 0, and launches the welcome
 * modal. Per the spec (sec 12.7) the button is visible at all times and
 * works regardless of the current tour status — completed users get the
 * tour back, skipped users get it back, in-progress users restart.
 */
export function TourReplayButton() {
  const { replayTour } = useTour()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => { void replayTour() }}
      title="Refazer tour"
      aria-label="Refazer tour"
      data-testid="tour-replay-button"
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  )
}
