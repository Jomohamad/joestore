import React from 'react';

export default function PaymentMethods() {
  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">Payment Methods</h1>
        <div className="bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8 text-creo-text-sec space-y-6">
          <p>We offer a variety of secure payment methods to make your purchase as convenient as possible.</p>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Credit & Debit Cards</h2>
            <p>We accept all major credit and debit cards, including Visa, MasterCard, American Express, and Discover.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Digital Wallets</h2>
            <p>You can securely pay using popular digital wallets like Apple Pay, Google Pay, and PayPal.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Local Payment Methods</h2>
            <p>Depending on your region, we also support various local payment methods and bank transfers. These options will be displayed at checkout.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Cryptocurrency</h2>
            <p>We accept Bitcoin, Ethereum, and USDT for fast and secure transactions.</p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
