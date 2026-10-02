import type { PlanDigest } from './lesson-context';

async function admin() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin;
}

export async function loadDigests(lessonNumbers: number[]): Promise<PlanDigest[]> {
  if (!lessonNumbers.length) return [];
  try {
    const { data } = await (await admin()).from('lesson_plan_digests').select('digest').in('lesson_number', lessonNumbers);
    return (data ?? []).map(r => r.digest as unknown as PlanDigest);
  } catch (error) { console.warn('digest load failed', String(error)); return []; }
}

export async function saveDigest(digest: PlanDigest) {
  try {
    await (await admin()).from('lesson_plan_digests').upsert({ lesson_number: digest.lessonNumber, digest: digest as never, updated_at: new Date().toISOString() });
  } catch (error) { console.warn('digest save failed', String(error)); }
}
