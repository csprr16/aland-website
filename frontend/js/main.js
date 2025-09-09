// ===== GLOBAL VARIABLES =====
let currentUser = null;
let cart = [];
let products = [];
let displayedProducts = [];
let productsPerPage = 8;
let currentCategory = 'all';

// ===== AUTHENTICATION =====
function checkAuth() {
    if (window.API && API.isAuthenticated()) {
        currentUser = API.getCurrentUser();
        updateNavigation();
        return true;
    }
    
    return false;
}

function updateNavigation() {
    const userActions = document.getElementById('user-actions');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');
    const adminLink = document.getElementById('admin-link');
    
    if (currentUser) {
        userActions.style.display = 'none';
        userProfile.style.display = 'block';
        userName.textContent = currentUser.username;
        
        if (currentUser.role === 'admin') {
            adminLink.style.display = 'block';
        }
    } else {
        userActions.style.display = 'flex';
        userProfile.style.display = 'none';
    }
}

function logout() {
    if (window.API) {
        API.logout();
    } else {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        currentUser = null;
        cart = [];
        updateNavigation();
        updateCartCount();
        showNotification('Berhasil logout', 'info');
        window.location.href = 'index.html';
    }
}

// ===== CART FUNCTIONALITY =====
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartCount();
        updateCartSidebar();
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartCount();
    updateCartSidebar();
    showNotification('Produk berhasil ditambahkan ke keranjang', 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCount();
    updateCartSidebar();
    showNotification('Produk berhasil dihapus dari keranjang', 'info');
}

function updateQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        saveCart();
        updateCartCount();
        updateCartSidebar();
    }
}

function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
}

function updateCartSidebar() {
    const cartItems = document.getElementById('cart-items');
    const cartFooter = document.getElementById('cart-footer');
    const totalAmount = document.getElementById('total-amount');
    
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-cart"></i>
                <p>Keranjang Anda masih kosong</p>
                <button class="btn btn-primary" onclick="closeCart()">Mulai Belanja</button>
            </div>
        `;
        cartFooter.style.display = 'none';
        return;
    }
    
    let itemsHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        itemsHTML += `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}" onerror="this.src='/images/placeholder.jpg'">
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${formatRupiah(item.price)}</div>
                    <div class="cart-item-controls">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                        <span class="cart-item-quantity">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                        <button class="remove-item" onclick="removeFromCart(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    cartItems.innerHTML = itemsHTML;
    totalAmount.textContent = formatRupiah(total);
    cartFooter.style.display = 'block';
}

function openCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    
    cartSidebar.classList.remove('open');
    cartOverlay.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// ===== PRODUCTS =====
