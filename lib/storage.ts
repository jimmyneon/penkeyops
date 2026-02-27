import { createClient } from '@/lib/supabase/client'

export async function uploadEvidencePhoto(
  file: File,
  resultId: string,
  userId: string
): Promise<string | null> {
  try {
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${resultId}-${Date.now()}.${fileExt}`
    const filePath = `evidence/${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('evidence-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('evidence-photos')
      .getPublicUrl(filePath)

    return data.publicUrl
  } catch (error) {
    console.error('Error uploading photo:', error)
    return null
  }
}

export async function deleteEvidencePhoto(url: string): Promise<boolean> {
  try {
    const supabase = createClient()
    const path = url.split('/evidence-photos/')[1]
    
    if (!path) return false

    const { error } = await supabase.storage
      .from('evidence-photos')
      .remove([path])

    return !error
  } catch (error) {
    console.error('Error deleting photo:', error)
    return false
  }
}
