import { describe, expect, it, beforeEach } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadStore, persistNewRows, rewriteStore, loadTitles, saveTitles } from '../dsh/store.js'

describe('store.persistNewRows', () => {
  let dir
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tks-store-'))
  })

  it('dedupes by key (first wins without a merge predicate)', () => {
    const { map, usagePath } = loadStore(dir)
    persistNewRows(map, [{ key: 'a|1|1', model: '' }], usagePath)
    persistNewRows(map, [{ key: 'a|1|1', model: 'm' }], usagePath)
    expect(map.size).toBe(1)
    expect(map.get('a|1|1').model).toBe('')
  })

  it('merge predicate upgrades a row', () => {
    const { map, usagePath } = loadStore(dir)
    const merge = (existing, row) => !existing.model && row.model
    persistNewRows(map, [{ key: 'a|1|1', model: '' }], usagePath, merge)
    persistNewRows(map, [{ key: 'a|1|1', model: 'm' }], usagePath, merge)
    expect(map.get('a|1|1').model).toBe('m')
  })

  it('round-trips through the jsonl file', () => {
    const { map, usagePath } = loadStore(dir)
    persistNewRows(map, [{ key: 'a|1|1', a: 1 }], usagePath)
    const { map: reloaded } = loadStore(dir)
    expect(reloaded.get('a|1|1').a).toBe(1)
  })

  it('rewriteStore compacts the file', () => {
    const { map, usagePath } = loadStore(dir)
    persistNewRows(map, [{ key: 'a|1|1', a: 1 }], usagePath)
    persistNewRows(map, [{ key: 'b|1|1', a: 2 }], usagePath)
    rewriteStore(map, usagePath)
    const { map: reloaded } = loadStore(dir)
    expect(reloaded.size).toBe(2)
  })
})

describe('store titles', () => {
  let dir
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tks-title-'))
  })

  it('persists and loads session titles', () => {
    const titles = new Map([['s1', '标题1'], ['s2', '标题2']])
    saveTitles(dir, titles)
    const loaded = loadTitles(dir)
    expect(loaded.get('s1')).toBe('标题1')
    expect(loaded.get('s2')).toBe('标题2')
  })

  it('returns empty map when the file is absent', () => {
    expect(loadTitles(dir).size).toBe(0)
  })
})
