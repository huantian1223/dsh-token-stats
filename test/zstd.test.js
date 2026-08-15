import { describe, expect, it } from 'vitest'
import { zstdCompressSync } from 'node:zlib'
import { decompressSessionArtifact, scanZstdFrames } from '../dsh/zstd.js'

describe('zstd multi-frame handling', () => {
  it('locates and decodes concatenated frames', () => {
    const a = zstdCompressSync(Buffer.from('line-a\n'))
    const b = zstdCompressSync(Buffer.from('line-b\n'))
    const buf = Buffer.concat([a, b])
    const { frames } = scanZstdFrames(buf)
    expect(frames.length).toBe(2)
    const text = decompressSessionArtifact(buf)
    expect(text).toBe('line-a\nline-b\n')
  })

  it('skips a torn trailing frame', () => {
    const a = zstdCompressSync(Buffer.from('ok\n'))
    // corrupt tail: valid magic + garbage truncated body
    const torn = Buffer.concat([a, Buffer.from([0x28, 0xb5, 0x2f, 0xfd, 0x01])])
    const text = decompressSessionArtifact(torn)
    expect(text).toBe('ok\n')
  })
})
