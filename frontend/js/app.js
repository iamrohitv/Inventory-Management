const API_BASE = 'http://localhost:8000/api/v1';
let currentPage = 1;
const pageSize = 20;
let allProducts = [];
let currentFilters = { category: '', stockStatus: '' };

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-success-600',
        error: 'bg-danger-600',
        warning: 'bg-warning-600',
        info: 'bg-primary-600'
    };
    toast.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showModal(content) {
    document.getElementById('modalContent').innerHTML = content;
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.getElementById('modalOverlay').classList.add('flex');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.getElementById('modalOverlay').classList.remove('flex');
}

function getStatusBadge(status) {
    const badges = {
        in_stock: '<span class="px-2 py-1 text-xs font-medium bg-success-100 text-success-700 rounded-full">In Stock</span>',
        low_stock: '<span class="px-2 py-1 text-xs font-medium bg-warning-100 text-warning-700 rounded-full">Low Stock</span>',
        critical: '<span class="px-2 py-1 text-xs font-medium bg-danger-100 text-danger-700 rounded-full">Critical</span>',
        out_of_stock: '<span class="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">Out of Stock</span>'
    };
    return badges[status] || `<span class="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">${status}</span>`;
}

function getAlertIcon(type) {
    const icons = {
        out_of_stock: '<svg class="w-5 h-5 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
        critical_stock: '<svg class="w-5 h-5 text-danger-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
        low_stock: '<svg class="w-5 h-5 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
        reorder_needed: '<svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    return icons[type] || icons.low_stock;
}

async function loadStats() {
    try {
        const stats = await apiRequest('/dashboard/stats');
        document.getElementById('statTotalProducts').textContent = stats.total_products.toLocaleString();
        document.getElementById('statLowStock').textContent = stats.low_stock_count.toLocaleString();
        document.getElementById('statCriticalStock').textContent = stats.critical_stock_count.toLocaleString();
        document.getElementById('statInventoryValue').textContent = '$' + stats.total_inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2 });
        document.getElementById('alertBadge').textContent = stats.unread_alerts;
    } catch (e) {
        console.error('Failed to load stats:', e);
    }
}

async function loadProducts() {
    try {
        const params = new URLSearchParams({
            skip: (currentPage - 1) * pageSize,
            limit: pageSize
        });
        if (currentFilters.category) params.append('category', currentFilters.category);
        if (currentFilters.stockStatus) params.append('stock_status', currentFilters.stockStatus);

        const products = await apiRequest(`/products?${params}`);
        allProducts = products;
        renderProducts(products);
        updatePagination(products.length);
        populateCategoryFilter(products);
    } catch (e) {
        console.error('Failed to load products:', e);
        showToast('Failed to load products', 'error');
    }
}

function renderProducts(products) {
    const tbody = document.getElementById('productsBody');
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-12 text-center text-slate-500">No products found</td></tr>';
        return;
    }
    tbody.innerHTML = products.map(p => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-mono text-sm text-slate-900">${p.sku}</td>
            <td class="px-6 py-4">
                <div class="font-medium text-slate-900">${p.name}</div>
                <div class="text-sm text-slate-500">${p.category}</div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500 capitalize">${p.category}</td>
            <td class="px-6 py-4 text-right font-medium text-slate-900">$${p.price.toFixed(2)}</td>
            <td class="px-6 py-4 text-right text-sm text-slate-900">${p.current_stock}</td>
            <td class="px-6 py-4 text-right font-medium ${p.available_stock <= 0 ? 'text-danger-600' : p.available_stock <= 10 ? 'text-warning-600' : 'text-success-600'}">${p.available_stock}</td>
            <td class="px-6 py-4">${getStatusBadge(p.stock_status)}</td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    <button onclick="openAdjustModal('${p.id}', '${p.sku}', '${p.name}', ${p.current_stock})" class="px-3 py-1.5 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors">Adjust</button>
                    <button onclick="viewProductLogs('${p.id}')" class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors">Logs</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updatePagination(loadedCount) {
    const info = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const start = (currentPage - 1) * pageSize + 1;
    const end = start + loadedCount - 1;
    info.textContent = loadedCount > 0 ? `Showing ${start}-${end} products` : 'Showing 0 of 0 products';
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = loadedCount < pageSize;
}

