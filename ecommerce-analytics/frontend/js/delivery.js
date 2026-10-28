function loadDeliveryAnalytics() {
    fetch(`${API_BASE}/api/delivery`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                return;
            }

            const o = data.overall;
            document.getElementById('kpi-avg-delivery').textContent = `${o.avg_days?.toFixed?.(1) || '0'} days`;
            document.getElementById('kpi-ontime').textContent = `${o.on_time_pct}%`;
            document.getElementById('kpi-late').textContent = `${o.late_pct}%`;
            document.getElementById('kpi-cancel').textContent = `${o.cancel_pct}%`;

            // Courier chart
            const couriers = data.by_courier.map(c => c.courier);
            const onTime = data.by_courier.map(c => c.on_time_pct);

            layoutCharts.courier = makeChart('chart-courier', {
                type: 'bar',
                data: {
                    labels: couriers,
                    datasets: [
                        {
                            label: 'On-Time %',
                            data: onTime,
                            backgroundColor: couriers.map((_, i) =>
                                onTime[i] >= 85 ? 'rgba(16,185,129,.8)' :
                                onTime[i] >= 75 ? 'rgba(245,158,11,.8)' : 'rgba(239,68,68,.8)'
                            ),
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => ` On-Time: ${ctx.parsed.x}%`
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 100,
                            grid: { color: '#f1f5f9' },
                            ticks: { callback: v => `${v}%` }
                        },
                        y: { grid: { display: false } }
                    }
                }
            });

            const tbody = document.getElementById('region-body');
            tbody.innerHTML = data.by_region.map(r => `
                <tr>
                    <td><b>${r.region}</b></td>
                    <td>${formatNumber(r.orders)}</td>
                    <td>${r.avg_days?.toFixed?.(1) || '0'} days</td>
                    <td>${r.on_time_pct}%</td>
                </tr>
            `).join('');
        })
        .catch(err => console.error('Delivery error:', err));
}