import { HelpCircle } from 'lucide-react'
import { useTour } from './useTour'
import { Button } from '@/components/ui/button'

/**
 * "Refazer tour" entry point that lives in the dashboard chrome.
 *
 * Opens the tour catalog modal so the user can pick which phase to replay
 * (setup inicial or operação). The provider does the actual reset / state
 * flip once a phase is chosen.
 */
export function TourReplayButton() {
  const { requestReplay } = useTour()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={requestReplay}
      title="Refazer tour"
      aria-label="Refazer tour"
      data-testid="tour-replay-button"
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  )
}
