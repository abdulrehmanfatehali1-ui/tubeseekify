
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getDatabase, ref, set, onValue, remove, push, child, update, get } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

        const IMGBB_API_KEY = '3fd88cc5d866ae088a56843cc3533035';
        const appId = 'tubeseekify-v4'; 

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
        
        const ALLOWED_EMAIL = "abdulrehmanfatehali1@gmail.com";

        // Toast notification system
        const notify = (msg, type = 'success') => {
            const toast = document.getElementById('notification-toast');
            const messageEl = document.getElementById('toast-message');
            const iconEl = document.getElementById('toast-icon');
            if(!toast || !messageEl) return;
            
            messageEl.innerText = msg;
            if(type === 'error') {
                toast.classList.add('error');
                iconEl.innerHTML = `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`;
                iconEl.setAttribute('stroke', '#ef4444');
            } else {
                toast.classList.remove('error');
                iconEl.innerHTML = `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`;
                iconEl.setAttribute('stroke', '#2563eb');
            }
            
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        };
        window.notify = notify;

        window.globalState = { settings: { banners: [], categories: [] }, posts: [], users: [], notifications: [], editingPostId: null, visibleUsersCount: 10, userSearchQuery: '' };
        window.currentPostFilter = 'all';

        function safeAddListener(id, eventType, handler) {
            const el = document.getElementById(id);
            if (el) el.addEventListener(eventType, handler);
        }

        // Live visual dashboard clock metric
        setInterval(() => {
            const el = document.getElementById('dashboard-clock');
            if (el) el.innerText = new Date().toLocaleTimeString();
        }, 1000);

        window.exportDatabaseBackup = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.globalState));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", `tubeseekify_backup_${new Date().toISOString().substring(0,10)}.json`);
            dlAnchorElem.click();
            window.notify("Database backup downloaded!");
        };

        window.openModal = (id) => { const modal = document.getElementById(id); if(modal) { modal.classList.remove('hidden'); document.body.style.overflow = 'hidden'; } };
        window.closeModal = (id) => { const modal = document.getElementById(id); if(modal) { modal.classList.add('hidden'); document.body.style.overflow = ''; } };

        window.premiumConfirm = (message, title = "Confirm Action") => {
            return new Promise((resolve) => {
                const modal = document.getElementById('premium-confirm-modal');
                if (!modal) {
                    resolve(confirm(message));
                    return;
                }
                const titleEl = document.getElementById('confirm-modal-title');
                const msgEl = document.getElementById('confirm-modal-message');
                if (titleEl) titleEl.innerText = title;
                if (msgEl) msgEl.innerText = message;
                
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';

                const handleConfirm = () => {
                    modal.classList.add('hidden');
                    document.body.style.overflow = '';
                    cleanup();
                    resolve(true);
                };

                const handleCancel = () => {
                    modal.classList.add('hidden');
                    document.body.style.overflow = '';
                    cleanup();
                    resolve(false);
                };

                const cleanup = () => {
                    document.getElementById('btn-confirm-yes').removeEventListener('click', handleConfirm);
                    document.getElementById('btn-confirm-no').removeEventListener('click', handleCancel);
                };

                document.getElementById('btn-confirm-yes').addEventListener('click', handleConfirm);
                document.getElementById('btn-confirm-no').addEventListener('click', handleCancel);
            });
        };

        window.populateRecommendations = (type, selectedIdsRaw = []) => {
            const list = document.getElementById('rec-posts-list');
            if(!list) return;

            let selectedIds = [];
            if (Array.isArray(selectedIdsRaw)) {
                selectedIds = selectedIdsRaw.filter(Boolean);
            } else if (typeof selectedIdsRaw === 'object' && selectedIdsRaw !== null) {
                selectedIds = Object.values(selectedIdsRaw).filter(v => typeof v === 'string' && v.trim());
            } else if (typeof selectedIdsRaw === 'string') {
                selectedIds = selectedIdsRaw.split(',').map(s => s.trim()).filter(Boolean);
            }

            const availablePosts = window.globalState.posts.filter(p => p.type === type && p.id !== window.globalState.editingPostId);
            if(availablePosts.length === 0) { list.innerHTML = '<div class="col-span-full py-8 text-center bg-white rounded-2xl border-2 border-gray-100"><p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No similar items found.</p></div>'; return; }
            list.innerHTML = availablePosts.map(p => `
                <label class="flex items-center space-x-4 bg-white p-4 rounded-2xl border-2 border-gray-200 cursor-pointer hover:border-electric hover:shadow-md transition-all select-none">
                     <input type="checkbox" value="${p.id}" class="rec-checkbox w-6 h-6 rounded-lg flex-shrink-0" ${selectedIds.includes(p.id) ? 'checked' : ''}>
                     <div class="flex-1 min-w-0"><span class="text-xs font-black text-gray-800 truncate block w-full">${p.title}</span></div>
                </label>
            `).join('');
        };

        window.addPromptRow = (title = '', content = '') => {
            const container = document.getElementById('prompts-container');
            if(!container) return;
            const div = document.createElement('div');
            div.className = "dynamic-prompt-row bg-white p-5 rounded-2xl border-2 border-gray-200 shadow-sm relative group transition-all hover:border-electric";
            div.innerHTML = `<button type="button" onclick="this.parentElement.remove()" class="absolute top-4 right-4 text-red-500 bg-red-50 p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button><input type="text" placeholder="Prompt Title" class="prompt-title w-full bg-slate-50 p-4 rounded-xl text-sm font-bold mb-4 border-2 border-transparent focus:border-electric text-dark" value="${title}"><textarea placeholder="Enter prompt instructions..." rows="4" class="prompt-content w-full bg-slate-50 p-4 rounded-xl text-sm border-2 border-transparent focus:border-electric outline-none transition resize-none font-mono text-gray-800 leading-relaxed">${content}</textarea>`;
            container.appendChild(div);
        };

        window.addResourceRow = (type = 'Tool', name = '', url = '') => {
            const container = document.getElementById('resources-container');
            if(!container) return;
            const div = document.createElement('div');
            div.className = "flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-2xl border-2 border-gray-200 shadow-sm transition-all hover:border-electric";
            div.innerHTML = `<select class="res-type bg-slate-50 p-4 rounded-xl text-xs font-bold w-full md:w-40 border-2 border-transparent focus:border-electric outline-none transition cursor-pointer text-dark"><option value="Tool" ${type==='Tool'?'selected':''}>AI Tool Link</option><option value="GPT" ${type==='GPT'?'selected':''}>GPT Action URL</option><option value="Link" ${type==='Link'?'selected':''}>General URL</option></select><input type="text" placeholder="Resource Name" class="res-name flex-1 bg-slate-50 p-4 rounded-xl text-xs font-bold w-full border-2 border-transparent focus:border-electric outline-none transition text-dark" value="${name}"><input type="url" placeholder="Resource URL (https://)" class="res-url flex-1 bg-slate-50 p-4 rounded-xl text-xs font-bold w-full border-2 border-transparent focus:border-electric outline-none transition text-dark" value="${url}"><button type="button" onclick="this.parentElement.remove()" class="text-red-500 bg-red-50 p-4 rounded-xl transition-all w-full md:w-auto flex justify-center shadow-sm"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>`;
            container.appendChild(div);
        };

        function updateCategoryDropdown(type) {
            const catSelect = document.getElementById('post-category');
            if(!catSelect) return;
            const allCats = window.globalState.settings.categories || [];
            const typeCats = allCats.filter(c => c.type === type);
            const submitBtn = document.getElementById('btn-submit-post');
            if(typeCats.length === 0) {
                catSelect.innerHTML = `<option value="">No categories found</option>`;
                catSelect.disabled = true;
                if(submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('opacity-50'); }
            } else {
                catSelect.innerHTML = typeCats.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
                catSelect.disabled = false;
                if(submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('opacity-50'); }
            }
        }

        window.setPostForm = (type, recIds = []) => {
            const typeInput = document.getElementById('post-type');
            if(typeInput) typeInput.value = type;
            document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
            const activeSection = document.getElementById(`section-${type}`);
            if(activeSection) activeSection.classList.add('active');
            updateCategoryDropdown(type);
            const recSection = document.getElementById('section-recommendations');
            if(recSection) {
                if (['video', 'tool', 'prompt', 'app', 'gpt', 'shop'].includes(type)) { recSection.classList.remove('hidden'); window.populateRecommendations(type, recIds); } 
                else { recSection.classList.add('hidden'); }
            }
            if(type === 'prompt' && !window.globalState.editingPostId && document.querySelectorAll('.dynamic-prompt-row').length === 0) { window.addPromptRow(); }
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
                notify("Your browser does not support push notifications.", "error");
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

        window.playCashRegisterSound = () => {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                const ctx = new AudioContext();
                
                // Bell ring 1 (1500Hz)
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(1500, ctx.currentTime);
                gain1.gain.setValueAtTime(0.001, ctx.currentTime);
                gain1.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.03);
                gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                
                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start(ctx.currentTime);
                osc1.stop(ctx.currentTime + 0.35);
                
                // Bell ring 2 (2200Hz) with a tiny delay
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(2200, ctx.currentTime + 0.08);
                gain2.gain.setValueAtTime(0.001, ctx.currentTime + 0.08);
                gain2.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.08 + 0.03);
                gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08 + 0.5);
                
                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(ctx.currentTime + 0.08);
                osc2.stop(ctx.currentTime + 0.08 + 0.5);
                
                // Coin clink noise
                const bufferSize = ctx.sampleRate * 0.12;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;
                
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(3500, ctx.currentTime);
                filter.Q.setValueAtTime(6, ctx.currentTime);
                
                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(0.08, ctx.currentTime);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
                
                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(ctx.destination);
                noise.start(ctx.currentTime);
                noise.stop(ctx.currentTime + 0.12);
                
            } catch(err) {
                console.error("Failed to play synthesized sound:", err);
            }
        };

        window.copyWebhookUrl = () => {
            const el = document.getElementById('set-webhook-url');
            if (el) {
                navigator.clipboard.writeText(el.value);
                notify("MacroDroid Webhook URL copied! 📋", "success");
            }
        };

        window.copyWebhookBody = () => {
            const el = document.getElementById('set-webhook-body');
            if (el) {
                navigator.clipboard.writeText(el.value);
                notify("MacroDroid HTTP Body copied! 📋", "success");
            }
        };

        window.parsePaymentNotificationText = (text) => {
            if (!text) return null;
            
            // Clean up text
            const cleanText = text.replace(/[\r\n]+/g, " ").trim();
            
            // 11 or 12 digit TID pattern
            const tidMatch = cleanText.match(/\b\d{11,12}\b/);
            if (!tidMatch) return null;
            const tid = tidMatch[0];
            
            // Extract amount
            let amount = "0";
            const amtMatch = cleanText.match(/(?:Rs\.?|Rupees|PKR)\s*([\d,]+(?:\.\d{2})?)/i) || cleanText.match(/([\d,]+(?:\.\d{2})?)\s*(?:Rs\.?|Rupees|PKR)/i);
            if (amtMatch) {
                amount = amtMatch[1].replace(/,/g, "");
            }
            
            // Detect gateway
            let gateway = "EasyPaisa";
            if (cleanText.toLowerCase().includes("jazzcash") || cleanText.toLowerCase().includes("jazz cash") || cleanText.toLowerCase().includes("8096")) {
                gateway = "JazzCash";
            }
            
            return { tid, amount, gateway };
        };

        window.autoApprovePurchase = async (purchaseId, tid, amount) => {
            try {
                const purchaseRef = ref(db, `artifacts/${appId}/interactions/purchases/${purchaseId}`);
                const purchaseSnap = await get(purchaseRef);
                if (!purchaseSnap.exists()) return;
                const purchaseData = purchaseSnap.val();
                
                const qty = purchaseData.quantity || 1;
                // Update purchase to approved
                await update(purchaseRef, { status: 'approved', remainingDownloads: qty });
                
                // Increment promo code if applied
                const couponApplied = purchaseData.couponApplied;
                if (couponApplied && couponApplied !== 'None') {
                    const promoRef = ref(db, `artifacts/${appId}/public/data/promoCodes/${couponApplied}`);
                    const promoSnap = await get(promoRef);
                    if (promoSnap.exists()) {
                        const promoData = promoSnap.val();
                        const currentUses = parseInt(promoData.usedCount || 0, 10);
                        await update(promoRef, { usedCount: currentUses + 1 });
                    }
                }
                
                // Decrement stock
                if (purchaseData.postId) {
                    const postRef = ref(db, `artifacts/${appId}/public/data/posts/${purchaseData.postId}`);
                    const postSnap = await get(postRef);
                    if (postSnap.exists()) {
                        const post = postSnap.val();
                        if (post.stock !== undefined && post.stock !== null) {
                            const currentStock = parseInt(post.stock, 10);
                            const purchasedQty = parseInt(purchaseData.quantity || 1, 10);
                            await update(postRef, { stock: Math.max(0, currentStock - purchasedQty) });
                        }
                    }
                }
                
                // Push user notification
                await push(ref(db, `artifacts/${appId}/users/${purchaseData.userId}/notifications`), {
                    type: 'purchase_approved',
                    postId: purchaseData.postId,
                    postTitle: purchaseData.postTitle,
                    text: `🎉 Payment Approved! "${purchaseData.postTitle}" is now fully unlocked for you!`,
                    createdAt: new Date().toISOString(),
                    read: false
                });
                
                console.log(`Auto approved purchase ${purchaseId} successfully.`);
            } catch(e) {
                console.error("Auto approval database update failed:", e);
            }
        };

        window.switchTab = (id) => {
            try {
                document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
                const activeTab = document.getElementById(`tab-${id}`);
                if(activeTab) activeTab.classList.add('active');
                document.querySelectorAll('.nav-btn').forEach(el => { el.classList.remove('bg-white/10', 'text-brand', 'border-brand'); el.classList.add('border-transparent', 'text-gray-400'); });
                const activeBtn = document.getElementById(`nav-${id}`);
                if(activeBtn) { activeBtn.classList.add('bg-white/10', 'text-electric', 'border-electric'); activeBtn.classList.remove('border-transparent', 'text-gray-400'); }
                if (id === 'notifications') window.renderNotifications();
                if (id === 'reqs') window.renderReqs();
                if (id === 'archive') window.renderArchive();
                if (id === 'users') { if (typeof renderUsers === 'function') renderUsers(); }
                if (id === 'promo-codes') {
                    if (typeof window.renderPromoCodesTable === 'function') window.renderPromoCodesTable();
                    if (typeof window.recalculatePromoTest === 'function') window.recalculatePromoTest();
                }
                
                // Auto close mobile drawer
                const sidebar = document.getElementById('admin-sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                if (window.innerWidth < 768 && sidebar) {
                    sidebar.classList.add('-translate-x-full');
                    if (overlay) overlay.classList.add('hidden');
                }
            } catch(e) {
                console.error("switchTab error:", e);
                notify("Failed to switch tab: " + e.message, "error");
            }
        };

        window.openManager = (type) => {
            window.currentPostFilter = type;
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            const tabPosts = document.getElementById('tab-posts');
            if(tabPosts) tabPosts.classList.add('active');
            document.querySelectorAll('.nav-btn').forEach(el => { el.classList.remove('bg-white/10', 'text-electric', 'border-electric'); el.classList.add('border-transparent', 'text-gray-400'); });
            const activeBtn = document.getElementById(`nav-${type}`);
            if(activeBtn) { activeBtn.classList.add('bg-white/10', 'text-electric', 'border-electric'); activeBtn.classList.remove('border-transparent', 'text-gray-400'); }
            const titles = { video: 'Manage Videos', gpt: 'Manage GPTs', tool: 'Manage AI Tools', prompt: 'Manage Prompts', app: 'Manage Mobile Apps', shop: 'Manage Shop' };
            const titleEl = document.getElementById('manager-title');
            if(titleEl) titleEl.innerText = titles[type] || 'Manage Content';
            window.renderPostsTable();
            
            // Auto close mobile drawer
            const sidebar = document.getElementById('admin-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (window.innerWidth < 768 && sidebar) {
                sidebar.classList.add('-translate-x-full');
                if (overlay) overlay.classList.add('hidden');
            }
        };

        window.toggleSidebar = () => {
            const sidebar = document.getElementById('admin-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) {
                if (sidebar.classList.contains('-translate-x-full')) {
                    sidebar.classList.remove('-translate-x-full');
                    if (overlay) overlay.classList.remove('hidden');
                } else {
                    sidebar.classList.add('-translate-x-full');
                    if (overlay) overlay.classList.add('hidden');
                }
            }
        };

        async function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
            return new Promise((resolve) => {
                if (!file.type.startsWith('image/')) {
                    return resolve(file);
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > height) {
                            if (width > maxWidth) {
                                height = Math.round((height * maxWidth) / width);
                                width = maxWidth;
                            }
                        } else {
                            if (height > maxHeight) {
                                width = Math.round((width * maxHeight) / height);
                                height = maxHeight;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                });
                                console.log(`[Auto-Compress] Size: ${(file.size/1024).toFixed(1)}KB -> ${(compressedFile.size/1024).toFixed(1)}KB`);
                                resolve(compressedFile);
                            } else {
                                resolve(file);
                            }
                        }, 'image/jpeg', quality);
                    };
                    img.onerror = () => resolve(file);
                    img.src = e.target.result;
                };
                reader.onerror = () => resolve(file);
                reader.readAsDataURL(file);
            });
        }

        async function uploadToImgBB(file, isBanner = false) {
            if (!file) return null;
            
            // Check if compression toggle is active
            const toggleId = isBanner ? 'ban-img-compress-toggle' : 'post-thumb-compress-toggle';
            const toggleEl = document.getElementById(toggleId);
            const compressEnabled = toggleEl ? toggleEl.checked : true;
            
            let fileToUpload = file;
            if (compressEnabled && file.type.startsWith('image/')) {
                // Client-side auto-compression: preserves stunning retina-grade quality but compresses size by up to 98%!
                fileToUpload = await compressImage(file, 1200, 1200, 0.85);
            }
            
            const formData = new FormData();
            formData.append('image', fileToUpload);
            try {
                const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                const data = await res.json();
                if(data.success) return data.data.url;
                return null;
            } catch (error) { return null; }
        }

        window.openPostModal = () => {
            const form = document.getElementById('add-post-form');
            if(form) form.reset();
            document.getElementById('resources-container').innerHTML = '';
            document.getElementById('prompts-container').innerHTML = '';
            document.getElementById('post-pin-toggle').checked = false;
            document.getElementById('post-author').value = 'Abdul Rehman';
            document.getElementById('post-date-picker').value = '';
            document.getElementById('post-thumb').required = true;
            document.getElementById('thumb-label').innerText = "Post Thumbnail Image (Required)";
            document.getElementById('modal-main-title').innerText = `Add New ${window.currentPostFilter.toUpperCase()}`;
            window.globalState.editingPostId = null;
            let defaultType = window.currentPostFilter === 'all' ? 'video' : window.currentPostFilter;
            window.setPostForm(defaultType, []); 
            window.openModal('post-modal');
        };

        window.editPost = (id) => {
            const post = window.globalState.posts.find(p => p.id === id);
            if(!post) return notify("Error: Post not found", "error");
            const form = document.getElementById('add-post-form');
            if(form) form.reset();
            window.globalState.editingPostId = id;
            document.getElementById('post-title').value = post.title || '';
            document.getElementById('post-desc').value = post.desc || '';
            document.getElementById('post-tag').value = post.tag || '';
            document.getElementById('post-pin-toggle').checked = post.pinned || false;
            document.getElementById('post-author').value = post.authorName || 'Abdul Rehman';
            if (post.customDate) {
                document.getElementById('post-date-picker').value = post.customDate.substring(0, 16);
            } else {
                document.getElementById('post-date-picker').value = '';
            }
            window.setPostForm(post.type, post.recommended || []);
            setTimeout(() => { const catSelect = document.getElementById('post-category'); if(catSelect) catSelect.value = post.category || ''; }, 100);
            if(post.type === 'video') document.getElementById('post-video-url').value = post.videoUrl || '';
            if(post.type === 'gpt') { document.getElementById('post-gpt-url').value = post.actionUrl || ''; document.getElementById('post-gpt-watch-url').value = post.videoUrl || ''; }
            if(post.type === 'tool') document.getElementById('post-tool-url').value = post.actionUrl || '';
            if(post.type === 'app') document.getElementById('post-app-url').value = post.actionUrl || '';
            if(post.type === 'shop') { 
                document.getElementById('post-price').value = post.price || ''; 
                document.getElementById('post-shop-url').value = post.actionUrl || ''; 
                const postBtnText = document.getElementById('post-btn-text');
                if (postBtnText) postBtnText.value = post.buttonText || '';
                const postStock = document.getElementById('post-stock');
                if (postStock) postStock.value = (post.stock !== undefined && post.stock !== null) ? post.stock : '';
            }
            const promptContainer = document.getElementById('prompts-container');
            promptContainer.innerHTML = '';
            if(post.type === 'prompt' && post.promptsData) { post.promptsData.forEach(p => window.addPromptRow(p.title, p.content)); } 
            else if (post.type === 'prompt') { window.addPromptRow(); }
            const resourcesContainer = document.getElementById('resources-container');
            resourcesContainer.innerHTML = '';
            if(post.resources && post.resources.length > 0) { post.resources.forEach(res => window.addResourceRow(res.type, res.name, res.url)); }
            document.getElementById('post-thumb').required = false;
            document.getElementById('thumb-label').innerText = "Post Thumbnail Image (Leave blank to keep current)";
            document.getElementById('modal-main-title').innerText = "Edit Content Post";
            window.openModal('post-modal');
        };

        window.deletePost = async (id, btnElement) => { 
            if(await window.premiumConfirm("Are you sure you want to delete this content?", "Delete Content?")) {
                const originalHtml = btnElement.innerHTML;
                btnElement.innerHTML = `<span class="loader" style="width: 14px; height: 14px; border-top-color: currentColor;"></span>`;
                btnElement.disabled = true;
                try {
                    await remove(ref(db, `artifacts/${appId}/public/data/posts/${id}`)); 
                    notify("Post deleted successfully.");
                } catch(err) {
                    notify("Delete Failed: " + err.message, "error");
                    btnElement.innerHTML = originalHtml;
                    btnElement.disabled = false;
                }
            }
        };

        window.deleteCategory = async (name, btnElement) => {
            if(!await window.premiumConfirm(`Are you sure you want to delete the category "${name}"?`, "Delete Category?")) return;
            const originalContent = btnElement.innerHTML;
            btnElement.innerHTML = `<span class="loader" style="width: 14px; height: 14px; border-top-color: currentColor;"></span>`;
            btnElement.disabled = true;
            try {
                let cats = window.globalState.settings.categories || [];
                cats = cats.filter(c => c.name !== name);
                if (cats.length === 0) { await set(ref(db, `artifacts/${appId}/public/data/site_settings/global/categories`), null); } 
                else { await set(ref(db, `artifacts/${appId}/public/data/site_settings/global/categories`), cats); }
                notify("Category deleted successfully.");
            } catch(err) {
                notify("Error deleting category: " + err.message, "error");
                btnElement.innerHTML = originalContent;
                btnElement.disabled = false;
            }
        };

        window.toggleAdminLike = async (postId, commentId, notifId, userId, postTitle) => {
            try {
                const notifRef = ref(db, `artifacts/${appId}/interactions/notifications/${notifId}/adminLiked`);
                const commentRef = ref(db, `artifacts/${appId}/interactions/comments/${postId}/${commentId}/adminLiked`);
                const snap = await get(notifRef);
                const currentlyLiked = snap.val() || false;
                await set(notifRef, !currentlyLiked);
                await set(commentRef, !currentlyLiked);
                // Send targeted notification to comment owner when admin hearts their comment
                if (!currentlyLiked && userId && userId !== 'undefined' && userId !== '') {
                    try {
                        await push(ref(db, `artifacts/${appId}/users/${userId}/notifications`), {
                            type: 'admin_like',
                            postId: postId,
                            postTitle: postTitle || '',
                            text: `❤️ TubeSeekify Owner loved your comment on "${postTitle || 'a post'}"!`,
                            createdAt: new Date().toISOString(),
                            read: false
                        });
                    } catch(ne) { console.warn('Could not send like notification:', ne); }
                }
                notify(!currentlyLiked ? "Comment liked ❤️" : "Comment unliked 🤍");
            } catch(e) { notify("Error updating like status.", "error"); }
        };

        window.handleAdminReply = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-reply');
            const oldHtml = btn.innerHTML;
            btn.innerHTML = '<span class="loader border-t-brand"></span> Sending...';
            btn.disabled = true;

            const postId = document.getElementById('reply-post-id').value;
            const commentId = document.getElementById('reply-comment-id').value;
            const notifId = document.getElementById('reply-notif-id').value;
            const originalUserId = document.getElementById('reply-original-user-id').value;
            const text = document.getElementById('reply-text').value;

            try {
                const replyData = { userId: auth.currentUser.uid, userName: 'TubeSeekify', text: text, isAdmin: true, createdAt: new Date().toISOString() };
                await push(ref(db, `artifacts/${appId}/interactions/comments/${postId}/${commentId}/replies`), replyData);
                await update(ref(db, `artifacts/${appId}/interactions/notifications/${notifId}`), { read: true, replied: true });
                if(originalUserId) {
                    await push(ref(db, `artifacts/${appId}/users/${originalUserId}/notifications`), {
                        type: 'reply', postId: postId, postTitle: document.getElementById('reply-modal-post-title').innerText.replace('On: ', ''),
                        text: "TubeSeekify Owner replied: " + text, createdAt: new Date().toISOString(), read: false
                    });
                }
                notify("Reply sent successfully!");
                window.closeModal('reply-modal');
                document.getElementById('reply-form').reset();
            } catch(err) { notify("Error sending reply: " + err.message, "error"); } 
            finally { btn.innerHTML = oldHtml; btn.disabled = false; }
        };

        window.openReplyModal = (postId, commentId, notifId, originalUserId, userName, userAvatar, text, postTitle) => {
            document.getElementById('reply-post-id').value = postId;
            document.getElementById('reply-comment-id').value = commentId;
            document.getElementById('reply-notif-id').value = notifId;
            document.getElementById('reply-original-user-id').value = originalUserId;
            document.getElementById('reply-modal-post-title').innerText = "On: " + postTitle;
            document.getElementById('reply-modal-name').innerText = userName;
            document.getElementById('reply-modal-text').innerText = `"${text}"`;
            const avatarEl = document.getElementById('reply-modal-avatar');
            if(userAvatar && userAvatar !== 'null' && userAvatar !== 'undefined' && userAvatar !== '') { avatarEl.src = userAvatar; avatarEl.classList.remove('hidden'); } 
            else { avatarEl.src = 'https://via.placeholder.com/150/FFE345/111111?text=' + (userName?userName.charAt(0):'U'); avatarEl.classList.remove('hidden'); }
            window.openModal('reply-modal');
        };

        window.markNotificationRead = async (notifId) => {
            try { await update(ref(db, `artifacts/${appId}/interactions/notifications/${notifId}`), { read: true }); } 
            catch(e) { notify("Error marking comment as read.", "error"); }
        };

        window.markAllNotificationsRead = async () => {
            try {
                const unreadNotifs = window.globalState.notifications.filter(n => !n.read);
                if(unreadNotifs.length === 0) return notify("All comments are marked as read.");
                const updates = {};
                unreadNotifs.forEach(n => { updates[`artifacts/${appId}/interactions/notifications/${n.id}/read`] = true; });
                await update(ref(db), updates);
                notify("All comments marked as read.");
            } catch(e) { notify("Failed to update comment states.", "error"); }
        };

        window.deleteNotification = async (notifId, postId, commentId) => {
            if(await window.premiumConfirm("Are you sure you want to delete this comment? This will permanently delete the user comment.", "Delete Comment?")) {
                try {
                    await remove(ref(db, `artifacts/${appId}/interactions/notifications/${notifId}`));
                    await remove(ref(db, `artifacts/${appId}/interactions/comments/${postId}/${commentId}`));
                    notify("Comment deleted.");
                } catch(e) { notify("Error deleting comment.", "error"); }
            }
        };

        window.deleteBanner = async (idx) => {
            if(await window.premiumConfirm("Are you sure you want to delete this homepage banner?", "Delete Banner?")) {
                try {
                    let currentB = window.globalState.settings.banners || [];
                    currentB.splice(idx, 1);
                    await update(ref(db, `artifacts/${appId}/public/data/site_settings/global`), { banners: currentB });
                    notify("Banner deleted successfully.");
                } catch(e) { notify("Error updating settings.", "error"); }
            }
        };

        window.renderNotifications = () => {
            try {
                const list = document.getElementById('notifications-list');
                if(!list) return;
                if(window.globalState.notifications.length === 0) { list.innerHTML = `<div class="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-[10px] border-2 border-dashed border-gray-200 bg-white rounded-3xl">No comments found.</div>`; return; }

                list.innerHTML = window.globalState.notifications.map(n => {
                    const isUnread = !n.read;
                    let date = 'Recent';
                    if (n.createdAt) {
                        try {
                            const dObj = new Date(n.createdAt);
                            if (!isNaN(dObj.getTime())) {
                                date = dObj.toLocaleDateString() + ' at ' + dObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            }
                        } catch(e) {}
                    }
                    const avatar = (n.userAvatar && n.userAvatar !== 'null' && n.userAvatar !== '') ? `<img src="${n.userAvatar}" class="w-12 h-12 rounded-full object-cover border-2 border-gray-200 shadow-sm">` : `<div class="w-12 h-12 bg-dark text-brand font-black flex items-center justify-center rounded-full text-lg border-2 border-gray-200 shadow-sm">${(n.userName||'U').charAt(0).toUpperCase()}</div>`;
                    const likedHtml = n.adminLiked ? '❤️ Remove Heart' : '🤍 Heart Response';
                    const safeName = (n.userName || '').replace(/'/g, "\\'");
                    const safeText = (n.text || '').replace(/'/g, "\\'");
                    const safeTitle = (n.postTitle || '').replace(/'/g, "\\'");

                    return `
                    <div class="p-6 rounded-[24px] border-[3px] bg-white border-gray-200 shadow-sm ${isUnread ? 'bg-blue-50/20 border-electric shadow-md' : 'hover:border-gray-300'} transition-all relative group animate-fade-in">
                        ${isUnread ? `<span class="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></span>` : ''}
                        <div class="flex flex-col md:flex-row items-start gap-5">
                            <div class="flex-shrink-0">${avatar}</div>
                            <div class="flex-1 w-full min-w-0">
                                <div class="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
                                    <p class="text-xs text-gray-500 leading-relaxed truncate pr-6"><span class="font-black text-dark text-sm mr-1">${n.userName}</span> engaged with <span class="font-bold text-dark border-b border-gray-200 pb-0.5 ml-1">"${n.postTitle}"</span></p>
                                    <span class="text-[9px] text-gray-400 font-black uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg md:ml-auto mt-2 md:mt-0 whitespace-nowrap">${date}</span>
                                </div>
                                <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200 my-4">
                                    <p class="text-sm font-semibold text-gray-800 leading-relaxed break-words">${n.text}</p>
                                </div>
                                <div class="flex flex-wrap gap-2 md:gap-3 items-center">
                                    ${n.replied ? `<span class="text-[10px] font-black text-green-600 bg-green-50 px-4 py-2.5 rounded-xl flex items-center shadow-sm border border-green-200"><svg class="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Replied by Admin</span>` : `<button onclick="window.openReplyModal('${n.postId}', '${n.commentId}', '${n.id}', '${n.userId}', '${safeName}', '${n.userAvatar}', '${safeText}', '${safeTitle}')" class="text-[10px] font-black text-white bg-electric border-2 border-transparent hover:border-dark px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center uppercase tracking-widest active:scale-95"><svg class="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg> Respond</button>`}
                                    <button onclick="window.toggleAdminLike('${n.postId}', '${n.commentId}', '${n.id}', '${n.userId}', '${safeTitle}')" class="text-[10px] font-black px-4 py-2.5 rounded-xl border-2 ${n.adminLiked ? 'bg-red-50 text-red-600 border-red-200 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 hover:shadow-sm'} transition-all flex items-center uppercase tracking-widest active:scale-95">${likedHtml}</button>
                                    <div class="flex-1 min-w-[10px]"></div>
                                    ${isUnread ? `<button onclick="window.markNotificationRead('${n.id}')" class="text-[10px] font-black text-gray-500 hover:text-dark px-4 py-2.5 rounded-xl transition-colors uppercase tracking-widest bg-white border-2 border-gray-200 hover:border-gray-300">Mark Read</button>` : ''}
                                    <button onclick="window.deleteNotification('${n.id}', '${n.postId}', '${n.commentId}')" class="text-[10px] font-black text-red-500 hover:text-white px-4 py-2.5 rounded-xl transition-colors uppercase tracking-widest bg-white hover:bg-red-500 border-2 border-red-100 hover:border-red-600">Delete</button>
                                </div>
                            </div>
                        </div>
                    </div>`;
                }).join('');
                
                const unreadCount = window.globalState.notifications.filter(n => !n.read).length;
                const counterEl = document.getElementById('dashboard-unread-count');
                if (counterEl) counterEl.innerText = unreadCount;
            } catch(e) {
                console.error("renderNotifications Error:", e);
                const list = document.getElementById('notifications-list');
                if(list) list.innerHTML = `<div class="p-8 text-center text-red-600 font-bold bg-red-50 border border-red-200 rounded-2xl">❌ Render Error: ${e.message}</div>`;
            }
        };

        function syncData() {
            const rootRef = ref(db, `artifacts/${appId}`);
            
            onValue(child(rootRef, 'public/data/site_settings/global'), (snap) => {
                if(snap.exists()){ window.globalState.settings = snap.val(); renderSettings(); }
            }, (error) => {
                console.error("Firebase settings read error:", error);
            });
            
            onValue(child(rootRef, 'public/data/posts'), (snap) => {
                const p = [];
                if(snap.exists()) { 
                    snap.forEach(childSnap => { 
                        let postData = childSnap.val();
                        if (!postData.type || postData.type === '') postData.type = 'video';
                        p.push({ id: childSnap.key, ...postData }); 
                    }); 
                } 
                window.globalState.posts = p.sort((a,b) => {
                    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return timeB - timeA;
                });
                window.renderPostsTable();
                if (typeof window.populatePromoProductDropdown === 'function') window.populatePromoProductDropdown();
                if(document.getElementById('stat-videos')) document.getElementById('stat-videos').innerText = p.filter(x=>x.type==='video').length;
                if(document.getElementById('stat-gpts')) document.getElementById('stat-gpts').innerText = p.filter(x=>x.type==='gpt').length;
                if(document.getElementById('stat-tools')) document.getElementById('stat-tools').innerText = p.filter(x=>x.type==='tool').length;
                if(document.getElementById('stat-prompts')) document.getElementById('stat-prompts').innerText = p.filter(x=>x.type==='prompt').length;
                if(document.getElementById('stat-apps')) document.getElementById('stat-apps').innerText = p.filter(x=>x.type==='app').length;
                if(document.getElementById('stat-shop')) document.getElementById('stat-shop').innerText = p.filter(x=>x.type==='shop').length;
            }, (error) => {
                console.error("Firebase posts read error:", error);
            });

            // DEBUG: Show admin UID in console and on screen
            const currentAdminUID = auth.currentUser?.uid || 'not logged in';
            console.warn('🔑 ADMIN UID:', currentAdminUID);
            console.warn('📌 Firebase path:', `artifacts/${appId}/users`);
            
            // Show UID visually on admin panel for rules update
            const uidBanner = document.getElementById('admin-uid-debug');
            if (uidBanner) {
                uidBanner.textContent = `UID: ${currentAdminUID}`;
                uidBanner.classList.remove('hidden');
                uidBanner.onclick = () => {
                    navigator.clipboard.writeText(currentAdminUID);
                    notify("Admin UID copied to clipboard! 📋", "success");
                };
            }

            // Try to fetch users - catch permission errors
            const usersRef = child(rootRef, 'users');
            onValue(usersRef, (snap) => {
                console.log('📊 Users snap exists:', snap.exists(), '| val:', snap.val());
                const usersList = [];
                if(snap.exists()){
                    snap.forEach(childSnap => { 
                        const uData = childSnap.val() || {};
                        console.log('👤 User node key:', childSnap.key, '| data:', JSON.stringify(uData).substring(0, 200));
                        const profileData = uData?.profile?.data || uData?.profile || {};
                        usersList.push({ 
                            id: childSnap.key, 
                            email: profileData.email || '',
                            name: profileData.name || profileData.username || profileData.email?.split('@')[0] || 'User',
                            username: profileData.username || '',
                            avatarUrl: profileData.avatarUrl || '',
                            setupComplete: profileData.setupComplete || false,
                            bio: profileData.bio || ''
                        }); 
                    });
                } else {
                    console.warn('⚠️ Users node is empty or permission denied. Admin UID in rules must match:', currentAdminUID);
                }
                window.globalState.users = usersList;
                console.log('✅ Total users loaded:', usersList.length);
                if(document.getElementById('stat-total-users')) document.getElementById('stat-total-users').innerText = usersList.length;
                renderUsers();
            }, (error) => {
                console.error('❌ Firebase users read ERROR:', error.code, error.message);
                const tbody = document.getElementById('users-table-body');
                if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center"><div class="bg-red-50 border border-red-200 rounded-2xl p-6"><p class="text-red-600 font-black text-sm mb-2">❌ Firebase Permission Denied</p><p class="text-red-500 text-xs font-bold">Update Firebase Rules: replace UID with</p><p class="font-mono text-xs bg-red-100 px-3 py-1 rounded-lg mt-2 text-red-700 break-all">${currentAdminUID}</p></div></td></tr>`;
                if(document.getElementById('stat-total-users')) document.getElementById('stat-total-users').innerText = '!';
            });

            let initialNotifsDone = false;
            onValue(child(rootRef, 'interactions/notifications'), (snap) => {
                const notifs = [];
                if(snap.exists()){ snap.forEach(childSnap => { notifs.push({ id: childSnap.key, ...childSnap.val() }); }); }
                
                if (initialNotifsDone) {
                    const currentIds = window.globalState.notifications?.map(n => n.id) || [];
                    notifs.forEach(n => {
                        if (!currentIds.includes(n.id) && !n.read) {
                            window.triggerBrowserPushNotification("New TubeSeekify Notification 🔔", `${n.userName}: ${n.text || 'posted an interaction'}`);
                        }
                    });
                }
                
                window.globalState.notifications = notifs.sort((a,b) => {
                    const tA = a.createdAt ? (new Date(a.createdAt).getTime() || 0) : 0;
                    const tB = b.createdAt ? (new Date(b.createdAt).getTime() || 0) : 0;
                    return tB - tA;
                });
                initialNotifsDone = true;
                
                const unreadCount = notifs.filter(n => !n.read).length;
                const badge = document.getElementById('notif-badge');
                if(badge) {
                    if(unreadCount > 0) { badge.innerText = unreadCount > 99 ? '99+' : unreadCount; badge.classList.remove('hidden'); } 
                    else { badge.classList.add('hidden'); }
                }
                window.renderNotifications();
            }, (error) => {
                console.error("Firebase notifications read error:", error);
            });

            let initialPurchasesDone = false;
            onValue(child(rootRef, 'interactions/purchases'), (snap) => {
                const list = [];
                if(snap.exists()){
                    snap.forEach(cSnap => {
                        const val = cSnap.val();
                        if (val && typeof val === 'object') {
                            list.push({ id: cSnap.key, ...val });
                        }
                    });
                }
                
                if (initialPurchasesDone) {
                    const currentIds = window.globalState.purchases?.map(p => p.id) || [];
                    let hasNewPending = false;
                    list.forEach(p => {
                        if (p && !currentIds.includes(p.id) && p.status === 'pending') {
                            hasNewPending = true;
                            window.triggerBrowserPushNotification("New Purchase Pending! 💰", `${p.userName || 'Someone'} purchased ${p.postTitle || 'Premium Product'}`);
                        }
                    });
                    
                    if (hasNewPending) {
                        window.playCashRegisterSound();
                    }
                }
                
                window.globalState.purchases = list;
                initialPurchasesDone = true;
                
                // Real-time Emulator auto-verification: match new purchases against unprocessed notifications
                const pendingPurchases = list.filter(p => p && p.status === 'pending');
                const unprocessedNotifs = window.globalState.paymentNotifications || [];
                
                pendingPurchases.forEach(async (p) => {
                    unprocessedNotifs.forEach(async (n) => {
                        if (n && !n.processed) {
                            const parsed = window.parsePaymentNotificationText(n.text);
                            if (parsed && String(parsed.tid).trim() === String(p.tid).trim()) {
                                try {
                                    // Mark the notification as processed
                                    const notifRef = child(rootRef, `interactions/payment_notifications/${n.id}`);
                                    await update(notifRef, { processed: true, matchedPurchaseId: p.id });
                                    
                                    // Auto-approve the purchase
                                    await window.autoApprovePurchase(p.id, parsed.tid, parsed.amount);
                                    
                                    window.notify(`Auto-Approved: Rs. ${parsed.amount} from ${p.userName}! TID: ${parsed.tid} 💰`, "success");
                                } catch(e) {
                                    console.error("Auto approval error inside purchases sync:", e);
                                }
                            }
                        }
                    });
                });
                
                const pendingCount = list.filter(p => p && p.status === 'pending').length;
                const badge = document.getElementById('reqs-badge');
                if(badge) {
                    if(pendingCount > 0) { badge.innerText = pendingCount; badge.classList.remove('hidden'); }
                    else { badge.classList.add('hidden'); }
                }
                window.renderReqs();
                if (typeof window.renderArchive === 'function') window.renderArchive();
            }, (error) => {
                console.error("Firebase purchases read error:", error);
                const approvalsBody = document.getElementById('reqs-table-body');
                const historyBody = document.getElementById('archive-table-body');
                const errorHtml = `<tr><td colspan="7" class="p-8 text-center"><div class="bg-red-50 border border-red-200 rounded-2xl p-6"><p class="text-red-600 font-black text-sm mb-2">❌ Firebase Permission Denied (Purchases)</p><p class="text-red-500 text-xs font-bold">Update Firebase Rules: ensure admin UID is allowed to read interactions/purchases.</p><p class="font-mono text-xs bg-red-100 px-3 py-1 rounded-lg mt-2 text-red-700 break-all">${currentAdminUID}</p></div></td></tr>`;
                if(approvalsBody) approvalsBody.innerHTML = errorHtml;
                if(historyBody) historyBody.innerHTML = errorHtml;
            });

            // Listen to Promo Codes
            onValue(child(rootRef, 'public/data/promoCodes'), (snap) => {
                const codes = [];
                if(snap.exists()) {
                    snap.forEach(cSnap => {
                        codes.push({ id: cSnap.key, ...cSnap.val() });
                    });
                }
                window.globalState.promoCodes = codes.sort((a, b) => a.code.localeCompare(b.code));
                if (typeof window.renderPromoCodesTable === 'function') window.renderPromoCodesTable();
                if (typeof window.updatePromoCalculatorSelect === 'function') window.updatePromoCalculatorSelect();
                if (typeof window.updatePostPromoTestSelect === 'function') window.updatePostPromoTestSelect();
            }, (error) => {
                console.error("Firebase promo codes read error:", error);
            });

            // Listen to payment notifications from Emulator MacroDroid
            const notificationsRef = child(rootRef, 'interactions/payment_notifications');
            onValue(notificationsRef, (snap) => {
                const notifsList = [];
                if (snap.exists()) {
                    snap.forEach(cSnap => {
                        const val = cSnap.val();
                        if (val && typeof val === 'object') {
                            notifsList.push({ id: cSnap.key, ...val });
                        }
                    });
                }
                
                // Process any unprocessed payment notification
                notifsList.forEach(async (n) => {
                    if (n && !n.processed) {
                        const parsed = window.parsePaymentNotificationText(n.text);
                        if (parsed) {
                            const { tid, amount, gateway } = parsed;
                            
                            // Scan currently loaded purchases for a matching TID
                            const purchases = window.globalState.purchases || [];
                            const match = purchases.find(p => p && p.status === 'pending' && String(p.tid).trim() === String(tid).trim());
                            
                            if (match) {
                                try {
                                    // Mark the emulator notification as processed in the database
                                    await update(child(notificationsRef, n.id), { processed: true, matchedPurchaseId: match.id });
                                    
                                    // Auto-approve the purchase
                                    await window.autoApprovePurchase(match.id, tid, amount);
                                    
                                    window.notify(`Auto-Approved: Rs. ${amount} from ${match.userName}! TID: ${tid} 💰`, "success");
                                    console.log(`Auto approved purchase ${match.id} successfully.`);
                                } catch(e) {
                                    console.error("Auto approval error inside notifications sync:", e);
                                }
                            }
                        }
                    }
                });
                
                window.globalState.paymentNotifications = notifsList;
            }, (error) => {
                console.error("Firebase payment notifications read error:", error);
            });
        }

        // ========================================================
        // PROMO CODE MANAGER FUNCTIONS
        // ========================================================
        window.populatePromoProductDropdown = () => {
            const select = document.getElementById('promo-product-restrict');
            if (!select) return;
            const posts = window.globalState.posts || [];
            const shopPosts = posts.filter(p => p.type === 'shop');
            const currentValue = select.value;

            let html = `<option value="">All Premium Products (Global)</option>`;
            shopPosts.forEach(p => {
                html += `<option value="${p.id}">${p.title || 'Premium Product'} (${p.price || 'RS 0'})</option>`;
            });
            select.innerHTML = html;
            select.value = currentValue;
        };

        window.savePromoCode = async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('promo-name');
            const typeSelect = document.getElementById('promo-type');
            const valInput = document.getElementById('promo-value');
            const activeInput = document.getElementById('promo-active');
            const productRestrictSelect = document.getElementById('promo-product-restrict');
            const maxUsesInput = document.getElementById('promo-max-uses');
            const expiryDateInput = document.getElementById('promo-expiry-date');

            if (!nameInput || !typeSelect || !valInput) return;

            const code = nameInput.value.trim().toUpperCase();
            const discountType = typeSelect.value;
            const value = parseFloat(valInput.value) || 0;
            const isActive = activeInput ? activeInput.checked : true;
            const applicablePostId = productRestrictSelect ? productRestrictSelect.value : '';
            const maxUses = maxUsesInput && maxUsesInput.value ? parseInt(maxUsesInput.value, 10) : 0;
            const expiryDate = expiryDateInput ? expiryDateInput.value : '';

            if (!code || value <= 0) {
                notify("Please enter a valid code and positive value.", "error");
                return;
            }

            const btn = e.target.querySelector('button[type="submit"]');
            const origText = btn ? btn.innerText : '';
            if (btn) { btn.innerText = "Creating..."; btn.disabled = true; }

            try {
                const rootRef = ref(db, `artifacts/${appId}`);
                await set(child(rootRef, `public/data/promoCodes/${code}`), {
                    code,
                    discountType,
                    value,
                    isActive,
                    applicablePostId,
                    maxUses,
                    expiryDate,
                    usedCount: 0,
                    createdAt: new Date().toISOString()
                });
                notify(`Promo Code ${code} created successfully! 🏷️`, "success");
                nameInput.value = '';
                valInput.value = '';
                if (maxUsesInput) maxUsesInput.value = '';
                if (expiryDateInput) expiryDateInput.value = '';
                if (productRestrictSelect) productRestrictSelect.value = '';
                if (activeInput) activeInput.checked = true;
            } catch (err) {
                console.error("Error saving promo code:", err);
                notify("Failed to save promo code.", "error");
            } finally {
                if (btn) { btn.innerText = origText; btn.disabled = false; }
            }
        };

        window.deletePromoCode = async (code) => {
            if (confirm(`Are you sure you want to delete promo code ${code}?`)) {
                try {
                    const rootRef = ref(db, `artifacts/${appId}`);
                    await remove(child(rootRef, `public/data/promoCodes/${code}`));
                    notify(`Promo Code ${code} deleted.`, "success");
                } catch (err) {
                    console.error("Error deleting promo code:", err);
                    notify("Failed to delete promo code.", "error");
                }
            }
        };

        window.renderPromoCodesTable = () => {
            const tbody = document.getElementById('promo-codes-table-body');
            if (!tbody) return;

            const codes = window.globalState.promoCodes || [];
            if (codes.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="py-10 text-center text-gray-400 font-bold uppercase tracking-widest opacity-50 border-dashed border-2 border-gray-150 rounded-2xl">No active promo codes found.</td></tr>`;
                return;
            }

            tbody.innerHTML = codes.map(c => {
                const isLimitReached = c.maxUses > 0 && (c.usedCount || 0) >= c.maxUses;
                const isExpired = c.expiryDate && new Date() > new Date(c.expiryDate);
                
                let statusBadge = '';
                if (!c.isActive) {
                    statusBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-gray-50 text-gray-500 border border-gray-200 uppercase tracking-widest">Inactive</span>`;
                } else if (isExpired) {
                    statusBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-red-50 text-red-600 border border-red-200 uppercase tracking-widest">Expired</span>`;
                } else if (isLimitReached) {
                    statusBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-widest">Limit Reached</span>`;
                } else {
                    statusBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-widest">Active</span>`;
                }

                const formattedVal = c.discountType === 'percent' ? `${c.value}%` : `RS ${c.value}`;
                
                const post = (window.globalState.posts || []).find(p => p.id === c.applicablePostId);
                const restrictionHtml = post 
                    ? `<p class="text-[9px] text-purple-600 font-bold uppercase tracking-wide mt-1 truncate max-w-[150px]" title="${post.title}">🔒 ${post.title}</p>`
                    : `<p class="text-[9px] text-gray-400 font-bold uppercase tracking-wide mt-1">🌍 Global</p>`;

                return `
                    <tr class="hover:bg-slate-50 transition border-b border-gray-100">
                        <td class="py-4 px-6">
                            <p class="font-extrabold text-dark tracking-wider">${c.code}</p>
                            ${restrictionHtml}
                        </td>
                        <td class="py-4 px-6 font-bold text-gray-500 capitalize">${c.discountType}</td>
                        <td class="py-4 px-6">
                            <p class="font-black text-purple-600">${formattedVal}</p>
                            <p class="text-[9px] text-gray-500 font-bold mt-1">Uses: ${c.usedCount || 0}/${c.maxUses || '∞'}</p>
                            <p class="text-[8px] text-gray-400 font-bold mt-0.5">${c.expiryDate ? 'Exp: ' + new Date(c.expiryDate).toLocaleDateString() + ' ' + new Date(c.expiryDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No Expiry'}</p>
                        </td>
                        <td class="py-4 px-6">${statusBadge}</td>
                        <td class="py-4 px-6 text-right">
                            <button onclick="window.deletePromoCode('${c.code}')" class="text-rose-500 hover:text-rose-750 bg-rose-50 hover:bg-rose-100 p-2.5 rounded-xl border border-rose-200 active:scale-95 transition cursor-pointer">
                                <svg style="width:14px;height:14px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        };

        window.updatePromoCalculatorSelect = () => {
            const select = document.getElementById('calc-promo-select');
            if (!select) return;
            const codes = window.globalState.promoCodes || [];
            const currentValue = select.value;
            
            let optionsHtml = `<option value="">No Code Applied</option>`;
            codes.forEach(c => {
                if (c.isActive) {
                    const detail = c.discountType === 'percent' ? `${c.code} (${c.value}% Off)` : `${c.code} (-RS ${c.value})`;
                    optionsHtml += `<option value="${c.code}">${detail}</option>`;
                }
            });
            select.innerHTML = optionsHtml;
            select.value = currentValue;
            window.recalculatePromoTest();
        };

        window.recalculatePromoTest = () => {
            const select = document.getElementById('calc-promo-select');
            const baseInput = document.getElementById('calc-base-price');
            if (!select || !baseInput) return;

            const basePrice = parseFloat(baseInput.value) || 0;
            const selectedCode = select.value;
            
            let discount = 0;
            let typeDetail = '';

            if (selectedCode) {
                const c = (window.globalState.promoCodes || []).find(x => x.code === selectedCode);
                if (c && c.isActive) {
                    if (c.discountType === 'percent') {
                        discount = (basePrice * c.value) / 100;
                        typeDetail = ` (${c.value}%)`;
                    } else {
                        discount = Math.min(c.value, basePrice);
                        typeDetail = ` (Flat)`;
                    }
                }
            }

            const finalPrice = Math.max(0, basePrice - discount);

            const origEl = document.getElementById('calc-display-original');
            const discEl = document.getElementById('calc-display-discount');
            const finalEl = document.getElementById('calc-display-final');

            if (origEl) origEl.innerText = `RS ${basePrice}`;
            if (discEl) discEl.innerText = `-RS ${discount.toFixed(0)}${typeDetail}`;
            if (finalEl) finalEl.innerText = `RS ${finalPrice.toFixed(0)}`;
        };

        window.updatePostPromoTestSelect = () => {
            const select = document.getElementById('post-promo-test-select');
            if (!select) return;
            const codes = window.globalState.promoCodes || [];
            const currentValue = select.value;
            
            let optionsHtml = `<option value="" class="bg-slate-900 text-white">No Promo Applied (Original Price)</option>`;
            codes.forEach(c => {
                if (c.isActive) {
                    const detail = c.discountType === 'percent' ? `${c.code} (${c.value}% Off)` : `${c.code} (-RS ${c.value})`;
                    optionsHtml += `<option value="${c.code}" class="bg-slate-900 text-white">${detail}</option>`;
                }
            });
            select.innerHTML = optionsHtml;
            select.value = currentValue;
            window.updateAdminProductPromoPreview();
        };

        window.updateAdminProductPromoPreview = () => {
            const select = document.getElementById('post-promo-test-select');
            const priceInput = document.getElementById('post-price');
            const resultDiv = document.getElementById('post-promo-test-result');
            const displaySpan = document.getElementById('post-promo-test-price-display');
            if (!select || !priceInput || !resultDiv || !displaySpan) return;

            const rawPrice = priceInput.value.trim();
            if (!rawPrice) {
                resultDiv.classList.add('hidden');
                resultDiv.classList.remove('flex');
                return;
            }

            const digitsOnly = rawPrice.replace(/[^0-9.]/g, '');
            const basePrice = parseFloat(digitsOnly) || 0;
            const prefix = rawPrice.replace(/[0-9.]/g, '').trim() || 'RS';
            const selectedCode = select.value;

            if (!selectedCode) {
                resultDiv.classList.add('hidden');
                resultDiv.classList.remove('flex');
                return;
            }

            const c = (window.globalState.promoCodes || []).find(x => x.code === selectedCode);
            let discount = 0;
            let typeDetail = '';

            if (c && c.isActive) {
                if (c.discountType === 'percent') {
                    discount = (basePrice * c.value) / 100;
                    typeDetail = ` (${c.value}%)`;
                } else {
                    discount = Math.min(c.value, basePrice);
                    typeDetail = ` (Flat)`;
                }
            }

            const finalPrice = Math.max(0, basePrice - discount);
            displaySpan.innerText = `${prefix} ${finalPrice.toFixed(0)}`;
            resultDiv.classList.remove('hidden');
            resultDiv.classList.add('flex');
        };

        window.renderReqs = () => {
            try {
                const tbody = document.getElementById('reqs-table-body');
                if(!tbody) return;
                const purchases = window.globalState.purchases || [];
                const pending = purchases.filter(p => p && p.status === 'pending');

                const totalSpan = document.getElementById('tel-tot');
                const pendingSpan = document.getElementById('tel-pen');
                const historySpan = document.getElementById('tel-his');
                if(totalSpan) totalSpan.innerText = purchases.length;
                if(pendingSpan) pendingSpan.innerText = pending.length;
                if(historySpan) historySpan.innerText = purchases.length - pending.length;

                if(pending.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="p-20 text-center text-gray-400 font-black uppercase tracking-widest opacity-50 border-dashed border-2 border-gray-200 rounded-3xl m-4">No pending approvals found.</td></tr>';
                    return;
                }

                tbody.innerHTML = pending.map(p => {
                    let date = 'N/A';
                    if (p.createdAt) {
                        try {
                            const dObj = new Date(p.createdAt);
                            if (!isNaN(dObj.getTime())) {
                                date = dObj.toLocaleDateString() + ' ' + dObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            }
                        } catch(e) {}
                    }
                    const userName = p.userName || 'Anonymous';
                    const userEmail = p.userEmail || 'No Email';
                    const senderNo = p.senderNo || 'N/A';
                    const postTitle = p.postTitle || 'Premium Product';
                    const quantity = p.quantity || 1;
                    const gateway = p.gateway || 'Unknown';
                    const tid = p.tid || 'N/A';
                    const price = p.price || '0.00';
                    const screenshotUrl = p.screenshotUrl || '';
                    const couponApplied = p.couponApplied || 'None';

                    return `
                    <tr class="hover:bg-slate-50 transition-colors border-b border-gray-200 group">
                        <td class="p-6 max-w-[180px]">
                            <p class="font-black text-dark text-base leading-tight mb-1 group-hover:text-electric transition-colors truncate" title="${userName}">${userName}</p>
                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate" title="${userEmail}">${userEmail}</p>
                            <p class="text-[9px] text-gray-500 font-bold uppercase mt-1">No: ${senderNo}</p>
                        </td>
                        <td class="p-6 max-w-[240px]">
                            <p class="font-bold text-dark truncate" title="${postTitle}">${postTitle}</p>
                            <div class="flex flex-wrap gap-1.5 mt-1">
                                <span class="inline-block px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-indigo-50 border border-indigo-200 text-indigo-600">QTY: ${quantity}</span>
                                ${couponApplied !== 'None' ? `<span class="inline-block px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-purple-50 border border-purple-200 text-purple-600">🏷️ ${couponApplied}</span>` : ''}
                            </div>
                        </td>
                        <td class="p-6">
                            <span class="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${gateway === 'JazzCash' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-green-50 border-green-200 text-green-600'}">${gateway}</span>
                        </td>
                        <td class="p-6 font-mono text-xs font-black text-dark tracking-wide">${tid}</td>
                        <td class="p-6 font-black text-brand text-sm">${price}</td>
                        <td class="p-6 text-gray-400 text-xs font-semibold">${date}</td>
                        <td class="p-6 whitespace-nowrap">
                            ${screenshotUrl ? `<a href="${screenshotUrl}" target="_blank" class="inline-flex items-center gap-2 bg-blue-500 text-white hover:bg-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 border-0 mr-2" title="View payment screenshot"><img src="${screenshotUrl}" alt="proof" class="w-7 h-7 rounded-lg object-cover border border-white/40 shadow-sm" onerror="this.style.display='none'"/><i class="fa-solid fa-image"></i> Proof</a>` : ''}
                            <button onclick="window.approveReq('${p.id}', this)" class="bg-green-500 text-white hover:bg-green-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 border-0 mr-2 inline-flex items-center justify-center">Approve</button>
                            <button onclick="window.rejectReq('${p.id}', this)" class="bg-red-500 text-white hover:bg-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 border-0 inline-flex items-center justify-center">Reject</button>
                        </td>
                    </tr>`;
                }).join('');
            } catch(e) {
                console.error("renderReqs Error:", e);
                const tbody = document.getElementById('reqs-table-body');
                if(tbody) {
                    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-600 font-bold bg-red-50 border border-red-200 rounded-2xl">❌ Render Error: ${e.message}</td></tr>`;
                }
            }
        };

        window.renderArchive = () => {
            try {
                const tbody = document.getElementById('archive-table-body');
                if(!tbody) return;
                const purchases = window.globalState.purchases || [];
                const completed = purchases.filter(p => p && (p.status === 'approved' || p.status === 'rejected'));

                const totalSpan = document.getElementById('tel-tot-arc');
                const pendingSpan = document.getElementById('tel-pen-arc');
                const historySpan = document.getElementById('tel-his-arc');
                if(totalSpan) totalSpan.innerText = purchases.length;
                if(pendingSpan) pendingSpan.innerText = purchases.length - completed.length;
                if(historySpan) historySpan.innerText = completed.length;

                if(completed.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="p-20 text-center text-gray-400 font-black uppercase tracking-widest opacity-50 border-dashed border-2 border-gray-200 rounded-3xl m-4">No completed transactions found.</td></tr>';
                    return;
                }

                tbody.innerHTML = completed.map(p => {
                    let date = 'N/A';
                    if (p.createdAt) {
                        try {
                            const dObj = new Date(p.createdAt);
                            if (!isNaN(dObj.getTime())) {
                                date = dObj.toLocaleDateString() + ' ' + dObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            }
                        } catch(e) {}
                    }
                    const userName = p.userName || 'Anonymous';
                    const userEmail = p.userEmail || 'No Email';
                    const senderNo = p.senderNo || 'N/A';
                    const postTitle = p.postTitle || 'Premium Product';
                    const quantity = p.quantity || 1;
                    const gateway = p.gateway || 'Unknown';
                    const tid = p.tid || 'N/A';
                    const price = p.price || '0.00';
                    const screenshotUrl = p.screenshotUrl || '';
                    const couponApplied = p.couponApplied || 'None';
                    
                    const statusHtml = p.status === 'approved' ? 
                        `<span class="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-green-50 border-green-200 text-green-600">Approved</span>` : 
                        `<span class="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-red-50 border-red-200 text-red-600">Rejected</span>`;

                    return `
                    <tr class="hover:bg-slate-50 transition-colors border-b border-gray-200 group">
                        <td class="p-6 max-w-[180px]">
                            <p class="font-black text-dark text-base leading-tight mb-1 group-hover:text-electric transition-colors truncate" title="${userName}">${userName}</p>
                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate" title="${userEmail}">${userEmail}</p>
                            <p class="text-[9px] text-gray-500 font-bold uppercase mt-1">No: ${senderNo}</p>
                        </td>
                        <td class="p-6 max-w-[240px]">
                            <p class="font-bold text-dark truncate" title="${postTitle}">${postTitle}</p>
                            <div class="flex flex-wrap gap-1.5 mt-1">
                                <span class="inline-block px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-indigo-50 border border-indigo-200 text-indigo-600">QTY: ${quantity}</span>
                                ${couponApplied !== 'None' ? `<span class="inline-block px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-purple-50 border border-purple-200 text-purple-600">🏷️ ${couponApplied}</span>` : ''}
                            </div>
                        </td>
                        <td class="p-6">
                            <span class="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${gateway === 'JazzCash' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-green-50 border-green-200 text-green-600'}">${gateway}</span>
                        </td>
                        <td class="p-6 font-mono text-xs font-black text-dark tracking-wide">${tid}</td>
                        <td class="p-6 font-black text-brand text-sm">${price}</td>
                        <td class="p-6 text-gray-400 text-xs font-semibold">${date}</td>
                        <td class="p-6 whitespace-nowrap">
                            <div class="flex items-center gap-2">
                                ${statusHtml}
                                ${screenshotUrl ? `<a href="${screenshotUrl}" target="_blank" class="inline-flex items-center gap-2 bg-blue-500 text-white hover:bg-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 border-0 mr-2" title="View payment screenshot"><img src="${screenshotUrl}" alt="proof" class="w-7 h-7 rounded-lg object-cover border border-white/40 shadow-sm" onerror="this.style.display='none'"/><i class="fa-solid fa-image"></i> Proof</a>` : ''}
                            </div>
                        </td>
                    </tr>`;
                }).join('');
            } catch(e) {
                console.error("renderArchive Error:", e);
                const tbody = document.getElementById('archive-table-body');
                if(tbody) {
                    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-red-600 font-bold bg-red-50 border border-red-200 rounded-2xl">❌ Render Error: ${e.message}</td></tr>`;
                }
            }
        };

        window.approveReq = async (purchaseId, btn) => {
            const originalContent = btn.innerHTML;
            btn.innerHTML = `<span class="loader" style="width: 14px; height: 14px; border-top-color: currentColor;"></span>`;
            btn.disabled = true;
            try {
                const purchaseSnap = await get(ref(db, `artifacts/${appId}/interactions/purchases/${purchaseId}`));
                const purchaseData = purchaseSnap.exists() ? purchaseSnap.val() : {};
                const qty = purchaseData.quantity || 1;
                await update(ref(db, `artifacts/${appId}/interactions/purchases/${purchaseId}`), { status: 'approved', remainingDownloads: qty });
                
                // Increment usedCount if a promo code was applied
                const couponApplied = purchaseData.couponApplied;
                if (couponApplied && couponApplied !== 'None') {
                    const promoRef = ref(db, `artifacts/${appId}/public/data/promoCodes/${couponApplied}`);
                    const promoSnap = await get(promoRef);
                    if (promoSnap.exists()) {
                        const promoData = promoSnap.val();
                        const currentUses = parseInt(promoData.usedCount || 0, 10);
                        await update(promoRef, { usedCount: currentUses + 1 });
                    }
                }

                // Decrement product stock if available
                if (purchaseData.postId) {
                    const postRef = ref(db, `artifacts/${appId}/public/data/posts/${purchaseData.postId}`);
                    const postSnap = await get(postRef);
                    if (postSnap.exists()) {
                        const post = postSnap.val();
                        if (post.stock !== undefined && post.stock !== null) {
                            const currentStock = parseInt(post.stock, 10);
                            const purchasedQty = parseInt(purchaseData.quantity || 1, 10);
                            const newStock = Math.max(0, currentStock - purchasedQty);
                            await update(postRef, { stock: newStock });
                        }
                    }
                }

                const snap = await get(ref(db, `artifacts/${appId}/interactions/purchases/${purchaseId}`));
                if (snap.exists()) {
                    const p = snap.val();
                    await push(ref(db, `artifacts/${appId}/users/${p.userId}/notifications`), {
                        type: 'purchase_approved',
                        postId: p.postId,
                        postTitle: p.postTitle,
                        text: `🎉 Payment Approved! "${p.postTitle}" is now fully unlocked for you!`,
                        createdAt: new Date().toISOString(),
                        read: false
                    });
                }
                notify("Payment approved successfully!");
            } catch(e) { notify("Approval failed: " + e.message, "error"); btn.innerHTML = originalContent; btn.disabled = false; }
        };

        window.rejectReq = async (purchaseId, btn) => {
            if(!await window.premiumConfirm("Are you sure you want to reject this transaction request?", "Reject Payment?")) return;
            const originalContent = btn.innerHTML;
            btn.innerHTML = `<span class="loader" style="width: 14px; height: 14px; border-top-color: currentColor;"></span>`;
            btn.disabled = true;
            try {
                await update(ref(db, `artifacts/${appId}/interactions/purchases/${purchaseId}`), { status: 'rejected' });
                const snap = await get(ref(db, `artifacts/${appId}/interactions/purchases/${purchaseId}`));
                if (snap.exists()) {
                    const p = snap.val();
                    await push(ref(db, `artifacts/${appId}/users/${p.userId}/notifications`), {
                        type: 'purchase_rejected',
                        postId: p.postId,
                        postTitle: p.postTitle,
                        text: `❌ Payment Declined: Transaction ID (${p.tid}) verification failed. Please try again.`,
                        createdAt: new Date().toISOString(),
                        read: false
                    });
                }
                notify("Payment request rejected.");
            } catch(e) { notify("Rejection failed: " + e.message, "error"); btn.innerHTML = originalContent; btn.disabled = false; }
        };

        function renderUsers() {
            try {
                const tbody = document.getElementById('users-table-body');
                if(!tbody) return;
                
                const allUsers = window.globalState.users || [];
                const query = window.globalState.userSearchQuery || '';
                const visibleCount = window.globalState.visibleUsersCount || 10;

                // Filter users based on query
                const filteredUsers = allUsers.filter(u => {
                    const email = (u.email || '').toLowerCase();
                    const name = (u.name || '').toLowerCase();
                    const username = (u.username || '').toLowerCase();
                    const uid = (u.id || '').toLowerCase();
                    return email.includes(query) || name.includes(query) || username.includes(query) || uid.includes(query);
                });

                if(filteredUsers.length === 0) { 
                    tbody.innerHTML = '<tr><td colspan="5" class="p-20 text-center text-gray-400 font-black uppercase tracking-widest opacity-50 border-dashed border-2 border-gray-200 rounded-3xl m-4">No matching users found.</td></tr>'; 
                    const loadMoreBtnContainer = document.getElementById('users-load-more-container');
                    if (loadMoreBtnContainer) loadMoreBtnContainer.classList.add('hidden');
                    return; 
                }

                // Slice users based on visibleCount
                const slicedUsers = filteredUsers.slice(0, visibleCount);

                tbody.innerHTML = slicedUsers.map(u => {
                    const data = u.data || u; // support nested data
                    const email = data.email || u.email || '—';
                    const name = data.name || u.name || 'AI Creator';
                    const username = data.username || u.username || '';
                    const avatarUrl = data.avatarUrl || u.avatarUrl || '';
                    const setupComplete = data.setupComplete || u.setupComplete || false;
                    const uid = u.id || '';
                    const initial = (username || email || 'U').charAt(0).toUpperCase();

                    const avatarHtml = avatarUrl 
                        ? `<img src="${avatarUrl}" class="w-full h-full object-cover" onerror="this.style.display='none';this.parentNode.innerHTML='<div class=\\'w-full h-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-black text-xl\\'>${initial}</div>'" />` 
                        : `<div class="w-full h-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-black text-xl">${initial}</div>`;

                    const setupBadge = setupComplete 
                        ? `<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-1 rounded-lg border border-emerald-200">✓ Setup Done</span>` 
                        : `<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-[9px] font-black px-2 py-1 rounded-lg border border-amber-200">⏳ Pending</span>`;

                    const usernameBadge = username 
                        ? `<span class="inline-flex items-center gap-1 bg-blue-50 text-electric text-xs font-black px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm">@${username}</span>`
                        : `<span class="inline-flex items-center gap-1 bg-gray-50 text-gray-400 text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200">No username</span>`;

                    return `
                    <tr class="hover:bg-blue-50/30 transition-all duration-200 border-b border-gray-100 group">
                        <td class="p-4 pl-6">
                            <div class="w-12 h-12 rounded-full overflow-hidden border-[2.5px] border-white shadow-lg group-hover:border-electric transition-colors ring-2 ring-transparent group-hover:ring-electric/20">
                                ${avatarHtml}
                            </div>
                        </td>
                        <td class="p-4">
                            <div class="flex flex-col gap-1.5">
                                ${usernameBadge}
                                <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">${name}</p>
                            </div>
                        </td>
                        <td class="p-4">
                            <div class="flex items-center gap-2">
                                <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
                                <span class="text-[11px] text-gray-600 font-bold truncate max-w-[180px]">${email}</span>
                            </div>
                        </td>
                        <td class="p-4">
                            <div class="flex flex-col gap-1">
                                ${setupBadge}
                            </div>
                        </td>
                        <td class="p-4 pr-6">
                            <div class="text-[9px] text-gray-400 font-mono font-bold truncate max-w-[100px]" title="${uid}">${uid.substring(0,10)}...</div>
                        </td>
                    </tr>`;
                }).join('');

                const loadMoreBtnContainer = document.getElementById('users-load-more-container');
                if (loadMoreBtnContainer) {
                    if (filteredUsers.length > visibleCount) {
                        loadMoreBtnContainer.classList.remove('hidden');
                    } else {
                        loadMoreBtnContainer.classList.add('hidden');
                    }
                }
            } catch(e) {
                console.error("renderUsers Error:", e);
                const tbody = document.getElementById('users-table-body');
                if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-600 font-bold bg-red-50 border border-red-200 rounded-2xl">❌ Render Error: ${e.message}</td></tr>`;
            }
        }

        window.handleUserSearch = () => {
            const queryInput = document.getElementById('user-search-input');
            if (queryInput) {
                window.globalState.userSearchQuery = queryInput.value.toLowerCase().trim();
                window.globalState.visibleUsersCount = 10;
                renderUsers();
            }
        };

        window.loadMoreUsers = () => {
            window.globalState.visibleUsersCount += 10;
            renderUsers();
        };

        function renderSettings() {
            const s = window.globalState.settings;
            
            // Render the MacroDroid Webhook URL dynamically
            const webhookUrlEl = document.getElementById('set-webhook-url');
            if (webhookUrlEl) {
                webhookUrlEl.value = `https://tubeseekify-db-default-rtdb.firebaseio.com/artifacts/${appId}/interactions/payment_notifications.json`;
            }
            
            if(document.getElementById('set-announcement')) document.getElementById('set-announcement').value = s.announcementText || '';
            if(document.getElementById('set-announcement-link')) document.getElementById('set-announcement-link').value = s.announcementLink || '';
            if(document.getElementById('set-email')) document.getElementById('set-email').value = s.contactEmail || '';
            if(document.getElementById('set-footer')) document.getElementById('set-footer').value = s.footerText || '';
            if(document.getElementById('set-privacy')) document.getElementById('set-privacy').value = s.privacyPolicy || '';
            if(document.getElementById('set-terms')) document.getElementById('set-terms').value = s.termsConditions || '';
            
            if(document.getElementById('set-jazzcash-no')) document.getElementById('set-jazzcash-no').value = s.jazzcashNo || '';
            if(document.getElementById('set-jazzcash-title')) document.getElementById('set-jazzcash-title').value = s.jazzcashTitle || '';
            if(document.getElementById('set-easypaisa-no')) document.getElementById('set-easypaisa-no').value = s.easypaisaNo || '';
            if(document.getElementById('set-easypaisa-title')) document.getElementById('set-easypaisa-title').value = s.easypaisaTitle || '';
            if(document.getElementById('set-gemini-key')) document.getElementById('set-gemini-key').value = s.geminiApiKey || '';

            // Safepay configuration mapping
            const safepayConfig = s.safepay_config || {};
            if(document.getElementById('set-safepay-env')) document.getElementById('set-safepay-env').value = safepayConfig.env || 'sandbox';
            if(document.getElementById('set-safepay-public-key')) document.getElementById('set-safepay-public-key').value = safepayConfig.publicKey || '';

            // AdSense textareas script populate mapping
            if(document.getElementById('adsense-header')) document.getElementById('adsense-header').value = s.adsenseHeader || '';
            if(document.getElementById('adsense-sidebar')) document.getElementById('adsense-sidebar').value = s.adsenseSidebar || '';
            if(document.getElementById('adsense-inpost')) document.getElementById('adsense-inpost').value = s.adsenseInPost || '';
            
            if(document.getElementById('set-wa')) document.getElementById('set-wa').value = s.socials?.whatsapp || '';
            if(document.getElementById('set-tg')) document.getElementById('set-tg').value = s.socials?.telegram || '';
            if(document.getElementById('set-ig')) document.getElementById('set-ig').value = s.socials?.instagram || '';
            if(document.getElementById('set-yt')) document.getElementById('set-yt').value = s.socials?.youtube || '';
            if(document.getElementById('set-tt')) document.getElementById('set-tt').value = s.socials?.tiktok || '';

            const tabOrder = s.tabOrder || ['home', 'gems', 'prompts', 'tools', 'apps', 'shop', 'saved', 'account'];
            if(document.getElementById('order-home')) document.getElementById('order-home').value = tabOrder.indexOf('home') + 1;
            if(document.getElementById('order-gems')) document.getElementById('order-gems').value = tabOrder.indexOf('gems') + 1;
            if(document.getElementById('order-prompts')) document.getElementById('order-prompts').value = tabOrder.indexOf('prompts') + 1;
            if(document.getElementById('order-tools')) document.getElementById('order-tools').value = tabOrder.indexOf('tools') + 1;
            if(document.getElementById('order-apps')) document.getElementById('order-apps').value = tabOrder.indexOf('apps') + 1;
            if(document.getElementById('order-shop')) document.getElementById('order-shop').value = tabOrder.indexOf('shop') + 1;
            
            const categories = s.categories || [];
            const listContainer = document.getElementById('categories-list');
            if(listContainer) {
                if(categories.length === 0) {
                    listContainer.innerHTML = '<p class="text-gray-400 font-bold text-[10px] uppercase tracking-widest bg-gray-50 p-8 rounded-[24px] text-center border-2 border-dashed border-gray-200 shadow-inner">No categories active.</p>';
                } else {
                    let listHtml = '';
                    const types = ['video', 'gpt', 'tool', 'prompt', 'app', 'shop'];
                    const typeNames = { video: 'Videos', gpt: 'GPTs', tool: 'AI Tools', prompt: 'Prompts', app: 'Mobile Apps', shop: 'Shop' };
                    types.forEach(t => {
                        const typeCats = categories.filter(c => c.type === t);
                        if(typeCats.length > 0) {
                            const catCards = typeCats.map(c => {
                                const escapedName = c.name.replace(/'/g, "\\'");
                                return `
                                <div class="border-2 border-gray-200 bg-white px-5 py-4 rounded-2xl flex items-center justify-between text-xs font-black shadow-sm transition hover:border-electric group">
                                    <span class="cat-badge-${t} px-4 py-1.5 rounded-lg text-[9px] mr-3 tracking-widest uppercase">${c.name}</span>
                                    <button onclick="window.deleteCategory('${escapedName}', this)" class="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2.5 rounded-xl transition flex items-center justify-center opacity-0 group-hover:opacity-100 active:scale-95">
                                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>`
                            }).join('');
                            listHtml += `<div class="mb-8 w-full bg-slate-50 p-6 rounded-[32px] border-2 border-gray-200"><p class="text-[11px] font-black uppercase text-gray-500 mb-5 border-b-2 border-gray-200 pb-3 tracking-[0.2em]">${typeNames[t]}</p><div class="grid grid-cols-1 md:grid-cols-2 gap-4">${catCards}</div></div>`;
                        }
                    });
                    listContainer.innerHTML = listHtml;
                }
            }
            
            const banners = s.banners || [];
            const grid = document.getElementById('banners-grid');
            if(grid) {
                if(banners.length === 0) {
                    grid.innerHTML = '<p class="text-gray-400 font-bold uppercase tracking-widest text-[10px] py-20 text-center col-span-full border-2 border-dashed border-gray-200 rounded-[40px] bg-white shadow-inner">No Homepage Banners Active</p>';
                } else {
                    grid.innerHTML = banners.map((b, i) => `
                    <div class="relative bg-darker rounded-[32px] overflow-hidden aspect-[3/1] shadow-md border-4 border-white group animate-fade-in">
                        <img src="${b.image}" class="w-full h-full object-cover opacity-80 transition duration-700 group-hover:scale-110" />
                        <button onclick="window.deleteBanner(${i})" class="absolute top-4 right-4 bg-red-500 text-white p-4 rounded-2xl opacity-0 group-hover:opacity-100 transition shadow-2xl hover:bg-red-600">
                            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>`).join('');
                }
            }
        }

        window.renderPostsTable = () => {
            try {
                const tbody = document.getElementById('posts-table-body');
                if(!tbody) return;
                
                const posts = window.globalState.posts || [];
                const filteredPosts = window.currentPostFilter === 'all' ? posts : posts.filter(p => p.type === window.currentPostFilter);

                if(filteredPosts.length === 0) { 
                    tbody.innerHTML = `<tr><td colspan="4" class="p-16 text-center">
                        <div class="flex flex-col items-center justify-center">
                            <p class="text-gray-400 font-black uppercase tracking-widest text-xs">No content posts found.</p>
                        </div>
                    </td></tr>`; 
                    return; 
                }

                let html = '';
                filteredPosts.forEach(p => {
                    const safeType = p.type || 'video';
                    let typeBadge = '', details = '';
                    const resLen = Array.isArray(p.resources) ? p.resources.length : 0;
                    const recLen = Array.isArray(p.recommended) ? p.recommended.length : 0;
                    const promptLen = Array.isArray(p.promptsData) ? p.promptsData.length : 0;

                    if (safeType === 'video') { 
                        typeBadge = `<span class="cat-badge-video px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-sm">Video</span>`; 
                        details = `<span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mt-2 bg-gray-50 px-2 py-1 rounded w-max border">${resLen} Resource Links</span>`; 
                    }
                    else if (safeType === 'gpt') { 
                        typeBadge = `<span class="cat-badge-gpt px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-sm">GPT</span>`; 
                        details = `<span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mt-2 bg-gray-50 px-2 py-1 rounded w-max border">${p.videoUrl ? '🟢 Explainer Video Active' : '🔴 No Explainer'}</span>`; 
                    }
                    else if (safeType === 'tool') { 
                        typeBadge = `<span class="cat-badge-tool px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-sm">AI Tool</span>`; 
                        details = `<span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mt-2 bg-gray-50 px-2 py-1 rounded w-max border">${resLen} Dependencies</span>`; 
                    }
                    else if (safeType === 'prompt') { 
                        typeBadge = `<span class="cat-badge-prompt px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-sm">Prompt</span>`; 
                        details = `<span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mt-2 bg-gray-50 px-2 py-1 rounded w-max border">${promptLen} Snippets Stacked</span>`; 
                    }
                    else if (safeType === 'app') { 
                        typeBadge = `<span class="cat-badge-app px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-sm">Build App</span>`; 
                        details = `<span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mt-2 bg-gray-50 px-2 py-1 rounded w-max border">Cross Recs: ${recLen}</span>`; 
                    }
                    else if (safeType === 'shop') { 
                        typeBadge = `<span class="cat-badge-shop px-4 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-sm">Product</span>`; 
                        details = `<span class="text-[12px] font-black text-green-600 block mt-2 bg-green-50 px-2.5 py-1 rounded w-max border border-green-200">${p.price || 'Free Access'}</span>`; 
                    }

                    const thumbHtml = p.thumbnail 
                        ? `<img src="${p.thumbnail}" onerror="this.src='https://via.placeholder.com/600x400/111111/FFE345?text=Load+Error'" class="w-full h-full object-cover transition duration-500 group-hover:scale-105" />` 
                        : `<div class="w-full h-full bg-gray-100 flex items-center justify-center text-[9px] text-gray-400 font-bold uppercase tracking-widest">No Image</div>`;
                    
                    let displayDate = 'System Node';
                    try {
                        const rawDate = p.customDate || p.createdAt;
                        if (rawDate) {
                            const dObj = new Date(rawDate);
                            if (!isNaN(dObj.getTime())) displayDate = dObj.toLocaleDateString();
                        }
                    } catch(e) {}
                    const isPinnedBadge = p.pinned ? `<span class="ml-2 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-sm">📌 PINNED</span>` : '';

                    html += `
                    <tr class="hover:bg-slate-50 transition-colors border-b border-gray-200 group animate-fade-in">
                        <td class="p-6">
                            <div class="flex items-center min-w-[340px]">
                                <div class="w-28 h-18 rounded-xl overflow-hidden mr-5 shadow-sm bg-white border-2 border-gray-200 flex-shrink-0 group-hover:border-electric transition-colors relative">
                                    ${thumbHtml}
                                </div>
                                <div class="flex-1 pr-4 min-w-0">
                                    <p class="font-black text-dark text-sm leading-snug mb-1 break-words group-hover:text-electric transition-all">${p.title} ${isPinnedBadge}</p>
                                    <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">By: ${p.authorName || 'Abdul Rehman'} • On: ${displayDate}</p>
                                </div>
                            </div>
                        </td>
                        <td class="p-6 align-middle">${typeBadge}</td>
                        <td class="p-6 align-middle">
                            <span class="bg-white border-2 border-gray-200 text-gray-700 font-black px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest shadow-sm">${p.category || 'General'}</span>
                            ${details}
                        </td>
                        <td class="p-6 text-right whitespace-nowrap align-middle">
                            <button onclick="window.editPost('${p.id}')" class="text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white p-3.5 rounded-xl border-2 border-transparent hover:border-blue-300 transition-all mr-2 active:scale-95"><svg class="w-4 h-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
                            <button onclick="window.deletePost('${p.id}', this)" class="text-red-500 bg-red-50 hover:bg-red-500 hover:text-white p-3.5 rounded-xl border-2 border-transparent hover:border-red-300 transition-all active:scale-95"><svg class="w-4 h-4 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </td>
                    </tr>`;
                });
                tbody.innerHTML = html;
            } catch (err) { console.error(err); }
        };

        // --- FORM SUBMISSION BINDINGS ---
        safeAddListener('login-form', 'submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('login-btn');
            if(btn) btn.innerHTML = '<span class="loader"></span> Logging in...';
            try { 
                await signInWithEmailAndPassword(auth, document.getElementById('admin-email').value, document.getElementById('admin-password').value); 
                notify("Logged in successfully!"); 
            } catch(error) { 
                notify("Invalid email or password.", "error"); 
                if(btn) btn.innerHTML = 'Login'; 
            }
        });

        safeAddListener('settings-form', 'submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('save-settings-btn');
            const old = btn ? btn.innerHTML : '';
            if(btn) btn.innerHTML = '<span class="loader"></span> Saving settings...';
            try {
                const tabInputs = [
                    { id: 'home', order: parseInt(document.getElementById('order-home').value, 10) || 1 },
                    { id: 'gems', order: parseInt(document.getElementById('order-gems').value, 10) || 2 },
                    { id: 'prompts', order: parseInt(document.getElementById('order-prompts').value, 10) || 3 },
                    { id: 'tools', order: parseInt(document.getElementById('order-tools').value, 10) || 4 },
                    { id: 'apps', order: parseInt(document.getElementById('order-apps').value, 10) || 5 },
                    { id: 'shop', order: parseInt(document.getElementById('order-shop').value, 10) || 6 },
                    { id: 'saved', order: 7 },
                    { id: 'account', order: 8 }
                ];
                tabInputs.sort((a, b) => a.order - b.order);
                const tabOrder = tabInputs.map(t => t.id);

                await update(ref(db, `artifacts/${appId}/public/data/site_settings/global`), {
                    announcementText: document.getElementById('set-announcement').value,
                    announcementLink: document.getElementById('set-announcement-link').value,
                    contactEmail: document.getElementById('set-email').value, 
                    footerText: document.getElementById('set-footer').value,
                    privacyPolicy: document.getElementById('set-privacy').value, 
                    termsConditions: document.getElementById('set-terms').value,
                    adsenseHeader: document.getElementById('adsense-header').value,
                    adsenseSidebar: document.getElementById('adsense-sidebar').value,
                    adsenseInPost: document.getElementById('adsense-inpost').value,
                    jazzcashNo: document.getElementById('set-jazzcash-no').value,
                    jazzcashTitle: document.getElementById('set-jazzcash-title').value,
                    easypaisaNo: document.getElementById('set-easypaisa-no').value,
                    easypaisaTitle: document.getElementById('set-easypaisa-title').value,
                    geminiApiKey: document.getElementById('set-gemini-key') ? document.getElementById('set-gemini-key').value : '',
                    safepay_config: {
                        env: document.getElementById('set-safepay-env').value,
                        publicKey: document.getElementById('set-safepay-public-key').value.trim()
                    },
                    socials: { whatsapp: document.getElementById('set-wa').value, telegram: document.getElementById('set-tg').value, instagram: document.getElementById('set-ig').value, youtube: document.getElementById('set-yt').value, tiktok: document.getElementById('set-tt').value },
                    tabOrder: tabOrder
                });
                notify("Settings saved successfully!");
            } catch(err) { notify(err.message, "error"); } 
            finally { if(btn) btn.innerHTML = old; }
        });

        safeAddListener('add-banner-form', 'submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-banner');
            const old = btn ? btn.innerHTML : '';
            if(btn) btn.innerHTML = '<span class="loader"></span> Uploading...';
            try {
                const fileInput = document.getElementById('ban-img');
                const url = await uploadToImgBB(fileInput.files[0], true);
                if(!url) throw new Error("Image upload failed");
                const currentB = window.globalState.settings.banners || [];
                currentB.push({ image: url });
                await update(ref(db, `artifacts/${appId}/public/data/site_settings/global`), { banners: currentB });
                document.getElementById('add-banner-form').reset();
                window.closeModal('banner-modal');
                notify("Banner uploaded successfully!");
            } catch(err) { notify(err.message, "error"); } 
            finally { if(btn) btn.innerHTML = old; }
        });

        safeAddListener('category-form', 'submit', async (e) => {
            e.preventDefault();
            const type = document.getElementById('new-cat-type').value;
            const name = document.getElementById('new-category').value.trim();
            const cats = window.globalState.settings.categories || [];
            if(!cats.find(c => c.name === name)) { 
                cats.push({ name: name, type: type }); 
                await update(ref(db, `artifacts/${appId}/public/data/site_settings/global`), { categories: cats }); 
                document.getElementById('new-category').value = '';
                notify(`Category '${name}' created successfully!`);
            } else { notify("Category already exists.", "error"); }
        });

        safeAddListener('add-post-form', 'submit', async (e) => {
            e.preventDefault();
            const catSelect = document.getElementById('post-category');
            if(!catSelect || !catSelect.value) return notify("Critical: Please create and select a category first.", "error");

            const btn = document.getElementById('btn-submit-post');
            const old = btn ? btn.innerHTML : '';
            if(btn) btn.innerHTML = '<span class="loader"></span> Saving content post...';
            
            try {
                let type = document.getElementById('post-type').value;
                if (!type) type = 'video'; 
                
                let thumb = null;
                const fileInput = document.getElementById('post-thumb');
                if(fileInput && fileInput.files.length > 0) {
                    thumb = await uploadToImgBB(fileInput.files[0], false);
                    if(!thumb) throw new Error("Thumbnail image upload failed.");
                }

                // Custom Date validation override logic mapping
                const customDateValue = document.getElementById('post-date-picker').value;
                const finalIsoDate = customDateValue ? new Date(customDateValue).toISOString() : new Date().toISOString();

                let dataToSave = { 
                    title: document.getElementById('post-title').value, 
                    desc: document.getElementById('post-desc').value, 
                    type: type, 
                    category: catSelect.value, 
                    tag: document.getElementById('post-tag').value,
                    pinned: document.getElementById('post-pin-toggle').checked,
                    authorName: document.getElementById('post-author').value,
                    customDate: finalIsoDate
                };
                if(thumb) dataToSave.thumbnail = thumb;

                if (['video', 'tool', 'prompt', 'app', 'gpt', 'shop'].includes(type)) {
                    const recs = Array.from(document.querySelectorAll('.rec-checkbox:checked')).map(cb => cb.value);
                    dataToSave.recommended = recs.length > 0 ? recs : null;
                } else { dataToSave.recommended = null; }

                const res = [];
                document.querySelectorAll('#resources-container > div').forEach(row => {
                    const t = row.querySelector('.res-type').value; const n = row.querySelector('.res-name').value; const u = row.querySelector('.res-url').value;
                    if(n && u) res.push({ type: t, name: n, url: u });
                });
                dataToSave.resources = res;

                if(type === 'video') dataToSave.videoUrl = document.getElementById('post-video-url').value;
                if(type === 'gpt') { dataToSave.actionUrl = document.getElementById('post-gpt-url').value; dataToSave.videoUrl = document.getElementById('post-gpt-watch-url').value; }
                if(type === 'tool') dataToSave.actionUrl = document.getElementById('post-tool-url').value;
                if(type === 'app') dataToSave.actionUrl = document.getElementById('post-app-url').value;
                if(type === 'prompt') {
                    const pData = [];
                    document.querySelectorAll('.dynamic-prompt-row').forEach(row => { const pt = row.querySelector('.prompt-title').value; const pc = row.querySelector('.prompt-content').value; if(pt || pc) pData.push({ title: pt, content: pc }); });
                    dataToSave.promptsData = pData;
                }
                if(type === 'shop') { 
                    dataToSave.price = document.getElementById('post-price').value; 
                    dataToSave.actionUrl = document.getElementById('post-shop-url').value; 
                    const postBtnText = document.getElementById('post-btn-text');
                    if (postBtnText) dataToSave.buttonText = postBtnText.value.trim() || null;
                    const stockVal = document.getElementById('post-stock').value.trim();
                    dataToSave.stock = stockVal !== "" ? parseInt(stockVal, 10) : null;
                }

                if(window.globalState.editingPostId) {
                    await update(ref(db, `artifacts/${appId}/public/data/posts/${window.globalState.editingPostId}`), dataToSave);
                    notify("Content post updated successfully!");
                } else {
                    dataToSave.createdAt = new Date().toISOString();
                    await set(push(ref(db, `artifacts/${appId}/public/data/posts`)), dataToSave);
                    notify("Content post created successfully!");
                }
                
                document.getElementById('add-post-form').reset();
                window.closeModal('post-modal');
            } catch(err) { notify(err.message, "error"); } 
            finally { if(btn) btn.innerHTML = old; }
        });

        // Initialize Theme from localStorage
        const initTheme = () => {
            if (localStorage.getItem('theme') === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };
        initTheme();

        const setupCompressionStatsListeners = () => {
            const handleFileSelect = async (inputEl, statsContainerId, originalSizeId, compressedSizeId, savingPercentId, isBanner) => {
                const file = inputEl.files[0];
                const statsContainer = document.getElementById(statsContainerId);
                if (!file || !file.type.startsWith('image/')) {
                    if (statsContainer) {
                        statsContainer.classList.add('hidden');
                        statsContainer.classList.remove('flex');
                    }
                    return;
                }

                if (statsContainer) {
                    statsContainer.classList.remove('hidden');
                    statsContainer.classList.add('flex');
                }
                const originalSizeText = document.getElementById(originalSizeId);
                const compressedSizeText = document.getElementById(compressedSizeId);
                const savingPercentText = document.getElementById(savingPercentId);

                if (originalSizeText) originalSizeText.innerText = `Calculating...`;
                if (compressedSizeText) compressedSizeText.innerText = ``;
                if (savingPercentText) savingPercentText.innerText = ``;

                const optimizedFile = await compressImage(file, 1200, 1200, 0.85);
                
                const origKB = (file.size / 1024).toFixed(1);
                const optKB = (optimizedFile.size / 1024).toFixed(1);
                const savings = Math.max(0, ((file.size - optimizedFile.size) / file.size * 100)).toFixed(0);

                if (originalSizeText) originalSizeText.innerText = `Orig: ${origKB} KB`;
                if (compressedSizeText) compressedSizeText.innerText = `Optimized: ${optKB} KB`;
                if (savingPercentText) savingPercentText.innerText = `🎉 ${savings}% Saved`;
            };

            const postThumbInput = document.getElementById('post-thumb');
            if (postThumbInput) {
                postThumbInput.addEventListener('change', () => {
                    handleFileSelect(
                        postThumbInput, 
                        'post-thumb-stats', 
                        'post-thumb-original-size', 
                        'post-thumb-compressed-size', 
                        'post-thumb-saving-percent', 
                        false
                    );
                });
            }

            const banImgInput = document.getElementById('ban-img');
            if (banImgInput) {
                banImgInput.addEventListener('change', () => {
                    handleFileSelect(
                        banImgInput, 
                        'ban-img-stats', 
                        'ban-img-original-size', 
                        'ban-img-compressed-size', 
                        'ban-img-saving-percent', 
                        true
                    );
                });
            }

            const postToggle = document.getElementById('post-thumb-compress-toggle');
            const postBadge = document.getElementById('post-thumb-status-badge');
            if (postToggle && postBadge) {
                postToggle.addEventListener('change', () => {
                    if (postToggle.checked) {
                        postBadge.innerText = 'Retina 85% Quality';
                        postBadge.className = 'inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm';
                        if (postThumbInput && postThumbInput.files.length > 0) {
                            handleFileSelect(postThumbInput, 'post-thumb-stats', 'post-thumb-original-size', 'post-thumb-compressed-size', 'post-thumb-saving-percent', false);
                        }
                    } else {
                        postBadge.innerText = 'Original Uncompressed';
                        postBadge.className = 'inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-sm';
                        const statsContainer = document.getElementById('post-thumb-stats');
                        if (statsContainer) {
                            statsContainer.classList.add('hidden');
                            statsContainer.classList.remove('flex');
                        }
                    }
                });
            }

            const banToggle = document.getElementById('ban-img-compress-toggle');
            const banBadge = document.getElementById('ban-img-status-badge');
            if (banToggle && banBadge) {
                banToggle.addEventListener('change', () => {
                    if (banToggle.checked) {
                        banBadge.innerText = 'Retina 85%';
                        banBadge.className = 'inline-flex px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200';
                        if (banImgInput && banImgInput.files.length > 0) {
                            handleFileSelect(banImgInput, 'ban-img-stats', 'ban-img-original-size', 'ban-img-compressed-size', 'ban-img-saving-percent', true);
                        }
                    } else {
                        banBadge.innerText = 'Original';
                        banBadge.className = 'inline-flex px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200';
                        const statsContainer = document.getElementById('ban-img-stats');
                        if (statsContainer) {
                            statsContainer.classList.add('hidden');
                            statsContainer.classList.remove('flex');
                        }
                    }
                });
            }
        };
        setupCompressionStatsListeners();

        // Theme Toggle click listener
        safeAddListener('theme-toggle', 'click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            notify(`Theme toggled to ${isDark ? 'Dark' : 'Light'} Mode!`);
        });

        onAuthStateChanged(auth, async (user) => {
            if (user && user.email === ALLOWED_EMAIL) {
                const loginScreen = document.getElementById('login-screen');
                if(loginScreen) loginScreen.classList.add('hidden');
                const adminPanel = document.getElementById('admin-panel');
                if(adminPanel) adminPanel.classList.remove('hidden');
                const displayEmail = document.getElementById('admin-display-email');
                if(displayEmail) displayEmail.innerText = `Admin: ${user.email}`;
                syncData();
            } else {
                const loginScreen = document.getElementById('login-screen');
                if(loginScreen) loginScreen.classList.remove('hidden');
                const adminPanel = document.getElementById('admin-panel');
                if(adminPanel) adminPanel.classList.add('hidden');
                if(user) await signOut(auth);
            }
        });

        // Google Sign-In click listener
        safeAddListener('google-login-btn', 'click', async () => {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            const btn = document.getElementById('google-login-btn');
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<span class="loader"></span> Connecting...';
            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;
                if(user.email === ALLOWED_EMAIL) {
                    notify("Google login authenticated!");
                } else {
                    notify("Unauthorised Google account.", "error");
                    await signOut(auth);
                }
            } catch(error) {
                notify("Google Auth Failed: " + error.message, "error");
            } finally {
                btn.innerHTML = originalContent;
            }
        });

        // Logout click listener
        document.querySelectorAll('.logout-btn-action').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(confirm("Confirm security logout?")) {
                    try {
                        window.sessionStorage.clear();
                        await signOut(auth);
                        notify("Securely logged out.");
                        setTimeout(() => { window.location.reload(); }, 600);
                    } catch(err) {
                        notify("Logout failed.", "error");
                        setTimeout(() => { window.location.reload(); }, 600);
                    }
                }
            });
        });
    