/* ==========================================================================
   ShortCut - Frontend Application Core JavaScript
   ========================================================================== */

const API_BASE = '/api'; // Since frontend is served by Express on the same port

// State Management
const state = {
  user: null,
  token: null,
  links: [],
  currentLink: null,
  chartInstance: null,
  pendingQuickUrl: '' // Holds URL if shortened from landing before logging in
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  initAuthState();
  initRouter();
  initEventHandlers();
  
  // Verify token on load if exists
  if (state.token) {
    try {
      const response = await fetchWithAuth('/auth/me');
      if (response.success) {
        state.user = response.user;
        updateNavUI();
      } else {
        logout();
      }
    } catch (err) {
      console.error('Auth verification failed:', err);
      logout();
    }
  }
});

// --- Auth State Helpers ---
function initAuthState() {
  state.token = localStorage.getItem('shortcut_token');
  try {
    state.user = JSON.parse(localStorage.getItem('shortcut_user'));
  } catch (e) {
    state.user = null;
  }
  updateNavUI();
}

function saveAuthState(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('shortcut_token', token);
  localStorage.setItem('shortcut_user', JSON.stringify(user));
  updateNavUI();
}

function logout() {
  state.token = null;
  state.user = null;
  state.links = [];
  localStorage.removeItem('shortcut_token');
  localStorage.removeItem('shortcut_user');
  updateNavUI();
  showToast('Logged out successfully.', 'info');
  navigateTo('/');
}

function updateNavUI() {
  const authButtons = document.getElementById('nav-auth-buttons');
  const userProfile = document.getElementById('nav-user-profile');
  const dashboardLink = document.getElementById('link-dashboard');
  const greeting = document.getElementById('user-greeting');

  if (state.token && state.user) {
    authButtons.classList.add('hidden');
    userProfile.classList.remove('hidden');
    dashboardLink.classList.remove('hidden');
    greeting.textContent = `Hi, ${state.user.name.split(' ')[0]}`;
  } else {
    authButtons.classList.remove('hidden');
    userProfile.classList.add('hidden');
    dashboardLink.classList.add('hidden');
  }
}

// --- API Request Helpers ---
async function fetchWithAuth(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(state.token && { 'Authorization': `Bearer ${state.token}` }),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`API Fetch Error [${endpoint}]:`, err);
    return { success: false, message: 'Network error. Please try again.' };
  }
}

// --- Routing System ---
function initRouter() {
  // Catch link clicks for client-side navigation
  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('a');
    if (!target) return;
    
    const href = target.getAttribute('href');
    if (href && href.startsWith('/') && !href.startsWith('/api') && target.target !== '_blank') {
      e.preventDefault();
      navigateTo(href);
    }
  });

  // Handle browser navigation (back/forward)
  window.onpopstate = () => {
    handleRouting(window.location.pathname);
  };

  // Initial route
  handleRouting(window.location.pathname);
}

function navigateTo(path) {
  history.pushState(null, null, path);
  handleRouting(path);
}

function handleRouting(path) {
  // Hide all views
  document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));

  // Route matches
  if (path === '/' || path === '/index.html') {
    document.getElementById('view-landing').classList.add('active');
    document.getElementById('link-home').classList.add('active');
  } 
  else if (path === '/login' || path === '/register' || path === '/auth') {
    if (state.token) {
      navigateTo('/dashboard');
      return;
    }
    document.getElementById('view-auth').classList.add('active');
    
    // Set appropriate tab
    if (path === '/register') {
      switchAuthTab('signup');
    } else {
      switchAuthTab('login');
    }
  } 
  else if (path === '/dashboard') {
    if (!state.token) {
      showToast('Please sign in to access your dashboard.', 'warning');
      navigateTo('/login');
      return;
    }
    document.getElementById('view-dashboard').classList.add('active');
    document.getElementById('link-dashboard').classList.add('active');
    loadDashboardData();
  } 
  else if (path.startsWith('/analytics/')) {
    if (!state.token) {
      navigateTo('/login');
      return;
    }
    const parts = path.split('/');
    const linkId = parts[parts.length - 1];
    document.getElementById('view-analytics').classList.add('active');
    loadAnalyticsData(linkId);
  } 
  else {
    // If not matching any frontend route, let the browser fall through (handled by server static or 404)
    document.getElementById('view-landing').classList.add('active');
    document.getElementById('link-home').classList.add('active');
  }

  // Close mobile menu on navigate
  document.getElementById('nav-menu').classList.remove('mobile-active');
}

// Switch between Login and Signup tabs
function switchAuthTab(tab) {
  const loginTab = document.getElementById('tab-login');
  const signupTab = document.getElementById('tab-signup');
  const loginForm = document.getElementById('form-login');
  const signupForm = document.getElementById('form-signup');

  if (tab === 'login') {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    history.replaceState(null, null, '/login');
  } else {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    history.replaceState(null, null, '/register');
  }
}

