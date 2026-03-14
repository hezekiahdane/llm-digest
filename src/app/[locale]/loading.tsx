export default function LoadingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        className="border-primary-600 h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
