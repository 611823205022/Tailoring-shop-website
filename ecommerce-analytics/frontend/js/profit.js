function loadProfitAnalytics() {
    fetch(`${API_BASE}/api/profit`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                return;
            }

            const o = data.overall;
            document.getElementById('kpi-gross-revenue').textContent = formatCurrency(o.gross_revenue);
            document.getElementById('kpi-net-profit').textContent = formatCurrency(o.profit);
            document.getElementById('kpi-total-cost').textContent = formatCurrency(o.total_cost);
            document.getElementById('kpi-discounts').textContent = formatCurrency(o.total_discount);

            const cats = data.by_category.map(c => c.category);
            const revenue = data.by_category.map(c => c.revenue);
            const cost = data.by_category.map(c => c.cost);
            const profit = data.by_category.map(c => c.profit);

            layoutCharts.profit = makeChart('chart-profit', {
                type: 'bar',
                data: {
                    labels: cats,
                    datasets: [
                        {
                            label: 'Revenue',
                            data: revenue,
                            backgroundColor: 'rgba(79,70,229,.75)',
                            borderRadius: 5
                        },
                        {
                            label: 'Cost',
                            data: cost,
                            backgroundColor: 'rgba(244,63,94,.65)',
                            borderRadius: 5
                        },
                        {
                            label: 'Profit',
                            data: profit,
                            backgroundColor: 'rgba(16,185,129,.75)',
                            borderRadius: 5
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
                        y: { ticks: { callback: v => formatCurrency(v) }, grid: { color: '#f1f5f9' } },
                        x: { grid: { display: false } }
                    }
                }
            });

            const hpBody = document.getElementById('high-hp-body');
            hpBody.innerHTML = data.high_rev_high_profit.map(c => `
                <tr>
                    <td><b>${c.category}</b></td>
                    <td>${formatCurrency(c.revenue)}</td>
                    <td style="color:var(--success)"><b>${formatCurrency(c.profit)}</b></td>
                    <td>${c.margin}%</td>
                </tr>
            `).join('');

            const lpBody = document.getElementById('high-lp-body');
            lpBody.innerHTML = data.high_rev_low_profit.map(c => `
                <tr>
                    <td><b>${c.category}</b></td>
                    <td>${formatCurrency(c.revenue)}</td>
                    <td style="color:var(--warning)"><b>${formatCurrency(c.profit)}</b></td>
                    <td>${c.margin}%</td>
                </tr>
            `).join('');

            if (data.high_rev_low_profit.length === 0) {
                lpBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No categories in this segment</td></tr>';
            }
        })
        .catch(err => console.error('Profit error:', err));
}