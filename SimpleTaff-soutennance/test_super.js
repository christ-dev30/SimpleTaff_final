
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
                        <td class="px-6 py-4 text-slate-600 font-bold">${e.tauxCotisation || '5.5'} %</td>
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
                alert(`L'action "${action}" a Ã©tÃ© effectuÃ©e avec succÃ¨s.`);
                loadEntreprises();
            } catch (err) {
                alert("Erreur lors de la mise Ã  jour : " + err.message);
            }
        };

        window.deleteEntreprise = async function(id, nom) {
            if (!confirm(`ATTENTION : Voulez-vous vraiment supprimer dÃ©finitivement l'entreprise "${nom}" ? Cette action est irrÃ©versible et effacera toutes les donnÃ©es (agents, utilisateurs, pointages, factures...) de cette entreprise.`)) return;
            try {
                await apiFetch(`/superadmin/entreprises/${id}`, {
                    method: 'DELETE'
                });
                alert(`L'entreprise "${nom}" a Ã©tÃ© supprimÃ©e dÃ©finitivement.`);
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
                alert('Lien copiÃ© !');
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
                        formuleAbonnement: document.getElementById('invFormule').value,
                        tauxCotisation: parseFloat(document.getElementById('invTaux').value)
                    })
                });

                if (res) {
                    const link = `http://localhost:8080/vitrine/inscription.html?token=${res.token}`;
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

        document.addEventListener('DOMContentLoaded', () => {
            if (!checkAuth()) { window.location.href = '/vitrine/login.html'; return; }
            loadEntreprises();
        });
    
