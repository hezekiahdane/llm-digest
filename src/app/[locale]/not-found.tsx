import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-body-sm text-muted-foreground font-semibold uppercase tracking-widest">
        404
      </p>
      <h1 className="text-h2 font-heading text-header">Page not found</h1>
      <p className="text-body-md text-body max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="bg-primary-600 hover:bg-primary-700 mt-2 rounded-lg px-6 py-2 text-white transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}
