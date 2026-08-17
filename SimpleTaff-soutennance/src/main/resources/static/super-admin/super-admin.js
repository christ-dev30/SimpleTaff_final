import { apiFetch, logout, checkAuth } from '/shared/api.js';
        window.logout = logout;
        window.apiFetch = apiFetch;

        window.showTab = function(name) {
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            document.getElementById('tab-' + name).classList.add('active');
            document.querySelectorAll('.sidebar-link').forEach(l => {
                if (l.getAttribute('onclick')?.includes("'" + name + "'")) l.classList.add('active');
            });
            if (name === 'entreprises') loadEntreprises();
        };

        window.loadEntreprises = async function() {
            const tbody = document.getElementById('entreprisesTable');
            try {
                const data = await apiFetch('/superadmin/entreprises');
                const actives = data.filter(e => e.statut === 'ACTIF' || e.statut === 'ACTIVE').length;
                const pending = data.filter(e => e.statut === 'INACTIF' || e.statut === 'SUSPENDUE').length;
                document.getElementById('statActives').textContent = actives;
                document.getElementById('statPending').textContent = pending;
                document.getElementById('statTotal').textContent = data.length;

                tbody.innerHTML = data.map(e => {
                    let statusColor = 'bg-rose-100 text-rose-700';
                    if (e.statut === 'ACTIF' || e.statut === 'ACTIVE') {
                        statusColor = 'bg-emerald-100 text-emerald-700';
                    } else if (e.statut === 'INACTIF') {
                        statusColor = 'bg-amber-100 text-amber-700';
                    } else if (e.statut === 'SUSPENDUE') {
                        statusColor = 'bg-rose-100 text-rose-700';
                    }

                    const isActif = e.statut === 'ACTIF' || e.statut === 'ACTIVE';
                    const actionBtn = isActif 
                        ? `<button onclick="toggleEntreprise('${e.id}', 'suspendre')" class="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-3 rounded-xl mr-2 transition-all shadow-sm">Suspendre</button>`
                        : `<button onclick="toggleEntreprise('${e.id}', 'activer')" class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-xl mr-2 transition-all shadow-sm">Activer</button>`;

                    const deleteBtn = `<button onclick="deleteEntreprise('${e.id}', '${e.nom}')" class="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-3 rounded-xl transition-all shadow-sm">Supprimer</button>`;

                    const initiales = (e.nom || 'ENT').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

                    return `
                    <tr class="hover:bg-slate-50/60 transition-colors">
                        <td class="px-6 py-4 flex items-center gap-3">
                            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                                ${initiales}
                            </div>
                            <div>
                                <div class="font-bold text-slate-900">${e.nom}</div>
                                <div class="text-[10px] text-slate-400">ID: ${e.id}</div>
                            </div>
                        </td>
                        <td class="px-6 py-4"><span class="badge bg-indigo-50 border border-indigo-100 text-indigo-700">${e.formuleAbonnement || 'PRO'}</span></td>
                        <td class="px-6 py-4"><span class="badge ${statusColor}">${e.statut}</span></td>
                        <td class="px-6 py-4 flex items-center">${actionBtn}${deleteBtn}</td>
                    </tr>`;
                }).join('');
            } catch (e) {
                tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-6 text-center text-red-400">${e.message}</td></tr>`;
            }
        };

        window.toggleEntreprise = async function(id, action) {
            if (!confirm(`Voulez-vous vraiment ${action} cette entreprise ?`)) return;
            try {
                await apiFetch(`/superadmin/entreprises/${id}/${action}`, {
                    method: 'PUT'
                });
                alert(`L'action "${action}" a été effectuée avec succès.`);
                loadEntreprises();
            } catch (err) {
                alert("Erreur lors de la mise à jour : " + err.message);
            }
        };

        window.deleteEntreprise = async function(id, nom) {
            if (!confirm(`ATTENTION : Voulez-vous vraiment supprimer définitivement l'entreprise "${nom}" ? Cette action est irréversible et effacera toutes les données (agents, utilisateurs, pointages, factures...) de cette entreprise.`)) return;
            try {
                await apiFetch(`/superadmin/entreprises/${id}`, {
                    method: 'DELETE'
                });
                alert(`L'entreprise "${nom}" a été supprimée définitivement.`);
                loadEntreprises();
            } catch (err) {
                alert("Erreur lors de la suppression : " + err.message);
            }
        };

        let lastToken = null;
        window.copyInviteLink = function() {
            const input = document.getElementById('inviteLinkDisplay');
            input.select();
            navigator.clipboard.writeText(input.value).then(() => {
                alert('Lien copié !');
            });
        };

        document.getElementById('inviteForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const msg = document.getElementById('inviteMsg');
            const successBox = document.getElementById('inviteSuccess');
            const btn = document.getElementById('invBtn');
            const btnText = document.getElementById('invBtnText');

            msg.className = 'hidden text-sm p-3 rounded-xl';
            successBox.classList.add('hidden');
            btnText.textContent = 'Envoi en coursâ€¦';
            btn.disabled = true;

            try {
                const res = await apiFetch('/invitations/envoyer', {
                    method: 'POST',
                    body: JSON.stringify({
                        nomEntreprise: document.getElementById('invNom').value,
                        emailDestinataire: document.getElementById('invEmail').value,
                        formuleAbonnement: document.getElementById('invFormule').value
                    })
                });

                if (res) {
                    const link = `${window.location.origin}/vitrine/inscription.html?token=${res.token}`;
                    document.getElementById('inviteLinkDisplay').value = link;
                    successBox.classList.remove('hidden');
                    document.getElementById('inviteForm').reset();
                    loadEntreprises();
                }
            } catch (err) {
                msg.textContent = err.message || "Erreur lors de l'envoi.";
                msg.className = 'text-sm p-3 rounded-xl bg-red-50 text-red-700';
            } finally {
                btnText.textContent = 'Envoyer l\'invitation';
                btn.disabled = false;
            }
        });

        window.toggleMobileSidebar = function() {
            const sidebar = document.getElementById('mainSidebar');
            const overlay = document.getElementById('sidebar-overlay');
            const hamburgerBtn = document.getElementById('hamburger-btn');
            if(sidebar) sidebar.classList.toggle('open');
            if(overlay) overlay.style.display = overlay.style.display === 'block' ? 'none' : 'block';
            // Also close sidebar on click on sidebar-links
        };

        // Add event listeners to sidebar links to close mobile sidebar on click
        document.addEventListener('DOMContentLoaded', () => {
            if (!checkAuth()) { window.location.href = '/vitrine/login.html'; return; }
            loadEntreprises();
            
            document.querySelectorAll('.sidebar-link').forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 767) {
                        const sidebar = document.getElementById('mainSidebar');
                        const overlay = document.getElementById('sidebar-overlay');
                        if (sidebar) sidebar.classList.remove('open');
                        if (overlay) overlay.style.display = 'none';
                    }
                });
            });
        });

        // Donezo Global Search
        const searchInput = document.getElementById('globalSearchInput');
        const searchDropdown = document.getElementById('globalSearchDropdown');
        const searchContainer = document.getElementById('globalSearchContainer');
        
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                const q = e.target.value.toLowerCase().trim();
                if (q.length < 2) {
                    if (searchDropdown) searchDropdown.classList.add('hidden');
                    return;
                }
                
                let results = [];
                
                // Search Agents
                if (window.agents) {
                    window.agents.forEach(a => {
                        const name = ((a.nom||'') + ' ' + (a.prenom||'')).toLowerCase();
                        if (name.includes(q) || (a.telephone||'').includes(q)) {
                            results.push({ type: 'Agent', icon: '👤', text: (a.nom||'') + ' ' + (a.prenom||''), tab: 'agents', action: () => { showTab('agents'); searchInput.value=''; searchDropdown.classList.add('hidden'); }});
                        }
                    });
                }
                
                // Search Affectations
                if (window.affectations) {
                    window.affectations.forEach(a => {
                        const name = (a.agentNom || '').toLowerCase();
                        const site = (a.siteNom || '').toLowerCase();
                        if (name.includes(q) || site.includes(q)) {
                            results.push({ type: 'Affectation', icon: '🏢', text: (a.agentNom||'') + ' - ' + (a.siteNom||''), tab: 'affectations', action: () => { showTab('affectations'); searchInput.value=''; searchDropdown.classList.add('hidden'); }});
                        }
                    });
                }

                // Search Entreprises (Super Admin)
                if (window.entreprises) {
                    window.entreprises.forEach(ent => {
                        if ((ent.nom||'').toLowerCase().includes(q)) {
                            results.push({ type: 'Entreprise', icon: '🏢', text: ent.nom, tab: 'entreprises', action: () => { showTab('entreprises'); searchInput.value=''; searchDropdown.classList.add('hidden'); }});
                        }
                    });
                }
                
                if (results.length > 0) {
                    searchContainer.innerHTML = results.slice(0, 10).map(r => `
                        <div onclick="(${r.action.toString().replace(/"/g, "'")})()" class="cursor-pointer flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">${r.icon}</div>
                            <div>
                                <p class="text-sm font-bold text-slate-800">${r.text}</p>
                                <p class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">${r.type}</p>
                            </div>
                        </div>
                    `).join('');
                    searchDropdown.classList.remove('hidden');
                } else {
                    searchContainer.innerHTML = '<div class="p-4 text-center text-slate-400 text-sm">Aucun résultat trouvé</div>';
                    searchDropdown.classList.remove('hidden');
                }
            });

            // Close on click outside
            document.addEventListener('click', (e) => {
                if (searchDropdown && !searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                    searchDropdown.classList.add('hidden');
                }
            });
            
            // Cmd+K to focus
            document.addEventListener('keydown', (e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    searchInput.focus();
                }
            });
        }
