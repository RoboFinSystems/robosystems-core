/**
 * Parse an API timestamp. The API writes UTC with no zone, which `new Date`
 * reads as local time: hours off, enough to show something that ended a
 * moment ago as still running.
 */
export function utcDate(value: string): Date {
  return new Date(/(Z|[+-]\d\d:?\d\d)$/.test(value) ? value : `${value}Z`)
}
