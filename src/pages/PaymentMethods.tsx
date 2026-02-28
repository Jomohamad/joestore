import React from 'react';
import { useStore } from '../context/StoreContext';

export default function PaymentMethods() {
  const { t } = useStore();

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">{t('payment_methods_title')}</h1>
        <div className="bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8 text-creo-text-sec space-y-6">
          <p>{t('payment_methods_desc')}</p>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{t('credit_cards')}</h2>
            <p>{t('credit_cards_desc')}</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{t('digital_wallets')}</h2>
            <p>{t('digital_wallets_desc')}</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{t('local_payment')}</h2>
            <p>{t('local_payment_desc')}</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{t('crypto')}</h2>
            <p>{t('crypto_desc')}</p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
