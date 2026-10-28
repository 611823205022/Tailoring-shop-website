function loadDiscountAnalytics() {
    fetch(`${API_BASE}/api/discounts`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                return;
            }

            const rows = data.by_discount;
            const labels = rows.map(r => `${r.discount_pct}%`);
            const revenue = rows.map(r => r.revenue);
            const profit = rows.map(r => r.profit);
            const orders = rows.map(r => r.orders);

            layoutCharts.discounts = makeChart('chart-discounts', {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Revenue',
                            data: revenue,
                            backgroundColor: 'rgba(79,70,229,.7)',
                            borderRadius: 5
                        },
                        {
                            label: 'Profit',
                            data: profit,
                            backgroundColor: 'rgba(16,185,129,.7)',
                            borderRadius: 5
                        },
                        {
                            label: 'Orders',
                            data: orders,
                            type: 'line',
                            borderColor: '#f59e0b',
                            borderWidth: 2,
                            pointBackgroundColor: '#f59e0b',
                            tension: .3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { intersect: false, mode: 'index' },
                    plugins: {
                        legend: { position: 'top', labels: { boxHeight: 8, boxWidth: 8 } },
                        tooltip: {
                            callbacks: {
                                label: ctx => {
                                    if (ctx.dataset.label === 'Orders') return `Orders: ${formatNumber(ctx.parsed.y)}`;
                                    return `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            ticks: { callback: v => formatCurrency(v) },
                            grid: { color: '#f1f5f9' }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });

            const tbody = document.getElementById('discounts-body');
            tbody.innerHTML = rows.map(r => `
                <tr>
                    <td><b>${r.discount_pct}%</b></td>
                    <td>${formatNumber(r.orders)}</td>
                    <td>${formatCurrency(r.revenue)}</td>
                    <td style="color:${r.profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(r.profit)}</td>
                    <td>${r.margin}%</td>
                    <td>${formatNumber(r.units)}</td>
                </tr>
            `).join('');
        })
        .catch(err => console.error('Discounts error:', err));
}