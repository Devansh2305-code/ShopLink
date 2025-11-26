// --- CONFIGURATION ---
// !!! IMPORTANT: This MUST match the port defined in your backend server.js !!!
const API_BASE_URL = 'https://shoplink-api.onrender.com/api'; 

// --- GLOBAL STATE (Managed via localStorage and API) ---
let currentToken = localStorage.getItem('token') || null;
let loggedInUser = JSON.parse(localStorage.getItem('user')) || null;
let loggedInUserType = localStorage.getItem('userType') || null;
let currentView = loggedInUserType || 'login';

// --- MOCK DATA (Replace with real API fetches upon successful deployment) ---
const MOCK_SHOPS = [
    { _id: 'S1', shopName: "Elite Apparel", category: "Clothing", ownerName: "Jane Doe" },
    { _id: 'S2', shopName: "The Spice Rack", category: "General Store", ownerName: "John Smith" },
    { _id: 'S3', shopName: "Gadget Hub", category: "Accessories", ownerName: "Alice Johnson" },
];
const MOCK_PRODUCTS = [
    { _id: 'P1', shopId: 'S1', name: "Vintage T-Shirt", price: 29.99, stockQuantity: 50, costPrice: 10.00 },
    { _id: 'P2', shopId: 'S1', name: "Denim Jeans", price: 59.99, stockQuantity: 20, costPrice: 25.00 },
    { _id: 'P3', shopId: 'S2', name: "Organic Rice (1kg)", price: 4.50, stockQuantity: 100, costPrice: 2.50 },
    { _id: 'P4', shopId: 'S3', name: "Wireless Mouse", price: 15.00, stockQuantity: 75, costPrice: 7.00 },
];
const MOCK_ORDERS = [
    { _id: 'O1', orderDate: '2025-10-01', status: 'Delivered', customerName: 'Sara Lee', contact: '9876543210', totalAmount: 34.49, items: [{ name: "Vintage T-Shirt", quantity: 1, sellingPrice: 29.99, costPrice: 10.00 }] },
    { _id: 'O2', orderDate: '2025-10-15', status: 'Pending', customerName: 'Ben King', contact: '9988776655', totalAmount: 60.00, items: [{ name: "Wireless Mouse", quantity: 4, sellingPrice: 15.00, costPrice: 7.00 }] },
];
const MOCK_ANALYTICS = {
    monthlySales: [
        { month: "Sep 2025", revenue: 1500, profit: 550 },
        { month: "Oct 2025", profit: 920 }, // Missing revenue to test rendering
    ]
};
// --- END MOCK DATA ---

// --- UTILITY FUNCTIONS ---

