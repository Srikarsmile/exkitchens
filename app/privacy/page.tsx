import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | ExKitchens",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-light text-gray-900 mb-4">
          Privacy Policy
        </h1>
        <p className="text-gray-500 text-lg mb-10">
          Our privacy policy is being prepared and will be available here soon.
        </p>
        <Link
          href="/"
          className="inline-flex px-6 py-3 rounded-full bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#333] transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
