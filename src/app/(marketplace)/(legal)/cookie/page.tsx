import Link from "next/link";

export default function CookiePolicyPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-slate-800">
      
      {/* Breadcrumb Navigasi */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 pt-2">
        <Link href="/" className="hover:text-[#00a896] transition-colors">Home</Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-700 font-medium">Cookie Policy</span>
      </nav>

      {/* Judul Utama */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Cookie Policy</h1>

      {/* Konten Dokumen */}
      <div className="space-y-6 text-sm text-gray-600 leading-relaxed max-w-5xl">
        
        <p>
          Cookies are small text files that websites place on your device (computer, smartphone, or tablet) when you visit them. They are widely used to make websites work efficiently, enhance user experiences, and gather data on user behavior.
        </p>

        {/* Bagian Kegunaan */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">What Are Cookies Used For?</h2>
          <ul className="list-disc pl-5 space-y-3">
            <li>
              <strong className="text-gray-800">Functionality:</strong> Cookies help websites remember your actions and preferences (such as login details, language, or region) so you don't have to re-enter them each time you visit. This makes the browsing experience smoother and more personalized.
            </li>
            <li>
              <strong className="text-gray-800">Analytics:</strong> Cookies allow websites to track visitor behavior, such as which pages are visited most often, how long users stay on the site, and where they navigate from. This data helps improve website performance and user experience.
            </li>
            <li>
              <strong className="text-gray-800">Advertising:</strong> Some cookies are used to track browsing activity across different websites to display relevant ads. These are often referred to as "targeting" or "advertising" cookies and are employed by third-party advertisers to provide personalized ads.
            </li>
            <li>
              <strong className="text-gray-800">Security:</strong> Cookies can be used to enhance the security of a website by detecting fraudulent activity, such as unauthorized logins or repeated failed login attempts.
            </li>
            <li>
              <strong className="text-gray-800">Session Management:</strong> Some cookies are essential for managing user sessions, keeping you logged in as you navigate between pages, or maintaining items in your shopping cart while you browse an online store.
            </li>
          </ul>
        </div>

        {/* Bagian Jenis */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Types of Cookies</h2>
          <ul className="list-disc pl-5 space-y-3">
            <li>
              <strong className="text-gray-800">Session Cookies:</strong> These are temporary and are deleted once you close your browser. They help with functionalities like logging in.
            </li>
            <li>
              <strong className="text-gray-800">Persistent Cookies:</strong> These remain on your device for a set period or until manually deleted. They are used to remember login details or preferences for future visits.
            </li>
            <li>
              <strong className="text-gray-800">Third-Party Cookies:</strong> These are placed by external services (like advertisers or analytics tools) and track your online behavior across different sites.
            </li>
          </ul>
        </div>

        <p className="pt-2">
          Cookies are essential for enhancing usability and optimizing website services but can also raise privacy concerns, which is why many websites ask for user consent before placing cookies.
        </p>

      </div>
    </main>
  );
}
