import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  isLockHeld,
  isTestRunCommand,
  lockHeldMessage,
  parseLockPid,
  readLiveLockHolder,
  TEST_RUN_COMMAND_PATTERN,
  TEST_RUN_LOCK_FILE,
} from '../../../scripts/test-lock'

describe('TEST_RUN_COMMAND_PATTERN', () => {
  it('matches a runner command line', () => {
    expect(TEST_RUN_COMMAND_PATTERN.test('bun scripts/test-run.ts unit')).toBe(true)
  })
})

describe('isTestRunCommand', () => {
  it.each(['bun scripts/test-run.ts unit', 'bun /abs/scripts/test-run.ts'])(
    'accepts %s',
    command => {
      expect(isTestRunCommand(command)).toBe(true)
    },
  )

  it.each([null, 'sleep 60', 'vim scripts/test-run.tsx', 'bun scripts/my-test-run.ts'])(
    'rejects %s',
    command => {
      expect(isTestRunCommand(command)).toBe(false)
    },
  )
})

describe('isLockHeld', () => {
  it('is not held when the pid is unreadable', () => {
    expect(isLockHeld(null, () => true)).toBe(false)
  })

  it('is not held by the current process', () => {
    expect(isLockHeld(process.pid, () => true)).toBe(false)
  })

  it('is not held when the pid is not a test runner', () => {
    expect(isLockHeld(process.pid + 1, () => false)).toBe(false)
  })

  it('is held by another live test runner', () => {
    expect(isLockHeld(process.pid + 1, () => true)).toBe(true)
  })
})

describe('lockHeldMessage', () => {
  it('names the lock file and gives no kill command without a pid', () => {
    const message: string = lockHeldMessage(null)
    expect(message).toContain(TEST_RUN_LOCK_FILE)
    expect(message).not.toContain('kill')
  })

  it('gives the kill command of the holder', () => {
    expect(lockHeldMessage(4242)).toContain('kill 4242')
  })
})

describe('parseLockPid', () => {
  it('reads a pid followed by a newline', () => {
    expect(parseLockPid('1234\n')).toBe(1234)
  })

  it.each(['', 'abc', '0', '-5', '12.5', '12 34'])('returns null for %j', content => {
    expect(parseLockPid(content)).toBeNull()
  })
})

describe('readLiveLockHolder', () => {
  const DEAD_PID: number = 2_147_483_646
  let rootDir: string = ''

  const writeLock = async (content: string): Promise<void> => {
    await mkdir(join(rootDir, '.cache'), { recursive: true })
    await writeFile(join(rootDir, TEST_RUN_LOCK_FILE), content)
  }

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'binovya-lock-'))
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('returns null when there is no lock file', async () => {
    expect(await readLiveLockHolder(rootDir)).toBeNull()
  })

  it('returns null when the lock belongs to the current process', async () => {
    await writeLock(`${process.pid}\n`)
    expect(await readLiveLockHolder(rootDir)).toBeNull()
  })

  it('returns null when the lock content is not a pid', async () => {
    await writeLock('not-a-pid')
    expect(await readLiveLockHolder(rootDir)).toBeNull()
  })

  it('returns null when the pid is dead', async () => {
    await writeLock(`${DEAD_PID}\n`)
    expect(await readLiveLockHolder(rootDir)).toBeNull()
  })
})
