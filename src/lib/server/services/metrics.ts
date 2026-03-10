import { supabaseAdmin } from '../supabaseAdmin';

export const metricsService = {
  async summary() {
    const [orders, failed, completed, revenue, users] = await Promise.all([
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabaseAdmin.from('orders').select('price').in('status', ['paid', 'processing', 'completed']),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    ]);

    const revenueTotal = Array.isArray(revenue.data)
      ? revenue.data.reduce((sum, row) => sum + Number((row as Record<string, unknown>).price || 0), 0)
      : 0;

    return {
      orders: Number(orders.count || 0),
      failed: Number(failed.count || 0),
      completed: Number(completed.count || 0),
      revenue: Number(revenueTotal.toFixed(2)),
      users: Number(users.count || 0),
    };
  },
};
