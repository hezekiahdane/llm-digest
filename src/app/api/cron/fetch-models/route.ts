import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { runDataAgent } from '@/lib/agents/data-agent';
import { setCachedSnapshot } from '@/lib/cache';

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snapshot = await runDataAgent();
    await setCachedSnapshot(snapshot);
    revalidatePath('/dashboard');
    return NextResponse.json({ ok: true, fetchedAt: snapshot.fetchedAt });
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: Error logging required for production observability
    console.error('[cron] fetch-models failed:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
