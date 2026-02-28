import React from 'react';

export default function FAQ() {
  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">Frequently Asked Questions</h1>
        <div className="bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8 text-creo-text-sec space-y-8">
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">How long does delivery take?</h2>
            <p>Delivery is usually instant after your payment is successfully processed. In rare cases, it might take up to 15 minutes.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Is my payment secure?</h2>
            <p>Yes, we use industry-standard encryption and partner with trusted payment gateways to ensure your payment information is 100% secure.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">What if I entered the wrong Player ID?</h2>
            <p>Please contact our support team immediately. If the order has not been processed yet, we can correct it. If it has already been delivered to the wrong ID, unfortunately, we cannot reverse the transaction.</p>
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Do you offer refunds?</h2>
            <p>Refunds are only provided if the order cannot be fulfilled. Once the game credits or vouchers are delivered, all sales are final. Please refer to our Refund Policy for more details.</p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
