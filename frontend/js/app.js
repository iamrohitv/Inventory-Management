const API_BASE = 'http://localhost:8000/api/v1';
let currentPage = 1;
const pageSize = 20;
let allProducts = [];
let currentFilters = { category: '', stockStatus: '' };
let searchQuery = '';
let sortState = { key: null, dir: 1 };

function apiRequest(endpoint, options = {}) {
    return fetch(`${API_BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    }).then(async (response) => {
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }
        return response.json();
    });
}

function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function formatCurrency(n) {
    return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const styles = {
        success: { bar: 'bg-success-500', icon: 'M9 12l2 2 4-4', chip: 'bg-success-500' },
        error: { bar: 'bg-danger-500', icon: 'M6 18L18 6M6 6l12 12', chip: 'bg-danger-500' },
        warning: { bar: 'bg-warning-500', icon: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', chip: 'bg-warning-500' },
        info: { bar: 'bg-primary-500', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', chip: 'bg-primary-500' }
    };
    const s = styles[type] || styles.info;
    const toast = document.createElement('div');
    toast.className = 'slide-in flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lift pl-4 pr-5 py-3 pointer-events-auto max-w-sm';
    toast.innerHTML = `
        <span class="w-8 h-8 shrink-0 rounded-lg ${s.chip} flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${s.icon}"/>
            </svg>
        </span>
        <span class="text-sm font-medium text-slate-800 dark:text-slate-100 flex-1">${message}</span>
    `;
    const bar = document.createElement('div');
    bar.className = `absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${s.bar}`;
    toast.appendChild(bar);
    toast.style.position = 'relative';
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity .3s, transform .3s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(24px)';
        setTimeout(() => toast.remove(), 320);
    }, 3800);
}

function showModal(content) {
    const overlay = document.getElementById('modalOverlay');
    document.getElementById('modalContent').innerHTML = content;
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
}

function getStatusBadge(status) {
    const badges = {
        in_stock: 'bg-success-100 text-success-700 dark:bg-success-500/10 dark:text-success-400',
        low_stock: 'bg-warning-100 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
        critical: 'bg-danger-100 text-danger-700 dark:bg-danger-500/10 dark:text-danger-400',
        out_of_stock: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
    };
    const dot = {
        in_stock: 'bg-success-500',
        low_stock: 'bg-warning-500',
        critical: 'bg-danger-500',
        out_of_stock: 'bg-slate-400 dark:bg-slate-500'
    };
    const label = { in_stock: 'In Stock', low_stock: 'Low Stock', critical: 'Critical', out_of_stock: 'Out of Stock' };
    const cls = badges[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    const d = dot[status] || 'bg-slate-400';
    const text = label[status] || status;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${cls}">
        <span class="w-1.5 h-1.5 rounded-full ${d}"></span>${text}
    </span>`;
}

function getAlertIcon(type) {
    const icons = {
        out_of_stock: 'text-danger-500 bg-danger-50 dark:bg-danger-500/10',
        critical_stock: 'text-danger-500 bg-danger-50 dark:bg-danger-500/10',
        low_stock: 'text-warning-500 bg-warning-50 dark:bg-warning-500/10',
        reorder_needed: 'text-primary-500 bg-primary-50 dark:bg-primary-500/10'
    };
    const svg = {
        out_of_stock: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        critical_stock: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        low_stock: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        reorder_needed: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'
    };
    const icon = icons[type] || icons.low_stock;
    const path = svg[type] || svg.low_stock;
    return `<span class="w-9 h-9 shrink-0 rounded-lg ${icon} flex items-center justify-center">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${path}"/>
        </svg>
    </span>`;
}

function stockBarColor(status) {
    return {
        in_stock: 'bg-success-500',
        low_stock: 'bg-warning-500',
        critical: 'bg-danger-500',
        out_of_stock: 'bg-slate-400 dark:bg-slate-600'
    }[status] || 'bg-primary-500';
}

async function loadStats() {
    try {
        const stats = await apiRequest('/dashboard/stats');
        document.getElementById('statTotalProducts').textContent = stats.total_products.toLocaleString();
        document.getElementById('statLowStock').textContent = stats.low_stock_count.toLocaleString();
        document.getElementById('statCriticalStock').textContent = stats.critical_stock_count.toLocaleString();
        document.getElementById('statInventoryValue').textContent = formatCurrency(stats.total_inventory_value);
        document.getElementById('alertBadge').textContent = stats.unread_alerts;
    } catch (e) {
        console.error('Failed to load stats:', e);
    }
}

async function loadProducts() {
    try {
        const params = new URLSearchParams({ skip: (currentPage - 1) * pageSize, limit: pageSize });
        if (currentFilters.category) params.append('category', currentFilters.category);
        if (currentFilters.stockStatus) params.append('stock_status', currentFilters.stockStatus);

        const products = await apiRequest(`/products?${params}`);
        allProducts = products;
        renderProducts();
        updatePagination(products.length);
        populateCategoryFilter(products);
        document.getElementById('productCountBadge').textContent = products.length;
    } catch (e) {
        console.error('Failed to load products:', e);
        showToast('Failed to load products', 'error');
        const tbody = document.getElementById('productsBody');
        tbody.innerHTML = '<tr><td colspan="7" class="px-6 py-12 text-center text-slate-500">Could not reach the API. Is the backend running?</td></tr>';
    }
}

function filteredAndSorted() {
    let list = allProducts;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
        list = list.filter(p =>
            (p.sku || '').toLowerCase().includes(q) ||
            (p.name || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q)
        );
    }
    if (sortState.key) {
        const { key, dir } = sortState;
        list = [...list].sort((a, b) => {
            const va = a[key];
            const vb = b[key];
            if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
            return String(va ?? '').localeCompare(String(vb ?? '')) * dir;
        });
    }
    return list;
}

