import React from 'react';

export default function Contact() {
  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">Contact Us</h1>
        <div className="bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8 text-creo-text-sec space-y-6">
          <p>If you have any questions or need assistance, please feel free to reach out to our support team.</p>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Email Support</h2>
            <p>support@gamecurrency.com</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Business Hours</h2>
            <p>Monday - Friday: 9:00 AM - 6:00 PM (EST)</p>
            <p>Saturday - Sunday: 10:00 AM - 4:00 PM (EST)</p>
          </div>
          
          <form className="space-y-4 mt-8">
            <div>
              <label className="block text-sm font-bold text-white mb-1">Name</label>
              <input type="text" className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-creo-accent" placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm font-bold text-white mb-1">Email</label>
              <input type="email" className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-creo-accent" placeholder="Your email" />
            </div>
            <div>
              <label className="block text-sm font-bold text-white mb-1">Message</label>
              <textarea rows={4} className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-creo-accent" placeholder="How can we help you?"></textarea>
            </div>
            <button type="button" className="bg-creo-accent text-black font-bold px-6 py-3 rounded-lg hover:bg-white transition-colors">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
