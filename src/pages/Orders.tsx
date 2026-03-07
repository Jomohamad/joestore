import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { History, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { fetchOrders } from '../services/api';
import { Order } from '../types';
import { Link } from 'react-router-dom';
import { cn, responsiveImageProps } from '../lib/utils';
import { OrdersListSkeleton, SkeletonBlock } from '../components/skeletons';

export default function Orders() {
  const { t, language, allGames } = useStore();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const data = await fetchOrders(user.id);
        setOrders(data);
      } catch (error) {
        console.error('Error loading orders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user]);

  useEffect(() => {
    const onOrderUpdated = (event: Event) => {
      const custom = event as CustomEvent<{
        orderId: string;
        status: 'pending' | 'processing' | 'completed' | 'failed';
        transactionId?: string | null;
      }>;
      const payload = custom.detail;
      if (!payload?.orderId) return;

      setOrders((prev) => {
        const hasOrder = prev.some((order) => order.id === payload.orderId);
        if (!hasOrder) return prev;
        return prev.map((order) =>
          order.id === payload.orderId
            ? {
                ...order,
                status: payload.status,
                transaction_id: payload.transactionId || order.transaction_id || null,
              }
            : order,
        );
      });
    };

    window.addEventListener('order-status-updated', onOrderUpdated as EventListener);
    return () => {
      window.removeEventListener('order-status-updated', onOrderUpdated as EventListener);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'failed':
      case 'cancelled':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-creo-bg pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <SkeletonBlock className="w-12 h-12 rounded-xl" />
            <div className="space-y-2">
              <SkeletonBlock className="h-7 w-52" />
              <SkeletonBlock className="h-4 w-40" />
            </div>
          </div>
          <OrdersListSkeleton count={5} />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 bg-creo-bg pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <History className="w-16 h-16 text-creo-muted mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold text-white mb-2">{t('order_history')}</h2>
          <p className="text-creo-text-sec mb-6">{t('login_desc')}</p>
          <Link 
            to="/login"
            className="inline-block bg-creo-accent text-black px-8 py-3 rounded-xl font-bold hover:bg-white transition-colors"
          >
            {t('login')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-creo-bg pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-12 h-12 bg-creo-accent/10 rounded-xl flex items-center justify-center text-creo-accent">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-[clamp(1.3rem,3.5vw,2rem)] font-display font-bold text-white">{t('order_history')}</h1>
            <p className="text-sm text-creo-text-sec">View your past purchases</p>
          </div>
        </motion.div>

        {orders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-creo-card border border-creo-border rounded-2xl p-12 text-center"
          >
            <Package className="w-16 h-16 text-creo-muted mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No orders yet</h3>
            <p className="text-creo-text-sec mb-6">You haven't made any purchases yet.</p>
            <Link 
              to="/"
              className="inline-block bg-creo-accent text-black px-6 py-2.5 rounded-xl font-bold hover:bg-white transition-colors"
            >
              {t('browse_games')}
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => {
              const game = allGames.find(g => g.id === order.game_id);
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-creo-card border border-creo-border rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between hover:border-creo-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {game ? (
                      <img 
                        {...responsiveImageProps(game.image_url, { kind: 'cover' })}
                        alt={game.name}
                        className="w-16 h-16 rounded-xl object-cover border border-creo-border"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-creo-bg rounded-xl border border-creo-border flex items-center justify-center">
                        <Package className="w-6 h-6 text-creo-muted" />
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-bold text-white text-lg">
                        {game ? game.name : 'Unknown Game'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-creo-text-sec">
                        <span>Order #{order.id.slice(0, 8)}</span>
                        <span className="hidden md:inline">•</span>
                        <span>{new Date(order.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-2 border-t border-creo-border pt-4 md:pt-0 md:border-t-0">
                    <div className="font-bold text-white text-lg">
                      {order.amount} {game?.currency_name || 'Items'}
                    </div>
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      getStatusColor(order.status)
                    )}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
