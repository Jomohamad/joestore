import { supabaseAdmin } from '../supabaseAdmin';

export const metricsService = {
  async summary() {
    const fetchRevenue = async () => {
      const pageSize = 1000;
      let offset = 0;
      let total = 0;
      while (true) {
        const { data, error } = await supabaseAdmin
          .from('orders')
          .select('price')
          .in('status', ['paid', 'processing', 'completed'])
          .range(offset, offset + pageSize - 1);
        if (error) break;
        const rows = data || [];
        if (!rows.length) break;
        total += rows.reduce((sum, row) => sum + Number((row as Record<string, unknown>).price || 0), 0);
        if (rows.length < pageSize) break;
        offset += pageSize;
      }
      return total;
    };

    const [orders, failed, completed, revenueTotal, users] = await Promise.all([
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      fetchRevenue(),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    ]);

    return {
      orders: Number(orders.count || 0),
      failed: Number(failed.count || 0),
      completed: Number(completed.count || 0),
      revenue: Number(revenueTotal.toFixed(2)),
      users: Number(users.count || 0),
    };
  },
};
