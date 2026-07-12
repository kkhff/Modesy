import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-slate-800">
      
      {/* Breadcrumb Navigasi */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 pt-2">
        <Link href="/" className="hover:text-[#00a896] transition-colors">Home</Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-700 font-medium">Privacy Policy</span>
      </nav>

      {/* Judul Utama */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Privacy Policy</h1>

      {/* Konten Dokumen */}
      <div className="space-y-6 text-sm text-gray-600 leading-relaxed max-w-5xl">
        
        <p>
          At Modesy, your privacy is important to us. This Privacy Policy outlines how we collect, use, and protect your personal information when you use our website and services.
        </p>

        <p>
          We take appropriate measures to protect your personal information from unauthorized access, use, or disclosure. These measures include encryption, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
        </p>

        <p>
          Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of those websites. Please review their privacy policies before providing any personal information. Our services are not intended for individuals under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us, and we will take appropriate steps to delete it.
        </p>

      </div>
    </main>
  );
}
