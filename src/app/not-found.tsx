import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="text-gray-600">
        The platform or page you’re looking for doesn’t exist.
      </p>
      <Link
        href="/platforms"
        className="text-blue-600 hover:underline"
      >
        Back to platforms
      </Link>
    </main>
  );
}