// --- Event Handlers Setup ---
function initEventHandlers() {
  // Mobile Nav Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');
  mobileToggle.addEventListener('click', () => {
    navMenu.classList.toggle('mobile-active');
  });

  // Nav Login/Signup Buttons
  document.getElementById('btn-nav-login').addEventListener('click', () => navigateTo('/login'));
  document.getElementById('btn-nav-signup').addEventListener('click', () => navigateTo('/register'));
  document.getElementById('btn-nav-logout').addEventListener('click', () => logout());

  // Auth Tabs switches
  document.getElementById('tab-login').addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('tab-signup').addEventListener('click', () => switchAuthTab('signup'));

  // Forms Submissions
  document.getElementById('form-login').addEventListener('submit', handleLogin);
  document.getElementById('form-signup').addEventListener('submit', handleSignup);
  document.getElementById('form-quick-shorten').addEventListener('submit', handleQuickShorten);
  document.getElementById('form-shorten').addEventListener('submit', handleShorten);

  // Dashboard Toggle Panel
  const btnNewLink = document.getElementById('btn-new-link');
  const btnCloseShortener = document.getElementById('btn-close-shortener');
  const btnCancelShorten = document.getElementById('btn-cancel-shorten');
  const shortenerPanel = document.getElementById('shortener-panel');

  const toggleShortener = (show) => {
    if (show) {
      shortenerPanel.classList.remove('hidden');
      document.getElementById('shorten-url').focus();
    } else {
      shortenerPanel.classList.add('hidden');
      document.getElementById('form-shorten').reset();
    }
  };

  btnNewLink.addEventListener('click', () => toggleShortener(true));
  btnCloseShortener.addEventListener('click', () => toggleShortener(false));
  btnCancelShorten.addEventListener('click', () => toggleShortener(false));
  document.getElementById('btn-empty-shorten').addEventListener('click', () => toggleShortener(true));

  // Search input filter
  document.getElementById('input-search-links').addEventListener('input', (e) => {
    filterLinks(e.target.value);
  });

  // Back to Dashboard
  document.getElementById('btn-back-dashboard').addEventListener('click', () => navigateTo('/dashboard'));

  // Download QR Code
  document.getElementById('btn-download-qrcode').addEventListener('click', downloadQrCodeImage);
}