async function loadProducts() {
    try {
        const result = await API.getProducts();
        
        if (result.success && result.data && result.data.products) {
            products = result.data.products;
            // Initially show first page of products
            displayedProducts = products.slice(0, productsPerPage);
            displayProducts(displayedProducts);
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        const productsGrid = document.getElementById('products-grid');
        if (productsGrid) {
            productsGrid.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error memuat produk: ${error.message}</p>
                </div>
            `;
        }
    }
}

function displayProducts(productsToShow, append = false) {
    const productsGrid = document.getElementById('products-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    if (!productsGrid) return;
    
    if (productsToShow.length === 0 && !append) {
        productsGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-search"></i>
                <p>Tidak ada produk yang ditemukan.</p>
            </div>
        `;
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return;
    }
    
    const productsHTML = productsToShow.map(product => `
        <div class="product-card fade-in" data-category="${product.category}">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" onerror="handleImageError(this)" onload="handleImageLoad(this)" loading="lazy">
                ${product.featured ? '<div class="product-badge">Unggulan</div>' : ''}
            </div>
            <div class="product-content">
                <div class="product-category">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-footer">
                    <div class="product-price">${formatRupiah(product.price)}</div>
                    <button class="add-to-cart-btn" onclick="addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})">
                        <i class="fas fa-plus"></i>
                        Tambah
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    if (append) {
        productsGrid.innerHTML += productsHTML;
    } else {
        productsGrid.innerHTML = productsHTML;
    }
    
    // Update load more button visibility
    if (loadMoreBtn) {
        const filteredProducts = currentCategory === 'all' 
            ? products 
            : products.filter(product => product.category === currentCategory);
        
        if (displayedProducts.length >= filteredProducts.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'inline-flex';
        }
    }
}

function filterProducts(category) {
    currentCategory = category;
    const filteredProducts = category === 'all' 
        ? products 
        : products.filter(product => product.category === category);
    
    // Reset displayed products and show first page
    displayedProducts = filteredProducts.slice(0, productsPerPage);
    displayProducts(displayedProducts);
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
}

// ===== UTILITY FUNCTIONS =====
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageEl = notification.querySelector('.notification-message');
    const iconEl = notification.querySelector('.notification-icon');
    
    messageEl.textContent = message;
    notification.className = `notification ${type}`;
    
    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    
    iconEl.className = `notification-icon ${icons[type] || icons.info}`;
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function scrollToProducts() {
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

function scrollToAbout() {
    document.getElementById('about').scrollIntoView({ behavior: 'smooth' });
}

function loadMoreProducts() {
    const filteredProducts = currentCategory === 'all' 
        ? products 
        : products.filter(product => product.category === currentCategory);
    
    const currentLength = displayedProducts.length;
    const nextProducts = filteredProducts.slice(currentLength, currentLength + productsPerPage);
    
    if (nextProducts.length > 0) {
        displayedProducts = displayedProducts.concat(nextProducts);
        displayProducts(nextProducts, true); // append = true
    }
}

function handleImageError(img) {
    // Generate a unique fallback based on the product name or current timestamp
    const fallbackId = Math.floor(Math.random() * 1000) + 100;
    img.src = `https://picsum.photos/400/400?random=${fallbackId}`;
    img.classList.add('loaded');
}

function handleImageLoad(img) {
    img.classList.add('loaded');
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Load cart
    loadCart();
    
    // Load products if on main page
    if (document.getElementById('products-grid')) {
        loadProducts();
    }
    
    // Navigation toggle for mobile
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // Close nav menu when clicking on links (mobile)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    });
    
    // Cart functionality
    const cartIcon = document.getElementById('cart-icon');
    if (cartIcon) {
        cartIcon.addEventListener('click', openCart);
    }
    
    const cartClose = document.getElementById('cart-close');
    if (cartClose) {
        cartClose.addEventListener('click', closeCart);
    }
    
    const cartOverlay = document.getElementById('cart-overlay');
    if (cartOverlay) {
        cartOverlay.addEventListener('click', closeCart);
    }
    
    // User dropdown
    const userDropdownBtn = document.getElementById('user-dropdown-btn');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userDropdownBtn) {
        userDropdownBtn.addEventListener('click', () => {
            userDropdown.classList.toggle('show');
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (userDropdown && !userDropdownBtn?.contains(e.target)) {
            userDropdown.classList.remove('show');
        }
    });
    
    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // Product filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');
            filterProducts(category);
        });
    });
    
    // Load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreProducts);
    }
    
    // Contact form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showNotification('Terima kasih! Pesan Anda telah dikirim.', 'success');
            contactForm.reset();
        });
    }
    
    // Newsletter form
    const newsletterBtn = document.getElementById('newsletter-btn');
    if (newsletterBtn) {
        newsletterBtn.addEventListener('click', () => {
            const email = document.getElementById('newsletter-email').value;
            if (email) {
                showNotification('Terima kasih! Anda telah berlangganan newsletter.', 'success');
                document.getElementById('newsletter-email').value = '';
            }
        });
    }
    
    // Checkout functionality
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
    }
    
    // Smooth scroll for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

// ===== CHECKOUT =====
function handleCheckout() {
    if (!currentUser) {
        showNotification('Silakan login terlebih dahulu untuk checkout', 'error');
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
        return;
    }
    
    if (cart.length === 0) {
        showNotification('Keranjang Anda masih kosong', 'error');
        return;
    }
    
    // Simulate checkout process
    showNotification('Fitur checkout sedang dalam pengembangan', 'info');
}

// ===== API HELPERS =====
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (token) {
        defaultOptions.headers.Authorization = `Bearer ${token}`;
    }
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Request failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request error:', error);
        throw error;
    }
}

// ===== INTERSECTION OBSERVER FOR ANIMATIONS =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
}, observerOptions);

// Observe elements when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.product-card, .feature-card').forEach(el => {
        observer.observe(el);
    });
});

// ===== SEARCH FUNCTIONALITY =====
function searchProducts(query) {
    if (!query.trim()) {
        displayProducts(products);
        return;
    }
    
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
    );
    
    displayProducts(filteredProducts);
}

// ===== RESPONSIVE NAVIGATION =====
window.addEventListener('resize', () => {
    const navMenu = document.getElementById('nav-menu');
    if (window.innerWidth > 768) {
        navMenu.classList.remove('active');
    }
});

// ===== SCROLL TO TOP =====
window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset;
    const navbar = document.querySelector('.navbar');
    
    if (scrollTop > 100) {
        navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        navbar.style.boxShadow = 'none';
    }
});
