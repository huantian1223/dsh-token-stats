// Multi-frame Zstandard handling for DeepSeek Harness session logs.
//
// Session artifacts are `session.jsonl.zstd`: the header plus every durable
// event batch are appended as an INDEPENDENT, checksummed zstd frame, so
// Node's one-shot `zstdDecompressSync` (which stops after the first frame)
// and even the streaming decoder cannot be used directly. This module locates
// complete frames by parsing the frame container structure without
// decompressing blocks (same approach as the harness's own persistence
// backend, reimplemented here against public node:zlib APIs only, so the
// plugin keeps no dependency on dsh internal subpaths), then decodes each
// frame individually with the public one-shot sync API.
//
// Torn frames (a crash mid-append leaves a partial final frame) are skipped
// with a best-effort resync: after a torn frame the scanner looks for the
// next frame magic further in the buffer and resumes there, so events
// appended after a crash are still picked up.

import { zstdDecompressSync } from 'node:zlib'

/** Little-endian bytes of the Zstandard frame magic 0xFD2FB528. */
const ZSTD_MAGIC = 0xfd2fb528

/**
 * Locate complete zstd frames in a session artifact buffer without
 * decompressing their blocks. Mirrors the durable-log backend's scanner.
 *
 * @param {Buffer} buffer - complete bytes currently present in the artifact.
 * @param {number} [maxFrames=Infinity] - optional complete-frame limit.
 * @returns {{ frames: Array<{start:number,end:number}>, tornStart?: number }}
 */
export function scanZstdFrames(buffer, maxFrames = Number.POSITIVE_INFINITY) {
  const frames = []
  let offset = 0
  while (offset < buffer.length) {
    const start = offset
    if (buffer.length - offset < 4) return { frames, tornStart: start }
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) {
      // Not a frame boundary. Only legal after a torn frame; try to resync on
      // the next magic instead of failing the whole artifact.
      const next = findNextMagic(buffer, offset + 1)
      if (next === -1) return { frames, tornStart: start }
      offset = next
      continue
    }
    offset += 4
    if (offset === buffer.length) return { frames, tornStart: start }
    const descriptor = buffer.readUInt8(offset)
    offset += 1
    if ((descriptor & 24) !== 0) {
      throw new Error(`corrupt Zstandard session log: reserved frame-header bit at byte ${offset - 1}`)
    }
    const contentSizeFlag = descriptor >>> 6
    const singleSegment = (descriptor & 32) !== 0
    const checksum = (descriptor & 4) !== 0
    const dictionaryFlag = descriptor & 3
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag
    const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag
    const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes
    if (buffer.length - offset < remainingHeaderBytes) return { frames, tornStart: start }
    offset += remainingHeaderBytes
    for (;;) {
      if (buffer.length - offset < 3) return { frames, tornStart: start }
      const blockHeader = buffer.readUIntLE(offset, 3)
      offset += 3
      const lastBlock = (blockHeader & 1) !== 0
      const blockType = (blockHeader >>> 1) & 3
      const blockSize = blockHeader >>> 3
      if (blockType === 3) {
        throw new Error(`corrupt Zstandard session log: reserved block type at byte ${offset - 3}`)
      }
      const payloadBytes = blockType === 1 ? 1 : blockSize
      if (buffer.length - offset < payloadBytes) return { frames, tornStart: start }
      offset += payloadBytes
      if (lastBlock) break
    }
    if (checksum) {
      if (buffer.length - offset < 4) return { frames, tornStart: start }
      offset += 4
    }
    frames.push({ start, end: offset })
    if (frames.length === maxFrames) return { frames }
  }
  return { frames }
}

/** Scan forward for the next plausible frame magic (LE FD 2F B5 28). */
function findNextMagic(buffer, from) {
  const magicLE = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
  const idx = buffer.indexOf(magicLE, from)
  return idx
}

/**
 * Decompress a whole multi-frame session artifact into its UTF-8 plaintext.
 * Complete frames are decoded in order; a torn final frame is skipped.
 *
 * @param {Buffer} buffer - raw artifact bytes.
 * @returns {string} concatenated frame plaintext.
 */
export function decompressSessionArtifact(buffer) {
  const { frames } = scanZstdFrames(buffer)
  let out = ''
  for (const { start, end } of frames) {
    out += zstdDecompressSync(buffer.subarray(start, end)).toString('utf8')
  }
  return out
}
