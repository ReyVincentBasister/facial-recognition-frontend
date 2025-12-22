// // Face recognition utilities using face-api.js
 let faceApiLoaded = false

export async function loadFaceApiModels(): Promise<void> {
   if (faceApiLoaded) return

  const faceapi = await import("@vladmandic/face-api")

  const MODEL_URL = "/model"

   await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
  ])

  faceApiLoaded = true
}

export async function detectFaceDescriptor(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): Promise<number[] | null> {
  const faceapi = await import("@vladmandic/face-api")

  const detection = await faceapi
    .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) return null

  return Array.from(detection.descriptor)
}

export async function detectAllFaces(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): Promise<any[]> {
  const faceapi = await import("@vladmandic/face-api")

  const detections = await faceapi
    .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors()

  return detections
}

export function compareFaceDescriptors(descriptor1: number[], descriptor2: number[]): number {
  // Calculate Euclidean distance
  let sum = 0
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i]
    sum += diff * diff
  }
  const distance = Math.sqrt(sum)

  // Convert distance to confidence (0-1, where 1 is perfect match)
  // Typical threshold is 0.6, so we normalize around that
  const confidence = Math.max(0, 1 - distance / 0.6)
  return confidence
}

export function findBestMatch(
  targetDescriptor: number[],
  knownDescriptors: Array<{ userId: string; descriptor: number[] }>,
): { userId: string; confidence: number } | null {
  if (knownDescriptors.length === 0) return null

  let bestMatch = { userId: "", confidence: 0 }

  for (const known of knownDescriptors) {
    const confidence = compareFaceDescriptors(targetDescriptor, known.descriptor)
    if (confidence > bestMatch.confidence) {
      bestMatch = { userId: known.userId, confidence }
    }
  }

  // Only return match if confidence is above threshold (60%)
  return bestMatch.confidence > 0.6 ? bestMatch : null
}
