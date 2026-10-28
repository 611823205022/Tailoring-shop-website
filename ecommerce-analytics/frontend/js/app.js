const API_BASE = '';

let layoutCharts = {};

function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');

    const titles = {
        executive: ['Executive Dashboard', 'Overview of business performance'],
        products: ['Product Analytics', 'Performance of every product'],
        customers: ['Customer Analytics', 'Behavior and segmentation analysis'],
        profit: ['Profit Analytics', 'Revenue vs cost breakdown'],
        delivery: ['Delivery Analytics', 'Logistics and shipping performance'],
        discounts: ['Discount Analysis', 'Impact of discounts on business'],
        'ai-chat': ['AI Analytics Assistant', 'Ask questions about your data']
    };

    const [title, subtitle] = titles[page] || ['Dashboard', ''];
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('pageSubtitle').textContent = subtitle;

    Object.values(layoutCharts).forEach(chart => {
        if (chart) chart.destroy();
    });
    layoutCharts = {};

    if (page === 'executive') loadExecutiveDashboard();
    if (page === 'products') loadProductAnalytics();
    if (page === 'customers') loadCustomerAnalytics();
    if (page === 'profit') loadProfitAnalytics();
    if (page === 'delivery') loadDeliveryAnalytics();
    if (page === 'discounts') loadDiscountAnalytics();
}

function formatCurrency(value) {
    const v = Number(value);
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
    if (v >= 1000) return `₹${v.toLocaleString('en-IN')}`;
    return `₹${v.toFixed(0)}`;
}

function formatNumber(value) {
    return Number(value).toLocaleString('en-IN');
}

function makeChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    return new Chart(canvas, config);
}

function badgeForPerformance(type) {
    const map = {
        'Best Seller': 'badge-best',
        'Most Profitable': 'badge-profitable',
        'High Sales / Low Profit': 'badge-hslp',
        'Regular': 'badge-regular'
    };
    return `<span class="badge ${map[type] || 'badge-regular'}">${type}</span>`;
}

function badgeForSegment(segment) {
    const map = {
        'VIP': 'badge-vip',
        'Loyal': 'badge-loyal',
        'Potential': 'badge-potential',
        'At Risk': 'badge-atrisk',
        'Lost': 'badge-lost'
    };
    return `<span class="badge ${map[segment] || 'badge-regular'}">${segment}</span>`;
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            switchPage(this.dataset.page);
        });
    });

    document.getElementById('menuToggle').addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('open');
    });

    switchPage('executive');
});