import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * /demo — redirige vers le restaurant marqué is_demo=true
 * Si aucun restaurant demo n'existe, redirige vers la landing page
 */
export default async function DemoPage() {
  const supabase = await createClient()
  const { data: demo } = await supabase
    .from('restaurants')
    .select('slug')
    .eq('is_demo', true)
    .eq('is_active', true)
    .single()

  if (demo?.slug) {
    redirect(`/${demo.slug}`)
  }

  redirect('/')
}
