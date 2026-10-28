/**
 * LunchLoop Peak-Hour Queue & Kitchen Operations Analytics
 */

async function loadAnalyticsDashboard() {
  try {
    const [overviewRes, hourlyRes, topItemsRes, windowRes, invRes] = await Promise.all([
      api.get('/staff/analytics/overview'),
      api.get('/staff/analytics/hourly-demand'),
      api.get('/staff/analytics/top-items?limit=5'),
      api.get('/staff/analytics/window-demand'),
      api.get('/staff/analytics/inventory?limit=8'),
    ]);

    renderOverviewKPIs(overviewRes.data?.overview);
    renderHourlyDemandChart(hourlyRes.data?.demand);
    renderWindowDemandBars(windowRes.data?.window_demand);
    renderTopItemsTable(topItemsRes.data?.top_items);
    renderInventoryActivity(invRes.data?.inventory_events);
  } catch (err) {
    showToast(`Failed to load analytics: ${err.message}`, 'error');
  }
}

function renderOverviewKPIs(stats) {
  if (!stats) return;

  document.getElementById('kpiTotalOrders').textContent = stats.total_orders || 0;
  document.getElementById('kpiActiveQueue').textContent = stats.active_queue_count || 0;
  document.getElementById('kpiCancellationRate').textContent = `${stats.cancellation_rate_percent || 0}%`;
  document.getElementById('kpiRevenue').textContent = `₹${Number(stats.total_revenue_inr || 0).toFixed(2)}`;
}

function renderHourlyDemandChart(demandData) {
  const chart = document.getElementById('hourlyDemandBarChart');
  if (!chart || !demandData) return;

  const maxVal = Math.max(...demandData.map(d => d.total_orders), 1);

  chart.innerHTML = demandData.map(d => {
    const heightPercent = Math.max(6, Math.round((d.total_orders / maxVal) * 100));
    const isPeak = d.hour >= '12:00' && d.hour <= '14:00';

    return `
      <div class="bar-col" title="${d.hour}: ${d.total_orders} orders">
        <div class="bar-val">${d.total_orders}</div>
        <div class="bar-fill ${isPeak ? '' : 'accent'}" style="height: ${heightPercent}%;"></div>
        <div class="bar-label">${d.hour}</div>
      </div>
    `;
  }).join('');
}

function renderWindowDemandBars(windows) {
  const container = document.getElementById('windowDemandContainer');
  if (!container || !windows) return;

  if (windows.length === 0) {
    container.innerHTML = `<p style="color:var(--color-muted);">No windows scheduled.</p>`;
    return;
  }

  container.innerHTML = windows.map(w => {
    const start = new Date(w.starts_at);
    const end = new Date(w.ends_at);
    const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const percent = w.occupancy_percent;
    const isHeavy = percent >= 80;

    return `
      <div style="margin-bottom: 14px;">
        <div style="display:flex; justify-content:space-between; font-size:0.88rem; margin-bottom: 4px;">
          <span><strong>${escapeHTML(timeStr)}</strong></span>
          <span>${w.reserved_count} / ${w.capacity} slots (${percent}%)</span>
        </div>
        <div style="height: 10px; background: var(--color-cream); border-radius: 5px; overflow: hidden; border: 1px solid var(--color-border);">
          <div style="width: ${percent}%; height: 100%; background: ${isHeavy ? 'var(--color-tomato)' : 'var(--color-basil)'}; border-radius: 5px;"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTopItemsTable(items) {
  const tbody = document.getElementById('topItemsTableBody');
  if (!tbody || !items) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:16px;">No orders recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map((item, idx) => `
    <tr>
      <td><strong>#${idx + 1}</strong> ${escapeHTML(item.item_name)}</td>
      <td style="font-weight:700;">${item.total_quantity_ordered} portions</td>
      <td>₹${Number(item.total_revenue).toFixed(2)}</td>
    </tr>
  `).join('');
}

function renderInventoryActivity(events) {
  const list = document.getElementById('recentInventoryActivityList');
  if (!list || !events) return;

  if (events.length === 0) {
    list.innerHTML = `<p style="color:var(--color-muted); font-size:0.9rem;">No recent inventory events recorded.</p>`;
    return;
  }

  list.innerHTML = events.map(e => {
    const timeStr = new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isDeduction = e.quantity_delta < 0;

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid var(--color-border); font-size: 0.88rem;">
        <div>
          <strong>${escapeHTML(e.item?.name || 'Item')}</strong>
          <div style="font-size:0.75rem; color:var(--color-muted);">${escapeHTML(e.reason || e.event_type)} &bull; ${timeStr}</div>
        </div>
        <span class="badge ${isDeduction ? 'badge-sold-out' : 'badge-ready'}">
          ${isDeduction ? '' : '+'}${e.quantity_delta}
        </span>
      </div>
    `;
  }).join('');
}

window.loadAnalyticsDashboard = loadAnalyticsDashboard;
window.exportAnalyticsCSV = exportAnalyticsCSV;

async function exportAnalyticsCSV() {
  try {
    const [overviewRes, hourlyRes, topItemsRes] = await Promise.all([
      api.get('/staff/analytics/overview'),
      api.get('/staff/analytics/hourly-demand'),
      api.get('/staff/analytics/top-items?limit=20'),
    ]);

    const overview = overviewRes.data?.overview || {};
    const hourly = hourlyRes.data?.demand || [];
    const topItems = topItemsRes.data?.top_items || [];

    let csv = `LUNCHLOOP CANTEEN SHIFT REPORT\r\n`;
    csv += `Generated At,${new Date().toLocaleString()}\r\n`;
    csv += `Total Orders,${overview.total_orders || 0}\r\n`;
    csv += `Active Queue,${overview.active_queue_count || 0}\r\n`;
    csv += `Total Revenue (INR),₹${overview.total_revenue_inr || 0}\r\n`;
    csv += `Cancellation Rate,${overview.cancellation_rate_percent || 0}%\r\n\r\n`;

    csv += `HOURLY DEMAND BREAKDOWN\r\nHour,Orders Placed\r\n`;
    hourly.forEach(h => {
      csv += `${h.hour},${h.total_orders}\r\n`;
    });

    csv += `\r\nTOP ORDERED DISHES\r\nRank,Item Name,Portions Sold,Total Revenue (INR)\r\n`;
    topItems.forEach((item, idx) => {
      csv += `${idx + 1},"${item.item_name.replace(/"/g, '""')}",${item.total_quantity_ordered},${item.total_revenue}\r\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `LunchLoop_Shift_Report_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Shift report CSV downloaded successfully!', 'success');
  } catch (err) {
    showToast(`Failed to export CSV: ${err.message}`, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('analyticsMainContent')) {
    loadAnalyticsDashboard();
  }
});
