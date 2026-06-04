// ===== Floating Coffee Bean Particles =====
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.classList.add('particle');
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (15 + Math.random() * 25) + 's';
        p.style.animationDelay = Math.random() * 20 + 's';
        p.style.width = (4 + Math.random() * 4) + 'px';
        p.style.height = (6 + Math.random() * 5) + 'px';
        container.appendChild(p);
    }
}

// ===== Scroll-triggered Animations =====
function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.dataset.delay || '0');
                setTimeout(() => entry.target.classList.add('visible'), delay);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.stat-card').forEach(el => observer.observe(el));
}

// ===== Stat Counter Animation =====
function animateCounters() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = parseInt(el.dataset.target);
            if (!target || el.dataset.counted) return;
            el.dataset.counted = 'true';

            const duration = 1500;
            const start = performance.now();

            function step(now) {
                const progress = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(eased * target).toLocaleString();
                if (progress < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        });
    }, { threshold: 0.3 });

    document.querySelectorAll('.stat-number').forEach(el => observer.observe(el));
}

// ===== Donate Amount Selection =====
function setupDonate() {
    const amounts = document.getElementById('donate-amounts');
    const customInput = document.getElementById('custom-amount');
    const btnText = document.getElementById('donate-btn-text');
    const donateBtn = document.getElementById('donate-btn');

    if (!amounts) return;

    let selectedAmount = 100;

    function updateBtnText(amount) {
        selectedAmount = amount;
        btnText.textContent = `pa-kape! - ₱${amount.toLocaleString()}`;
    }

    amounts.addEventListener('click', (e) => {
        const btn = e.target.closest('.amount-btn');
        if (!btn) return;

        amounts.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        customInput.value = '';
        updateBtnText(parseInt(btn.dataset.amount));
    });

    customInput.addEventListener('input', () => {
        const val = parseInt(customInput.value);
        if (val && val > 0) {
            amounts.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
            updateBtnText(val);
        } else {
            // Re-select default
            const defaultBtn = document.getElementById('amt-100');
            if (defaultBtn) defaultBtn.classList.add('active');
            updateBtnText(100);
        }
    });

    donateBtn.addEventListener('click', async () => {
        const msg = document.getElementById('donate-msg')?.value || '';

        // Loading state
        donateBtn.disabled = true;
        const originalText = btnText.textContent;
        btnText.textContent = 'Brewing your kape...';
        donateBtn.style.opacity = '0.7';

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: selectedAmount,
                    message: msg || undefined
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            // Redirect to PayMongo checkout
            window.location.href = data.checkout_url;

        } catch (err) {
            console.error('Checkout error:', err);
            alert(`❌ ${err.message}\n\nPlease try again or contact semariquit@gmail.com`);
            btnText.textContent = originalText;
            donateBtn.disabled = false;
            donateBtn.style.opacity = '1';
        }
    });
}

// ===== Smooth Scroll for Anchor Links =====
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ===== Handle Success/Cancel from PayMongo =====
function handlePaymentResult() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('success') === 'true') {
        // Remove query params from URL
        window.history.replaceState({}, '', '/');
        showToast('🎉 Salamat sa kape! You\'re awesome.', 'success');
    } else if (params.get('cancelled') === 'true') {
        window.history.replaceState({}, '', '/');
        showToast('No worries! Kape is always here when you\'re ready. ☕', 'info');
    }
}

function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; top: 24px; left: 50%; transform: translateX(-50%) translateY(-20px);
        padding: 16px 28px; border-radius: 12px; font-family: var(--font-sans);
        font-size: 1rem; font-weight: 600; z-index: 9999; opacity: 0;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        background: ${type === 'success' ? '#1a3a1a' : '#1a2a3a'};
        color: ${type === 'success' ? '#4ade80' : '#60a5fa'};
        border: 1px solid ${type === 'success' ? 'rgba(74,222,128,0.2)' : 'rgba(96,165,250,0.2)'};
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    setupScrollAnimations();
    animateCounters();
    setupDonate();
    setupSmoothScroll();
    handlePaymentResult();
});
