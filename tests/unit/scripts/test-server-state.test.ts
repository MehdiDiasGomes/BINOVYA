import { describe, expect, it } from 'vitest'

import {
  parseTestServerState,
  portInUseMessage,
  type TestServerState,
} from '../../../scripts/test-server-state'

const VALID_STATE: TestServerState = {
  runnerPid: 100,
  serverPgid: 200,
  listenerPid: 300,
  port: 3001,
  outboxDir: '.mail-outbox/test-server',
}

describe('parseTestServerState', () => {
  it('accepts a complete state', () => {
    expect(parseTestServerState({ ...VALID_STATE })).toEqual(VALID_STATE)
  })

  it('rejects a state missing a key', () => {
    const partial: Partial<TestServerState> = { ...VALID_STATE }
    delete partial.listenerPid
    expect(parseTestServerState(partial)).toBeNull()
  })

  it('rejects a state with an extra key', () => {
    expect(parseTestServerState({ ...VALID_STATE, extra: 1 })).toBeNull()
  })

  it('rejects a pid of 0', () => {
    expect(parseTestServerState({ ...VALID_STATE, runnerPid: 0 })).toBeNull()
  })

  it('rejects a non-integer pid', () => {
    expect(parseTestServerState({ ...VALID_STATE, serverPgid: 1.5 })).toBeNull()
  })

  it('rejects an array', () => {
    expect(parseTestServerState([VALID_STATE])).toBeNull()
  })

  it('rejects null', () => {
    expect(parseTestServerState(null)).toBeNull()
  })
})

describe('portInUseMessage', () => {
  it('gives no kill hint when there is no state', () => {
    const message: string = portInUseMessage(3001, null)
    expect(message).toContain('3001')
    expect(message).not.toContain('kill')
  })

  it('gives no kill hint when the state records another port', () => {
    expect(portInUseMessage(3002, VALID_STATE)).not.toContain('kill')
  })

  it('gives the kill commands of the recorded server for the same port', () => {
    const message: string = portInUseMessage(3001, VALID_STATE)
    expect(message).toContain('kill -- -200')
    expect(message).toContain('kill 300')
  })
})
