import type { Metadata } from 'next';
import { Dashboard } from '@/components/dashboard/Dashboard';
import type { DashboardSnapshot } from '@/types/dashboard';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Live AI model status, benchmarks, pricing, and releases.',
};

async function getSnapshot(): Promise<DashboardSnapshot | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/models`, {
      next: { revalidate: 3600 },
    });
    if (res.status === 503) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<DashboardSnapshot>;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const snapshot = await getSnapshot();

  if (!snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Dashboard initializing</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Data is being fetched for the first time. Check back in a few
            minutes.
          </p>
        </div>
      </div>
    );
  }

  return <Dashboard snapshot={snapshot} />;
}
