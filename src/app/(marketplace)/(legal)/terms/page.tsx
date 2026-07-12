import Link from "next/link";

export default function TermsConditionsPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-slate-800">
      
      {/* Breadcrumb Navigasi */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 pt-2">
        <Link href="/" className="hover:text-[#00a896] transition-colors">Home</Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-700 font-medium">Terms & Conditions</span>
      </nav>

      {/* Judul Utama */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Terms & Conditions</h1>

      {/* Konten Dokumen */}
      <div className="space-y-6 text-sm text-gray-600 leading-relaxed max-w-5xl">
        
        <p>
          Welcome to Modesy! These terms and conditions (the "Agreement") govern your use of the Modesy website (the "Site") and the services offered by Modesy (the "Services"). Please read these terms carefully before using the Site or the Services. By using the Site or the Services, you agree to be bound by these terms and conditions.
        </p>

        {/* Pasal 1 */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Description of Services:</h2>
          <p>
            Modesy is an e-commerce website that allows users to buy and sell products, including but not limited to, fashion, beauty, home and garden, electronics, and more. Modesy provides a platform for buyers and sellers to connect and facilitate transactions. Modesy is not responsible for the quality, safety, or legality of any products listed on the Site.
          </p>
        </div>

        {/* Pasal 2 */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">User Accounts:</h2>
          <p>
            In order to access certain features of the Site or use the Services, you must create an account with Modesy. You must be at least 18 years old to create an account. You are responsible for maintaining the confidentiality of your account information, including your password, and for all activity that occurs under your account. You agree to notify Modesy immediately of any unauthorized use of your account or password, or any other breach of security.
          </p>
        </div>

        {/* Pasal 3 */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Listing and Selling Products:</h2>
          <p>
            As a seller on Modesy, you agree to comply with all applicable laws and regulations. You are solely responsible for the products you list and sell on the Site, including but not limited to, the accuracy of the product description, pricing, and shipping information. You agree to fulfill all orders promptly and to the buyer's satisfaction. Modesy may remove or suspend any listing that violates these terms and conditions.
          </p>
        </div>

        {/* Pasal 4 */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Buying Products:</h2>
          <p>
            As a buyer on Modesy, you agree to comply with all applicable laws and regulations. You are solely responsible for the purchases you make on the Site, including but not limited to, reviewing the product description, pricing, and shipping information. You agree to pay for all purchases promptly and to contact the seller or Modesy if there are any issues with the product.
          </p>
        </div>

        {/* Pasal 5 */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Payment:</h2>
          <p>
            Modesy uses third-party payment processors to facilitate transactions. Modesy is not responsible for any errors, fees, or other issues related to these payment processors. You agree to pay all fees associated with your use of the Site and the Services.
          </p>
        </div>

        {/* Pasal 6 */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Intellectual Property:</h2>
          <p>
            Modesy owns all intellectual property rights related to the Site and the Services, including but not limited to, trademarks, logos, and copyrights. You may not use any of Modesy's intellectual property without prior written consent.
          </p>
        </div>

        {/* Pasal 7 */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Privacy Policy:</h2>
          <p>
            Modesy respects your privacy and has a Privacy Policy that explains how we collect, use, and disclose information. By using the Site or the Services, you agree to be bound by the Privacy Policy.
          </p>
        </div>

        {/* Pasal 8 */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Disclaimer of Warranties:</h2>
          <p>
            Modesy provides the Site and the Services "as is" and without warranty of any kind. Modesy makes no representations or warranties, express or implied, including but not limited to, warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </p>
        </div>

        {/* Pasal 9 */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Limitation of Liability:</h2>
          <p>
            Modesy is not liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Site or the Services, even if Modesy has been advised of the possibility of such damages. Modesy's total liability in connection with the Site or the Services is limited to the fees paid by you for the use of the Services.
          </p>
        </div>

        {/* Pasal 10 */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Indemnification:</h2>
          <p>
            You agree to indemnify and hold harmless Modesy, its affiliates, and their respective officers, directors, employees, and agents from any and all claims, damages, expenses, or liabilities arising out of or related to your use of the Site or the Services.
          </p>
        </div>

      </div>
    </main>
  );
}
