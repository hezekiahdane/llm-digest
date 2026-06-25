import type { Metadata } from 'next';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { getCachedSnapshot } from '@/lib/cache';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Live AI model status, benchmarks, pricing, and releases.',
};

export default async function DashboardPage() {
  const snapshot = await getCachedSnapshot();

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
