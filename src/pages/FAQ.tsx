import React from 'react';
import { useStore } from '../context/StoreContext';

export default function FAQ() {
  const { t } = useStore();

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">{t('faq_title')}</h1>
        <div className="bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8 text-creo-text-sec space-y-8">
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{t('faq_q5')}</h2>
            <p>{t('faq_a5')}</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{t('faq_q6')}</h2>
            <p>{t('faq_a6')}</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{t('faq_q7')}</h2>
            <p>{t('faq_a7')}</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{t('faq_q8')}</h2>
            <p>{t('faq_a8')}</p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