function showMessage(message, type = 'success') {
    const container = document.getElementById('modal-container');
    const color = type === 'error' ? 'bg-red-500' : (type === 'warning' ? 'bg-yellow-500' : 'bg-green-500');

    const modalHtml = `
        <div class="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end">
            <div class="max-w-sm w-full ${color} text-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden">
                <div class="p-4">
                    <p class="text-sm font-medium">${message}</p>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = modalHtml;
    setTimeout(() => {
        container.innerHTML = '';
    }, 3000);
}

/**
 * The real function to communicate with your Express.js server.
 */
async function secureFetch(endpoint, options = {}, retries = 3) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (currentToken) {
        // Attach the JWT to the Authorization header
        headers['Authorization'] = `Bearer ${currentToken}`;
    }

    // Exponential Backoff implementation
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            const data = response.status === 204 ? { message: 'Success' } : await response.json();
            
            if (response.ok) {
                return { ok: true, data: data, status: response.status };
            } else {
                // Handle server-side errors (400, 500)
                if (response.status === 401 || response.status === 403) {
                    showMessage(data.message || 'Session expired. Please log in.', 'error');
                    handleLogout();
                } else {
                    showMessage(data.message || `API Error: ${response.status}`, 'error');
                }
                return { ok: false, data: data, status: response.status };
            }
        } catch (error) {
            // Handle network errors
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000)); // Wait for 1s, 2s, 4s...
            } else {
                showMessage(`Network connection failed after ${retries} attempts.`, 'error');
                return { ok: false, data: { message: "Network error" }, status: 500 };
            }
        }
    }
}


// --- STATE MANAGEMENT AND RENDER ---

function updateAppState(view, token, user, userType) {
    currentToken = token;
    loggedInUser = user;
    loggedInUserType = userType;
    currentView = view;
    
    if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userType', userType);
    } else {
        localStorage.clear();
    }

    renderApp();
}

function handleLogout() {
    updateAppState('login', null, null, null);
    showMessage('Logged out successfully.');
}

function renderApp() {
    const container = document.getElementById('app-container');
    container.innerHTML = '';

    if (currentView === 'login') {
        container.innerHTML = renderAuthForm();
        attachAuthListeners();
    } else if (currentView === 'customer') {
        container.innerHTML = renderCustomerDashboard();
        attachCustomerListeners();
    } else if (currentView === 'owner') {
        container.innerHTML = renderOwnerDashboard();
        attachOwnerListeners();
        document.querySelector('[data-section="products"]').click(); // Load products by default
    }
}

// --- AUTH FORMS ---

function renderAuthForm() {
    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Customer Section -->
            <div class="card bg-white p-6 md:p-10 rounded-xl">
                <h2 class="text-2xl font-bold mb-6 text-primary">Customer Portal</h2>
                <form id="customer-login-form" data-user-type="customer" class="space-y-4">
                    <input type="text" name="phone" placeholder="Phone Number" class="input-field" required>
                    <input type="password" name="password" placeholder="Password" class="input-field" required>
                    <div class="flex flex-col space-y-2">
                        <button type="submit" data-action="login" class="btn-primary">Customer Login</button>
                        <button type="button" data-action="register" class="btn-primary !bg-gray-400" onclick="showRegistrationModal('customer')">Customer Register</button>
                    </div>
                </form>
            </div>

            <!-- Owner Section -->
            <div class="card bg-white p-6 md:p-10 rounded-xl">
                <h2 class="text-2xl font-bold mb-6 text-secondary">Shop Owner Portal</h2>
                <form id="owner-login-form" data-user-type="owner" class="space-y-4">
                    <input type="text" name="registrationId" placeholder="Registration ID" class="input-field" required>
                    <input type="password" name="password" placeholder="Password" class="input-field" required>
                    <div class="flex flex-col space-y-2">
                        <button type="submit" data-action="login" class="btn-primary !bg-secondary">Owner Login</button>
                        <button type="button" data-action="register" class="btn-primary !bg-gray-400" onclick="showRegistrationModal('owner')">Owner Register</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderRegistrationModal(userType) {
    const isCustomer = userType === 'customer';
    const title = isCustomer ? 'New Customer Registration' : 'New Shop Owner Registration';
    const formFields = isCustomer ? `
        <input type="text" name="name" placeholder="Full Name" class="input-field" required>
        <input type="number" name="age" placeholder="Age" class="input-field" min="16" required>
        <select name="gender" class="input-field" required>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
        </select>
        <input type="text" name="address" placeholder="Full Address" class="input-field" required>
        <input type="tel" name="phone" placeholder="Contact Number (10 digits)" pattern="\\d{10}" class="input-field" required>
    ` : `
        <input type="text" name="shopName" placeholder="Shop Name" class="input-field" required>
        <input type="text" name="ownerName" placeholder="Owner Name" class="input-field" required>
        <input type="text" name="registrationId" placeholder="Registration ID" class="input-field" required>
        <input type="text" name="category" placeholder="Shop Category (e.g., Clothing)" class="input-field" required>
        <input type="tel" name="phone" placeholder="Contact Number (10 digits)" pattern="\\d{10}" class="input-field" required>
    `;

    return `
        <div id="registration-modal" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800">${title}</h3>
                    <button onclick="closeRegistrationModal()" class="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <form id="${userType}-register-form" data-user-type="${userType}" class="space-y-4">
                    ${formFields}
                    <input type="password" name="password" placeholder="Set Password" class="input-field" required>
                    <button type="submit" class="btn-primary w-full">${title}</button>
                </form>
            </div>
        </div>
    `;
}

function showRegistrationModal(userType) {
    document.getElementById('modal-container').innerHTML = renderRegistrationModal(userType);
    document.getElementById(`${userType}-register-form`).addEventListener('submit', handleRegistration);
}

function closeRegistrationModal() {
    document.getElementById('modal-container').innerHTML = '';
}

// --- AUTH LOGIC ---

function attachAuthListeners() {
    document.getElementById('customer-login-form').addEventListener('submit', handleAuthLogin);
    document.getElementById('owner-login-form').addEventListener('submit', handleAuthLogin);
}

async function handleAuthLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const userType = form.dataset.userType;
    const formData = new FormData(form);
    let payload = Object.fromEntries(formData.entries());
    let loginEndpoint = `/auth/${userType}/login`;

    const response = await secureFetch(loginEndpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        const { token, user } = response.data;
        updateAppState(userType, token, user, userType);
        showMessage(`${userType.toUpperCase()} login successful!`);
    } else {
        showMessage('Login failed. Check credentials.', 'error');
    }
}

async function handleRegistration(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const userType = form.dataset.userType;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const registerEndpoint = `/auth/${userType}/register`;

    const response = await secureFetch(registerEndpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        showMessage(response.data.message || "Registration successful! Please log in.");
        closeRegistrationModal();
    } else {
        // Error message handled in secureFetch
    }
}


// --- CUSTOMER DASHBOARD ---

let customerShops = [];
let shopProducts = [];

// Initialize cart from localStorage to persist it across page reloads
let cart = JSON.parse(localStorage.getItem('cart')) || [];


async function fetchCustomerData() {
    const shopResponse = await secureFetch('/customer/shops');
    if (shopResponse.ok) {
        customerShops = shopResponse.data.shops;
        renderShopList();
    }
}

function renderShopList() {
     const listContainer = document.getElementById('shop-list');
     if (!listContainer) return;
     listContainer.innerHTML = customerShops.map(shop => `
        <div class="card bg-white p-6 rounded-lg border border-gray-200">
            <h3 class="text-xl font-semibold text-primary">${shop.shopName}</h3>
            <p class="text-gray-600 mt-1 mb-3">Category: ${shop.category}</p>
            <button data-shop-id="${shop._id}" class="browse-shop btn-primary py-2 px-4 text-sm w-full">View Products</button>
        </div>
    `).join('');
    attachCustomerShopBrowsingListeners();
}

async function viewShopProducts(shopId) {
    const productResponse = await secureFetch(`/customer/shops/${shopId}/products`);
    if (productResponse.ok) {
        shopProducts = productResponse.data.products;
        
        const shop = customerShops.find(s => s._id === shopId);
        document.getElementById('current-shop-name').textContent = shop ? shop.shopName : 'Shop';
        
        const productListHtml = shopProducts.map(p => `
            <div class="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <p class="font-semibold">${p.name}</p>
                <p class="text-lg font-bold text-secondary mt-1">$${p.price.toFixed(2)}</p>
                <p class="text-xs text-gray-500">Stock: ${p.stockQuantity}</p>
                <button data-product-id="${p._id}" class="add-to-cart btn-primary mt-2 py-1 px-3 text-xs w-full">Add to Cart</button>
            </div>
        `).join('');

        document.getElementById('shop-product-list').innerHTML = productListHtml;
        document.getElementById('product-view').classList.remove('hidden');
        
        attachCustomerCartListeners();
        showMessage(`Fetched ${shopProducts.length} products.`);

    } else {
        shopProducts = [];
    }
}

function renderCustomerDashboard() {
    // Using MOCK_SHOPS for initial load until fetchCustomerData completes
    const initialShops = MOCK_SHOPS.map(s => `<option value="${s.category}">${s.category}</option>`).join('');
    const initialProductList = MOCK_PRODUCTS.filter(p => p.shopId === MOCK_SHOPS[0]._id).map(p => `
        <div class="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
            <p class="font-semibold">${p.name}</p>
            <p class="text-lg font-bold text-secondary mt-1">$${p.price.toFixed(2)}</p>
            <p class="text-xs text-gray-500">Stock: ${p.stockQuantity}</p>
            <button data-product-id="${p._id}" class="add-to-cart btn-primary mt-2 py-1 px-3 text-xs w-full">Add to Cart</button>
        </div>
    `).join('');


    return `
        <div class="flex justify-between items-center mb-6 border-b pb-4">
            <h2 class="text-3xl font-bold text-gray-800">Welcome, ${loggedInUser?.name || 'Customer'}!</h2>
            <div>
                <button id="view-cart-btn" class="btn-primary mr-4 relative">Cart <span id="cart-count" class="absolute -top-2 -right-2 bg-secondary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">0</span></button>
                <button id="logout-btn" class="text-red-500 hover:text-red-700 font-medium">Logout</button>
            </div>
        </div>

        <div class="mb-8 p-4 bg-white rounded-xl shadow-lg">
            <label for="category-select" class="block text-sm font-medium text-gray-700 mb-2">Search Shops & Products:</label>
            <div class="flex space-x-2">
                <input type="text" id="product-search" placeholder="Search product name..." class="input-field flex-grow">
                <select id="category-select" class="input-field max-w-xs">
                    <option value="">All Categories</option>
                    ${initialShops}
                </select>
                <button id="search-btn" class="btn-primary">Search</button>
            </div>
        </div>

        <h3 class="text-2xl font-bold mb-4">Shops Near You</h3>
        <div id="shop-list" class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${renderShopList()} 
        </div>
        
        <div id="product-view" class="mt-10 hidden">
            <h3 class="text-2xl font-bold mb-4">Products from <span id="current-shop-name" class="text-primary">Shop Name</span></h3>
            <div id="shop-product-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                ${initialProductList}
            </div>
        </div>

        <h3 class="text-2xl font-bold mb-4 mt-10 border-t pt-6">Order History</h3>
        <div id="order-history">
            <p class="text-gray-500">Loading order history... GET /api/customer/orders</p>
        </div>
    `;
}

function attachCustomerListeners() {
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('search-btn').addEventListener('click', handleProductSearch);
    document.getElementById('view-cart-btn').addEventListener('click', showCartModal);
    fetchCustomerData();
    fetchOrderHistory(); // Fetch initial data
    updateCartCount(); // Update cart count on dashboard load
}

function attachCustomerShopBrowsingListeners() {
    document.querySelectorAll('.browse-shop').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const shopId = e.currentTarget.dataset.shopId;
            viewShopProducts(shopId);
        });
    });
}

function attachCustomerCartListeners() {
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget;
            const productId = button.dataset.productId;
            const product = shopProducts.find(p => p._id === productId);
            
            if (product) {
                addToCart(product);
                
                // Visual feedback
                const originalText = button.innerHTML;
                button.innerHTML = 'Added!';
                button.disabled = true;
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 1500);
            }
        });
    });
}

// --- CART MANAGEMENT ---

function addToCart(product) {
    const existingItem = cart.find(item => item._id === product._id);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    saveCart();
    showMessage(`${product.name} added to cart!`);
}

function updateCartItemQuantity(productId, change) {
    const item = cart.find(item => item._id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            // Remove item if quantity is 0 or less
            cart = cart.filter(i => i._id !== productId);
        }
    }
    saveCart();
    showCartModal(); // Re-render the cart modal to show changes
}

function removeFromCart(productId) {
    cart = cart.filter(item => item._id !== productId);
    saveCart();
    showCartModal(); // Re-render the cart modal
}

function clearCart() {
    cart = [];
    localStorage.removeItem('cart');
    updateCartCount();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    // Find the cart count element within the main app container to ensure it's always accessible
    const cartCountEl = document.querySelector('#app-container #cart-count');
    if (cartCountEl) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountEl.textContent = totalItems;
    } 
}

function showCartModal() {
    const modalContainer = document.getElementById('modal-container');
    let cartTotal = 0;
    
    const cartItemsHtml = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        cartTotal += itemTotal;
        return `
            <div class="flex justify-between items-center py-3 border-b">
                <div>
                    <p class="font-semibold">${item.name}</p>
                    <p class="text-sm text-gray-600">$${item.price.toFixed(2)} x ${item.quantity} = <strong>$${itemTotal.toFixed(2)}</strong></p>
                </div>
                <div class="flex items-center space-x-3">
                    <button onclick="updateCartItemQuantity('${item._id}', -1)" class="bg-gray-200 rounded-full h-6 w-6 flex items-center justify-center">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateCartItemQuantity('${item._id}', 1)" class="bg-gray-200 rounded-full h-6 w-6 flex items-center justify-center">+</button>
                    <button onclick="removeFromCart('${item._id}')" class="text-red-500 hover:text-red-700 text-sm">Remove</button>
                </div>
            </div>
        `;
    }).join('');

    const modalHtml = `
        <div id="cart-modal" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800">Your Shopping Cart</h3>
                    <button onclick="this.closest('#cart-modal').remove()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div id="cart-items" class="max-h-96 overflow-y-auto">
                    ${cart.length > 0 ? cartItemsHtml : '<p class="text-gray-500">Your cart is empty.</p>'}
                </div>
                ${cart.length > 0 ? `
                    <div class="mt-6 pt-4 border-t">
                        <div class="flex justify-between items-center text-xl font-bold">
                            <span>Total:</span>
                            <span>$${cartTotal.toFixed(2)}</span>
                        </div>
                        <button id="modal-checkout-btn" class="btn-primary !bg-secondary w-full mt-4">Proceed to Checkout</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    modalContainer.innerHTML = modalHtml;

    if (cart.length > 0) {
        document.getElementById('modal-checkout-btn').addEventListener('click', () => {
            // Close the modal before proceeding to checkout
            document.getElementById('cart-modal').remove();
            handleCheckout();
        });
    }
}

async function handleProductSearch() {
    const query = document.getElementById('product-search').value;
    const category = document.getElementById('category-select').value;
    
    showMessage(`Searching for products: q=${query}, category=${category}...`, 'warning');

    const searchParams = new URLSearchParams();
    if (query) searchParams.append('q', query);
    if (category) searchParams.append('category', category);

    const response = await secureFetch(`/customer/products/search?${searchParams.toString()}`);
    
    if (response.ok) {
        // This should ideally render results in a dedicated search results section
        showMessage(`Found ${response.data.count} results! Displaying in console for now.`, 'success');
        console.log("Search Results:", response.data.products);
    }
}

async function fetchOrderHistory() {
    const historyContainer = document.getElementById('order-history');
    const response = await secureFetch('/customer/orders');

    if (response.ok && response.data.orders) {
        const orders = response.data.orders;
        if (orders.length === 0) {
            historyContainer.innerHTML = '<p class="text-gray-500">You have no past orders.</p>';
            return;
        }
        
        historyContainer.innerHTML = orders.map(order => {
            const date = new Date(order.orderDate).toLocaleDateString();
            return `
                <div class="p-4 border rounded-lg bg-white shadow-sm mb-3">
                    <p class="font-semibold">Order ID: ${order._id}</p>
                    <p class="text-sm text-gray-600">Date: ${date} | Status: <span class="text-green-600">${order.status}</span></p>
                    <p class="font-bold mt-1">Total: $${order.totalAmount.toFixed(2)}</p>
                </div>
            `;
        }).join('');
    } else {
         historyContainer.innerHTML = '<p class="text-red-500">Failed to load order history.</p>';
    }
}

async function handleCheckout() {
    if (cart.length === 0) {
        showMessage('Your cart is empty. Add some products before checking out.', 'warning');
        return;
    }
    // Prepare cart data for the backend
    const checkoutItems = cart.map(item => ({ productId: item._id, quantity: item.quantity }));
    showMessage('[SIMULATION] Initiating checkout process...', 'warning');
    
    const response = await secureFetch('/customer/checkout', { method: 'POST', body: JSON.stringify({ items: checkoutItems }) });

    if (response.ok) {
        showMessage(`Checkout successful! Order ID: ${response.data.orderId}`, 'success');
        fetchOrderHistory(); // Refresh history
        clearCart(); // Clear the cart after successful checkout
    }
}

// --- OWNER DASHBOARD ---

let ownerProducts = MOCK_PRODUCTS.filter(p => p.shopId === 'S1'); // Initial mock data
let ownerOrders = MOCK_ORDERS; // Initial mock data
let currentOwnerSection = 'products';

async function fetchOwnerProducts() {
    const response = await secureFetch('/owner/products');
    if (response.ok) {
        ownerProducts = response.data.products || [];
        if (currentOwnerSection === 'products') renderOwnerContent();
    }
}

async function fetchOwnerOrders() {
    const response = await secureFetch('/owner/orders');
    if (response.ok) {
        // In a real app, this would be populated with customer names/contacts
        ownerOrders = response.data.orders || []; 
        if (currentOwnerSection === 'orders') renderOwnerContent();
    }
}

function renderOwnerDashboard() {
    const ownerShop = loggedInUser || { shopName: 'Your Shop' }; 
    return `
        <div class="flex justify-between items-center mb-6 border-b pb-4">
            <h2 class="text-3xl font-bold text-gray-800">Shop Owner Dashboard (${ownerShop.shopName})</h2>
            <button id="logout-btn" class="text-red-500 hover:text-red-700 font-medium">Logout</button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Left Sidebar (Navigation) -->
            <div class="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg h-min sticky top-4">
                <nav class="space-y-3">
                    <button data-section="products" class="owner-nav-btn text-left w-full p-3 rounded-lg bg-indigo-100 text-primary font-semibold">Product Management</button>
                </nav>
            </div>

            <!-- Main Content Area -->
            <div class="lg:col-span-2" id="owner-content">
                <!-- Content rendered dynamically by renderOwnerContent -->
            </div>
        </div>
    `;
}

function renderOwnerContent() {
    const contentArea = document.getElementById('owner-content');
    if (!contentArea) return;

    if (currentOwnerSection === 'products') {
        contentArea.innerHTML = renderOwnerProducts();
        attachProductCrudListeners();
    } 
    // NOTE: The 'orders' and 'analytics' sections have been removed for now to fix a critical bug.
    // They can be re-implemented later.
}

function renderOwnerProducts() {
    return `
        <section id="products-section" class="bg-white p-6 rounded-xl shadow-lg">
            <h3 class="text-2xl font-bold mb-4">Your Products</h3>
            <button id="add-product-btn" class="btn-primary !bg-secondary mb-4">Add New Product</button>

            <div class="space-y-4">
                ${ownerProducts.map(p => `
                    <div class="flex justify-between items-center p-4 border rounded-lg bg-gray-50">
                        <div>
                            <p class="font-semibold">${p.name} - $${p.price.toFixed(2)}</p>
                            <p class="text-sm text-gray-500">Stock: ${p.stockQuantity} | Cost: $${p.costPrice.toFixed(2)}</p>
                            <p class="text-xs text-gray-400">ID: ${p._id}</p>
                        </div>
                        <div class="flex space-x-2">
                            <button data-id="${p._id}" data-action="update" class="product-action-btn text-indigo-600 hover:text-indigo-800 text-sm">Edit</button>
                            <button data-id="${p._id}" data-action="delete" class="product-action-btn text-red-600 hover:text-red-800 text-sm">Delete</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${ownerProducts.length === 0 ? '<p class="text-gray-500 mt-4">No products added yet.</p>' : ''}
        </section>
    `;
}

// --- OWNER EVENT LISTENERS ---

function attachOwnerListeners() {
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Navigation
    document.querySelectorAll('.owner-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.owner-nav-btn').forEach(b => b.classList.remove('bg-indigo-100', 'text-primary', 'font-semibold'));
            e.currentTarget.classList.add('bg-indigo-100', 'text-primary', 'font-semibold');

            currentOwnerSection = e.currentTarget.dataset.section;
            
            if (currentOwnerSection === 'products') fetchOwnerProducts();
            renderOwnerContent();
        });
    });
}

