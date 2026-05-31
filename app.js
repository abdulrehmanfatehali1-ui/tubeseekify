/**
 * TubeSeekify - Core Application Logic
 * Integrates state management, dynamic UI rendering, mock API services, SVG analytics, and Web3 interactions.
 */

// ==========================================
// 1. STATE & STORAGE MANAGEMENT
// ==========================================
let appState = {
  prompts: [],
  resources: [],
  user: null,
  analytics: null,
  activePromptCategory: 'all',
  activeVaultCategory: 'all',
  currentView: 'home',
  activeProfileTab: 'bookmarks',
  activeAdminForm: 'prompt'
};

// Initialize State from localStorage or fallback to Seed Data
function initializeState() {
  const storedPrompts = localStorage.getItem('tubeseekify_prompts');
  const storedResources = localStorage.getItem('tubeseekify_resources');
  const storedUser = localStorage.getItem('tubeseekify_user');
  const storedAnalytics = localStorage.getItem('tubeseekify_analytics');

  if (storedPrompts && storedResources && storedUser && storedAnalytics) {
    appState.prompts = JSON.parse(storedPrompts);
    appState.resources = JSON.parse(storedResources);
    appState.user = JSON.parse(storedUser);
    appState.analytics = JSON.parse(storedAnalytics);
  } else {
    // Seed database
    appState.prompts = [...window.TubeSeekifyData.prompts];
    appState.resources = [...window.TubeSeekifyData.resources];
    appState.user = JSON.parse(JSON.stringify(window.TubeSeekifyData.userProfile)); // deep copy
    appState.analytics = JSON.parse(JSON.stringify(window.TubeSeekifyData.analytics));
    saveStateToStorage();
  }
}

function saveStateToStorage() {
  localStorage.setItem('tubeseekify_prompts', JSON.stringify(appState.prompts));
  localStorage.setItem('tubeseekify_resources', JSON.stringify(appState.resources));
  localStorage.setItem('tubeseekify_user', JSON.stringify(appState.user));
  localStorage.setItem('tubeseekify_analytics', JSON.stringify(appState.analytics));
}

// Reset data back to default seed
function resetDefaultData() {
  localStorage.removeItem('tubeseekify_prompts');
  localStorage.removeItem('tubeseekify_resources');
  localStorage.removeItem('tubeseekify_user');
  localStorage.removeItem('tubeseekify_analytics');
  initializeState();
  
  // Re-render
  updateHomeStats();
  renderPromptsGrid();
  renderVaultGrid();
  updateUserProfileUI();
  updateAdminUI();
  
  showToast("System Reset", "Database restored to original seed state.", "success");
}


// ==========================================
// 2. MOCK API SERVICES (Scalable CRUD)
// ==========================================
const ApiService = {
  // Simulate delay to mimic API latency
  delay: (ms = 300) => new Promise(resolve => setTimeout(resolve, ms)),

  // Prompts CRUD
  async getPrompts() {
    await this.delay();
    return [...appState.prompts];
  },

  async createPrompt(promptData) {
    await this.delay();
    const newPrompt = {
      id: 'p_' + Date.now(),
      title: promptData.title,
      description: promptData.description,
      category: promptData.category,
      promptText: promptData.promptText,
      tags: promptData.tags,
      copiedCount: 0,
      createdAt: new Date().toISOString()
    };
    appState.prompts.unshift(newPrompt);
    saveStateToStorage();
    return newPrompt;
  },

  async deletePrompt(id) {
    await this.delay();
    appState.prompts = appState.prompts.filter(p => p.id !== id);
    // Remove from bookmarks
    appState.user.bookmarks = appState.user.bookmarks.filter(bId => bId !== id);
    saveStateToStorage();
    return true;
  },

  // Resources CRUD
  async getResources() {
    await this.delay();
    return [...appState.resources];
  },

  async createResource(resourceData) {
    await this.delay();
    const newResource = {
      id: 'r_' + Date.now(),
      title: resourceData.title,
      description: resourceData.description,
      category: resourceData.category,
      downloadUrl: '#',
      fileSize: resourceData.fileSize,
      readTime: resourceData.readTime,
      tags: resourceData.tags,
      downloadedCount: 0
    };
    appState.resources.unshift(newResource);
    saveStateToStorage();
    return newResource;
  },

  async deleteResource(id) {
    await this.delay();
    appState.resources = appState.resources.filter(r => r.id !== id);
    // Remove from bookmarks
    appState.user.bookmarks = appState.user.bookmarks.filter(bId => bId !== id);
    saveStateToStorage();
    return true;
  },

  // Profile operations
  async toggleBookmark(itemId) {
    await this.delay(100);
    const index = appState.user.bookmarks.indexOf(itemId);
    let bookmarked = false;
    if (index === -1) {
      appState.user.bookmarks.push(itemId);
      appState.analytics.summary.totalBookmarks++;
      bookmarked = true;
    } else {
      appState.user.bookmarks.splice(index, 1);
      appState.analytics.summary.totalBookmarks = Math.max(0, appState.analytics.summary.totalBookmarks - 1);
    }
    saveStateToStorage();
    return bookmarked;
  },

  async recordInteraction(itemId, type = 'copy') {
    await this.delay(50);
    if (type === 'copy') {
      // Find prompt and increment copy count
      const prompt = appState.prompts.find(p => p.id === itemId);
      if (prompt) {
        prompt.copiedCount++;
        appState.analytics.summary.totalCopies++;
        
        // Log to history
        appState.user.copyHistory.unshift({
          itemId: prompt.id,
          title: prompt.title,
          type: 'prompt',
          timestamp: new Date().toISOString()
        });

        // Increment API Limit Counter
        appState.user.usageLimit.current = Math.min(appState.user.usageLimit.max, appState.user.usageLimit.current + 1);
        
        // Record on today's analytics date
        const todayStr = "May 23"; // Locked for mock consistency
        const dayStat = appState.analytics.dailyTraffic.find(d => d.date === todayStr);
        if (dayStat) {
          dayStat.copies++;
        }
      }
    } else if (type === 'download') {
      const resource = appState.resources.find(r => r.id === itemId);
      if (resource) {
        resource.downloadedCount++;
        
        // Log to history
        appState.user.copyHistory.unshift({
          itemId: resource.id,
          title: resource.title,
          type: 'resource',
          timestamp: new Date().toISOString()
        });
      }
    }
    saveStateToStorage();
  }
};


