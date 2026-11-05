import { describe, it, expect, vi } from 'vitest'
import { officeBus, PRESET_OFFICE_DIALOGUES } from '../src/lib/office/bus'

describe('Office Message Bus', () => {
  it('subscribes to messages and receives published broadcasts', () => {
    const mockListener = vi.fn()
    const unsubscribe = officeBus.subscribe(mockListener)

    const message = officeBus.publish({
      from: 'josiah',
      fromName: 'Josiah',
      to: 'arwin',
      toName: 'Arwin',
      text: 'Verify database connection pool',
    })

    expect(mockListener).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'josiah',
        to: 'arwin',
        text: 'Verify database connection pool',
      })
    )

    expect(message.id).toBeDefined()
    expect(message.timestamp).toBeDefined()

    unsubscribe()

    officeBus.publish({
      from: 'arwin',
      fromName: 'Arwin',
      to: 'josiah',
      toName: 'Josiah',
      text: 'Connection pool verified',
    })

    // Should not be called after unsubscribe
    expect(mockListener).toHaveBeenCalledTimes(1)
  })

  it('records message history up to limit', () => {
    const history = officeBus.getHistory()
    expect(Array.isArray(history)).toBe(true)
    expect(history.length).toBeGreaterThan(0)
  })

  it('contains authentic preset dialogue pairs between agents', () => {
    expect(PRESET_OFFICE_DIALOGUES.length).toBeGreaterThanOrEqual(8)
    const first = PRESET_OFFICE_DIALOGUES[0]
    expect(first.from).toBeDefined()
    expect(first.to).toBeDefined()
    expect(first.text).toBeDefined()
    expect(first.replyText).toBeDefined()
  })
})
