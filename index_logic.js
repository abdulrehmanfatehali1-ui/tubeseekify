
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithCustomToken, sendEmailVerification } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getDatabase, ref, onValue, child, set, get, remove, update, push } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

        // ========================================================
        // 1. GLOBAL FUNCTION DECLARATIONS
        // ========================================================

        const IMGBB_API_KEY = '3fd88cc5d866ae088a56843cc3533035';
        const appId = 'tubeseekify-v4'; 

        window._authReadyCallbacks = window._authReadyCallbacks || [];
        window._firebaseReady = false;

        window.handleLogout = async () => { 
            try {
                window.state.currentTab = 'home';
                if (window.state.user) {
                    localStorage.removeItem('ts_cart_' + window.state.user.uid);
                }
                localStorage.removeItem('ts_cached_settings');
                localStorage.removeItem('ts_cached_posts');
                localStorage.removeItem('ts_announcement_closed');
                window.sessionStorage.clear();
                
                // Purge all browser cookies to destroy server-side sessions
                try {
                    document.cookie.split(";").forEach(function(c) {
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                    });
                } catch (e) {
                    console.warn("Cookie purge failed:", e);
                }
                
                window.state.user = null;
                window.state.userProfile = {};
                window.state.savedPosts = [];
                window.state.userNotifications = [];
                window.state.cart = [];

                await signOut(window._auth); 
                window.notify("Session Terminated Successfully.", "success");
                window.location.hash = 'home'; 
                setTimeout(() => { window.location.reload(); }, 600);
            } catch (error) {
                console.error("Logout Error:", error);
                window.notify("Error logging out.", "error");
                setTimeout(() => { window.location.reload(); }, 600);
            }
        };

        window.handleGoogleLogin = async () => {
            try {
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                const cred = await signInWithPopup(window._auth, provider);
                const profileRef = ref(window._db, `artifacts/${appId}/users/${cred.user.uid}/profile/data`);
                const snap = await get(profileRef);
                if (!snap.exists()) {
                    await set(profileRef, { 
                        email: cred.user.email, 
                        name: cred.user.displayName || cred.user.email.split('@')[0], 
                        avatarUrl: cred.user.photoURL || '' 
                    });
                }
                window.notify("Login successful!", "success");
                window.location.hash = 'home';
            } catch (error) { 
                console.error("Google Auth Error:", error);
                window.notify("Google Login Failed", "error"); 
            }
        };

        // --- THEME TOGGLE ENGINE ---
        const updateThemeUI = () => {
            const isDark = document.documentElement.classList.contains('dark');
            const label = document.getElementById('theme-toggle-label');
            const track = document.getElementById('theme-toggle-track');
            const knob = document.getElementById('theme-toggle-knob');
            if (label) {
                if (isDark) {
                    label.innerHTML = `<svg style="width:14px;height:14px;fill:none;stroke:#f59e0b;stroke-width:2;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> Light Mode`;
                } else {
                    label.innerHTML = `<svg style="width:14px;height:14px;fill:none;stroke:#60a5fa;stroke-width:2;" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> Dark Mode`;
                }
            }
            if (track) track.style.background = isDark ? '#2563eb' : '#27272a';
            if (knob) knob.style.transform = isDark ? 'translateX(16px)' : 'translateX(0)';
        };
        window.toggleTheme = () => {
            const isDark = document.documentElement.classList.contains('dark');
            if (isDark) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            }
            updateThemeUI();
        };
        // Initialize theme UI on load
        setTimeout(updateThemeUI, 100);

        // Restore sidebar collapse state on load
        const collapsedVal = localStorage.getItem('ts_sidebar_collapsed');
        if (collapsedVal === '0') {
            // Expand it!
            document.body.classList.remove('sidebar-collapsed');
            const icon = document.getElementById('collapse-icon');
            if (icon) icon.style.transform = '';
            
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.style.width = '280px';
                sidebar.style.borderRightColor = '';
                sidebar.style.boxShadow = '';
            }

            const wrapper = document.querySelector('.main-content-wrapper');
            if (wrapper && window.innerWidth >= 1024) {
                wrapper.style.paddingLeft = '280px';
            }
        } else {
            // Default to collapsed (collapsedVal === '1' or null)
            document.body.classList.add('sidebar-collapsed');
            const icon = document.getElementById('collapse-icon');
            if (icon) icon.style.transform = 'rotate(180deg)';
            
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.style.width = '0px';
                sidebar.style.borderRightColor = 'transparent';
                sidebar.style.boxShadow = 'none';
            }

            const wrapper = document.querySelector('.main-content-wrapper');
            if (wrapper && window.innerWidth >= 1024) {
                wrapper.style.paddingLeft = '0px';
            }
        }

        // --- DECLARATIVE FIREBASE LOGIN/SIGNUP HANDLERS ---
        window.handleEmailLogin = async (e) => {
            e.preventDefault();
            const emailEl = document.getElementById('login-email');
            const passEl = document.getElementById('login-password');
            if(!emailEl || !passEl) return;
            const email = emailEl.value.trim();
            const password = passEl.value;
            const btn = document.getElementById('login-btn-action');
            const origHtml = btn ? btn.innerHTML : '';
            if(btn) btn.innerHTML = '<span class="loader border-t-brand"></span>';
            try { 
                await signInWithEmailAndPassword(window._auth, email, password); 
                window.notify("Login successful.", "success");
                let defaultTab = 'home';
                if (window.state.settings && window.state.settings.tabOrder && window.state.settings.tabOrder.length > 0) {
                    defaultTab = window.state.settings.tabOrder[0];
                }
                window.location.hash = defaultTab;
            } catch(error) { 
                console.error("Login Error:", error);
                const friendlyMsg = error.code ? error.code.replace('auth/', '').replace(/-/g, ' ') : (error.message || "Authentication Failed");
                window.notify("Login Failed: " + friendlyMsg, "error"); 
                if(btn) btn.innerHTML = origHtml; 
            }
        };

        window.handleEmailSignup = async (e) => {
            e.preventDefault();
            const emailEl = document.getElementById('signup-email');
            const passEl = document.getElementById('signup-password');
            if(!emailEl || !passEl) return;
            const email = emailEl.value.trim();
            const password = passEl.value;
            const btn = document.getElementById('signup-btn-action');
            const origHtml = btn ? btn.innerHTML : '';
            if(btn) btn.innerHTML = '<span class="loader border-t-brand"></span>';
            try { 
                const cred = await createUserWithEmailAndPassword(window._auth, email, password); 
                try {
                    const actionCodeSettings = {
                    url: (window.location.origin.includes('localhost') ? window.location.origin + window.location.pathname : 'https://tubeseekify.online/index.html') + '#account',
                    handleCodeInApp: false
                };
                await sendEmailVerification(cred.user, actionCodeSettings);
                } catch(emailErr) {
                    console.error("Verification email failed to send:", emailErr);
                }
                await set(ref(window._db, `artifacts/${appId}/users/${cred.user.uid}/profile/data`), { 
                    email: email, 
                    name: email.split('@')[0], 
                    avatarUrl: '' 
                });
                window.notify("Account created! Verification email sent. ✉️", "success");
                window.location.hash = 'home'; 
            } catch(err) { 
                console.error("Signup Error:", err);
                window.notify(err.message || "Registration Failed", "error"); 
                if(btn) btn.innerHTML = origHtml;
            }
        };

        // --- EMAIL VERIFICATION DYNAMIC ACTIONS ---
        window.evVerifyNow = async (btn) => {
            const user = window._auth.currentUser;
            if (!user) return;
            
            const origHtml = btn.innerHTML;
            btn.innerHTML = '<svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Checking...';
            btn.disabled = true;
            
            try {
                await user.reload();
                const updatedUser = window._auth.currentUser;
                if (updatedUser.emailVerified) {
                    window.notify("Email verified successfully! 🎉", "success");
                    
                    // Force refresh token to trigger onAuthStateChanged with fresh verified state!
                    await updatedUser.getIdToken(true);
                    
                    // Close the modal
                    const evModal = document.getElementById('email-verification-modal');
                    if (evModal) {
                        evModal.classList.add('hidden');
                        evModal.classList.remove('flex');
                    }
                    // Trigger a reload of UI
                    window.renderUI();
                } else {
                    window.notify("Email not verified yet. Please check your inbox and click the verification link.", "error");
                }
            } catch(e) {
                console.error("Verification reload error:", e);
                window.notify(e.message || "Failed to check status", "error");
            } finally {
                btn.innerHTML = origHtml;
                btn.disabled = false;
            }
        };

        window.evResendEmail = async (btn) => {
            const user = window._auth.currentUser;
            if (!user) return;
            
            const origText = btn.textContent;
            btn.textContent = "Sending Link...";
            btn.disabled = true;
            
            try {
                const actionCodeSettings = {
                    url: (window.location.origin.includes('localhost') ? window.location.origin + window.location.pathname : 'https://tubeseekify.online/index.html') + '#account',
                    handleCodeInApp: false
                };
                await sendEmailVerification(user, actionCodeSettings);
                window.notify("Verification email resent successfully! ✉️", "success");
                
                // Add a cooldown to prevent spam
                let cooldown = 60;
                btn.textContent = `Resend in ${cooldown}s`;
                const interval = setInterval(() => {
                    cooldown--;
                    if (cooldown <= 0) {
                        clearInterval(interval);
                        btn.textContent = "Resend Verification Email";
                        btn.disabled = false;
                    } else {
                        btn.textContent = `Resend in ${cooldown}s`;
                    }
                }, 1000);
            } catch(e) {
                console.error("Verification resend error:", e);
                window.notify(e.message || "Failed to resend email", "error");
                btn.textContent = origText;
                btn.disabled = false;
            }
        };

        window.evLogout = async () => {
            try {
                window.state.currentTab = 'home';
                if (window.state.user) {
                    localStorage.removeItem('ts_cart_' + window.state.user.uid);
                }
                localStorage.removeItem('ts_cached_settings');
                localStorage.removeItem('ts_cached_posts');
                localStorage.removeItem('ts_announcement_closed');
                window.sessionStorage.clear();
                
                // Purge all browser cookies to destroy server-side sessions
                try {
                    document.cookie.split(";").forEach(function(c) {
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                    });
                } catch (e) {
                    console.warn("Cookie purge failed:", e);
                }
                
                window.state.user = null;
                window.state.userProfile = {};
                window.state.savedPosts = [];
                window.state.userNotifications = [];
                window.state.cart = [];

                await signOut(window._auth);
                // Hide modal
                const evModal = document.getElementById('email-verification-modal');
                if (evModal) {
                    evModal.classList.add('hidden');
                    evModal.classList.remove('flex');
                }
                window.notify("Logged out successfully.", "success");
                window.location.hash = 'home';
                setTimeout(() => { window.location.reload(); }, 600);
            } catch(e) {
                console.error("Verification logout error:", e);
                window.notify("Logout failed", "error");
                setTimeout(() => { window.location.reload(); }, 600);
            }
        };

        window.handleProfileUpdate = async () => {
            const btn = document.getElementById('prof-btn');
            if(btn) btn.innerHTML = '<span class="loader border-t-brand"></span>';
            const nameEl = document.getElementById('prof-name');
            const usernameEl = document.getElementById('prof-username');
            const bioEl = document.getElementById('prof-bio');
            const fileEl = document.getElementById('prof-avatar');
            
            const name = nameEl ? nameEl.value.trim() : '';
            const username = usernameEl ? usernameEl.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') : '';
            const bio = bioEl ? bioEl.value.trim() : '';
            const file = fileEl && fileEl.files ? fileEl.files[0] : null;
            let avatarUrl = window.state.userProfile.avatarUrl || '';
            
            if (username && username.length < 3) {
                window.notify("Username must be at least 3 alphanumeric characters.", "error");
                if(btn) btn.innerText = 'Save Profile Info';
                return;
            }
            
            if (file) {
                const formData = new FormData(); formData.append('image', file);
                try {
                    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                    const data = await res.json();
                    if(data.success) avatarUrl = data.data.url;
                } catch(e) {
                    console.error("Upload error", e);
                }
            }
            
            if (window.state.user) {
                await update(ref(window._db, `artifacts/${appId}/users/${window.state.user.uid}/profile/data`), { name, username, bio, avatarUrl });
                window.notify("Profile Data Updated!");
            }
            if(btn) btn.innerText = 'Save Profile Info';
        };

        // ========================================================
        // 2. BULLETPROOF EVENT DELEGATION
        // ========================================================
        document.addEventListener('click', (e) => {
            const sidebarLink = e.target.closest('.sidebar-link');
            if (sidebarLink) {
                if (window.innerWidth >= 1024) {
                    if (!document.body.classList.contains('sidebar-collapsed')) {
                        window.toggleDesktopCollapse();
                    }
                } else {
                    const sidebar = document.getElementById('sidebar');
                    const overlay = document.getElementById('mobile-overlay');
                    if (sidebar) sidebar.classList.add('-translate-x-full');
                    if (overlay) overlay.classList.add('hidden');
                }
            }
            if (e.target.closest('.google-btn-action')) {
                e.preventDefault();
                window.handleGoogleLogin();
            }
            if (e.target.closest('.logout-btn-action')) {
                e.preventDefault();
                window.handleLogout();
            }
            if (e.target.closest('.profile-update-btn')) {
                e.preventDefault();
                window.handleProfileUpdate();
            }
        });

        // ========================================================
        // 3. FIREBASE CONFIGURATION
        // ========================================================
        const firebaseConfig = { 
            apiKey: "AIzaSyDqExPH13jdQjm3VtH07qEs-jaEJStHD7U",
            authDomain: "tubeseekify-de53a.firebaseapp.com",
            databaseURL: "https://tubeseekify-de53a-default-rtdb.firebaseio.com",
            projectId: "tubeseekify-de53a",
            storageBucket: "tubeseekify-de53a.firebasestorage.app",
            messagingSenderId: "707363881566",
            appId: "1:707363881566:web:da6c86575b8047ae61aacf"
        };
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getDatabase(app);
        window._auth = auth;
        window._db = db;

        window.isPriceFree = (price) => {
            if (!price) return true;
            const pStr = String(price).trim().toLowerCase();
            if (pStr.includes('free')) return true;
            const digitsOnly = pStr.replace(/[^0-9]/g, '');
            if (digitsOnly !== '' && parseInt(digitsOnly, 10) === 0) return true;
            if (pStr === '0' || pStr === 'rs 0' || pStr === 'rs:0' || pStr === 'rs.0') return true;
            return false;
        };

        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js").then(({ browserLocalPersistence, setPersistence }) => {
            setPersistence(auth, browserLocalPersistence).catch(() => {});
        });

        let cachedSettings = null, cachedPosts = null;
        try { cachedSettings = localStorage.getItem('ts_cached_settings'); } catch(e) {}
        try { cachedPosts = localStorage.getItem('ts_cached_posts'); } catch(e) {}

        window.state = { 
            user: null, userProfile: {}, savedPosts: [], userNotifications: [],
            currentTab: 'home', selectedCategory: 'All Posts', // Keeping this variable for internal state safety
            currentPost: null, visiblePostsCount: 12,
            posts: cachedPosts ? JSON.parse(cachedPosts) : [], comments: [],
            settings: cachedSettings ? JSON.parse(cachedSettings) : { banners: [], categories: [], footerText: '', contactEmail: '', socials: {}, privacyPolicy: '', termsConditions: '' }, 
            searchQuery: '', currentSlide: 0,
            authLoading: false,
            dataLoaded: !!cachedPosts
        };

        let currentCommentsListener = null;

        window.getUserBadgesHtml = (userId, isAdmin) => {
            let badges = '';
            if (isAdmin) {
                badges += `<span class="inline-flex items-center gap-1 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider shadow-sm mr-1">👑 Owner</span>`;
            }
            const purchases = window.state.purchases || {};
            let isPremium = false;
            for (const key in purchases) {
                const p = purchases[key];
                if (p.userId === userId && p.status === 'approved') {
                    isPremium = true;
                    break;
                }
            }
            if (isPremium) {
                badges += `<span class="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider shadow-sm mr-1">💎 Premium</span>`;
            } else if (!isAdmin) {
                badges += `<span class="inline-flex items-center gap-1 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider shadow-sm mr-1">🚀 Explorer</span>`;
            }
            return badges;
        };

        // Utility
        window.slugify = (text) => {
            if(!text) return '';
            return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
        };

        // Strip HTML tags + markdown symbols for card preview excerpts
        window.stripDesc = (raw, maxLen = 130) => {
            if (!raw) return '';
            // Remove HTML tags
            let clean = raw.replace(/<[^>]*>/g, ' ');
            // Remove markdown headings ## ### ####
            clean = clean.replace(/#{1,6}\s*/g, '');
            // Remove markdown bold/italic ** __ * _
            clean = clean.replace(/(\*\*|__|\*|_)/g, '');
            // Remove markdown links [text](url)
            clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            // Collapse whitespace
            clean = clean.replace(/\s+/g, ' ').trim();
            // Truncate
            if (clean.length > maxLen) clean = clean.substring(0, maxLen).trimEnd() + '…';
            return clean;
        };

        window.notify = (msg, type = 'success') => {
            const toast = document.getElementById('notification-toast');
            const icon = document.getElementById('toast-icon');
            const msgEl = document.getElementById('toast-message');
            if(toast && icon && msgEl) {
                msgEl.innerText = msg;
                if(type === 'error') {
                    toast.classList.add('error');
                    icon.innerHTML = `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`;
                    icon.classList.replace('text-brand', 'text-red-500');
                } else {
                    toast.classList.remove('error');
                    icon.innerHTML = `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`;
                    icon.classList.replace('text-red-500', 'text-brand');
                }
                toast.classList.add('show');
                setTimeout(() => { toast.classList.remove('show'); }, 3500);
            }
        };

        const getEmbedUrl = (url) => {
            if(!url) return '';
            let videoId = '';
            if(url.includes('youtube.com/watch?v=')) { videoId = url.split('v=')[1].split('&')[0]; return `https://www.youtube.com/embed/${videoId}?autoplay=1`; } 
            else if(url.includes('youtu.be/')) { videoId = url.split('youtu.be/')[1].split('?')[0]; return `https://www.youtube.com/embed/${videoId}?autoplay=1`; }
            return url;
        };

        const getResourceIcon = (type) => {
            if(type === 'Tool') return `<svg class="w-3 h-3 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;
            if(type === 'GPT') return `<svg class="w-3 h-3 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>`;
            return `<svg class="w-3 h-3 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
        };

        window.toggleSidebar = () => {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('mobile-overlay');
            if(sidebar) sidebar.classList.toggle('-translate-x-full');
            if(overlay) overlay.classList.toggle('hidden');
        };

        window.toggleDesktopCollapse = () => {
            document.body.classList.toggle('sidebar-collapsed');
            const isCollapsed = document.body.classList.contains('sidebar-collapsed');
            localStorage.setItem('ts_sidebar_collapsed', isCollapsed ? '1' : '0');
            const icon = document.getElementById('collapse-icon');
            if (icon) icon.style.transform = isCollapsed ? 'rotate(180deg)' : '';
            
            // Dynamically adjust sidebar inline style to override style="width:280px;"!
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.style.width = isCollapsed ? '0px' : '280px';
                sidebar.style.borderRightColor = isCollapsed ? 'transparent' : '';
                sidebar.style.boxShadow = isCollapsed ? 'none' : '';
            }

            // Dynamically adjust main content wrapper padding inline
            const wrapper = document.querySelector('.main-content-wrapper');
            if (wrapper) {
                if (window.innerWidth >= 1024) {
                    wrapper.style.paddingLeft = isCollapsed ? '0px' : '280px';
                } else {
                    wrapper.style.paddingLeft = ''; // Reset on mobile
                }
            }
        };

        window.closeAnnouncement = () => {
            const bar = document.getElementById('announcement-bar');
            if (bar) bar.classList.add('hidden');
            if (window.state.settings && window.state.settings.announcementText) {
                localStorage.setItem('ts_announcement_closed', window.state.settings.announcementText);
            }
        };

        window.setCategory = (cat) => { window.state.selectedCategory = cat; window.state.visiblePostsCount = 12; window.renderPostsGrid(); };
        window.loadMorePosts = () => { window.state.visiblePostsCount += 12; window.renderPostsGrid(); };

        window.formatPromptPreview = (content, filledValues = {}) => {
            const variableRegex = /\[\[\s*([^\]]+?)\s*\]\]/g;
            return content.replace(variableRegex, (match, varName) => {
                const trimmedVar = varName.trim();
                const value = filledValues[trimmedVar];
                if (value) {
                    return `<span class="bg-blue-500 text-white px-2 py-0.5 rounded-md font-extrabold shadow-sm animate-pulse">${value}</span>`;
                } else {
                    return `<span class="bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-md font-black">[[${trimmedVar}]]</span>`;
                }
            });
        };

        window.updatePlaygroundPrompt = (idx) => {
            const inputs = document.querySelectorAll(`.prompt-playground-input[data-prompt-idx="${idx}"]`);
            const filledValues = {};
            inputs.forEach(input => {
                const varName = input.getAttribute('data-var-name');
                const val = input.value.trim();
                if (val) {
                    filledValues[varName] = val;
                }
            });
            window.state.promptFilledValues = window.state.promptFilledValues || {};
            window.state.promptFilledValues[idx] = filledValues;
            
            const originalContent = window.state.promptContents[idx] || '';
            const formatted = window.formatPromptPreview(originalContent, filledValues);
            
            const previewEl = document.getElementById(`prompt-preview-${idx}`);
            if (previewEl) {
                const lines = formatted.split('\n');
                previewEl.innerHTML = lines.map((line, lineIdx) => `
                    <div class="flex min-w-0">
                        <span class="w-8 text-right pr-3 text-zinc-600 select-none font-mono text-[11px] border-r border-zinc-800 mr-3.5 shrink-0">${lineIdx + 1}</span>
                        <span class="flex-1 font-mono text-[13px] text-zinc-100 break-all leading-relaxed whitespace-pre-wrap">${line || ' '}</span>
                    </div>
                `).join('');
            }
        };

        window.copyPrompt = (btn, idx) => {
            const originalContent = window.state.promptContents[idx] || '';
            const filledValues = (window.state.promptFilledValues && window.state.promptFilledValues[idx]) || {};
            
            const variableRegex = /\[\[\s*([^\]]+?)\s*\]\]/g;
            const finalContent = originalContent.replace(variableRegex, (match, varName) => {
                const trimmedVar = varName.trim();
                return filledValues[trimmedVar] || match;
            });

            navigator.clipboard.writeText(finalContent).then(() => {
                const originalHtml = btn.innerHTML;
                btn.innerHTML = `<svg class="w-3.5 h-3.5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
                btn.classList.add('bg-green-500', 'text-white');
                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    btn.classList.remove('bg-green-500', 'text-white');
                }, 2000);
            });
        };

        window.sharePost = (platform, title) => {
            let rawUrl = window.location.href;
            if (window.state.currentPost) {
                const p = window.state.currentPost;
                const descText = window.stripDesc ? window.stripDesc(p.desc || '', 150) : '';
                rawUrl = `${window.location.origin}/api/share?id=${p.id}&title=${encodeURIComponent(p.title || '')}&img=${encodeURIComponent(p.thumbnail || '')}&desc=${encodeURIComponent(descText)}`;
            }
            const currentUrl = encodeURIComponent(rawUrl); const text = encodeURIComponent(title); let shareUrl = '';
            if (platform === 'wa') shareUrl = `https://api.whatsapp.com/send?text=*Check this:* ${text}%0A${currentUrl}`;
            if (platform === 'tg') shareUrl = `https://t.me/share/url?url=${currentUrl}&text=${text}`;
            if (platform === 'tw') shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${currentUrl}`;
            if (shareUrl) window.open(shareUrl, '_blank');
        };

        window.requestPushNotificationPermission = async () => {
            if ("Notification" in window) {
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                    notify("Push notifications enabled! 🔔", "success");
                } else if (permission === "denied") {
                    notify("Push notifications blocked. Please enable them in browser settings.", "error");
                }
            } else {
                notify("Your browser does not support desktop push notifications.", "error");
            }
        };

        window.triggerBrowserPushNotification = (title, body) => {
            if ("Notification" in window && Notification.permission === "granted") {
                try {
                    new Notification(title, {
                        body: body,
                        icon: "https://i.postimg.cc/C1ppGZh3/Gemini-Generated-Image-c2b4vrc2b4vrc2b4-(1)-Picsart-Background-Remover.png"
                    });
                } catch(e) {
                    console.error("Push notification trigger error:", e);
                }
            }
        };

        window.getPostAverageRating = (postId) => {
            const commentsObj = window.state.allComments ? window.state.allComments[postId] : null;
            if (!commentsObj) return null;
            const commentsList = Object.values(commentsObj);
            const ratedComments = commentsList.filter(c => c.rating && typeof c.rating === 'number');
            if (ratedComments.length === 0) return null;
            const sum = ratedComments.reduce((acc, c) => acc + c.rating, 0);
            const avg = sum / ratedComments.length;
            return {
                average: avg.toFixed(1),
                count: ratedComments.length
            };
        };

        window.selectCommentRating = (val) => {
            window.state.selectedCommentRating = val;
            window.hoverCommentRating(val);
            const label = document.getElementById('rating-label');
            if (label) {
                const textMap = {1: 'Awful', 2: 'Bad', 3: 'Good', 4: 'Very Good', 5: 'Excellent'};
                label.innerText = textMap[val] || '';
                label.classList.remove('hidden');
            }
        };

        window.hoverCommentRating = (val) => {
            const btns = document.querySelectorAll('.comment-star-btn');
            btns.forEach(btn => {
                const starVal = parseInt(btn.getAttribute('data-star-val'), 10);
                if (starVal <= val) {
                    btn.classList.add('text-amber-400');
                    btn.classList.remove('text-gray-300');
                } else {
                    btn.classList.remove('text-amber-400');
                    btn.classList.add('text-gray-300');
                }
            });
        };

        window.restoreCommentRating = () => {
            const currentSelected = window.state.selectedCommentRating || 0;
            window.hoverCommentRating(currentSelected);
            const label = document.getElementById('rating-label');
            if (label) {
                if (currentSelected > 0) {
                    const textMap = {1: 'Awful', 2: 'Bad', 3: 'Good', 4: 'Very Good', 5: 'Excellent'};
                    label.innerText = textMap[currentSelected] || '';
                    label.classList.remove('hidden');
                } else {
                    label.classList.add('hidden');
                }
            }
        };

        window.copyPostLink = () => {
            let url = window.location.href;
            if (window.state.currentPost) {
                const p = window.state.currentPost;
                const descText = window.stripDesc ? window.stripDesc(p.desc || '', 150) : '';
                url = `${window.location.origin}/api/share?id=${p.id}&title=${encodeURIComponent(p.title || '')}&img=${encodeURIComponent(p.thumbnail || '')}&desc=${encodeURIComponent(descText)}`;
            }
            if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(url).then(() => { notify('Link copied!'); }).catch(()=>{}); } 
            else { const ta = document.createElement("textarea"); ta.value = url; ta.style.position="fixed"; ta.style.left="-999999px"; document.body.appendChild(ta); ta.focus(); ta.select(); try { document.execCommand('copy'); notify('Link copied!'); } catch(e){} ta.remove(); }
        };

        window.nextSlide = () => { if(!window.state.settings.banners?.length) return; window.state.currentSlide = (window.state.currentSlide + 1) % window.state.settings.banners.length; window.updateBannerDOM(); };
        window.prevSlide = () => { if(!window.state.settings.banners?.length) return; window.state.currentSlide = (window.state.currentSlide - 1 + window.state.settings.banners.length) % window.state.settings.banners.length; window.updateBannerDOM(); };

        window.updateBannerDOM = () => {
            const slides = document.querySelectorAll('.banner-slide'); const dots = document.querySelectorAll('.banner-dot'); const progressBar = document.getElementById('banner-progress');
            if(!slides.length) return;
            slides.forEach((slide, idx) => {
                if(idx === window.state.currentSlide) { slide.classList.remove('opacity-0', 'z-0'); slide.classList.add('opacity-100', 'z-10'); } 
                else { slide.classList.add('opacity-0', 'z-0'); slide.classList.remove('opacity-100', 'z-10'); }
            });
            dots.forEach((dot, idx) => {
                if(idx === window.state.currentSlide) { dot.classList.replace('w-3', 'w-10'); dot.classList.replace('bg-white/50', 'bg-brand'); dot.classList.remove('hover:bg-white'); } 
                else { dot.classList.replace('w-10', 'w-3'); dot.classList.replace('bg-brand', 'bg-white/50'); dot.classList.add('hover:bg-white'); }
            });
            if (progressBar) { progressBar.style.animation = 'none'; progressBar.offsetHeight; progressBar.style.animation = 'progress 5s linear infinite'; }
        };

        window.scrollRecommendations = (direction) => {
            const container = document.getElementById('rec-scroll-container');
            if(container) { const scrollAmount = direction === 'left' ? -350 : 350; container.scrollBy({ left: scrollAmount, behavior: 'smooth' }); }
        };

        if(!localStorage.getItem('cookies_accepted')) {
            setTimeout(() => {
                const banner = document.getElementById('cookie-banner');
                if(banner) {
                    banner.classList.remove('hidden');
                    banner.style.display = 'block';
                    // Force reflow then animate in
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            banner.style.transform = 'translateY(0)';
                        });
                    });
                }
            }, 2500);
        }
        window.toggleCookiePreferences = () => {
            const prefs = document.getElementById('cookie-preferences');
            if (prefs) prefs.classList.toggle('hidden');
        };
        window.rejectCookies = () => {
            localStorage.setItem('cookies_accepted', 'false');
            localStorage.removeItem('ts_cached_settings');
            localStorage.removeItem('ts_cached_posts');
            const banner = document.getElementById('cookie-banner');
            if(banner) {
                banner.style.transform = 'translateY(100%)';
                setTimeout(() => { banner.classList.add('hidden'); banner.style.display = 'none'; }, 500);
            }
            window.notify("Cookie preferences saved: Essential only.");
        };
        window.acceptCookies = () => {
            localStorage.setItem('cookies_accepted', 'true');
            const banner = document.getElementById('cookie-banner');
            if(banner) {
                banner.style.transform = 'translateY(100%)';
                setTimeout(() => { banner.classList.add('hidden'); banner.style.display = 'none'; }, 500);
            }
            localStorage.setItem('ts_cached_settings', JSON.stringify(window.state.settings));
            localStorage.setItem('ts_cached_posts', JSON.stringify(window.state.posts));
            window.notify('Preferences saved. Thank you!');
        };

        window.toggleSave = async (e, postId) => {
            if(e) e.stopPropagation();
            const { user, savedPosts } = window.state;
            if(!user || user.isAnonymous) { notify("Please log in to save.", "error"); window.location.hash = 'account'; return; }
            
            const isSaved = savedPosts.includes(postId);
            if (isSaved) window.state.savedPosts = savedPosts.filter(id => id !== postId); 
            else window.state.savedPosts.push(postId);
            
            if (window.state.currentPost) window.renderSinglePost(); else window.renderPostsGrid();

            const saveRef = ref(db, `artifacts/${appId}/users/${user.uid}/saved/${postId}`);
            try {
                if(isSaved) { await remove(saveRef); notify("Removed from Saved Items."); } 
                else { await set(saveRef, { savedAt: new Date().toISOString() }); notify("Saved successfully!"); }
            } catch(err) { 
                notify("Error synchronizing.", "error"); 
                if (isSaved) window.state.savedPosts.push(postId); else window.state.savedPosts = window.state.savedPosts.filter(id => id !== postId);
                if (window.state.currentPost) window.renderSinglePost(); else window.renderPostsGrid();
            }
        };

        window.submitComment = async () => {
            const input = document.getElementById('new-comment-text');
            const text = input.value.trim();
            if(!text) return;
            
            const { user, userProfile, currentPost } = window.state;
            if(!user || user.isAnonymous) { notify("Please login to comment.", "error"); window.location.hash = 'account'; return; }

            const btn = document.getElementById('submit-comment-btn');
            btn.innerHTML = '<span class="loader border-t-brand"></span>'; btn.disabled = true;

            try {
                const commentData = {
                    userId: user.uid,
                    userName: userProfile.name || user.email.split('@')[0],
                    userAvatar: userProfile.avatarUrl || '',
                    userUsername: userProfile.username || '',
                    text: text,
                    createdAt: new Date().toISOString()
                };

                const rating = window.state.selectedCommentRating || 0;
                if (rating > 0) {
                    commentData.rating = rating;
                }

                const newCommentRef = push(ref(db, `artifacts/${appId}/interactions/comments/${currentPost.id}`));
                await set(newCommentRef, commentData);
                
                await push(ref(db, `artifacts/${appId}/interactions/notifications`), {
                    postId: currentPost.id, commentId: newCommentRef.key, text: text,
                    userId: user.uid, userName: commentData.userName, userAvatar: commentData.userAvatar,
                    postTitle: currentPost.title, createdAt: new Date().toISOString(), read: false
                });

                input.value = ''; 
                window.state.selectedCommentRating = 0;
                window.restoreCommentRating();
                window.state.commentsExpanded = true;
                notify("Comment posted!");
            } catch(e) { notify("Failed to post comment", "error"); } 
            finally { btn.innerHTML = 'Comment'; btn.disabled = false; }
        };

        window.toggleCommentLike = async (commentId) => {
            const { user, currentPost } = window.state;
            if(!user || user.isAnonymous) return notify("Login required to interact", "error");
            
            const likeRef = ref(db, `artifacts/${appId}/interactions/comments/${currentPost.id}/${commentId}/likes/${user.uid}`);
            try {
                const snap = await get(likeRef);
                const isLiking = !snap.exists();
                if(snap.exists()) {
                    await remove(likeRef);
                } else {
                    await set(likeRef, true);
                    
                    // Fetch targeted comment details for notifications
                    const commentObj = window.state.comments?.find(c => c.id === commentId);
                    const commentText = commentObj ? commentObj.text : 'a comment';
                    const likerName = window.state.userProfile?.name || user.email.split('@')[0];
                    const likerAvatar = window.state.userProfile?.avatarUrl || '';
                    
                    // 1. Send notification to admin panel
                    await push(ref(db, `artifacts/${appId}/interactions/notifications`), {
                        postId: currentPost.id,
                        commentId: commentId,
                        type: 'like',
                        text: `liked a comment: "${commentText.substring(0, 60)}"`,
                        userId: user.uid,
                        userName: likerName,
                        userAvatar: likerAvatar,
                        postTitle: currentPost.title,
                        createdAt: new Date().toISOString(),
                        read: false
                    });
                    
                    // 2. Send targeted notification to comment owner
                    if (commentObj && commentObj.userId && commentObj.userId !== user.uid) {
                        const userNotifRef = push(ref(db, `artifacts/${appId}/users/${commentObj.userId}/notifications`));
                        await set(userNotifRef, {
                            postId: currentPost.id,
                            postTitle: currentPost.title || '',
                            commentId: commentId,
                            type: 'like',
                            text: `${likerName} liked your comment: "${commentText.substring(0, 60)}"`,
                            createdAt: new Date().toISOString(),
                            read: false
                        });
                    }
                }
            } catch(e) {}
        };

        window.toggleReplyBox = (commentId) => {
            const box = document.getElementById('reply-box-' + commentId);
            if (!box) return;
            const isHidden = box.classList.contains('hidden');
            document.querySelectorAll('[id^="reply-box-"]').forEach(b => b.classList.add('hidden'));
            if (isHidden) {
                box.classList.remove('hidden');
                const inp = box.querySelector('input');
                if (inp) inp.focus();
            }
        };

        window.submitReply = async (commentId) => {
            const { user, userProfile, currentPost } = window.state;
            if (!user || user.isAnonymous) { notify("Login required to reply", "error"); return; }
            const inp = document.getElementById('reply-input-' + commentId);
            const btn = document.getElementById('reply-btn-' + commentId);
            if (!inp) return;
            const text = inp.value.trim();
            if (!text) return;
            const origHtml = btn ? btn.innerHTML : '';
            if (btn) { btn.innerHTML = '<span class="loader border-t-brand"></span>'; btn.disabled = true; }
            try {
                const replyData = {
                    userId: user.uid,
                    userName: userProfile.name || user.email.split('@')[0],
                    userAvatar: userProfile.avatarUrl || '',
                    userUsername: userProfile.username || '',
                    text: text,
                    createdAt: new Date().toISOString(),
                    isAdmin: false
                };
                await push(ref(db, 'artifacts/' + appId + '/interactions/comments/' + currentPost.id + '/' + commentId + '/replies'), replyData);
                
                // Fetch targeted comment details for notifications
                const commentObj = window.state.comments?.find(c => c.id === commentId);
                
                // 1. Send notification to admin panel
                await push(ref(db, `artifacts/${appId}/interactions/notifications`), {
                    postId: currentPost.id,
                    commentId: commentId,
                    type: 'reply',
                    text: `replied to comment: "${text}"`,
                    userId: user.uid,
                    userName: replyData.userName,
                    userAvatar: replyData.userAvatar,
                    postTitle: currentPost.title,
                    createdAt: new Date().toISOString(),
                    read: false
                });
                
                // 2. Send targeted notification to comment owner
                if (commentObj && commentObj.userId && commentObj.userId !== user.uid) {
                    const userNotifRef = push(ref(db, `artifacts/${appId}/users/${commentObj.userId}/notifications`));
                    await set(userNotifRef, {
                        postId: currentPost.id,
                        postTitle: currentPost.title || '',
                        commentId: commentId,
                        type: 'reply',
                        text: `${replyData.userName} replied to your comment: "${text}"`,
                        createdAt: new Date().toISOString(),
                        read: false
                    });
                }

                inp.value = '';
                const box = document.getElementById('reply-box-' + commentId);
                if (box) box.classList.add('hidden');
                notify("Reply posted!");
            } catch(e) {
                notify("Failed to post reply", "error");
            } finally {
                if (btn) { btn.innerHTML = origHtml; btn.disabled = false; }
            }
        };

        window.openNotifications = () => {
            const { user } = window.state;
            if(!user || user.isAnonymous) return notify("Log in to view notifications", "error");
            document.getElementById('user-notif-panel').classList.remove('hidden');
            
            // Instantly clear badges visually (YouTube-style)
            const sbBadge = document.getElementById('user-sidebar-notif-badge');
            const mbBadge = document.getElementById('user-mobile-notif-badge');
            if (sbBadge) sbBadge.classList.add('hidden');
            if (mbBadge) mbBadge.classList.add('hidden');
            
            // Mark notifications as read server-side immediately
            window.markUserNotifsRead();
            
            window.renderUserNotifications();
        };
        
        window.closeNotifications = () => {
            const panel = document.getElementById('user-notif-panel');
            if(panel) panel.classList.add('hidden');
        };

        window.markUserNotifsRead = async () => {
            const unread = window.state.userNotifications.filter(n => !n.read);
            if(unread.length === 0) return;
            const updates = {};
            unread.forEach(n => { updates[`artifacts/${appId}/users/${window.state.user.uid}/notifications/${n.id}/read`] = true; });
            try { await update(ref(db), updates); notify("All notifications marked as read"); } catch(e) {}
        };

        // --- RENDERERS ---
        window.renderUserNotifications = () => {
            try {
                const list = document.getElementById('user-notifs-list');
                if(!list) return;
                if(window.state.userNotifications.length === 0) {
                    list.innerHTML = `<div class="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-[10px] border-2 border-dashed border-gray-300 rounded-3xl mx-2">No alerts detected.</div>`;
                    return;
                }
                list.innerHTML = window.state.userNotifications.map(n => {
                    const isUnread = !n.read;
                    const bgClass = isUnread ? 'bg-yellow-50/50 border-[#FFE345] shadow-sm hover:shadow-md' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm';
                    
                    // Robust postLink resolution by post ID or fallback postTitle
                    let postLink = '';
                    if (n.postId && window.state.posts) {
                        const matchedPost = window.state.posts.find(p => p.id === n.postId);
                        if (matchedPost) {
                            postLink = window.slugify(matchedPost.title);
                        }
                    }
                    if (!postLink && n.postTitle) {
                        postLink = window.slugify(n.postTitle);
                    }
                    
                    return `
                    <div class="p-5 rounded-2xl border-2 cursor-pointer transition-all flex gap-4 items-start relative group ${bgClass}" onclick="window.location.hash='${postLink}'; window.closeNotifications();">
                        ${isUnread ? `<span class="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border border-white animate-pulse"></span>` : ''}
                        <div class="w-10 h-10 rounded-full bg-dark text-brand flex items-center justify-center font-black flex-shrink-0 text-sm border-2 border-gray-200">TS</div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs text-gray-800 font-medium pr-4 leading-relaxed">${n.text}</p>
                            <p class="text-[9px] text-gray-400 font-bold mt-2 uppercase tracking-widest bg-gray-100 px-2.5 py-1 rounded-md w-max">${(() => { try { const d = new Date(n.createdAt); return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString(); } catch(e) { return 'Recent'; } })()}</p>
                        </div>
                    </div>`;
                }).join('');
            } catch(e) { console.error("Notification Render Error:", e); }
        };

        window.renderSidebar = () => {
            try {
                let tabs = [
                    { id: 'home', icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`, label: 'Tutorials' },
                    { id: 'gems', icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>`, label: 'GPTs' },
                    { id: 'prompts', icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`, label: 'Prompts' },
                    { id: 'tools', icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`, label: 'Tools' },
                    { id: 'apps', icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`, label: 'Apps' },
                    { id: 'shop', icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`, label: 'Shop' },
                    { id: 'cart', icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`, label: 'Cart' },
                    { id: 'saved', icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`, label: 'Saved' },
                    { id: 'account', icon: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`, label: 'Account' }
                ];
                
                const order = window.state.settings?.tabOrder;
                if (order && Array.isArray(order)) {
                    tabs.sort((a, b) => {
                        let idxA = order.indexOf(a.id);
                        let idxB = order.indexOf(b.id);
                        if (idxA === -1) idxA = 999;
                        if (idxB === -1) idxB = 999;
                        return idxA - idxB;
                    });
                }
                
                const navContainer = document.getElementById('nav-links');
                if(navContainer) {
                    navContainer.innerHTML = tabs.map(tab => {
                        const isActive = window.state.currentTab === tab.id && !window.state.currentPost;
                        let badgeHtml = '';
                        if (tab.id === 'cart') {
                            const cartCount = (window.state.cart || []).length;
                            if (cartCount > 0) {
                                badgeHtml = `<span class="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-auto shadow-glow-red animate-pulse">${cartCount}</span>`;
                            }
                        }
                        return `
                        <a href="#${tab.id}" class="sidebar-link flex items-center gap-4 w-full px-4 py-3 rounded-xl mb-1 font-semibold transition-all text-sm ${isActive ? 'active' : 'text-gray-400 hover:text-white'}">
                            ${tab.icon}
                            <span class="sidebar-link-label" style="font-family:'Montserrat',sans-serif;font-size:13px;font-weight:${isActive?'700':'600'};">${tab.label}</span>
                            ${badgeHtml}
                        </a>`;
                    }).join('');
                }
                
                const s = window.state.settings;
                if(document.getElementById('sidebar-bio')) document.getElementById('sidebar-bio').innerText = s.footerText || '';
                if(document.getElementById('footer-bio')) document.getElementById('footer-bio').innerText = s.footerText || '';
                
                if(document.getElementById('footer-email') && s.contactEmail) {
                    document.getElementById('footer-email').innerHTML = `<a href="mailto:${s.contactEmail}" class="flex items-center justify-center md:justify-start"><svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> ${s.contactEmail}</a>`;
                }

                let socialsHtml = '';
                if(s.socials?.youtube) socialsHtml += `<a href="${s.socials.youtube}" target="_blank" rel="noreferrer" class="w-10 h-10 border border-white/10 bg-white/5 rounded-full flex items-center justify-center hover:bg-brand hover:text-black transition-all hover:scale-110 shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon fill="currentColor" class="text-[#111]" points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg></a>`;
                if(s.socials?.whatsapp) socialsHtml += `<a href="${s.socials.whatsapp}" target="_blank" rel="noreferrer" class="w-10 h-10 border border-white/10 bg-white/5 rounded-full flex items-center justify-center hover:bg-green-500 hover:text-white transition-all hover:scale-110 shadow-sm"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg></a>`;
                if(s.socials?.telegram) socialsHtml += `<a href="${s.socials.telegram}" target="_blank" rel="noreferrer" class="w-10 h-10 border border-white/10 bg-white/5 rounded-full flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all hover:scale-110 shadow-sm"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></a>`;
                if(s.socials?.instagram) socialsHtml += `<a href="${s.socials.instagram}" target="_blank" rel="noreferrer" class="w-10 h-10 border border-white/10 bg-white/5 rounded-full flex items-center justify-center hover:bg-pink-500 hover:text-white transition-all hover:scale-110 shadow-sm"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>`;
                if(s.socials?.tiktok) socialsHtml += `<a href="${s.socials.tiktok}" target="_blank" rel="noreferrer" class="w-10 h-10 border border-white/10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all hover:scale-110 shadow-sm"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></a>`;
                
                if(document.getElementById('sidebar-socials')) document.getElementById('sidebar-socials').innerHTML = socialsHtml;
                if(document.getElementById('footer-socials')) document.getElementById('footer-socials').innerHTML = socialsHtml;
            } catch(e) { console.error("Sidebar Render Error:", e); }
        };

        window.renderPostsGrid = () => {
            try {
                const gridContainer = document.getElementById('posts-grid-container');
                const categoryPillsContainer = document.getElementById('category-pills-container');
                if(!gridContainer) return;

                const { currentTab, posts, searchQuery, selectedCategory, savedPosts, user, settings, visiblePostsCount } = window.state;
                const isLoggedIn = user && !user.isAnonymous;

                if (categoryPillsContainer && settings.categories) {
                    let visibleCategories = [];
                    if (currentTab === 'home') visibleCategories = settings.categories.filter(c => c.type === 'video');
                    else if (currentTab === 'gems') visibleCategories = settings.categories.filter(c => c.type === 'gpt');
                    else if (currentTab === 'tools') visibleCategories = settings.categories.filter(c => c.type === 'tool');
                    else if (currentTab === 'prompts') visibleCategories = settings.categories.filter(c => c.type === 'prompt');
                    else if (currentTab === 'apps') visibleCategories = settings.categories.filter(c => c.type === 'app');
                    else if (currentTab === 'shop') visibleCategories = settings.categories.filter(c => c.type === 'shop');

                    const allActive = selectedCategory === 'All Posts';
                    let pillsHtml = `<button onclick="window.setCategory('All Posts')" class="flex-shrink-0 whitespace-nowrap text-[13px] transition-all duration-200 ${allActive ? 'bg-[var(--color-primary)] text-white font-bold px-5 py-2 rounded-xl shadow-md shadow-blue-500/10' : 'text-[var(--text-muted)] hover:text-[var(--text-title)] font-bold py-2'}">All</button>`;
                    
                    visibleCategories.forEach(cat => {
                        const isActive = selectedCategory === cat.name;
                        pillsHtml += `<button onclick="window.setCategory('${cat.name}')" class="flex-shrink-0 whitespace-nowrap text-[13px] transition-all duration-200 ${isActive ? 'bg-[var(--color-primary)] text-white font-bold px-5 py-2 rounded-xl shadow-md shadow-blue-500/10' : 'text-[var(--text-muted)] hover:text-[var(--text-title)] font-bold py-2'}">${cat.name}</button>`;
                    });
                    categoryPillsContainer.innerHTML = pillsHtml;
                }

                const filteredPosts = posts.filter(post => {
                    if (currentTab === 'saved') return savedPosts.includes(post.id);
                    const titleText = post.title || "";
                    const safeSearch = searchQuery || '';
                    const matchesSearch = titleText.toString().toLowerCase().includes(safeSearch.toLowerCase());
                    const matchesCategory = selectedCategory === 'All Posts' || post.category === selectedCategory;
                    
                    const pType = post.type || 'video';
                    if (currentTab === 'home') return pType === 'video' && matchesSearch && matchesCategory;
                    if (currentTab === 'gems') return pType === 'gpt' && matchesSearch && matchesCategory;
                    if (currentTab === 'shop') return pType === 'shop' && matchesSearch && matchesCategory;
                    if (currentTab === 'tools') return pType === 'tool' && matchesSearch && matchesCategory;
                    if (currentTab === 'prompts') return pType === 'prompt' && matchesSearch && matchesCategory;
                    if (currentTab === 'apps') return pType === 'app' && matchesSearch && matchesCategory;
                    return false;
                });

                // Sort: pinned posts first
                filteredPosts.sort((a, b) => {
                    const pinA = a.pinned ? 1 : 0;
                    const pinB = b.pinned ? 1 : 0;
                    return pinB - pinA;
                });

                const visiblePostsToRender = filteredPosts.slice(0, visiblePostsCount);

            // Show skeleton if data not yet loaded
            if (!window.state.dataLoaded && filteredPosts.length === 0 && currentTab !== 'saved') {
                const skeletonHtml = Array(6).fill(0).map(() => `
                    <div class="aic-card border-none bg-gray-50 h-full">
                        <div class="skeleton" style="width:100%;aspect-ratio:16/9;border-radius:16px 16px 0 0;"></div>
                        <div style="padding:20px;">
                            <div class="skeleton" style="width:100%;height:20px;margin-bottom:8px;border-radius:4px;"></div>
                            <div class="skeleton" style="width:70%;height:20px;margin-bottom:16px;border-radius:4px;"></div>
                            <div class="skeleton" style="width:100%;height:14px;margin-bottom:8px;border-radius:4px;"></div>
                            <div class="skeleton" style="width:40%;height:14px;margin-bottom:24px;border-radius:4px;"></div>
                            <div class="skeleton" style="width:100%;height:36px;border-radius:8px;"></div>
                        </div>
                    </div>`).join('');
                gridContainer.innerHTML = skeletonHtml;
                return;
            }

            let html = '';
            if(filteredPosts.length === 0) {
                html = `
                <div class="col-span-full py-16 px-4 text-center flex flex-col items-center justify-center animate-fade-in w-full">
                    <div class="relative overflow-hidden w-full max-w-lg p-10 md:p-12 rounded-[32px] bg-gradient-to-b from-[var(--bg-card)] to-[var(--color-light)] border border-[var(--border-primary)] shadow-2xl backdrop-blur-xl flex flex-col items-center transition-all duration-300 hover:shadow-primary/5">
                        <!-- Decorative background glow -->
                        <div class="absolute -top-12 -left-12 w-32 h-32 bg-[var(--color-primary)]/10 rounded-full blur-2xl pointer-events-none"></div>
                        <div class="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                        
                        <!-- Premium Glass Icon Container -->
                        <div class="relative mb-8 flex items-center justify-center w-20 h-20 rounded-3xl bg-[var(--color-light)] border border-[var(--border-primary)] shadow-md group">
                            <div class="absolute inset-0 rounded-3xl bg-gradient-to-br from-[var(--color-primary)]/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <!-- Icon with soft pulse -->
                            <svg class="w-10 h-10 text-[var(--color-primary)] animate-pulse" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                        </div>
                        
                        <!-- Sleek Typography -->
                        <h3 class="text-2xl font-black text-[var(--text-title)] tracking-tight font-display mb-3 uppercase tracking-[0.05em] text-transparent bg-clip-text bg-gradient-to-r from-[var(--text-title)] to-[var(--text-muted)]">No Content Available</h3>
                        <p class="text-xs text-[var(--text-muted)] font-bold max-w-sm leading-relaxed mb-8 text-center">We are actively preparing new premium resources for this section. Check back in a bit or explore other tabs!</p>
                        
                        <!-- Dynamic exploration link/button -->
                        <button onclick="window.location.hash='home'" class="px-6 py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-hover)] text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2 border-0 cursor-pointer">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg> Back to Homepage
                        </button>
                    </div>
                </div>`;
            } else {
                visiblePostsToRender.forEach(p => {
                    const isSaved = savedPosts.includes(p.id);
                    let saveLabel = isSaved ? 'Saved' : (isLoggedIn ? 'Save' : 'Login to save');
                    const postLink = window.slugify(p.title);

                    let formattedDate = 'N/A';
                    try {
                        const rawD = p.customDate || p.createdAt || null;
                        const dObj = rawD ? new Date(rawD) : new Date();
                        if (!isNaN(dObj.getTime())) formattedDate = dObj.toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'});
                    } catch(e) {}
                    const authorName = p.authorName || 'TubeSeekify';
                    const authorDateHtml = `
                        <div class="flex items-center gap-4 text-[11px] text-[var(--text-muted)] font-semibold mb-5 border-t border-[var(--border-primary)]/40 pt-4 mt-auto">
                            <div class="flex items-center gap-1.5 flex-1 min-w-0">
                                <svg class="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                <span class="truncate">${authorName}</span>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <svg class="w-3.5 h-3.5 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                <span>${formattedDate}</span>
                            </div>
                        </div>
                    `;

                    let priceHtml = '';
                    let isOutOfStock = false;
                    if (p.type === 'shop') {
                        const priceVal = p.price || 'Premium';
                        if (window.isPriceFree(priceVal)) {
                            priceHtml = `<span class="aic-price-pill-free ml-2">Free</span>`;
                        } else {
                            priceHtml = `<span class="aic-price-pill ml-2">${priceVal}</span>`;
                        }
                        
                        if (p.stock !== undefined && p.stock !== null) {
                            if (p.stock === 0) {
                                isOutOfStock = true;
                                priceHtml += `<span class="inline-flex items-center bg-red-500/10 text-red-500 text-[9px] font-black px-2 py-0.5 rounded-lg border border-red-500/20 shadow-sm ml-2">❌ Sold Out</span>`;
                            } else if (p.stock <= 10) {
                                priceHtml += `<span class="inline-flex items-center bg-amber-500/10 text-amber-600 text-[9px] font-black px-2 py-0.5 rounded-lg border border-amber-500/20 shadow-sm ml-2 animate-pulse">⏳ Only ${p.stock} Left</span>`;
                            } else {
                                priceHtml += `<span class="inline-flex items-center bg-emerald-500/10 text-emerald-600 text-[9px] font-black px-2 py-0.5 rounded-lg border border-emerald-500/20 shadow-sm ml-2">✔️ Stock: ${p.stock}</span>`;
                            }
                        }
                    }

                    const ratingData = window.getPostAverageRating(p.id);
                    const ratingBadgeHtml = ratingData ? `
                        <span class="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 text-[10px] font-black px-2 py-0.5 rounded-lg border border-amber-500/20 shadow-sm ml-2">
                            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            ${ratingData.average} (${ratingData.count})
                        </span>
                    ` : '';

                    const escapedTitle = (p.title || 'Post').replace(/'/g, "\\'");
                    let cardActionsHtml = `<button onclick="event.stopPropagation(); window.location.hash='${postLink}';" class="aic-btn animate-fade-in" style="margin-top: 0; width: 100%;">Visit Now</button>`;
                    if (p.type === 'shop' && !window.isPriceFree(p.price || 'Premium')) {
                        const escapedPrice = (p.price || 'Premium').replace(/'/g, "\\'");
                        if (isOutOfStock) {
                            cardActionsHtml = `
                                <div class="flex gap-2.5 mt-auto pt-3 w-full animate-fade-in">
                                    <button onclick="event.stopPropagation(); window.location.hash='${postLink}';" class="bg-[var(--color-light)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--text-title)] border border-[var(--border-primary)] font-black py-3 rounded-xl transition-all flex items-center justify-center text-[10px] uppercase tracking-wider active:scale-95 duration-200 cursor-pointer flex-1 gap-1">Details</button>
                                    <button class="bg-red-950/40 text-red-400 border border-red-900/30 font-black py-3 rounded-xl flex items-center justify-center text-[10px] uppercase tracking-wider flex-1 gap-1 cursor-not-allowed" disabled>Sold Out</button>
                                </div>
                            `;
                        } else {
                            cardActionsHtml = `
                                <div class="flex gap-2.5 mt-auto pt-3 w-full animate-fade-in">
                                    <button onclick="event.stopPropagation(); window.location.hash='${postLink}';" class="bg-[var(--color-light)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--text-title)] border border-[var(--border-primary)] font-black py-3 rounded-xl transition-all flex items-center justify-center text-[10px] uppercase tracking-wider active:scale-95 duration-200 cursor-pointer flex-1 gap-1">Details</button>
                                    <button onclick="event.stopPropagation(); window.addToCart('${p.id}', '${escapedTitle}', '${escapedPrice}', '${p.thumbnail}');" class="bg-[var(--color-primary)] hover:bg-[var(--color-hover)] text-white border border-transparent font-black py-3 rounded-xl transition-all flex items-center justify-center text-[10px] uppercase tracking-wider active:scale-95 duration-200 cursor-pointer flex-1 gap-1 shadow-md">🛍️ Add Cart</button>
                                </div>
                            `;
                        }
                    }

                    html += `
                    <div class="aic-card" onclick="window.location.hash='${postLink}'">
                        <div class="aic-card-img">
                            <img src="${p.thumbnail}" onerror="this.src='https://via.placeholder.com/600x400/111111/FFE345?text=TubeSeekify'" alt="${p.title}" loading="lazy"/>
                            ${p.pinned ? `<span class="aic-badge-pinned"><svg class="w-2.5 h-2.5 inline-block mr-1 fill-current" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></polygon></svg>Pinned</span>` : ''}
                            ${p.tag ? `<span class="aic-badge-tag">${p.tag}</span>` : ''}
                        </div>
                        <div class="aic-card-body">
                            <div class="aic-card-top">
                                <span class="aic-category-pill">${p.category || 'General'}</span>
                                ${ratingBadgeHtml}
                                ${priceHtml}
                                <button onclick="event.stopPropagation(); window.toggleSave(event, '${p.id}')" class="aic-save-btn ${isSaved ? 'saved' : ''}" title="${saveLabel}">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                </button>
                            </div>
                            <h3 class="aic-title">${p.title}</h3>
                            <p class="aic-desc">${window.stripDesc(p.desc)}</p>
                            ${authorDateHtml}
                            ${cardActionsHtml}
                        </div>
                    </div>`;
                });
                
                if (filteredPosts.length > visiblePostsCount) {
                    html += `
                    <div class="col-span-full flex justify-center mt-6 mb-12">
                        <button onclick="window.loadMorePosts()" class="bg-[var(--color-primary)] text-white hover:bg-[var(--color-hover)] px-10 py-3.5 rounded-xl font-bold text-[13px] uppercase tracking-widest transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0 duration-200">
                            Load More
                        </button>
                    </div>`;
                }
            }
            gridContainer.innerHTML = html;
            } catch(e) { console.error("Grid Render Error:", e); }
        };

        window.renderComments = () => {
            try {
                const list = document.getElementById('comments-list');
                const countEl = document.getElementById('comments-count');
                if(!list || !countEl) return;

                const comments = window.state.comments || [];
                countEl.innerText = comments.length;

                if(comments.length === 0) {
                    list.innerHTML = `<div class="bg-white dark:bg-zinc-900 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-3xl p-10 text-center mt-4"><p class="text-gray-400 font-bold text-xs uppercase tracking-widest">No comments available. Be the first to start the discussion!</p></div>`;
                    return;
                }

                const { user } = window.state;
                const uid = user ? user.uid : null;
                const isExpanded = window.state.commentsExpanded || false;

                // Render only first comment when collapsed, all comments when expanded
                const commentsToRender = isExpanded ? comments : [comments[0]];

                let html = commentsToRender.map(c => {
                    const date = (() => { try { const d = new Date(c.createdAt); return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString(); } catch(e) { return 'Recent'; } })();
                    const avatar = (c.userAvatar && c.userAvatar !== 'null') ? `<img src="${c.userAvatar}" class="w-12 h-12 rounded-full object-cover border-2 border-[var(--border-primary)] shadow-sm flex-shrink-0">` : `<div class="w-12 h-12 bg-dark text-brand font-black flex items-center justify-center rounded-full text-sm border-2 border-[var(--border-primary)] shadow-sm flex-shrink-0">${(c.userName||'U').charAt(0).toUpperCase()}</div>`;
                    const likesCount = c.likes ? Object.keys(c.likes).length : 0;
                    const isLiked = c.likes && uid && c.likes[uid];
                    
                    const starsHtml = c.rating ? `<div class="flex gap-0.5 text-amber-400 mb-2">${Array.from({length: c.rating}).map(() => `<svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`).join('')}</div>` : '';
                    
                    const adminLoveHtml = c.adminLiked ? `<span class="inline-flex items-center text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-1.5 rounded-lg ml-3 border border-red-100 dark:border-red-950/50 shadow-sm"><svg class="w-3 h-3 mr-1.5 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg> Loved by Owner</span>` : '';
                    
                    let adminReplyHtml = '';
                    if (c.adminReply) {
                        const adminReplyDate = (() => { try { const d = new Date(c.adminReplyAt || c.createdAt); return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString(); } catch(e) { return 'Recent'; } })();
                        adminReplyHtml = `
                        <div class="flex gap-3 mt-4 ml-4 md:ml-8 items-start bg-blue-50/30 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-500/20 shadow-sm">
                            <div class="w-10 h-10 bg-[var(--color-primary)] text-white font-black flex items-center justify-center rounded-full text-xs shadow-md border-2 border-[var(--color-primary)]/20 flex-shrink-0">
                                A
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center flex-wrap gap-y-1 mb-1.5">
                                    <span class="text-xs font-black text-[var(--text-title)]">Admin</span>
                                    <span class="bg-[var(--color-primary)] text-white text-[9px] font-black px-2 py-0.5 rounded-lg ml-2 uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                        <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                        Owner
                                    </span>
                                    <span class="text-[10px] text-[var(--text-muted)] ml-auto font-bold bg-[var(--color-light)] px-2 py-0.5 rounded-md">${adminReplyDate}</span>
                                </div>
                                <p class="text-sm text-[var(--text-body)] font-medium leading-relaxed break-words">${c.adminReply}</p>
                            </div>
                        </div>`;
                    }

                    let repliesHtml = '';
                    if(c.replies) {
                        const replyVals = Object.entries(c.replies).map(([k,v]) => ({id:k,...v}));
                        repliesHtml = replyVals.sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt)).map(r => {
                            const rAvatar = (r.userAvatar && r.userAvatar !== 'null')
                                ? `<img src="${r.userAvatar}" class="w-10 h-10 rounded-full object-cover border-2 border-[var(--border-primary)] flex-shrink-0">`
                                : `<div class="w-10 h-10 bg-dark text-brand font-black flex items-center justify-center rounded-full text-xs shadow-md border-2 border-[var(--border-primary)] flex-shrink-0">${(r.userName||'U').charAt(0).toUpperCase()}</div>`;
                            const isOwner = r.isAdmin ? `<span class="bg-[var(--color-primary)] text-white text-[9px] font-black px-2.5 py-1 rounded-lg ml-3 uppercase tracking-wider shadow-sm flex items-center gap-1"><svg class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Owner</span>` : '';
                            return `
                            <div class="flex gap-3 mt-4 ml-4 md:ml-8 items-start">
                                ${rAvatar}
                                <div class="flex-1 bg-[var(--bg-card-raw)] p-4 rounded-2xl rounded-tl-none border border-[var(--border-primary)] shadow-sm">
                                    <div class="flex items-center flex-wrap gap-y-1 mb-1.5">
                                        <span class="text-xs font-black text-[var(--text-title)]">${r.userName}</span>
                                        ${r.userUsername ? `<span class="text-[11px] font-semibold text-[var(--text-muted)] ml-1.5">@${r.userUsername}</span>` : ''}
                                        <span class="ml-2">${window.getUserBadgesHtml(r.userId, r.isAdmin || r.userId === 'admin')}</span>
                                        <span class="text-[10px] text-[var(--text-muted)] ml-auto font-bold bg-[var(--color-light)] px-2 py-0.5 rounded-md">${(() => { try { const d = new Date(r.createdAt); return isNaN(d.getTime()) ? 'Recent' : d.toLocaleDateString(); } catch(e) { return 'Recent'; } })()}</span>
                                    </div>
                                    <p class="text-sm text-[var(--text-body)] font-medium leading-relaxed break-words">${r.text}</p>
                                </div>
                            </div>`;
                        }).join('');
                    }

                    const replyInputHtml = `
                        <div id="reply-box-${c.id}" class="hidden mt-4 flex gap-3 items-center">
                            <input id="reply-input-${c.id}" type="text" placeholder="Write a reply..." class="flex-1 bg-[var(--bg-card-raw)] border border-[var(--border-primary)] focus:border-[var(--color-primary)] rounded-2xl px-5 py-3 text-sm font-medium outline-none transition-all text-[var(--text-title)] placeholder-[var(--text-muted)]" onkeydown="if(event.key==='Enter') window.submitReply('${c.id}')"/>
                            <button id="reply-btn-${c.id}" onclick="window.submitReply('${c.id}')" class="bg-[var(--color-primary)] text-white hover:bg-[var(--color-hover)] px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2">
                                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> Send
                            </button>
                        </div>`;

                    return `
                    <div class="flex gap-4 md:gap-5 group bg-[var(--bg-card)] p-6 md:p-8 rounded-[32px] border border-[var(--border-primary)] shadow-sm hover:border-[var(--color-primary)] transition-all animate-fade-in">
                        ${avatar}
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center flex-wrap gap-y-2 mb-2">
                                <span class="text-sm font-black text-[var(--text-title)]">${c.userName}</span>
                                ${c.userUsername ? `<span class="text-xs font-semibold text-[var(--text-muted)] ml-1.5">@${c.userUsername}</span>` : ''}
                                <span class="ml-2">${window.getUserBadgesHtml(c.userId, c.isAdmin || c.userId === 'admin')}</span>
                                <span class="text-[10px] text-[var(--text-muted)] ml-auto font-bold bg-[var(--color-light)] px-2 py-1 rounded-md uppercase tracking-widest">${date}</span>
                                ${adminLoveHtml}
                            </div>
                            ${starsHtml}
                            <p class="text-sm md:text-[15px] text-[var(--text-body)] font-medium leading-relaxed break-words">${c.text}</p>
                            
                            <div class="flex items-center gap-3 mt-4 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button onclick="window.toggleCommentLike('${c.id}')" class="flex items-center text-[11px] uppercase tracking-widest font-black transition-all px-4 py-2.5 rounded-xl border-2 ${isLiked ? 'text-[var(--color-primary)] bg-[var(--color-light)] border-[var(--color-primary)]/30 shadow-sm' : 'text-[var(--text-muted)] bg-[var(--bg-card-raw)] border-[var(--border-primary)] hover:text-[var(--text-title)] hover:border-[var(--color-primary)] active:scale-95'}">
                                    <svg class="w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                                    ${likesCount > 0 ? `${likesCount} Likes` : 'Like'}
                                </button>
                                <button onclick="window.toggleReplyBox('${c.id}')" class="flex items-center text-[11px] uppercase tracking-widest font-black transition-all px-4 py-2.5 rounded-xl border-2 text-[var(--text-muted)] bg-[var(--bg-card-raw)] border-[var(--border-primary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] active:scale-95">
                                    <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                                    Reply${c.replies ? ' (' + Object.keys(c.replies).length + ')' : ''}
                                </button>
                            </div>
                            ${replyInputHtml}
                            ${adminReplyHtml}
                            ${repliesHtml}
                        </div>
                    </div>`;
                }).join('');

                // Expand/Collapse drawer toggle button
                if (comments.length > 1) {
                    const actionLabel = isExpanded ? 'Collapse Discussions' : `View All Comments (${comments.length})`;
                    const actionIcon = isExpanded 
                        ? `<svg class="w-4 h-4 transition-transform rotate-180" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"></polyline></svg>`
                        : `<svg class="w-4 h-4 transition-transform animate-bounce" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
                    
                    html += `
                    <div class="flex justify-center mt-6">
                        <button onclick="window.state.commentsExpanded = !window.state.commentsExpanded; window.renderComments();" class="flex items-center gap-2.5 px-8 py-4 bg-[var(--bg-card)] hover:bg-[var(--color-light)] text-[var(--color-primary)] border-2 border-[var(--border-primary)] hover:border-[var(--color-primary)] rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-md active:scale-95 cursor-pointer">
                            ${actionLabel} ${actionIcon}
                        </button>
                    </div>`;
                }

                list.innerHTML = html;
            } catch(e) { console.error("Comments Render Error:", e); }
        };

        window.renderSinglePost = () => {
            try {
                const container = document.getElementById('main-container');
                const { currentPost, savedPosts, user, userProfile } = window.state;
                if(!currentPost || !container) return;
                const escapedTitle = (currentPost.title || 'Post').replace(/'/g, "\\'");

                // Dynamic SEO Meta Tag Updates for browser tab title, social previews and crawlers
                try {
                    if (currentPost.title) {
                        document.title = `${currentPost.title} - TubeSeekify`;
                        
                        const setMeta = (propertyType, keyName, val) => {
                            let meta = document.querySelector(`meta[${propertyType}="${keyName}"]`);
                            if (!meta) {
                                meta = document.createElement('meta');
                                meta.setAttribute(propertyType, keyName);
                                document.head.appendChild(meta);
                            }
                            meta.setAttribute('content', val);
                        };

                        setMeta('property', 'og:title', currentPost.title);
                        setMeta('property', 'og:description', window.stripDesc ? window.stripDesc(currentPost.desc || '', 150) : (currentPost.desc || '').slice(0, 150));
                        if (currentPost.thumbnail) {
                            setMeta('property', 'og:image', currentPost.thumbnail);
                            setMeta('itemprop', 'image', currentPost.thumbnail);
                        }
                        setMeta('property', 'og:url', window.location.href);
                        
                        // Twitter Card tags
                        setMeta('name', 'twitter:title', currentPost.title);
                        setMeta('name', 'twitter:description', window.stripDesc ? window.stripDesc(currentPost.desc || '', 150) : (currentPost.desc || '').slice(0, 150));
                        if (currentPost.thumbnail) {
                            setMeta('name', 'twitter:image', currentPost.thumbnail);
                        }
                    }
                } catch (seoErr) {
                    console.error("Dynamic SEO Update Error:", seoErr);
                }

                const isSaved = savedPosts.includes(currentPost.id);
                const isLoggedIn = user && !user.isAnonymous;
                const saveButtonText = isSaved ? 'Saved to Bookmarks' : (isLoggedIn ? 'Save for Later' : 'Login to Save');

                const ratingData = window.getPostAverageRating(currentPost.id);
                const ratingBadgeHtml = ratingData ? `
                    <span class="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-500 text-[12px] font-black px-4 py-2 rounded-xl border border-amber-500/20 shadow-sm">
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        ${ratingData.average} (${ratingData.count} Reviews)
                    </span>
                ` : '';

                let mediaHtml = '';
                if(currentPost.videoUrl && currentPost.type === 'video') {
                    mediaHtml = `<div class="w-full aspect-video rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl relative border-[6px] border-white bg-black"><iframe src="${getEmbedUrl(currentPost.videoUrl)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen class="absolute inset-0 w-full h-full"></iframe></div>`;
                } else {
                    mediaHtml = `<div class="bg-black aspect-video rounded-[32px] md:rounded-[48px] overflow-hidden shadow-2xl relative flex items-center justify-center group border-[6px] border-white"><img src="${currentPost.thumbnail}" class="absolute inset-0 w-full h-full object-cover opacity-80"/></div>`;
                }

                let promptsHtml = '';
                if(currentPost.type === 'prompt' && currentPost.promptsData && currentPost.promptsData.length > 0) {
                    promptsHtml = `
                    <div id="post-prompts-container" class="mt-14 space-y-8 animate-fade-in">
                        ${currentPost.promptsData.map((pr, idx) => {
                            window.state.promptContents = window.state.promptContents || {};
                            window.state.promptContents[idx] = pr.content || '';
                            window.state.promptFilledValues = window.state.promptFilledValues || {};
                            window.state.promptFilledValues[idx] = window.state.promptFilledValues[idx] || {};

                            const contentStr = pr.content || '';
                            const variables = [];
                            let match;
                            const variableRegex = /\[\[\s*([^\]]+?)\s*\]\]/g;
                            variableRegex.lastIndex = 0;
                            while ((match = variableRegex.exec(contentStr)) !== null) {
                                const varName = match[1].trim();
                                if (!variables.includes(varName)) {
                                    variables.push(varName);
                                }
                            }

                            let playgroundFormHtml = '';
                            if (variables.length > 0) {
                                playgroundFormHtml = `
                                <div class="p-6 bg-slate-50 dark:bg-zinc-900 border-b border-[var(--border-primary)] flex flex-col gap-4">
                                    <div class="flex items-center gap-2 mb-2">
                                        <span class="bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border border-[var(--color-primary)]/20 animate-pulse">⚡ Interactive Playground</span>
                                        <p class="text-[11px] text-[var(--text-muted)] font-bold">Fill in the parameters below to customize your prompt in real-time!</p>
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        ${variables.map(v => `
                                            <div class="flex flex-col gap-1.5">
                                                <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest">${v}</label>
                                                <input type="text" placeholder="Enter ${v}..." data-prompt-idx="${idx}" data-var-name="${v}" oninput="window.updatePlaygroundPrompt(${idx})" class="prompt-playground-input w-full bg-white dark:bg-zinc-950 border border-[var(--border-primary)] focus:border-[var(--color-primary)] rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all text-[var(--text-title)] placeholder-[var(--text-muted)]"/>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>`;
                            }

                            const formattedContent = window.formatPromptPreview(contentStr, window.state.promptFilledValues[idx]);
                            
                            let displayTitle = (pr.title && pr.title.toLowerCase().trim() !== 'extract code') ? pr.title.trim() : 'Prompt Instructions';
                            displayTitle = displayTitle.replace(/\.(py|md|txt|js|json|html|css)$/i, '');

                            const lines = formattedContent.split('\n');
                            const promptWithLineNumbersHtml = lines.map((line, lineIdx) => `
                                <div class="flex min-w-0">
                                    <span class="w-8 text-right pr-3 text-zinc-600 select-none font-mono text-[11px] border-r border-zinc-800 mr-3.5 shrink-0">${lineIdx + 1}</span>
                                    <span class="flex-1 font-mono text-[13px] text-zinc-100 break-all leading-relaxed whitespace-pre-wrap">${line || ' '}</span>
                                </div>
                            `).join('');

                            return `
                            <div class="prompt-box border border-[var(--border-primary)] rounded-[32px] overflow-hidden bg-[var(--bg-card)] shadow-sm mb-6">
                                <div class="prompt-header p-5 bg-[var(--color-light)] border-b border-[var(--border-primary)] flex justify-between items-center">
                                    <div class="flex items-center gap-3">
                                        <div class="flex gap-1.5 mr-2">
                                            <span class="w-2.5 h-2.5 rounded-full bg-[#ef4444] opacity-80 shadow-sm shadow-red-500/10"></span>
                                            <span class="w-2.5 h-2.5 rounded-full bg-[#eab308] opacity-80 shadow-sm shadow-yellow-500/10"></span>
                                            <span class="w-2.5 h-2.5 rounded-full bg-[#22c55e] opacity-80 shadow-sm shadow-green-500/10"></span>
                                        </div>
                                        <span class="prompt-title-text font-black text-sm text-[var(--text-title)]">${displayTitle}</span>
                                    </div>
                                    <button onclick="window.copyPrompt(this, ${idx})" class="prompt-copy-btn bg-[var(--color-primary)] text-white hover:bg-[var(--color-hover)] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 border-0 flex items-center gap-1.5 cursor-pointer">
                                        <svg style="width:13px;height:13px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                        Copy
                                    </button>
                                </div>
                                ${playgroundFormHtml}
                                <div class="prompt-content-area p-6 bg-[#09090b]">
                                    <pre id="prompt-preview-${idx}" class="prompt-pre whitespace-pre-wrap break-all text-sm font-mono text-[var(--text-body)] leading-relaxed select-all" style="background:transparent; border:none; padding:0; margin:0; border-radius:0;">${promptWithLineNumbersHtml}</pre>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>`;
                }

                let extraActionHtml = '';
                if (currentPost.type === 'shop') {
                    const price = currentPost.price || 'Premium';
                    const isFree = window.isPriceFree(price);
                    const customBtnText = currentPost.buttonText || 'Download Product';
                    
                    // Stock availability layout integration
                    let stockInfoHtml = '';
                    let isOutOfStock = false;
                    if (currentPost.stock !== undefined && currentPost.stock !== null) {
                        if (currentPost.stock === 0) {
                            isOutOfStock = true;
                            stockInfoHtml = `
                                <div class="mb-4 flex items-center gap-2 px-4 py-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 font-extrabold text-[11px] uppercase tracking-wider shadow-sm justify-center animate-pulse">
                                    ❌ Out of Stock / Sold Out
                                </div>
                            `;
                        } else if (currentPost.stock <= 10) {
                            stockInfoHtml = `
                                <div class="mb-4 flex items-center gap-2 px-4 py-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-600 font-extrabold text-[11px] uppercase tracking-wider shadow-sm justify-center animate-bounce" style="animation-duration: 3s;">
                                    ⏳ Only ${currentPost.stock} units left in stock!
                                </div>
                            `;
                        } else {
                            stockInfoHtml = `
                                <div class="mb-4 flex items-center gap-2 px-4 py-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 font-extrabold text-[11px] uppercase tracking-wider shadow-sm justify-center">
                                    ✔️ In Stock (${currentPost.stock} units available)
                                </div>
                            `;
                        }
                    }
                    extraActionHtml += stockInfoHtml;
                    
                    if (isFree) {
                        if (isOutOfStock) {
                            extraActionHtml += `<div class="mb-6"><button class="w-full bg-red-950/40 border border-red-900/30 text-red-400 font-black py-5 rounded-2xl flex items-center justify-center text-xs uppercase tracking-[0.2em] cursor-not-allowed" disabled>❌ Out of Stock</button></div>`;
                        } else {
                            extraActionHtml += `<div class="mb-6"><a href="${currentPost.actionUrl}" target="_blank" rel="noreferrer" class="w-full bg-green-500 hover:bg-green-600 text-white font-black py-5 rounded-2xl transition-all shadow-2xl flex items-center justify-center text-xs uppercase tracking-[0.2em] group border-0">⚡ ${customBtnText} <svg class="w-4 h-4 ml-3 group-hover:translate-y-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></a></div>`;
                        }
                    } else {
                        const buyBtn = isOutOfStock ? `
                            <div class="flex flex-col gap-3 mb-6">
                                <button class="w-full bg-red-950/40 border border-red-900/30 text-red-400 font-black py-5 rounded-2xl flex items-center justify-center text-xs uppercase tracking-[0.2em] cursor-not-allowed" disabled>❌ Out of Stock</button>
                            </div>` : `
                            <div class="flex flex-col gap-3 mb-6">
                                <button onclick="window.openPaymentModal('${currentPost.id}', '${escapedTitle}', '${price}')" class="w-full bg-[var(--color-primary)] hover:bg-[var(--color-hover)] text-white border-0 font-black py-5 rounded-2xl transition-all shadow-2xl flex items-center justify-center text-xs uppercase tracking-[0.2em] active:scale-95 duration-200 cursor-pointer gap-2">🛒 Buy Now — ${price}</button>
                                <button onclick="window.addToCart('${currentPost.id}', '${escapedTitle}', '${price}', '${currentPost.thumbnail}')" class="w-full bg-[var(--color-light)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--text-title)] border-2 border-[var(--border-primary)] font-black py-4 rounded-2xl transition-all shadow-md flex items-center justify-center text-xs uppercase tracking-[0.2em] active:scale-95 gap-2 duration-200 cursor-pointer">🛍️ Add to Cart</button>
                            </div>`;
                        
                        if (!isLoggedIn) {
                            extraActionHtml += `<div class="mb-6"><button onclick="window.location.hash='account'; notify('Please authenticate to purchase.', 'error')" class="w-full bg-[var(--color-light)] border border-[var(--border-primary)] text-[var(--text-title)] font-black py-5 rounded-2xl transition-all shadow-sm flex items-center justify-center text-xs uppercase tracking-[0.2em] active:scale-95 gap-2">🔑 Login to Unlock Product</button></div>`;
                        } else {
                            const pId = `${user.uid}_${currentPost.id}`;
                            const purchase = window.state.purchases ? window.state.purchases[pId] : null;
                            
                            if (purchase && purchase.status === 'approved') {
                                const rem = purchase.remainingDownloads !== undefined ? purchase.remainingDownloads : purchase.quantity || 1;
                                if (rem > 0) {
                                    extraActionHtml += `<div class="mb-6"><button onclick="window.triggerProductDownload('${purchase.id}', '${currentPost.actionUrl}')" class="w-full bg-green-500 hover:bg-green-600 text-white font-black py-5 rounded-2xl transition-all shadow-2xl flex items-center justify-center text-xs uppercase tracking-[0.2em] active:scale-95 border-0 gap-2">⚡ ${customBtnText} — ${rem} Left <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></button></div>`;
                                } else {
                                    extraActionHtml += `
                                        <div class="mb-6 bg-rose-500/10 border-2 border-dashed border-rose-500/30 rounded-2xl p-5 text-center">
                                            <span class="inline-block text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5">❌ Download Limit Reached</span>
                                            <p class="text-[11px] text-[var(--text-muted)] font-semibold leading-relaxed mb-3">You have used up all ${purchase.quantity || 1} downloads for this purchase.</p>
                                            <button onclick="window.openPaymentModal('${currentPost.id}', '${escapedTitle}', '${price}')" class="w-full py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-hover)] text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md border-0 active:scale-95">🛒 Buy Again</button>
                                        </div>
                                    `;
                                }
                            } else if (purchase && purchase.status === 'pending') {
                            extraActionHtml += `
                                <div class="mb-6 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-2 border-dashed border-amber-500/30 rounded-2xl p-5 text-center animate-pulse">
                                    <span class="inline-block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1.5">⏳ Verification Pending</span>
                                    <p class="text-[11px] text-[var(--text-muted)] font-semibold leading-relaxed">Your TID: <strong class="text-[var(--text-title)]">${purchase.tid}</strong> is under review. The product will unlock instantly once the Admin approves your payment details.</p>
                                </div>
                            `;
                        } else if (purchase && purchase.status === 'rejected') {
                            extraActionHtml += `
                                <div class="mb-4 bg-red-500/10 border-2 border-dashed border-red-500/30 rounded-2xl p-5 text-center">
                                    <span class="inline-block text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5">❌ Payment Declined</span>
                                    <p class="text-[11px] text-[var(--text-muted)] font-semibold leading-relaxed mb-3">Your transaction details were declined by the admin. Please verify and re-submit your proof.</p>
                                    <button onclick="window.openPaymentModal('${currentPost.id}', '${escapedTitle}', '${price}')" class="w-full py-3 bg-red-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-600 border-0 active:scale-95 transition-all">Re-Submit Payment Info</button>
                                </div>
                            `;
                        } else {
                            extraActionHtml += buyBtn;
                        }
                    }
                }
            } else if(currentPost.actionUrl && currentPost.type !== 'video') {
                    let btnText = 'Open Resource';
                    if(currentPost.type === 'app') btnText = 'Download Application';
                    if(currentPost.type === 'gpt') btnText = 'Launch Custom GPT';
                    
                    extraActionHtml += `<div class="mb-6"><a href="${currentPost.actionUrl}" target="_blank" rel="noreferrer" class="w-full bg-gradient-to-r from-[var(--color-primary)] to-violet-500 hover:from-violet-500 hover:to-[var(--color-primary)] text-white border-0 font-black py-5 rounded-2xl transition-all shadow-2xl flex items-center justify-center text-xs uppercase tracking-[0.2em] group active:scale-95 duration-200 cursor-pointer">${btnText} <svg class="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg></a></div>`;
                }
                if (currentPost.type === 'gpt' && currentPost.videoUrl) {
                    extraActionHtml += `<div class="mb-8"><a href="${currentPost.videoUrl}" target="_blank" rel="noreferrer" class="w-full bg-red-50 hover:bg-red-500 hover:text-white text-red-600 border-[2px] border-red-200 hover:border-red-500 font-black py-5 rounded-2xl transition-all shadow-sm flex items-center justify-center text-xs uppercase tracking-[0.2em] group"><svg class="w-5 h-5 mr-3 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Watch Video Guide</a></div>`;
                }

                let resourcesHtml = '';
                if((currentPost.resources || []).length > 0) {
                    resourcesHtml = currentPost.resources.map((res, idx) => `
                        <a key="${idx}" href="${res.url}" target="_blank" rel="noreferrer" class="flex flex-col p-5 rounded-2xl premium-resource-item group transition-all">
                            <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">${getResourceIcon(res.type)} <span class="ml-1.5">${res.type || 'Tool'}</span></span>
                            <div class="flex justify-between items-center"><span class="font-black text-[var(--text-title)] text-sm tracking-tight">${res.name}</span><svg class="w-5 h-5 text-gray-400 group-hover:text-[var(--color-primary)] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></div>
                        </a>
                    `).join('');
                } else if(!currentPost.actionUrl || currentPost.type === 'video') {
                    resourcesHtml = `<p class="text-gray-400 font-bold text-[10px] uppercase text-center py-8 bg-[var(--color-light)] rounded-2xl border border-dashed border-[var(--border-primary)]">No extended links attached.</p>`;
                }

                
                const shareSection = `
                    <div class="mt-10 pt-8 border-t border-gray-200">
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5 text-center md:text-left">Share this content</p>
                        <div class="grid grid-cols-3 gap-4">
                            <button onclick="window.sharePost('wa', '${escapedTitle}')" class="bg-green-50 text-green-600 hover:bg-green-500 hover:text-white py-4 rounded-2xl flex flex-col justify-center items-center transition-all shadow-sm border border-transparent hover:border-green-600">
                                <svg class="w-6 h-6 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg><span class="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
                            </button>
                            <button onclick="window.sharePost('tg', '${escapedTitle}')" class="bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white py-4 rounded-2xl flex flex-col justify-center items-center transition-all shadow-sm border border-transparent hover:border-blue-600">
                                <svg class="w-6 h-6 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg><span class="text-[9px] font-black uppercase tracking-widest">Telegram</span>
                            </button>
                            <button onclick="window.sharePost('tw', '${escapedTitle}')" class="bg-gray-100 text-gray-700 hover:bg-black hover:text-white py-4 rounded-2xl flex flex-col justify-center items-center transition-all shadow-sm border border-transparent hover:border-black">
                                <svg class="w-5 h-5 mb-2.5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.95H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 4.15H5.039z"/></svg><span class="text-[9px] font-black uppercase tracking-widest">Twitter (X)</span>
                        </button>
                        </div>
                    </div>`;

                let recommendedHtml = '';
                if (currentPost.recommended) {
                    let recIds = [];
                    const rec = currentPost.recommended;
                    if (Array.isArray(rec)) {
                        recIds = rec.filter(Boolean);
                    } else if (typeof rec === 'object' && rec !== null) {
                        // Firebase stores arrays as objects with numeric keys {0: 'id1', 1: 'id2'}
                        recIds = Object.values(rec).filter(v => typeof v === 'string' && v.trim());
                    } else if (typeof rec === 'string') {
                        recIds = rec.split(',').map(s => s.trim()).filter(Boolean);
                    }
                    
                    // Match posts by id, slug, or title-based slug (robust matching)
                    const recPosts = window.state.posts.filter(p => {
                        const pSlug = window.slugify(p.title);
                        return recIds.some(rid => rid === p.id || rid === pSlug || window.slugify(rid) === pSlug);
                    });
                    
                    // Initial visible count for recs - show all (no artificial limit)
                    const recVisibleCount = recPosts.length; // show all matched
                    
                    if(recPosts.length > 0) {
                        const recCardsHtml = recPosts.map(p => {
                                    const isRecSaved = window.state.savedPosts.includes(p.id);
                                    const recPostLink = window.slugify(p.title);
                                    let saveLabelRec = isRecSaved ? 'Saved' : (isLoggedIn ? 'Save' : 'Login to save');
                                    return `
                                    <div onclick="window.location.hash='${recPostLink}'" style="flex:0 0 280px;width:280px;cursor:pointer;background:var(--bg-card);border:1px solid var(--border-primary);border-radius:20px;overflow:hidden;display:flex;flex-direction:column;transition:transform 0.2s,box-shadow 0.2s;box-shadow:0 4px 20px rgba(0,0,0,0.06);" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 32px rgba(0,0,0,0.12)';" onmouseout="this.style.transform='';this.style.boxShadow='0 4px 20px rgba(0,0,0,0.06)';">
                                        <div style="position:relative;overflow:hidden;aspect-ratio:16/9;background:#111;">
                                            <img src="${p.thumbnail}" onerror="this.src='https://via.placeholder.com/600x400/2563eb/ffffff?text=TubeSeekify'" loading="lazy" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.4s;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='';">
                                            ${p.tag ? `<span style="position:absolute;top:10px;left:10px;background:var(--color-primary);color:#fff;font-size:9px;font-weight:900;padding:4px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:0.1em;">${p.tag}</span>` : ''}
                                            <button onclick="event.stopPropagation(); window.toggleSave(event, '${p.id}')" style="position:absolute;top:10px;right:10px;width:32px;height:32px;background:rgba(0,0,0,0.5);border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);" title="${saveLabelRec}">
                                                <svg style="width:14px;height:14px;stroke:${isRecSaved?'#22c55e':'#fff'};fill:${isRecSaved?'#22c55e':'none'};" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                                            </button>
                                        </div>
                                        <div style="padding:14px 16px 16px;display:flex;flex-direction:column;flex:1;gap:8px;">
                                            <span style="font-size:10px;font-weight:800;color:var(--color-primary);text-transform:uppercase;letter-spacing:0.08em;">${p.category || 'General'}</span>
                                            <h4 style="font-size:13px;font-weight:800;color:var(--text-title);line-height:1.4;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${p.title}</h4>
                                            <p style="font-size:11px;color:var(--text-muted);line-height:1.5;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${window.stripDesc(p.desc, 90)}</p>
                                            <button onclick="event.stopPropagation();window.location.hash='${recPostLink}';" style="margin-top:auto;padding:9px 16px;background:var(--color-primary);color:#fff;border:none;border-radius:10px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='var(--color-hover)';" onmouseout="this.style.background='var(--color-primary)';">Visit Now</button>
                                        </div>
                                    </div>`;
                                }).join('');
                        recommendedHtml = `
                        <div class="mt-16 pt-10 border-t border-[var(--border-primary)]">
                            <div class="flex items-center justify-between mb-6">
                                <h3 style="font-size:18px;font-weight:900;color:var(--text-title);text-transform:uppercase;letter-spacing:-0.02em;display:flex;align-items:center;gap:10px;margin:0;">
                                    <span style="display:inline-flex;width:30px;height:30px;background:rgba(var(--color-primary-rgb),0.12);border-radius:8px;align-items:center;justify-content:center;">
                                        <svg style="width:14px;height:14px;" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    </span>
                                    Recommendations
                                </h3>
                                <span style="font-size:11px;font-weight:700;color:var(--text-muted);background:var(--color-light);padding:4px 12px;border-radius:20px;border:1px solid var(--border-primary);">${recPosts.length} post${recPosts.length !== 1 ? 's' : ''}</span>
                            </div>
                            <!-- Horizontal Scroll Row -->
                            <div style="position:relative;">
                                <div id="rec-hscroll" style="display:flex;gap:16px;overflow-x:auto;padding-bottom:16px;scroll-behavior:smooth;scrollbar-width:thin;scrollbar-color:var(--color-primary) var(--border-primary);" class="hide-scrollbar">
                                    ${recCardsHtml}
                                </div>
                                ${recPosts.length > 3 ? `
                                <div style="display:flex;justify-content:center;gap:10px;margin-top:12px;">
                                    <button onclick="document.getElementById('rec-hscroll').scrollBy({left:-310,behavior:'smooth'})" style="width:36px;height:36px;border-radius:50%;border:1px solid var(--border-primary);background:var(--bg-card);color:var(--text-title);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='var(--color-primary)';this.style.color='#fff';this.style.borderColor='var(--color-primary)';" onmouseout="this.style.background='var(--bg-card)';this.style.color='var(--text-title)';this.style.borderColor='var(--border-primary)';">
                                        <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                    </button>
                                    <button onclick="document.getElementById('rec-hscroll').scrollBy({left:310,behavior:'smooth'})" style="width:36px;height:36px;border-radius:50%;border:1px solid var(--border-primary);background:var(--bg-card);color:var(--text-title);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='var(--color-primary)';this.style.color='#fff';this.style.borderColor='var(--color-primary)';" onmouseout="this.style.background='var(--bg-card)';this.style.color='var(--text-title)';this.style.borderColor='var(--border-primary)';">
                                        <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </button>
                                </div>` : ''}
                            </div>
                        </div>`;
                    }
                }
                const userAvatarUrl = window.state.userProfile.avatarUrl || `https://via.placeholder.com/150/FFE345/111111?text=${window.state.userProfile.name ? window.state.userProfile.name.charAt(0) : 'U'}`;
            const commentInputHtml = isLoggedIn ? `
                <div class="flex gap-4 md:gap-5 mb-12 comment-input-wrap">
                    <img src="${userAvatarUrl}" class="w-12 h-12 rounded-full object-cover bg-gray-200 border-2 border-gray-300">
                    <div class="flex-1 bg-white p-2.5 rounded-3xl border-2 border-gray-200 focus-within:border-brand focus-within:shadow-md transition-all">
                        <!-- Golden Star Ratings Selector -->
                        <div class="flex items-center gap-1.5 px-4 pt-1 pb-2 border-b border-gray-100 mb-2">
                            <span class="text-[10px] font-black text-gray-400 uppercase tracking-wider mr-2">Rate Product:</span>
                            <div class="flex items-center gap-1">
                                ${[1,2,3,4,5].map(starNum => `
                                    <button type="button" onclick="window.selectCommentRating(${starNum})" onmouseover="window.hoverCommentRating(${starNum})" onmouseout="window.restoreCommentRating()" class="comment-star-btn text-gray-300 hover:scale-110 active:scale-95 transition-all border-0 bg-transparent p-0 cursor-pointer" data-star-val="${starNum}">
                                        <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    </button>
                                `).join('')}
                            </div>
                            <span id="rating-label" class="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-3 hidden"></span>
                        </div>
                        <input type="text" id="new-comment-text" placeholder="Share your thoughts publicly..." class="w-full bg-transparent outline-none px-4 py-3 text-sm text-[#111] font-medium placeholder-gray-400">
                        <div class="justify-end mt-2 hidden comment-actions gap-2 px-2 pb-2">
                            <button onclick="document.getElementById('new-comment-text').value=''; window.selectCommentRating(0);" class="px-5 py-2 text-xs font-black text-gray-500 hover:bg-gray-100 rounded-xl transition uppercase tracking-widest">Cancel</button>
                            <button onclick="window.submitComment()" id="submit-comment-btn" class="px-6 py-2 text-xs font-black bg-[#111] text-brand rounded-xl hover:bg-black shadow-lg transition uppercase tracking-[0.2em] border border-gray-800 active:scale-95">Comment</button>
                        </div>
                    </div>
                </div>` : `
                <div class="flex gap-5 mb-12 cursor-pointer group" onclick="window.location.hash='account'; notify('Please authenticate to comment.', 'error')">
                    <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center border-2 border-gray-300 group-hover:border-brand transition-colors"><svg class="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>
                    <div class="flex-1 bg-gray-50 border-2 border-gray-200 border-dashed rounded-3xl flex items-center px-6 group-hover:border-brand transition-colors"><p class="text-sm text-gray-500 font-bold tracking-widest uppercase text-[10px]">Log in to initiate a discussion...</p></div>
                </div>`;

            const commentsHtml = `
            <div class="mt-20 pt-12 border-t border-gray-200">
                <h3 class="text-2xl md:text-3xl font-black mb-10 text-[#111] font-montserrat uppercase flex items-center tracking-tight">
                    <svg class="w-8 h-8 mr-4 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    Discussions <span id="comments-count" class="ml-4 bg-brand text-[#111] text-sm px-4 py-1.5 rounded-xl shadow-sm border border-yellow-500/20 font-black">0</span>
                </h3>
                ${commentInputHtml}
                <div id="comments-list" class="space-y-6 pb-10"><div class="flex justify-center py-10"><span class="loader border-t-brand" style="width:30px;height:30px;border-width:4px;"></span></div></div>
            </div>`;

            let detailFormattedDate = 'N/A';
            try {
                const rawDD = currentPost.customDate || currentPost.createdAt || null;
                const ddObj = rawDD ? new Date(rawDD) : new Date();
                if (!isNaN(ddObj.getTime())) detailFormattedDate = ddObj.toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'});
            } catch(e) {}
            const detailAuthorName = currentPost.authorName || 'TubeSeekify';
            const detailAuthorDateHtml = `
                <div class="flex items-center flex-wrap gap-6 text-sm text-[var(--text-body)] font-semibold mb-8 pb-6 border-b border-[var(--border-primary)]/40">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white font-black flex items-center justify-center text-xs border border-[var(--border-primary)] shadow-sm">
                            ${detailAuthorName.charAt(0).toUpperCase()}
                        </div>
                        <span class="text-[var(--text-title)] font-bold">${detailAuthorName}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>Published on ${detailFormattedDate}</span>
                    </div>
                </div>
            `;

            container.innerHTML = `
                <div class="animate-fade-in max-w-6xl mx-auto w-full flex-1">
                    <div class="flex items-center space-x-4 mb-6 relative">
                        ${currentPost.tag ? `<span class="bg-gradient-to-r from-brand to-[#FFBE00] text-black text-[11px] font-black uppercase px-4 py-2 rounded-xl tracking-widest shadow-lg border border-brand">${currentPost.tag}</span>` : ''}
                        ${ratingBadgeHtml}
                    </div>
                    <h1 class="text-4xl md:text-5xl lg:text-[56px] font-black text-[var(--text-title)] leading-[1.05] tracking-tighter mb-8 font-montserrat">${currentPost.title || ''}</h1>
                    ${detailAuthorDateHtml}
                    
                    <!-- Post Media Thumbnail or Explainer Video -->
                    <div class="mb-14">
                        ${mediaHtml}
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">
                        <!-- Main Content Stack (Left side) -->
                        <div class="lg:col-span-2">
                            <!-- Description Box -->
                            <div class="mt-14">
                                <div class="flex items-center justify-between border-b-2 border-[var(--border-primary)] mb-8">
                                    <button class="border-b-[4px] border-brand text-[var(--text-title)] font-black text-xl pb-4 px-4 uppercase tracking-[0.2em] font-montserrat translate-y-[2px]">Description</button>
                                    <button onclick="window.scrollToResource()" class="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 hover:from-amber-500 hover:to-yellow-500 text-amber-500 hover:text-black border border-amber-500/30 rounded-xl hover:scale-110 active:scale-90 transition-all duration-300 cursor-pointer translate-y-[-4px] shadow-sm animate-pulse" title="Quick Jump to Product/Prompt">
                                        <svg class="w-5 h-5 stroke-current animate-bounce" fill="none" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 13 12 18 17 13"></polyline><polyline points="7 6 12 11 17 6"></polyline></svg>
                                    </button>
                                </div>
                                <div class="text-[var(--text-body)] leading-loose text-lg font-medium post-content">${currentPost.desc || ''}</div>
                                <div id="adsense-inpost-slot" class="my-8 w-full"></div>
                            </div>
                            ${promptsHtml}
                            ${commentsHtml}
                        </div>
                        
                        <!-- Sidebar Column (Right side) -->
                        <div class="lg:col-span-1">
                            <div id="resource-sidebar-card" class="premium-sidebar-card rounded-[32px] p-8 md:p-10 sticky top-10 backdrop-blur-md">
                                <h3 class="font-black text-[var(--text-title)] text-sm uppercase tracking-[0.2em] mb-8 flex items-center border-b border-[var(--border-primary)] pb-4"><svg class="w-6 h-6 mr-3 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> Post Resources</h3>
                                ${extraActionHtml}
                                <div class="space-y-4">${resourcesHtml}</div>
                                <div id="adsense-sidebar-slot" class="my-6 w-full"></div>
                                <div class="mt-10 pt-8 border-t border-[var(--border-primary)]">
                                    <button onclick="window.toggleSave(event, '${currentPost.id}')" class="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center mb-4 border-2 ${isSaved ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-green-600 hover:to-emerald-500 text-white border-0 shadow-[0_8px_20px_rgba(16,185,129,0.3)] active:scale-95 duration-200 cursor-pointer' : 'bg-[var(--color-light)] text-[var(--text-title)] border-[var(--border-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--bg-card)] active:scale-95 duration-200 cursor-pointer'}">
                                        <svg class="w-5 h-5 mr-3 ${isSaved ? 'fill-current text-white' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg> ${saveButtonText}
                                    </button>
                                    <button onclick="window.copyPostLink()" class="w-full bg-gradient-to-r from-[var(--color-primary)] to-cyan-500 hover:from-cyan-500 hover:to-[var(--color-primary)] text-white border-0 font-black py-5 rounded-2xl transition-all shadow-[0_8px_20px_rgba(37,99,235,0.2)] hover:shadow-[0_10px_25px_rgba(37,99,235,0.35)] flex items-center justify-center text-xs uppercase tracking-[0.2em] active:scale-95 duration-200 cursor-pointer">
                                        <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy URL Link
                                    </button>
                                </div>
                                ${shareSection}
                            </div>
                        </div>
                    </div>
                    ${recommendedHtml}
                </div>`;
            window.renderComments();
            window.injectAdSense();

            // Load comments from Firebase for this post
            if (currentCommentsListener) { currentCommentsListener(); currentCommentsListener = null; }
            const commentsRef = ref(db, `artifacts/${appId}/interactions/comments/${currentPost.id}`);
            currentCommentsListener = onValue(commentsRef, (snap) => {
                const loaded = [];
                if (snap.exists()) {
                    snap.forEach(child => {
                        loaded.push({ id: child.key, ...child.val() });
                    });
                }
                window.state.comments = loaded.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                window.renderComments();
            });

            } catch(e) { console.error("Single Post Render Error:", e); }
        };

        window.renderUI = () => {
            try {
                window.renderSidebar();
                
                // Announcement Bar Integration
                const closedAnnouncement = localStorage.getItem('ts_announcement_closed');
                const annBar = document.getElementById('announcement-bar');
                if (annBar && window.state.settings && window.state.settings.announcementText && window.state.settings.announcementText !== closedAnnouncement) {
                    const link = window.state.settings.announcementLink;
                    annBar.innerHTML = `
                        <div class="w-full bg-[var(--bg-sidebar)] text-[var(--text-title)] py-3.5 px-8 relative flex items-center justify-center font-sans text-xs md:text-sm font-semibold border-b border-[var(--border-primary)] shadow-sm relative overflow-hidden transition-all duration-300">
                            <!-- Subtle brand-colored glowing underlay -->
                            <div class="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)]/5 via-transparent to-[var(--color-primary)]/5 pointer-events-none opacity-40"></div>
                            ${link ? `<a href="${link}" target="_blank" class="hover:opacity-90 flex items-center justify-center gap-2.5 transition-all duration-200">` : `<div class="flex items-center justify-center gap-2.5">`}
                                <span class="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black uppercase tracking-widest border border-[var(--color-primary)]/25 animate-pulse">Update</span>
                                <span class="text-zinc-200 hover:text-white transition-colors flex items-center gap-1.5 font-medium tracking-wide">
                                    ${window.state.settings.announcementText}
                                </span>
                            ${link ? `</a>` : `</div>`}
                            <button onclick="window.closeAnnouncement()" class="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-title)] transition-colors text-xl font-bold bg-transparent border-none cursor-pointer p-1" style="line-height:1;">&times;</button>
                        </div>
                    `;
                    annBar.classList.remove('hidden');
                } else if (annBar) {
                    annBar.classList.add('hidden');
                }

                const container = document.getElementById('main-container');
                if(!container) return;
                
                const { currentTab, currentPost, settings, user, userProfile, searchQuery, currentSlide } = window.state;
                const isLoggedIn = user && !user.isAnonymous;

                if (currentTab === 'privacy' || currentTab === 'terms') {
                    const title = currentTab === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions';
                    const content = currentTab === 'privacy' ? settings.privacyPolicy : settings.termsConditions;
                    const hasHtml = /<\/?[a-z][\s\S]*>/i.test(content || '');
                    const contentClass = hasHtml ? 'rich-html-content' : 'whitespace-pre-wrap';
                    container.innerHTML = `
                        <div class="animate-fade-in max-w-4xl mx-auto w-full py-10 font-montserrat flex-1">
                            <h1 class="text-3xl md:text-5xl font-black mb-10 text-[var(--text-title)] tracking-tight">${title}</h1>
                            <div class="bg-[var(--bg-card)] p-8 md:p-14 rounded-[40px] shadow-2xl border border-[var(--border-primary)] text-[var(--text-body)] leading-relaxed font-medium text-sm md:text-lg post-content backdrop-blur-md ${contentClass}">
                                ${content || 'No documentation active.'}
                            </div>
                        </div>`;
                    return;
                }

                if (currentPost) {
                    window.renderSinglePost();
                    return;
                }

                if (currentTab === 'cart') {
                    if (!isLoggedIn) {
                        container.innerHTML = `
                            <div class="animate-fade-in max-w-xl mx-auto w-full py-16 font-montserrat flex-1 text-center mb-20">
                                <div class="bg-[var(--bg-card)] p-10 md:p-14 rounded-[32px] shadow-2xl border border-[var(--border-primary)] flex flex-col items-center relative overflow-hidden backdrop-blur-md">
                                    <div class="w-20 h-20 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-8 border border-[var(--color-primary)]/20 animate-bounce">
                                        <svg class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                                    </div>
                                    <h2 class="text-3xl font-black text-[var(--text-title)] mb-3 uppercase tracking-tight">Shopping Cart Locked</h2>
                                    <p class="text-xs text-[var(--text-muted)] font-semibold max-w-xs leading-relaxed mb-8">Please log in to your account to view your items, manage your quantities, and proceed to checkout.</p>
                                    <button onclick="window.location.hash='account'; notify('Please authenticate to view cart.', 'error')" class="px-8 py-4 bg-[var(--color-primary)] hover:bg-[var(--color-hover)] text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest border-0 cursor-pointer shadow-lg active:scale-95 transition-all w-full">🔑 Sign In / Register</button>
                                </div>
                            </div>`;
                        return;
                    }

                    const cartItems = window.state.cart || [];
                    if (cartItems.length === 0) {
                        container.innerHTML = `
                            <div class="animate-fade-in max-w-xl mx-auto w-full py-16 font-montserrat flex-1 text-center mb-20">
                                <div class="bg-[var(--bg-card)] p-10 md:p-14 rounded-[32px] shadow-2xl border border-[var(--border-primary)] flex flex-col items-center relative overflow-hidden backdrop-blur-md">
                                    <div class="w-20 h-20 rounded-full bg-gray-500/10 text-gray-400 flex items-center justify-center mb-8 border border-gray-400/25">
                                        <svg class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                                    </div>
                                    <h2 class="text-3xl font-black text-[var(--text-title)] mb-3 uppercase tracking-tight">Your Cart is Empty</h2>
                                    <p class="text-xs text-[var(--text-muted)] font-semibold max-w-xs leading-relaxed mb-8">You haven't added any products to your cart yet. Visit our premium shop page to explore items.</p>
                                    <button onclick="window.location.hash='shop'" class="px-8 py-4 bg-[var(--color-primary)] hover:bg-[var(--color-hover)] text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest border-0 cursor-pointer shadow-lg active:scale-95 transition-all w-full">🛍️ Browse Premium Shop</button>
                                </div>
                            </div>`;
                        return;
                    }

                    let grandTotal = 0;
                    let currencyPrefix = 'RS:';
                    
                    const cartListHtml = cartItems.map((item, idx) => {
                        const digits = item.price.replace(/[^0-9.]/g, '');
                        const unitPrice = parseFloat(digits) || 0;
                        const subTotal = unitPrice * item.quantity;
                        grandTotal += subTotal;
                        
                        const prefix = item.price.replace(/[0-9.]/g, '').trim();
                        if (prefix) currencyPrefix = prefix;

                        return `
                            <div class="flex items-center gap-4 md:gap-6 p-5 bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-3xl shadow-sm hover:border-[var(--color-primary)]/50 transition-all">
                                <img src="${item.thumbnail}" class="w-16 h-16 md:w-20 md:h-20 object-cover rounded-2xl border border-[var(--border-primary)] shadow-sm flex-shrink-0" onerror="this.src='https://via.placeholder.com/150/FFE345/111111?text=Product'">
                                <div class="flex-1 min-w-0">
                                    <h4 class="text-sm md:text-base font-black text-[var(--text-title)] truncate mb-1 uppercase tracking-tight">${item.postTitle}</h4>
                                    <span class="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wide">${item.price} each</span>
                                </div>
                                <div class="flex items-center gap-3">
                                    <button onclick="window.changeCartQty(${idx}, -1)" class="w-8 h-8 rounded-xl bg-[var(--color-light)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--text-title)] flex items-center justify-center font-bold transition-all border border-[var(--border-primary)] active:scale-90 cursor-pointer">&minus;</button>
                                    <span class="text-sm font-black text-[var(--text-title)] w-6 text-center select-none">${item.quantity}</span>
                                    <button onclick="window.changeCartQty(${idx}, 1)" class="w-8 h-8 rounded-xl bg-[var(--color-light)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--text-title)] flex items-center justify-center font-bold transition-all border border-[var(--border-primary)] active:scale-90 cursor-pointer">&plus;</button>
                                </div>
                                <div class="text-right hidden sm:block min-w-[100px]">
                                    <p class="text-sm font-black text-[var(--text-title)]">${currencyPrefix} ${subTotal}</p>
                                </div>
                                <button onclick="window.removeFromCart(${idx})" class="text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white p-2.5 rounded-xl border border-red-500/10 active:scale-90 transition-all cursor-pointer">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        `;
                    }).join('');

                    container.innerHTML = `
                        <div class="animate-fade-in max-w-6xl mx-auto w-full py-10 font-montserrat mb-20 flex-1">
                            <div class="flex items-center gap-4 mb-8">
                                <div class="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center border border-[var(--color-primary)]/20 shadow-sm">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                                </div>
                                <h1 class="text-3xl md:text-4xl font-black text-[var(--text-title)] uppercase tracking-tight">Shopping Cart</h1>
                            </div>
                            
                            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div class="lg:col-span-2 space-y-4">
                                    ${cartListHtml}
                                </div>
                                
                                <div class="lg:col-span-1">
                                    <div class="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-[32px] p-6 md:p-8 shadow-2xl backdrop-blur-md sticky top-10">
                                        <h3 class="font-black text-[var(--text-title)] text-sm uppercase tracking-[0.2em] mb-6 flex items-center border-b border-[var(--border-primary)] pb-4">
                                            <svg class="w-5 h-5 mr-3 text-[var(--color-primary)]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                            Order Summary
                                        </h3>
                                        
                                        <!-- Calculate dynamic discount from applied coupon -->
                                        ${(() => {
                                            let discountAmount = 0;
                                            let promoDetailHtml = '';
                                            if (window.state.appliedPromoCode) {
                                                const promo = window.state.appliedPromoCode;
                                                if (promo.applicablePostId) {
                                                    const restrictedItem = cartItems.find(item => item.postId === promo.applicablePostId);
                                                    if (restrictedItem) {
                                                        const digits = restrictedItem.price.replace(/[^0-9.]/g, '');
                                                        const unitPrice = parseFloat(digits) || 0;
                                                        const subtotal = unitPrice * restrictedItem.quantity;
                                                        if (promo.discountType === 'percent') {
                                                            discountAmount = (subtotal * promo.value) / 100;
                                                        } else {
                                                            discountAmount = Math.min(promo.value, subtotal);
                                                        }
                                                        promoDetailHtml = `
                                                            <div class="flex justify-between text-purple-500 font-extrabold pb-2 border-b border-[var(--border-primary)]/30">
                                                                <span>Discount Applied (${promo.code}${promo.discountType === 'percent' ? ` ${promo.value}%` : ''})</span>
                                                                <span class="flex items-center gap-1.5">
                                                                    -${currencyPrefix} ${discountAmount.toFixed(0)}
                                                                    <button onclick="window.removeCartPromoCode()" class="text-[10px] font-bold text-red-500 hover:text-red-600 bg-transparent border-0 cursor-pointer p-0 ml-1.5 select-none">&times; Remove</button>
                                                                </span>
                                                            </div>
                                                        `;
                                                    } else {
                                                        promoDetailHtml = `
                                                            <div class="flex justify-between text-red-500 font-extrabold pb-2 border-b border-[var(--border-primary)]/30">
                                                                <span>Promo ${promo.code} (Add restricted item)</span>
                                                                <button onclick="window.removeCartPromoCode()" class="text-[10px] font-bold text-red-500 hover:text-red-600 bg-transparent border-0 cursor-pointer p-0 ml-1.5 select-none">&times; Remove</button>
                                                            </div>
                                                        `;
                                                    }
                                                } else {
                                                    if (promo.discountType === 'percent') {
                                                        discountAmount = (grandTotal * promo.value) / 100;
                                                    } else {
                                                        discountAmount = Math.min(promo.value, grandTotal);
                                                    }
                                                    promoDetailHtml = `
                                                        <div class="flex justify-between text-purple-500 font-extrabold pb-2 border-b border-[var(--border-primary)]/30">
                                                            <span>Discount Applied (${promo.code}${promo.discountType === 'percent' ? ` ${promo.value}%` : ''})</span>
                                                            <span class="flex items-center gap-1.5">
                                                                -${currencyPrefix} ${discountAmount.toFixed(0)}
                                                                <button onclick="window.removeCartPromoCode()" class="text-[10px] font-bold text-red-500 hover:text-red-600 bg-transparent border-0 cursor-pointer p-0 ml-1.5 select-none">&times; Remove</button>
                                                            </span>
                                                        </div>
                                                    `;
                                                }
                                            }
                                            const finalTotal = Math.max(0, grandTotal - discountAmount);
                                            
                                            return `
                                            <div class="space-y-4 text-xs font-bold text-[var(--text-muted)] border-b border-[var(--border-primary)] pb-6 mb-6">
                                                <div class="flex justify-between"><span>Cart Subtotal</span><span class="text-[var(--text-title)]">${currencyPrefix} ${grandTotal}</span></div>
                                                <div class="flex justify-between"><span>Taxes & Fees</span><span class="text-green-500 font-extrabold uppercase">Free / Inclusive</span></div>
                                                ${promoDetailHtml}
                                                
                                                <div class="mt-4 pt-4 border-t border-[var(--border-primary)]/50">
                                                    <label class="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Apply Promo Code (Optional)</label>
                                                    <div class="flex gap-2">
                                                        <input type="text" id="cart-promo-input" value="${window.state.appliedPromoCode ? window.state.appliedPromoCode.code : ''}" placeholder="e.g. SAVE50" class="w-full bg-[var(--bg-card-raw)] border border-[var(--border-primary)] focus:border-[var(--color-primary)] px-4 py-2.5 rounded-xl text-xs font-bold uppercase outline-none text-[var(--text-title)] placeholder-[var(--text-muted)]"/>
                                                        <button type="button" onclick="window.applyCartPromoCode()" class="px-4 bg-[var(--color-light)] hover:bg-[var(--color-primary)] hover:text-white text-[var(--color-primary)] border border-[var(--border-primary)] rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all active:scale-95">Apply</button>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div class="flex justify-between items-center mb-8">
                                                <span class="text-sm font-black text-[var(--text-title)] uppercase tracking-wide">Grand Total</span>
                                                <span class="text-xl md:text-2xl font-black text-[var(--color-primary)]">${currencyPrefix} ${finalTotal.toFixed(0)}</span>
                                            </div>
                                            `;
                                        })()}
                                        
                                        <button onclick="window.checkoutCart()" class="w-full py-5 bg-gradient-to-r from-[var(--color-primary)] to-violet-500 hover:from-violet-500 hover:to-[var(--color-primary)] text-white border-0 font-black rounded-2xl transition-all shadow-2xl flex items-center justify-center text-xs uppercase tracking-[0.2em] group active:scale-95 duration-200 cursor-pointer">
                                            🔒 Proceed to Checkout
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                    return;
                }

                if (currentTab === 'account') {
                    if (isLoggedIn) {
                        const initial = user.email ? user.email.charAt(0).toUpperCase() : 'U';
                        const avatarHtml = userProfile.avatarUrl ? 
                            `<img src="${userProfile.avatarUrl}" class="w-full h-full object-cover">` : 
                            `<span class="text-6xl font-black text-brand">${initial}</span>`;
                            
                        // Filter purchases for current user
                        const userPurchases = Object.values(window.state.purchases || {}).filter(p => p.userId === user.uid);
                        
                        let purchasesListHtml = '';
                        if (userPurchases.length === 0) {
                            purchasesListHtml = `
                                <div class="bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-primary)] rounded-[24px] p-8 text-center mt-4">
                                    <span class="inline-block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">No Shop Purchases Yet</span>
                                    <p class="text-xs text-[var(--text-muted)] font-semibold mb-4 leading-relaxed">Unlock premium source codes, files, and applications from our interactive Shop.</p>
                                    <button onclick="window.location.hash='shop'" class="px-5 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-hover)] text-white font-extrabold rounded-xl text-[10px] uppercase tracking-widest border-0 cursor-pointer shadow-md active:scale-95 transition-all">🛍️ Browse Premium Shop</button>
                                </div>
                            `;
                        } else {
                            purchasesListHtml = `
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    ${userPurchases.map(purchase => {
                                        const p = window.state.posts.find(item => item.id === purchase.postId);
                                        const postTitle = p ? p.title : purchase.postTitle || 'Premium Product';
                                        const postThumbnail = p ? p.thumbnail : 'https://via.placeholder.com/600x400/111111/FFE345?text=Product';
                                        const rem = purchase.remainingDownloads !== undefined ? purchase.remainingDownloads : purchase.quantity || 1;
                                        
                                        let statusBadge = '';
                                        let downloadBtn = '';
                                        
                                        if (purchase.status === 'approved') {
                                            statusBadge = `<span class="bg-green-500/10 text-green-500 text-[9px] font-black px-2.5 py-1 rounded-md border border-green-500/20 uppercase tracking-widest">Approved</span>`;
                                            if (rem > 0) {
                                                const actionUrl = p ? p.actionUrl : '';
                                                downloadBtn = `
                                                    <button onclick="window.triggerProductDownload('${purchase.id}', '${actionUrl}')" class="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-black py-3 rounded-xl transition-all shadow-md flex items-center justify-center text-[10px] uppercase tracking-[0.15em] border-0 active:scale-95 cursor-pointer gap-2">
                                                        ⚡ Direct Download (${rem} Left)
                                                    </button>
                                                `;
                                            } else {
                                                downloadBtn = `
                                                    <div class="mt-4 bg-rose-500/5 border border-dashed border-rose-500/20 rounded-xl p-3 text-center">
                                                        <span class="text-[9px] font-black text-rose-500 uppercase tracking-widest">Downloads Exhausted</span>
                                                    </div>
                                                `;
                                            }
                                        } else if (purchase.status === 'pending') {
                                            statusBadge = `<span class="bg-amber-500/10 text-amber-500 text-[9px] font-black px-2.5 py-1 rounded-md border border-amber-500/20 uppercase tracking-widest animate-pulse">Pending Review</span>`;
                                            downloadBtn = `
                                                <div class="mt-4 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-xl p-3 text-center">
                                                    <span class="text-[9px] font-black text-amber-600 uppercase tracking-widest">TID: ${purchase.tid}</span>
                                                </div>
                                            `;
                                        } else {
                                            statusBadge = `<span class="bg-rose-500/10 text-rose-500 text-[9px] font-black px-2.5 py-1 rounded-md border border-rose-500/20 uppercase tracking-widest">Rejected</span>`;
                                            downloadBtn = `
                                                <div class="mt-4 bg-rose-500/5 border border-dashed border-rose-500/20 rounded-xl p-3 text-center">
                                                    <span class="text-[9px] font-black text-rose-500 uppercase tracking-widest">Declined by Owner</span>
                                                </div>
                                            `;
                                        }
                                        
                                        return `
                                            <div class="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-[24px] p-5 shadow-sm hover:border-[var(--color-primary)] transition-all flex flex-col justify-between">
                                                <div>
                                                    <div class="flex items-center gap-4 mb-4">
                                                        <img src="${postThumbnail}" class="w-14 h-14 object-cover rounded-xl border border-[var(--border-primary)] shadow-sm flex-shrink-0" onerror="this.src='https://via.placeholder.com/150/FFE345/111111?text=Product'">
                                                        <div class="min-w-0 flex-1">
                                                            <h4 class="text-xs font-black text-[var(--text-title)] truncate mb-1 uppercase tracking-tight">${postTitle}</h4>
                                                            <div class="flex items-center gap-2">
                                                                <span class="text-[9px] font-extrabold text-[var(--text-muted)]">QTY: ${purchase.quantity || 1}</span>
                                                                ${statusBadge}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                ${downloadBtn}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            `;
                        }
                            
                        container.innerHTML = `
                            <div class="animate-fade-in max-w-4xl mx-auto w-full py-10 font-montserrat mb-20 flex-1">
                                <div class="bg-[var(--bg-card)] p-10 md:p-14 rounded-[32px] shadow-2xl border border-[var(--border-primary)] flex flex-col md:flex-row items-center md:items-start gap-12 relative overflow-hidden backdrop-blur-md mb-10">
                                    <div class="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                                    <div class="w-40 h-40 rounded-full overflow-hidden border-[6px] border-[var(--color-primary)] shadow-2xl flex-shrink-0 bg-darker flex items-center justify-center relative z-10">${avatarHtml}</div>
                                    <div class="flex-1 text-center md:text-left relative z-10">
                                        <h2 class="text-4xl md:text-5xl font-black text-[var(--text-title)] mb-2 tracking-tight font-display">${userProfile.name || 'AI Creator'}</h2>
                                        <p class="text-gray-500 font-bold mb-10 text-lg">${user.email}</p>
                                        
                                        <form id="profile-form" class="space-y-6 max-w-sm mx-auto md:mx-0 text-left mb-10 bg-[var(--color-light)] p-6 rounded-3xl border border-[var(--border-primary)]">
                                            <div>
                                                <label class="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Display Name</label>
                                                <input type="text" id="prof-name" value="${userProfile.name || ''}" class="w-full bg-[var(--bg-card-raw)] border border-[var(--border-primary)] p-4 rounded-xl text-sm font-semibold focus:border-[var(--color-primary)] outline-none shadow-sm transition-colors text-[var(--text-title)]">
                                            </div>
                                            <div>
                                                <label class="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Username</label>
                                                <div class="relative">
                                                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-extrabold text-sm">@</span>
                                                    <input type="text" id="prof-username" placeholder="username" value="${userProfile.username || ''}" class="w-full bg-[var(--bg-card-raw)] border border-[var(--border-primary)] pl-9 pr-4 p-4 rounded-xl text-sm font-semibold focus:border-[var(--color-primary)] outline-none shadow-sm transition-colors text-[var(--text-title)]">
                                                </div>
                                            </div>
                                            <div>
                                                <label class="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Short Bio</label>
                                                <textarea id="prof-bio" placeholder="Tell us about yourself..." class="w-full bg-[var(--bg-card-raw)] border border-[var(--border-primary)] p-4 rounded-xl text-sm font-semibold focus:border-[var(--color-primary)] outline-none shadow-sm transition-colors text-[var(--text-title)] h-24 resize-none">${userProfile.bio || ''}</textarea>
                                            </div>
                                            <div>
                                                <label class="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-2">Avatar Profile Image</label>
                                                <input type="file" id="prof-avatar" accept="image/*" class="w-full bg-[var(--bg-card-raw)] border border-[var(--border-primary)] p-3 rounded-xl text-xs font-semibold shadow-sm text-[var(--text-title)] file:bg-[var(--color-light)] file:text-[var(--color-primary)] file:border-0 file:rounded-md file:px-3 file:py-1.5 file:text-[10px] file:font-bold file:uppercase file:mr-3 cursor-pointer">
                                            </div>
                                            <button type="button" class="profile-update-btn w-full bg-[var(--color-primary)] hover:bg-[var(--color-hover)] text-white font-bold py-4 rounded-xl shadow-xl transition-all uppercase text-xs tracking-[0.2em] mt-2 border-0 active:scale-95" id="prof-btn">Save Profile Info</button>
                                        </form>
                                        
                                        <button type="button" class="logout-btn-action bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all inline-flex items-center justify-center w-full md:w-auto shadow-md border border-red-500/30 hover:border-red-500 hover:shadow-red-500/10 active:scale-95 duration-200 cursor-pointer"><svg class="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg> Sign Out Account</button>
                                    </div>
                                </div>
                                
                                <div class="bg-[var(--bg-card)] p-8 rounded-[32px] shadow-2xl border border-[var(--border-primary)] relative z-10 mb-10">
                                    <div class="flex flex-col sm:flex-row items-center justify-between gap-6">
                                        <div class="text-center sm:text-left">
                                            <h4 class="text-sm font-black text-[var(--text-title)] uppercase tracking-wider mb-1">🔔 Desktop Push Notifications</h4>
                                            <p class="text-xs text-[var(--text-muted)] font-medium leading-relaxed">Stay updated in real-time when users reply, like, or approve your purchase.</p>
                                        </div>
                                        <button onclick="window.requestPushNotificationPermission()" class="px-6 py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-hover)] text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest border-0 cursor-pointer shadow-lg active:scale-95 transition-all">Enable Push Alerts</button>
                                    </div>
                                </div>
                                
                                <div class="bg-[var(--bg-card)] p-10 rounded-[32px] shadow-2xl border border-[var(--border-primary)] relative z-10">
                                    <h3 class="font-black text-[var(--text-title)] text-lg uppercase tracking-[0.2em] mb-6 flex items-center border-b border-[var(--border-primary)] pb-4"><svg class="w-6 h-6 mr-3 text-brand" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg> My Purchases & Downloads</h3>
                                    ${purchasesListHtml}
                                </div>
                            </div>`;
                    } else {
                        container.innerHTML = `
                            <div class="animate-fade-in max-w-5xl mx-auto w-full py-8 md:py-10 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 font-montserrat mb-20 flex-1">
                                <div class="bg-[var(--bg-card)] p-8 md:p-14 rounded-[32px] shadow-2xl border border-[var(--border-primary)] flex flex-col justify-center z-10 relative overflow-hidden backdrop-blur-md">
                                    <span class="bg-[var(--color-light)] text-[var(--color-primary)] text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-xl mb-8 inline-block self-start border border-[var(--color-primary)]/20 shadow-sm">Secure Authentication</span>
                                    <h2 class="text-3xl md:text-5xl font-black mb-10 text-[var(--text-title)] leading-[1.1] tracking-tight font-display">Access Your <br/><span class="italic text-[var(--color-primary)] font-medium">Workspace</span></h2>
                                    <form id="login-form-action" class="space-y-5" onsubmit="window.handleEmailLogin(event)">
                                        <input type="email" id="login-email" required placeholder="Registered Email" class="w-full bg-[var(--bg-card-raw)] border border-[var(--border-primary)] p-4 rounded-xl text-sm focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 outline-none font-medium transition-all shadow-sm text-[var(--text-title)] placeholder-[var(--text-muted)]">
                                        <input type="password" id="login-password" required placeholder="Password" class="w-full bg-[var(--bg-card-raw)] border border-[var(--border-primary)] p-4 rounded-xl text-sm focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 outline-none font-medium transition-all shadow-sm text-[var(--text-title)] placeholder-[var(--text-muted)]">
                                        <button type="submit" id="login-btn-action" class="w-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-hover)] border-0 font-bold py-4 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-xl hover:-translate-y-0.5 transition-all uppercase text-xs tracking-[0.2em] mt-4">Login to Account</button>
                                    </form>
                                    <div class="relative flex py-6 items-center w-full z-10"><div class="flex-grow border-b border-[var(--border-primary)]"></div><span class="mx-6 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">OR</span><div class="flex-grow border-b border-[var(--border-primary)]"></div></div>
                                    <button type="button" class="google-btn-action w-full bg-[var(--bg-card-raw)] border border-[var(--border-primary)] hover:bg-[var(--color-light)] font-bold py-4 rounded-xl flex items-center justify-center text-xs shadow-sm transition-all uppercase tracking-widest text-[var(--text-title)] active:scale-95">
                                        <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c 1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                        Sign in with Google
                                    </button>
                                </div>
                                <div class="bg-[var(--bg-card)] p-8 md:p-14 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col justify-center border border-[var(--border-primary)] z-10 backdrop-blur-md">
                                    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-brand/20 via-transparent to-transparent"></div>
                                    <span class="bg-[var(--color-light)] text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-xl mb-8 inline-block self-start relative z-10 shadow-lg">
                                    <h2 class="text-3xl md:text-5xl font-black mb-10 text-[var(--text-title)] leading-[1.1] relative z-10 tracking-tight font-display">Create an <br/><span class="italic text-[var(--color-primary)] font-medium uppercase tracking-widest text-3xl">Account</span></h2>
                                    <form id="signup-form-action" class="space-y-5 relative z-10" onsubmit="window.handleEmailSignup(event)">
                                        <input type="email" id="signup-email" required placeholder="Valid Email Address" class="w-full bg-[var(--bg-card-raw)] text-[var(--text-title)] placeholder-[var(--text-muted)] border border-[var(--border-primary)] p-4 rounded-xl text-sm focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 outline-none font-medium shadow-sm transition-colors">
                                        <input type="password" id="signup-password" required placeholder="Strong Password" class="w-full bg-[var(--bg-card-raw)] text-[var(--text-title)] placeholder-[var(--text-muted)] border border-[var(--border-primary)] p-4 rounded-xl text-sm focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 outline-none font-medium shadow-sm transition-colors">
                                        <button type="submit" id="signup-btn-action" class="w-full bg-[var(--color-primary)] text-white hover:bg-[var(--color-hover)] border-0 font-bold py-4 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-xl hover:-translate-y-0.5 transition-all uppercase text-xs tracking-[0.2em] mt-4">Register for Free</button>
                                    </form>
                                    <div class="relative flex py-6 items-center w-full z-10"><div class="flex-grow border-b border-[var(--border-primary)]"></div><span class="mx-6 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">OR</span><div class="flex-grow border-b border-[var(--border-primary)]"></div></div>
                                    <button type="button" class="google-btn-action w-full bg-[var(--bg-card-raw)] border border-[var(--border-primary)] hover:bg-[var(--color-light)] text-[var(--text-title)] font-bold py-4 rounded-xl flex items-center justify-center text-xs shadow-sm transition-all uppercase tracking-widest relative z-10 active:scale-95">
                                        <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c 1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                        Sign in with Google
                                    </button>
                                </div>
                            </div>`;
                            

                    }
                    return;
                }

                let html = `<div class="animate-fade-in w-full pb-16 flex-1">`;
                
                if (['home', 'shop', 'tools'].includes(currentTab) && settings.banners?.length > 0) {
                    html += `<div class="relative w-full overflow-hidden mb-8 group" style="border-radius:16px;aspect-ratio:3/1;background:#111;">`;
                    
                    settings.banners.forEach((slide, idx) => {
                        html += `<div class="banner-slide absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}"><img src="${slide.image}" class="absolute inset-0 w-full h-full object-cover" /></div>`;
                    });
                    
                    html += `
                        <div id="banner-progress" class="banner-progress-bar"></div>
                        <button onclick="window.prevSlide()" class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 text-black rounded-full flex items-center justify-center z-20 hover:bg-white transition-all shadow-lg"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                        <button onclick="window.nextSlide()" class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 text-black rounded-full flex items-center justify-center z-20 hover:bg-white transition-all shadow-lg"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
                        <div class="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-30">
                            ${settings.banners.map((_, idx) => `<button onclick="window.state.currentSlide=${idx}; window.updateBannerDOM();" class="banner-dot h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-brand' : 'w-2 bg-white/60 hover:bg-white'}"></button>`).join('')}
                        </div>
                    </div>`;
                }

                if(currentTab !== 'saved') {
                    html += `
                    <!-- Sleek glassmorphic search bar -->
                    <div class="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl flex items-center p-2 mb-6 focus-within:border-[var(--color-primary)] focus-within:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.15)] transition-all duration-300 shadow-sm">
                        <svg class="w-5 h-5 text-[var(--text-muted)] ml-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" placeholder="Search posts or topics..." value="${searchQuery}" oninput="window.state.searchQuery=this.value; window.state.visiblePostsCount=12; window.renderPostsGrid();" class="flex-1 border-none outline-none px-4 py-2.5 text-sm font-bold text-[var(--text-title)] bg-transparent placeholder-[var(--text-muted)]"/>
                        ${searchQuery ? `<button onclick="window.state.searchQuery='';window.renderPostsGrid();" class="bg-[var(--color-light)] text-[var(--color-primary)] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[var(--color-primary)] hover:text-white transition-colors flex items-center gap-1 shrink-0"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Clear</button>` : ''}
                    </div>
                    
                    <div id="category-pills-container" class="flex gap-3 mb-8 overflow-x-auto hide-scrollbar py-1"></div>`;
                } else {
                    html += `<div class="mb-12 flex items-center space-x-4"><svg class="w-10 h-10 text-[var(--color-primary)] fill-[var(--color-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg><h2 class="text-4xl md:text-5xl font-black text-[var(--text-title)] font-montserrat tracking-tighter uppercase">My Bookmarks</h2></div>`;
                }

                html += `<div id="posts-grid-container" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-10"></div>`;
                html += `</div>`;
                container.innerHTML = html;
                
                window.renderPostsGrid();
            } catch(e) { console.error("Main Render Error:", e); }
        };

        const executeAdScripts = (el) => {
            if (!el) return;
            const scripts = el.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
        };

        window.injectAdSense = () => {
            const s = window.state.settings;
            if (!s) return;

            // 1. Header AdSense (Inject once in head)
            if (s.adsenseHeader && !window.adsenseHeaderInjected) {
                try {
                    document.head.insertAdjacentHTML('beforeend', s.adsenseHeader);
                    window.adsenseHeaderInjected = true;
                } catch(e) { console.error("AdSense Header injection failed:", e); }
            }

            // 2. Sidebar AdSense Slot
            const sidebarSlot = document.getElementById('adsense-sidebar-slot');
            if (sidebarSlot && s.adsenseSidebar) {
                sidebarSlot.innerHTML = s.adsenseSidebar;
                executeAdScripts(sidebarSlot);
            }

            // 3. In-Post AdSense Slot
            const inPostSlot = document.getElementById('adsense-inpost-slot');
            if (inPostSlot && s.adsenseInPost) {
                inPostSlot.innerHTML = s.adsenseInPost;
                executeAdScripts(inPostSlot);
            }
        };

        // --- AUTH & DB SYNC LOOP ---
        const initAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    if (!auth.currentUser) {
                        await signInAnonymously(auth).catch(() => {});
                    }
                }
            } catch(e) {}
        };
        // ========================================================
        // 4. MANUAL PAYMENT CHECKOUT MODAL LOGIC
        // ========================================================
        window.openPaymentModal = (postId, postTitle, postPrice) => {
            const { user, userProfile } = window.state;
            if(!user || user.isAnonymous) {
                notify("Authentication required to purchase.", "error");
                window.location.hash = 'account';
                return;
            }
            
            window.state.currentPaymentPostId = postId;
            window.state.currentPaymentPostTitle = postTitle;
            window.state.currentPaymentPostPrice = postPrice;
            window.state.checkoutQuantity = 1;
            window.state.singleCheckoutPromo = null;
            
            const pmPromoInput = document.getElementById('pm-promo-input');
            if (pmPromoInput) pmPromoInput.value = '';
            const discRow = document.getElementById('pm-promo-discount-row');
            if (discRow) discRow.classList.add('hidden');
            
            const modal = document.getElementById('payment-modal');
            if(modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
            window.backToStep1();
            
            const qtyInput = document.getElementById('pm-quantity');
            if (qtyInput) qtyInput.value = 1;
            window.changeCheckoutQty(0);

            const qtyContainer = document.getElementById('pm-qty-container');
            const promoContainer = document.getElementById('pm-promo-container');
            if (postId === 'cart_checkout') {
                if (qtyContainer) qtyContainer.classList.add('hidden');
                if (promoContainer) promoContainer.classList.add('hidden');
                const totalEl = document.getElementById('pm-total-price');
                if (totalEl) totalEl.innerText = postPrice;
            } else {
                if (qtyContainer) qtyContainer.classList.remove('hidden');
                if (promoContainer) promoContainer.classList.remove('hidden');
            }
            
            // Default to Manual Pay tab on open
            window.switchCheckoutTab('manual');
        };
        
        window.closePaymentModal = () => {
            // Unsubscribe from database listener
            if (window._currentPaymentListenerUnsubscribe) {
                window._currentPaymentListenerUnsubscribe();
                window._currentPaymentListenerUnsubscribe = null;
            }
            
            const modal = document.getElementById('payment-modal');
            if(modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            
            // Reset modal steps after fadeout
            setTimeout(() => {
                const s1 = document.getElementById('pm-step-1');
                const s2 = document.getElementById('pm-step-2');
                const s3 = document.getElementById('pm-step-3');
                const s4 = document.getElementById('pm-step-4');
                if(s1) s1.classList.remove('hidden');
                if(s2) s2.classList.add('hidden');
                if(s3) s3.classList.add('hidden');
                if(s4) s4.classList.add('hidden');
            }, 300);
        };
 
        window.switchCheckoutTab = (tab) => {
            const btnAuto = document.getElementById('tab-btn-auto');
            const btnManual = document.getElementById('tab-btn-manual');
            const paneAuto = document.getElementById('pane-auto-pay');
            const paneManual = document.getElementById('pane-manual-pay');
            
            if (!btnAuto || !btnManual || !paneAuto || !paneManual) return;
            
            if (tab === 'auto') {
                btnAuto.className = "flex-1 py-3 text-center text-[10px] font-black uppercase tracking-[0.15em] rounded-xl cursor-pointer transition-all duration-300 bg-[var(--color-primary)] text-white shadow-md border-0";
                btnManual.className = "flex-1 py-3 text-center text-[10px] font-black uppercase tracking-[0.15em] rounded-xl cursor-pointer transition-all duration-300 text-[var(--text-muted)] hover:text-[var(--text-title)] bg-transparent border-0";
                paneAuto.classList.remove('hidden');
                paneManual.classList.add('hidden');
                if (window.updateSafepayButton) window.updateSafepayButton();
            } else {
                btnManual.className = "flex-1 py-3 text-center text-[10px] font-black uppercase tracking-[0.15em] rounded-xl cursor-pointer transition-all duration-300 bg-[var(--color-primary)] text-white shadow-md border-0";
                btnAuto.className = "flex-1 py-3 text-center text-[10px] font-black uppercase tracking-[0.15em] rounded-xl cursor-pointer transition-all duration-300 text-[var(--text-muted)] hover:text-[var(--text-title)] bg-transparent border-0";
                paneManual.classList.remove('hidden');
                paneAuto.classList.add('hidden');
            }
        };

        window.selectAutoGateway = (gateway) => {
            window.state.currentAutoGateway = gateway;
            
            const btnJazz = document.getElementById('auto-btn-jazzcash');
            const btnEasy = document.getElementById('auto-btn-easypaisa');
            const badge = document.getElementById('auto-gateway-badge');
            const noEl = document.getElementById('auto-merchant-no');
            const titleEl = document.getElementById('auto-merchant-title');
            
            const s = window.state.settings || {};
            let no = 'Not configured';
            let title = 'Not configured';
            
            if (gateway === 'JazzCash') {
                no = s.jazzcashNo || 'Not configured by Admin';
                title = s.jazzcashTitle || 'TubeSeekify Merchant';
                
                if (btnJazz) btnJazz.className = "py-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/80 border-2 border-amber-500 text-amber-500 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md border-0";
                if (btnEasy) btnEasy.className = "py-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/60 border-2 border-[var(--border-primary)] text-zinc-400 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md border-0";
                
                if (badge) {
                    badge.innerText = 'JazzCash Auto ⚡';
                    badge.className = 'px-2.5 py-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1';
                }
            } else {
                no = s.easypaisaNo || 'Not configured by Admin';
                title = s.easypaisaTitle || 'TubeSeekify Merchant';
                
                if (btnEasy) btnEasy.className = "py-3.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/80 border-2 border-emerald-500 text-emerald-500 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md border-0";
                if (btnJazz) btnJazz.className = "py-3.5 rounded-2xl bg-zinc-900/40 hover:bg-zinc-900/60 border-2 border-[var(--border-primary)] text-zinc-400 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md border-0";
                
                if (badge) {
                    badge.innerText = 'EasyPaisa Auto ⚡';
                    badge.className = 'px-2.5 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1';
                }
            }
            
            if (noEl) noEl.innerText = no;
            if (titleEl) titleEl.innerText = title;
        };

        window.submitOnSiteAutoPayment = async (e) => {
            e.preventDefault();
            const { user, userProfile } = window.state;
            const postId = window.state.currentPaymentPostId;
            const postTitle = window.state.currentPaymentPostTitle;
            const price = window.state.currentPaymentPostPrice;
            const gateway = window.state.currentAutoGateway || 'JazzCash';
            
            const senderNo = document.getElementById('auto-pm-sender-no').value.trim();
            const tid = document.getElementById('auto-pm-tid').value.trim();
            
            if(!senderNo || !tid) {
                notify("Please complete all fields", "error");
                return;
            }
            
            const btn = document.getElementById('auto-pm-submit-btn');
            const origHtml = btn ? btn.innerHTML : '';
            if(btn) { btn.innerHTML = '<span class="loader border-t-brand"></span> Saving...'; btn.disabled = true; }
            
            try {
                if (postId === 'cart_checkout') {
                    const cartItems = window.state.cart || [];
                    const promo = window.state.appliedPromoCode;
                    
                    let grandTotal = 0;
                    let currencyPrefix = 'RS:';
                    cartItems.forEach(item => {
                        const digits = item.price.replace(/[^0-9.]/g, '');
                        const unitPrice = parseFloat(digits) || 0;
                        grandTotal += unitPrice * item.quantity;
                        const prefix = item.price.replace(/[0-9.]/g, '').trim();
                        if (prefix) currencyPrefix = prefix;
                    });
                    
                    let discountAmount = 0;
                    if (promo && promo.isActive) {
                        if (promo.applicablePostId) {
                            const restrictedItem = cartItems.find(item => item.postId === promo.applicablePostId);
                            if (restrictedItem) {
                                const digits = restrictedItem.price.replace(/[^0-9.]/g, '');
                                const unitPrice = parseFloat(digits) || 0;
                                const subtotal = unitPrice * restrictedItem.quantity;
                                if (promo.discountType === 'percent') {
                                    discountAmount = (subtotal * promo.value) / 100;
                                } else {
                                    discountAmount = Math.min(promo.value, subtotal);
                                }
                            }
                        } else {
                            if (promo.discountType === 'percent') {
                                discountAmount = (grandTotal * promo.value) / 100;
                            } else {
                                discountAmount = Math.min(promo.value, grandTotal);
                            }
                        }
                    }
                    
                    for (const item of cartItems) {
                        const individualPurchaseId = `${user.uid}_${item.postId}`;
                        const purchaseRef = ref(window._db, `artifacts/${appId}/interactions/purchases/${individualPurchaseId}`);
                        
                        const digits = item.price.replace(/[^0-9.]/g, '');
                        const itemUnitPrice = parseFloat(digits) || 0;
                        const itemBaseTotal = itemUnitPrice * item.quantity;
                        
                        let itemDiscount = 0;
                        if (promo && promo.isActive) {
                            if (promo.applicablePostId) {
                                if (item.postId === promo.applicablePostId) {
                                    itemDiscount = discountAmount;
                                }
                            } else {
                                if (promo.discountType === 'percent') {
                                    itemDiscount = (itemBaseTotal * promo.value) / 100;
                                } else {
                                    const share = grandTotal > 0 ? (itemBaseTotal / grandTotal) : 0;
                                    itemDiscount = discountAmount * share;
                                }
                            }
                        }
                        
                        const itemFinalPrice = Math.max(0, itemBaseTotal - itemDiscount);
                        const itemPriceString = `${currencyPrefix} ${itemFinalPrice.toFixed(0)}`;
                        
                        await set(purchaseRef, {
                            id: individualPurchaseId,
                            userId: user.uid,
                            userName: userProfile.name || user.email.split('@')[0],
                            userEmail: user.email,
                            postId: item.postId,
                            postTitle: item.postTitle,
                            gateway: `Auto-${gateway}`,
                            senderNo: senderNo,
                            senderName: 'Auto Verification',
                            tid: tid,
                            price: itemPriceString,
                            quantity: item.quantity,
                            remainingDownloads: item.quantity,
                            status: 'pending',
                            screenshotUrl: '',
                            createdAt: new Date().toISOString(),
                            couponApplied: promo ? promo.code : 'None',
                            discountAmount: itemDiscount
                        });
                    }
                    
                    window.state.completedCartItems = [...cartItems];
                    window.state.cart = [];
                    localStorage.removeItem('ts_cart_' + user.uid);
                    window.renderSidebar();
                } else {
                    const quantity = window.state.checkoutQuantity || 1;
                    const purchaseId = `${user.uid}_${postId}`;
                    const purchaseRef = ref(window._db, `artifacts/${appId}/interactions/purchases/${purchaseId}`);
                    
                    const priceStr = window.state.currentPaymentPostPrice || '0';
                    const digitsOnly = priceStr.replace(/[^0-9.]/g, '');
                    const unitPrice = parseFloat(digitsOnly) || 0;
                    const baseTotalPrice = unitPrice * quantity;
                    const prefix = priceStr.replace(/[0-9.]/g, '').trim();

                    let discount = 0;
                    const promo = window.state.singleCheckoutPromo;
                    if (promo && promo.isActive) {
                        if (promo.discountType === 'percent') {
                            discount = (baseTotalPrice * promo.value) / 100;
                        } else {
                            discount = Math.min(promo.value, baseTotalPrice);
                        }
                    }
                    const calculatedFinal = Math.max(0, baseTotalPrice - discount);
                    const finalPriceString = `${prefix} ${calculatedFinal.toFixed(0)}`;

                    await set(purchaseRef, {
                        id: purchaseId,
                        userId: user.uid,
                        userName: userProfile.name || user.email.split('@')[0],
                        userEmail: user.email,
                        postId: postId,
                        postTitle: postTitle,
                        gateway: `Auto-${gateway}`,
                        senderNo: senderNo,
                        senderName: 'Auto Verification',
                        tid: tid,
                        price: finalPriceString,
                        quantity: quantity,
                        remainingDownloads: quantity,
                        status: 'pending',
                        screenshotUrl: '',
                        createdAt: new Date().toISOString(),
                        couponApplied: promo ? promo.code : 'None',
                        discountAmount: discount
                    });
                }
                
                // Clear coupon state
                window.state.appliedPromoCode = null;
                window.state.singleCheckoutPromo = null;
                
                // Reset inputs
                const fNo = document.getElementById('auto-pm-sender-no');
                const fTid = document.getElementById('auto-pm-tid');
                if (fNo) fNo.value = '';
                if (fTid) fTid.value = '';
                
                notify("Auto-payment submitted! Verifying...", "success");
                
                // Start real-time verification status listener
                const targetPurchaseId = postId === 'cart_checkout' ? `${user.uid}_${window.state.completedCartItems[0].postId}` : `${user.uid}_${postId}`;
                window.startPaymentVerificationListener(
                    postId === 'cart_checkout' ? 'cart_checkout' : postId,
                    targetPurchaseId,
                    tid,
                    price,
                    `Auto-${gateway}`
                );
            } catch(error) {
                console.error("Auto Payment Submission Error:", error);
                notify("Submission failed. Try again.", "error");
            } finally {
                if(btn) { btn.innerHTML = origHtml; btn.disabled = false; }
            }
        };

        window.applySinglePromoCode = () => {
            const input = document.getElementById('pm-promo-input');
            if (!input) return;
            const codeText = input.value.trim().toUpperCase();
            if (!codeText) {
                notify("Please enter a promo code.", "error");
                return;
            }

            const codes = window.state.promoCodes || [];
            const promo = codes.find(c => c.code.trim().toUpperCase() === codeText);

            if (!promo) {
                notify("Invalid Promo Code.", "error");
                return;
            }

            if (!promo.isActive) {
                notify("Promo Code is inactive.", "error");
                return;
            }

            // Expiry Check
            if (promo.expiryDate && new Date() > new Date(promo.expiryDate)) {
                notify("This Promo Code has expired.", "error");
                return;
            }

            // Max Uses Check
            if (promo.maxUses > 0 && (promo.usedCount || 0) >= promo.maxUses) {
                notify("Promo Code usage limit has been reached.", "error");
                return;
            }

            // Product Restriction Check
            if (promo.applicablePostId && promo.applicablePostId !== window.state.currentPaymentPostId) {
                const targetPost = (window.state.posts || []).find(p => p.id === promo.applicablePostId);
                const targetTitle = targetPost ? targetPost.title : 'a specific product';
                notify(`This promo code is only applicable to product: "${targetTitle}".`, "error");
                return;
            }

            window.state.singleCheckoutPromo = promo;
            notify(`Promo Code ${promo.code} Applied! 🏷️`, "success");
            window.changeCheckoutQty(0); // Refresh price calculations
        };

        window.removeSinglePromoCode = () => {
            window.state.singleCheckoutPromo = null;
            const input = document.getElementById('pm-promo-input');
            if (input) input.value = '';
            notify("Promo Code Removed.", "info");
            window.changeCheckoutQty(0); // Refresh price calculations
        };

        window.changeCheckoutQty = (delta) => {
            const qtyInput = document.getElementById('pm-quantity');
            if(!qtyInput) return;
            let qty = parseInt(qtyInput.value, 10) || 1;
            
            const post = (window.state.posts || []).find(p => p.id === window.state.currentPaymentPostId);
            let maxLimit = 100;
            if (post && post.type === 'shop' && post.stock !== undefined && post.stock !== null) {
                maxLimit = post.stock;
            }
            
            qty = Math.max(1, Math.min(maxLimit, qty + delta));
            
            if (delta > 0 && qty === maxLimit && maxLimit < (parseInt(qtyInput.value, 10) + delta)) {
                notify(`Afsos! Hmare paas is waqat sirf ${maxLimit} hi stock available hai.`, "info");
            }
            
            qtyInput.value = qty;
            window.state.checkoutQuantity = qty;

            const priceStr = window.state.currentPaymentPostPrice || '0';
            const digitsOnly = priceStr.replace(/[^0-9.]/g, '');
            const unitPrice = parseFloat(digitsOnly) || 0;
            const baseTotalPrice = unitPrice * qty;
            const prefix = priceStr.replace(/[0-9.]/g, '').trim();

            let discount = 0;
            const promo = window.state.singleCheckoutPromo;
            const discountRow = document.getElementById('pm-promo-discount-row');
            const discountLabel = document.getElementById('pm-promo-discount-label');
            const discountValue = document.getElementById('pm-promo-discount-value');

            if (promo && promo.isActive) {
                if (promo.discountType === 'percent') {
                    discount = (baseTotalPrice * promo.value) / 100;
                    if (discountLabel) discountLabel.innerText = `Discount Applied (${promo.code} ${promo.value}%)`;
                } else {
                    discount = Math.min(promo.value, baseTotalPrice);
                    if (discountLabel) discountLabel.innerText = `Discount Applied (${promo.code})`;
                }
                
                if (discountValue) discountValue.innerText = `-${prefix} ${discount.toFixed(0)}`;
                if (discountRow) {
                    discountRow.classList.remove('hidden');
                    discountRow.classList.add('flex');
                }
            } else {
                if (discountRow) {
                    discountRow.classList.add('hidden');
                    discountRow.classList.remove('flex');
                }
            }

            const finalPrice = Math.max(0, baseTotalPrice - discount);
 
            const priceLabel = document.getElementById('pm-total-price');
            if(priceLabel) {
                priceLabel.innerText = `${prefix} ${finalPrice.toFixed(0)}`;
            }
            if (window.updateSafepayButton) {
                window.updateSafepayButton();
            }
        };
        
        window.openPaymentModal = (postId, postTitle, postPrice) => {
            const { user } = window.state;
            if(!user || user.isAnonymous) {
                notify("Authentication required to purchase.", "error");
                window.location.hash = 'account';
                return;
            }
            
            // Redirect securely to the dedicated Stripe-checkout clone page
            const params = new URLSearchParams({
                postId: postId,
                title: postTitle,
                price: postPrice
            });
            window.location.href = `checkout.html?${params.toString()}`;
        };
        
        window.choosePaymentGateway = (gateway) => {
            window.state.currentPaymentGateway = gateway;
            
            const badge = document.getElementById('pm-gateway-badge');
            const noEl = document.getElementById('pm-merchant-no');
            const titleEl = document.getElementById('pm-merchant-title');
            const qrEl = document.getElementById('pm-qr-code');
            
            const s = window.state.settings || {};
            let no = 'Not configured';
            let title = 'Not configured';
            
            if (gateway === 'JazzCash') {
                no = s.jazzcashNo || 'Not configured by Admin';
                title = s.jazzcashTitle || 'TubeSeekify Merchant';
                if(badge) {
                    badge.innerText = 'JazzCash Wallet';
                    badge.className = 'inline-block px-3 py-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg';
                }
            } else {
                no = s.easypaisaNo || 'Not configured by Admin';
                title = s.easypaisaTitle || 'TubeSeekify Merchant';
                if(badge) {
                    badge.innerText = 'EasyPaisa Wallet';
                    badge.className = 'inline-block px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg';
                }
            }
            
            if(noEl) noEl.innerText = no;
            if(titleEl) titleEl.innerText = title;
            
            // Dynamically generate QR code
            if (qrEl) {
                // If not configured, use a standard placeholder, otherwise generate a secure scannable QR
                if (no.includes('Not configured')) {
                    qrEl.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PleaseConfigure';
                } else {
                    // Generates a fully scannable standard QR code for mobile wallets
                    qrEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(no)}`;
                }
            }
            
            document.getElementById('pm-step-1').classList.add('hidden');
            document.getElementById('pm-step-2').classList.remove('hidden');
        };
        
        window.copyMerchantNumber = () => {
            const noEl = document.getElementById('pm-merchant-no');
            if (noEl) {
                const text = noEl.innerText.trim();
                if (text && !text.includes('Not configured')) {
                    navigator.clipboard.writeText(text);
                    notify("Account number copied!", "success");
                } else {
                    notify("No account number configured to copy", "error");
                }
            }
        };
        
        window.backToStep1 = () => {
            document.getElementById('pm-step-1').classList.remove('hidden');
            document.getElementById('pm-step-2').classList.add('hidden');
            
            // reset form fields
            const fNo = document.getElementById('pm-sender-no');
            const fName = document.getElementById('pm-sender-name');
            const fTid = document.getElementById('pm-tid');
            if(fNo) fNo.value = '';
            if(fName) fName.value = '';
            if(fTid) fTid.value = '';
        };
        
        window.submitManualPayment = async (e) => {
            e.preventDefault();
            const { user, userProfile } = window.state;
            const postId = window.state.currentPaymentPostId;
            const postTitle = window.state.currentPaymentPostTitle;
            const price = window.state.currentPaymentPostPrice;
            const gateway = window.state.currentPaymentGateway;
            
            const senderNo = document.getElementById('pm-sender-no').value.trim();
            const senderName = document.getElementById('pm-sender-name').value.trim();
            const tid = document.getElementById('pm-tid').value.trim();
            const screenshotFile = document.getElementById('pm-screenshot') ? document.getElementById('pm-screenshot').files[0] : null;
            
            if(!senderNo || !senderName || !tid) {
                notify("Please complete all submission fields", "error");
                return;
            }
            
            const btn = document.getElementById('pm-submit-btn');
            const origHtml = btn ? btn.innerHTML : '';
            if(btn) { btn.innerHTML = '<span class="loader border-t-brand"></span> Uploading...'; btn.disabled = true; }
            
            let screenshotUrl = '';
            if (screenshotFile) {
                const formData = new FormData();
                formData.append('image', screenshotFile);
                try {
                    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.success) screenshotUrl = data.data.url;
                } catch(e) {
                    console.error("Screenshot upload failed:", e);
                }
            }
            
            if(btn) btn.innerHTML = '<span class="loader border-t-brand"></span> Saving...';

            try {
                if (postId === 'cart_checkout') {
                    const cartItems = window.state.cart || [];
                    const promo = window.state.appliedPromoCode;
                    
                    let grandTotal = 0;
                    let currencyPrefix = 'RS:';
                    cartItems.forEach(item => {
                        const digits = item.price.replace(/[^0-9.]/g, '');
                        const unitPrice = parseFloat(digits) || 0;
                        grandTotal += unitPrice * item.quantity;
                        const prefix = item.price.replace(/[0-9.]/g, '').trim();
                        if (prefix) currencyPrefix = prefix;
                    });
                    
                    let discountAmount = 0;
                    if (promo && promo.isActive) {
                        if (promo.applicablePostId) {
                            const restrictedItem = cartItems.find(item => item.postId === promo.applicablePostId);
                            if (restrictedItem) {
                                const digits = restrictedItem.price.replace(/[^0-9.]/g, '');
                                const unitPrice = parseFloat(digits) || 0;
                                const subtotal = unitPrice * restrictedItem.quantity;
                                if (promo.discountType === 'percent') {
                                    discountAmount = (subtotal * promo.value) / 100;
                                } else {
                                    discountAmount = Math.min(promo.value, subtotal);
                                }
                            }
                        } else {
                            if (promo.discountType === 'percent') {
                                discountAmount = (grandTotal * promo.value) / 100;
                            } else {
                                discountAmount = Math.min(promo.value, grandTotal);
                            }
                        }
                    }
                    
                    for (const item of cartItems) {
                        const individualPurchaseId = `${user.uid}_${item.postId}`;
                        const purchaseRef = ref(window._db, `artifacts/${appId}/interactions/purchases/${individualPurchaseId}`);
                        
                        const digits = item.price.replace(/[^0-9.]/g, '');
                        const itemUnitPrice = parseFloat(digits) || 0;
                        const itemBaseTotal = itemUnitPrice * item.quantity;
                        
                        let itemDiscount = 0;
                        if (promo && promo.isActive) {
                            if (promo.applicablePostId) {
                                if (item.postId === promo.applicablePostId) {
                                    itemDiscount = discountAmount;
                                }
                            } else {
                                if (promo.discountType === 'percent') {
                                    itemDiscount = (itemBaseTotal * promo.value) / 100;
                                } else {
                                    const share = grandTotal > 0 ? (itemBaseTotal / grandTotal) : 0;
                                    itemDiscount = discountAmount * share;
                                }
                            }
                        }
                        
                        const itemFinalPrice = Math.max(0, itemBaseTotal - itemDiscount);
                        const itemPriceString = `${currencyPrefix} ${itemFinalPrice.toFixed(0)}`;
                        
                        await set(purchaseRef, {
                            id: individualPurchaseId,
                            userId: user.uid,
                            userName: userProfile.name || user.email.split('@')[0],
                            userEmail: user.email,
                            postId: item.postId,
                            postTitle: item.postTitle,
                            gateway: gateway,
                            senderNo: senderNo,
                            senderName: senderName,
                            tid: tid,
                            price: itemPriceString,
                            quantity: item.quantity,
                            remainingDownloads: item.quantity,
                            status: 'pending',
                            screenshotUrl: screenshotUrl,
                            createdAt: new Date().toISOString(),
                            couponApplied: promo ? promo.code : 'None',
                            discountAmount: itemDiscount
                        });
                    }
                    
                    // Save completed cart items for real-time success screen rendering
                    window.state.completedCartItems = [...cartItems];
                    
                    // Clear cart after checkout
                    window.state.cart = [];
                    localStorage.removeItem('ts_cart_' + user.uid);
                    window.renderSidebar();
                } else {
                    const quantity = window.state.checkoutQuantity || 1;
                    const purchaseId = `${user.uid}_${postId}`;
                    const purchaseRef = ref(window._db, `artifacts/${appId}/interactions/purchases/${purchaseId}`);
                    
                    const priceStr = window.state.currentPaymentPostPrice || '0';
                    const digitsOnly = priceStr.replace(/[^0-9.]/g, '');
                    const unitPrice = parseFloat(digitsOnly) || 0;
                    const baseTotalPrice = unitPrice * quantity;
                    const prefix = priceStr.replace(/[0-9.]/g, '').trim();

                    let discount = 0;
                    const promo = window.state.singleCheckoutPromo;
                    if (promo && promo.isActive) {
                        if (promo.discountType === 'percent') {
                            discount = (baseTotalPrice * promo.value) / 100;
                        } else {
                            discount = Math.min(promo.value, baseTotalPrice);
                        }
                    }
                    const calculatedFinal = Math.max(0, baseTotalPrice - discount);
                    const finalPriceString = `${prefix} ${calculatedFinal.toFixed(0)}`;

                    await set(purchaseRef, {
                        id: purchaseId,
                        userId: user.uid,
                        userName: userProfile.name || user.email.split('@')[0],
                        userEmail: user.email,
                        postId: postId,
                        postTitle: postTitle,
                        gateway: gateway,
                        senderNo: senderNo,
                        senderName: senderName,
                        tid: tid,
                        price: finalPriceString,
                        quantity: quantity,
                        remainingDownloads: quantity,
                        status: 'pending',
                        screenshotUrl: screenshotUrl,
                        createdAt: new Date().toISOString(),
                        couponApplied: promo ? promo.code : 'None',
                        discountAmount: discount
                    });
                }
                
                // Reset coupon state
                window.state.appliedPromoCode = null;
                window.state.singleCheckoutPromo = null;
                
                notify("Payment submitted for verification!", "success");
                
                // Start real-time verification status listener
                const targetPurchaseId = postId === 'cart_checkout' ? `${user.uid}_${window.state.completedCartItems[0].postId}` : `${user.uid}_${postId}`;
                window.startPaymentVerificationListener(
                    postId === 'cart_checkout' ? 'cart_checkout' : postId,
                    targetPurchaseId,
                    tid,
                    price,
                    gateway
                );
            } catch(error) {
                console.error("Manual Payment Submission Error:", error);
                notify("Submission failed. Try again.", "error");
            } finally {
                if(btn) { btn.innerHTML = origHtml; btn.disabled = false; }
            }
        };

        window.initSafepayButton = (amountVal) => {
            const container = document.getElementById('safepay-button-container');
            const loading = document.getElementById('safepay-button-loading');
            const debugConsole = document.getElementById('safepay-debug-console');
            if (!container) return;
            
            const s = window.state.settings || {};
            const safepayConfig = s.safepay_config || {};
            const safepayEnv = safepayConfig.env || 'sandbox';
            const prodPublicKey = safepayConfig.publicKey || '';
            
            // 1. Prevent duplicate rendering if already rendered for the same amount and config
            if (window._lastSafepayAmount === amountVal && 
                window._lastSafepayEnv === safepayEnv && 
                window._lastSafepayKey === prodPublicKey && 
                container.innerHTML.trim() !== '') {
                console.log("Safepay button already rendered for amount:", amountVal);
                if (loading) loading.classList.add('hidden');
                return;
            }
            
            window._lastSafepayAmount = amountVal;
            window._lastSafepayEnv = safepayEnv;
            window._lastSafepayKey = prodPublicKey;
            
            // 2. Properly close and destroy the previous Zoid component instance asynchronously to avoid DOM leaks
            const cleanAndRender = () => {
                // Clear debug logs
                if (debugConsole) {
                    debugConsole.innerHTML = '';
                    debugConsole.classList.add('hidden');
                }
                if (loading) loading.classList.remove('hidden');
                
                // 3. Setup on-screen debug console hook to capture console errors
                const logDebug = (msg) => {
                    if (debugConsole) {
                        debugConsole.classList.remove('hidden');
                        debugConsole.innerHTML += `<div class="mb-1 text-red-500 font-bold">⚠️ ${msg}</div>`;
                    }
                };
                
                // Temporarily intercept console.error
                const origConsoleError = console.error;
                console.error = function(...args) {
                    origConsoleError.apply(console, args);
                    logDebug(args.join(' '));
                };
                
                // Temporarily intercept global window errors
                const origWindowOnError = window.onerror;
                window.onerror = function(message, source, lineno, colno, error) {
                    // Ignore DOM removal errors as they are a normal side effect of switching prices
                    if (message && (message.indexOf("container element removed") !== -1 || message.indexOf("removed from DOM") !== -1)) {
                        return true; 
                    }
                    logDebug(`${message} (at ${source}:${lineno}:${colno})`);
                    if (origWindowOnError) return origWindowOnError(message, source, lineno, colno, error);
                    return false;
                };
                
                const clientKeys = {
                    sandbox: 'sec_f2154768-5f68-41cf-9c5a-d3b018575246',
                    production: prodPublicKey || 'sec_f2154768-5f68-41cf-9c5a-d3b018575246' // Fallback defensively
                };
                
                try {
                    if (typeof safepay === 'undefined' || typeof safepay.Button === 'undefined') {
                        console.error("Safepay SDK is not loaded yet.");
                        if (loading) {
                            loading.innerText = "❌ Safepay SDK not loaded. Check Internet/AdBlocker.";
                            loading.className = "text-xs font-bold text-red-500 animate-none";
                        }
                        return;
                    }
                    
                    const buttonInstance = safepay.Button({
                        env: safepayEnv,
                        client: clientKeys,
                        payment: function (data, actions) {
                            return actions.payment.create({
                                transaction: {
                                    amount: amountVal,
                                    currency: 'PKR'
                                }
                            });
                        },
                        onCheckout: async function (data) {
                            console.log("Safepay onCheckout Complete:", data);
                            if (data && data.tracker) {
                                await window.completeSafepayCheckout(data.tracker, amountVal);
                            } else {
                                notify("Payment verification failed. No tracker received.", "error");
                            }
                        },
                        onCancel: function () {
                            notify("Payment cancelled.", "warning");
                        }
                    });
                    
                    // Clear existing container and create a fresh new outlet element to render into
                    container.innerHTML = '<div id="safepay-button-outlet" class="w-full"></div>';
                    
                    window._activeSafepayInstance = buttonInstance;
                    const renderPromise = buttonInstance.render('#safepay-button-outlet');
                    
                    // Hide loading spinner ONLY when the button successfully renders!
                    if (renderPromise && typeof renderPromise.then === 'function') {
                        renderPromise.then(() => {
                            console.log("Safepay button rendered successfully!");
                            if (loading) loading.classList.add('hidden');
                        }).catch(err => {
                            console.error("Safepay button render promise failed:", err);
                            // Filter out DOM element cancellation errors
                            if (err && err.message && (err.message.indexOf("container element removed") !== -1 || err.message.indexOf("removed from DOM") !== -1)) {
                                console.log("Old Safepay checkout instance cancelled safely.");
                            } else {
                                logDebug(err ? err.message : 'Unknown rendering failure');
                            }
                        });
                    } else {
                        // Fallback
                        setTimeout(() => {
                            if (loading) loading.classList.add('hidden');
                        }, 2500);
                    }
                    
                } catch (err) {
                    console.error("Error rendering Safepay button:", err);
                    if (loading) {
                        loading.innerText = "❌ Safepay Render Error: " + err.message;
                        loading.className = "text-xs font-bold text-red-500 animate-none";
                    }
                    notify("Safepay Render Error: " + err.message, "error");
                } finally {
                    // Restore original logging hooks after short delay to not affect other code
                    setTimeout(() => {
                        console.error = origConsoleError;
                        window.onerror = origWindowOnError;
                    }, 2000);
                }
            };
            
            if (window._activeSafepayInstance) {
                const oldInstance = window._activeSafepayInstance;
                window._activeSafepayInstance = null;
                oldInstance.close()
                    .then(() => {
                        container.innerHTML = '<div id="safepay-button-outlet" class="w-full"></div>';
                        cleanAndRender();
                    })
                    .catch(e => {
                        console.log("Error closing old instance:", e);
                        container.innerHTML = '<div id="safepay-button-outlet" class="w-full"></div>';
                        cleanAndRender();
                    });
            } else {
                cleanAndRender();
            }
        };
        
        window.updateSafepayButton = () => {
            const totalEl = document.getElementById('pm-total-price');
            const totalText = totalEl ? totalEl.innerText : '0';
            const digitsOnly = totalText.replace(/[^0-9.]/g, '');
            const amountVal = parseFloat(digitsOnly) || 0;
            
            if (amountVal > 0) {
                // Use a short delay to ensure any active modal or tab slide transitions are fully finished
                if (window._safepayRenderTimeout) clearTimeout(window._safepayRenderTimeout);
                window._safepayRenderTimeout = setTimeout(() => {
                    window.initSafepayButton(amountVal);
                }, 350);
            }
        };
        
        window.forceRefreshSafepay = (e) => {
            if (e) e.stopPropagation();
            window._lastSafepayAmount = null;
            window._lastSafepayEnv = null;
            window._lastSafepayKey = null;
            
            const loading = document.getElementById('safepay-button-loading');
            if (loading) {
                loading.innerHTML = `
                    <svg class="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Safepay Smart Button loading...</span>
                `;
            }
            
            notify("Refreshing Safepay Button...", "info");
            window.updateSafepayButton();
        };
        
        window.completeSafepayCheckout = async (tracker, verifiedAmount) => {
            const { user, userProfile } = window.state;
            if(!user || user.isAnonymous) return;
            
            const postId = window.state.currentPaymentPostId;
            const postTitle = window.state.currentPaymentPostTitle;
            const priceStr = window.state.currentPaymentPostPrice || '0';
            
            // Show Step 3 loading spinner
            document.getElementById('pm-step-1').classList.add('hidden');
            const s2 = document.getElementById('pm-step-2');
            if (s2) s2.classList.add('hidden');
            
            const s3 = document.getElementById('pm-step-3');
            if (s3) s3.classList.remove('hidden');
            
            const statusTicker = document.getElementById('pm-status-ticker');
            if (statusTicker) {
                statusTicker.innerText = 'Verifying Transaction with Safepay...';
                statusTicker.className = 'text-xs font-semibold text-emerald-500 uppercase tracking-widest animate-pulse';
            }
            
            document.getElementById('pm-verification-tid').innerText = tracker;
            document.getElementById('pm-verification-amount').innerText = `RS ${verifiedAmount}`;
            document.getElementById('pm-verification-gateway').innerText = 'Safepay Secure';
            
            try {
                // Play success chime
                window.playCustomerSuccessSound();
                
                // Transition to Step 4 (Approved success screen)
                document.getElementById('pm-step-3').classList.add('hidden');
                const s4 = document.getElementById('pm-step-4');
                if (s4) s4.classList.remove('hidden');
                
                const downloadsContainer = document.getElementById('pm-success-downloads-container');
                if (downloadsContainer) downloadsContainer.innerHTML = '';
                
                if (postId === 'cart_checkout') {
                    const cartItems = window.state.cart || [];
                    const promo = window.state.appliedPromoCode;
                    
                    let grandTotal = 0;
                    cartItems.forEach(item => {
                        const digits = item.price.replace(/[^0-9.]/g, '');
                        const unitPrice = parseFloat(digits) || 0;
                        grandTotal += unitPrice * item.quantity;
                    });
                    
                    let totalCartDiscount = 0;
                    if (promo && promo.isActive) {
                        if (promo.applicablePostId) {
                            const restrictedItem = cartItems.find(item => item.postId === promo.applicablePostId);
                            if (restrictedItem) {
                                const digits = restrictedItem.price.replace(/[^0-9.]/g, '');
                                const unitPrice = parseFloat(digits) || 0;
                                const subtotal = unitPrice * restrictedItem.quantity;
                                if (promo.discountType === 'percent') {
                                    totalCartDiscount = (subtotal * promo.value) / 100;
                                } else {
                                    totalCartDiscount = Math.min(promo.value, subtotal);
                                }
                            }
                        } else {
                            if (promo.discountType === 'percent') {
                                totalCartDiscount = (grandTotal * promo.value) / 100;
                            } else {
                                totalCartDiscount = Math.min(promo.value, grandTotal);
                            }
                        }
                    }
                    
                    const itemsWithDiscounts = cartItems.map(item => {
                        const digits = item.price.replace(/[^0-9.]/g, '');
                        const itemUnitPrice = parseFloat(digits) || 0;
                        const itemBaseTotal = itemUnitPrice * item.quantity;
                        
                        let itemDiscount = 0;
                        if (promo && promo.isActive) {
                            if (promo.applicablePostId) {
                                if (item.postId === promo.applicablePostId) {
                                    itemDiscount = totalCartDiscount;
                                }
                            } else {
                                if (promo.discountType === 'percent') {
                                    itemDiscount = (itemBaseTotal * promo.value) / 100;
                                } else {
                                    const share = grandTotal > 0 ? (itemBaseTotal / grandTotal) : 0;
                                    itemDiscount = totalCartDiscount * share;
                                }
                            }
                        }
                        const itemFinalPrice = Math.max(0, itemBaseTotal - itemDiscount);
                        const prefix = item.price.replace(/[0-9.]/g, '').trim() || 'RS';
                        return {
                            ...item,
                            discountAmount: itemDiscount,
                            finalPriceString: `${prefix} ${itemFinalPrice.toFixed(0)}`
                        };
                    });
                    
                    let html = `<p class="text-xs text-[var(--text-muted)] font-bold mb-3">Aap ki cart items unlock ho chuki hain (Safepay):</p><div class="space-y-2">`;
                    
                    for (const item of itemsWithDiscounts) {
                        const itemPurchaseId = `${user.uid}_${item.postId}`;
                        const purchaseRef = ref(window._db, `artifacts/${appId}/interactions/purchases/${itemPurchaseId}`);
                        
                        // Save approved purchase record
                        await set(purchaseRef, {
                            id: itemPurchaseId,
                            userId: user.uid,
                            userName: userProfile.name || user.email.split('@')[0],
                            userEmail: user.email,
                            postId: item.postId,
                            postTitle: item.postTitle,
                            gateway: 'Safepay Secure',
                            senderNo: 'Safepay',
                            senderName: 'Safepay Verified',
                            tid: tracker,
                            price: item.finalPriceString || item.price,
                            quantity: item.quantity,
                            remainingDownloads: item.quantity,
                            status: 'approved',
                            screenshotUrl: '',
                            createdAt: new Date().toISOString(),
                            couponApplied: promo ? promo.code : 'None',
                            discountAmount: item.discountAmount || 0
                        });
                        
                        // Decrement stock in database if it exists
                        const postRef = ref(window._db, `artifacts/${appId}/posts/${item.postId}`);
                        const postSnap = await get(postRef);
                        if (postSnap.exists()) {
                            const postData = postSnap.val();
                            if (postData.stock !== undefined && postData.stock !== null) {
                                const newStock = Math.max(0, postData.stock - item.quantity);
                                await update(postRef, { stock: newStock });
                            }
                        }
                        
                        const post = (window.state.posts || []).find(p => p.id === item.postId) || {};
                        const downloadUrl = post.actionUrl || '#';
                        html += `
                            <div class="flex justify-between items-center bg-[var(--bg-card-raw)] border border-[var(--border-primary)] rounded-xl p-3">
                                <span class="text-xs font-bold text-[var(--text-title)] truncate max-w-[180px]">${item.postTitle}</span>
                                <button onclick="window.triggerProductDownload('${itemPurchaseId}', '${downloadUrl}')" class="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-hover)] text-white text-[10px] font-black uppercase tracking-widest rounded-lg border-0 cursor-pointer transition active:scale-95 shadow-sm">
                                    Download ⬇️
                                </button>
                            </div>
                        `;
                        
                        // Trigger download
                        setTimeout(() => {
                            window.triggerProductDownload(itemPurchaseId, downloadUrl);
                        }, 800);
                    }
                    
                    html += `</div>`;
                    if (downloadsContainer) downloadsContainer.innerHTML = html;
                    
                    // Increment coupon usage in Firebase
                    if (promo && promo.isActive) {
                        const couponRef = ref(window._db, `artifacts/${appId}/promoCodes/${promo.code}`);
                        const couponSnap = await get(couponRef);
                        if (couponSnap.exists()) {
                            const cData = couponSnap.val();
                            const currentUsed = parseInt(cData.usedCount || 0, 10);
                            await update(couponRef, { usedCount: currentUsed + 1 });
                        }
                    }
                    
                    // Clear cart locally
                    window.state.cart = [];
                    localStorage.removeItem('ts_cart_' + user.uid);
                    window.renderSidebar();
                    
                } else {
                    const quantity = window.state.checkoutQuantity || 1;
                    const promo = window.state.singleCheckoutPromo;
                    
                    let discountAmount = 0;
                    if (promo && promo.isActive) {
                        const priceDigits = priceStr.replace(/[^0-9.]/g, '');
                        const unitPrice = parseFloat(priceDigits) || 0;
                        const baseTotal = unitPrice * quantity;
                        if (promo.discountType === 'percent') {
                            discountAmount = (baseTotal * promo.value) / 100;
                        } else {
                            discountAmount = Math.min(promo.value, baseTotal);
                        }
                    }
                    
                    const singlePurchaseId = `${user.uid}_${postId}`;
                    const purchaseRef = ref(window._db, `artifacts/${appId}/interactions/purchases/${singlePurchaseId}`);
                    
                    // Save approved purchase record
                    await set(purchaseRef, {
                        id: singlePurchaseId,
                        userId: user.uid,
                        userName: userProfile.name || user.email.split('@')[0],
                        userEmail: user.email,
                        postId: postId,
                        postTitle: postTitle,
                        gateway: 'Safepay Secure',
                        senderNo: 'Safepay',
                        senderName: 'Safepay Verified',
                        tid: tracker,
                        price: `RS ${verifiedAmount}`,
                        quantity: quantity,
                        remainingDownloads: quantity,
                        status: 'approved',
                        screenshotUrl: '',
                        createdAt: new Date().toISOString(),
                        couponApplied: promo ? promo.code : 'None',
                        discountAmount: discountAmount
                    });
                    
                    // Decrement stock in database if it exists
                    const postRef = ref(window._db, `artifacts/${appId}/posts/${postId}`);
                    const postSnap = await get(postRef);
                    if (postSnap.exists()) {
                        const postData = postSnap.val();
                        if (postData.stock !== undefined && postData.stock !== null) {
                            const newStock = Math.max(0, postData.stock - quantity);
                            await update(postRef, { stock: newStock });
                        }
                    }
                    
                    // Increment coupon usage in Firebase
                    if (promo && promo.isActive) {
                        const couponRef = ref(window._db, `artifacts/${appId}/promoCodes/${promo.code}`);
                        const couponSnap = await get(couponRef);
                        if (couponSnap.exists()) {
                            const cData = couponSnap.val();
                            const currentUsed = parseInt(cData.usedCount || 0, 10);
                            await update(couponRef, { usedCount: currentUsed + 1 });
                        }
                    }
                    
                    const post = (window.state.posts || []).find(p => p.id === postId) || {};
                    const downloadUrl = post.actionUrl || '#';
                    
                    if (downloadsContainer) {
                        downloadsContainer.innerHTML = `
                            <div class="space-y-4">
                                <p class="text-xs text-[var(--text-muted)] font-bold mb-2">"${postTitle}" download ke liye tayar hai (Safepay):</p>
                                <button onclick="window.triggerProductDownload('${singlePurchaseId}', '${downloadUrl}')" class="w-full py-3.5 bg-gradient-to-r from-[var(--color-primary)] to-indigo-600 hover:brightness-110 text-white text-xs font-black uppercase tracking-widest rounded-xl border-0 cursor-pointer transition active:scale-95 shadow-md flex items-center justify-center gap-2">
                                    <span>Download Premium File</span>
                                    <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                                </button>
                            </div>
                        `;
                    }
                    
                    // Auto-trigger single product download
                    setTimeout(() => {
                        window.triggerProductDownload(singlePurchaseId, downloadUrl);
                    }, 800);
                }
                
                // Reset coupon state
                window.state.appliedPromoCode = null;
                window.state.singleCheckoutPromo = null;
                
                notify("Payment verified successfully!", "success");
                
                // Re-render main UI
                window.renderUI();
                
            } catch(e) {
                console.error("Safepay Verification Error:", e);
                notify("Failed to verify transaction.", "error");
            }
        };

        window.startPaymentVerificationListener = (postId, purchaseId, tid, price, gateway) => {
            // Hide step 1 & 2
            const s1 = document.getElementById('pm-step-1');
            const s2 = document.getElementById('pm-step-2');
            if (s1) s1.classList.add('hidden');
            if (s2) s2.classList.add('hidden');
            
            // Show step 3 (Real-time loader)
            const s3 = document.getElementById('pm-step-3');
            if (s3) s3.classList.remove('hidden');
            
            // Update step 3 details
            const vTid = document.getElementById('pm-verification-tid');
            const vAmt = document.getElementById('pm-verification-amount');
            const vGtw = document.getElementById('pm-verification-gateway');
            if (vTid) vTid.innerText = tid;
            if (vAmt) vAmt.innerText = price;
            if (vGtw) vGtw.innerText = gateway;
            
            const statusTicker = document.getElementById('pm-status-ticker');
            if (statusTicker) {
                statusTicker.innerText = 'Waiting for Admin Check';
                statusTicker.className = 'text-xs font-semibold text-amber-500 uppercase tracking-widest animate-pulse';
            }
            
            // Database path reference
            const purchaseRef = ref(window._db, `artifacts/${appId}/interactions/purchases/${purchaseId}`);
            const verifiedRef = ref(window._db, `artifacts/${appId}/interactions/verified_trxs/${tid}`);
            
            // Unsubscribe existing listeners first if any
            if (window._currentPaymentListenerUnsubscribe) {
                window._currentPaymentListenerUnsubscribe();
            }
            if (window._currentVerifiedListenerUnsubscribe) {
                window._currentVerifiedListenerUnsubscribe();
            }
            
            // Subscribe to Firebase Realtime verified Trx status updates (from Make.com)
            window._currentVerifiedListenerUnsubscribe = onValue(verifiedRef, async (snap) => {
                if (snap.exists()) {
                    const verifiedTrx = snap.val();
                    if (verifiedTrx.status === 'approved') {
                        // Automatically update the purchase node to approved on the client-side!
                        try {
                            await update(purchaseRef, {
                                status: 'approved',
                                approvedAt: new Date().toISOString(),
                                approvedBy: 'AutoScanner'
                            });
                        } catch(e) {
                            console.error("Auto approval update failed:", e);
                        }
                    }
                }
            });
            
            // Subscribe to Firebase Realtime status updates for the purchase
            window._currentPaymentListenerUnsubscribe = onValue(purchaseRef, (snap) => {
                if (snap.exists()) {
                    const purchase = snap.val();
                    if (purchase.status === 'approved') {
                        // Play high-quality synthesized sound
                        window.playCustomerSuccessSound();
                        
                        // Stop listening
                        if (window._currentPaymentListenerUnsubscribe) {
                            window._currentPaymentListenerUnsubscribe();
                            window._currentPaymentListenerUnsubscribe = null;
                        }
                        if (window._currentVerifiedListenerUnsubscribe) {
                            window._currentVerifiedListenerUnsubscribe();
                            window._currentVerifiedListenerUnsubscribe = null;
                        }
                        
                        // Transition to Step 4 (Approved success screen)
                        if (s3) s3.classList.add('hidden');
                        const s4 = document.getElementById('pm-step-4');
                        if (s4) s4.classList.remove('hidden');
                        
                        // Render downloads content
                        const downloadsContainer = document.getElementById('pm-success-downloads-container');
                        if (downloadsContainer) {
                            downloadsContainer.innerHTML = '';
                            
                            if (postId === 'cart_checkout') {
                                const cartItems = window.state.completedCartItems || [];
                                let html = `<p class="text-xs text-[var(--text-muted)] font-bold mb-3">Aap ki cart items unlock ho chuki hain:</p><div class="space-y-2">`;
                                cartItems.forEach(item => {
                                    const itemPurchaseId = `${purchase.userId}_${item.postId}`;
                                    const post = (window.state.posts || []).find(p => p.id === item.postId) || {};
                                    const downloadUrl = post.actionUrl || '#';
                                    html += `
                                        <div class="flex justify-between items-center bg-[var(--bg-card-raw)] border border-[var(--border-primary)] rounded-xl p-3">
                                            <span class="text-xs font-bold text-[var(--text-title)] truncate max-w-[180px]">${item.postTitle}</span>
                                            <button onclick="window.triggerProductDownload('${itemPurchaseId}', '${downloadUrl}')" class="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-hover)] text-white text-[10px] font-black uppercase tracking-widest rounded-lg border-0 cursor-pointer transition active:scale-95 shadow-sm">
                                                Download ⬇️
                                            </button>
                                        </div>
                                    `;
                                    
                                    // Trigger auto download after a small staggered delay
                                    setTimeout(() => {
                                        window.triggerProductDownload(itemPurchaseId, downloadUrl);
                                    }, 800);
                                });
                                html += `</div>`;
                                downloadsContainer.innerHTML = html;
                            } else {
                                const post = (window.state.posts || []).find(p => p.id === postId) || {};
                                const downloadUrl = post.actionUrl || '#';
                                downloadsContainer.innerHTML = `
                                    <div class="space-y-4">
                                        <p class="text-xs text-[var(--text-muted)] font-bold mb-2">"${purchase.postTitle}" download ke liye tayar hai:</p>
                                        <button onclick="window.triggerProductDownload('${purchaseId}', '${downloadUrl}')" class="w-full py-3.5 bg-gradient-to-r from-[var(--color-primary)] to-indigo-600 hover:brightness-110 text-white text-xs font-black uppercase tracking-widest rounded-xl border-0 cursor-pointer transition active:scale-95 shadow-md flex items-center justify-center gap-2">
                                            <span>Download Premium File</span>
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                                        </button>
                                    </div>
                                `;
                                
                                // Auto-trigger single product download
                                setTimeout(() => {
                                    window.triggerProductDownload(purchaseId, downloadUrl);
                                }, 800);
                            }
                        }
                        
                        // Re-render main page UI so download button shows up there too
                        window.renderUI();
                        
                    } else if (purchase.status === 'rejected') {
                        // Stop listening
                        if (window._currentPaymentListenerUnsubscribe) {
                            window._currentPaymentListenerUnsubscribe();
                            window._currentPaymentListenerUnsubscribe = null;
                        }
                        
                        notify("Payment Verification Declined by Admin", "error");
                        if (statusTicker) {
                            statusTicker.innerText = 'Declined: Invalid TID';
                            statusTicker.className = 'text-xs font-semibold text-red-500 uppercase tracking-widest';
                        }
                        
                        // Go back to form after a delay so they can fix TID
                        setTimeout(() => {
                            window.backToStep1();
                            notify("Aapki verification reject ho gayi hai. Please correct TID check karke dobara submit karein.", "info");
                        }, 3000);
                    }
                }
            });
        };

        window.playCustomerSuccessSound = () => {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                const ctx = new AudioContext();
                
                const playChime = (delay, freq, duration) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
                    gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
                    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(ctx.currentTime + delay);
                    osc.stop(ctx.currentTime + delay + duration);
                };
                
                // Arpeggio of pleasant celestial notes (C-Major Chime)
                playChime(0, 523.25, 0.4);   // C5
                playChime(0.08, 659.25, 0.4); // E5
                playChime(0.16, 783.99, 0.5); // G5
                playChime(0.24, 1046.50, 0.8); // C6
            } catch(e) {}
        };

        window.triggerProductDownload = async (purchaseId, actionUrl) => {
            try {
                const purchaseRef = ref(window._db, `artifacts/${appId}/interactions/purchases/${purchaseId}`);
                const snap = await get(purchaseRef);
                if (!snap.exists()) {
                    notify("Purchase record not found.", "error");
                    return;
                }
                const purchase = snap.val();
                const rem = purchase.remainingDownloads !== undefined ? purchase.remainingDownloads : purchase.quantity || 1;
                if (rem <= 0) {
                    notify("Download limit reached. Please purchase again.", "error");
                    if (window.state.currentPost) window.renderSinglePost(window.state.currentPost);
                    return;
                }
                // Open download in new tab
                window.open(actionUrl, '_blank');
                // Decrement remaining downloads
                const newRem = rem - 1;
                await update(purchaseRef, { remainingDownloads: newRem });
                // Update local state
                if (window.state.purchases) {
                    window.state.purchases[purchaseId] = { ...purchase, remainingDownloads: newRem };
                }
                notify(`Download started! ${newRem} download${newRem !== 1 ? 's' : ''} remaining.`, "success");
                // Re-render to update counter
                if (window.state.currentPost) window.renderSinglePost(window.state.currentPost);
            } catch(err) {
                console.error("Download error:", err);
                notify("Download failed. Try again.", "error");
            }
        };

        // ========================================================
        // SHOPPING CART & UTILITY FUNCTIONS
        // ========================================================
        window.addToCart = (postId, postTitle, price, thumbnail) => {
            const { user } = window.state;
            if (!user || user.isAnonymous) {
                notify("Please log in to add items to your cart.", "error");
                window.location.hash = 'account';
                return;
            }
            
            window.state.cart = window.state.cart || [];
            const post = (window.state.posts || []).find(p => p.id === postId);
            const existingIndex = window.state.cart.findIndex(item => item.postId === postId);
            
            if (post && post.type === 'shop' && post.stock !== undefined && post.stock !== null) {
                const currentInCart = existingIndex > -1 ? window.state.cart[existingIndex].quantity : 0;
                if (currentInCart >= post.stock) {
                    notify(`Afsos! Hmare paas sirf ${post.stock} stock hi available hai, aap is se zyada cart mein add nahi kar sakte.`, "error");
                    return;
                }
            }
            
            if (existingIndex > -1) {
                window.state.cart[existingIndex].quantity += 1;
            } else {
                window.state.cart.push({ postId, postTitle, price, thumbnail, quantity: 1 });
            }
            
            localStorage.setItem('ts_cart_' + user.uid, JSON.stringify(window.state.cart));
            notify("Added to Cart! 🛒", "success");
            window.renderSidebar();
            if (window.state.currentTab === 'cart') window.renderUI();
        };

        window.changeCartQty = (idx, delta) => {
            const { user } = window.state;
            if (!user) return;
            window.state.cart = window.state.cart || [];
            if (window.state.cart[idx]) {
                const item = window.state.cart[idx];
                const post = (window.state.posts || []).find(p => p.id === item.postId);
                let qty = item.quantity + delta;
                qty = Math.max(1, qty);
                
                if (delta > 0 && post && post.type === 'shop' && post.stock !== undefined && post.stock !== null) {
                    if (qty > post.stock) {
                        notify(`Afsos! Hmare paas sirf ${post.stock} stock hi available hai.`, "error");
                        return;
                    }
                }
                
                window.state.cart[idx].quantity = qty;
                localStorage.setItem('ts_cart_' + user.uid, JSON.stringify(window.state.cart));
                window.renderSidebar();
                window.renderUI();
            }
        };
        
        window.removeFromCart = (idx) => {
            const { user } = window.state;
            if (!user) return;
            window.state.cart = window.state.cart || [];
            window.state.cart.splice(idx, 1);
            localStorage.setItem('ts_cart_' + user.uid, JSON.stringify(window.state.cart));
            notify("Removed from cart.");
            window.renderSidebar();
            window.renderUI();
        };
        
        window.applyCartPromoCode = () => {
            const input = document.getElementById('cart-promo-input');
            if (!input) return;
            const codeText = input.value.trim().toUpperCase();
            if (!codeText) {
                notify("Please enter a promo code.", "error");
                return;
            }
            
            const codes = window.state.promoCodes || [];
            const promo = codes.find(c => c.code.trim().toUpperCase() === codeText);
            
            if (!promo) {
                notify("Invalid Promo Code. Please try another.", "error");
                return;
            }
            
            if (!promo.isActive) {
                notify("Promo Code is inactive.", "error");
                return;
            }

            // Expiry Check
            if (promo.expiryDate && new Date() > new Date(promo.expiryDate)) {
                notify("This Promo Code has expired.", "error");
                return;
            }

            // Max Uses Check
            if (promo.maxUses > 0 && (promo.usedCount || 0) >= promo.maxUses) {
                notify("Promo Code usage limit has been reached.", "error");
                return;
            }

            // Product Restriction Check
            if (promo.applicablePostId) {
                const cartItems = window.state.cart || [];
                const hasProduct = cartItems.some(item => item.postId === promo.applicablePostId);
                if (!hasProduct) {
                    const targetPost = (window.state.posts || []).find(p => p.id === promo.applicablePostId);
                    const targetTitle = targetPost ? targetPost.title : 'a specific product';
                    notify(`This promo code is only applicable if the product "${targetTitle}" is in your cart.`, "error");
                    return;
                }
            }
            
            window.state.appliedPromoCode = promo;
            notify(`Promo Code ${promo.code} Applied Successfully! 🏷️`, "success");
            window.renderUI();
        };

        window.removeCartPromoCode = () => {
            window.state.appliedPromoCode = null;
            notify("Promo Code Removed.", "info");
            window.renderUI();
        };

        window.checkoutCart = () => {
            const cartItems = window.state.cart || [];
            if (cartItems.length === 0) return;
            
            const compiledTitle = cartItems.map(item => `${item.postTitle} (QTY: ${item.quantity})`).join(', ');
            let grandTotal = 0;
            let currencyPrefix = 'RS:';
            
            cartItems.forEach(item => {
                const digits = item.price.replace(/[^0-9.]/g, '');
                const unitPrice = parseFloat(digits) || 0;
                grandTotal += unitPrice * item.quantity;
                const prefix = item.price.replace(/[0-9.]/g, '').trim();
                if (prefix) currencyPrefix = prefix;
            });
            
            let discountAmount = 0;
            const promo = window.state.appliedPromoCode;
            if (promo && promo.isActive) {
                if (promo.applicablePostId) {
                    const restrictedItem = cartItems.find(item => item.postId === promo.applicablePostId);
                    if (restrictedItem) {
                        const digits = restrictedItem.price.replace(/[^0-9.]/g, '');
                        const unitPrice = parseFloat(digits) || 0;
                        const subtotal = unitPrice * restrictedItem.quantity;
                        if (promo.discountType === 'percent') {
                            discountAmount = (subtotal * promo.value) / 100;
                        } else {
                            discountAmount = Math.min(promo.value, subtotal);
                        }
                    }
                } else {
                    if (promo.discountType === 'percent') {
                        discountAmount = (grandTotal * promo.value) / 100;
                    } else {
                        discountAmount = Math.min(promo.value, grandTotal);
                    }
                }
            }

            const finalTotal = Math.max(0, grandTotal - discountAmount);
            let displayPrice = `${currencyPrefix} ${finalTotal.toFixed(0)}`;
            if (window.state.appliedPromoCode) {
                displayPrice += ` (${window.state.appliedPromoCode.code} Applied)`;
            }
            
            window.openPaymentModal('cart_checkout', compiledTitle, displayPrice);
        };

        window.scrollToResource = () => {
            const promptsEl = document.getElementById('post-prompts-container');
            const cardEl = document.getElementById('resource-sidebar-card');
            
            let target = null;
            if (promptsEl && promptsEl.children.length > 0) {
                target = promptsEl;
            } else if (cardEl) {
                target = cardEl;
            }
            
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Add a stunning glowing brand focus indicator
                target.classList.add('transition-all', 'duration-500', 'ring-4', 'ring-brand', 'shadow-[0_0_40px_rgba(255,190,0,0.5)]');
                setTimeout(() => {
                    target.classList.remove('ring-4', 'ring-brand', 'shadow-[0_0_40px_rgba(255,190,0,0.5)]');
                }, 2000);
            }
        };

        window.addEventListener('hashchange', () => {
            const h = decodeURIComponent(window.location.hash.replace('#',''));
            const knownTabs = ['home', 'gems', 'tools', 'prompts', 'apps', 'shop', 'saved', 'account', 'privacy', 'terms', 'cart'];

            if(knownTabs.includes(h) || h === '') {
                // Leaving a post page — detach comments listener
                if (currentCommentsListener) { currentCommentsListener(); currentCommentsListener = null; }
                window.state.comments = [];
                let defaultTab = 'home';
                if (window.state.settings && window.state.settings.tabOrder && window.state.settings.tabOrder.length > 0) {
                    defaultTab = window.state.settings.tabOrder[0];
                }
                window.state.currentTab = h || defaultTab;
                window.state.currentPost = null;
                window.state.visiblePostsCount = 12;
            } else {
                const foundPost = window.state.posts.find(p => window.slugify(p.title || '') === h || p.id === h || `post-${p.id}` === h);
                if(foundPost) { window.state.currentPost = foundPost; window.state.currentTab = ''; } 
                else { 
                    let defaultTab = 'home';
                    if (window.state.settings && window.state.settings.tabOrder && window.state.settings.tabOrder.length > 0) {
                        defaultTab = window.state.settings.tabOrder[0];
                    }
                    window.state.currentTab = defaultTab; 
                    window.state.currentPost = null; 
                }
            }

            if(window.innerWidth < 1024) { 
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('mobile-overlay');
                if(sidebar) sidebar.classList.add('-translate-x-full'); 
                if(overlay) overlay.classList.add('hidden'); 
            } else {
                // If on desktop, automatically collapse sidebar when navigations occur
                if (!document.body.classList.contains('sidebar-collapsed')) {
                    window.toggleDesktopCollapse();
                }
            }
            window.state.searchQuery = '';
            window.renderUI();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        // ========================================================
        // USERNAME SETUP MODAL — Full Logic
        // ========================================================
        const USM_PRESET_AVATARS = [
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna&backgroundColor=ffd5dc',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe&backgroundColor=c0aede',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Max&backgroundColor=d1d4f9',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia&backgroundColor=b6e3f4',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=ffdfbf',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam&backgroundColor=c0aede',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Riley&backgroundColor=ffd5dc',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor&backgroundColor=b6e3f4',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan&backgroundColor=d1d4f9',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Casey&backgroundColor=ffdfbf',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan&backgroundColor=c0aede',
        ];

        let _usmState = { selectedAvatarUrl: '', croppedDataUrl: '', usernameValid: false, checkTimer: null };

        // ——— Open Modal ———
        window.usmOpen = (existingAvatar, letter) => {
            const modal = document.getElementById('username-setup-modal');
            if (!modal) return;
            
            // Reset state
            _usmState = { selectedAvatarUrl: '', croppedDataUrl: '', usernameValid: false, checkTimer: null };
            
            // Set initial letter
            const letterEl = document.getElementById('usm-avatar-letter');
            if (letterEl) letterEl.textContent = letter || '?';
            
            // If user has Google photo, pre-select it
            if (existingAvatar) {
                _usmState.selectedAvatarUrl = existingAvatar;
                usmUpdatePreview(existingAvatar, null);
            }
            
            // Render preset avatars
            const grid = document.getElementById('usm-preset-avatars');
            if (grid) {
                grid.innerHTML = USM_PRESET_AVATARS.map((url, i) => `
                    <button onclick="window.usmSelectPreset('${url}')" 
                        class="usm-preset-btn aspect-square rounded-full overflow-hidden border-3 border-transparent hover:border-[var(--color-primary)] hover:scale-110 transition-all duration-200 shadow-md"
                        data-index="${i}" style="border:3px solid transparent;">
                        <img src="${url}" alt="avatar ${i+1}" class="w-full h-full object-cover" loading="lazy">
                    </button>
                `).join('');
            }
            
            // File input listener
            const fileInput = document.getElementById('usm-file-input');
            if (fileInput) {
                fileInput.value = '';
                fileInput.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { notify('Image too large. Max 5MB.', 'error'); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => { window.usmOpenCropper(ev.target.result); };
                    reader.readAsDataURL(file);
                };
            }
            
            // Show step 1
            usmShowStep('step-1');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        };

        // ——— Close Modal ———
        window.usmClose = () => {
            const modal = document.getElementById('username-setup-modal');
            if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
        };

        // ——— Show Step ———
        function usmShowStep(stepId) {
            ['usm-step-1', 'usm-step-crop', 'usm-step-3'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });
            const target = document.getElementById(`usm-${stepId}`);
            if (target) target.classList.remove('hidden');
        }

        // ——— Select Preset Avatar ———
        window.usmSelectPreset = (url) => {
            _usmState.selectedAvatarUrl = url;
            _usmState.croppedDataUrl = '';
            usmUpdatePreview(url, null);
            // Highlight selected
            document.querySelectorAll('.usm-preset-btn').forEach(btn => {
                btn.style.border = btn.querySelector('img').src.includes(url.split('seed=')[1]) ? '3px solid var(--color-primary)' : '3px solid transparent';
                btn.style.transform = btn.querySelector('img').src.includes(url.split('seed=')[1]) ? 'scale(1.15)' : '';
            });
        };

        // ——— Update Preview ———
        function usmUpdatePreview(url, dataUrl) {
            const finalUrl = dataUrl || url;
            const previewImg = document.getElementById('usm-avatar-img');
            const letterEl = document.getElementById('usm-avatar-letter');
            if (finalUrl) {
                if (previewImg) { previewImg.src = finalUrl; previewImg.classList.remove('hidden'); }
                if (letterEl) letterEl.classList.add('hidden');
            } else {
                if (previewImg) previewImg.classList.add('hidden');
                if (letterEl) letterEl.classList.remove('hidden');
            }
        }

        // ——— Next Step (Avatar → Username) ———
        window.usmNextStep = () => {
            // Update step 3 preview
            const finalUrl = _usmState.croppedDataUrl || _usmState.selectedAvatarUrl;
            const s3img = document.getElementById('usm-step3-img');
            const s3letter = document.getElementById('usm-step3-letter');
            if (finalUrl && s3img) { 
                s3img.src = finalUrl; 
                s3img.classList.remove('hidden'); 
                if(s3letter) s3letter.classList.add('hidden');
            } else if (s3letter) { 
                s3letter.classList.remove('hidden'); 
                if(s3img) s3img.classList.add('hidden'); 
            }
            usmShowStep('step-3');
        };

        window.usmBackToStep1 = () => { usmShowStep('step-1'); };

        window.usmSkipForNow = async () => {
            // Mark setup skipped so modal doesn't reappear immediately
            const user = window.state.user;
            if (user) {
                await update(ref(db, `artifacts/${appId}/users/${user.uid}/profile/data`), { setupComplete: true });
            }
            window.usmClose();
        };

        // ========================================================
        // IMAGE CROPPER — YouTube/TikTok Style
        // Fixed circle in center, image drags & zooms underneath
        // ========================================================
        const CROP_CIRCLE_R = 118; // radius in px
        const CROP_ARENA_H = 300;
        const CROP_ARENA_W = () => (document.getElementById('usm-crop-arena')?.clientWidth || 460);

        let _crop = {
            // image position (center of image relative to arena center)
            imgX: 0, imgY: 0,
            // zoom scale (1 = fit to circle)
            zoom: 1, minZoom: 1,
            // natural size
            natW: 0, natH: 0,
            // drag state
            dragging: false, lastX: 0, lastY: 0,
            // pinch
            pinching: false, pinchDist: 0
        };

        function _cropGetDisplaySize() {
            const scale = _crop.zoom * _crop.minZoom;
            return { w: _crop.natW * scale, h: _crop.natH * scale };
        }

        function _cropClamp() {
            const { w, h } = _cropGetDisplaySize();
            const arenaW = CROP_ARENA_W();
            const cx = arenaW / 2, cy = CROP_ARENA_H / 2;
            const r = CROP_CIRCLE_R;
            // Ensure circle is always covered
            _crop.imgX = Math.min(_crop.imgX, cx - r + w / 2);
            _crop.imgX = Math.max(_crop.imgX, cx + r - w / 2);
            _crop.imgY = Math.min(_crop.imgY, cy - r + h / 2);
            _crop.imgY = Math.max(_crop.imgY, cy + r - h / 2);
        }

        function _cropRender() {
            const img = document.getElementById('usm-crop-img');
            if (!img) return;
            const { w, h } = _cropGetDisplaySize();
            img.style.width = w + 'px';
            img.style.height = h + 'px';
            img.style.left = (_crop.imgX - w / 2) + 'px';
            img.style.top = (_crop.imgY - h / 2) + 'px';
        }

        window.usmOpenCropper = (dataUrl) => {
            const img = document.getElementById('usm-crop-img');
            if (!img) return;
            img.src = dataUrl;
            img.onload = () => {
                _crop.natW = img.naturalWidth;
                _crop.natH = img.naturalHeight;
                const arenaW = CROP_ARENA_W();
                // Minimum zoom: image must cover the circle (diameter = 2*R)
                const d = CROP_CIRCLE_R * 2;
                _crop.minZoom = Math.max(d / _crop.natW, d / _crop.natH);
                _crop.zoom = 1;
                // Center image
                _crop.imgX = arenaW / 2;
                _crop.imgY = CROP_ARENA_H / 2;
                _cropClamp();
                _cropRender();
                // Reset zoom slider
                const sl = document.getElementById('usm-zoom-slider');
                if (sl) sl.value = 100;
                usmShowStep('step-crop');
            };
        };

        // --- Mouse Drag ---
        window._cropDragStart = (e) => {
            const arena = document.getElementById('usm-crop-arena');
            if (!arena || e.target.closest('input[type=range]')) return;
            _crop.dragging = true;
            _crop.lastX = e.clientX; _crop.lastY = e.clientY;
            arena.style.cursor = 'grabbing';
            e.preventDefault();
        };
        document.addEventListener('mousemove', (e) => {
            if (!_crop.dragging) return;
            _crop.imgX += e.clientX - _crop.lastX;
            _crop.imgY += e.clientY - _crop.lastY;
            _crop.lastX = e.clientX; _crop.lastY = e.clientY;
            _cropClamp(); _cropRender();
        });
        document.addEventListener('mouseup', () => {
            if (_crop.dragging) {
                _crop.dragging = false;
                const arena = document.getElementById('usm-crop-arena');
                if (arena) arena.style.cursor = 'grab';
            }
        });

        // --- Scroll Wheel Zoom ---
        document.addEventListener('wheel', (e) => {
            const arena = document.getElementById('usm-crop-arena');
            if (!arena || !arena.contains(e.target)) return;
            e.preventDefault();
            const delta = e.deltaY < 0 ? 1.08 : 0.93;
            _crop.zoom = Math.max(1, Math.min(3, _crop.zoom * delta));
            _cropClamp(); _cropRender();
            // Sync slider
            const sl = document.getElementById('usm-zoom-slider');
            if (sl) sl.value = Math.round((_crop.zoom - 1) / 2 * 200 + 100);
        }, { passive: false });

        // --- Zoom Slider ---
        window._cropZoomSlider = (val) => {
            const pct = (val - 100) / 200; // 0..1
            _crop.zoom = 1 + pct * 2; // 1..3
            _cropClamp(); _cropRender();
        };

        // --- Touch Drag & Pinch-to-Zoom ---
        window._cropTouchStart = (e) => {
            if (e.touches.length === 1) {
                _crop.dragging = true;
                _crop.lastX = e.touches[0].clientX;
                _crop.lastY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                _crop.dragging = false;
                _crop.pinching = true;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                _crop.pinchDist = Math.hypot(dx, dy);
            }
            e.preventDefault();
        };
        document.addEventListener('touchmove', (e) => {
            const arena = document.getElementById('usm-crop-arena');
            if (!arena) return;
            if (_crop.dragging && e.touches.length === 1) {
                _crop.imgX += e.touches[0].clientX - _crop.lastX;
                _crop.imgY += e.touches[0].clientY - _crop.lastY;
                _crop.lastX = e.touches[0].clientX;
                _crop.lastY = e.touches[0].clientY;
                _cropClamp(); _cropRender();
                e.preventDefault();
            } else if (_crop.pinching && e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                _crop.zoom = Math.max(1, Math.min(3, _crop.zoom * (dist / _crop.pinchDist)));
                _crop.pinchDist = dist;
                _cropClamp(); _cropRender();
                e.preventDefault();
            }
        }, { passive: false });
        document.addEventListener('touchend', () => { _crop.dragging = false; _crop.pinching = false; });

        // --- Apply Crop (render to canvas) ---
        window.usmApplyCrop = () => {
            const img = document.getElementById('usm-crop-img');
            const canvas = document.getElementById('usm-crop-canvas');
            if (!img || !canvas) return;

            const outputSize = 400;
            canvas.width = outputSize; canvas.height = outputSize;
            const ctx = canvas.getContext('2d');

            // Draw circular clip
            ctx.beginPath();
            ctx.arc(outputSize/2, outputSize/2, outputSize/2, 0, Math.PI*2);
            ctx.clip();

            // The arena center is where the circle is
            const arenaW = CROP_ARENA_W();
            const arenaCX = arenaW / 2, arenaCY = CROP_ARENA_H / 2;
            const { w, h } = _cropGetDisplaySize();

            // Image top-left in arena coords
            const imgLeft = _crop.imgX - w / 2;
            const imgTop  = _crop.imgY - h / 2;

            // Circle top-left in arena coords
            const cirLeft = arenaCX - CROP_CIRCLE_R;
            const cirTop  = arenaCY - CROP_CIRCLE_R;

            // Source crop region in image coords (scale back from display to natural)
            const scaleToNat = _crop.natW / w;
            const srcX = (cirLeft - imgLeft) * scaleToNat;
            const srcY = (cirTop  - imgTop)  * scaleToNat;
            const srcS = CROP_CIRCLE_R * 2 * scaleToNat;

            ctx.drawImage(img, srcX, srcY, srcS, srcS, 0, 0, outputSize, outputSize);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            _usmState.croppedDataUrl = dataUrl;
            _usmState.selectedAvatarUrl = '';
            usmUpdatePreview('', dataUrl);
            const previewImg = document.getElementById('usm-avatar-img');
            if (previewImg) { previewImg.src = dataUrl; previewImg.classList.remove('hidden'); }
            usmShowStep('step-1');
        };


        // ========================================================
        // USERNAME AVAILABILITY CHECK
        // ========================================================
        window.usmCheckUsername = (val) => {
            clearTimeout(_usmState.checkTimer);
            const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
            const input = document.getElementById('usm-username-input');
            if (input && input.value !== cleaned) { input.value = cleaned; }
            
            const msgEl = document.getElementById('usm-username-msg');
            const iconEl = document.getElementById('usm-username-status-icon');
            const saveBtn = document.getElementById('usm-save-btn');
            
            _usmState.usernameValid = false;
            if (saveBtn) saveBtn.disabled = true;

            if (!cleaned || cleaned.length < 3) {
                if (msgEl) { msgEl.textContent = '3–20 characters, letters, numbers, underscores only'; msgEl.className = 'text-xs mt-1.5 ml-1 font-semibold text-[var(--text-muted)]'; }
                if (iconEl) iconEl.innerHTML = '';
                return;
            }
            if (cleaned.length > 20) {
                if (msgEl) { msgEl.textContent = 'Max 20 characters'; msgEl.className = 'text-xs mt-1.5 ml-1 font-semibold text-rose-500'; }
                return;
            }

            // Show checking state
            if (iconEl) iconEl.innerHTML = '<svg class="animate-spin w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
            if (msgEl) { msgEl.textContent = 'Checking availability...'; msgEl.className = 'text-xs mt-1.5 ml-1 font-semibold text-[var(--text-muted)]'; }

            _usmState.checkTimer = setTimeout(async () => {
                let isTaken = false;
                let checkDone = false;

                // Method 1: Check public usernames index
                try {
                    const snap = await get(child(ref(db), `artifacts/${appId}/public/data/usernames/${cleaned}`));
                    isTaken = snap.exists();
                    checkDone = true;
                } catch(e1) {
                    // Rules blocked — try Method 2: scan all users
                    try {
                        const usersSnap = await get(child(ref(db), `artifacts/${appId}/users`));
                        if (usersSnap.exists()) {
                            usersSnap.forEach(userSnap => {
                                const profile = userSnap.child('profile/data').val();
                                if (profile && profile.username && profile.username.toLowerCase() === cleaned) {
                                    isTaken = true;
                                }
                            });
                        }
                        checkDone = true;
                    } catch(e2) {
                        // Both methods failed — allow the username (will catch duplicates server-side)
                        checkDone = false;
                        console.warn('Username check unavailable:', e2.code || e2.message);
                    }
                }

                if (!checkDone) {
                    // Fallback: allow submit (cannot verify)
                    if (msgEl) { msgEl.textContent = `@${cleaned} — looks good! ✓`; msgEl.className = 'text-xs mt-1.5 ml-1 font-semibold text-emerald-500'; }
                    if (iconEl) iconEl.innerHTML = '<svg class="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
                    _usmState.usernameValid = true;
                    if (saveBtn) saveBtn.disabled = false;
                    return;
                }

                if (isTaken) {
                    if (msgEl) { msgEl.textContent = `@${cleaned} is already taken. Try another!`; msgEl.className = 'text-xs mt-1.5 ml-1 font-semibold text-rose-500'; }
                    if (iconEl) iconEl.innerHTML = '<svg class="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';
                    _usmState.usernameValid = false;
                    if (saveBtn) saveBtn.disabled = true;
                } else {
                    if (msgEl) { msgEl.textContent = `@${cleaned} is available! 🎉`; msgEl.className = 'text-xs mt-1.5 ml-1 font-semibold text-emerald-500'; }
                    if (iconEl) iconEl.innerHTML = '<svg class="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>';
                    _usmState.usernameValid = true;
                    if (saveBtn) saveBtn.disabled = false;
                }
            }, 600);
        };

        // ========================================================
        // SAVE PROFILE (Avatar + Username)
        // ========================================================
        window.usmSaveProfile = async () => {
            const user = window.state.user;
            if (!user) return;
            const btn = document.getElementById('usm-save-btn');
            const origHtml = btn ? btn.innerHTML : '';
            if (btn) { btn.innerHTML = '<svg class="animate-spin w-4 h-4 mx-auto text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Saving...'; btn.disabled = true; }

            const usernameEl = document.getElementById('usm-username-input');
            const username = usernameEl ? usernameEl.value.trim().toLowerCase() : '';

            if (!_usmState.usernameValid || !username) {
                notify('Please choose a valid, available username.', 'error');
                if (btn) { btn.innerHTML = origHtml; btn.disabled = false; }
                return;
            }

            let avatarUrl = _usmState.croppedDataUrl || _usmState.selectedAvatarUrl || user.photoURL || '';

            // Upload cropped image to imgbb if it's a data URL
            if (avatarUrl && avatarUrl.startsWith('data:')) {
                try {
                    const base64 = avatarUrl.split(',')[1];
                    const formData = new FormData();
                    formData.append('image', base64);
                    const IMGBB_KEY = window.IMGBB_API_KEY || (typeof IMGBB_API_KEY !== 'undefined' ? IMGBB_API_KEY : '');
                    if (IMGBB_KEY) {
                        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: formData });
                        const data = await res.json();
                        if (data.success) avatarUrl = data.data.url;
                    }
                } catch(e) {
                    console.warn('Avatar upload failed, using SVG avatar as fallback');
                    // If upload fails, use the selected preset/URL avatar instead
                    avatarUrl = _usmState.selectedAvatarUrl || user.photoURL || '';
                }
            }

            try {
                // 1. Save the main profile (user owns this path — always writable)
                await update(ref(db, `artifacts/${appId}/users/${user.uid}/profile/data`), {
                    username,
                    avatarUrl,
                    name: username,
                    setupComplete: true
                });

                // 2. Try to save username index for uniqueness (optional — may fail due to rules)
                try {
                    await set(ref(db, `artifacts/${appId}/public/data/usernames/${username}`), user.uid);
                } catch(ruleErr) {
                    // Firebase rules blocked public write — that's OK, profile is already saved
                    console.warn('Username index write skipped (Firebase rules):', ruleErr.code || ruleErr.message);
                }

                notify(`Welcome, @${username}! 🚀 Your profile is live!`, 'success');
                window.usmClose();

            } catch(err) {
                console.error('Profile save error:', err);
                // Show specific error message
                const errMsg = err.code === 'PERMISSION_DENIED' 
                    ? 'Permission denied. Check Firebase rules.' 
                    : (err.message || 'Failed to save profile. Please try again.');
                notify(errMsg, 'error');
                if (btn) { btn.innerHTML = origHtml; btn.disabled = false; }
            }
        };

        onAuthStateChanged(auth, async (user) => {
            window.state.user = user;
            // Reset AI Support memory so that it greets the logged-in user by name dynamically on their next message!
            window.state.aiChatHistory = null;
            if (user && !user.isAnonymous) {
                // Initialize Cart
                try {
                    const storedCart = localStorage.getItem('ts_cart_' + user.uid);
                    window.state.cart = storedCart ? JSON.parse(storedCart) : [];
                } catch(e) {
                    window.state.cart = [];
                }
                
                // If cached state shows unverified, reload to check fresh status from server
                if (!user.emailVerified) {
                    try {
                        await user.reload();
                    } catch (reloadErr) {
                        console.warn("Background auth state reload failed:", reloadErr);
                    }
                }

                // Email Verification Gate
                if (!user.emailVerified) {
                    const evModal = document.getElementById('email-verification-modal');
                    if (evModal) {
                        evModal.classList.remove('hidden');
                        evModal.classList.add('flex');
                    }
                    const evEmailText = document.getElementById('ev-display-email');
                    if (evEmailText) evEmailText.textContent = user.email;
                    
                    // Reset states since they are not verified
                    window.state.userProfile = {};
                    window.state.savedPosts = [];
                    window.state.userNotifications = [];
                    
                    if (window.state.currentTab === 'account') window.renderUI();
                    return; // Stop execution to block database listeners and profile creation
                } else {
                    const evModal = document.getElementById('email-verification-modal');
                    if (evModal) {
                        evModal.classList.add('hidden');
                        evModal.classList.remove('flex');
                    }
                }

                const profileRef = child(ref(db), `artifacts/${appId}/users/${user.uid}/profile/data`);
                onValue(profileRef, (snap) => {
                    const profileData = snap.val() || {};
                    if (snap.exists() && !profileData.email && user.email) {
                        update(child(ref(db), `artifacts/${appId}/users/${user.uid}/profile/data`), { email: user.email });
                    }
                    if (!snap.exists() && user.email) {
                        // New user — create profile
                        set(child(ref(db), `artifacts/${appId}/users/${user.uid}/profile/data`), {
                            email: user.email,
                            name: user.displayName || user.email.split('@')[0],
                            avatarUrl: user.photoURL || '',
                            setupComplete: false
                        });
                    }
                    window.state.userProfile = snap.val() || {};
                    // Show username setup modal if not set up yet
                    if (!profileData.setupComplete && !profileData.username) {
                        const firstLetter = (user.email || 'U').charAt(0).toUpperCase();
                        window.usmOpen(user.photoURL || '', firstLetter);
                    }
                    if(window.state.currentTab === 'account') window.renderUI();
                });
                onValue(child(ref(db), `artifacts/${appId}/users/${user.uid}/saved`), (snap) => {
                    const saved = [];
                    if(snap.exists()) { snap.forEach(childSnap => { saved.push(childSnap.key); }); }
                    window.state.savedPosts = saved;
                    if(window.state.currentPost) window.renderSinglePost(); else window.renderPostsGrid();
                });
                
                let initialLoadDone = false;
                onValue(child(ref(db), `artifacts/${appId}/users/${user.uid}/notifications`), (snap) => {
                    const notifs = [];
                    if(snap.exists()) { snap.forEach(s => { notifs.push({ id: s.key, ...s.val() }); }); }
                    
                    if (initialLoadDone) {
                        const currentIds = window.state.userNotifications?.map(n => n.id) || [];
                        notifs.forEach(n => {
                            if (!currentIds.includes(n.id) && !n.read) {
                                window.triggerBrowserPushNotification("TubeSeekify Alert 🔔", n.text || "You received a new notification!");
                            }
                        });
                    }
                    
                    window.state.userNotifications = notifs.sort((a,b) => {
                        const tA = a.createdAt ? (new Date(a.createdAt).getTime() || 0) : 0;
                        const tB = b.createdAt ? (new Date(b.createdAt).getTime() || 0) : 0;
                        return tB - tA;
                    });
                    initialLoadDone = true;
                    
                    const unreadCount = window.state.userNotifications.filter(n => !n.read).length;
                    const sbBadge = document.getElementById('user-sidebar-notif-badge');
                    const mbBadge = document.getElementById('user-mobile-notif-badge');
                    
                    if(unreadCount > 0) {
                        if(sbBadge) { sbBadge.innerText = unreadCount > 99 ? '99+' : unreadCount; sbBadge.classList.remove('hidden'); }
                        if(mbBadge) { mbBadge.innerText = unreadCount > 99 ? '99+' : unreadCount; mbBadge.classList.remove('hidden'); }
                    } else {
                        if(sbBadge) sbBadge.classList.add('hidden');
                        if(mbBadge) mbBadge.classList.add('hidden');
                    }
                    
                    if(!document.getElementById('user-notif-panel').classList.contains('hidden')) { window.renderUserNotifications(); }
                });

            } else {
                window.state.userProfile = {};
                window.state.savedPosts = [];
                window.state.userNotifications = [];
                // Reset AI history and guest limits on logout/guest transitions
                window.state.aiChatHistory = null;
                window.state.guestChatCount = 0;
                window.state.cart = [];
                window.renderUI();
                if(window.state.currentPost) window.renderSinglePost(); else window.renderPostsGrid();
            }

            const dataRef = ref(db, `artifacts/${appId}`);
            
            // Listen to all manual purchases dynamically for paywall locking and premium badges
            onValue(child(dataRef, 'interactions/purchases'), (snap) => {
                const purchases = {};
                if (snap.exists()) {
                    snap.forEach(s => {
                        purchases[s.key] = s.val();
                    });
                }
                window.state.purchases = purchases;
                window.renderUI();
                if (window.state.currentPost) {
                    window.renderSinglePost();
                } else {
                    window.renderPostsGrid();
                }
            });

            // Listen to all comments globally for ratings badge rendering in grid cards
            onValue(child(dataRef, 'interactions/comments'), (snap) => {
                const allComments = {};
                if (snap.exists()) {
                    snap.forEach(s => {
                        allComments[s.key] = s.val();
                    });
                }
                window.state.allComments = allComments;
                if (window.state.currentPost) {
                    window.renderSinglePost();
                } else {
                    window.renderPostsGrid();
                }
            });
            
            onValue(child(dataRef, 'public/data/site_settings/global'), (snap) => {
                if (snap.exists()) { 
                    const s = snap.val();
                    window.state.settings = s; 
                    localStorage.setItem('ts_cached_settings', JSON.stringify(s));
                    
                    const h = decodeURIComponent(window.location.hash.replace('#',''));
                    if (!h) {
                        const firstTab = s.tabOrder && s.tabOrder.length > 0 ? s.tabOrder[0] : 'home';
                        window.state.currentTab = firstTab;
                    }

                    window.renderUI(); 
                    window.injectAdSense();
                }
            });

            onValue(child(dataRef, 'public/data/promoCodes'), (snap) => {
                const codes = [];
                if (snap.exists()) {
                    snap.forEach(cSnap => {
                        codes.push({ id: cSnap.key, ...cSnap.val() });
                    });
                }
                window.state.promoCodes = codes;
                console.log("Promo codes loaded dynamically:", codes.length);
            });
            
            onValue(child(dataRef, 'public/data/posts'), (snap) => {
                const p = [];
                if (snap.exists()) {
                    snap.forEach(childSnap => { 
                        let postData = childSnap.val();
                        if(!postData.type) postData.type = 'video';
                        p.push({ id: childSnap.key, ...postData }); 
                    });
                }
                window.state.posts = p.sort((a,b) => {
                    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return timeB - timeA;
                });
                
                window.state.dataLoaded = true;
                if(localStorage.getItem('cookies_accepted') === 'true') { localStorage.setItem('ts_cached_posts', JSON.stringify(window.state.posts)); }
                window.renderUI();
            });
        });

        // ========================================================
        // TUBE-SEEKIFY DYNAMIC GEMINI AI CHATBOT SYSTEM
        // ========================================================
        window.toggleAiChat = () => {
            const dot = document.getElementById('ai-chat-dot');
            if (dot) dot.classList.add('hidden'); // Clear alert dot

            const win = document.getElementById('ai-chat-window');
            const iconChat = document.getElementById('ai-chat-icon');
            const iconClose = document.getElementById('ai-close-icon');

            if (!win) return;

            if (win.classList.contains('hidden')) {
                win.classList.remove('hidden');
                setTimeout(() => {
                    win.classList.remove('scale-95', 'opacity-0');
                    win.classList.add('scale-100', 'opacity-100', 'flex');
                }, 10);
                if (iconChat) iconChat.classList.add('hidden');
                if (iconClose) iconClose.classList.remove('hidden');
                
                // Focus input
                const input = document.getElementById('ai-chat-input');
                if (input) input.focus();
            } else {
                win.classList.remove('scale-100', 'opacity-100');
                win.classList.add('scale-95', 'opacity-0');
                if (iconChat) iconChat.classList.remove('hidden');
                if (iconClose) iconClose.classList.add('hidden');
                setTimeout(() => {
                    win.classList.add('hidden');
                    win.classList.remove('flex');
                }, 300);
            }
        };

        window.handleChatLinkClick = (event, href) => {
            if (href && href.startsWith('#')) {
                const win = document.getElementById('ai-chat-window');
                const iconChat = document.getElementById('ai-chat-icon');
                const iconClose = document.getElementById('ai-close-icon');
                if (win && !win.classList.contains('hidden')) {
                    win.classList.remove('scale-100', 'opacity-100');
                    win.classList.add('scale-95', 'opacity-0');
                    if (iconChat) iconChat.classList.remove('hidden');
                    if (iconClose) iconClose.classList.add('hidden');
                    setTimeout(() => {
                        win.classList.add('hidden');
                        win.classList.remove('flex');
                    }, 300);
                }
            }
        };

        window.sendSuggestedQuestion = (questionText) => {
            const input = document.getElementById('ai-chat-input');
            if (input) {
                input.value = questionText;
                window.sendAiMessage();
            }
            const sugBox = document.getElementById('ai-suggested-questions');
            if (sugBox) {
                sugBox.classList.add('hidden');
            }
        };

        window.clearAiChat = () => {
            window.state.aiChatHistory = null;
            const chatArea = document.getElementById('ai-chat-messages');
            if (chatArea) {
                chatArea.innerHTML = `
                    <!-- Welcome Message -->
                    <div class="flex items-start space-x-3 animate-fade-in">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-md">TS</div>
                        <div class="bg-slate-900/60 p-3.5 rounded-2xl rounded-tl-none border border-slate-800 text-slate-200 max-w-[85%] leading-relaxed shadow-sm">
                            Assalam-o-Alaikum! 👋 Main TubeSeekify ka official AI assistant hoon. Main aapko digital products, templates, payment, aur downloads ke mutaliq guide kar sakta hoon. Aap kya janna chahte hain?
                            
                            <!-- Suggested Questions Container -->
                            <div id="ai-suggested-questions" class="mt-4 flex flex-wrap gap-2">
                                <button onclick="window.sendSuggestedQuestion('🏷️ Any active promo codes?')" class="bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/25 hover:border-purple-400/50 text-purple-200 text-[10px] font-bold px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer shadow-sm">🏷️ Any active promo codes?</button>
                                <button onclick="window.sendSuggestedQuestion('🛍️ How to buy a product?')" class="bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/25 hover:border-purple-400/50 text-purple-200 text-[10px] font-bold px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer shadow-sm">🛍️ How to buy a product?</button>
                                <button onclick="window.sendSuggestedQuestion('⏱️ How long does approval take?')" class="bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/25 hover:border-purple-400/50 text-purple-200 text-[10px] font-bold px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer shadow-sm">⏱️ Approval time?</button>
                                <button onclick="window.sendSuggestedQuestion('📥 Where are my downloads?')" class="bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/25 hover:border-purple-400/50 text-purple-200 text-[10px] font-bold px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer shadow-sm">📥 Where are my downloads?</button>
                            </div>
                        </div>
                    </div>
                `;
            }
            notify("AI conversation memory cleared!", "info");
        };

        window.sendAiMessage = async () => {
            const input = document.getElementById('ai-chat-input');
            if (!input) return;
            const message = input.value.trim();
            if (!message) return;

            const { user } = window.state;
            const isLoggedIn = user && !user.isAnonymous;
            
            // Guest chat count limit check (Max 3 messages allowed)
            if (!isLoggedIn) {
                window.state.guestChatCount = window.state.guestChatCount || 0;
                if (window.state.guestChatCount >= 3) {
                    const chatArea = document.getElementById('ai-chat-messages');
                    if (chatArea) {
                        const limitMsgHtml = `
                            <div class="flex items-start space-x-3 animate-fade-in">
                                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-md">TS</div>
                                <div class="bg-slate-900/80 p-4 rounded-2xl rounded-tl-none border border-purple-500/30 text-purple-200 max-w-[85%] leading-relaxed shadow-sm">
                                    🔒 <strong>Limit Reached!</strong> Aap guest account se sirf 3 baar chat kar sakte hain.
                                    <br><br>
                                    Hmari platform par unlimited chatting bilkul free hai! Aage chat karne ke liye please <a href="#account" onclick="window.toggleAiChat()" class="text-purple-400 hover:text-purple-300 font-extrabold underline font-black">Login ya Register</a> karein.
                                </div>
                            </div>
                        `;
                        chatArea.insertAdjacentHTML('beforeend', limitMsgHtml);
                        chatArea.scrollTop = chatArea.scrollHeight;
                    }
                    input.value = '';
                    return;
                }
            }

            input.value = '';

            const chatArea = document.getElementById('ai-chat-messages');
            if (!chatArea) return;

            // Render User Message
            const userMsgHtml = `
                <div class="flex items-start justify-end space-x-2.5">
                    <div class="bg-gradient-to-tr from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-none max-w-[85%] font-medium leading-relaxed shadow-md break-words">
                        ${escapeHtml(message)}
                    </div>
                </div>
            `;
            chatArea.insertAdjacentHTML('beforeend', userMsgHtml);
            chatArea.scrollTop = chatArea.scrollHeight;

            // Hide suggestions if still visible
            const sugBox = document.getElementById('ai-suggested-questions');
            if (sugBox) sugBox.classList.add('hidden');

            // Increment chat count for guests
            if (!isLoggedIn) {
                window.state.guestChatCount = (window.state.guestChatCount || 0) + 1;
            }

            // Get Gemini API Key
            const apiKey = window.state.settings?.geminiApiKey;
            if (!apiKey) {
                setTimeout(() => {
                    const botMsgHtml = `
                        <div class="flex items-start space-x-3">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-md">TS</div>
                            <div class="bg-red-950/50 text-red-300 p-3.5 rounded-2xl rounded-tl-none border border-red-900/30 max-w-[85%] leading-relaxed shadow-sm">
                                ⚠️ <strong>System Offline:</strong> AI Support Chat setup completed successfully! Please ask the Admin to save the <strong>Google Gemini API Key</strong> inside the Admin Panel under the Settings tab to start chatting!
                            </div>
                        </div>
                    `;
                    chatArea.insertAdjacentHTML('beforeend', botMsgHtml);
                    chatArea.scrollTop = chatArea.scrollHeight;
                }, 500);
                return;
            }

            // Show Typing Indicator
            const typingIndicator = document.getElementById('ai-chat-typing');
            if (typingIndicator) typingIndicator.classList.remove('hidden');

            try {
                // Initialize chat history with dynamic contexts on first start
                if (!window.state.aiChatHistory) {
                    const userProfile = window.state.userProfile || {};
                    const userName = isLoggedIn ? (userProfile.name || user.displayName || user.email.split('@')[0]) : 'Guest';
                    
                    let productsContext = "";
                    const activePosts = window.state.posts || [];
                    if (activePosts.length > 0) {
                        productsContext = "\nHere is the CURRENT live product catalog from our database in real-time:\n";
                        activePosts.forEach((p) => {
                            const postSlug = window.slugify(p.title);
                            let stockStr = "In Stock";
                            if (p.stock !== undefined && p.stock !== null) {
                                stockStr = p.stock === 0 ? "OUT OF STOCK" : `${p.stock} units left`;
                            }
                            productsContext += `- [${p.type.toUpperCase()}] "${p.title}" | Price: ${p.price || 'Free'} | Stock Status: ${stockStr} | Direct SPA Link: #${postSlug}\n`;
                        });
                    }

                    // Compile Dynamic Active Promo Codes
                    let promoCodesContext = "";
                    const codes = window.state.promoCodes || [];
                    const activePromoCodes = codes.filter(c => c.isActive && (!c.expiryDate || new Date() <= new Date(c.expiryDate)) && (!c.maxUses || (c.usedCount || 0) < c.maxUses));
                    if (activePromoCodes.length > 0) {
                        promoCodesContext = "\nHere are the CURRENT ACTIVE Promo Codes / Coupon Codes available for users right now:\n";
                        activePromoCodes.forEach(c => {
                            let typeStr = c.discountType === 'percent' ? `${c.value}% OFF` : `Flat RS ${c.value} OFF`;
                            let restriction = "";
                            if (c.applicablePostId) {
                                const targetPost = (window.state.posts || []).find(p => p.id === c.applicablePostId);
                                if (targetPost) {
                                    restriction = ` (Only applicable to product: "${targetPost.title}")`;
                                }
                            }
                            let expiryStr = c.expiryDate ? ` | Expiries: ${new Date(c.expiryDate).toLocaleDateString()}` : "";
                            let maxUsesStr = c.maxUses > 0 ? ` | Limit: ${c.usedCount || 0}/${c.maxUses} uses` : "";
                            promoCodesContext += `- Code: "${c.code}" | Discount: ${typeStr}${restriction}${expiryStr}${maxUsesStr}\n`;
                        });
                    } else {
                        promoCodesContext = "\nThere are currently no active public promo codes/coupon codes.\n";
                    }

                    // Dynamic site settings and payment methods
                    let settingsContext = "";
                    if (window.state.settings) {
                        const s = window.state.settings;
                        settingsContext = "\nHere are the REAL-TIME site settings and merchant payment accounts from our database:\n";
                        settingsContext += `- Contact Support Email: ${s.contactEmail || 'abdulrehmanfatehali@gmail.com'}\n`;
                        settingsContext += `- JazzCash Mobile Wallet Number: ${s.jazzcashNo || '0300-1234567'} (Account Title: "${s.jazzcashTitle || 'TubeSeekify'}")\n`;
                        settingsContext += `- EasyPaisa Mobile Wallet Number: ${s.easypaisaNo || '0300-7654321'} (Account Title: "${s.easypaisaTitle || 'TubeSeekify'}")\n`;
                        settingsContext += `- Privacy Policy: ${s.privacyPolicy || 'Default Privacy Policy'}\n`;
                        settingsContext += `- Terms & Conditions: ${s.termsConditions || 'Default Terms & Conditions'}\n`;
                    }
                    
                    // Pinned post context
                    let pinnedPostContext = "";
                    const pinnedPost = (window.state.posts || []).find(p => p.pinned === true);
                    if (pinnedPost) {
                        const postSlug = window.slugify(pinnedPost.title);
                        pinnedPostContext = `\nPINNED/FEATURED ANNOUNCEMENT PRODUCT:\nWe currently have a pinned featured announcement product on the homepage! Title: "${pinnedPost.title}" | Type: ${pinnedPost.type.toUpperCase()} | Price: ${pinnedPost.price || 'Free'} | Direct SPA Link: #${postSlug}. Promote this product to the user when appropriate!\n`;
                    }
                    
                    const userIdentityContext = `\nUSER IDENTITY:\nThe person chatting with you is named: "${userName}". They are currently ${isLoggedIn ? "logged in" : "a guest (not logged in)"}. Address them personally by their name (e.g. "Hello ${userName}" or "Assalam-o-Alaikum ${userName}") to make them feel premium and welcomed!`;

                    const systemPrompt = `You are "TubeSeekify AI Support", a highly intelligent, premium customer support AI assistant for the TubeSeekify platform. 
Your goal is to answer user queries with 100% accuracy, extreme politeness, and helpfulness. 

Here is everything you must know about TubeSeekify:
1. About TubeSeekify: We sell high-quality digital assets for creators, including premium AI Prompts, YouTube Tools, Mobile Apps, custom ChatGPT/GPTs, and Shop bundles (like Reels bundles, timelapse footage, overlays, etc.).
2. How to Buy:
   - Users add products to their shopping cart or click "Buy Now" on a single product.
   - We support manual mobile payments via JazzCash and EasyPaisa (Pakistan).
   - Checkout Process: Users send the total amount to the JazzCash/EasyPaisa account number shown in the payment modal, upload a screenshot of their payment receipt, enter the Transaction ID (TID), and click "SUBMIT PAYMENT".
   - Approval Time: The Admin reviews all payment receipt submissions manually. Payout verification and approval usually takes between 10 minutes to a maximum of 2 hours. Once approved, the product is fully unlocked under the user's "Account" tab or direct link.
3. Products & Downloads: Once purchased and approved, users can access and download their files anytime from their personal account dashboard under the "Account" or "Purchased" tab.
4. Refunds & Support: Due to the digital nature of the products, all sales are final, but we offer full technical support if there are file access issues. Support email is ${window.state.settings?.contactEmail || 'abdulrehmanfatehali@gmail.com'}.
5. Code Coupon Codes: Admins create custom promo codes which can be global or restricted to specific premium products. Users can apply these codes inside their shopping cart or single checkout modal step 2.

${promoCodesContext}

${settingsContext}

${pinnedPostContext}

${productsContext}

${userIdentityContext}

IMPORTANT LINK RULE: When mentioning any product or post in the catalog, you MUST provide its clickable SPA link in markdown format. Use the post's title slug as the hash. For example, if a product is titled 'Viral Video Hook Generator', the link must be exactly: [Viral Video Hook Generator](#viral-video-hook-generator). Do NOT use external or absolute links unless specifically instructed. This allows the user to click the link and immediately open the product on our platform!

IMPORTANT LANGUAGE RULE: You must detect the user's language and respond in the exact same language, alphabet script, and tone (e.g. if they ask in Roman Urdu like "discount codes kya hain?", reply in clear, beautiful Roman Urdu. If they ask in Urdu script like "ڈسکاؤنٹ کوڈ بتائیں", reply in Urdu script. If in English, reply in English). Keep your answers concise, sweet, and professional. Always prioritize safety, and if a user asks something unrelated to TubeSeekify or digital marketing, gently guide them back to our products!`;

                    window.state.aiChatHistory = [
                        { role: "user", parts: [{ text: systemPrompt }] },
                        { role: "model", parts: [{ text: "Understood. I have loaded the real-time product catalog, dynamic active promo codes, site configurations, pinned posts, and the user's identity. I am now fully prepared to act as the official TubeSeekify AI Support agent, addressing them personally." }] }
                    ];
                }

                // Add User Message to History
                window.state.aiChatHistory.push({ role: "user", parts: [{ text: message }] });

                // Call Google Gemini API
                const url = `https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: window.state.aiChatHistory
                    })
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const errMsg = errData.error?.message || `HTTP Error ${response.status}`;
                    throw new Error(errMsg);
                }

                const resData = await response.json();
                const botText = resData.candidates[0].content.parts[0].text;

                // Add Bot Message to History
                window.state.aiChatHistory.push({ role: "model", parts: [{ text: botText }] });

                // Format bot response
                const formattedBotText = formatBotMsg(botText);

                // Render Bot Message
                const botMsgHtml = `
                    <div class="flex items-start space-x-3 animate-fade-in">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-md">TS</div>
                        <div class="bg-slate-900/60 p-3.5 rounded-2xl rounded-tl-none border border-slate-800 text-slate-100 max-w-[85%] leading-relaxed shadow-sm break-words overflow-x-auto">
                            ${formattedBotText}
                        </div>
                    </div>
                `;
                chatArea.insertAdjacentHTML('beforeend', botMsgHtml);
            } catch (err) {
                console.error("AI Chatbot Error:", err);
                const errorMsgHtml = `
                    <div class="flex items-start space-x-3">
                        <div class="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-md">⚠️</div>
                        <div class="bg-red-950/30 text-red-300 p-3.5 rounded-2xl rounded-tl-none border border-red-900/30 max-w-[85%] leading-relaxed shadow-sm break-words">
                            Afsos! AI connection fail ho gaya.<br>
                            <span class="text-[10px] text-red-400 font-mono font-bold mt-1 block">Error: ${err.message}</span>
                        </div>
                    </div>
                `;
                chatArea.insertAdjacentHTML('beforeend', errorMsgHtml);
            } finally {
                if (typingIndicator) typingIndicator.classList.add('hidden');
                chatArea.scrollTop = chatArea.scrollHeight;
            }
        };

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.innerText = text;
            return div.innerHTML;
        }

        function formatBotMsg(text) {
            let escaped = escapeHtml(text);
            // Replace bold syntax **text** with <strong>text</strong>
            let formatted = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            // Replace single asterisks * text with bullet points
            formatted = formatted.replace(/^\*\s+(.*?)$/gm, '• $1');
            // Replace markdown links [text](url) with clickable HTML links
            formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" onclick="window.handleChatLinkClick(event, \'$2\')" class="text-purple-400 hover:text-purple-300 font-extrabold underline transition-all duration-150">$1</a>');
            // Replace raw HTTP/HTTPS links (not preceded by href=) with styled clickable links
            formatted = formatted.replace(/(?<!href=["'])(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" class="text-purple-400 hover:text-purple-300 font-extrabold underline transition-all duration-150">$1</a>');
            // Replace newlines with <br>
            formatted = formatted.replace(/\n/g, '<br>');
            return formatted;
        }

        // Check for CashMaal checkout redirect success or cancel parameters
        const urlParams = new URLSearchParams(window.location.search);
        const successPurchaseId = urlParams.get('success_purchase_id');
        const cmTid = urlParams.get('CM_TID');
        const cancelPurchaseId = urlParams.get('cancel_purchase_id');
        
        if (successPurchaseId && cmTid) {
            // Clean up query parameters from the browser address bar so they don't trigger again on page refresh
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            
            // Trigger CashMaal Verification overlay
            setTimeout(() => {
                window.showCashMaalVerifierModal(successPurchaseId, cmTid);
            }, 800);
        } else if (cancelPurchaseId) {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            notify("Payment was cancelled or failed.", "error");
        }

        initAuth();
        window.dispatchEvent(new Event('hashchange'));

        setInterval(() => {
            if(!window.state.currentPost && window.state.settings.banners?.length > 1) {
                window.state.currentSlide = (window.state.currentSlide + 1) % window.state.settings.banners.length;
                window.updateBannerDOM();
            }
        }, 5000);
    