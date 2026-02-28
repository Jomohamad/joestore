import React from 'react';
import { useStore } from '../context/StoreContext';

export default function Contact() {
  const { t } = useStore();

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">{t('contact_us')}</h1>
        <div className="bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8 text-creo-text-sec space-y-6">
          <p>{t('contact_desc')}</p>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{t('email_support')}</h2>
            <p>support@gamecurrency.com</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{t('business_hours')}</h2>
            <p>{t('mon_fri')}</p>
            <p>{t('sat_sun')}</p>
          </div>
          
          <form className="space-y-4 mt-8">
            <div>
              <label className="block text-sm font-bold text-white mb-1">{t('name')}</label>
              <input type="text" className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-creo-accent" placeholder={t('name')} />
            </div>
            <div>
              <label className="block text-sm font-bold text-white mb-1">{t('email')}</label>
              <input type="email" className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-creo-accent" placeholder={t('email')} />
            </div>
            <div>
              <label className="block text-sm font-bold text-white mb-1">{t('message')}</label>
              <textarea rows={4} className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-creo-accent" placeholder={t('support_title')}></textarea>
            </div>
            <button type="button" className="bg-creo-accent text-black font-bold px-6 py-3 rounded-lg hover:bg-white transition-colors">
              {t('send_message')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
