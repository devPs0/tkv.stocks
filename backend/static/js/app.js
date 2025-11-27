// Tkv.stocks JavaScript Functions
class StockPredictor {
    constructor() {
        this.baseUrl = window.location.origin;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File upload handling
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.addEventListener('change', this.handleFileUpload.bind(this));
        });

        // Fetch stock data buttons
        const fetchButtons = document.querySelectorAll('.btn-fetch');
        fetchButtons.forEach(button => {
            button.addEventListener('click', this.handleFetchStock.bind(this));
        });

        // Auto-refresh data
        this.startAutoRefresh();
    }

    async fetchStock(symbol) {
        try {
            this.showLoading(`Fetching ${symbol}...`);
            const response = await fetch(`${this.baseUrl}/fetch/${symbol}`);
            const data = await response.json();
            
            if (response.ok) {
                this.showSuccess(`Successfully fetched ${data.rows} records for ${symbol}`);
                this.refreshHoldings();
            } else {
                this.showError(`Failed to fetch ${symbol}: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            this.showError(`Network error: ${error.message}`);
        }
    }

    async handleFetchStock(event) {
        const button = event.target;
        const symbol = button.dataset.symbol || prompt('Enter stock symbol (e.g., TCS.NS):');
        
        if (symbol) {
            button.disabled = true;
            button.innerHTML = '<span class="loading"></span> Fetching...';
            
            await this.fetchStock(symbol);
            
            button.disabled = false;
            button.innerHTML = 'Fetch Data';
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            this.showLoading('Uploading portfolio...');
            const response = await fetch(`${this.baseUrl}/upload-groww`, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showSuccess(`Portfolio imported successfully! Portfolio ID: ${data.portfolio_id}`);
                this.refreshHoldings();
            } else {
                this.showError(`Upload failed: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            this.showError(`Upload error: ${error.message}`);
        }
    }

    async refreshHoldings() {
        try {
            const response = await fetch(`${this.baseUrl}/holdings`);
            const holdings = await response.json();
            
            const container = document.getElementById('holdings-container');
            if (container) {
                this.renderHoldings(holdings, container);
            }
        } catch (error) {
            console.error('Failed to refresh holdings:', error);
        }
    }

    renderHoldings(holdings, container) {
        if (holdings.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No holdings found. Upload a portfolio to get started.</p>';
            return;
        }

        const totalValue = holdings.reduce((sum, h) => sum + (h.qty * h.avg), 0);
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Portfolio Summary</h3>
                    <span class="badge badge-success">₹${totalValue.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>
                </div>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Quantity</th>
                                <th>Avg Price</th>
                                <th>Investment</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${holdings.map(holding => `
                                <tr>
                                    <td><strong>${holding.symbol}</strong></td>
                                    <td>${holding.qty}</td>
                                    <td>₹${holding.avg.toFixed(2)}</td>
                                    <td>₹${(holding.qty * holding.avg).toLocaleString('en-IN')}</td>
                                    <td>
                                        <button class="btn btn-primary btn-fetch" data-symbol="${holding.symbol}">
                                            Fetch Data
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Re-attach event listeners for new buttons
        const newButtons = container.querySelectorAll('.btn-fetch');
        newButtons.forEach(button => {
            button.addEventListener('click', this.handleFetchStock.bind(this));
        });
    }

    showLoading(message) {
        this.showAlert(message, 'info');
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alert, container.firstChild);
            
            setTimeout(() => alert.remove(), 5000);
        }
    }

    startAutoRefresh() {
        // Refresh holdings every 30 seconds
        setInterval(() => {
            this.refreshHoldings();
        }, 30000);
    }

    async getHealthStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const data = await response.json();
            return data.status === 'ok';
        } catch {
            return false;
        }
    }

    async updateDashboardStats() {
        try {
            const [healthStatus, holdings] = await Promise.all([
                this.getHealthStatus(),
                fetch(`${this.baseUrl}/holdings`).then(r => r.json())
            ]);

            const statsContainer = document.getElementById('dashboard-stats');
            if (statsContainer) {
                const totalStocks = holdings.length;
                const totalValue = holdings.reduce((sum, h) => sum + (h.qty * h.avg), 0);
                
                statsContainer.innerHTML = `
                    <div class="card stat-card">
                        <span class="stat-value">${totalStocks}</span>
                        <span class="stat-label">Total Stocks</span>
                    </div>
                    <div class="card stat-card">
                        <span class="stat-value">₹${totalValue.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                        <span class="stat-label">Portfolio Value</span>
                    </div>
                    <div class="card stat-card">
                        <span class="stat-value ${healthStatus ? 'text-green-600' : 'text-red-600'}">${healthStatus ? 'Online' : 'Offline'}</span>
                        <span class="stat-label">API Status</span>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to update dashboard stats:', error);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.stockPredictor = new StockPredictor();
    
    // Update dashboard stats if on dashboard page
    if (document.getElementById('dashboard-stats')) {
        window.stockPredictor.updateDashboardStats();
        setInterval(() => window.stockPredictor.updateDashboardStats(), 60000);
    }
    
    // Load holdings if on portfolio page
    if (document.getElementById('holdings-container')) {
        window.stockPredictor.refreshHoldings();
    }
});

// Utility functions
function formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatNumber(number) {
    return new Intl.NumberFormat('en-IN').format(number);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        window.stockPredictor.showSuccess('Copied to clipboard!');
    });
}