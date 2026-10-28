function loadCustomerAnalytics() {
    fetch(`${API_BASE}/api/customers`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                return;
            }

            // Segment chart
            const segLabels = data.segment_summary.map(s => s.segment);
            const segCounts = data.segment_summary.map(s => s.count);
            const segRevenue = data.segment_summary.map(s => s.avg_spending);

            layoutCharts.segments = makeChart('chart-segments', {
                type: 'bar',
                data: {
                    labels: segLabels,
                    datasets: [
                        {
                            label: 'Customers',
                            data: segCounts,
                            backgroundColor: ['#f59e0b', '#3b82f6', '#6366f1', '#ef4444', '#94a3b8'],
                            borderRadius: 6
                        },
                        {
                            label: 'Avg Spending (₹)',
                            data: segRevenue,
                            type: 'line',
                            borderColor: '#10b981',
                            borderWidth: 2,
                            pointBackgroundColor: '#10b981',
                            tension: .3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { intersect: false, mode: 'index' },
                    plugins: {
                        legend: { position: 'top', labels: { boxHeight: 8, boxWidth: 8 } }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#f1f5f9' }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });

            const tbody = document.getElementById('top-customers-body');
            tbody.innerHTML = data.top_customers.map(c => `
                <tr>
                    <td><b>${c.name}</b></td>
                    <td>${c.location}</td>
                    <td>${badgeForSegment(c.segment)}</td>
                    <td>${formatNumber(c.total_orders)}</td>
                    <td><b>${formatCurrency(c.total_spending)}</b></td>
                    <td>${formatCurrency(c.avg_order_value)}</td>
                    <td>${new Date(c.last_purchase).toLocaleDateString()}</td>
                </tr>
            `).join('');
        })
        .catch(err => console.error('Customers error:', err));
}