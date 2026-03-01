import { motion } from 'motion/react';
import { Mail, MessageSquare, Phone, HelpCircle, FileText } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function Support() {
  const { t } = useStore();

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12 md:mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white mb-4 md:mb-6"
          >
            {t('support_title')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-creo-text-sec max-w-2xl mx-auto"
          >
            {t('support_desc')}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-12 md:mb-16 max-w-3xl mx-auto">
          {[
            { icon: Mail, title: t('email_support'), desc: t('email_support_desc'), action: 'support@gamecurrency.com' },
            { icon: Phone, title: t('phone_support'), desc: t('phone_support_desc'), action: '+1 (800) 123-4567' },
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + (i * 0.1) }}
              className="bg-creo-card border border-creo-border rounded-2xl p-5 md:p-6 text-center hover:border-creo-accent/50 transition-colors"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 bg-creo-accent/10 text-creo-accent rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <item.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">{item.title}</h3>
              <p className="text-creo-text-sec mb-4 md:mb-6 text-xs md:text-sm">{item.desc}</p>
              <button className="text-creo-accent font-bold hover:text-white transition-colors text-sm md:text-base">
                {item.action}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-creo-accent" />
            {t('faq_title')}
          </h2>
          <div className="space-y-3 md:space-y-4">
            {[
              { q: t('faq_q1'), a: t('faq_a1') },
              { q: t('faq_q2'), a: t('faq_a2') },
              { q: t('faq_q3'), a: t('faq_a3') },
              { q: t('faq_q4'), a: t('faq_a4') },
            ].map((faq, i) => (
              <div key={i} className="bg-creo-card border border-creo-border rounded-xl p-4 md:p-5">
                <h4 className="text-white font-bold mb-2 text-sm md:text-base">{faq.q}</h4>
                <p className="text-creo-text-sec text-xs md:text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
