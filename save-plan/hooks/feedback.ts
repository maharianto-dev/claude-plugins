// When the user picks "No, keep planning" on the plan review screen, the model reads this lead and then
// what the user typed in the box.
const LEAD = 'To tell you how to proceed, the user said:\n'
// A note the engine may add after the user's words.
const NOTE = "\nNote: The user's next message may contain a correction"

// Words that may ask to save the plan. Only feedback with one of them is sent to the model to classify.
const SAVE_WORDS = /\b(sav|keep|stor|stash|nam|call)/i

/** The text the user typed when rejecting the plan, or null when the rejection carries none. */
export function feedbackOf(rejection: string): string | null {
  const at = rejection.indexOf(LEAD)
  if (at === -1) return null
  const rest = rejection.slice(at + LEAD.length)
  const end = rest.indexOf(NOTE)
  const typed = (end === -1 ? rest : rest.slice(0, end)).trim()
  return typed === '' ? null : typed
}

export const maySave = (feedback: string) => SAVE_WORDS.test(feedback)
