import { motion } from 'motion/react';
import { Zap, ShieldCheck, Clock, Trophy } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function WhyChooseUs() {
  const { t } = useStore();

  return (
    <div className="flex-1 bg-creo-bg pt-24 pb-16">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-2xl mx-auto mb-12 md:mb-16"
        >
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">{t('features_title')}</h1>
          <p className="text-sm md:text-base text-creo-text-sec">{t('features_desc')}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 max-w-6xl mx-auto">
          {[
            { icon: Zap, title: t('feat_instant'), desc: t('feat_instant_desc') },
            { icon: ShieldCheck, title: t('feat_secure'), desc: t('feat_secure_desc') },
            { icon: Trophy, title: t('feat_prices'), desc: t('feat_prices_desc') },
            { icon: Clock, title: t('feat_support'), desc: t('feat_support_desc') },
          ].map((feature, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
              className="bg-creo-card p-6 md:p-8 rounded-2xl border border-creo-border hover:border-creo-accent/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(255,215,0,0.1)] flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 md:w-16 md:h-16 bg-creo-accent/10 text-creo-accent rounded-2xl flex items-center justify-center mb-6 shadow-[inset_0_0_10px_rgba(255,215,0,0.2)]">
                <feature.icon className="w-7 h-7 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-sm text-creo-text-sec leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