// ==========================================
// 3. UI VIEW CONTROLLER & NAVIGATION
// ==========================================
function switchView(viewId) {
  // Hide all sections
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
  
  // Show target section
  const targetSec = document.getElementById(`view-${viewId}`);
  if (targetSec) targetSec.classList.remove('hidden');

  // Update nav link active state
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.remove('text-white');
    btn.classList.add('text-zinc-400');
  });

  const activeBtn = document.getElementById(`nav-${viewId}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-zinc-400');
    activeBtn.classList.add('text-white');
  }

  // Update underline indicator animations
  document.querySelectorAll('[id^="indicator-"]').forEach(ind => {
    ind.classList.remove('scale-x-100');
    ind.classList.add('scale-x-0');
  });

  const activeInd = document.getElementById(`indicator-${viewId}`);
  if (activeInd) {
    activeInd.classList.remove('scale-x-0');
    activeInd.classList.add('scale-x-100');
  }

  // Update State & trigger specific updates
  appState.currentView = viewId;
  
  if (viewId === 'home') {
    updateHomeStats();
  } else if (viewId === 'prompts') {
    renderPromptsGrid();
  } else if (viewId === 'vault') {
    renderVaultGrid();
  } else if (viewId === 'profile') {
    updateUserProfileUI();
  } else if (viewId === 'admin') {
    updateAdminUI();
  }

  // Auto scroll to top of viewport
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Mobile drawer triggers
const mobileDrawer = document.getElementById('mobile-drawer');
const mobileDrawerClose = document.getElementById('mobile-drawer-close');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');

function toggleMobileDrawer() {
  if (mobileDrawer.classList.contains('translate-x-full')) {
    mobileDrawer.classList.remove('translate-x-full');
    mobileDrawer.classList.add('translate-x-0');
  } else {
    mobileDrawer.classList.remove('translate-x-0');
    mobileDrawer.classList.add('translate-x-full');
  }
}

if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', toggleMobileDrawer);
if (mobileDrawerClose) mobileDrawerClose.addEventListener('click', toggleMobileDrawer);


// ==========================================
// 4. TOAST NOTIFICATION SYSTEM
// ==========================================
function showToast(title, message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toastId = 'toast_' + Date.now();
  
  let iconClass = 'fa-solid fa-circle-check text-emerald-400';
  let borderGlowClass = 'shadow-[0_0_15px_rgba(16,185,129,0.15)] border-emerald-500/20';
  if (type === 'error') {
    iconClass = 'fa-solid fa-circle-exclamation text-rose-500';
    borderGlowClass = 'shadow-[0_0_15px_rgba(244,63,94,0.15)] border-rose-500/20';
  } else if (type === 'info') {
    iconClass = 'fa-solid fa-circle-info text-neoncyan';
    borderGlowClass = 'shadow-[0_0_15px_rgba(6,182,212,0.15)] border-neoncyan/20';
  }

  const toastHtml = `
    <div id="${toastId}" class="toast-notification glass-panel p-4 rounded-2xl flex items-start gap-3 border ${borderGlowClass} select-none pointer-events-auto">
      <div class="text-lg mt-0.5">${type === 'bookmark' ? `<i class="fa-solid fa-bookmark text-rose-400"></i>` : `<i class="${iconClass}"></i>`}</div>
      <div class="flex-grow space-y-0.5">
        <h4 class="text-xs font-bold text-white font-display">${title}</h4>
        <p class="text-[10px] text-zinc-400 leading-normal">${message}</p>
      </div>
      <button class="text-zinc-600 hover:text-zinc-400 text-xs self-start" onclick="removeToast('${toastId}')">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHtml);

  // Self destruct after 4 seconds
  setTimeout(() => {
    removeToast(toastId);
  }, 4000);
}

