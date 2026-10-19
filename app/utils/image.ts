import type { PhotoDimensions } from '@/types/proPhotos'

const JPEG_SIGNATURE: number[] = [0xff, 0xd8, 0xff]

const MARKER_PREFIX: number = 0xff

const STUFFED_BYTE: number = 0x00

const SOI_MARKER: number = 0xd8

const EOI_MARKER: number = 0xd9

const SOS_MARKER: number = 0xda

const TEM_MARKER: number = 0x01

const RST_FIRST_MARKER: number = 0xd0

const RST_LAST_MARKER: number = 0xd7

const APP1_MARKER: number = 0xe1

const APP13_MARKER: number = 0xed

const APP15_MARKER: number = 0xef

const COM_MARKER: number = 0xfe

const SOF_FIRST_MARKER: number = 0xc0

const SOF_LAST_MARKER: number = 0xcf

const DHT_MARKER: number = 0xc4

const JPG_MARKER: number = 0xc8

const DAC_MARKER: number = 0xcc

const SEGMENT_LENGTH_BYTES: number = 2

const JPEG_MAX_SEGMENTS: number = 1024

/**
 * Tells whether bytes start with a given signature, whatever type was declared.
 * @param bytes - First bytes of a file, or the whole file
 * @param signature - Expected leading bytes
 * @returns True when every byte of the signature matches
 */
export const hasSignature = (bytes: Uint8Array, signature: number[]): boolean =>
  signature.every((byte: number, index: number): boolean => bytes[index] === byte)

/**
 * Tells whether bytes start with the JPEG signature (FF D8 FF), whatever type was declared.
 * @param bytes - First bytes of a file, or the whole file
 * @returns True for a JPEG file
 */
export const hasJpegSignature = (bytes: Uint8Array): boolean => hasSignature(bytes, JPEG_SIGNATURE)

const isRestartMarker = (marker: number): boolean =>
  marker >= RST_FIRST_MARKER && marker <= RST_LAST_MARKER

const isStandaloneMarker = (marker: number): boolean =>
  marker === TEM_MARKER || isRestartMarker(marker)

const isMetadataMarker = (marker: number): boolean =>
  (marker >= APP1_MARKER && marker <= APP13_MARKER) ||
  marker === APP15_MARKER ||
  marker === COM_MARKER

const segmentEnd = (bytes: Uint8Array, lengthStart: number): number | null => {
  if (lengthStart + SEGMENT_LENGTH_BYTES > bytes.length) {
    return null
  }
  const length: number = (bytes[lengthStart]! << 8) | bytes[lengthStart + 1]!
  const end: number = lengthStart + length
  return length >= SEGMENT_LENGTH_BYTES && end <= bytes.length ? end : null
}

const entropyEnd = (bytes: Uint8Array, start: number): number | null => {
  let index: number = start
  while (index + 1 < bytes.length) {
    const next: number = bytes[index + 1]!
    const isMarker: boolean =
      bytes[index] === MARKER_PREFIX &&
      next !== STUFFED_BYTE &&
      next !== MARKER_PREFIX &&
      !isRestartMarker(next)
    if (isMarker) {
      return index
    }
    index += bytes[index] === MARKER_PREFIX && next !== MARKER_PREFIX ? 2 : 1
  }
  return null
}

type JpegSegment = {
  marker: number
  end: number
  isKept: boolean
}

type KeptBytes = {
  source: Uint8Array
  output: Uint8Array
  offset: number
  start: number
  end: number
}

const isFrameMarker = (marker: number): boolean =>
  marker >= SOF_FIRST_MARKER &&
  marker <= SOF_LAST_MARKER &&
  marker !== DHT_MARKER &&
  marker !== JPG_MARKER &&
  marker !== DAC_MARKER

const skipFillBytes = (bytes: Uint8Array, index: number): number => {
  let markerIndex: number = index
  while (bytes[markerIndex + 1] === MARKER_PREFIX) {
    markerIndex += 1
  }
  return markerIndex
}

const readSegment = (bytes: Uint8Array, index: number): JpegSegment | null => {
  const marker: number | undefined = bytes[index + 1]
  if (
    marker === undefined ||
    marker === SOI_MARKER ||
    marker === EOI_MARKER ||
    marker === STUFFED_BYTE
  ) {
    return null
  }
  if (isStandaloneMarker(marker)) {
    return { marker, end: index + 2, isKept: true }
  }
  const end: number | null = segmentEnd(bytes, index + 2)
  const dataEnd: number | null =
    end !== null && marker === SOS_MARKER ? entropyEnd(bytes, end) : end
  return dataEnd === null ? null : { marker, end: dataEnd, isKept: !isMetadataMarker(marker) }
}

const flushKept = (kept: KeptBytes): void => {
  kept.output.set(kept.source.subarray(kept.start, kept.end), kept.offset)
  kept.offset += kept.end - kept.start
}

const keepBytes = (kept: KeptBytes, start: number, end: number): void => {
  if (start !== kept.end) {
    flushKept(kept)
    kept.start = start
  }
  kept.end = end
}

/**
 * Rewrites a JPEG without its metadata, walking every marker segment: APP1 to APP13, APP15
 * (EXIF with GPS, XMP, ICC, IPTC…) and comments are dropped, APP0 (JFIF) and APP14 (Adobe colour
 * transform) are kept with the tables and the image data. The kept bytes are copied into one
 * buffer, contiguous segments in a single copy. A file without a frame header (SOF) or a scan
 * (SOS), with more than 1,024 top-level segments, with any byte after the final EOI marker, a
 * missing EOI or a malformed segment length is rejected.
 * @param bytes - Whole file, starting with the JPEG signature
 * @returns The cleaned JPEG, or null when the file is not a well-formed JPEG
 */
export const stripJpegMetadata = (bytes: Uint8Array): Uint8Array | null => {
  if (bytes[0] !== MARKER_PREFIX || bytes[1] !== SOI_MARKER) {
    return null
  }
  const kept: KeptBytes = {
    source: bytes,
    output: new Uint8Array(bytes.length),
    offset: 0,
    start: 0,
    end: 2,
  }
  let index: number = 2
  let hasFrame: boolean = false
  let hasScan: boolean = false
  for (let count: number = 0; count < JPEG_MAX_SEGMENTS; count += 1) {
    if (index >= bytes.length || bytes[index] !== MARKER_PREFIX) {
      return null
    }
    index = skipFillBytes(bytes, index)
    if (bytes[index + 1] === EOI_MARKER) {
      if (index + 2 !== bytes.length || !hasFrame || !hasScan) {
        return null
      }
      keepBytes(kept, index, index + 2)
      flushKept(kept)
      return kept.output.subarray(0, kept.offset)
    }
    const segment: JpegSegment | null = readSegment(bytes, index)
    if (!segment) {
      return null
    }
    hasFrame = hasFrame || isFrameMarker(segment.marker)
    hasScan = hasScan || segment.marker === SOS_MARKER
    if (segment.isKept) {
      keepBytes(kept, index, segment.end)
    }
    index = segment.end
  }
  return null
}

/**
 * Scales dimensions down so the longest side fits a maximum, keeping the ratio. Smaller images are
 * kept as they are, never enlarged.
 * @param size - Width and height of the source image, in pixels
 * @param maxSide - Largest accepted side, in pixels
 * @returns Whole-pixel dimensions, at least 1 × 1
 */
export const fitWithin = (size: PhotoDimensions, maxSide: number): PhotoDimensions => {
  const scale: number = Math.min(1, maxSide / Math.max(size.width, size.height))
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  }
}
