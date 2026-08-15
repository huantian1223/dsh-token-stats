import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig } from '../dsh/config.js'

describe('config.loadConfig', () => {
  it('applies defaults', () => {
    const cfg = loadConfig({}, mkdtempSync(join(tmpdir(), 'tks-cfg-')))
    expect(cfg.gapMs).toBe(30 * 60 * 1000)
    expect(cfg.rescanIntervalMs).toBe(30 * 1000)
    expect(cfg.balanceCacheMs).toBe(15 * 60 * 1000)
    expect(cfg.balanceWarnThreshold).toBe(5)
    expect(cfg.defaultRange).toBe('3m')
  })

  it('merges config.json over defaults', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tks-cfg-'))
    writeFileSync(join(dir, 'config.json'), JSON.stringify({ balanceWarnThreshold: 10, defaultRange: '30d' }))
    const cfg = loadConfig({}, dir)
    expect(cfg.balanceWarnThreshold).toBe(10)
    expect(cfg.defaultRange).toBe('30d')
    expect(cfg.gapMs).toBe(30 * 60 * 1000)
  })

  it('patch config wins over the file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tks-cfg-'))
    writeFileSync(join(dir, 'config.json'), JSON.stringify({ gapMs: 1000 }))
    const cfg = loadConfig({ gapMs: 60000 }, dir)
    expect(cfg.gapMs).toBe(60000)
  })

  it('normalizes invalid ranges', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tks-cfg-'))
    writeFileSync(join(dir, 'config.json'), JSON.stringify({ defaultRange: 'bogus' }))
    const cfg = loadConfig({}, dir)
    expect(cfg.defaultRange).toBe('3m')
  })
})
