
        // showTab: onglet navigation
        window.showTab = function(name) {
            document.querySelectorAll('.tab-content').forEach(el => { el.classList.remove('active'); el.style.display = 'none'; });
            document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
            const tab = document.getElementById('tab-' + name);
            if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
            // Mark correct sidebar link as active
            document.querySelectorAll('.sidebar-link').forEach(link => {
                if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(`'${name}'`)) {
                    link.classList.add('active');
                }
            });
            // Close mobile sidebar after navigation
            closeMobileSidebar();
            // Trigger data load â€” check function exists before calling (module may not be ready yet)
            setTimeout(() => {
                if (name === 'overview'      && typeof window.loadOverview      === 'function') window.loadOverview();
                if (name === 'org'           && typeof window.loadOrg           === 'function') window.loadOrg();
                if (name === 'catalog'       && typeof window.loadCatalog       === 'function') window.loadCatalog();
                if (name === 'clients'       && typeof window.loadClients       === 'function') window.loadClients();
                if (name === 'postes'        && typeof window.loadPostesAndAff  === 'function') window.loadPostesAndAff();
                if (name === 'paie'          && typeof window.loadPaieAndConfig === 'function') window.loadPaieAndConfig();
                if (name === 'parametres'    && typeof window.loadCatalog       === 'function') { window.loadCatalog(); if(typeof window.loadMateriel==='function') window.loadMateriel(); }
                if (name === 'contrats'      && typeof window.loadContrats      === 'function') window.loadContrats();
                if (name === 'pointage'      && typeof window.loadPointages     === 'function') window.loadPointages();
                if (name === 'presences'     && typeof window.loadPresences     === 'function') window.loadPresences();
                if (name === 'materiel'      && typeof window.loadMateriel      === 'function') window.loadMateriel();
                if (name === 'conges'        && typeof window.loadConges        === 'function') window.loadConges();
                if (name === 'disciplinaire' && typeof window.loadDisciplinaire === 'function') window.loadDisciplinaire();
                if (name === 'evaluations'   && typeof window.loadEvaluations   === 'function') window.loadEvaluations();
                if (name === 'audit'         && typeof window.loadAudit         === 'function') window.loadAudit();
                if (name === 'rapports'      && typeof window.loadRapports      === 'function') window.loadRapports();
            }, 50);
        };

        // toggleNotificationsDropdown
        window.toggleNotificationsDropdown = function() {
            const dropdown = document.getElementById('notificationsDropdown');
            if (!dropdown) return;
            const isHidden = dropdown.classList.toggle('hidden');
            if (!isHidden && typeof window.loadNotifications === 'function') window.loadNotifications();
        };

        // clearAllNotifications
        window.clearAllNotifications = function() {
            const container = document.getElementById('notificationsContainer');
            if (container) container.innerHTML = '<div class="p-4 text-center text-slate-400">Aucune notification.</div>';
            const badge = document.getElementById('notificationBadge');
            if (badge) { badge.textContent = '0'; badge.classList.add('hidden'); }
            const dropdown = document.getElementById('notificationsDropdown');
            if (dropdown) dropdown.classList.add('hidden');
        };

        // Mobile sidebar
        window.toggleMobileSidebar = function() {
            const sidebar = document.querySelector('.main-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (!sidebar) return;
            sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('open');
        };
        window.closeMobileSidebar = function() {
            const sidebar = document.querySelector('.main-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('open');
        };

        // Close dropdowns when clicking outside
        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('notificationsDropdown');
            const btn = e.target.closest('[onclick*="toggleNotificationsDropdown"]');
            if (dropdown && !btn && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    
