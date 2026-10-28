function loadExecutiveDashboard() {
    fetch(`${API_BASE}/api/executive`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                return;
            }

            const k = data.kpi;
            document.getElementById('kpi-revenue').textContent = formatCurrency(k.total_revenue);
            document.getElementById('kpi-profit').textContent = formatCurrency(k.total_profit);
            document.getElementById('kpi-margin').textContent = `${k.profit_margin}% profit margin`;
            document.getElementById('kpi-orders').textContent = formatNumber(k.total_orders);
            document.getElementById('kpi-customers').textContent = `${formatNumber(k.total_customers)} customers`;
            document.getElementById('kpi-aov').textContent = formatCurrency(k.aov);
            document.getElementById('kpi-return-rate').textContent = `${k.return_rate}% return rate`;

            // Trending chart
            const months = data.monthly_trend.map(r => r.month);
            const revenue = data.monthly_trend.map(r => r.revenue);
            const profit = data.monthly_trend.map(r => r.profit);

            layoutCharts.trend = makeChart('chart-trend', {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Revenue',
                            data: revenue,
                            borderColor: '#4f46e5',
                            backgroundColor: 'rgba(79,70,229,.1)',
                            fill: true,
                            tension: .3,
                            pointRadius: 3
                        },
                        {
                            label: 'Profit',
                            data: profit,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16,185,129,.08)',
                            fill: true,
                            tension: .3,
                            pointRadius: 3
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
                                label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
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

            // Top products table
            const tbody = document.getElementById('top-products-body');
            tbody.innerHTML = data.top_products.map((p, i) => `
                <tr>
                    <td><b>${i + 1}. ${p.product_name}</b></td>
                    <td>${formatCurrency(p.revenue)}</td>
                    <td>${formatNumber(p.units)}</td>
                </tr>
            `).join('');

            // Category doughnut
            layoutCharts.categories = makeChart('chart-categories', {
                type: 'doughnut',
                data: {
                    labels: data.top_categories.map(c => c.category),
                    datasets: [{
                        data: data.top_categories.map(c => c.revenue),
                        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true } },
                        tooltip: {
                            callbacks: {
                                label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`
                            }
                        }
                    }
                }
            });
        })
        .catch(err => console.error('Executive dashboard error:', err));
}