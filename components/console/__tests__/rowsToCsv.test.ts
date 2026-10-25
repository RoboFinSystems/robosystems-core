import { describe, expect, it } from 'vitest'
import { rowsToCsv } from '../ConsoleContent'

describe('rowsToCsv', () => {
  it('neutralises cells and headers a spreadsheet would run as formulas', () => {
    const csv = rowsToCsv([
      { name: '=HYPERLINK("x")', balance: -5, '+alias': '@cmd' },
    ])
    expect(csv.split('\n')).toEqual([
      "name,balance,'+alias",
      `"'=HYPERLINK(""x"")",-5,'@cmd`,
    ])
  })

  it('quotes delimiters, quotes and line breaks, and serialises objects', () => {
    const csv = rowsToCsv([{ a: 'x,y', b: 'say "hi"', c: { k: 1 }, d: null }])
    expect(csv.split('\n')[1]).toBe('"x,y","say ""hi""","{""k"":1}",')
  })
})