function renderProducts() {
    const tbody = document.getElementById('productsBody');
    const products = filteredAndSorted();
    window._renderList = products;

    if (products.length === 0) {
        const msg = allProducts.length === 0
            ? 'No products found — try seeding some from Quick Actions.'
            : 'No products match your search or filters.';
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-14 text-center">
            <div class="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <p class="text-sm">${msg}</p>
            </div>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = products.map((p, i) => {
        const pct = p.reorder_point > 0
            ? Math.min(100, Math.round((p.current_stock / p.reorder_point) * 100))
            : (p.current_stock > 0 ? 100 : 0);
        const stockLabel = p.reorder_point > 0
            ? `<span class="text-xs text-slate-400 dark:text-slate-500"> / ${p.reorder_point} reorder</span>`
            : '';
        return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}">
            <td class="px-5 sm:px-6 py-3.5 font-mono text-[13px] text-slate-700 dark:text-slate-300 whitespace-nowrap">${escapeHtml(p.sku)}</td>
            <td class="px-5 sm:px-6 py-3.5">
                <div class="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate max-w-[220px]">${escapeHtml(p.name)}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400 capitalize flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-primary-400 inline-block"></span>${escapeHtml(p.category)}
                </div>
            </td>
            <td class="px-5 sm:px-6 py-3.5 text-right font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">${formatCurrency(p.price)}</td>
            <td class="px-5 sm:px-6 py-3.5">
                <div class="flex items-center justify-between gap-3 mb-1">
                    <span class="text-sm font-bold ${p.available_stock <= 0 ? 'text-danger-600 dark:text-danger-400' : p.current_stock <= 3 ? 'text-warning-600 dark:text-warning-400' : 'text-slate-900 dark:text-slate-100'}">${p.current_stock}</span>
                    ${stockLabel}
                </div>
                <div class="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div class="h-full rounded-full ${stockBarColor(p.stock_status)} transition-all duration-500" style="width:${Math.max(pct, p.current_stock > 0 ? 4 : 0)}%"></div>
                </div>
            </td>
            <td class="px-5 sm:px-6 py-3.5 text-right font-medium ${p.available_stock <= 0 ? 'text-danger-600 dark:text-danger-400' : p.available_stock <= 10 ? 'text-warning-600 dark:text-warning-400' : 'text-success-600 dark:text-success-400'} whitespace-nowrap">${p.available_stock}</td>
            <td class="px-5 sm:px-6 py-3.5">${getStatusBadge(p.stock_status)}</td>
            <td class="px-5 sm:px-6 py-3.5 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                    <button onclick="openAdjustModal(${i})" class="px-2.5 h-7 text-xs font-medium bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors">Adjust</button>
                    <button onclick="viewProductLogs('${p.id}')" class="px-2.5 h-7 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Logs</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function updatePagination(loadedCount) {
    const info = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const start = (currentPage - 1) * pageSize + 1;
    const end = start + loadedCount - 1;
    info.textContent = loadedCount > 0
        ? `Showing ${start}–${end} of this page · Page ${currentPage}`
        : 'No results';
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = loadedCount < pageSize;
}

function populateCategoryFilter(products) {
    const select = document.getElementById('categoryFilter');
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    select.innerHTML = '<option value="">All Categories</option>' +
        categories.map(c => `<option value="${escapeHtml(c)}"${currentFilters.category === c ? ' selected' : ''}>${escapeHtml(c.charAt(0).toUpperCase() + c.slice(1))}</option>`).join('');
}

function prevPage() { if (currentPage > 1) { currentPage--; loadProducts(); } }
function nextPage() { currentPage++; loadProducts(); }

function toggleSort(key) {
    if (sortState.key === key) {
        sortState.dir = sortState.dir === 1 ? -1 : 1;
    } else {
        sortState = { key, dir: 1 };
    }
    updateSortIndicators();
    renderProducts();
}

function updateSortIndicators() {
    document.querySelectorAll('.sort-indicator').forEach(el => {
        const key = el.dataset.indicator;
        if (sortState.key === key) {
            el.textContent = sortState.dir === 1 ? '↑' : '↓';
            el.className = 'sort-indicator text-primary-500';
        } else {
            el.textContent = '';
        }
    });
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderProducts();
});

document.getElementById('categoryFilter').addEventListener('change', (e) => {
    currentFilters.category = e.target.value;
    currentPage = 1;
    loadProducts();
});

document.getElementById('stockFilter').addEventListener('change', (e) => {
    currentFilters.stockStatus = e.target.value;
    currentPage = 1;
    loadProducts();
});

async function loadAlerts() {
    try {
        const alerts = await apiRequest('/alerts?unread_only=true&limit=8');
        renderAlerts(alerts);
    } catch (e) {
        console.error('Failed to load alerts:', e);
        document.getElementById('alertsList').innerHTML =
            '<div class="px-6 py-10 text-center text-slate-400 dark:text-slate-500 text-sm">Could not load alerts</div>';
    }
}

function renderAlerts(alerts) {
    const container = document.getElementById('alertsList');
    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="px-6 py-12 text-center">
                <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-success-50 dark:bg-success-500/10 flex items-center justify-center">
                    <svg class="w-6 h-6 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                </div>
                <p class="text-sm font-medium text-slate-500 dark:text-slate-400">All clear — no active alerts</p>
            </div>`;
        return;
    }
    container.innerHTML = alerts.map(a => `
        <div class="px-5 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3" data-alert-id="${a.id}">
            ${getAlertIcon(a.alert_type)}
            <div class="flex-1 min-w-0">
                <p class="font-medium text-sm text-slate-800 dark:text-slate-200 leading-snug">${escapeHtml(a.message)}</p>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    <span class="inline-flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        ${new Date(a.created_at).toLocaleString()}
                    </span>
                </p>
            </div>
            <button onclick="acknowledgeAlert('${a.id}')" class="self-center px-2.5 h-7 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors shrink-0">Dismiss</button>
        </div>
    `).join('');
}

async function acknowledgeAlert(alertId) {
    try {
        await apiRequest(`/alerts/${alertId}/acknowledge`, { method: 'PATCH' });
        loadAlerts();
        loadStats();
        showToast('Alert dismissed', 'success');
    } catch (e) {
        showToast('Failed to dismiss alert', 'error');
    }
}

async function openAllAlerts() {
    try {
        const alerts = await apiRequest('/alerts?limit=50');
        showModal(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-5">
                    <div class="flex items-center gap-2">
                        <h3 class="text-lg font-semibold">All Alerts</h3>
                        <span class="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">${alerts.length}</span>
                    </div>
                    <button onclick="closeModal()" class="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">✕</button>
                </div>
                <div class="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
                    ${alerts.length === 0 ? '<p class="text-center text-slate-400 py-10">No alerts recorded</p>' : alerts.map(a => `
                        <div class="flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors ${a.is_read ? 'opacity-60' : ''}">
                            ${getAlertIcon(a.alert_type)}
                            <div class="flex-1 min-w-0">
                                <p class="font-medium text-sm text-slate-800 dark:text-slate-200 leading-snug">${escapeHtml(a.message)}</p>
                                <p class="text-xs text-slate-400 mt-0.5">
                                    <span class="font-mono">${escapeHtml(a.product_sku)}</span> · ${new Date(a.created_at).toLocaleString()}
                                    ${a.acknowledged_at ? ' · <span class="text-success-500">acknowledged</span>' : ''}
                                </p>
                            </div>
                            ${!a.is_read ? `<button onclick="acknowledgeAlert('${a.id}')" class="self-center px-2.5 h-7 text-xs font-medium text-primary-600 hover:text-primary-700 rounded-lg transition-colors">Dismiss</button>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `);
    } catch (e) {
        showToast('Failed to load alerts', 'error');
    }
}

