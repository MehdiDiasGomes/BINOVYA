import type { PhotoDimensions } from '@/types/proPhotos'
import type { PhotoPreparation } from '@/types/proPhotoUpload'

import {
  PRO_PHOTO_JPEG_QUALITIES,
  PRO_PHOTO_MAX_BYTES,
  PRO_PHOTO_MAX_DIMENSION,
} from '@/constants/pro'
import { fitWithin } from '@/utils/image'

const canvasToJpeg = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
  new Promise(resolve => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })

const encodeWithinLimit = async (
  canvas: HTMLCanvasElement,
  qualities: number[],
): Promise<Blob | null> => {
  const [quality, ...lowerQualities]: number[] = qualities
  if (quality === undefined) {
    return null
  }
  const blob: Blob | null = await canvasToJpeg(canvas, quality)
  if (blob && blob.size <= PRO_PHOTO_MAX_BYTES) {
    return blob
  }
  return encodeWithinLimit(canvas, lowerQualities)
}

const drawScaled = (image: HTMLImageElement): HTMLCanvasElement | null => {
  const size: PhotoDimensions = fitWithin(
    { width: image.naturalWidth, height: image.naturalHeight },
    PRO_PHOTO_MAX_DIMENSION,
  )
  const canvas: HTMLCanvasElement = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const context: CanvasRenderingContext2D | null = canvas.getContext('2d')
  if (!context) {
    return null
  }
  context.drawImage(image, 0, 0, size.width, size.height)
  return canvas
}

/**
 * Converts a photo picked on the phone into a JPEG of at most 2000 px on its longest side and
 * 5 MB, in the browser, so the original never leaves the device. The image is decoded by an
 * `<img>` element, which applies the EXIF orientation (`image-orientation: from-image`, the
 * default in current browsers) before `drawImage`; the canvas output carries no EXIF data, GPS
 * position included.
 * @param file - Image picked in the file input, any format the browser can decode
 * @returns The JPEG, or the reason it could not be produced
 */
export const preparePhotoForUpload = async (file: Blob): Promise<PhotoPreparation> => {
  const url: string = URL.createObjectURL(file)
  let canvas: HTMLCanvasElement | null = null
  try {
    const image: HTMLImageElement = new Image()
    image.src = url
    await image.decode()
    canvas = image.naturalWidth > 0 && image.naturalHeight > 0 ? drawScaled(image) : null
    if (!canvas) {
      return { ok: false, code: 'unreadable' }
    }
    const blob: Blob | null = await encodeWithinLimit(canvas, PRO_PHOTO_JPEG_QUALITIES)
    return blob ? { ok: true, blob } : { ok: false, code: 'tooLarge' }
  } catch {
    return { ok: false, code: 'unreadable' }
  } finally {
    URL.revokeObjectURL(url)
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
  }
}
