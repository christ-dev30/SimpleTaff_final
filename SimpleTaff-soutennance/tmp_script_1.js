async function __wrapper() {
window.fallbackAvatar = function(img) {
            if (!img || img.dataset.fallbackDone) return;
            img.dataset.fallbackDone = 'true';
            const initial = img.getAttribute('data-initial') || 'A';
            const parent = img.parentElement;
            if (parent) {
                parent.innerHTML = `<span class="inline-flex w-8 h-8 rounded-full bg-slate-200 items-center justify-center text-slate-500 font-bold text-xs">${initial}</span>`;
            } else {
                img.src = '/shared/default-avatar.png';
            }
        };
}