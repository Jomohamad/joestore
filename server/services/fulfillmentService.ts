import { gamesdropAdapter } from '../adapters/gamesdropAdapter.js';
import { reloadlyAdapter } from '../adapters/reloadlyAdapter.js';
import { emitOrderStatus } from '../socket/index.js';
import { ordersService } from './ordersService.js';
import { supabaseAdmin } from '../supabase.js';

export const fulfillmentService = {
  async processOrder(orderId: string) {
    const order = await ordersService.getOrderById(orderId);

    if (String(order.status).toLowerCase() !== 'processing') {
      return order;
    }

    const { data: game } = await supabaseAdmin
      .from('games')
      .select('id, provider_api')
      .eq('id', order.game_id)
      .maybeSingle();

    const provider = String(game?.provider_api || 'reloadly').toLowerCase();

    try {
      const result =
        provider === 'gamesdrop'
          ? await gamesdropAdapter.createTopup({
              orderId: order.id,
              gameId: order.game_id,
              playerId: order.player_id || order.account_identifier || '',
              server: order.server || null,
              packageName: order.package || '',
              quantity: Number(order.quantity || 1),
            })
          : await reloadlyAdapter.createTopup({
              orderId: order.id,
              gameId: order.game_id,
              playerId: order.player_id || order.account_identifier || '',
              server: order.server || null,
              packageName: order.package || '',
              quantity: Number(order.quantity || 1),
            });

      const updated = await ordersService.setOrderStatus(order.id, 'completed', {
        transaction_id: result.transactionId,
        provider_order_ref: result.providerRef,
      });

      emitOrderStatus(String(updated.user_id), {
        orderId: updated.id,
        status: 'completed',
        transactionId: updated.transaction_id || null,
        updatedAt: new Date().toISOString(),
        message: 'Order completed successfully',
      });

      return updated;
    } catch (error) {
      const updated = await ordersService.setOrderStatus(order.id, 'failed', {
        provider_order_ref: null,
      });

      emitOrderStatus(String(updated.user_id), {
        orderId: updated.id,
        status: 'failed',
        updatedAt: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Fulfillment failed',
      });

      throw error;
    }
  },
};