async function triggerAgentCheck(btn) {
    try {
        showToast('Running inventory check…', 'info');
        if (!btn) btn = document.querySelector('#quickCheckBtn');
        if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
        await apiRequest('/agent/check', { method: 'POST' });
        showToast('Inventory check completed', 'success');
        await refreshAll();
    } catch (e) {
        showToast('Failed to run check', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }
}

async function seedProducts() {
    try {
        showToast('Seeding 100 products…', 'info');
        const result = await apiRequest('/products/seed?count=100', { method: 'POST' });
        showToast(`Seeded ${result.count} products`, 'success');
        await refreshAll();
    } catch (e) {
        showToast('Failed to seed products', 'error');
    }
}

function openAddProductModal() {
    showModal(`
        <div class="p-6">
            <div class="flex items-center justify-between mb-5">
                <div>
                    <h3 class="text-lg font-semibold">Add Product</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Create a new product in inventory</p>
                </div>
                <button onclick="closeModal()" class="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">✕</button>
            </div>
            <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">SKU *</label>
                        <input type="text" id="prodSku" placeholder="e.g. itemxxx101" class="w-full px-4 h-11 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                        <input type="text" id="prodCategory" placeholder="e.g. electronics" class="w-full px-4 h-11 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name *</label>
                    <input type="text" id="prodName" placeholder="Product name" class="w-full px-4 h-11 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                    <textarea id="prodDescription" rows="2" placeholder="Short description (optional)" class="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"></textarea>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Price *</label>
                        <input type="number" id="prodPrice" min="0" step="0.01" placeholder="0.00" class="w-full px-3 h-11 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Cost</label>
                        <input type="number" id="prodCost" min="0" step="0.01" placeholder="0.00" class="w-full px-3 h-11 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Initial Stock</label>
                        <input type="number" id="prodStock" min="0" step="1" placeholder="0" class="w-full px-3 h-11 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reorder Point</label>
                        <input type="number" id="prodReorderPoint" min="0" step="1" placeholder="10" class="w-full px-3 h-11 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Supplier</label>
                        <input type="text" id="prodSupplier" placeholder="Supplier name" class="w-full px-4 h-11 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Location</label>
                        <input type="text" id="prodLocation" placeholder="e.g. Warehouse A" class="w-full px-4 h-11 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    </div>
                </div>
            </div>
            <div class="mt-6 flex gap-3">
                <button onclick="closeModal()" class="flex-1 h-11 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition-colors">Cancel</button>
                <button onclick="submitProduct()" class="flex-1 h-11 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors">Create Product</button>
            </div>
        </div>
    `);
    setTimeout(() => document.getElementById('prodSku')?.focus(), 50);
}

async function submitProduct() {
    const sku = document.getElementById('prodSku').value.trim();
    const name = document.getElementById('prodName').value.trim();
    const category = document.getElementById('prodCategory').value.trim() || 'general';
    const description = document.getElementById('prodDescription').value.trim() || null;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const cost = parseFloat(document.getElementById('prodCost').value || '0');
    const initial_stock = parseInt(document.getElementById('prodStock').value || '0', 10);
    const reorder_point = parseInt(document.getElementById('prodReorderPoint').value || '10', 10);
    const supplier = document.getElementById('prodSupplier').value.trim() || null;
    const location = document.getElementById('prodLocation').value.trim() || null;

    if (!sku || !name) {
        showToast('SKU and Name are required', 'error');
        return;
    }
    if (isNaN(price) || price < 0) {
        showToast('Please enter a valid price', 'error');
        return;
    }

    const btn = document.querySelector('#modalContent button:last-child');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

    try {
        const product = await apiRequest('/products', {
            method: 'POST',
            body: JSON.stringify({
                sku, name, category, description, price, cost,
                initial_stock, reorder_point, supplier, location
            })
        });
        closeModal();
        showToast(`Product "${product.sku}" created`, 'success');
        await refreshAll();
    } catch (e) {
        showToast(e.message || 'Failed to create product', 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Create Product'; }
    }
}

function openAdjustModal(index) {
    const p = (window._renderList || [])[index];
    if (!p) return;
    const productId = p.id, sku = p.sku, name = p.name, currentStock = p.current_stock;
    showModal(`
        <div class="p-6">
            <div class="flex items-center justify-between mb-5">
                <div>
                    <h3 class="text-lg font-semibold">Adjust Stock</h3>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        <span class="font-mono font-medium text-slate-700 dark:text-slate-300">${sku}</span> · ${name}
                    </p>
                </div>
                <button onclick="closeModal()" class="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">✕</button>
            </div>
            <div class="mb-5 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span class="text-sm text-slate-500 dark:text-slate-400">Current stock</span>
                <span class="text-lg font-bold text-slate-900 dark:text-slate-100">${currentStock}</span>
            </div>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Quantity Change</label>
                    <input type="number" id="adjustQuantity" placeholder="e.g. +10 or -5" class="w-full px-4 h-11 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reason</label>
                    <select id="adjustReason" class="w-full px-4 h-11 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer">
                        <option value="restock">Restock</option>
                        <option value="sale">Sale</option>
                        <option value="return">Return</option>
                        <option value="adjustment">Adjustment</option>
                        <option value="damaged">Damaged</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reference (optional)</label>
                    <input type="text" id="adjustReference" placeholder="Order #, PO #, etc." class="w-full px-4 h-11 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                </div>
            </div>
            <div class="mt-6 flex gap-3">
                <button onclick="closeModal()" class="flex-1 h-11 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition-colors">Cancel</button>
                <button onclick="submitAdjustment('${productId}')" class="flex-1 h-11 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors">Apply Change</button>
            </div>
        </div>
    `);
}

async function submitAdjustment(productId) {
    const quantity = parseInt(document.getElementById('adjustQuantity').value);
    const reason = document.getElementById('adjustReason').value;
    const reference = document.getElementById('adjustReference').value || null;

    if (isNaN(quantity) || quantity === 0) {
        showToast('Please enter a valid quantity', 'error');
        return;
    }

    try {
        await apiRequest('/inventory/adjust', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, quantity, reason, reference })
        });
        closeModal();
        showToast('Stock adjusted successfully', 'success');
        await refreshAll();
    } catch (e) {
        showToast(e.message || 'Failed to adjust stock', 'error');
    }
}