// --- Toast Notifications ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? 'circle-check' : type === 'error' ? 'circle-xmark' : 'circle-info';
  
  toast.innerHTML = `
    <i class="fa-solid fa-${icon} toast-icon"></i>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}

// --- Auth Submission Logic ---
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  const submitBtn = document.getElementById('btn-login-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

  const data = await fetchWithAuth('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  submitBtn.disabled = false;
  submitBtn.innerHTML = '<span>Log In</span> <i class="fa-solid fa-right-to-bracket"></i>';

  if (data.success) {
    saveAuthState(data.token, data.user);
    showToast('Logged in successfully.', 'success');
    
    // Check if there was a URL from the landing quick shorten
    if (state.pendingQuickUrl) {
      navigateTo('/dashboard');
      // Pre-fill the url shortening panel and open it
      document.getElementById('shortener-panel').classList.remove('hidden');
      document.getElementById('shorten-url').value = state.pendingQuickUrl;
      state.pendingQuickUrl = '';
    } else {
      navigateTo('/dashboard');
    }
  } else {
    showToast(data.message || 'Login failed.', 'error');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;

  const submitBtn = document.getElementById('btn-signup-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

  const data = await fetchWithAuth('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });

  submitBtn.disabled = false;
  submitBtn.innerHTML = '<span>Create Free Account</span> <i class="fa-solid fa-user-plus"></i>';

  if (data.success) {
    saveAuthState(data.token, data.user);
    showToast('Account created successfully!', 'success');
    
    if (state.pendingQuickUrl) {
      navigateTo('/dashboard');
      document.getElementById('shortener-panel').classList.remove('hidden');
      document.getElementById('shorten-url').value = state.pendingQuickUrl;
      state.pendingQuickUrl = '';
    } else {
      navigateTo('/dashboard');
    }
  } else {
    showToast(data.message || 'Registration failed.', 'error');
  }
}

// --- Quick Shorten (Guest view) ---
function handleQuickShorten(e) {
  e.preventDefault();
  const url = document.getElementById('input-quick-url').value;
  
  if (state.token) {
    // If already logged in, navigate to dashboard and fill
    navigateTo('/dashboard');
    document.getElementById('shortener-panel').classList.remove('hidden');
    document.getElementById('shorten-url').value = url;
  } else {
    // Hold it, prompt registration
    state.pendingQuickUrl = url;
    showToast('Please create a free account or log in to shorten and track links.', 'info');
    navigateTo('/register');
  }
}

// --- Dashboard Functions ---
async function loadDashboardData() {
  const emptyState = document.getElementById('empty-state');
  const linksList = document.getElementById('links-list');
  
  linksList.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fa-solid fa-circle-notch fa-spin fa-2x text-accent"></i><p style="margin-top: 10px; color: var(--text-secondary);">Loading your links...</p></div>';

  const response = await fetchWithAuth('/urls');

  if (response.success) {
    state.links = response.data;
    renderStats();
    renderLinksList(state.links);
  } else {
    showToast('Failed to load dashboard data.', 'error');
  }
}

function renderStats() {
  const totalLinks = state.links.length;
  
  const totalClicks = state.links.reduce((acc, curr) => acc + (curr.clickCount || 0), 0);
  
  const now = new Date();
  const activeLinks = state.links.filter(link => {
    if (!link.isActive) return false;
    if (link.expiresAt && new Date(link.expiresAt) < now) return false;
    return true;
  }).length;

  document.getElementById('stat-total-links').textContent = totalLinks;
  document.getElementById('stat-total-clicks').textContent = totalClicks;
  document.getElementById('stat-active-links').textContent = activeLinks;
}

function renderLinksList(links) {
  const emptyState = document.getElementById('empty-state');
  const linksList = document.getElementById('links-list');

  if (links.length === 0) {
    emptyState.classList.remove('hidden');
    linksList.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');
  linksList.innerHTML = '';

  links.forEach(link => {
    const item = document.createElement('div');
    item.className = 'link-item';
    
    // Format expiration
    let expiryLabel = 'Never';
    let expiryClass = 'active';
    if (link.expiresAt) {
      const expDate = new Date(link.expiresAt);
      const now = new Date();
      if (expDate < now) {
        expiryLabel = 'Expired';
        expiryClass = 'expired';
      } else {
        const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
        expiryLabel = `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
        expiryClass = diffDays <= 2 ? 'expiring' : 'active';
      }
    }

    const formattedDate = new Date(link.createdAt).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    item.innerHTML = `
      <div class="link-item-left">
        <div class="link-item-short-row">
          <a href="${link.shortUrl}" target="_blank" class="link-item-short">${link.shortUrl.replace(/^https?:\/\//, '')}</a>
          <button class="link-item-copy" data-url="${link.shortUrl}" title="Copy short link"><i class="fa-regular fa-copy"></i></button>
        </div>
        <div class="link-item-original" title="${link.originalUrl}">${link.originalUrl}</div>
        <div class="link-item-meta">
          <span class="meta-date"><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
          <span class="badge-expiry ${expiryClass}"><i class="fa-regular fa-clock"></i> ${expiryLabel}</span>
        </div>
      </div>
      <div class="link-item-right">
        <div class="badge-clicks" title="Total clicks">
          <i class="fa-solid fa-chart-simple"></i> ${link.clickCount}
        </div>
        <button class="btn btn-secondary btn-sm btn-analytics" data-id="${link._id}"><i class="fa-solid fa-magnifying-glass-chart"></i> Track</button>
        <button class="btn btn-icon-only btn-delete" data-id="${link._id}" title="Delete link"><i class="fa-regular fa-trash-can"></i></button>
      </div>
    `;

    // Copy action
    item.querySelector('.link-item-copy').addEventListener('click', (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      navigator.clipboard.writeText(btn.dataset.url).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--color-success);"></i>';
        showToast('Link copied to clipboard!', 'success');
        setTimeout(() => {
          btn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 2000);
      });
    });

    // View Analytics action
    item.querySelector('.btn-analytics').addEventListener('click', () => {
      navigateTo(`/analytics/${link._id}`);
    });

    // Delete action
    item.querySelector('.btn-delete').addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('Are you sure you want to delete this short URL? This action cannot be undone.')) {
        const res = await fetchWithAuth(`/urls/${id}`, { method: 'DELETE' });
        if (res.success) {
          showToast('URL deleted successfully.', 'success');
          loadDashboardData();
        } else {
          showToast(res.message || 'Failed to delete URL.', 'error');
        }
      }
    });

    linksList.appendChild(item);
  });
}

function filterLinks(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    renderLinksList(state.links);
    return;
  }

  const filtered = state.links.filter(link => 
    link.originalUrl.toLowerCase().includes(q) || 
    link.shortCode.toLowerCase().includes(q) || 
    link.shortUrl.toLowerCase().includes(q)
  );

  renderLinksList(filtered);
}

