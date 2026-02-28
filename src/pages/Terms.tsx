import React from 'react';
import { useStore } from '../context/StoreContext';

export default function Terms() {
  const { t } = useStore();

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">{t('terms')}</h1>
        <div className="bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8 text-creo-text-sec space-y-6">
          <p>Last updated: October 2023</p>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">1. Acceptance of Terms</h2>
            <p>By accessing and using our services, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our services.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">2. Use of Service</h2>
            <p>You agree to use our services only for lawful purposes and in a way that does not infringe the rights of, restrict, or inhibit anyone else's use and enjoyment of the services.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">3. User Accounts</h2>
            <p>You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">4. Purchases and Payments</h2>
            <p>All purchases are final. We do not offer refunds once the digital goods have been delivered. You are responsible for providing correct information (e.g., Player ID) during the purchase process.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">5. Limitation of Liability</h2>
            <p>We shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.</p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
