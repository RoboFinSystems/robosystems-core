/**
 * The message sent for one question: the anchor note the host page wrote
 * for the report on screen, then the question. The note rides on every
 * message because the operator does not yet read `context.focus` into its
 * prompt; when it does, hosts can pass `focus` alone and an empty note.
 */
export function anchoredMessage(anchorNote: string, question: string): string {
  const q = question.trim()
  const note = anchorNote.trim()
  return note ? `${note}\n\nQuestion: ${q}` : q
}

/** The first non-empty string among an operator failure's fields. */
export function errorDetail(
  details: Record<string, unknown> | undefined,
  fallback: string
): string {
  if (!details) return fallback
  const found = [details.message, details.error, details.detail].find(
    (v): v is string => typeof v === 'string' && v.length > 0
  )
  return found ?? fallback
}