function showProductFormModal(product = null) {
    const isUpdate = product !== null;
    const title = isUpdate ? 'Update Product' : 'Add New Product';
    const buttonText = isUpdate ? 'Save Changes' : 'Add Product';
    const productId = isUpdate ? product._id : '';

    const modalHtml = `
        <div id="product-form-modal" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-gray-800">${title}</h3>
                    <button onclick="this.closest('#product-form-modal').remove()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <form id="product-form" data-product-id="${productId}" class="space-y-4">
                    <input type="text" name="name" placeholder="Product Name" class="input-field" value="${isUpdate ? product.name : ''}" required>
                    <input type="number" name="price" placeholder="Selling Price" class="input-field" step="0.01" min="0" value="${isUpdate ? product.price : ''}" required>
                    <input type="number" name="costPrice" placeholder="Cost Price" class="input-field" step="0.01" min="0" value="${isUpdate ? product.costPrice : ''}" required>
                    <input type="number" name="stockQuantity" placeholder="Stock Quantity" class="input-field" min="0" value="${isUpdate ? product.stockQuantity : ''}" required>
                    <button type="submit" class="btn-primary w-full">${buttonText}</button>
                </form>
            </div>
        </div>
    `;
    document.getElementById('modal-container').innerHTML = modalHtml;
    document.getElementById('product-form').addEventListener('submit', handleProductFormSubmit);
}

