import { motion } from 'motion/react';
import { Mail, MessageSquare, Phone, HelpCircle, FileText, AlertCircle } from 'lucide-react';

export default function Support() {
  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12 md:mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white mb-4 md:mb-6"
          >
            How can we help you?
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-creo-text-sec max-w-2xl mx-auto"
          >
            Our support team is available 24/7 to assist you with your orders, payments, and account issues.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-12 md:mb-16">
          {[
            { icon: MessageSquare, title: 'Live Chat', desc: 'Chat with our support agents in real-time.', action: 'Start Chat' },
            { icon: Mail, title: 'Email Support', desc: 'Send us an email and we will reply within 24 hours.', action: 'support@gamecurrency.com' },
            { icon: Phone, title: 'Phone Support', desc: 'Call us directly for urgent matters.', action: '+1 (800) 123-4567' },
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 md:w-6 md:h-6 text-creo-accent" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-3 md:space-y-4">
              {[
                { q: 'How long does it take to receive my game currency?', a: 'Most transactions are processed instantly. In rare cases, it might take up to 15 minutes depending on the game server.' },
                { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, PayPal, Apple Pay, Google Pay, and selected cryptocurrencies.' },
                { q: 'I entered the wrong Player ID, what should I do?', a: 'Please contact our support team immediately. If the currency has not been delivered yet, we can cancel or modify the order.' },
                { q: 'Is my payment information secure?', a: 'Yes, we use industry-standard encryption and do not store your full credit card details on our servers.' },
              ].map((faq, i) => (
                <div key={i} className="bg-creo-card border border-creo-border rounded-xl p-4 md:p-5">
                  <h4 className="text-white font-bold mb-2 text-sm md:text-base">{faq.q}</h4>
                  <p className="text-creo-text-sec text-xs md:text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 md:w-6 md:h-6 text-creo-accent" />
              Send us a message
            </h2>
            <form className="bg-creo-card border border-creo-border rounded-2xl p-5 md:p-6 space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-bold text-creo-text-sec mb-1">First Name</label>
                  <input type="text" className="w-full bg-creo-bg border border-creo-border rounded-lg px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base text-white focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent" />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-creo-text-sec mb-1">Last Name</label>
                  <input type="text" className="w-full bg-creo-bg border border-creo-border rounded-lg px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base text-white focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs md:text-sm font-bold text-creo-text-sec mb-1">Email Address</label>
                <input type="email" className="w-full bg-creo-bg border border-creo-border rounded-lg px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base text-white focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent" />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-creo-text-sec mb-1">Order ID (Optional)</label>
                <input type="text" className="w-full bg-creo-bg border border-creo-border rounded-lg px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base text-white focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent" />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-bold text-creo-text-sec mb-1">Message</label>
                <textarea rows={4} className="w-full bg-creo-bg border border-creo-border rounded-lg px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-base text-white focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent resize-none"></textarea>
              </div>

              <button type="button" className="w-full py-2.5 md:py-3 bg-creo-accent hover:bg-white text-black rounded-lg font-bold transition-colors text-sm md:text-base">
                Submit Request
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
