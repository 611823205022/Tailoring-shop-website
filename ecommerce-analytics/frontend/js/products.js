let allProductsData = [];

function loadProductAnalytics() {
    fetch(`${API_BASE}/api/products`)
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                return;
            }

            allProductsData = data.products;

            document.getElementById('mini-total-products').textContent = formatNumber(data.summary.total_products);
            document.getElementById('mini-best-sellers').textContent = formatNumber(data.summary.best_sellers);
            document.getElementById('mini-profitable').textContent = formatNumber(data.summary.most_profitable);
            document.getElementById('mini-hslp').textContent = formatNumber(data.summary.high_sales_low_profit);

            const categories = [...new Set(data.products.map(p => p.category))];
            const catSelect = document.getElementById('category-filter');
            catSelect.innerHTML = '<option value="">All Categories</option>' +
                categories.map(c => `<option>${c}</option>`).join('');

            renderProductsTable(data.products);

            const searchInput = document.getElementById('product-search');
            const categoryFilter = document.getElementById('category-filter');
            const performanceFilter = document.getElementById('performance-filter');

            searchInput.oninput = filterProducts;
            categoryFilter.onchange = filterProducts;
            performanceFilter.onchange = filterProducts;
        })
        .catch(err => console.error('Products error:', err));
}

function filterProducts() {
    const search = document.getElementById('product-search').value.toLowerCase();
    const category = document.getElementById('category-filter').value;
    const performance = document.getElementById('performance-filter').value;

    let filtered = allProductsData;

    if (search) {
        filtered = filtered.filter(p =>
            p.product_name.toLowerCase().includes(search) ||
            p.category.toLowerCase().includes(search)
        );
    }
    if (category) {
        filtered = filtered.filter(p => p.category === category);
    }
    if (performance) {
        filtered = filtered.filter(p => p.performance === performance);
    }

    renderProductsTable(filtered);
}

function renderProductsTable(products) {
    const tbody = document.getElementById('products-body');
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><b>${p.product_name}</b><br><small style="color:var(--text-muted)">${p.brand || ''}</small></td>
            <td>${p.category}</td>
            <td>${formatNumber(p.units_sold)}</td>
            <td>${formatCurrency(p.revenue)}</td>
            <td style="color:${p.profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(p.profit)}</td>
            <td>${p.profit_margin}%</td>
            <td>${p.return_rate}%</td>
            <td>${badgeForPerformance(p.performance)}</td>
        </tr>
    `).join('');
}