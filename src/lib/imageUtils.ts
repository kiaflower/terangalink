// Phone photos can be several MB — sent raw as base64 they risk hitting
// serverless request body limits (e.g. Vercel's ~4.5MB) and make forms
// hang or fail silently on slow connections. Resize + re-encode client-side
// before the file ever leaves the browser.
function fileToCompressedCanvas(file: File, maxDimension: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Image invalide'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas indisponible')); return }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export async function fileToCompressedBase64(file: File, maxDimension = 1000, quality = 0.82): Promise<string> {
  try {
    const canvas = await fileToCompressedCanvas(file, maxDimension)
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    // Repli sur le fichier brut en base64 si le décodage/redimensionnement échoue
    // (ex: format exotique) — mieux vaut un upload plus lourd qu'un blocage total.
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }
}

// Variante Blob pour l'upload direct vers Supabase Storage (logo/couverture
// restaurant, photos plat) : évite d'envoyer telles quelles des photos de
// téléphone de plusieurs Mo, qui peuvent suffire à faire échouer silencieusement
// la génération d'aperçu og:image sur WhatsApp (plus strict que Facebook).
export async function fileToCompressedBlob(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  try {
    const canvas = await fileToCompressedCanvas(file, maxDimension)
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file
    const jpegName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], jpegName, { type: 'image/jpeg' })
  } catch {
    return file
  }
}

// Recadre au centre vers un ratio cible (ex: 3/1 pour une bannière) avant
// compression — évite qu'une photo plat au mauvais format soit étirée ou
// déformée une fois affichée en pleine largeur sur la vitrine.
export async function fileToCroppedBlob(file: File, targetRatio: number, maxWidth = 1600, quality = 0.82): Promise<File> {
  try {
    const source = await fileToCompressedCanvas(file, maxWidth)
    const sourceRatio = source.width / source.height
    let cropWidth = source.width
    let cropHeight = source.height
    if (sourceRatio > targetRatio) {
      cropWidth = Math.round(source.height * targetRatio)
    } else {
      cropHeight = Math.round(source.width / targetRatio)
    }
    const cropX = Math.round((source.width - cropWidth) / 2)
    const cropY = Math.round((source.height - cropHeight) / 2)
    const canvas = document.createElement('canvas')
    canvas.width = cropWidth
    canvas.height = cropHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(source, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file
    const jpegName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], jpegName, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