function removeToast(id) {
  const toast = document.getElementById(id);
  if (toast) {
    toast.style.animation = 'slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }
}


// ==========================================
// 5. GPT PROMPT LIBRARY LOGIC
// ==========================================
let promptSearchQuery = '';

function setPromptCategory(cat) {
  appState.activePromptCategory = cat;
  
  // Update UI buttons
  const catButtons = ['all', 'SEO', 'Scripts', 'Titles', 'Thumbnails'];
  catButtons.forEach(c => {
    const btn = document.getElementById(`prompt-cat-${c.toLowerCase()}`);
    if (!btn) return;
    
    if (c === cat) {
      btn.classList.remove('text-zinc-400');
      btn.classList.add('text-white', 'bg-white/10');
    } else {
      btn.classList.remove('text-white', 'bg-white/10');
      btn.classList.add('text-zinc-400');
    }
  });

  renderPromptsGrid();
}

function filterPrompts() {
  promptSearchQuery = document.getElementById('prompt-search').value.toLowerCase().trim();
  renderPromptsGrid();
}

async function renderPromptsGrid() {
  const grid = document.getElementById('prompts-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full py-20 flex items-center justify-center">
      <i class="fa-solid fa-circle-notch animate-spin text-3xl text-neonviolet"></i>
    </div>
  `;

  const prompts = await ApiService.getPrompts();
  
  // Filter by category
  let filtered = prompts;
  if (appState.activePromptCategory !== 'all') {
    filtered = filtered.filter(p => p.category === appState.activePromptCategory);
  }

  // Filter by search text
  if (promptSearchQuery) {
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(promptSearchQuery) || 
      p.description.toLowerCase().includes(promptSearchQuery) ||
      p.tags.some(t => t.toLowerCase().includes(promptSearchQuery))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center space-y-3 glass-panel rounded-2xl border border-dashed border-zinc-700">
        <i class="fa-solid fa-magnifying-glass text-3xl text-zinc-600 block"></i>
        <span class="font-bold text-zinc-300 block">No prompts found</span>
        <p class="text-xs text-zinc-500">Try adjusting your filters or search keywords.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  filtered.forEach((prompt, index) => {
    const isBookmarked = appState.user.bookmarks.includes(prompt.id);
    const tagsHtml = prompt.tags.map(t => `<span class="bg-white/5 border border-white/5 text-[9px] font-semibold text-zinc-400 px-2 py-0.5 rounded-md">#${t}</span>`).join(' ');
    
    // Web3 SaaS Premium Card Layout
    const cardHtml = `
      <div class="glass-panel p-5 rounded-2xl border border-white/5 hover-lift relative overflow-hidden flex flex-col justify-between" id="prompt-card-${prompt.id}">
        <!-- Decorative Glow on hover -->
        <div class="absolute -inset-px bg-gradient-to-r from-neonviolet/10 to-neoncyan/10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"></div>

        <div>
          <!-- MacOS dots window header -->
          <div class="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div class="flex items-center gap-1.5">
              <span class="mac-dot mac-dot-red"></span>
              <span class="mac-dot mac-dot-yellow"></span>
              <span class="mac-dot mac-dot-green"></span>
            </div>
            <span class="text-[9px] font-bold text-neonviolet uppercase tracking-wider bg-neonviolet/10 px-2 py-0.5 rounded-full border border-neonviolet/20">${prompt.category}</span>
          </div>

          <!-- Title -->
          <h3 class="text-md font-bold font-display text-white mb-2 leading-snug cursor-pointer hover:text-neoncyan transition-colors" onclick="openPromptModal('${prompt.id}')">
            ${prompt.title}
          </h3>

          <!-- Description -->
          <p class="text-xs text-zinc-400 leading-relaxed mb-4 line-clamp-2">
            ${prompt.description}
          </p>
        </div>

        <div>
          <!-- Tags -->
          <div class="flex flex-wrap gap-1.5 mb-4">
            ${tagsHtml}
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-3 border-t border-white/5">
            <span class="text-[10px] text-zinc-500 font-medium">Used ${prompt.copiedCount}x</span>
            <div class="flex items-center gap-2">
              <button onclick="toggleBookmark('${prompt.id}')" class="p-2.5 rounded-xl border border-white/5 hover:border-white/20 transition-all text-xs flex items-center justify-center ${isBookmarked ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'text-zinc-400 hover:text-white'}" aria-label="Bookmark prompt">
                <i class="${isBookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'}"></i>
              </button>
              <button onclick="copyPromptToClipboard('${prompt.id}')" class="bg-gradient-to-r from-neonviolet/20 to-neoncyan/20 border border-white/10 hover:border-white/20 hover:scale-[1.03] transition-all text-xs font-bold text-white px-3.5 py-2.5 rounded-xl flex items-center gap-1.5">
                <i class="fa-regular fa-clipboard"></i> Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    grid.insertAdjacentHTML('beforeend', cardHtml);
  });
}

// Global toggle bookmark function
async function toggleBookmark(itemId) {
  const isBookmarked = await ApiService.toggleBookmark(itemId);
  
  if (isBookmarked) {
    showToast("Added to Vault", "Item saved successfully in your User Panel bookmarks.", "bookmark");
  } else {
    showToast("Removed", "Item removed from your bookmarks.", "info");
  }

  // Update specific view states
  if (appState.currentView === 'prompts') {
    renderPromptsGrid();
  } else if (appState.currentView === 'vault') {
    renderVaultGrid();
  } else if (appState.currentView === 'profile') {
    updateUserProfileUI();
  }
}

// Global copy prompt function
async function copyPromptToClipboard(promptId) {
  const prompt = appState.prompts.find(p => p.id === promptId);
  if (!prompt) return;

  // Use Clipboard API
  try {
    await navigator.clipboard.writeText(prompt.promptText);
    showToast("Prompt Copied", "Standard instruction template copied to clipboard.", "success");
    
    // Record copy metrics & logs
    await ApiService.recordInteraction(prompt.id, 'copy');
    
    // Refresh grids to update count if applicable
    if (appState.currentView === 'prompts') {
      renderPromptsGrid();
    }
  } catch (err) {
    showToast("Copy Failed", "Please select prompt text manually.", "error");
  }
}


// ==========================================
// 6. DETAILED PROMPT VARIABLES MODAL
// ==========================================
let activeModalPromptId = null;

function openPromptModal(promptId) {
  const prompt = appState.prompts.find(p => p.id === promptId);
  if (!prompt) return;

  activeModalPromptId = promptId;
  const modal = document.getElementById('prompt-modal');
  const cat = document.getElementById('modal-category');
  const title = document.getElementById('modal-title');
  const desc = document.getElementById('modal-description');
  const preview = document.getElementById('modal-prompt-content');
  const copyCount = document.getElementById('modal-copied-count');
  const bkBtn = document.getElementById('modal-bookmark-btn');

  cat.innerText = prompt.category;
  title.innerText = prompt.title;
  desc.innerText = prompt.description;
  preview.innerText = prompt.promptText;
  copyCount.innerText = `Used ${prompt.copiedCount} times`;

  // Bookmark styling inside Modal
  const isBookmarked = appState.user.bookmarks.includes(prompt.id);
  if (isBookmarked) {
    bkBtn.className = "flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2";
    bkBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i> Bookmarked`;
  } else {
    bkBtn.className = "flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-all text-xs font-bold flex items-center justify-center gap-2 text-zinc-400 hover:text-white";
    bkBtn.innerHTML = `<i class="fa-regular fa-bookmark"></i> Bookmark`;
  }

  // Parse custom prompt string variables enclosed in [] brackets
  // e.g. [TOPIC], [AUDIENCE], [KEYWORD], [TITLE]
  const regex = /\[([A-Z0-9_]+)\]/g;
  const variables = [];
  let match;
  while ((match = regex.exec(prompt.promptText)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  const container = document.getElementById('modal-variable-container');
  const inputsWrapper = document.getElementById('modal-variables-inputs');
  inputsWrapper.innerHTML = '';

  if (variables.length > 0) {
    container.classList.remove('hidden');
    variables.forEach(v => {
      const inputHtml = `
        <div class="space-y-1">
          <label for="var-input-${v}" class="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Set ${v}</label>
          <input type="text" id="var-input-${v}" data-var="${v}" placeholder="Enter values..." class="w-full px-3 py-2 rounded-lg text-xs input-glass text-white font-medium" oninput="updatePromptPreview()">
        </div>
      `;
      inputsWrapper.insertAdjacentHTML('beforeend', inputHtml);
    });
  } else {
    container.classList.add('hidden');
  }

  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closePromptModal() {
  const modal = document.getElementById('prompt-modal');
  modal.classList.remove('flex');
  modal.classList.add('hidden');
  activeModalPromptId = null;
}

// Live update variable substitutions inside pre box
function updatePromptPreview() {
  if (!activeModalPromptId) return;
  const prompt = appState.prompts.find(p => p.id === activeModalPromptId);
  if (!prompt) return;

  let text = prompt.promptText;
  const inputs = document.querySelectorAll('#modal-variables-inputs input');
  
  inputs.forEach(input => {
    const variable = input.getAttribute('data-var');
    const val = input.value.trim();
    if (val) {
      // Global regex replace
      const r = new RegExp(`\\[${variable}\\]`, 'g');
      text = text.replace(r, val);
    }
  });

  document.getElementById('modal-prompt-content').innerText = text;
}

// Modal action triggers
const modalClose = document.getElementById('modal-close');
const modalCopyBtn = document.getElementById('modal-copy-btn');
const modalBookmarkBtn = document.getElementById('modal-bookmark-btn');

if (modalClose) modalClose.addEventListener('click', closePromptModal);

if (modalCopyBtn) {
  modalCopyBtn.addEventListener('click', async () => {
    const text = document.getElementById('modal-prompt-content').innerText;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Custom Prompt Copied", "Your personalized prompt is ready for AI pasting.", "success");
      
      if (activeModalPromptId) {
        await ApiService.recordInteraction(activeModalPromptId, 'copy');
        
        // update copies count view
        const p = appState.prompts.find(x => x.id === activeModalPromptId);
        if (p) {
          document.getElementById('modal-copied-count').innerText = `Used ${p.copiedCount} times`;
        }
      }
      
      closePromptModal();
      
      if (appState.currentView === 'prompts') {
        renderPromptsGrid();
      }
    } catch (err) {
      showToast("Copy Error", "Unable to copy automatically.", "error");
    }
  });
}

if (modalBookmarkBtn) {
  modalBookmarkBtn.addEventListener('click', async () => {
    if (!activeModalPromptId) return;
    await toggleBookmark(activeModalPromptId);
    
    // Refresh modal states
    const isBookmarked = appState.user.bookmarks.includes(activeModalPromptId);
    if (isBookmarked) {
      modalBookmarkBtn.className = "flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2";
      modalBookmarkBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i> Bookmarked`;
    } else {
      modalBookmarkBtn.className = "flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-all text-xs font-bold flex items-center justify-center gap-2 text-zinc-400 hover:text-white";
      modalBookmarkBtn.innerHTML = `<i class="fa-regular fa-bookmark"></i> Bookmark`;
    }
  });
}

// Close modal when clicking dark backdrop overlay
const modalOverlay = document.getElementById('prompt-modal');
if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closePromptModal();
    }
  });
}


// ==========================================
// 7. RESOURCE VAULT LOGIC
// ==========================================
let vaultSearchQuery = '';

function setVaultCategory(cat) {
  appState.activeVaultCategory = cat;
  
  // Update UI buttons
  const catButtons = ['all', 'PDF Guide', 'Checklist', 'Templates'];
  catButtons.forEach(c => {
    const btnId = `vault-cat-${c.toLowerCase().replace(' ', '').replace('&sops', '')}`;
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    if (c === cat) {
      btn.classList.remove('text-zinc-400');
      btn.classList.add('text-white', 'bg-white/10');
    } else {
      btn.classList.remove('text-white', 'bg-white/10');
      btn.classList.add('text-zinc-400');
    }
  });

  renderVaultGrid();
}

function filterVault() {
  vaultSearchQuery = document.getElementById('vault-search').value.toLowerCase().trim();
  renderVaultGrid();
}

async function renderVaultGrid() {
  const grid = document.getElementById('vault-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="col-span-full py-20 flex items-center justify-center">
      <i class="fa-solid fa-circle-notch animate-spin text-3xl text-neoncyan"></i>
    </div>
  `;

  const resources = await ApiService.getResources();
  
  // Filter by category
  let filtered = resources;
  if (appState.activeVaultCategory !== 'all') {
    filtered = filtered.filter(r => r.category === appState.activeVaultCategory);
  }

  // Filter by search text
  if (vaultSearchQuery) {
    filtered = filtered.filter(r => 
      r.title.toLowerCase().includes(vaultSearchQuery) || 
      r.description.toLowerCase().includes(vaultSearchQuery) ||
      r.tags.some(t => t.toLowerCase().includes(vaultSearchQuery))
    );
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center space-y-3 glass-panel rounded-2xl border border-dashed border-zinc-700">
        <i class="fa-solid fa-magnifying-glass text-3xl text-zinc-600 block"></i>
        <span class="font-bold text-zinc-300 block">No vault items found</span>
        <p class="text-xs text-zinc-500">Try modifying filters or search.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';
  filtered.forEach(res => {
    const isBookmarked = appState.user.bookmarks.includes(res.id);
    const tagsHtml = res.tags.map(t => `<span class="bg-white/5 border border-white/5 text-[9px] font-semibold text-zinc-400 px-2 py-0.5 rounded-md">#${t}</span>`).join(' ');
    
    // Define icon corresponding to type
    let iconClass = 'fa-solid fa-file-pdf text-rose-400';
    if (res.category === 'Checklist') iconClass = 'fa-solid fa-list-check text-neoncyan';
    if (res.category === 'Templates') iconClass = 'fa-solid fa-shapes text-neonviolet';

    const cardHtml = `
      <div class="glass-panel p-5 rounded-2xl border border-white/5 hover-lift relative overflow-hidden flex flex-col justify-between" id="resource-card-${res.id}">
        <!-- Hover Gradient overlay -->
        <div class="absolute -inset-px bg-gradient-to-r from-neoncyan/10 to-neonviolet/10 opacity-0 hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"></div>

        <div>
          <!-- MacOS Header -->
          <div class="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <div class="flex items-center gap-1.5">
              <span class="mac-dot mac-dot-red"></span>
              <span class="mac-dot mac-dot-yellow"></span>
              <span class="mac-dot mac-dot-green"></span>
            </div>
            <span class="text-[9px] font-bold text-neoncyan uppercase tracking-wider bg-neoncyan/10 px-2 py-0.5 rounded-full border border-neoncyan/20">${res.category}</span>
          </div>

          <!-- Headline -->
          <div class="flex items-start gap-3 mb-2">
            <div class="p-2.5 rounded-lg bg-zinc-900 border border-white/5 text-sm">${typeIcon(res.category)}</div>
            <h3 class="text-md font-bold font-display text-white leading-snug">
              ${res.title}
            </h3>
          </div>

          <!-- Description -->
          <p class="text-xs text-zinc-400 leading-relaxed mb-4 line-clamp-2">
            ${res.description}
          </p>
        </div>

        <div>
          <!-- Tags -->
          <div class="flex flex-wrap gap-1.5 mb-4">
            ${tagsHtml}
          </div>

          <!-- Footer status parameters -->
          <div class="flex items-center justify-between pt-3 border-t border-white/5">
            <span class="text-[10px] text-zinc-500 font-semibold flex items-center gap-1.5">
              <i class="fa-regular fa-file"></i> ${res.fileSize} &bull; <i class="fa-regular fa-clock"></i> ${res.readTime}
            </span>
            <div class="flex items-center gap-2">
              <button onclick="toggleBookmark('${res.id}')" class="p-2.5 rounded-xl border border-white/5 hover:border-white/20 transition-all text-xs flex items-center justify-center ${isBookmarked ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'text-zinc-400 hover:text-white'}" aria-label="Bookmark asset">
                <i class="${isBookmarked ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'}"></i>
              </button>
              <button onclick="downloadResource('${res.id}')" class="bg-zinc-800 hover:bg-zinc-700 border border-white/5 hover:border-white/10 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <i class="fa-solid fa-arrow-down"></i> Fetch
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    grid.insertAdjacentHTML('beforeend', cardHtml);
  });
}

function typeIcon(cat) {
  if (cat === 'PDF Guide') return `<i class="fa-solid fa-file-pdf text-rose-400"></i>`;
  if (cat === 'Checklist') return `<i class="fa-solid fa-list-check text-emerald-400"></i>`;
  return `<i class="fa-solid fa-shapes text-neoncyan"></i>`;
}

// Download action trigger simulation
async function downloadResource(resourceId) {
  const resource = appState.resources.find(r => r.id === resourceId);
  if (!resource) return;

  showToast("Downloading Started", `${resource.title} bundle processing.`, "info");
  
  setTimeout(async () => {
    // Record metrics
    await ApiService.recordInteraction(resource.id, 'download');
    showToast("Downloaded", `Downloaded successfully (${resource.fileSize}).`, "success");
    
    // Refresh if in vault
    if (appState.currentView === 'vault') {
      renderVaultGrid();
    }
  }, 1000);
}


// ==========================================
// 8. USER PROFILE PANEL TABS & API KEYS
// ==========================================
function switchProfileTab(tabId) {
  appState.activeProfileTab = tabId;

  // Toggle active styling
  const tabs = ['bookmarks', 'keys', 'history'];
  tabs.forEach(t => {
    const btn = document.getElementById(`profile-tab-btn-${t}`);
    const tabContent = document.getElementById(`profile-tab-${t}`);

    if (t === tabId) {
      btn.classList.add('bg-white/10', 'text-white');
      btn.classList.remove('text-zinc-400');
      tabContent.classList.remove('hidden');
    } else {
      btn.classList.remove('bg-white/10', 'text-white');
      btn.classList.add('text-zinc-400');
      tabContent.classList.add('hidden');
    }
  });

  if (tabId === 'bookmarks') {
    renderUserBookmarks();
  } else if (tabId === 'keys') {
    renderApiKeys();
  } else if (tabId === 'history') {
    renderActivityHistory();
  }
}

function updateUserProfileUI() {
  const user = appState.user;
  if (!user) return;

  document.getElementById('user-name').innerText = user.name;
  document.getElementById('user-email').innerText = user.email;
  document.getElementById('user-tier').innerText = user.tier;
  document.getElementById('user-avatar').src = user.avatarUrl;
  document.getElementById('user-wallet').innerText = user.walletAddress;

  // Usage progress limit bar
  const usageCurrent = user.usageLimit.current;
  const usageMax = user.usageLimit.max;
  const percentage = (usageCurrent / usageMax) * 100;
  
  document.getElementById('user-usage-text').innerText = `${usageCurrent} / ${usageMax}`;
  document.getElementById('user-usage-bar').style.width = `${percentage}%`;

  // Render bookmarks count badge
  document.getElementById('bookmark-count-badge').innerText = `${user.bookmarks.length} saved`;

  // Render sub tab
  switchProfileTab(appState.activeProfileTab);
}

function renderUserBookmarks() {
  const grid = document.getElementById('profile-bookmarks-grid');
  const emptyState = document.getElementById('bookmarks-empty-state');
  if (!grid) return;

  grid.innerHTML = '';
  
  const savedIds = appState.user.bookmarks;
  
  if (savedIds.length === 0) {
    grid.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  grid.classList.remove('hidden');
  emptyState.classList.add('hidden');

  savedIds.forEach(id => {
    // Find either in prompt database or resources
    const prompt = appState.prompts.find(p => p.id === id);
    const resource = appState.resources.find(r => r.id === id);

    let cardHtml = '';
    if (prompt) {
      cardHtml = `
        <div class="glass-panel p-4 rounded-xl border border-white/5 flex flex-col justify-between hover:border-neonviolet/30 transition-all">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[9px] font-bold text-neonviolet uppercase tracking-wider bg-neonviolet/10 px-2 py-0.5 rounded-full">Prompt &bull; ${prompt.category}</span>
            <button onclick="toggleBookmark('${prompt.id}')" class="text-zinc-600 hover:text-rose-400 text-xs p-1" aria-label="Unsave bookmark"><i class="fa-solid fa-bookmark text-rose-500"></i></button>
          </div>
          <h4 class="text-xs font-bold font-display text-white cursor-pointer hover:text-neoncyan transition-colors" onclick="openPromptModal('${prompt.id}')">${prompt.title}</h4>
          <p class="text-[10px] text-zinc-400 mt-1 line-clamp-2">${prompt.description}</p>
          <div class="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5">
            <span class="text-[9px] text-zinc-500">Copied ${prompt.copiedCount}x</span>
            <button onclick="copyPromptToClipboard('${prompt.id}')" class="text-[10px] text-neonviolet font-bold hover:underline flex items-center gap-1"><i class="fa-regular fa-clipboard"></i> Copy</button>
          </div>
        </div>
      `;
    } else if (resource) {
      cardHtml = `
        <div class="glass-panel p-4 rounded-xl border border-white/5 flex flex-col justify-between hover:border-neoncyan/30 transition-all">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[9px] font-bold text-neoncyan uppercase tracking-wider bg-neoncyan/10 px-2 py-0.5 rounded-full">Vault &bull; ${resource.category}</span>
            <button onclick="toggleBookmark('${resource.id}')" class="text-zinc-600 hover:text-rose-400 text-xs p-1" aria-label="Unsave bookmark"><i class="fa-solid fa-bookmark text-rose-500"></i></button>
          </div>
          <h4 class="text-xs font-bold font-display text-white">${resource.title}</h4>
          <p class="text-[10px] text-zinc-400 mt-1 line-clamp-2">${resource.description}</p>
          <div class="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5">
            <span class="text-[9px] text-zinc-500">${resource.fileSize}</span>
            <button onclick="downloadResource('${resource.id}')" class="text-[10px] text-neoncyan font-bold hover:underline flex items-center gap-1"><i class="fa-solid fa-arrow-down"></i> Download</button>
          </div>
        </div>
      `;
    }

    if (cardHtml) {
      grid.insertAdjacentHTML('beforeend', cardHtml);
    }
  });
}

function renderApiKeys() {
  const container = document.getElementById('api-keys-list');
  if (!container) return;

  container.innerHTML = '';
  const keys = appState.user.apiKeys;

  if (keys.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl">
        No active API credentials generated. Click generate above.
      </div>
    `;
    return;
  }

  keys.forEach(k => {
    const keyHtml = `
      <div class="glass-panel p-4 rounded-xl border border-white/5 flex items-center justify-between flex-wrap gap-4 text-xs">
        <div>
          <span class="font-bold text-white block mb-0.5">${k.name}</span>
          <span class="text-[10px] text-zinc-500 block">Created on ${k.createdAt}</span>
        </div>
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <code class="bg-black/30 border border-white/5 px-3 py-1.5 rounded-lg text-zinc-300 font-mono flex-grow sm:flex-grow-0">${k.key}</code>
          <button onclick="copyText('${k.key}', 'API Key')" class="p-2 bg-zinc-850 hover:bg-zinc-800 border border-white/5 hover:border-white/10 rounded-lg text-zinc-400 hover:text-white" aria-label="Copy API Key text">
            <i class="fa-regular fa-copy"></i>
          </button>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', keyHtml);
  });
}

function generateApiKey() {
  const keyName = prompt("Enter a descriptive name for this API Key:", "Production Client Key");
  if (keyName === null) return;
  
  const cleanName = keyName.trim() || "API Token";
  const hex = Math.random().toString(16).substring(2, 8) + Math.random().toString(16).substring(2, 8);
  const newKey = {
    name: cleanName,
    key: `tsk_live_${hex}`,
    createdAt: new Date().toISOString().split('T')[0]
  };

  appState.user.apiKeys.push(newKey);
  saveStateToStorage();
  
  showToast("API Key Generated", "Secret access token deployed successfully.", "success");
  renderApiKeys();
}

// Copy helper function for simple strings
async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied", `${label} copied successfully.`, "success");
  } catch (err) {
    showToast("Copy failed", "Try copying manually.", "error");
  }
}

function renderActivityHistory() {
  const tableBody = document.getElementById('history-log-table');
  const emptyState = document.getElementById('history-empty-state');
  if (!tableBody) return;

  tableBody.innerHTML = '';
  const history = appState.user.copyHistory;

  if (history.length === 0) {
    tableBody.parentElement.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  tableBody.parentElement.classList.remove('hidden');
  emptyState.classList.add('hidden');

  history.forEach(log => {
    const date = new Date(log.timestamp);
    const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

    let actionLabel = 'Copied instructions';
    let badgeColor = 'bg-neonviolet/10 text-neonviolet border border-neonviolet/20';
    if (log.type === 'resource') {
      actionLabel = 'Fetched resource';
      badgeColor = 'bg-neoncyan/10 text-neoncyan border border-neoncyan/20';
    }

    const rowHtml = `
      <tr class="hover:bg-white/[0.02] transition-colors">
        <td class="p-4 font-semibold text-zinc-200">${actionLabel}</td>
        <td class="p-4 max-w-[150px] truncate text-zinc-400 font-medium">${log.title}</td>
        <td class="p-4">
          <span class="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${badgeColor}">${log.type}</span>
        </td>
        <td class="p-4 text-right text-zinc-500 font-mono text-[10px]">${dateFormatted}, ${timeFormatted}</td>
      </tr>
    `;

    tableBody.insertAdjacentHTML('beforeend', rowHtml);
  });
}

function clearHistory() {
  if (confirm("Are you sure you want to clear your local usage history logs?")) {
    appState.user.copyHistory = [];
    saveStateToStorage();
    showToast("History Cleared", "Local logs deleted.", "info");
    renderActivityHistory();
  }
}


// ==========================================
// 9. ADMIN PANEL & SVG ANALYTICS
// ==========================================
function switchAdminForm(tab) {
  appState.activeAdminForm = tab;
  const pForm = document.getElementById('admin-prompt-form');
  const vForm = document.getElementById('admin-vault-form');
  const pTab = document.getElementById('admin-form-tab-prompt');
  const vTab = document.getElementById('admin-form-tab-vault');

  if (tab === 'prompt') {
    pForm.classList.remove('hidden');
    vForm.classList.add('hidden');
    pTab.className = "pb-2 text-xs font-bold text-white border-b-2 border-neonviolet";
    vTab.className = "pb-2 text-xs font-bold text-zinc-500 border-b-2 border-transparent hover:text-white";
  } else {
    pForm.classList.add('hidden');
    vForm.classList.remove('hidden');
    vTab.className = "pb-2 text-xs font-bold text-white border-b-2 border-neoncyan";
    pTab.className = "pb-2 text-xs font-bold text-zinc-500 border-b-2 border-transparent hover:text-white";
  }
}

function updateHomeStats() {
  document.getElementById('home-stat-prompts').innerText = appState.prompts.length;
  document.getElementById('home-stat-resources').innerText = appState.resources.length;
  document.getElementById('home-stat-bookmarks').innerText = appState.user.bookmarks.length;
  
  const currentReqs = appState.user.usageLimit.current;
  const maxReqs = appState.user.usageLimit.max;
  document.getElementById('home-stat-api').innerText = `${currentReqs}/${maxReqs}`;
}

function updateAdminUI() {
  // Update summaries
  document.getElementById('admin-stat-views').innerText = appState.analytics.summary.totalPageViews.toLocaleString();
  document.getElementById('admin-stat-users').innerText = appState.analytics.summary.activeUsers.toLocaleString();
  document.getElementById('admin-stat-copies').innerText = appState.analytics.summary.totalCopies.toLocaleString();
  document.getElementById('admin-stat-bookmarks').innerText = appState.user.bookmarks.length;

  // Draw Charts
  drawAnalyticsChart();
  drawCategoryDistribution();

  // Render database management list
  renderAdminDatabaseManagement();
}

/**
 * Draws a premium, fully customized line graph using responsive SVG.
 * Shows Daily traffic (Page views) vs copy conversion rate.
 */
function drawAnalyticsChart() {
  const container = document.getElementById('analytics-chart-container');
  if (!container) return;

  const data = appState.analytics.dailyTraffic;
  const width = container.clientWidth || 600;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };

  // Calculate coordinates bounds
  const xMax = data.length - 1;
  const viewsMax = Math.max(...data.map(d => d.views)) * 1.1; // pad height bounds
  const copiesMax = Math.max(...data.map(d => d.copies)) * 1.1;

  // Function to translate chart values to pixel coordinates
  const getX = (index) => padding.left + (index / xMax) * (width - padding.left - padding.right);
  const getYViews = (val) => height - padding.bottom - (val / viewsMax) * (height - padding.top - padding.bottom);
  const getYCopies = (val) => height - padding.bottom - (val / copiesMax) * (height - padding.top - padding.bottom);

  // Generate SVG Lines Paths
  let pathViews = `M ${getX(0)} ${getYViews(data[0].views)} `;
  let pathCopies = `M ${getX(0)} ${getYCopies(data[0].copies)} `;
  
  for (let i = 1; i < data.length; i++) {
    pathViews += `L ${getX(i)} ${getYViews(data[i].views)} `;
    pathCopies += `L ${getX(i)} ${getYCopies(data[i].copies)} `;
  }

  // Generate Filled Areas below the lines for glow effects
  let fillViews = `${pathViews} L ${getX(data.length-1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`;
  let fillCopies = `${pathCopies} L ${getX(data.length-1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`;

  // Draw Grid Lines (horizontal)
  let gridLines = '';
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const yVal = padding.top + (i / gridSteps) * (height - padding.top - padding.bottom);
    gridLines += `<line x1="${padding.left}" y1="${yVal}" x2="${width - padding.right}" y2="${yVal}" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>`;
  }

  // Draw Labels
  let labelsHtml = '';
  data.forEach((d, i) => {
    labelsHtml += `<text x="${getX(i)}" y="${height - 10}" fill="#71717a" font-size="9" text-anchor="middle" font-family="Space Grotesk">${d.date}</text>`;
  });

  // Render SVG Elements
  container.innerHTML = `
    <svg width="${width}" height="${height}" class="overflow-visible">
      <defs>
        <!-- Gradients for fill drop shadows -->
        <linearGradient id="gradient-views" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.0"/>
        </linearGradient>
        <linearGradient id="gradient-copies" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.0"/>
        </linearGradient>
      </defs>

      <!-- Grid -->
      ${gridLines}

      <!-- Page Views Area & Line -->
      <path d="${fillViews}" fill="url(#gradient-views)" />
      <path d="${pathViews}" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Copies Area & Line -->
      <path d="${fillCopies}" fill="url(#gradient-copies)" />
      <path d="${pathCopies}" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Circle interactive points -->
      ${data.map((d, i) => `
        <circle cx="${getX(i)}" cy="${getYViews(d.views)}" r="4" fill="#06b6d4" stroke="#09090b" stroke-width="2" class="cursor-pointer hover:r-6 transition-all" />
        <circle cx="${getX(i)}" cy="${getYCopies(d.copies)}" r="4" fill="#8b5cf6" stroke="#09090b" stroke-width="2" class="cursor-pointer hover:r-6 transition-all" />
      `).join('')}

      <!-- Labels group -->
      ${labelsHtml}
    </svg>

    <!-- Floating legend overlay -->
    <div class="absolute top-4 right-4 flex items-center gap-4 text-[10px] font-bold">
      <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-neoncyan"></span> <span class="text-zinc-300">Views</span></div>
      <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-neonviolet"></span> <span class="text-zinc-300">Prompt Copies</span></div>
    </div>
  `;
}

/**
 * Draws Category Weightings Distribution using progress bars.
 */
function drawCategoryDistribution() {
  const container = document.getElementById('category-distribution-container');
  if (!container) return;

  // Re-calculate live categories based on active prompts database counts
  const categories = ['SEO', 'Scripts', 'Titles', 'Thumbnails'];
  const counts = {};
  categories.forEach(c => {
    counts[c] = appState.prompts.filter(p => p.category === c).length;
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  container.innerHTML = '';
  categories.forEach(c => {
    const count = counts[c];
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    let colorClass = 'bg-neonviolet';
    if (c === 'SEO') colorClass = 'bg-emerald-500';
    if (c === 'Titles') colorClass = 'bg-rose-500';
    if (c === 'Thumbnails') colorClass = 'bg-neoncyan';

    const barHtml = `
      <div class="space-y-1.5 w-full">
        <div class="flex justify-between text-xs font-semibold">
          <span class="text-zinc-300">${c}</span>
          <span class="text-zinc-500">${count} prompts (${Math.round(percentage)}%)</span>
        </div>
        <div class="w-full bg-zinc-800/60 rounded-full h-2">
          <div class="${colorClass} h-2 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', barHtml);
  });
}

// CRUD Form Handles
async function handlePromptSubmit(event) {
  event.preventDefault();

  const title = document.getElementById('prompt-form-title').value.trim();
  const category = document.getElementById('prompt-form-category').value;
  const description = document.getElementById('prompt-form-description').value.trim();
  const promptText = document.getElementById('prompt-form-text').value.trim();
  const tagsText = document.getElementById('prompt-form-tags').value.trim();

  if (!title || !description || !promptText || !tagsText) return;

  const tags = tagsText.split(',').map(t => t.trim()).filter(t => t.length > 0);

  try {
    const newPrompt = await ApiService.createPrompt({
      title,
      category,
      description,
      promptText,
      tags
    });

    showToast("Prompt Deployed", `"${newPrompt.title}" added to active grid library.`, "success");
    event.target.reset();
    
    // Update active grids & stats
    updateHomeStats();
    updateAdminUI();
    renderPromptsGrid();
  } catch (err) {
    showToast("Publishing Failed", "System error writing prompt database file.", "error");
  }
}

async function handleVaultSubmit(event) {
  event.preventDefault();

  const title = document.getElementById('vault-form-title').value.trim();
  const category = document.getElementById('vault-form-category').value;
  const description = document.getElementById('vault-form-description').value.trim();
  const fileSize = document.getElementById('vault-form-size').value.trim();
  const readTime = document.getElementById('vault-form-time').value.trim();
  const tagsText = document.getElementById('vault-form-tags').value.trim();

  if (!title || !description || !fileSize || !readTime || !tagsText) return;

  const tags = tagsText.split(',').map(t => t.trim()).filter(t => t.length > 0);

  try {
    const newResource = await ApiService.createResource({
      title,
      category,
      description,
      fileSize,
      readTime,
      tags
    });

    showToast("Resource Published", `"${newResource.title}" added to the vault.`, "success");
    event.target.reset();
    
    // Update active grids & stats
    updateHomeStats();
    updateAdminUI();
    renderVaultGrid();
  } catch (err) {
    showToast("Publishing Failed", "System error writing resource database file.", "error");
  }
}

function renderAdminDatabaseManagement() {
  const container = document.getElementById('admin-items-list');
  if (!container) return;

  container.innerHTML = '';
  
  // Render Prompts list header
  container.insertAdjacentHTML('beforeend', `<h4 class="text-[10px] font-bold text-neonviolet uppercase tracking-widest border-b border-white/5 pb-2 mb-2">Deployed GPT Prompts</h4>`);
  
  appState.prompts.forEach(p => {
    const itemHtml = `
      <div class="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs gap-3">
        <div class="flex-grow">
          <span class="font-bold text-white block">${p.title}</span>
          <span class="text-[9px] text-zinc-500 font-mono">${p.category} &bull; ${p.tags.join(', ')}</span>
        </div>
        <button onclick="deletePrompt('${p.id}')" class="text-zinc-600 hover:text-rose-500 p-1.5" aria-label="Delete prompt from database">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', itemHtml);
  });

  // Render Resources list header
  container.insertAdjacentHTML('beforeend', `<h4 class="text-[10px] font-bold text-neoncyan uppercase tracking-widest border-b border-white/5 pb-2 mt-6 mb-2">Deployed Vault Resources</h4>`);
  
  appState.resources.forEach(r => {
    const itemHtml = `
      <div class="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs gap-3">
        <div class="flex-grow">
          <span class="font-bold text-white block">${r.title}</span>
          <span class="text-[9px] text-zinc-500 font-mono">${r.category} &bull; ${r.fileSize}</span>
        </div>
        <button onclick="deleteResource('${r.id}')" class="text-zinc-600 hover:text-rose-500 p-1.5" aria-label="Delete resource from database">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', itemHtml);
  });
}

async function deletePrompt(id) {
  const p = appState.prompts.find(x => x.id === id);
  if (!p) return;

  if (confirm(`Are you sure you want to delete "${p.title}"? This will permanently remove it from library and user bookmarks.`)) {
    await ApiService.deletePrompt(id);
    showToast("Deleted", "Prompt deleted from database.", "info");
    updateHomeStats();
    updateAdminUI();
    renderPromptsGrid();
  }
}

async function deleteResource(id) {
  const r = appState.resources.find(x => x.id === id);
  if (!r) return;

  if (confirm(`Are you sure you want to delete "${r.title}"? This will permanently remove it from resources.`)) {
    await ApiService.deleteResource(id);
    showToast("Deleted", "Resource deleted from database.", "info");
    updateHomeStats();
    updateAdminUI();
    renderVaultGrid();
  }
}


// ==========================================
// 10. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Mock DB
  initializeState();

  // Populate UI counters & render home stats
  updateHomeStats();

  // Draw initial home view
  switchView('home');

  // Add listener for responsive window resizing to redraw SVGs on grid changes
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (appState.currentView === 'admin') {
        drawAnalyticsChart();
      }
    }, 150);
  });

  // Initialize Theme from localStorage or system preference
  const initTheme = () => {
      if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  };
  initTheme();

  // Theme switch listener
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
          const isDark = document.documentElement.classList.toggle('dark');
          localStorage.setItem('theme', isDark ? 'dark' : 'light');
      });
  }
});
