import React from 'react';

export default function Privacy() {
  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">Privacy Policy</h1>
        <div className="bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8 text-creo-text-sec space-y-6">
          <p>Last updated: October 2023</p>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact customer support. This may include your name, email address, payment information, and game IDs.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">2. How We Use Your Information</h2>
            <p>We use the information we collect to process your transactions, provide customer support, send you technical notices and updates, and improve our services.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">3. Information Sharing</h2>
            <p>We do not share your personal information with third parties except as necessary to process your payments or as required by law.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">4. Data Security</h2>
            <p>We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">5. Your Choices</h2>
            <p>You may update, correct or delete information about you at any time by logging into your online account or emailing us at privacy@gamecurrency.com.</p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
