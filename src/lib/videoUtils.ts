// Limites vidéo partagées (Stories + vidéo plat) — pensées pour rester
// légères en data mobile, cohérent avec la compression photo côté client
// (voir imageUtils.ts).
export const MAX_VIDEO_SIZE_MB = 20
export const MAX_VIDEO_SECONDS = 30

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const url = URL.createObjectURL(file)
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('invalid video'))
    }
    video.src = url
  })
}

export function uploadWithProgress(bucket: string, path: string, file: File, token: string, onProgress: (pct: number) => void): Promise<string | null> {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300 ? path : null)
    xhr.onerror = () => resolve(null)
    xhr.send(file)
  })
}

export async function validateVideoFile(file: File): Promise<string | null> {
  if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
    return `Vidéo trop lourde (max ${MAX_VIDEO_SIZE_MB} Mo) — raccourcissez-la ou réduisez sa qualité pour un envoi rapide.`
  }
  try {
    const duration = await getVideoDuration(file)
    if (duration > MAX_VIDEO_SECONDS) {
      return `Vidéo trop longue (max ${MAX_VIDEO_SECONDS}s) — coupez-la avant de l'envoyer.`
    }
  } catch {
    return 'Fichier vidéo illisible.'
  }
  return null
}
