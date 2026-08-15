import { describe, expect, it } from 'vitest'
import { parseSessionArtifact } from '../dsh/scan.js'

const LOG = [
  '{"type":"session","id":"s1","cwd":"C:\\\\work"}',
  '{"type":"session/title","seq":2,"data":{"title":"初始标题"}}',
  '{"type":"session/title","seq":5,"data":{"title":"最终标题"}}',
  '{"type":"request/header","seq":6,"data":{"header":{"config":{"provider":"p1","model":"m1"}}}}',
  '{"type":"assistant/chunk","seq":10,"time":1000,"data":{"turn":1,"step":1,"chunk":{"type":"usage","usage":{"inputTokens":10,"outputTokens":20,"cacheReadTokens":30,"cacheWriteTokens":0,"reasoningTokens":5}}}}',
  '{"type":"assistant/message","seq":12,"time":2000,"data":{"turn":1,"step":1,"usage":{"inputTokens":100,"outputTokens":200,"cacheReadTokens":300,"cacheWriteTokens":0,"reasoningTokens":50}}}',
  '{"type":"user/message","seq":13,"time":3000,"data":{"content":"hello"}}',
].join('\n')

describe('scan.parseSessionArtifact', () => {
  it('extracts usage, title (latest wins) and workspace', () => {
    const { sessionId, workspace, title, rows } = parseSessionArtifact(LOG, 'fallback')
    expect(sessionId).toBe('s1')
    expect(workspace).toBe('C:\\work')
    expect(title).toBe('最终标题')
    const row = rows.get('s1|1|1')
    // the final assistant/message usage replaces the earlier chunk sample
    expect(row.input).toBe(100)
    expect(row.output).toBe(200)
    expect(row.cacheRead).toBe(300)
    expect(row.reasoning).toBe(50)
    expect(row.model).toBe('m1')
    expect(row.ts).toBe(2000)
    expect(rows.size).toBe(1)
  })

  it('falls back to the artifact path id and empty title', () => {
    const { sessionId, title, rows } = parseSessionArtifact('{"type":"assistant/message","seq":1,"time":1,"data":{"turn":0,"step":0,"usage":{"inputTokens":1}}}', '/x/session.jsonl.zstd')
    expect(sessionId).toBe('/x/session.jsonl.zstd')
    expect(title).toBe('')
    expect(rows.size).toBe(1)
  })
})
