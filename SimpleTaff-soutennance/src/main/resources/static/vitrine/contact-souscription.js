const urlParams = new URLSearchParams(window.location.search);
        const plan = urlParams.get('plan');
        if (plan) {
            document.getElementById('plan-summary-box').classList.remove('hidden');
            document.getElementById('selected-plan-name').textContent = decodeURIComponent(plan);
        }