import { NextResponse } from 'next/server';
import { getCachedSnapshot } from '@/lib/cache';

export async function GET(_request: Request): Promise<NextResponse> {
  try {
    const snapshot = await getCachedSnapshot();
    if (!snapshot) {
      return NextResponse.json(
        { error: 'No data yet — cron has not run. Try again shortly.' },
        { status: 503 },
      );
    }
    return NextResponse.json(snapshot);
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: Error logging required for production observability
    console.error('[api/models] KV read failed:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