function populateCategoryFilter(products) {
    const select = document.getElementById('categoryFilter');
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    select.innerHTML = '<option value="">All Categories</option>' +
        categories.map(c => `<option value="${c}"${currentFilters.category === c ? ' selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('');
}

function prevPage() { if (currentPage > 1) { currentPage--; loadProducts(); } }
function nextPage() { currentPage++; loadProducts(); }

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
        const alerts = await apiRequest('/alerts?unread_only=true&limit=10');
        renderAlerts(alerts);
    } catch (e) {
        console.error('Failed to load alerts:', e);
    }
}

function renderAlerts(alerts) {
    const container = document.getElementById('alertsList');
    if (alerts.length === 0) {
        container.innerHTML = '<div class="px-6 py-8 text-center text-slate-500">No active alerts</div>';
        return;
    }
    container.innerHTML = alerts.map(a => `
        <div class="px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors flex gap-3" data-alert-id="${a.id}">
            ${getAlertIcon(a.alert_type)}
            <div class="flex-1 min-w-0">
                <p class="font-medium text-slate-900">${a.message}</p>
                <p class="text-xs text-slate-500 mt-1">${new Date(a.created_at).toLocaleString()}</p>
            </div>
            <button onclick="acknowledgeAlert('${a.id}')" class="px-2 py-1 text-xs text-primary-600 hover:text-primary-700 font-medium">Dismiss</button>
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

async function triggerAgentCheck() {
    try {
        showToast('Running inventory check...', 'info');
        await apiRequest('/agent/check', { method: 'POST' });
        showToast('Inventory check completed', 'success');
        await refreshAll();
    } catch (e) {
        showToast('Failed to run check', 'error');
    }
}

async function seedProducts() {
    try {
        showToast('Seeding 100 products...', 'info');
        const result = await apiRequest('/products/seed?count=100', { method: 'POST' });
        showToast(`Seeded ${result.count} products`, 'success');
        await refreshAll();
    } catch (e) {
        showToast('Failed to seed products', 'error');
    }
}

function openAdjustModal(productId, sku, name, currentStock) {
    showModal(`
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-semibold">Adjust Stock: ${name} (${sku})</h3>
                <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p class="text-sm text-slate-500 mb-4">Current Stock: <span class="font-medium text-slate-900">${currentStock}</span></p>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Quantity Change</label>
                    <input type="number" id="adjustQuantity" placeholder="e.g. +10 or -5" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                    <select id="adjustReason" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="restock">Restock</option>
                        <option value="sale">Sale</option>
                        <option value="return">Return</option>
                        <option value="adjustment">Adjustment</option>
                        <option value="damaged">Damaged</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Reference (optional)</label>
                    <input type="text" id="adjustReference" placeholder="Order #, PO #, etc." class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                </div>
            </div>
            <div class="mt-6 flex gap-3">
                <button onclick="closeModal()" class="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancel</button>
                <button onclick="submitAdjustment('${productId}')" class="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Apply</button>
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
            <div class="p-6 max-h-[70vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-semibold">Inventory Logs</h3>
                    <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead><tr class="text-left text-slate-500"><th class="pb-2">Date</th><th class="pb-2">Type</th><th class="pb-2">Qty</th><th class="pb-2">Prev → New</th><th class="pb-2">Reason</th><th class="pb-2">Ref</th></tr></thead>
                        <tbody class="divide-y divide-slate-100">
                            ${logs.map(l => `
                                <tr class="hover:bg-slate-50">
                                    <td class="py-2">${new Date(l.timestamp).toLocaleString()}</td>
                                    <td class="py-2"><span class="px-2 py-0.5 text-xs rounded ${l.change_type === 'in' ? 'bg-success-100 text-success-700' : l.change_type === 'out' ? 'bg-danger-100 text-danger-700' : 'bg-slate-100 text-slate-700'}">${l.change_type}</span></td>
                                    <td class="py-2">${l.quantity > 0 ? '+' : ''}${l.quantity}</td>
                                    <td class="py-2 font-mono">${l.previous_stock} → ${l.new_stock}</td>
                                    <td class="py-2 text-slate-600">${l.reason}</td>
                                    <td class="py-2 text-slate-400 font-mono">${l.reference || '-'}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="6" class="py-8 text-center text-slate-500">No logs found</td></tr>'}
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
        } else {
            indicator.className = 'w-2 h-2 rounded-full bg-danger-500';
            text.textContent = 'Agent: Stopped';
        }
    } catch (e) {
        document.getElementById('agentIndicator').className = 'w-2 h-2 rounded-full bg-slate-400';
        document.getElementById('agentText').textContent = 'Agent: Unknown';
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
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported', 'success');
}

async function refreshAll() {
    await Promise.all([loadStats(), loadProducts(), loadAlerts(), checkAgentStatus()]);
}

document.addEventListener('DOMContentLoaded', () => {
    refreshAll();
    setInterval(refreshAll, 30000);
    setInterval(checkAgentStatus, 10000);
});

document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
});