// Shorten submission (Dashboard view)
async function handleShorten(e) {
  e.preventDefault();
  const originalUrl = document.getElementById('shorten-url').value;
  const customAlias = document.getElementById('shorten-alias').value;
  const expiresIn = document.getElementById('shorten-expiry').value;

  const submitBtn = document.getElementById('btn-shorten-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

  const res = await fetchWithAuth('/urls', {
    method: 'POST',
    body: JSON.stringify({ originalUrl, customAlias, expiresIn })
  });

  submitBtn.disabled = false;
  submitBtn.innerHTML = 'Shorten Link';

  if (res.success) {
    showToast('Shortcut created successfully!', 'success');
    document.getElementById('shortener-panel').classList.add('hidden');
    document.getElementById('form-shorten').reset();
    loadDashboardData();
  } else {
    showToast(res.message || 'Failed to shorten URL.', 'error');
  }
}

// --- Detailed Analytics Functions ---
async function loadAnalyticsData(id) {
  // Reset fields to loading placeholders
  document.getElementById('analytics-original-url').textContent = 'Loading...';
  document.getElementById('analytics-original-url').href = '#';
  document.getElementById('analytics-short-url').textContent = 'Loading...';
  document.getElementById('analytics-code').textContent = 'Loading...';
  document.getElementById('analytics-created').textContent = 'Loading...';
  document.getElementById('analytics-expires').textContent = 'Loading...';
  document.getElementById('analytics-clicks').textContent = '0 clicks';
  document.getElementById('analytics-qrcode-img').src = '';

  const res = await fetchWithAuth(`/urls/${id}`);
  
  if (res.success) {
    const link = res.data;
    state.currentLink = link;

    // Fill textual details
    const origUrlEl = document.getElementById('analytics-original-url');
    origUrlEl.textContent = link.originalUrl;
    origUrlEl.href = link.originalUrl;
    
    document.getElementById('analytics-short-url').textContent = link.shortUrl.replace(/^https?:\/\//, '');
    document.getElementById('analytics-code').textContent = link.shortCode;
    
    document.getElementById('analytics-created').textContent = new Date(link.createdAt).toLocaleDateString(undefined, {
      month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const expiresEl = document.getElementById('analytics-expires');
    const statusEl = document.getElementById('analytics-status');
    
    if (link.expiresAt) {
      const expDate = new Date(link.expiresAt);
      expiresEl.textContent = expDate.toLocaleDateString(undefined, {
        month: 'long', day: 'numeric', year: 'numeric'
      });

      if (expDate < new Date()) {
        statusEl.textContent = 'Expired';
        statusEl.className = 'status-indicator expired';
      } else {
        statusEl.textContent = 'Active';
        statusEl.className = 'status-indicator active';
      }
    } else {
      expiresEl.textContent = 'Never';
      statusEl.textContent = 'Active';
      statusEl.className = 'status-indicator active';
    }

    document.getElementById('analytics-clicks').textContent = `${link.clickCount} engagement${link.clickCount === 1 ? '' : 's'}`;
    
    // Set QR code source
    document.getElementById('analytics-qrcode-img').src = link.qrCode;

    // Render chart
    renderAnalyticsChart(link.analytics.clicksByDay);
  } else {
    showToast(res.message || 'Failed to fetch analytics for link.', 'error');
    navigateTo('/dashboard');
  }
}

function renderAnalyticsChart(clicksByDay) {
  const ctx = document.getElementById('chart-clicks').getContext('2d');
  
  // Format labels and values sorted chronologically
  const sortedDates = Object.keys(clicksByDay).sort();
  const labels = sortedDates.map(dateStr => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });
  const data = sortedDates.map(dateStr => clicksByDay[dateStr]);

  // If no click data, show placeholder empty state
  if (sortedDates.length === 0) {
    labels.push('Today');
    data.push(0);
  }

  // Destroy existing chart if it exists
  if (state.chartInstance) {
    state.chartInstance.destroy();
  }

  // Neon Gradient for Chart Fill
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
  gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

  // Build Chart.js Instance
  state.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Redirect Clicks',
        data: data,
        borderColor: '#3b82f6',
        borderWidth: 3,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#fff',
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#ec4899',
        pointHoverBorderColor: '#fff',
        fill: true,
        backgroundColor: gradient,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: '#fff',
          bodyColor: '#f8fafc',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          font: {
            family: 'Inter'
          }
        }
      },
      scales: {
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            stepSize: 1,
            precision: 0
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#64748b'
          }
        }
      }
    }
  });
}

function downloadQrCodeImage() {
  if (!state.currentLink || !state.currentLink.qrCode) return;
  
  const link = document.createElement('a');
  link.href = state.currentLink.qrCode;
  link.download = `qrcode_${state.currentLink.shortCode}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('QR Code download started.', 'success');
}