async function handleProductFormSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const productId = form.dataset.productId;
    const isUpdate = !!productId;

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    // Convert numeric fields from string to number
    payload.price = parseFloat(payload.price);
    payload.costPrice = parseFloat(payload.costPrice);
    payload.stockQuantity = parseInt(payload.stockQuantity, 10);

    // Add ownerId to the payload for new products, which is required by the backend
    if (!isUpdate && loggedInUser) {
        payload.owner = loggedInUser._id;
    }

    const endpoint = isUpdate ? `/owner/products/${productId}` : '/owner/products';
    const method = isUpdate ? 'PUT' : 'POST';

    const response = await secureFetch(endpoint, {
        method: method,
        body: JSON.stringify(payload)
    });

    if (response.ok) {
        form.closest('#product-form-modal').remove(); // Close modal on success
        fetchOwnerProducts(); // Refresh the product list
        showMessage(`Product ${isUpdate ? 'updated' : 'added'} successfully!`);
    }
}

function attachProductCrudListeners() {
    // Add Product
    document.getElementById('add-product-btn').addEventListener('click', () => {
        showProductFormModal(); // Replaces the old prompt()
    });

    // Update/Delete Product
    document.querySelectorAll('.product-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.currentTarget.dataset.id;
            const action = e.currentTarget.dataset.action;

            if (action === 'update') {
                // Find the full product object from our state to pre-fill the form
                const productToUpdate = ownerProducts.find(p => p._id === productId);
                if (productToUpdate) {
                    showProductFormModal(productToUpdate);
                }
            } else if (action === 'delete') {
                if (confirm(`Are you sure you want to delete product ${productId}?`)) {
                    secureFetch(`/owner/products/${productId}`, {
                        method: 'DELETE'
                    }).then(() => fetchOwnerProducts());
                }
            }
        });
    });
}


// --- INITIALIZATION ---
window.onload = renderApp;