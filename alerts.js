// This hijacks the browser's ugly alert() window globally
function alert(message) {
    const modal = document.getElementById('custom-alert-modal');
    const msgEl = document.getElementById('custom-alert-message');
    const iconEl = document.getElementById('custom-alert-icon');

    if (!modal || !msgEl || !iconEl) {
        // Fallback to default if the HTML layout snippet isn't present on this specific page
        window.alert(message);
        return;
    }

    // Auto-detect matching icons
    if (message.includes('✅') || message.toLowerCase().includes('success')) {
        iconEl.textContent = '✅';
    } else if (message.includes('❌') || message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
        iconEl.textContent = '❌';
    } else {
        iconEl.textContent = '⚠️';
    }

    // Clean up template strings
    msgEl.textContent = message.replace(/[✅❌⚠️]/g, '').trim();

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.firstElementChild.classList.remove('scale-95');
        modal.firstElementChild.classList.add('scale-100');
    }, 10);
}

function closeCustomAlert() {
    const modal = document.getElementById('custom-alert-modal');
    if(modal) {
        modal.firstElementChild.classList.remove('scale-100');
        modal.firstElementChild.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 150);
    }
}
