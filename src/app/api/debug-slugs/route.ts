import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: restaurants, error } = await supabase.from('restaurants').select('slug');

  if (error) {
    console.error('Error fetching slugs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ slugs: restaurants?.map(r => r.slug) || [] });
}
