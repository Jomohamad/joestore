import React from 'react';
import { useStore } from '../context/StoreContext';

export default function Refund() {
  const { t } = useStore();

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">{t('refund')}</h1>
        <div className="bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8 text-creo-text-sec space-y-6">
          <p>Last updated: October 2023</p>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">1. Digital Goods</h2>
            <p>Due to the nature of digital goods, all sales are final once the product (e.g., game credits, vouchers, gift cards) has been delivered to your account or email.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">2. Eligibility for Refund</h2>
            <p>You may be eligible for a refund only under the following circumstances:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>The order could not be fulfilled due to technical issues on our end.</li>
              <li>The product delivered is invalid or already redeemed (proof required).</li>
              <li>You were charged multiple times for the same transaction.</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">3. Non-Refundable Cases</h2>
            <p>We do not issue refunds for the following reasons:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>You provided an incorrect Player ID or account information.</li>
              <li>You changed your mind after the purchase was completed.</li>
              <li>Your game account was banned or suspended by the game developer.</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">4. Requesting a Refund</h2>
            <p>If you believe you are eligible for a refund, please contact our support team within 7 days of the transaction. Provide your order ID, payment details, and a clear explanation of the issue.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">5. Processing Time</h2>
            <p>Approved refunds will be processed back to the original payment method within 5-10 business days, depending on your bank or payment provider.</p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
