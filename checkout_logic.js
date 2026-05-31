
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getDatabase, ref, onValue, child, set, get, update } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

        // State variables
        window.state = {
            user: null,
            userProfile: {},
            settings: {},
            promoCodes: [],
            appliedPromoCode: null,
            checkoutItem: null,
            cartItems: [],
            activeGateway: 'EasyPaisa',
            activePurchaseIds: [],
            
            // SaaS API redirects
            successUrl: null,
            cancelUrl: null,
            callbackRef: null
        };

        const appId = 'tubeseekify-v4';
        const IMGBB_API_KEY = '3fd88cc5d866ae088a56843cc3533035';

        // Firebase Configuration (sandbox matching index.html)
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

        // DOM elements
        const orderTitleEl = document.getElementById('order-main-title');
        const itemsListEl = document.getElementById('checkout-items-list');
        const subtotalEl = document.getElementById('calc-subtotal');
        const totalEl = document.getElementById('calc-total');
        const discountRowEl = document.getElementById('calc-discount-row');
        const discountLabelEl = document.getElementById('calc-discount-label');
        const discountValueEl = document.getElementById('calc-discount-value');
        
        const merchantNoValEl = document.getElementById('merchant-no-val');
        const merchantTitleValEl = document.getElementById('merchant-title-val');
        const merchantBadgeEl = document.getElementById('merchant-badge');
        const qrImageEl = document.getElementById('qr-image');
        
        const dropzoneEl = document.getElementById('dropzone');
        const fileInputEl = document.getElementById('screenshot-file');
        const dropzonePreviewEl = document.getElementById('dropzone-preview');
        const thumbnailEl = document.getElementById('screenshot-thumbnail');
        const filenameEl = document.getElementById('screenshot-filename');
        const filesizeEl = document.getElementById('screenshot-filesize');
        
        const senderNoInput = document.getElementById('sender-no');
        const senderNameInput = document.getElementById('sender-name');
        const trxIdInput = document.getElementById('trx-id');
        const submitBtn = document.getElementById('submit-verify-btn');
        const btnTextEl = document.getElementById('btn-text');
        const btnLoaderEl = document.getElementById('btn-loader');
        
        const inputScreen = document.getElementById('payment-input-screen');
        const statusScreen = document.getElementById('payment-status-screen');
        const successScreen = document.getElementById('payment-success-screen');
        const statusTidEl = document.getElementById('status-tid');
        const statusTickerEl = document.getElementById('status-ticker');

        // Toast notifications
        window.notify = (msg, type = 'success') => {
            const toast = document.getElementById('notification-toast');
            const icon = document.getElementById('toast-icon');
            const msgEl = document.getElementById('toast-message');
            if (toast && icon && msgEl) {
                msgEl.innerText = msg;
                if (type === 'error') {
                    toast.style.borderColor = '#ef4444';
                    icon.innerHTML = `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`;
                    icon.setAttribute('class', 'w-5 h-5 text-red-500');
                } else {
                    toast.style.borderColor = 'var(--border-primary)';
                    icon.innerHTML = `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`;
                    icon.setAttribute('class', 'w-5 h-5 text-brand');
                }
                toast.classList.add('show');
                setTimeout(() => { toast.classList.remove('show'); }, 3500);
            }
        };

        // Synthesize C-Major arpeggio celestial chime sound
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
                    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.04);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(ctx.currentTime + delay);
                    osc.stop(ctx.currentTime + delay + duration);
                };
                
                //Celestial scales (Pleasant harmony)
                playChime(0, 523.25, 0.4);   // C5
                playChime(0.08, 659.25, 0.4); // E5
                playChime(0.16, 783.99, 0.5); // G5
                playChime(0.24, 1046.50, 0.8); // C6
            } catch(err) {
                console.warn("Synthesizer blocked:", err);
            }
        };

        // Parse query params (SaaS Integration API ready!)
        const parseUrlParams = () => {
            const params = new URLSearchParams(window.location.search);
            
            // Supporting both camelCase and lowercase query parameters for resilient commercial integration!
            const postId = params.get('postId') || params.get('postid');
            const title = params.get('title') || params.get('Title');
            const price = params.get('price') || params.get('Price');
            
            // SaaS Callbacks
            window.state.successUrl = params.get('successUrl') || params.get('successurl');
            window.state.cancelUrl = params.get('cancelUrl') || params.get('cancelurl');
            window.state.callbackRef = params.get('callbackRef') || params.get('callbackref');
            
            if (postId) {
                window.state.checkoutItem = { postId, title, price };
            } else {
                window.state.checkoutItem = null;
            }

            // Adjust Cancel Link dynamically if cancelUrl is passed by an external developer
            if (window.state.cancelUrl) {
                const cancelBtn = document.getElementById('developer-cancel-link');
                if (cancelBtn) cancelBtn.href = window.state.cancelUrl;
            }
            if (window.state.successUrl) {
                const doneBtnSpan = document.getElementById('success-done-btn');
                if (doneBtnSpan) doneBtnSpan.querySelector('span').innerText = "Return to Merchant Site";
            } else {
                const doneBtnSpan = document.getElementById('success-done-btn');
                if (doneBtnSpan) doneBtnSpan.querySelector('span').innerText = "Go to Dashboard";
            }
        };

        // Redirect callback on finished checkout
        window.handleSuccessDone = () => {
            if (window.state.successUrl) {
                const redirect = new URL(window.state.successUrl);
                redirect.searchParams.append('status', 'approved');
                redirect.searchParams.append('ref', window.state.callbackRef || 'none');
                redirect.searchParams.append('postId', window.state.checkoutItem?.postId || '');
                window.location.href = redirect.toString();
            } else {
                window.location.href = 'index.html#downloads';
            }
        };

        // Fetch promo codes and global settings
        const fetchPromoCodesAndSettings = () => {
            const dataRef = ref(db, `artifacts/${appId}`);
            
            // Site Settings
            onValue(child(dataRef, 'public/data/site_settings/global'), (snap) => {
                if (snap.exists()) {
                    window.state.settings = snap.val();
                    updateMerchantDOM();
                }
            }, (err) => {
                console.warn("Global settings subscription failed:", err);
            });

            // Promo codes
            onValue(child(dataRef, 'public/data/promoCodes'), (snap) => {
                const codes = [];
                if (snap.exists()) {
                    snap.forEach(cSnap => {
                        codes.push({ id: cSnap.key, ...cSnap.val() });
                    });
                }
                window.state.promoCodes = codes;
                console.log("Promo codes synchronized:", codes.length);
            }, (err) => {
                console.warn("Promo codes subscription failed:", err);
            });
        };

        // Load cart items
        const loadCartItems = (user) => {
            if (window.state.checkoutItem && window.state.checkoutItem.postId === 'cart_checkout') {
                const storedCart = localStorage.getItem('ts_cart_' + user.uid);
                window.state.cartItems = storedCart ? JSON.parse(storedCart) : [];
            }
            renderCheckoutUI();
        };

        // Tab switcher
        window.switchWalletTab = (gateway) => {
            window.state.activeGateway = gateway;
            const glider = document.getElementById('active-tab-glider');
            const epBtn = document.getElementById('tab-easypaisa');
            const jcBtn = document.getElementById('tab-jazzcash');
            
            if (gateway === 'JazzCash') {
                glider.style.transform = 'translateX(100%)';
                jcBtn.classList.replace('text-slate-400', 'text-brand');
                epBtn.classList.replace('text-brand', 'text-slate-400');
            } else {
                glider.style.transform = 'translateX(0)';
                epBtn.classList.replace('text-slate-400', 'text-brand');
                jcBtn.classList.replace('text-brand', 'text-slate-400');
            }
            
            updateMerchantDOM();
        };

        // Clipboard copy
        window.copyToClipboard = (elementId, triggerEl) => {
            const text = document.getElementById(elementId).innerText;
            navigator.clipboard.writeText(text).then(() => {
                triggerEl.classList.add('copied');
                const tooltip = triggerEl.querySelector('.copy-tooltip');
                if (tooltip) tooltip.innerText = 'Copied! ✅';
                
                setTimeout(() => {
                    triggerEl.classList.remove('copied');
                    if (tooltip) tooltip.innerText = 'Click to copy';
                }, 2000);
                
                window.notify(`Copied to clipboard: "${text}"`, 'success');
            }).catch(() => {
                window.notify('Copy failed. Please manually select.', 'error');
            });
        };

        // Update merchant accounts
        const updateMerchantDOM = () => {
            const s = window.state.settings || {};
            const gateway = window.state.activeGateway;
            
            let num = '';
            let title = '';
            let bgClass = 'bg-brand';
            
            if (gateway === 'JazzCash') {
                num = s.jazzcashNo || '03076485827';
                title = s.jazzcashTitle || 'Arslan Fateh ALI';
                bgClass = 'bg-amber-500';
                if (merchantBadgeEl) {
                    merchantBadgeEl.innerText = 'JazzCash Wallet';
                    merchantBadgeEl.className = `px-2.5 py-0.5 ${bgClass} text-white text-[8px] font-black uppercase tracking-widest rounded self-start shadow-sm`;
                }
            } else {
                num = s.easypaisaNo || '03078898166';
                title = s.easypaisaTitle || 'Abdul Rehman';
                bgClass = 'bg-emerald-500';
                if (merchantBadgeEl) {
                    merchantBadgeEl.innerText = 'EasyPaisa Wallet';
                    merchantBadgeEl.className = `px-2.5 py-0.5 ${bgClass} text-white text-[8px] font-black uppercase tracking-widest rounded self-start shadow-sm`;
                }
            }
            
            if (merchantNoValEl) merchantNoValEl.innerText = num;
            if (merchantTitleValEl) merchantTitleValEl.innerText = title;
            
            const cleanNum = num.replace(/[^0-9]/g, '');
            if (qrImageEl) {
                document.getElementById('qr-loading').style.opacity = '1';
                qrImageEl.style.opacity = '0';
                qrImageEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${cleanNum}`;
            }
        };

        // Render line items and perform coupon price calculation
        const renderCheckoutUI = () => {
            const item = window.state.checkoutItem || {};
            if (!window.state.checkoutItem) {
                orderTitleEl.innerText = 'No Plan Selected';
                itemsListEl.innerHTML = '<div class="text-xs text-red-500 font-bold p-4">Checkout parameters missing. Redirecting...</div>';
                setTimeout(() => { window.location.href = 'index.html'; }, 2000);
                return;
            }

            let calculatedSubtotal = 0;
            let currencyPrefix = 'RS:';

            if (item.postId === 'cart_checkout') {
                orderTitleEl.innerText = 'Shopping Cart Bundle';
                itemsListEl.innerHTML = '';
                
                if (!window.state.user) {
                    itemsListEl.innerHTML = '<div class="text-xs text-slate-400 font-bold py-6 animate-pulse">Loading cart items...</div>';
                    return;
                }
                
                const cart = window.state.cartItems || [];
                if (cart.length === 0) {
                    itemsListEl.innerHTML = '<div class="text-xs text-slate-400 font-bold py-4">Your cart is empty.</div>';
                    return;
                }
                
                cart.forEach(c => {
                    const priceDigits = c.price.replace(/[^0-9.]/g, '');
                    const cPrice = parseFloat(priceDigits) || 0;
                    calculatedSubtotal += cPrice * c.quantity;
                    const prefix = c.price.replace(/[0-9.]/g, '').trim();
                    if (prefix) currencyPrefix = prefix;
                    
                    const itemRow = document.createElement('div');
                    itemRow.className = 'flex justify-between items-center py-2 text-xs font-bold text-[var(--text-title)] border-b border-slate-100 dark:border-slate-800/40';
                    itemRow.innerHTML = `
                        <div class="flex flex-col gap-0.5">
                            <span>${c.postTitle}</span>
                            <span class="text-[9px] text-slate-400 font-bold">${c.quantity}x @ ${c.price}</span>
                        </div>
                        <span class="font-mono">${prefix} ${(cPrice * c.quantity).toFixed(0)}</span>
                    `;
                    itemsListEl.appendChild(itemRow);
                });
            } else {
                orderTitleEl.innerText = item.title || 'Loading plan...';
                itemsListEl.innerHTML = '';
                
                const priceDigits = (item.price || 'RS 0').replace(/[^0-9.]/g, '');
                const basePrice = parseFloat(priceDigits) || 0;
                calculatedSubtotal = basePrice;
                const prefix = (item.price || 'RS 0').replace(/[0-9.]/g, '').trim();
                if (prefix) currencyPrefix = prefix;
                
                const itemRow = document.createElement('div');
                itemRow.className = 'flex justify-between items-center py-3 text-xs font-bold text-[var(--text-title)]';
                itemRow.innerHTML = `
                    <div class="flex flex-col gap-0.5">
                        <span>${item.title || 'License Key'}</span>
                        <span class="text-[9px] text-slate-400 font-bold">1x License</span>
                    </div>
                    <span class="font-mono">${prefix} ${basePrice.toFixed(0)}</span>
                `;
                itemsListEl.appendChild(itemRow);
            }

            // Correct Variable Mapping Bug Resolved: `appliedPromoCode` matches calculations
            let discount = 0;
            const promo = window.state.appliedPromoCode;
            
            if (promo && promo.isActive) {
                const promoVal = promo.value !== undefined ? parseFloat(promo.value) : (promo.discountValue !== undefined ? parseFloat(promo.discountValue) : 0);
                const promoPostId = promo.applicablePostId ? String(promo.applicablePostId).trim().toLowerCase() : '';
                const itemPostId = String(item.postId || '').trim().toLowerCase();
                
                if (promoPostId && promoPostId !== 'all') {
                    if (itemPostId === 'cart_checkout') {
                        const targetItem = window.state.cartItems.find(c => {
                            const cId = c.postId ? String(c.postId).trim().toLowerCase() : '';
                            return cId === promoPostId;
                        });
                        if (targetItem) {
                            const digits = targetItem.price.replace(/[^0-9.]/g, '');
                            const uPrice = parseFloat(digits) || 0;
                            const sub = uPrice * targetItem.quantity;
                            discount = promo.discountType === 'percent' ? (sub * promoVal) / 100 : Math.min(promoVal, sub);
                        }
                    } else if (itemPostId === promoPostId) {
                        discount = promo.discountType === 'percent' ? (calculatedSubtotal * promoVal) / 100 : Math.min(promoVal, calculatedSubtotal);
                    }
                } else {
                    discount = promo.discountType === 'percent' ? (calculatedSubtotal * promoVal) / 100 : Math.min(promoVal, calculatedSubtotal);
                }
            }

            const finalPrice = Math.max(0, calculatedSubtotal - discount);
            console.log("Promo calculation refreshed:", { calculatedSubtotal, discount, finalPrice });
            
            subtotalEl.innerText = `${currencyPrefix} ${calculatedSubtotal.toFixed(0)}`;
            totalEl.innerText = `${currencyPrefix} ${finalPrice.toFixed(0)}`;
            
            if (discount > 0) {
                const promoVal = promo.value !== undefined ? parseFloat(promo.value) : (promo.discountValue !== undefined ? parseFloat(promo.discountValue) : 0);
                discountRowEl.classList.remove('hidden');
                discountRowEl.classList.add('flex');
                discountLabelEl.innerText = `Discount Applied (${promo.code}${promo.discountType === 'percent' ? ` ${promoVal}%` : ''})`;
                discountValueEl.innerText = `-${currencyPrefix} ${discount.toFixed(0)}`;
            } else {
                discountRowEl.classList.remove('flex');
                discountRowEl.classList.add('hidden');
            }


            // Bypass for free items
            if (finalPrice === 0) {
                senderNoInput.required = false;
                trxIdInput.required = false;
                document.getElementById('trx-id').placeholder = "Enter FREE to bypass check";
                document.getElementById('sender-no').placeholder = "0300-0000000";
                btnTextEl.innerText = "PROCESS PAYMENT";
            } else {
                senderNoInput.required = true;
                trxIdInput.required = true;
                document.getElementById('trx-id').placeholder = "Enter 11 or 12 digit Transaction ID";
                document.getElementById('sender-no').placeholder = "03xx-xxxxxxx";
                btnTextEl.innerText = "PROCESS PAYMENT";
            }
        };

        // Promo Coupon Application
        window.applyPromoCode = () => {
            const input = document.getElementById('promo-input');
            const statusEl = document.getElementById('promo-status');
            const codeText = input.value.trim().toUpperCase();
            
            if (!codeText) {
                window.notify('Please enter a promo code.', 'error');
                return;
            }

            const promo = window.state.promoCodes.find(c => c.code.trim().toUpperCase() === codeText);
            
            if (!promo) {
                statusEl.innerText = 'Invalid coupon code ❌';
                statusEl.className = 'text-[10px] font-bold text-red-500';
                statusEl.classList.remove('hidden');
                window.notify('Invalid promo code.', 'error');
                return;
            }

            if (!promo.isActive) {
                statusEl.innerText = 'Promo code is inactive ❌';
                statusEl.className = 'text-[10px] font-bold text-red-500';
                statusEl.classList.remove('hidden');
                return;
            }

            if (promo.expiryDate && new Date() > new Date(promo.expiryDate)) {
                statusEl.innerText = 'Promo code expired ❌';
                statusEl.className = 'text-[10px] font-bold text-red-500';
                statusEl.classList.remove('hidden');
                return;
            }

            if (promo.maxUses > 0 && (promo.usedCount || 0) >= promo.maxUses) {
                statusEl.innerText = 'Usage limit reached ❌';
                statusEl.className = 'text-[10px] font-bold text-red-500';
                statusEl.classList.remove('hidden');
                return;
            }

            let isMatch = false;
            const promoPostId = promo.applicablePostId ? String(promo.applicablePostId).trim().toLowerCase() : '';
            const item = window.state.checkoutItem || {};
            const itemPostId = String(item.postId || '').trim().toLowerCase();

            if (!promoPostId || promoPostId === 'all') {
                isMatch = true;
            } else if (itemPostId === 'cart_checkout') {
                isMatch = (window.state.cartItems || []).some(c => {
                    const cId = c.postId ? String(c.postId).trim().toLowerCase() : '';
                    return cId === promoPostId;
                });
            } else if (itemPostId === promoPostId) {
                isMatch = true;
            }
            
            console.log("Promo applicability match check:", { itemPostId, promoPostId, isMatch });

            if (!isMatch) {
                statusEl.innerText = 'This promo code is not applicable to the selected product(s) ❌';
                statusEl.className = 'text-[10px] font-bold text-red-500';
                statusEl.classList.remove('hidden');
                return;
            }

            const promoVal = promo.value !== undefined ? parseFloat(promo.value) : (promo.discountValue !== undefined ? parseFloat(promo.discountValue) : 0);
            window.state.appliedPromoCode = promo;
            statusEl.innerText = `Applied: ${promo.code} (${promo.discountType === 'percent' ? `${promoVal}%` : `RS ${promoVal}`} discount) 🏷️`;
            statusEl.className = 'text-[10px] font-bold text-emerald-500';
            statusEl.classList.remove('hidden');
            
            window.notify(`Promo Code "${promo.code}" Applied!`, 'success');
            renderCheckoutUI();
        };

        // File Uploader Event hooks
        const initDragAndDrop = () => {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropzoneEl.addEventListener(eventName, e => {
                    e.preventDefault();
                    e.stopPropagation();
                }, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropzoneEl.addEventListener(eventName, () => {
                    dropzoneEl.classList.add('drag-over');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzoneEl.addEventListener(eventName, () => {
                    dropzoneEl.classList.remove('drag-over');
                }, false);
            });

            dropzoneEl.addEventListener('drop', e => {
                const dt = e.dataTransfer;
                const files = dt.files;
                if (files.length) {
                    fileInputEl.files = files;
                    handleFileSelection(files[0]);
                }
            });

            fileInputEl.addEventListener('change', e => {
                const files = e.target.files;
                if (files.length) {
                    handleFileSelection(files[0]);
                }
            });
        };

        const handleFileSelection = (file) => {
            if (!file.type.startsWith('image/')) {
                window.notify('Invalid format. Images only.', 'error');
                return;
            }

            filenameEl.innerText = file.name;
            const sizeKB = (file.size / 1024).toFixed(0);
            filesizeEl.innerText = `${sizeKB} KB`;

            const reader = new FileReader();
            reader.onload = e => {
                thumbnailEl.src = e.target.result;
                dropzonePreviewEl.classList.replace('hidden', 'flex');
            };
            reader.readAsDataURL(file);
        };

        window.removeScreenshot = (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInputEl.value = '';
            dropzonePreviewEl.classList.replace('flex', 'hidden');
        };

        const uploadScreenshotToImgBB = async (file) => {
            if (!file) return '';
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success) return data.data.url;
                return '';
            } catch (err) {
                console.error("ImgBB upload call failed:", err);
                return '';
            }
        };

        // Form Submit
        window.submitPayment = async (e) => {
            e.preventDefault();
            const user = window.state.user;
            if (!user) {
                window.notify('Auth error. Please login.', 'error');
                return;
            }

            const item = window.state.checkoutItem || {};
            const gateway = window.state.activeGateway;
            const senderNo = senderNoInput.value.trim();
            const senderName = senderNameInput.value.trim() || 'Auto Verification';
            const tid = trxIdInput.value.trim();
            const screenshotFile = fileInputEl.files[0];

            const finalPriceString = totalEl.innerText;
            const isFree = finalPriceString.includes(' 0') || finalPriceString.toLowerCase().includes('free');

            if (!isFree) {
                if (!senderNo) {
                    window.notify('Sender number is required.', 'error');
                    return;
                }
                if (tid.length < 11 || tid.length > 12 || isNaN(tid)) {
                    window.notify('TID must be 11 or 12 numeric digits.', 'error');
                    return;
                }
            }

            submitBtn.disabled = true;
            btnLoaderEl.classList.remove('hidden');
            btnTextEl.innerText = "Processing Payment...";

            let screenshotUrl = '';
            if (screenshotFile) {
                btnTextEl.innerText = "Uploading Receipt Image...";
                screenshotUrl = await uploadScreenshotToImgBB(screenshotFile);
            }

            try {
                if (isFree) {
                    // Free Bypass logic
                    btnTextEl.innerText = "Accessing plan...";
                    const bypassTid = 'FREE_' + Math.random().toString(36).substr(2, 9).toUpperCase();
                    
                    if (item.postId === 'cart_checkout') {
                        for (const cartItem of window.state.cartItems) {
                            const pId = `${user.uid}_${cartItem.postId}`;
                            const pRef = ref(db, `artifacts/${appId}/interactions/purchases/${pId}`);
                            await set(pRef, {
                                id: pId,
                                userId: user.uid,
                                userName: window.state.userProfile.name || user.email.split('@')[0],
                                userEmail: user.email,
                                postId: cartItem.postId,
                                postTitle: cartItem.postTitle,
                                gateway: `Auto-${gateway}`,
                                senderNo: '03000000000',
                                senderName: senderName,
                                tid: bypassTid,
                                price: 'RS 0',
                                quantity: cartItem.quantity,
                                remainingDownloads: cartItem.quantity,
                                status: 'approved',
                                screenshotUrl: '',
                                createdAt: new Date().toISOString(),
                                couponApplied: window.state.appliedPromoCode ? window.state.appliedPromoCode.code : 'None',
                                discountAmount: 0,
                                approvedAt: new Date().toISOString(),
                                approvedBy: 'AutoBypass'
                            });
                        }
                    } else {
                        const pId = `${user.uid}_${item.postId}`;
                        const pRef = ref(db, `artifacts/${appId}/interactions/purchases/${pId}`);
                        await set(pRef, {
                            id: pId,
                            userId: user.uid,
                            userName: window.state.userProfile.name || user.email.split('@')[0],
                            userEmail: user.email,
                            postId: item.postId,
                            postTitle: item.title,
                            gateway: `Auto-${gateway}`,
                            senderNo: '03000000000',
                            senderName: senderName,
                            tid: bypassTid,
                            price: 'RS 0',
                            quantity: 1,
                            remainingDownloads: 1,
                            status: 'approved',
                            screenshotUrl: '',
                            createdAt: new Date().toISOString(),
                            couponApplied: window.state.appliedPromoCode ? window.state.appliedPromoCode.code : 'None',
                            discountAmount: 0,
                            approvedAt: new Date().toISOString(),
                            approvedBy: 'AutoBypass'
                        });
                    }

                    window.playCustomerSuccessSound();
                    transitionToSuccess(item, user);
                    return;
                }

                // Standard Paid Transaction Registration
                btnTextEl.innerText = "Processing Payment...";
                const primaryPurchaseId = `${user.uid}_${item.postId === 'cart_checkout' ? (window.state.cartItems[0] || {}).postId : item.postId}`;
                window.state.activePurchaseIds = [];

                if (item.postId === 'cart_checkout') {
                    const cart = window.state.cartItems;
                    let grandSub = 0;
                    cart.forEach(c => {
                        const digits = c.price.replace(/[^0-9.]/g, '');
                        grandSub += (parseFloat(digits) || 0) * c.quantity;
                    });
                    
                    const promo = window.state.appliedPromoCode;
                    let discAmount = 0;
                    if (promo && promo.isActive) {
                        if (promo.applicablePostId) {
                            const restricted = cart.find(c => c.postId === promo.applicablePostId);
                            if (restricted) {
                                const digits = restricted.price.replace(/[^0-9.]/g, '');
                                const sub = (parseFloat(digits) || 0) * restricted.quantity;
                                discAmount = promo.discountType === 'percent' ? (sub * promo.value) / 100 : Math.min(promo.value, sub);
                            }
                        } else {
                            discAmount = promo.discountType === 'percent' ? (grandSub * promo.value) / 100 : Math.min(promo.value, grandSub);
                        }
                    }

                    for (const cartItem of cart) {
                        const pId = `${user.uid}_${cartItem.postId}`;
                        window.state.activePurchaseIds.push(pId);
                        
                        const pRef = ref(db, `artifacts/${appId}/interactions/purchases/${pId}`);
                        const digits = cartItem.price.replace(/[^0-9.]/g, '');
                        const baseTotal = (parseFloat(digits) || 0) * cartItem.quantity;
                        
                        let itemDiscount = 0;
                        if (promo && promo.isActive) {
                            if (promo.applicablePostId) {
                                if (cartItem.postId === promo.applicablePostId) itemDiscount = discAmount;
                            } else {
                                if (promo.discountType === 'percent') {
                                    itemDiscount = (baseTotal * promo.value) / 100;
                                } else {
                                    const share = grandSub > 0 ? (baseTotal / grandSub) : 0;
                                    itemDiscount = discAmount * share;
                                }
                            }
                        }

                        const final = Math.max(0, baseTotal - itemDiscount);
                        const finalStr = `RS ${final.toFixed(0)}`;

                        await set(pRef, {
                            id: pId,
                            userId: user.uid,
                            userName: window.state.userProfile.name || user.email.split('@')[0],
                            userEmail: user.email,
                            postId: cartItem.postId,
                            postTitle: cartItem.postTitle,
                            gateway: `Auto-${gateway}`,
                            senderNo: senderNo,
                            senderName: senderName,
                            tid: tid,
                            price: finalStr,
                            quantity: cartItem.quantity,
                            remainingDownloads: cartItem.quantity,
                            status: 'pending',
                            screenshotUrl: screenshotUrl,
                            createdAt: new Date().toISOString(),
                            couponApplied: promo ? promo.code : 'None',
                            discountAmount: itemDiscount
                        });
                    }

                    if (promo && promo.isActive) {
                        try {
                            const couponRef = ref(db, `artifacts/${appId}/public/data/promoCodes/${promo.code}`);
                            const couponSnap = await get(couponRef);
                            if (couponSnap.exists()) {
                                await update(couponRef, { usedCount: (couponSnap.val().usedCount || 0) + 1 });
                            }
                        } catch (couponErr) {
                            console.warn("Coupon usage increment bypassed (client write restricted by rules):", couponErr);
                        }
                    }

                } else {
                    const pId = `${user.uid}_${item.postId}`;
                    window.state.activePurchaseIds.push(pId);
                    
                    const pRef = ref(db, `artifacts/${appId}/interactions/purchases/${pId}`);
                    const promo = window.state.appliedPromoCode;
                    let discAmount = 0;
                    
                    const digits = item.price.replace(/[^0-9.]/g, '');
                    const baseTotal = parseFloat(digits) || 0;
                    
                    if (promo && promo.isActive) {
                        const promoPostId = promo.applicablePostId ? String(promo.applicablePostId).trim().toLowerCase() : '';
                        const itemPostId = item.postId ? String(item.postId).trim().toLowerCase() : '';
                        
                        let isApplicable = false;
                        if (promoPostId) {
                            if (itemPostId === promoPostId) isApplicable = true;
                        } else {
                            isApplicable = true;
                        }
                        
                        if (isApplicable) {
                            discAmount = promo.discountType === 'percent' ? (baseTotal * promo.value) / 100 : Math.min(promo.value, baseTotal);
                        }
                    }
                    
                    const final = Math.max(0, baseTotal - discAmount);
                    const finalStr = `RS ${final.toFixed(0)}`;

                    await set(pRef, {
                        id: pId,
                        userId: user.uid,
                        userName: window.state.userProfile.name || user.email.split('@')[0],
                        userEmail: user.email,
                        postId: item.postId,
                        postTitle: item.title,
                        gateway: `Auto-${gateway}`,
                        senderNo: senderNo,
                        senderName: senderName,
                        tid: tid,
                        price: finalStr,
                        quantity: 1,
                        remainingDownloads: 1,
                        status: 'pending',
                        screenshotUrl: screenshotUrl,
                        createdAt: new Date().toISOString(),
                        couponApplied: promo ? promo.code : 'None',
                        discountAmount: discAmount
                    });

                    if (promo && promo.isActive) {
                        try {
                            const couponRef = ref(db, `artifacts/${appId}/public/data/promoCodes/${promo.code}`);
                            const couponSnap = await get(couponRef);
                            if (couponSnap.exists()) {
                                await update(couponRef, { usedCount: (couponSnap.val().usedCount || 0) + 1 });
                            }
                        } catch (couponErr) {
                            console.warn("Coupon usage increment bypassed (client write restricted by rules):", couponErr);
                        }
                    }
                }

                window.notify('Transaction registered successfully! Auto-Scanner loading... 🔍', 'success');
                startRealtimeVerificationListener(tid, primaryPurchaseId, item, user);

            } catch (err) {
                console.error("Firebase transaction setup failed:", err);
                window.notify("Setup failed. Please try again.", "error");
                submitBtn.disabled = false;
                btnLoaderEl.classList.add('hidden');
                btnTextEl.innerText = "PROCESS PAYMENT";
            }
        };

        // Realtime verifier listener with integrated 60-second Countdown Timeout!
        const startRealtimeVerificationListener = (tid, primaryPurchaseId, item, user) => {
            if (window._paymentSub) window._paymentSub();
            if (window._trxSub) window._trxSub();
            if (window._countdownInterval) clearInterval(window._countdownInterval);

            statusTidEl.innerText = tid;
            statusTickerEl.innerText = 'Checking transaction logs...';
            statusTickerEl.className = 'text-[10px] font-black uppercase text-amber-500 animate-pulse tracking-wider';
            
            // Clean seamless toggle (Natural height preservation)
            inputScreen.classList.add('hidden');
            inputScreen.classList.remove('flex');
            statusScreen.classList.remove('hidden');
            statusScreen.classList.add('flex');

            const purchaseRef = ref(db, `artifacts/${appId}/interactions/purchases/${primaryPurchaseId}`);
            const verifiedRef = ref(db, `artifacts/${appId}/interactions/verified_trxs/${tid}`);

            // Initialize 60 seconds countdown
            let timeLeft = 60;
            const statusText = document.getElementById('countdown-status-text');
            const progressBarEl = document.getElementById('countdown-progress-bar');
            if (progressBarEl) progressBarEl.style.width = '100%';
            
            window._countdownInterval = setInterval(async () => {
                timeLeft--;
                if (statusText) statusText.innerText = `Auto-verifying payment... Time remaining: ${timeLeft}s`;
                if (progressBarEl) progressBarEl.style.width = `${(timeLeft / 60) * 100}%`;
                
                if (timeLeft <= 0) {
                    clearInterval(window._countdownInterval);
                    
                    // Stop Realtime DB listeners
                    if (window._paymentSub) { window._paymentSub(); window._paymentSub = null; }
                    if (window._trxSub) { window._trxSub(); window._trxSub = null; }
                    
                    console.log("Verification Timeout: Rejecting purchase dynamically");
                    window.notify("Auto-verification timed out. Transaction not found.", "error");
                    
                    // Automatically update purchase status to rejected in Firebase
                    try {
                        for (const pId of window.state.activePurchaseIds) {
                            const pRef = ref(db, `artifacts/${appId}/interactions/purchases/${pId}`);
                            await update(pRef, {
                                status: 'rejected',
                                rejectedAt: new Date().toISOString(),
                                reason: 'AutoTimeout'
                            });
                        }
                    } catch (err) {
                        console.error("Timeout database status update failed:", err);
                    }
                }
            }, 1000);

            // Webhook Listener (Make.com node verification)
            window._trxSub = onValue(verifiedRef, async (snap) => {
                if (snap.exists()) {
                    const data = snap.val();
                    if (data.status === 'approved') {
                        statusTickerEl.innerText = 'Approved by AutoScanner!';
                        statusTickerEl.className = 'text-[10px] font-black uppercase text-emerald-500 tracking-wider';
                        
                        try {
                            for (const pId of window.state.activePurchaseIds) {
                                const pRef = ref(db, `artifacts/${appId}/interactions/purchases/${pId}`);
                                await update(pRef, {
                                    status: 'approved',
                                    approvedAt: new Date().toISOString(),
                                    approvedBy: 'AutoScanner'
                                });
                            }
                        } catch (err) {
                            console.error("Client verification update failed:", err);
                        }
                    }
                }
            }, (err) => {
                console.warn("TID verified logs subscription bypassed (client read restricted):", err);
            });

            // Purchase listener status
            window._paymentSub = onValue(purchaseRef, (snap) => {
                if (snap.exists()) {
                    const purchase = snap.val();
                    
                    if (purchase.status === 'approved') {
                        if (window._countdownInterval) clearInterval(window._countdownInterval);
                        window.playCustomerSuccessSound();
                        
                        if (window._paymentSub) { window._paymentSub(); window._paymentSub = null; }
                        if (window._trxSub) { window._trxSub(); window._trxSub = null; }
                        
                        transitionToSuccess(item, user);
                        
                    } else if (purchase.status === 'rejected') {
                        if (window._countdownInterval) clearInterval(window._countdownInterval);
                        if (window._paymentSub) { window._paymentSub(); window._paymentSub = null; }
                        if (window._trxSub) { window._trxSub(); window._trxSub = null; }
                        
                        window.notify("Transaction check failed. Declined.", "error");
                        statusTickerEl.innerText = 'Declined: Invalid Transaction';
                        statusTickerEl.className = 'text-[10px] font-black uppercase text-red-500 tracking-wider';
                        
                        // Transition back to form console after delay
                        setTimeout(() => {
                            statusScreen.classList.add('hidden');
                            statusScreen.classList.remove('flex');
                            inputScreen.classList.remove('hidden');
                            inputScreen.classList.add('flex');
                            
                            submitBtn.disabled = false;
                            btnLoaderEl.classList.add('hidden');
                            btnTextEl.innerText = "PROCESS PAYMENT";
                            
                            window.notify("Verification declined. Please double check your TID and try again.", "info");
                        }, 4000);
                    }
                }
            }, (err) => {
                console.warn("Purchase status subscription failed:", err);
            });
        };

        // Transition UI to success downloads page
        const transitionToSuccess = async (item, user) => {
            statusScreen.classList.add('hidden');
            statusScreen.classList.remove('flex');
            inputScreen.classList.add('hidden');
            inputScreen.classList.remove('flex');
            successScreen.classList.remove('hidden');
            successScreen.classList.add('flex');
            
            const downloadsContainer = document.getElementById('success-downloads-container');
            downloadsContainer.innerHTML = '<div class="text-xs text-slate-400 font-bold py-6 animate-pulse">Retrieving direct premium file downloads...</div>';

            try {
                // Fetch posts
                const postsSnap = await get(ref(db, `artifacts/${appId}/public/data/posts`));
                const allPosts = [];
                if (postsSnap.exists()) {
                    postsSnap.forEach(pSnap => {
                        allPosts.push({ id: pSnap.key, ...pSnap.val() });
                    });
                }

                let html = '';
                if (item.postId === 'cart_checkout') {
                    const cart = window.state.cartItems;
                    html = '<div class="flex flex-col gap-2.5 w-full">';
                    
                    cart.forEach(cItem => {
                        const matched = allPosts.find(p => p.id === cItem.postId) || {};
                        const dlUrl = matched.actionUrl || '#';
                        const purchaseId = `${user.uid}_${cItem.postId}`;
                        
                        html += `
                            <div class="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-3 shadow-sm hover:border-brand/40 transition w-full">
                                <div class="flex flex-col text-left max-w-[180px]">
                                    <span class="text-xs font-bold text-[var(--text-title)] truncate">${cItem.postTitle}</span>
                                    <span class="text-[8px] text-slate-400 font-black uppercase tracking-wider">Direct Access Link</span>
                                </div>
                                <button onclick="window.triggerDownload('${purchaseId}', '${dlUrl}')" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition active:scale-95 shadow">
                                    Download ⬇️
                                </button>
                            </div>
                        `;
                        
                        // Auto staggering trigger download
                        setTimeout(() => {
                            window.triggerDownload(purchaseId, dlUrl);
                        }, 1200);
                    });
                    
                    html += '</div>';
                    downloadsContainer.innerHTML = html;
                    
                    // Clear Cart
                    localStorage.removeItem('ts_cart_' + user.uid);
                    
                } else {
                    const matched = allPosts.find(p => p.id === item.postId) || {};
                    const dlUrl = matched.actionUrl || '#';
                    const purchaseId = `${user.uid}_${item.postId}`;
                    
                    downloadsContainer.innerHTML = `
                        <div class="flex flex-col gap-4 w-full">
                            <div class="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-4 shadow-sm w-full">
                                <div class="flex flex-col text-left max-w-[200px]">
                                    <span class="text-xs font-bold text-[var(--text-title)] truncate">${item.title}</span>
                                    <span class="text-[8px] text-slate-400 font-black uppercase tracking-wider">Unrestricted License</span>
                                </div>
                                <span class="text-[9px] text-emerald-500 font-extrabold bg-emerald-500/10 px-2 py-0.5 rounded select-none">Unlocked</span>
                            </div>
                            <button onclick="window.triggerDownload('${purchaseId}', '${dlUrl}')" class="w-full py-3.5 bg-gradient-to-r from-brand to-indigo-600 hover:brightness-110 text-white text-xs font-black uppercase tracking-widest rounded-xl border-0 cursor-pointer transition active:scale-95 shadow flex items-center justify-center gap-2">
                                <span>Download Premium File</span>
                                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                            </button>
                        </div>
                    `;
                    
                    setTimeout(() => {
                        window.triggerDownload(purchaseId, dlUrl);
                    }, 1200);
                }
            } catch (err) {
                console.error("Success download loading failed:", err);
                downloadsContainer.innerHTML = '<div class="text-xs text-red-500 font-bold py-4">Error fetching file download url. Please manually access from your profile downloads page.</div>';
            }

            // Automatic premium instant redirect after 3.5 seconds delay so customer can hear success sound and see confirmation
            setTimeout(() => {
                console.log("Auto-redirecting customer to target destination...");
                window.handleSuccessDone();
            }, 3500);
        };

        // File download execution
        window.triggerDownload = async (purchaseId, actionUrl) => {
            try {
                const purchaseRef = ref(db, `artifacts/${appId}/interactions/purchases/${purchaseId}`);
                const snap = await get(purchaseRef);
                
                if (!snap.exists()) {
                    window.notify("Purchase record not found.", "error");
                    return;
                }
                
                const purchase = snap.val();
                const rem = purchase.remainingDownloads !== undefined ? purchase.remainingDownloads : purchase.quantity || 1;
                
                if (rem <= 0) {
                    window.notify("Download limit reached. Please check support.", "error");
                    return;
                }
                
                window.open(actionUrl, '_blank');
                
                const newRem = rem - 1;
                await update(purchaseRef, { remainingDownloads: newRem });
                window.notify(`Download started! ${newRem} download${newRem !== 1 ? 's' : ''} remaining.`, "success");
            } catch (err) {
                console.error("File download error:", err);
                window.notify("Download failed. Try again.", "error");
            }
        };

        // Firebase Initializers hook
        onAuthStateChanged(auth, (user) => {
            if (user && !user.isAnonymous) {
                window.state.user = user;
                
                const profileRef = ref(db, `artifacts/${appId}/users/${user.uid}/profile/data`);
                onValue(profileRef, (snap) => {
                    if (snap.exists()) window.state.userProfile = snap.val();
                }, (err) => {
                    console.warn("Profile synchronization skipped:", err);
                });

                loadCartItems(user);
            } else {
                window.state.user = null;
                window.notify("Please log in to purchase resources.", "error");
                setTimeout(() => { window.location.href = 'index.html#account'; }, 2000);
            }
        });

        // Run immediately on page load to prevent lag or crashes on slow connections
        parseUrlParams();
        fetchPromoCodesAndSettings();
        initDragAndDrop();

    