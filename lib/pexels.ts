export type PexelsPhoto = {
  src?: {
    landscape?: string
    large?: string
    medium?: string
    original?: string
  }
  alt?: string
}

export async function getPexelsCuratedPhotos(limit: number, revalidateSeconds = 3600): Promise<PexelsPhoto[]> {
  const key = process.env.PEXELS_API_KEY
  if (!key) return []

  try {
    const res = await fetch(`https://api.pexels.com/v1/curated?per_page=${limit}`, {
      headers: { Authorization: key },
      next: { revalidate: revalidateSeconds },
    })
    if (!res.ok) return []

    const data = await res.json().catch(() => null)
    const photos = Array.isArray((data as any)?.photos) ? ((data as any).photos as PexelsPhoto[]) : []
    return photos
  } catch {
    return []
  }
}

export function pickPexelsPhotoUrl(photos: PexelsPhoto[], index: number): string | null {
  if (!photos.length) return null
  const p = photos[index % photos.length]
  return p?.src?.landscape || p?.src?.large || p?.src?.medium || p?.src?.original || null
}
