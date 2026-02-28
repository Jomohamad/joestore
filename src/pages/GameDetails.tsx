import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchGameDetails, fetchGamePackages, createOrder, verifyPlayerId } from '../services/api';
import { Game, Package } from '../types';
import { ShieldCheck, CreditCard, ChevronRight, CheckCircle2, UserCheck, AlertCircle, ShoppingCart } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../context/StoreContext';

export default function GameDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useStore();
  
  const [game, setGame] = useState<Game | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playerId, setPlayerId] = useState('');
  const [isValidatingId, setIsValidatingId] = useState(false);
  const [validatedPlayerName, setValidatedPlayerName] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

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

  const handlePlayerIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerId(e.target.value);
    setValidatedPlayerName(null);
    setValidationError(null);
    setSelectedPackage(null);
    setSelectedPayment(null);
  };

  const handleVerifyId = async () => {
    if (!game || !playerId) return;
    
    setIsValidatingId(true);
    setValidationError(null);
    
    try {
      const result = await verifyPlayerId(game.id, playerId);
      if (result.valid && result.playerName) {
        setValidatedPlayerName(result.playerName);
      } else {
        setValidationError(result.error || 'Invalid Player ID');
      }
    } catch (err) {
      setValidationError('Verification service unavailable. Please try again.');
    } finally {
      setIsValidatingId(false);
    }
  };

  const handleCheckout = async () => {
    if (!game || !selectedPackage || !playerId || !selectedPayment || !validatedPlayerName) return;

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

  const handleAddToCart = () => {
    if (!game || !selectedPackage || !playerId || !validatedPlayerName) return;
    
    addToCart({
      id: Math.random().toString(36).substr(2, 9),
      gameId: game.id,
      gameName: game.name,
      gameImage: game.image_url,
      packageId: selectedPackage.id,
      packageName: `${selectedPackage.amount} ${game.currency_name}`,
      amount: selectedPackage.amount,
      currency: game.currency_name,
      price: selectedPackage.price,
      playerId: playerId,
      playerName: validatedPlayerName
    });
    
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin"></div>
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
            className="px-6 py-2 bg-creo-bg-sec hover:bg-creo-border text-white rounded-lg transition-colors"
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
          className="bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 bg-creo-accent/20 text-creo-accent rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
            <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Payment Successful!</h2>
          <p className="text-sm md:text-base text-creo-text-sec mb-6">
            Your {game.currency_name} will be credited to <span className="text-white font-medium">{validatedPlayerName}</span> shortly.
          </p>
          <div className="bg-creo-bg rounded-lg p-4 mb-6 md:mb-8 text-left border border-creo-border/50">
            <div className="flex justify-between mb-2 text-xs md:text-sm">
              <span className="text-creo-muted">Order ID</span>
              <span className="text-white font-mono">{orderSuccess}</span>
            </div>
            <div className="flex justify-between mb-2 text-xs md:text-sm">
              <span className="text-creo-muted">Amount Paid</span>
              <span className="text-white font-medium">${selectedPackage?.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-creo-muted">Item</span>
              <span className="text-creo-accent font-medium">{selectedPackage?.amount} {game.currency_name}</span>
            </div>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-3 bg-creo-accent hover:bg-white text-black rounded-xl font-bold transition-colors text-sm md:text-base"
          >
            Continue Shopping
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-creo-bg pb-20 md:pb-24">
      {/* Game Header */}
      <div className="relative h-48 md:h-64 lg:h-80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-creo-bg-sec/50 via-creo-bg/80 to-creo-bg z-10"></div>
        <img 
          src={game.image_url} 
          alt={game.name} 
          className="w-full h-full object-cover opacity-40 blur-sm"
          referrerPolicy="no-referrer"
        />
        <div className="absolute bottom-0 left-0 w-full z-20 pb-6 md:pb-8">
          <div className="container mx-auto px-4 flex items-end gap-4 md:gap-6">
            <div className="w-20 h-20 md:w-24 md:h-24 lg:w-32 lg:h-32 rounded-xl md:rounded-2xl overflow-hidden border-2 md:border-4 border-creo-bg shadow-2xl shrink-0 bg-creo-bg-sec">
              <img 
                src={game.image_url} 
                alt={game.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="mb-1 md:mb-2">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold text-white mb-1 md:mb-2">{game.name}</h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-creo-text-sec">
                <span className="px-2 py-1 bg-creo-bg-sec rounded-md">{game.publisher}</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 text-creo-accent" />
                  Official Partner
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-6 md:mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Main Content (Steps) */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            
            {/* Step 1: Player ID */}
            <section className={cn(
              "bg-creo-card border rounded-2xl p-5 md:p-6 shadow-lg transition-colors duration-300",
              validatedPlayerName ? "border-creo-accent/30" : "border-creo-border"
            )}>
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className={cn(
                  "w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold transition-colors text-sm md:text-base",
                  validatedPlayerName ? "bg-creo-accent text-black" : "bg-creo-accent/20 text-creo-accent"
                )}>
                  {validatedPlayerName ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : "1"}
                </div>
                <h2 className="text-lg md:text-xl font-bold text-white">Enter Player ID</h2>
              </div>
              
              <div className="relative">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    value={playerId}
                    onChange={handlePlayerIdChange}
                    placeholder="e.g. 1234567890" 
                    className={cn(
                      "flex-1 bg-creo-bg border rounded-xl px-4 py-2.5 md:py-3 text-sm md:text-base text-white focus:outline-none focus:ring-1 focus:ring-creo-accent/50 transition-all font-mono",
                      validationError ? "border-red-500/50 focus:border-red-500" : "border-creo-border focus:border-creo-accent",
                      validatedPlayerName ? "border-creo-accent/50" : ""
                    )}
                  />
                  <button
                    onClick={handleVerifyId}
                    disabled={!playerId || isValidatingId || !!validatedPlayerName}
                    className={cn(
                      "px-6 py-2.5 md:py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 min-w-[120px] text-sm md:text-base",
                      validatedPlayerName 
                        ? "bg-creo-accent/10 text-creo-accent cursor-default"
                        : playerId && !isValidatingId
                          ? "bg-creo-accent hover:bg-white text-black"
                          : "bg-creo-bg-sec text-creo-muted cursor-not-allowed"
                    )}
                  >
                    {isValidatingId ? (
                      <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : validatedPlayerName ? (
                      <>Verified</>
                    ) : (
                      'Verify ID'
                    )}
                  </button>
                </div>
                
                {validationError && (
                  <div className="flex items-center gap-1.5 text-red-400 text-xs md:text-sm mt-3">
                    <AlertCircle className="w-3 h-3 md:w-4 md:h-4" />
                    {validationError}
                  </div>
                )}

                {validatedPlayerName && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-creo-accent text-xs md:text-sm mt-3 bg-creo-accent/10 p-2.5 md:p-3 rounded-lg border border-creo-accent/20"
                  >
                    <UserCheck className="w-3 h-3 md:w-4 md:h-4" />
                    Player Name: <span className="font-bold text-white">{validatedPlayerName}</span>
                  </motion.div>
                )}

                {!validationError && !validatedPlayerName && (
                  <p className="text-[11px] md:text-xs text-creo-muted mt-2 md:mt-3">
                    To find your Player ID, click on your avatar in the top left corner of the main screen.
                  </p>
                )}
              </div>
            </section>

            {/* Step 2: Select Package */}
            <section className={cn(
              "bg-creo-card border border-creo-border rounded-2xl p-5 md:p-6 shadow-lg transition-opacity duration-300",
              !validatedPlayerName && "opacity-50 pointer-events-none"
            )}>
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-creo-accent/20 text-creo-accent flex items-center justify-center font-bold text-sm md:text-base">2</div>
                <h2 className="text-lg md:text-xl font-bold text-white">Select Recharge</h2>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={cn(
                      "relative p-3 md:p-4 rounded-xl border text-left transition-all duration-200 overflow-hidden group",
                      selectedPackage?.id === pkg.id 
                        ? "bg-creo-accent/10 border-creo-accent shadow-[0_0_15px_rgba(204,255,0,0.15)]" 
                        : "bg-creo-bg border-creo-border hover:border-creo-muted hover:bg-creo-bg-sec"
                    )}
                  >
                    {selectedPackage?.id === pkg.id && (
                      <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] md:border-t-[24px] border-r-[20px] md:border-r-[24px] border-t-creo-accent border-r-transparent">
                        <CheckCircle2 className="absolute -top-[18px] md:-top-[22px] right-[2px] w-2.5 h-2.5 md:w-3 md:h-3 text-black" />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                      <span className="text-lg md:text-xl font-bold text-white">{pkg.amount}</span>
                      <span className="text-xs md:text-sm font-medium text-creo-text-sec">{game.currency_name}</span>
                    </div>
                    
                    {pkg.bonus > 0 && (
                      <div className="text-[10px] md:text-xs font-medium text-creo-accent mb-2 md:mb-3 bg-creo-accent/10 inline-block px-1.5 md:px-2 py-0.5 rounded">
                        +{pkg.bonus} Bonus
                      </div>
                    )}
                    
                    <div className={cn(
                      "text-xs md:text-sm font-medium mt-auto",
                      selectedPackage?.id === pkg.id ? "text-creo-accent" : "text-creo-text-sec"
                    )}>
                      ${pkg.price.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Step 3: Payment Method */}
            <section className={cn(
              "bg-creo-card border border-creo-border rounded-2xl p-5 md:p-6 shadow-lg transition-opacity duration-300",
              (!validatedPlayerName || !selectedPackage) && "opacity-50 pointer-events-none"
            )}>
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-creo-accent/20 text-creo-accent flex items-center justify-center font-bold text-sm md:text-base">3</div>
                <h2 className="text-lg md:text-xl font-bold text-white">Payment Method</h2>
              </div>
              
              <div className="space-y-2.5 md:space-y-3">
                {['Credit Card', 'PayPal', 'Crypto'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setSelectedPayment(method)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all duration-200",
                      selectedPayment === method
                        ? "bg-creo-accent/10 border-creo-accent"
                        : "bg-creo-bg border-creo-border hover:border-creo-muted hover:bg-creo-bg-sec"
                    )}
                  >
                    <div className="flex items-center gap-2.5 md:gap-3">
                      <CreditCard className={cn(
                        "w-4 h-4 md:w-5 md:h-5",
                        selectedPayment === method ? "text-creo-accent" : "text-creo-muted"
                      )} />
                      <span className={cn(
                        "text-sm md:text-base font-medium",
                        selectedPayment === method ? "text-white" : "text-creo-text-sec"
                      )}>{method}</span>
                    </div>
                    <div className={cn(
                      "w-4 h-4 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center",
                      selectedPayment === method ? "border-creo-accent" : "border-creo-border"
                    )}>
                      {selectedPayment === method && <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-creo-accent rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>
            </section>

          </div>

          {/* Sidebar (Order Summary) */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 md:top-24 bg-creo-card border border-creo-border rounded-2xl p-5 md:p-6 shadow-xl">
              <h3 className="text-base md:text-lg font-bold text-white mb-4 md:mb-6 pb-3 md:pb-4 border-b border-creo-border">Order Summary</h3>
              
              <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-creo-muted">Game</span>
                  <span className="text-white font-medium">{game.name}</span>
                </div>
                
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-creo-muted">Player ID</span>
                  <span className="text-white font-mono">{playerId || '-'}</span>
                </div>

                {validatedPlayerName && (
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-creo-muted">Player Name</span>
                    <span className="text-creo-accent font-medium truncate max-w-[120px] md:max-w-[150px]">{validatedPlayerName}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-creo-muted">Item</span>
                  <span className="text-white font-medium">
                    {selectedPackage ? `${selectedPackage.amount} ${game.currency_name}` : '-'}
                  </span>
                </div>
                
                {selectedPackage?.bonus ? (
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-creo-muted">Bonus</span>
                    <span className="text-creo-accent font-medium">+{selectedPackage.bonus}</span>
                  </div>
                ) : null}
                
                <div className="flex justify-between text-xs md:text-sm">
                  <span className="text-creo-muted">Payment</span>
                  <span className="text-white font-medium">{selectedPayment || '-'}</span>
                </div>
              </div>

              <div className="pt-3 md:pt-4 border-t border-creo-border mb-6 md:mb-8">
                <div className="flex justify-between items-end">
                  <span className="text-xs md:text-sm text-creo-muted font-medium">Total Price</span>
                  <span className="text-2xl md:text-3xl font-bold text-white">
                    ${selectedPackage ? selectedPackage.price.toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleCheckout}
                  disabled={!validatedPlayerName || !selectedPackage || !selectedPayment || isProcessing}
                  className={cn(
                    "w-full py-3 md:py-4 rounded-xl font-bold text-base md:text-lg flex items-center justify-center gap-2 transition-all",
                    validatedPlayerName && selectedPackage && selectedPayment && !isProcessing
                      ? "bg-creo-accent hover:bg-white text-black shadow-lg shadow-creo-accent/25"
                      : "bg-creo-bg-sec text-creo-muted cursor-not-allowed"
                  )}
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      Buy Now
                      <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                    </>
                  )}
                </button>

                <button
                  onClick={handleAddToCart}
                  disabled={!validatedPlayerName || !selectedPackage || isProcessing}
                  className={cn(
                    "w-full py-3 md:py-4 rounded-xl font-bold text-base md:text-lg flex items-center justify-center gap-2 transition-all border",
                    validatedPlayerName && selectedPackage && !isProcessing
                      ? "border-creo-accent text-creo-accent hover:bg-creo-accent hover:text-black"
                      : "border-creo-border text-creo-muted cursor-not-allowed"
                  )}
                >
                  <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                  Add to Cart
                </button>
              </div>
              
              <p className="text-[10px] md:text-xs text-center text-creo-muted mt-3 md:mt-4">
                By clicking "Buy Now", you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