async function viewProductLogs(productId) {
    try {
        const logs = await apiRequest(`/inventory/logs?product_id=${productId}&limit=50`);
        showModal(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-5">
                    <h3 class="text-lg font-semibold">Inventory Logs</h3>
                    <button onclick="closeModal()" class="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">✕</button>
                </div>
                <div class="overflow-x-auto scrollbar-thin">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <th class="pb-3 pr-3">Date</th><th class="pb-3 pr-3">Type</th><th class="pb-3 pr-3 text-right">Qty</th>
                                <th class="pb-3 pr-3">Prev → New</th><th class="pb-3 pr-3">Reason</th><th class="pb-3">Ref</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            ${logs.map(l => `
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td class="py-2.5 pr-3 whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs">${new Date(l.timestamp).toLocaleString()}</td>
                                    <td class="py-2.5 pr-3">
                                        <span class="px-2 py-0.5 text-xs font-medium rounded-full ${l.change_type === 'in' ? 'bg-success-100 text-success-700 dark:bg-success-500/10 dark:text-success-400' : l.change_type === 'out' ? 'bg-danger-100 text-danger-700 dark:bg-danger-500/10 dark:text-danger-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}">${l.change_type}</span>
                                    </td>
                                    <td class="py-2.5 pr-3 text-right font-semibold ${l.quantity > 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}">${l.quantity > 0 ? '+' : ''}${l.quantity}</td>
                                    <td class="py-2.5 pr-3 font-mono text-xs text-slate-600 dark:text-slate-300">${l.previous_stock} → ${l.new_stock}</td>
                                    <td class="py-2.5 pr-3 text-slate-600 dark:text-slate-400 capitalize">${escapeHtml(l.reason || '-')}</td>
                                    <td class="py-2.5 font-mono text-xs text-slate-400">${escapeHtml(l.reference || '-')}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="6" class="py-10 text-center text-slate-400">No logs found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `);
    } catch (e) {
        showToast('Failed to load logs', 'error');
    }
}

async function checkAgentStatus() {
    try {
        const status = await apiRequest('/agent/status');
        const indicator = document.getElementById('agentIndicator');
        const text = document.getElementById('agentText');
        if (status.running) {
            indicator.className = 'w-2 h-2 rounded-full bg-success-500 pulse-soft';
            text.textContent = 'Agent: Running';
            indicator.title = 'Scheduler active';
        } else {
            indicator.className = 'w-2 h-2 rounded-full bg-danger-500';
            text.textContent = 'Agent: Stopped';
            indicator.title = 'Scheduler inactive';
        }
    } catch (e) {
        document.getElementById('agentIndicator').className = 'w-2 h-2 rounded-full bg-slate-400';
        document.getElementById('agentText').textContent = 'Agent: Unknown';
    }
}

async function checkApiStatus() {
    try {
        const health = await fetch('http://localhost:8000/health').then(r => r.json());
        const dot = document.getElementById('apiStatusDot');
        const text = document.getElementById('apiStatusText');
        if (health.status === 'healthy') {
            dot.className = 'w-1.5 h-1.5 rounded-full bg-success-500';
            text.textContent = 'API online';
            text.className = 'text-success-600 dark:text-success-400';
        } else {
            dot.className = 'w-1.5 h-1.5 rounded-full bg-warning-500';
            text.textContent = 'API degraded';
            text.className = 'text-warning-600 dark:text-warning-400';
        }
    } catch (e) {
        const dot = document.getElementById('apiStatusDot');
        const text = document.getElementById('apiStatusText');
        dot.className = 'w-1.5 h-1.5 rounded-full bg-danger-500';
        text.textContent = 'API offline';
        text.className = 'text-danger-600 dark:text-danger-400';
    }
}

function exportCSV() {
    if (allProducts.length === 0) {
        showToast('No products to export', 'warning');
        return;
    }
    const headers = ['SKU', 'Name', 'Category', 'Price', 'Cost', 'Current Stock', 'Reserved', 'Available', 'Reorder Point', 'Status'];
    const rows = allProducts.map(p => [
        p.sku, p.name, p.category, p.price, p.cost,
        p.current_stock, p.reserved_stock, p.available_stock,
        p.reorder_point, p.stock_status
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported', 'success');
}

function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.classList.toggle('dark');
    try { localStorage.setItem('stockpilot-theme', isDark ? 'dark' : 'light'); } catch (e) {}
    showToast(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'info');
}

async function refreshAll() {
    const start = Date.now();
    await Promise.all([loadStats(), loadProducts(), loadAlerts(), checkAgentStatus(), checkApiStatus()]);
    document.getElementById('lastUpdatedText').textContent = new Date().toLocaleTimeString();
}

document.addEventListener('DOMContentLoaded', () => {
    refreshAll();
    setInterval(refreshAll, 30000);
    setInterval(checkAgentStatus, 10000);
});

document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});
