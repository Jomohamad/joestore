import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchGameDetails, fetchGamePackages, createOrder } from '../services/api';
import { Game, Package } from '../types';
import { ShieldCheck, CreditCard, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [game, setGame] = useState<Game | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playerId, setPlayerId] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const [gameData, packagesData] = await Promise.all([
          fetchGameDetails(id),
          fetchGamePackages(id)
        ]);
        setGame(gameData);
        setPackages(packagesData);
      } catch (err) {
        setError('Failed to load game details.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleCheckout = async () => {
    if (!game || !selectedPackage || !playerId || !selectedPayment) return;

    setIsProcessing(true);
    try {
      const result = await createOrder({
        gameId: game.id,
        packageId: selectedPackage.id,
        playerId,
        amount: selectedPackage.price
      });

      if (result.success) {
        setOrderSuccess(result.orderId);
      }
    } catch (err) {
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Game not found'}</p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
          <p className="text-zinc-400 mb-6">
            Your {game.currency_name} will be credited to Player ID <span className="text-white font-medium">{playerId}</span> shortly.
          </p>
          <div className="bg-zinc-950 rounded-lg p-4 mb-8 text-left border border-zinc-800/50">
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-zinc-500">Order ID</span>
              <span className="text-white font-mono">{orderSuccess}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-zinc-500">Amount Paid</span>
              <span className="text-white font-medium">${selectedPackage?.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Item</span>
              <span className="text-emerald-400 font-medium">{selectedPackage?.amount} {game.currency_name}</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
          >
            Continue Shopping
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-950 pb-24">
      {/* Game Header */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 via-zinc-950/80 to-zinc-950 z-10"></div>
        <img 
          src={game.image_url} 
          alt={game.name} 
          className="w-full h-full object-cover opacity-40 blur-sm"
          referrerPolicy="no-referrer"
        />
        <div className="absolute bottom-0 left-0 w-full z-20 pb-8">
          <div className="container mx-auto px-4 flex items-end gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 border-zinc-900 shadow-2xl shrink-0 bg-zinc-800">
              <img 
                src={game.image_url} 
                alt={game.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="mb-2">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{game.name}</h1>
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <span className="px-2 py-1 bg-zinc-800 rounded-md">{game.publisher}</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Official Partner
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (Steps) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Step 1: Player ID */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">1</div>
                <h2 className="text-xl font-bold text-white">Enter Player ID</h2>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                  placeholder="e.g. 1234567890" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
                />
                <p className="text-xs text-zinc-500 mt-2">
                  To find your Player ID, click on your avatar in the top left corner of the main screen.
                </p>
              </div>
            </section>

            {/* Step 2: Select Package */}
            <section className={cn(
              "bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg transition-opacity duration-300",
              !playerId && "opacity-50 pointer-events-none"
            )}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">2</div>
                <h2 className="text-xl font-bold text-white">Select Recharge</h2>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={cn(
                      "relative p-4 rounded-xl border text-left transition-all duration-200 overflow-hidden group",
                      selectedPackage?.id === pkg.id 
                        ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]" 
                        : "bg-zinc-950 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50"
                    )}
                  >
                    {selectedPackage?.id === pkg.id && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[24px] border-r-[24px] border-t-emerald-500 border-r-transparent">
                        <CheckCircle2 className="absolute -top-[22px] right-[2px] w-3 h-3 text-white" />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl font-bold text-white">{pkg.amount}</span>
                      <span className="text-sm font-medium text-zinc-400">{game.currency_name}</span>
                    </div>
                    
                    {pkg.bonus > 0 && (
                      <div className="text-xs font-medium text-emerald-400 mb-3 bg-emerald-500/10 inline-block px-2 py-0.5 rounded">
                        +{pkg.bonus} Bonus
                      </div>
                    )}
                    
                    <div className={cn(
                      "text-sm font-medium mt-auto",
                      selectedPackage?.id === pkg.id ? "text-emerald-400" : "text-zinc-300"
                    )}>
                      ${pkg.price.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Step 3: Payment Method */}
            <section className={cn(
              "bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg transition-opacity duration-300",
              (!playerId || !selectedPackage) && "opacity-50 pointer-events-none"
            )}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">3</div>
                <h2 className="text-xl font-bold text-white">Payment Method</h2>
              </div>
              
              <div className="space-y-3">
                {['Credit Card', 'PayPal', 'Crypto'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setSelectedPayment(method)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                      selectedPayment === method
                        ? "bg-emerald-500/10 border-emerald-500"
                        : "bg-zinc-950 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className={cn(
                        "w-5 h-5",
                        selectedPayment === method ? "text-emerald-500" : "text-zinc-400"
                      )} />
                      <span className={cn(
                        "font-medium",
                        selectedPayment === method ? "text-white" : "text-zinc-300"
                      )}>{method}</span>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      selectedPayment === method ? "border-emerald-500" : "border-zinc-600"
                    )}>
                      {selectedPayment === method && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>
            </section>

          </div>

          {/* Sidebar (Order Summary) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-6 pb-4 border-b border-zinc-800">Order Summary</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Game</span>
                  <span className="text-white font-medium">{game.name}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Player ID</span>
                  <span className="text-white font-mono">{playerId || '-'}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Item</span>
                  <span className="text-white font-medium">
                    {selectedPackage ? `${selectedPackage.amount} ${game.currency_name}` : '-'}
                  </span>
                </div>
                
                {selectedPackage?.bonus ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Bonus</span>
                    <span className="text-emerald-400 font-medium">+{selectedPackage.bonus}</span>
                  </div>
                ) : null}
                
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Payment</span>
                  <span className="text-white font-medium">{selectedPayment || '-'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 mb-8">
                <div className="flex justify-between items-end">
                  <span className="text-zinc-400 font-medium">Total Price</span>
                  <span className="text-3xl font-bold text-white">
                    ${selectedPackage ? selectedPackage.price.toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={!playerId || !selectedPackage || !selectedPayment || isProcessing}
                className={cn(
                  "w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all",
                  playerId && selectedPackage && selectedPayment && !isProcessing
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
              >
                {isProcessing ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Buy Now
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
              
              <p className="text-xs text-center text-zinc-500 mt-4">
                By clicking "Buy Now", you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
