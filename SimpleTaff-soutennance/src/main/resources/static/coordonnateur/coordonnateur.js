import { apiFetch, logout, checkAuth } from '/shared/api.js';
        window.logout = logout;

        function showTab(name) {
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            document.getElementById('tab-' + name).classList.add('active');
            document.querySelectorAll('.sidebar-link').forEach(l => {
                if (l.dataset.tab === name || l.getAttribute('onclick')?.includes("'" + name + "'")) l.classList.add('active');
            });
            if (name === 'agents') loadAgents();
            if (name === 'affectations') loadAffectations();
            if (name === 'pointages') {
                loadPointageDates();
                loadPointages();
            }
            if (name === 'zones') loadZones();
            if (name === 'materiel') loadCoordMateriel();
            if (name === 'conges') {
                loadAgentsForCongeSelect();
                loadCoordConges();
            }
            if (name === 'evaluations') loadCoordEvaluations();
            if (name === 'disciplinaire') loadCoordDisciplinaire();
            if (name === 'parametres') {
                loadCatalog();
                loadMateriel();
            }
        }
        window.showTab = showTab;

        async function loadCatalog() {
            try {
                const emplois = await apiFetch('/organisation/emplois') || [];
                const paramEmploiTbody = document.getElementById('paramEmploisTableBody');
                if (paramEmploiTbody) {
                    paramEmploiTbody.innerHTML = emplois.map(e => `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="p-3 font-bold text-slate-800">${e.libelle}</td>
                            <td class="p-3 text-slate-600 font-bold">${e.salaireBrutReference} FCFA</td>
                            <td class="p-3 text-right flex justify-end gap-2">
                                <button onclick="previewJobContractTemplate('${e.libelle}', ${e.salaireBrutReference})" class="text-xs bg-violet-50 hover:bg-violet-100 text-violet-600 px-2 py-1 rounded-lg font-bold transition-colors">
                                    <i class="fa-solid fa-file-contract"></i> Aperçu Modèle
                                </button>
                                <button onclick="deleteEmploi('${e.id}')" class="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg font-bold transition-colors">
                                    <i class="fa-solid fa-trash"></i> Supprimer
                                </button>
                            </td>
                        </tr>`).join('') || '<tr><td colspan="3" class="p-3 text-center text-slate-400">Catalogue vide.</td></tr>';
                }
            } catch (e) {
                console.error(e);
            }
        }
        window.loadCatalog = loadCatalog;

        async function loadMateriel() {
            try {
                const materiels = await apiFetch('/materiels') || [];
                const paramMaterielTbody = document.getElementById('paramMaterielTableBody');
                if (paramMaterielTbody) {
                    paramMaterielTbody.innerHTML = materiels.map(m => {
                        let statusBadge = '';
                        const st = (m.statut || '').toUpperCase();
                        if (st === 'DISPONIBLE') {
                            statusBadge = '<span class="badge bg-green-100 text-green-700 font-bold">🟢 Disponible</span>';
                        } else if (st === 'ASSIGNE' || st === 'REMIS') {
                            statusBadge = '<span class="badge bg-sky-100 text-sky-700 font-bold">🔵 Assigné</span>';
                        } else if (st === 'DEFECTUEUX' || st === 'EN_PANNE' || st === 'REPARATION') {
                            statusBadge = '<span class="badge bg-amber-100 text-amber-800 font-bold">⚠️ En Panne</span>';
                        } else {
                            statusBadge = `<span class="badge bg-slate-100 text-slate-700 font-bold">${st || '—'}</span>`;
                        }
                        const numSerie = m.numeroSerie || m.serialNumber || '—';
                        const imeiStr = m.imei ? ` / ${m.imei}` : '';
                        return `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="p-3 font-bold text-slate-800">${m.libelle || m.nom || '—'}</td>
                                <td class="p-3 text-slate-600">${m.categorie || '—'}</td>
                                <td class="p-3 font-mono text-slate-600 font-semibold">${numSerie}${imeiStr}</td>
                                <td class="p-3">${statusBadge}</td>
                                <td class="p-3 text-right">
                                    <button onclick="deleteMateriel('${m.id}')" class="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg font-bold transition-colors">
                                        <i class="fa-solid fa-trash"></i> Supprimer
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('') || '<tr><td colspan="5" class="p-3 text-center text-slate-400">Aucun matériel.</td></tr>';
                }
            } catch (e) {
                console.error(e);
            }
        }
        window.loadMateriel = loadMateriel;

        window.deleteEmploi = async function(id) {
            if (!confirm("Supprimer cet emploi ?")) return;
            try {
                await apiFetch(`/organisation/emplois/${id}`, { method: 'DELETE' });
                loadCatalog();
            } catch (e) { alert(e.message); }
        };

        window.paramCreateEmploi = async function() {
            try {
                const libelle = document.getElementById('paramEmploiLibelle').value.trim();
                const description = document.getElementById('paramEmploiDescription').value.trim();
                const categorie = document.getElementById('paramEmploiCategorie').value.trim();
                const competences = document.getElementById('paramEmploiCompetences').value.trim();
                const salaireStr = document.getElementById('paramEmploiSalaire').value;
                const salaireBrutReference = salaireStr ? parseFloat(salaireStr) : 0;

                if (!libelle) {
                    alert("Libellé requis.");
                    return;
                }

                await apiFetch('/organisation/emplois', {
                    method: 'POST',
                    body: JSON.stringify({
                        libelle,
                        description,
                        categorie,
                        competences,
                        salaireBrutReference
                    })
                });

                document.getElementById('paramEmploiLibelle').value = '';
                document.getElementById('paramEmploiDescription').value = '';
                document.getElementById('paramEmploiCategorie').value = '';
                document.getElementById('paramEmploiCompetences').value = '';
                document.getElementById('paramEmploiSalaire').value = '';

                alert("Emploi ajouté au catalogue avec succès !");
                loadCatalog();
            } catch (e) {
                alert("Erreur : " + e.message);
            }
        };

        window.paramCreateMateriel = async function() {
            try {
                const libelle = document.getElementById('paramMaterielLibelle').value.trim();
                const categorie = document.getElementById('paramMaterielCategorie').value;
                const numeroSerie = document.getElementById('paramMaterielNumeroSerie').value.trim();
                const imei = document.getElementById('paramMaterielImei').value.trim();
                const valeurAchatStr = document.getElementById('paramMaterielValeurAchat').value;
                const valeurAchat = valeurAchatStr ? parseFloat(valeurAchatStr) : 0;

                if (!libelle || !numeroSerie || !valeurAchatStr) {
                    alert("Tous les champs obligatoires sont requis.");
                    return;
                }

                await apiFetch('/materiels', {
                    method: 'POST',
                    body: JSON.stringify({
                        libelle,
                        categorie,
                        numeroSerie,
                        imei,
                        valeurAchat,
                        statut: 'DISPONIBLE'
                    })
                });

                document.getElementById('paramMaterielLibelle').value = '';
                document.getElementById('paramMaterielNumeroSerie').value = '';
                document.getElementById('paramMaterielImei').value = '';
                document.getElementById('paramMaterielValeurAchat').value = '';

                alert("Matériel ajouté au stock avec succès !");
                loadMateriel();
            } catch (e) {
                alert("Erreur : " + e.message);
            }
        };

        window.deleteMateriel = async function(id) {
            if (!confirm("Supprimer ce matériel du stock ?")) return;
            try {
                await apiFetch(`/materiels/${id}`, { method: 'DELETE' });
                alert("Matériel supprimé avec succès !");
                loadMateriel();
            } catch (e) {
                alert("Erreur lors de la suppression du matériel : " + e.message);
            }
        };

        window.allCoordAgents = [];

        function populateAgentZoneFilter() {
            const select = document.getElementById('filterAgentZoneSelect');
            if (select && select.options.length <= 1) {
                const zones = [...new Set(window.allCoordAgents.map(a => a.zoneNom).filter(Boolean))];
                select.innerHTML = '<option value="">Toutes les zones</option>' + 
                    zones.map(z => `<option value="${z}">${z}</option>`).join('');
            }
        }

        window.filterAgents = function() {
            const searchVal = document.getElementById('searchAgentInput')?.value?.toLowerCase()?.trim() || '';
            const zoneVal = document.getElementById('filterAgentZoneSelect')?.value || '';
            const tbody = document.getElementById('agentsTableBody');
            if (!tbody) return;

            const activeList = window.allCoordAgents.filter(a => a.statut !== 'EN_ATTENTE_CONTRAT_SIGNE' && a.statut !== 'EN_ATTENTE_FINALISATION_ADMIN');
            const filtered = activeList.filter(a => {
                const fullName = `${a.nom || ''} ${a.prenom || ''}`.toLowerCase();
                const matchesSearch = fullName.includes(searchVal) || 
                                     (a.matricule && a.matricule.toLowerCase().includes(searchVal)) ||
                                     (a.contact && a.contact.toLowerCase().includes(searchVal));
                
                const matchesZone = !zoneVal || a.zoneNom === zoneVal;
                return matchesSearch && matchesZone;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucun agent enregistré.</td></tr>';
                return;
            }

            tbody.innerHTML = filtered.map(a => {
                const photoUrl = a.photoUrl || '/shared/default-avatar.png';
                return `
                    <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                        <td class="p-2 text-slate-500 font-mono text-xs font-bold">${a.matricule || '—'}</td>
                        <td class="p-2">
                            <img src="${photoUrl}" data-initial="${(a.nom||'?')[0].toUpperCase()}" class="w-8 h-8 rounded-full object-cover border border-slate-200" onerror="window.fallbackAvatar(this)">
                        </td>
                        <td class="p-2 font-bold text-slate-800">${a.nom} ${a.prenom}</td>
                        <td class="p-2 text-slate-500 font-medium">${a.contact || '—'}</td>
                        <td class="p-2 text-slate-500 font-semibold">${a.zoneNom || '—'}</td>
                        <td class="p-2">
                            <div class="flex items-center gap-1.5">
                                <button onclick="zoomQr('${a.nom} ${a.prenom}', '${a.codeQr}', '${a.zoneNom}')" class="flex items-center gap-1 text-sky-600 hover:text-sky-800 font-bold text-[10px] border border-sky-200 bg-sky-50 px-2 py-0.5 rounded-lg transition-all">
                                    QR
                                </button>
                                <button onclick="generateAdminBadgePdf('${a.nom} ${a.prenom}', '${a.codeQr}', '${a.zoneNom}')" class="flex items-center gap-1 text-violet-600 hover:text-violet-800 font-bold text-[10px] border border-violet-200 bg-violet-50 px-2 py-0.5 rounded-lg transition-all">
                                    PDF
                                </button>
                                <button onclick="printAdminBadge('${a.nom} ${a.prenom}', '${a.codeQr}', '${a.zoneNom}')" class="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-bold text-[10px] border border-slate-200 bg-slate-50 px-2 py-0.5 rounded-lg transition-all">
                                    🖨️
                                </button>
                            </div>
                        </td>
                        <td class="p-2">
                            <button onclick="openAgentFolder('${a.id}')" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-2 py-1 rounded-lg text-[10px] border border-indigo-200 transition-all">
                                Voir Dossier
                            </button>
                        </td>
                        <td class="p-2">
                            <button onclick="deleteAgent('${a.id}')" class="text-red-500 hover:text-red-700 font-bold text-[10px] hover:underline transition-all">Supprimer</button>
                        </td>
                    </tr>
                `;
            }).join('');
        };

        window.renderEnrolementAgents = function(list) {
            const searchVal = document.getElementById('searchEnrolementInput')?.value?.toLowerCase()?.trim() || '';
            const filtered = list.filter(a => {
                return !searchVal || 
                    (a.nom && a.nom.toLowerCase().includes(searchVal)) ||
                    (a.prenom && a.prenom.toLowerCase().includes(searchVal)) ||
                    (a.matricule && a.matricule.toLowerCase().includes(searchVal));
            });

            const tbody = document.getElementById('enrolementAgentsTableBody');
            if (tbody) {
                tbody.innerHTML = filtered.map(a => `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="p-2 text-slate-500 font-mono text-xs">${a.matricule || '—'}</td>
                        <td class="p-2 font-bold text-slate-800">${a.nom} ${a.prenom}</td>
                        <td class="p-2 text-slate-500">${a.contact}</td>
                        <td class="p-2 text-slate-500">${a.zoneNom || '—'}</td>
                        <td class="p-2">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">En attente de finalisation par l'admin</span>
                        </td>
                        <td class="p-2 flex gap-1 items-center">
                            <span class="text-xs text-slate-400 italic">Validation admin requise</span>
                            <button onclick="deleteAgent('${a.id}')" class="text-red-500 hover:underline text-xs ml-2">Supprimer</button>
                        </td>
                    </tr>`).join('') || '<tr><td colspan="6" class="p-3 text-center text-slate-400">Aucun agent en cours d\'enrôlement.</td></tr>';
            }
        };

        window.filterEnrolementAgents = function() {
            const pendingList = window.allCoordAgents.filter(a => a.statut === 'EN_ATTENTE_CONTRAT_SIGNE' || a.statut === 'EN_ATTENTE_FINALISATION_ADMIN');
            renderEnrolementAgents(pendingList);
        };

        async function loadAgents() {
            const tbody = document.getElementById('agentsTableBody');
            try {
                const data = await apiFetch('/coordonnateur/agents');
                window.allCoordAgents = data || [];
                populateAgentZoneFilter();
                filterAgents();
                
                // Update enrolement badge and list
                const pendingList = window.allCoordAgents.filter(a => a.statut === 'EN_ATTENTE_CONTRAT_SIGNE' || a.statut === 'EN_ATTENTE_FINALISATION_ADMIN');
                const badge = document.getElementById('enrolementQueueBadge');
                if (badge) {
                    if (pendingList.length > 0) {
                        badge.textContent = pendingList.length;
                        badge.classList.remove('hidden');
                    } else {
                        badge.classList.add('hidden');
                    }
                }
                renderEnrolementAgents(pendingList);
            } catch (e) {
                if (tbody) {
                    tbody.innerHTML = `<tr><td colspan="8" class="p-3 text-center text-red-400">${e.message}</td></tr>`;
                }
            }
        }
        window.loadAgents = loadAgents;

        async function loadAffectations() {
            const tbody = document.getElementById('affectationsTable');
            try {
                const data = await apiFetch('/coordonnateur/affectations');
                window.allCoordAffectations = data || [];
                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-6 text-center text-slate-400">Aucune affectation enregistrée.</td></tr>';
                    return;
                }
                tbody.innerHTML = data.map(a => {
                    const agentNom = a.agentNom || 'Agent Inconnu';
                    const initials = agentNom.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AG';
                    const badge = (a.statut || '').toUpperCase() === 'ACTIVE' 
                        ? '<span class="badge bg-emerald-100 text-emerald-700 font-bold">🟢 Active</span>'
                        : '<span class="badge bg-slate-100 text-slate-600 font-medium">Clôturée</span>';
                    const clientName = a.structureCliente && a.structureCliente !== '—' ? a.structureCliente : 'Client Inconnu';

                    return `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="px-6 py-4 font-bold text-slate-900 flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-violet-600 text-white font-bold text-[11px] flex items-center justify-center shadow-xs">
                                    ${initials}
                                </div>
                                ${agentNom}
                            </td>
                            <td class="px-6 py-4 text-slate-700 font-semibold">${clientName} <div class="text-xs text-slate-500 font-normal">Site: ${a.siteNom || '—'}</div></td>
                            <td class="px-6 py-4 text-slate-700 font-semibold">${a.posteLibelle || '—'} <div class="text-xs text-slate-500 font-normal">Zone: ${a.zoneNom || '—'}</div></td>
                            <td class="px-6 py-4 text-slate-500 font-medium"><div class="text-emerald-600 text-[11px]">Début: ${a.dateDebut ? formatDateLabel(a.dateDebut) : '—'}</div><div class="text-rose-500 text-[11px]">Fin: ${a.dateFin && a.dateFin !== '—' ? formatDateLabel(a.dateFin) : 'Indéterminée'}</div></td>
                            <td class="px-6 py-4">${badge}</td>
                        </tr>
                    `;
                }).join('');
            } catch (e) {
                tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-6 text-center text-red-400">${e.message}</td></tr>`;
            }
        }
        window.loadAffectations = loadAffectations;

        let _coordPointages = [];

        function renderCoordPointages(data) {
            const tbody = document.getElementById('pointagesTable');
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-6 text-center text-slate-400">Aucun pointage pour cette date.</td></tr>';
                document.getElementById('statPointages').textContent = '0';
                return;
            }
            document.getElementById('statPointages').textContent = data.length;
            tbody.innerHTML = data.map(p => {
                const isEntree = (p.typePointage || '').toUpperCase() === 'ENTREE';
                const badge = isEntree 
                    ? '<span class="badge bg-emerald-100 text-emerald-700 font-bold">🟢 Entrée</span>'
                    : '<span class="badge bg-rose-100 text-rose-700 font-bold">🔴 Sortie</span>';
                const timeStr = p.dateHeure ? new Date(p.dateHeure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
                return `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="px-6 py-4 font-bold text-slate-900">${p.agentNom || '—'}</td>
                        <td class="px-6 py-4 font-medium text-slate-600">${p.structureCliente || '—'}</td>
                        <td class="px-6 py-4">${badge}</td>
                        <td class="px-6 py-4 font-mono font-bold text-slate-700">${timeStr}</td>
                        <td class="px-6 py-4 text-slate-600 font-semibold">${p.siteNom || '—'}</td>
                    </tr>
                `;
            }).join('');
        }

        window.filterCoordPointages = function() {
            const filterVal = document.getElementById('coordStructureFilter')?.value || '';
            const filtered = filterVal ? _coordPointages.filter(p => p.structureCliente === filterVal) : _coordPointages;
            renderCoordPointages(filtered);
        };

        async function loadPointages() {
            const tbody = document.getElementById('pointagesTable');
            const selectedDate = document.getElementById('coordPointageDate')?.value || new Date().toISOString().slice(0, 10);
            try {
                const data = await apiFetch(`/coordonnateur/pointages?date=${selectedDate}`);
                _coordPointages = data || [];

                const structFilter = document.getElementById('coordStructureFilter');
                if (structFilter) {
                    const structs = [...new Set(_coordPointages.map(p => p.structureCliente).filter(s => s && s !== '—'))];
                    const current = structFilter.value;
                    structFilter.innerHTML = '<option value="">Toutes les structures</option>' + structs.map(s => `<option value="${s}">${s}</option>`).join('');
                    if (structs.includes(current)) structFilter.value = current;
                }

                filterCoordPointages();
            } catch (e) {
                tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-6 text-center text-red-400">${e.message}</td></tr>`;
            }
        }
        window.loadPointages = loadPointages;

        async function loadPointageDates() {
            const container = document.getElementById('coordPointageDates');
            if (!container) return;
            try {
                const dates = await apiFetch('/coordonnateur/pointages/dates');
                if (!dates || dates.length === 0) {
                    container.innerHTML = '<span class="text-slate-400">Aucun jour enregistré pour le moment.</span>';
                    return;
                }
                const selectedDate = document.getElementById('coordPointageDate')?.value;
                container.innerHTML = dates.map(d => `
                    <button type="button" onclick="selectCoordPointageDate('${d.date}')"
                        class="px-3 py-2 rounded-xl text-xs font-bold transition-colors ${d.date === selectedDate ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 hover:bg-violet-50 hover:text-violet-700'}">
                        ${formatDateLabel(d.date)} (${d.total})
                    </button>
                `).join('');
            } catch (e) {
                container.innerHTML = `<span class="text-red-400">${e.message}</span>`;
            }
        }
        window.loadPointageDates = loadPointageDates;

        function selectCoordPointageDate(date) {
            const input = document.getElementById('coordPointageDate');
            if (input) input.value = date;
            loadPointages();
            loadPointageDates();
        }
        window.selectCoordPointageDate = selectCoordPointageDate;

        function formatDateLabel(value) {
            return value ? new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date inconnue';
        }

        async function loadZones() {
            const container = document.getElementById('zonesContainer');
            try {
                const data = await apiFetch('/coordonnateur/zones');
                if (!data || data.length === 0) {
                    container.textContent = 'Aucune zone configurée.'; return;
                }
                container.innerHTML = data.map(z => `
                    <div class="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
                        <div class="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <svg class="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                        </div>
                        <div>
                            <p class="font-bold text-slate-900 text-sm">${z.nom}</p>
                            <p class="text-xs text-slate-400 mt-0.5">${z.perimetre || z.description || '—'}</p>
                        </div>
                        <span class="ml-auto badge ${z.statut === 'ACTIF' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">${z.statut}</span>
                    </div>`).join('');
            } catch (e) {
                container.innerHTML = `<p class="text-red-400 text-sm">${e.message}</p>`;
            }
        }
        window.loadZones = loadZones;

        async function loadCoordMateriel() {
            const tbodyRequests = document.getElementById('coordMaterielRequestsTable');
            const tbodyApproved = document.getElementById('coordMaterielApprovedTable');
            const tbodyInventory = document.getElementById('coordMaterielInventoryTable');
            const countElem = document.getElementById('coordMaterielInventoryCount');

            // 1. Demandes & Historique Acceptées
            try {
                const data = await apiFetch('/materiels/demandes') || [];
                
                // Populate all demandes
                if (data.length === 0) {
                    if (tbodyRequests) tbodyRequests.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-400">Aucune demande enregistrée.</td></tr>';
                    if (tbodyApproved) tbodyApproved.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">Aucun historique d\'approbation.</td></tr>';
                } else {
                    const badgeMap = {
                        'EN_ATTENTE': 'bg-amber-100 text-amber-700 font-bold',
                        'APPROUVE': 'bg-green-100 text-green-700 font-bold',
                        'APPROUVEE': 'bg-green-100 text-green-700 font-bold',
                        'REFUSE': 'bg-red-100 text-red-700 font-bold',
                        'REJETEE': 'bg-red-100 text-red-700 font-bold'
                    };

                    // Populate all requests
                    if (tbodyRequests) {
                        tbodyRequests.innerHTML = data.map(d => {
                            const coord = d.coordonnateurNom || '—';
                            const dateDem = d.dateDemande ? d.dateDemande.replace('T', ' ').substring(0, 16) : '—';
                            const numSerie = d.numeroSerie || '—';
                            const val = d.valeurAchat != null ? `${Number(d.valeurAchat).toFixed(2)} FCFA` : '—';
                            return `
                                <tr class="hover:bg-slate-50/50 transition-colors">
                                    <td class="p-3 text-slate-600 font-semibold">${coord}</td>
                                    <td class="p-3 text-slate-500 font-mono text-[11px]">${dateDem}</td>
                                    <td class="p-3 font-bold text-slate-800">${d.libelle || '—'}</td>
                                    <td class="p-3 text-slate-500">${d.categorie || '—'}</td>
                                    <td class="p-3 font-mono text-slate-600 font-semibold">${numSerie}</td>
                                    <td class="p-3 text-slate-700 font-bold">${val}</td>
                                    <td class="p-3 text-slate-500 max-w-xs truncate" title="${d.motif || ''}">${d.motif || '—'}</td>
                                    <td class="p-3"><span class="badge ${badgeMap[d.statut] || 'bg-amber-100 text-amber-700'}">${d.statut || 'EN_ATTENTE'}</span></td>
                                </tr>
                            `;
                        }).join('');
                    }

                    // Filter and populate approved demands
                    const approvedDemands = data.filter(d => d.statut === 'APPROUVE' || d.statut === 'APPROUVEE' || d.statut === 'ACCORDE');
                    if (tbodyApproved) {
                        if (approvedDemands.length === 0) {
                            tbodyApproved.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">Aucune demande acceptée pour le moment.</td></tr>';
                        } else {
                            tbodyApproved.innerHTML = approvedDemands.map(d => {
                                const coord = d.coordonnateurNom || '—';
                                const dateDem = d.dateDemande ? d.dateDemande.replace('T', ' ').substring(0, 16) : '—';
                                const numSerie = d.numeroSerie || '—';
                                const val = d.valeurAchat != null ? `${Number(d.valeurAchat).toFixed(2)} FCFA` : '—';
                                return `
                                    <tr class="hover:bg-slate-50/50 transition-colors">
                                        <td class="p-3 text-slate-600 font-semibold">${coord}</td>
                                        <td class="p-3 text-slate-500 font-mono text-[11px]">${dateDem}</td>
                                        <td class="p-3 font-bold text-slate-800">${d.libelle || '—'}</td>
                                        <td class="p-3 text-slate-500">${d.categorie || '—'}</td>
                                        <td class="p-3 font-mono text-slate-600 font-semibold">${numSerie}</td>
                                        <td class="p-3 text-slate-700 font-bold">${val}</td>
                                        <td class="p-3"><span class="badge bg-green-100 text-green-700 font-bold">Acceptée</span></td>
                                    </tr>
                                `;
                            }).join('');
                        }
                    }
                }
            } catch (e) {
                if (tbodyRequests) tbodyRequests.innerHTML = `<tr><td colspan="8" class="p-3 text-center text-red-400">${e.message}</td></tr>`;
                if (tbodyApproved) tbodyApproved.innerHTML = `<tr><td colspan="7" class="p-3 text-center text-red-400">${e.message}</td></tr>`;
            }

            // 2. Inventaire général & Signalement d'Incidents
            try {
                const materiels = await apiFetch('/materiels') || [];
                if (countElem) countElem.textContent = `${materiels.length} matériel(s)`;
                if (tbodyInventory) {
                    if (materiels.length === 0) {
                        tbodyInventory.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">Aucun matériel dans l\'inventaire de l\'entreprise.</td></tr>';
                    } else {
                        tbodyInventory.innerHTML = materiels.map(m => {
                            let statusBadge = '';
                            const st = (m.statut || '').toUpperCase();
                            if (st === 'DISPONIBLE') {
                                statusBadge = '<span class="badge bg-green-100 text-green-700 font-bold">🟢 Disponible</span>';
                            } else if (st === 'ASSIGNE' || st === 'REMIS') {
                                statusBadge = '<span class="badge bg-sky-100 text-sky-700 font-bold">🔵 Assigné</span>';
                            } else if (st === 'DEFECTUEUX' || st === 'EN_PANNE' || st === 'REPARATION') {
                                statusBadge = '<span class="badge bg-amber-100 text-amber-800 font-bold">⚠️ En Panne / Défaut</span>';
                            } else if (st === 'INUTILISABLE') {
                                statusBadge = '<span class="badge bg-rose-100 text-rose-700 font-bold">⛔ Inutilisable</span>';
                            } else if (st === 'PERDU') {
                                statusBadge = '<span class="badge bg-purple-100 text-purple-700 font-bold">🔍 Perdu</span>';
                            } else {
                                statusBadge = `<span class="badge bg-slate-100 text-slate-700 font-bold">${st || '—'}</span>`;
                            }

                            const val = m.valeurAchat != null ? `${Number(m.valeurAchat).toFixed(2)} FCFA` : '—';
                            const numSerie = m.numeroSerie || m.serialNumber || '—';
                            const source = m.sourceAjout || 'Admin';
                            const dateAdd = m.dateAjout || '—';

                            return `
                                <tr class="hover:bg-slate-50/50 transition-colors">
                                    <td class="p-3 font-bold text-slate-800">${m.libelle || m.nom || '—'}</td>
                                    <td class="p-3 text-slate-600">${m.categorie || '—'}</td>
                                    <td class="p-3 font-mono text-slate-600 font-semibold">${numSerie}</td>
                                    <td class="p-3 text-slate-700 font-bold">${val}</td>
                                    <td class="p-3">${statusBadge}</td>
                                    <td class="p-3 text-slate-600 font-medium">${source}</td>
                                    <td class="p-3 text-slate-500 font-mono text-[11px]">${dateAdd}</td>
                                </tr>
                            `;
                        }).join('');
                    }
                }
            } catch (e) {
                if (tbodyInventory) tbodyInventory.innerHTML = `<tr><td colspan="7" class="p-3 text-center text-red-400">${e.message}</td></tr>`;
            }

            // 3. Historique d'affectation
            try {
                const historique = await apiFetch('/materiels/historique') || [];
                const tbodyHistory = document.getElementById('coordMaterielHistoryTable');
                if (tbodyHistory) {
                    tbodyHistory.innerHTML = historique.map(h => {
                        let statBadge = '';
                        if (h.dateRetour) {
                            statBadge = '<span class="badge bg-slate-100 text-slate-700 font-semibold">Rendu</span>';
                        } else {
                            statBadge = '<span class="badge bg-sky-100 text-sky-700 font-bold">En cours</span>';
                        }
                        return `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="p-3 font-semibold text-slate-700">${h.agentNom || h.agentMatricule || '—'}</td>
                                <td class="p-3 font-bold text-slate-800">${h.materielLibelle || '—'}</td>
                                <td class="p-3 font-mono text-slate-600 font-semibold">${h.materielNumeroSerie || '—'}</td>
                                <td class="p-3 text-slate-500">${h.dateRemise || '—'}</td>
                                <td class="p-3 text-slate-500">${h.dateRetour || '—'}</td>
                                <td class="p-3 text-slate-600">${h.etatRemise || 'Bon état'}</td>
                                <td class="p-3 text-slate-600">${h.etatRetour || '—'}</td>
                                <td class="p-3">${statBadge}</td>
                            </tr>
                        `;
                    }).join('') || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucun historique d\'affectation.</td></tr>';
                }
            } catch (e) {
                console.error("Erreur historique matériel:", e);
            }
        }
        window.loadCoordMateriel = loadCoordMateriel;

        window.declarerIncidentMateriel = async function(id, libelle) {
            const choixStatut = prompt(
                `Déclaration d'incident terrain pour "${libelle}" :\n\n` +
                `Tapez le numéro du type d'incident :\n` +
                `1 - DEFECTUEUX (Panne technique / Matériel défaillant)\n` +
                `2 - INUTILISABLE (Hors service / Cassé sur le terrain)\n` +
                `3 - PERDU (Matériel égaré ou non restitué par l'agent)\n`,
                "1"
            );

            if (!choixStatut) return;

            let statut = 'DEFECTUEUX';
            if (choixStatut.trim() === '2' || choixStatut.toUpperCase().includes('INUTILISABLE')) {
                statut = 'INUTILISABLE';
            } else if (choixStatut.trim() === '3' || choixStatut.toUpperCase().includes('PERDU')) {
                statut = 'PERDU';
            } else if (choixStatut.trim() === '1' || choixStatut.toUpperCase().includes('DEFECTUEUX') || choixStatut.toUpperCase().includes('PANNE')) {
                statut = 'DEFECTUEUX';
            } else {
                alert("Statut d'incident invalide.");
                return;
            }

            const details = prompt(`Motif & circonstances de l'incident terrain (ex: Écran fendu lors de l'intervention, radio égarée par l'agent X) :`, "");
            if (details === null) return;

            try {
                await apiFetch(`/materiels/${id}/incident`, {
                    method: 'POST',
                    body: JSON.stringify({ statut, details: details || '' })
                });

                alert(`Incident enregistré (${statut}) ! L'état du matériel a été mis à jour et l'alerte a été transmise à la direction.`);
                loadCoordMateriel();
            } catch (e) {
                console.error(e);
                alert("Erreur lors de la déclaration de l'incident: " + (e.message || e));
            }
        };

        async function loadAgentsForCongeSelect() {
            const select = document.getElementById('reqCongeAgentSelect');
            if (!select) return;
            try {
                const agents = await apiFetch('/coordonnateur/agents');
                select.innerHTML = '<option value="">Sélectionner l\'agent...</option>' + 
                    agents.map(a => `<option value="${a.id}">${a.nom} ${a.prenom}</option>`).join('');
            } catch(e) {
                console.error("Erreur chargement agents pour select", e);
            }
        }
        window.loadAgentsForCongeSelect = loadAgentsForCongeSelect;

        async function loadCoordConges() {
            const tbody = document.getElementById('coordCongesRequestsTable');
            try {
                const data = await apiFetch('/conges');
                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-400">Aucune demande enregistrée.</td></tr>';
                    return;
                }
                const badgeMap = {
                    'EN_ATTENTE_RH': 'bg-amber-100 text-amber-700',
                    'EN_ATTENTE_SUPERVISEUR': 'bg-sky-100 text-sky-700',
                    'VALIDEE': 'bg-green-100 text-green-700',
                    'REFUSEE': 'bg-red-100 text-red-700'
                };
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                tbody.innerHTML = data.map(d => {
                    const isExpired = d.dateFin && new Date(d.dateFin) < today;
                    let statBadge = '';
                    if (isExpired) {
                        statBadge = '<span class="badge bg-green-100 text-green-700 font-bold">Terminé</span>';
                    } else {
                        statBadge = `<span class="badge ${badgeMap[d.statut] || 'bg-slate-100 text-slate-500'}">${d.statut}</span>`;
                    }
                    const justifCell = d.justifUrl 
                        ? `<a href="${d.justifUrl}" target="_blank" class="text-sky-600 hover:underline font-bold text-[10px] flex items-center gap-1"><i class="fa-solid fa-file text-sky-400"></i> Voir doc</a>`
                        : `<span class="text-slate-300 text-xs">—</span>`;

                    return `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="p-3 font-bold text-slate-800">${d.agent ? (d.agent.nom + ' ' + d.agent.prenom) : '—'}</td>
                        <td class="p-3 text-slate-500">${d.type}</td>
                        <td class="p-3 text-slate-500">Du ${d.dateDebut} au ${d.dateFin}</td>
                        <td class="p-3">${statBadge}</td>
                        <td class="p-3">${justifCell}</td>
                    </tr>`;
                }).join('');
            } catch (e) {
                tbody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-red-400">${e.message}</td></tr>`;
            }
        }
        window.loadCoordConges = loadCoordConges;

        async function loadOverview() {
            // 1. Stats
            try {
                const stats = await apiFetch('/coordonnateur/stats');
                if (stats) {
                    document.getElementById('statAgentsCoord').textContent = stats.agentsSurSite ?? '—';
                    document.getElementById('statAffectations').textContent = stats.absencesRetards ?? '—';
                    document.getElementById('statPointages').textContent = stats.demandesMateriel ?? '—';
                    const statDemandes = document.getElementById('statDemandesMateriel');
                    if(statDemandes) statDemandes.textContent = stats.rapportsIncidents ?? '—';
                    
                    // Render Zones Coverage Chart
                    const chartContainer = document.getElementById('zoneCoverageChartContainer');
                    const labelsContainer = document.getElementById('zoneCoverageLabels');
                    if (chartContainer && labelsContainer && stats.zonesCoverage) {
                        chartContainer.innerHTML = '';
                        labelsContainer.innerHTML = '';
                        if (stats.zonesCoverage.length === 0) {
                            chartContainer.innerHTML = '<div class="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Aucune donnée</div>';
                        } else {
                            stats.zonesCoverage.forEach(zc => {
                                const heightPercent = Math.max(10, Math.min(100, zc.pourcentage));
                                const bgColor = zc.pourcentage >= 80 ? 'bg-[#12312E]' : (zc.pourcentage >= 50 ? 'bg-[#A3D977]' : 'bg-rose-400');
                                
                                // Bar
                                const barDiv = document.createElement('div');
                                barDiv.className = `w-full ${bgColor} rounded-full relative transition-all duration-500`;
                                barDiv.style.height = `${heightPercent}%`;
                                barDiv.innerHTML = `
                                    <div class="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 whitespace-nowrap">
                                        ${zc.pourcentage}%
                                    </div>
                                `;
                                chartContainer.appendChild(barDiv);
                                
                                // Label
                                const labelSpan = document.createElement('span');
                                labelSpan.className = "truncate w-full text-center px-1";
                                labelSpan.title = zc.zone;
                                labelSpan.textContent = zc.zone.substring(0, 3);
                                labelsContainer.appendChild(labelSpan);
                            });
                        }
                    }
                }
            } catch(e) {
                console.error('Stats coordonnateur non disponibles', e);
            }

            // 2. Dashboard List 1: Pointages aujourd'hui
            const tbodyPtRec = document.getElementById('pointagesRecentsDashboardTable');
            const todayStr = new Date().toISOString().slice(0, 10);
            let todayPointagesList = [];
            try {
                todayPointagesList = await apiFetch(`/coordonnateur/pointages?date=${todayStr}`) || [];
                if (tbodyPtRec) {
                    if (todayPointagesList.length === 0) {
                        tbodyPtRec.innerHTML = '<tr><td colspan="4" class="px-6 py-6 text-center text-slate-400 font-medium">Aucun pointage enregistré aujourd\'hui.</td></tr>';
                    } else {
                        tbodyPtRec.innerHTML = todayPointagesList.slice(0, 6).map(p => {
                            const isEntree = (p.typePointage || '').toUpperCase() === 'ENTREE';
                            const badge = isEntree 
                                ? '<span class="badge bg-emerald-100 text-emerald-700 font-bold">🟢 Entrée</span>'
                                : '<span class="badge bg-rose-100 text-rose-700 font-bold">🔴 Sortie</span>';
                            const timeStr = p.dateHeure ? new Date(p.dateHeure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
                            
                            return `
                                <tr class="hover:bg-slate-50/70 transition-colors border-b border-slate-100/60">
                                    <td class="px-4 py-3.5 font-bold text-slate-900 text-xs">${p.agentNom || '—'}</td>
                                    <td class="px-4 py-3.5">${badge}</td>
                                    <td class="px-4 py-3.5 font-mono text-slate-700 font-bold text-xs">${timeStr}</td>
                                    <td class="px-4 py-3.5 text-right font-semibold text-slate-600">${p.siteNom || '—'}</td>
                                </tr>
                            `;
                        }).join('');
                    }
                }
            } catch(e) {
                if (tbodyPtRec) tbodyPtRec.innerHTML = `<tr><td colspan="4" class="px-6 py-6 text-center text-red-400">${e.message}</td></tr>`;
            }

            // 3. Dashboard List 2: Agents Actuellement sur Site (Affectations + Pointages)
            const tbodyAffRec = document.getElementById('affectationsRecentesTable');
            try {
                const affectations = await apiFetch('/coordonnateur/affectations') || [];
                if (tbodyAffRec) {
                    const activeAffectations = affectations.filter(a => (a.statut || '').toUpperCase() === 'ACTIVE');
                    if (activeAffectations.length === 0) {
                        tbodyAffRec.innerHTML = '<tr><td colspan="4" class="px-6 py-6 text-center text-slate-400 font-medium">Aucun agent actuellement assigné.</td></tr>';
                    } else {
                        tbodyAffRec.innerHTML = activeAffectations.slice(0, 6).map(a => {
                            const agentNom = a.agentNom || 'Agent Inconnu';
                            const initials = agentNom.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AG';
                            const clientName = a.structureCliente && a.structureCliente !== '—' ? a.structureCliente : 'Client Inconnu';
                            
                            // Check if agent clocked in today
                            const pointageAjd = todayPointagesList.find(p => p.agentNom === agentNom);
                            let statusBadge = '<span class="badge bg-slate-100 text-slate-600 font-medium">Non pointé</span>';
                            let timeInfo = '<div class="text-slate-500 text-[10px]">En attente de prise de poste</div>';
                            
                            if (pointageAjd) {
                                if ((pointageAjd.typePointage || '').toUpperCase() === 'ENTREE') {
                                    statusBadge = '<span class="badge bg-emerald-100 text-emerald-700 font-bold">🟢 Sur Site</span>';
                                    timeInfo = `<div class="text-emerald-600 text-[10px]">Arrivée: ${new Date(pointageAjd.dateHeureEntree || pointageAjd.dateHeure).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</div>`;
                                } else {
                                    statusBadge = '<span class="badge bg-rose-100 text-rose-700 font-bold">🔴 Fin de service</span>';
                                    timeInfo = `<div class="text-rose-500 text-[10px]">Départ: ${new Date(pointageAjd.dateHeureSortie || pointageAjd.dateHeure).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</div>`;
                                }
                            }

                            return `
                                <tr class="hover:bg-slate-50/70 transition-colors border-b border-slate-100/60">
                                    <td class="px-5 py-3.5">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-full bg-violet-600 text-white font-bold text-[11px] flex items-center justify-center shadow-xs">
                                                ${initials}
                                            </div>
                                            <div>
                                                <p class="font-bold text-slate-900 text-xs">${agentNom}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-5 py-3.5 text-slate-700 font-semibold">${clientName} <div class="font-normal text-[10px] text-slate-500">Site: ${a.siteNom || '—'}</div></td>
                                    <td class="px-5 py-3.5 text-slate-700 font-semibold">${a.posteLibelle || '—'} <div class="font-normal text-[10px] text-slate-500">Zone: ${a.zoneNom || '—'}</div></td>
                                    <td class="px-5 py-3.5 font-medium">${timeInfo}</td>
                                    <td class="px-5 py-3.5 text-right">${statusBadge}</td>
                                </tr>
                            `;
                        }).join('');
                    }
                }
            } catch (e) {
                if (tbodyAffRec) tbodyAffRec.innerHTML = `<tr><td colspan="4" class="px-6 py-6 text-center text-red-400">${e.message}</td></tr>`;
            }
        }
        window.loadOverview = loadOverview;

        document.addEventListener('DOMContentLoaded', () => {
            if (!checkAuth()) { window.location.href = '/vitrine/login.html'; return; }
            document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
                link.addEventListener('click', () => showTab(link.dataset.tab));
            });
            const pointageDate = document.getElementById('coordPointageDate');
            if (pointageDate) {
                pointageDate.value = new Date().toISOString().slice(0, 10);
                pointageDate.addEventListener('change', () => {
                    loadPointages();
                    loadPointageDates();
                });
            }
            loadOverview();

            // Material Request form submission
            const addMaterielRequestForm = document.getElementById('addMaterielRequestForm');
            if (addMaterielRequestForm) {
                addMaterielRequestForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Envoi...';
                    try {
                        const libelle = document.getElementById('reqMaterielLibelle').value.trim();
                        const categorie = document.getElementById('reqMaterielCategorie').value;
                        const numeroSerie = document.getElementById('reqMaterielNumeroSerie')?.value?.trim();
                        const valeurAchatStr = document.getElementById('reqMaterielValeur')?.value;
                        const valeurAchat = valeurAchatStr ? parseFloat(valeurAchatStr) : null;
                        const motif = document.getElementById('reqMaterielMotif').value.trim();

                        await apiFetch('/materiels/demandes', {
                            method: 'POST',
                            body: JSON.stringify({
                                libelle,
                                categorie,
                                numeroSerie,
                                valeurAchat,
                                motif
                            })
                        });
                        addMaterielRequestForm.reset();
                        alert("Demande de matériel transmise à l'Administration !");
                        loadCoordMateriel();
                    } catch (err) {
                        alert(err.message);
                    } finally {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Transmettre à l\'Administration';
                    }
                });
            }

            // Conge Request form submission
            const addCongeRequestForm = document.getElementById('addCongeRequestForm');
            if (addCongeRequestForm) {
                addCongeRequestForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Envoi...';
                    try {
                        // Upload justificatif if provided
                        const justifFile = document.getElementById('reqCongeJustifFile')?.files?.[0];
                        let justificatifUrl = null;
                        if (justifFile) {
                            const fd = new FormData();
                            fd.append('file', justifFile);
                            const up = await fetch('/api/agents/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: fd });
                            const upData = await up.json();
                            justificatifUrl = upData.url || upData.fileUrl || null;
                            const status = document.getElementById('reqCongeJustifStatus');
                            if (status) status.textContent = justifFile.name + ' — envoyé ✔';
                        }
                        await apiFetch('/conges', {
                            method: 'POST',
                            body: JSON.stringify({
                                agentId: document.getElementById('reqCongeAgentSelect').value,
                                type: document.getElementById('reqCongeType').value,
                                dateDebut: document.getElementById('reqCongeDateDebut').value,
                                dateFin: document.getElementById('reqCongeDateFin').value,
                                motif: document.getElementById('reqCongeMotif').value,
                                justificatifUrl
                            })
                        });
                        addCongeRequestForm.reset();
                        document.getElementById('reqCongeJustifUrl').value = '';
                        document.getElementById('reqCongeJustifStatus').textContent = 'Optionnel — certificat médical, justification officielle...';
                        alert("Demande de congé soumise avec succès !");
                        loadCoordConges();
                    } catch (err) {
                        alert(err.message);
                    } finally {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Soumettre la demande';
                    }
                });
            }
            if (typeof initAgentModernModules === 'function') initAgentModernModules();
            loadOverview();
        });

        // ── Évaluations (read-only) ────────────────────────────────────
        async function loadCoordEvaluations() {
            const tbody = document.getElementById('coordEvaluationsTable');
            try {
                const evals = await apiFetch('/evaluations');
                window.allCoordEvals = evals || [];
                renderCoordEvaluations(window.allCoordEvals);
            } catch (err) {
                console.error(err);
                if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-red-500">Erreur de chargement des évaluations</td></tr>';
            }
        }
        window.loadCoordEvaluations = loadCoordEvaluations;

        function renderCoordEvaluations(list) {
            const tbody = document.getElementById('coordEvaluationsTable');
            if (!tbody) return;
            if (!list || list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-center text-slate-400">Aucune évaluation enregistrée.</td></tr>';
                return;
            }
            tbody.innerHTML = list.map(ev => {
                const agentNom = ev.agent ? (ev.agent.nom || 'N/A') : 'N/A';
                const dateEval = ev.dateEvaluation || '—';
                const structure = ev.structureCliente || '—';
                return `
                    <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                        <td class="p-3 font-bold text-slate-900">${agentNom}</td>
                        <td class="p-3 text-slate-600">${structure}</td>
                        <td class="p-3">${ev.annee}</td>
                        <td class="p-3 text-slate-500">${dateEval}</td>
                        <td class="p-3 font-bold text-violet-600">${ev.scoreTotal || 0} / 80</td>
                        <td class="p-3 text-slate-500 max-w-xs truncate" title="${ev.commentaire || ''}">${ev.commentaire || '—'}</td>
                    </tr>
                `;
            }).join('');
        }

        window.filterEvaluationsCoord = function() {
            const query = document.getElementById('searchEvaluationsCoord')?.value?.toLowerCase() || '';
            if (!window.allCoordEvals) return;
            renderCoordEvaluations(window.allCoordEvals.filter(ev => {
                const nom = ev.agent ? (ev.agent.nom || '') : '';
                return nom.toLowerCase().includes(query);
            }));
        };

        // ── Disciplinaire (read-only) ──────────────────────────────────
        async function loadCoordDisciplinaire() {
            const tbody = document.getElementById('coordSanctionsTable');
            try {
                const sanctions = await apiFetch('/disciplinaire/sanctions');
                window.allCoordSanctions = sanctions || [];
                renderCoordSanctions(window.allCoordSanctions);
            } catch (err) {
                console.error(err);
                if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-center text-red-500">Erreur de chargement des sanctions</td></tr>';
            }
        }
        window.loadCoordDisciplinaire = loadCoordDisciplinaire;

        function renderCoordSanctions(list) {
            const tbody = document.getElementById('coordSanctionsTable');
            if (!tbody) return;
            if (!list || list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="p-3 text-center text-slate-400">Aucune sanction enregistrée.</td></tr>';
                return;
            }
            tbody.innerHTML = list.map(s => {
                const agentNom = s.agent ? (s.agent.nom || 'N/A') : 'N/A';
                const structure = s.structureCliente || s.clientFinal || '—';
                const badgeClass = s.statut === 'EN_COURS' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';
                return `
                    <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                        <td class="p-3 font-bold text-slate-900">${agentNom}</td>
                        <td class="p-3 text-slate-600">${structure}</td>
                        <td class="p-3 font-medium text-slate-700">${s.type}</td>
                        <td class="p-3 text-slate-500">${s.dateDecision}</td>
                        <td class="p-3 text-slate-500">${s.dateFin || '—'}</td>
                        <td class="p-3 text-slate-500 max-w-xs truncate" title="${s.motif || ''}">${s.motif || '—'}</td>
                        <td class="p-3"><span class="badge ${badgeClass}">${s.statut}</span></td>
                    </tr>
                `;
            }).join('');
        }

        window.filterSanctionsCoord = function() {
            const query = document.getElementById('searchSanctionsCoord')?.value?.toLowerCase() || '';
            if (!window.allCoordSanctions) return;
            renderCoordSanctions(window.allCoordSanctions.filter(s => {
                const nom = s.agent ? (s.agent.nom || '') : '';
                return nom.toLowerCase().includes(query);
            }));
        };

        // ─── Modal Ajouter Agent Tab Toggling & Submission ──────────────
        window.openAddAgentModal = function() {
            document.getElementById('addAgentModal').classList.remove('hidden');
            switchAddAgentTab('identite');
            loadModalZones();
            resetAddAgentModal();
            window.agentCreationIdempotencyKey = crypto.randomUUID();
            window.contractCreationIdempotencyKey = crypto.randomUUID();
        };

        window.closeAddAgentModal = function() {
            document.getElementById('addAgentModal').classList.add('hidden');
        };

        window.updateAgentRecapTab4 = function() {
            const recapDiv = document.getElementById('mAgentRecapContainer');
            if (!recapDiv) return;

            const nom = document.getElementById('mAgentNom').value || '—';
            const prenom = document.getElementById('mAgentPrenom').value || '—';
            const genre = document.getElementById('mAgentGenre').value || '—';
            const dateNais = document.getElementById('mAgentDateNaissance').value || '—';
            const lieuNais = document.getElementById('mAgentLieuNaissance').value || '—';
            const nationalite = document.getElementById('mAgentNationalite').value || '—';
            const contact = document.getElementById('mAgentContact').value || '—';
            const ville = document.getElementById('mAgentVille').value || '—';
            const commune = document.getElementById('mAgentCommune').value || '—';

            recapDiv.innerHTML = `
                <div class="bg-sky-50/50 p-4 rounded-2xl border border-sky-100/50 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-4">
                    <div><span class="text-slate-400 block">Nom & Prénoms :</span><strong class="text-slate-800">${nom} ${prenom}</strong></div>
                    <div><span class="text-slate-400 block">Genre / Naissance :</span><strong class="text-slate-800">${genre === 'M' ? 'Masculin' : (genre === 'F' ? 'Féminin' : '—')} (${dateNais} à ${lieuNais})</strong></div>
                    <div><span class="text-slate-400 block">Nationalité :</span><strong class="text-slate-800">${nationalite}</strong></div>
                    <div><span class="text-slate-400 block">Contact Téléphonique :</span><strong class="text-slate-800">${contact}</strong></div>
                    <div><span class="text-slate-400 block">Localisation :</span><strong class="text-slate-800">${ville} - ${commune}</strong></div>
                </div>
            `;
        };

        window.switchAddAgentTab = async function(tabName) {
            const tabs = ['identite', 'coordonnees', 'pieces', 'contrat'];
            tabs.forEach(t => {
                const btn = document.getElementById(`tabBtn-${t}`);
                const content = document.getElementById(`agentTab-${t}`);
                if (!btn || !content) return;
                if (t === tabName) {
                    btn.classList.add('shadow-sm', 'bg-white', 'text-indigo-700', 'ring-1', 'ring-slate-200', 'font-bold');
                    btn.classList.remove('text-slate-500', 'hover:text-slate-700', 'hover:bg-slate-200/50', 'font-medium');
                    content.classList.remove('hidden');
                } else {
                    btn.classList.remove('shadow-sm', 'bg-white', 'text-indigo-700', 'ring-1', 'ring-slate-200', 'font-bold');
                    btn.classList.add('text-slate-500', 'hover:text-slate-700', 'hover:bg-slate-200/50', 'font-medium');
                    content.classList.add('hidden');
                }
            });
            if (tabName === 'contrat') {
                await loadModalEmploisCatalog();
                updateAgentRecapTab4();
                updateContractPreview();
            }
        };

        async function loadModalZones() {
            try {
                const zones = await apiFetch('/coordonnateur/zones');
                const select = document.getElementById('mAgentZoneSelect');
                if (select) {
                    select.innerHTML = '<option value="">Sélectionner la zone...</option>' +
                        zones.map(z => `<option value="${z.id}">${z.nom}</option>`).join('');
                }
            } catch (err) {
                console.error("Erreur chargement zones modal:", err);
            }
        }

        window.switchPersonnelSubTab = function(tab) {
            const btnActifs = document.getElementById('subTabBtn-agents-actifs');
            const btnEnrol = document.getElementById('subTabBtn-agents-enrolement');
            const secActifs = document.getElementById('agentsActifsSection');
            const secEnrol = document.getElementById('agentsEnrolementSection');
            if (!btnActifs || !btnEnrol || !secActifs || !secEnrol) return;

            if (tab === 'actifs') {
                btnActifs.className = "pb-2 border-b-2 border-sky-600 text-sky-600 font-bold";
                btnEnrol.className = "pb-2 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-1.5";
                secActifs.classList.remove('hidden');
                secEnrol.classList.add('hidden');
            } else {
                btnActifs.className = "pb-2 border-b-2 border-transparent text-slate-500 hover:text-slate-800";
                btnEnrol.className = "pb-2 border-b-2 border-sky-600 text-sky-600 font-bold flex items-center gap-1.5";
                secActifs.classList.add('hidden');
                secEnrol.classList.remove('hidden');
            }
        };

        window.openFinalizeEnrollmentModal = async function(agentId) {
            document.getElementById('feAgentId').value = agentId;
            document.getElementById('feDateDebut').value = new Date().toISOString().split('T')[0];
            document.getElementById('feHeureArrivee').value = "08:00";
            document.getElementById('feHeureDepart').value = "18:00";
            document.getElementById('feContratFile').value = "";
            document.getElementById('feContratUrl').value = "";
            document.getElementById('feContratStatus').textContent = "";

            try {
                const sites = await apiFetch('/organisation/sites');
                const feSiteSelect = document.getElementById('feSiteSelect');
                if (feSiteSelect) {
                    feSiteSelect.innerHTML = '<option value="">Ne pas affecter immédiatement</option>' +
                        sites.map(s => `<option value="${s.id}">${s.nom} (${s.structureNom})</option>`).join('');
                }
            } catch (e) {
                console.error("Erreur de chargement des sites :", e);
            }

            document.getElementById('finalizeEnrollmentModal').classList.remove('hidden');
        };

        window.closeFinalizeEnrollmentModal = function() {
            document.getElementById('finalizeEnrollmentModal').classList.add('hidden');
        };

        window.loadModalEmploisCatalog = async function() {
            try {
                const emplois = await apiFetch('/organisation/emplois') || [];
                const select = document.getElementById('mAgentEmploiSelect');
                if (select) {
                    const currentVal = select.value;
                    select.innerHTML = '<option value="">Choisir un emploi...</option>' +
                        emplois.map(e => `<option value="${e.id}" data-salaire="${e.salaireBrutReference}" data-libelle="${e.libelle}">${e.libelle} (${e.salaireBrutReference} FCFA)</option>`).join('');
                    if (currentVal) {
                        select.value = currentVal;
                    }
                }
            } catch (e) {
                console.error("Erreur chargement catalogue emplois :", e);
            }
        };

        window.updateContractPreview = function() {
            const select = document.getElementById('mAgentEmploiSelect');
            const type = document.getElementById('mAgentContratType').value;
            const previewCard = document.getElementById('mAgentContratBulle');
            const previewText = document.getElementById('mAgentContratText');

            if (!select || !select.value) {
                if (previewCard) previewCard.classList.add('hidden');
                return;
            }

            const opt = select.options[select.selectedIndex];
            const libelle = opt.getAttribute('data-libelle');
            const salaire = opt.getAttribute('data-salaire');
            const nom = document.getElementById('mAgentNom').value || '[NOM]';
            const prenom = document.getElementById('mAgentPrenom').value || '[PRENOM]';
            const dateNaissance = document.getElementById('mAgentDateNaissance').value ? new Date(document.getElementById('mAgentDateNaissance').value).toLocaleDateString('fr-FR') : '[DATE DE NAISSANCE]';
            const lieuNaissance = document.getElementById('mAgentLieuNaissance').value || '[LIEU DE NAISSANCE]';
            const nationalite = document.getElementById('mAgentNationalite').value || '[NATIONALITÉ]';
            const adresse = document.getElementById('mAgentAdresse').value || '[ADRESSE]';
            const ville = document.getElementById('mAgentVille').value || '[VILLE]';
            const commune = document.getElementById('mAgentCommune').value || '[COMMUNE]';

            const text = `CONTRAT DE TRAVAIL DE DROIT IVOIRIEN (${type})

ENTRE LES SOUSSIGNÉS :
L'entreprise de sécurité privée, représentée par son Administrateur, ci-après dénommée "L'EMPLOYEUR", d'une part,

ET :
M./Mme ${nom} ${prenom}, né(e) le ${dateNaissance} à ${lieuNaissance}, de nationalité ${nationalite}, résidant à ${adresse}, ci-après dénommé(e) "L'EMPLOYÉ(E)", d'autre part.

Il a été convenu et arrêté ce qui suit, conformément au Code du Travail de Côte d'Ivoire (Loi n° 2015-532) et à la Convention Collective Interprofessionnelle :

ARTICLE 1 : OBJET ET QUALIFICATION
L'Employé(e) est engagé(e) en qualité de "${libelle}" sous le régime du contrat de type ${type}. Il/Elle exercera ses fonctions principalement à ${ville} / ${commune} ou sur tout autre site d'affectation de l'entreprise.

ARTICLE 2 : DURÉE DU CONTRAT ET PÉRIODE D'ESSAI
Le présent contrat est conclu pour une durée ${type === 'CDD' ? 'déterminée correspondant à la mission confiée' : 'indéterminée'}.
Une période d'essai de ${type === 'CDD' ? '15 jours' : '1 mois'} est convenue, durant laquelle chaque partie peut rompre le contrat sans préavis ni indemnité.

ARTICLE 3 : REMUNERATION
En contrepartie de l'exécution de ses tâches, l'Employé(e) percevra un salaire de base mensuel brut de ${salaire} F CFA. À cette rémunération s'ajoutent les indemnités légales en vigueur en Côte d'Ivoire, notamment la prime de transport obligatoire.

ARTICLE 4 : DURÉE DU TRAVAIL
La durée hebdomadaire du travail est fixée conformément à la législation ivoirienne en vigueur, soit 40 heures par semaine. Les heures supplémentaires seront rémunérées selon les taux légaux.

ARTICLE 5 : CONGÉS ANNUELS
L'Employé(e) bénéficie d'un congé annuel payé au taux de 2,2 jours ouvrables par mois de service effectif, conformément au Code du Travail ivoirien.

ARTICLE 6 : RÉSILIATION
En dehors de la période d'essai, la résiliation du présent contrat s'effectuera conformément aux dispositions légales du Code du Travail de Côte d'Ivoire.

Fait de bonne foi à Abidjan, le ${new Date().toLocaleDateString('fr-FR')}

Pour l'Employeur                               L'Employé(e)
(Signature précédée de la                     (Signature précédée de la
mention "Lu et approuvé")                     mention "Lu et approuvé")`;

            if (previewText) previewText.textContent = text;
            if (previewCard) previewCard.classList.remove('hidden');
        };

        window.updateFolderContractPreview = function() {
            const agent = window.currentFolderAgentObj;
            if (!agent) return;

            const type = document.getElementById('fcType').value;
            const salaire = document.getElementById('fcSalaireBase').value || '[SALAIRE DE BASE]';
            const jobId = document.getElementById('fcFonctionSelect').value;
            const job = window.folderContractJobs.find(j => j.id == jobId);
            const libelle = job ? job.libelle : '[FONCTION]';
            
            const dateDebutInput = document.getElementById('fcDateDebut').value;
            const dateDebut = dateDebutInput ? new Date(dateDebutInput).toLocaleDateString('fr-FR') : '[DATE DÉBUT]';
            const dateFinInput = document.getElementById('fcDateFin').value;
            const dateFin = dateFinInput ? new Date(dateFinInput).toLocaleDateString('fr-FR') : null;

            const structureSelect = document.getElementById('fcStructureCliente');
            const structureName = structureSelect && structureSelect.selectedIndex > 0 ? structureSelect.options[structureSelect.selectedIndex].text : '[STRUCTURE CLIENTE]';

            const previewCard = document.getElementById('fcContractBulle');
            const previewText = document.getElementById('fcContractText');

            const nom = agent.nom || '[NOM]';
            const prenom = agent.prenom || '[PRENOM]';
            const dateNaissance = agent.dateNaissance ? new Date(agent.dateNaissance).toLocaleDateString('fr-FR') : '[DATE DE NAISSANCE]';
            const lieuNaissance = agent.lieuNaissance || '[LIEU DE NAISSANCE]';
            const nationalite = agent.nationalite || '[NATIONALITÉ]';
            const adresse = agent.adresse || '[ADRESSE]';
            const ville = agent.ville || '[VILLE]';
            const commune = agent.commune || '[COMMUNE]';

            let dateFinText = '';
            if (type === 'CDD') {
                dateFinText = dateFin ? ` jusqu'au ${dateFin}` : ' (durée déterminée)';
            }

            const text = `CONTRAT DE PLACEMENT ET DE TRAVAIL DE DROIT IVOIRIEN (${type})

ENTRE LES SOUSSIGNÉS :
L'entreprise de sécurité privée SimpleTaff, représentée par son Administrateur, ci-après dénommée "L'EMPLOYEUR", d'une part,

ET :
M./Mme ${nom} ${prenom}, né(e) le ${dateNaissance} à ${lieuNaissance}, de nationalité ${nationalite}, résidant à ${adresse}, ci-après dénommé(e) "L'EMPLOYÉ(E)", d'autre part.

Il a été convenu et arrêté ce qui suit, conformément au Code du Travail de Côte d'Ivoire (Loi n° 2015-532) et à la Convention Collective Interprofessionnelle :

ARTICLE 1 : OBJET ET QUALIFICATION
L'Employé(e) est engagé(e) en qualité de "${libelle}" sous le régime du contrat de type ${type}. Il/Elle exercera ses fonctions principalement au sein de la structure cliente "${structureName}" située à ${ville} / ${commune} ou sur tout autre site d'affectation désigné par l'entreprise.

ARTICLE 2 : DURÉE DU CONTRAT ET PÉRIODE D'ESSAI
Le présent contrat prend effet le ${dateDebut}${dateFinText}.
Une période d'essai de ${type === 'CDD' ? '15 jours' : '1 mois'} est convenue, durant laquelle chaque partie peut rompre le contrat sans préavis ni indemnité.

ARTICLE 3 : REMUNERATION
En contrepartie de l'exécution de ses tâches, l'Employé(e) percevra un salaire de base mensuel brut de ${salaire} F CFA. À cette rémunération s'ajoutent les indemnités légales en vigueur en Côte d'Ivoire, notamment la prime de transport obligatoire.

ARTICLE 4 : DURÉE DU TRAVAIL
La durée hebdomadaire du travail est fixée conformément à la législation ivoirienne en vigueur, soit 40 heures par semaine. Les heures supplémentaires seront rémunérées selon les taux légaux.

ARTICLE 5 : CONGÉS ANNUELS
L'Employé(e) bénéficie d'un congé annuel payé au taux de 2,2 jours ouvrables par mois de service effectif, conformément au Code du Travail ivoirien.

ARTICLE 6 : RÉSILIATION
En dehors de la période d'essai, la résiliation du présent contrat s'effectuera conformément aux dispositions légales du Code du Travail de Côte d'Ivoire.

Fait de bonne foi à Abidjan, le ${new Date().toLocaleDateString('fr-FR')}

Pour l'Employeur                               L'Employé(e)
(Signature précédée de la                     (Signature précédée de la
mention "Lu et approuvé")                     mention "Lu et approuvé")`;

            if (previewText) previewText.textContent = text;
            if (previewCard) previewCard.classList.remove('hidden');
        };

        window.printFolderContract = function() {
            const text = document.getElementById('fcContractText')?.textContent;
            if (!text) return;
            const w = window.open();
            w.document.write(`<pre style="font-family: serif; font-size: 14px; white-space: pre-wrap; padding: 40px; line-height: 1.6; max-width: 800px; margin: auto; text-align: justify;">${text}</pre>`);
            w.document.close();
            w.print();
        };

        window.previewJobContractTemplate = function(libelle, salaire) {
            const modal = document.getElementById('contractTemplatePreviewModal');
            const textContainer = document.getElementById('contractTemplateText');
            if (!modal || !textContainer) return;

            const text = `CONTRAT DE TRAVAIL DE DROIT IVOIRIEN (CDD / CDI) - MODÈLE DE RÉFÉRENCE

ENTRE LES SOUSSIGNÉS :
L'entreprise de sécurité privée, représentée par son Administrateur, ci-après dénommée "L'EMPLOYEUR", d'une part,

ET :
M./Mme [NOM DE L'AGENT] [PRÉNOM DE L'AGENT], né(e) le [DATE DE NAISSANCE] à [LIEU DE NAISSANCE], de nationalité [NATIONALITÉ], résidant à [ADRESSE], ci-après dénommé(e) "L'EMPLOYÉ(E)", d'autre part.

Il a été convenu et arrêté ce qui suit, conformément au Code du Travail de Côte d'Ivoire (Loi n° 2015-532) et à la Convention Collective Interprofessionnelle :

ARTICLE 1 : OBJET ET QUALIFICATION
L'Employé(e) est engagé(e) en qualité de "${libelle}" (Poste paramétré dans le catalogue de l'entreprise).

ARTICLE 2 : DURÉE DU CONTRAT ET PÉRIODE D'ESSAI
Le contrat est conclu pour une durée déterminée (CDD) ou indéterminée (CDI) selon l'affectation finale de l'agent. La période d'essai est fixée conformément au Code du Travail ivoirien.

ARTICLE 3 : REMUNERATION
En contrepartie de l'exécution de ses tâches, l'Employé(e) percevra le salaire de base mensuel brut paramétré de ${salaire} F CFA.
À cette rémunération s'ajoutent la prime de transport obligatoire et les indemnités légales en vigueur en Côte d'Ivoire.

ARTICLE 4 : DURÉE DU TRAVAIL
La durée hebdomadaire du travail est de 40 heures, conformément à la législation du travail ivoirienne.

ARTICLE 5 : CONGÉS ANNUELS
L'Employé(e) accumulera 2,2 jours ouvrables de congé payé par mois de service effectif.

ARTICLE 6 : RÉSILIATION & LITIGES
Toute rupture en dehors de la période d'essai ou tout litige relatif à l'interprétation ou à l'exécution du présent contrat sera soumis aux tribunaux du travail compétents de Côte d'Ivoire.

Fait à Abidjan, le ${new Date().toLocaleDateString('fr-FR')}

Pour l'Employeur                               L'Employé(e)
(Signature précédée de la                     (Signature précédée de la
mention "Lu et approuvé")                     mention "Lu et approuvé")`;

            textContainer.textContent = text;
            modal.classList.remove('hidden');
        };

        window.closeContractTemplatePreviewModal = function() {
            const modal = document.getElementById('contractTemplatePreviewModal');
            if (modal) modal.classList.add('hidden');
        };

        window.printGeneratedContract = function() {
            const text = document.getElementById('mAgentContratText')?.textContent;
            if (!text) return;
            const w = window.open();
            w.document.write(`<pre style="font-family: serif; font-size: 14px; white-space: pre-wrap; padding: 40px; line-height: 1.6; max-width: 800px; margin: auto; text-align: justify;">${text}</pre>`);
            w.document.close();
            w.print();
        };

        // Bind form submit for finalizeEnrollmentForm
        document.addEventListener('DOMContentLoaded', () => {
            const form = document.getElementById('finalizeEnrollmentForm');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = e.target.querySelector('button[type="submit"]');
                    const origText = btn.textContent;
                    btn.disabled = true;
                    btn.textContent = 'Finalisation...';

                    const agentId = document.getElementById('feAgentId').value;
                    const dateDebut = document.getElementById('feDateDebut').value;
                    const heureDebut = document.getElementById('feHeureArrivee').value;
                    const heureFin = document.getElementById('feHeureDepart').value;
                    const documentUrl = document.getElementById('feContratUrl').value;
                    const siteId = document.getElementById('feSiteSelect').value;

                    try {
                        if (!documentUrl) {
                            throw new Error("Veuillez d'abord téléverser le contrat signé.");
                        }

                        const contracts = await apiFetch('/contrats?agentId=' + agentId);
                        const pendingContrat = (contracts || []).find(c => c.statut === 'EN_ATTENTE_CONTRAT_SIGNE') || (contracts && contracts[0]);

                        if (!pendingContrat) {
                            throw new Error("Aucun contrat en attente trouvé pour cet agent.");
                        }

                        await apiFetch(`/contrats/${pendingContrat.id}/finaliser`, {
                            method: 'POST',
                            body: JSON.stringify({
                                dateDebut: dateDebut,
                                documentUrl: documentUrl
                            })
                        });

                        if (siteId) {
                            await apiFetch('/admin/affectations', {
                                method: 'POST',
                                body: JSON.stringify({
                                    siteId: siteId,
                                    agentId: agentId,
                                    dateDebut: dateDebut,
                                    heureDebut: heureDebut,
                                    heureFin: heureFin
                                })
                            });
                        }

                        alert("L'enrôlement a été finalisé avec succès ! L'agent est désormais ACTIF.");
                        closeFinalizeEnrollmentModal();
                        loadAgents();
                        if (window.loadOverview) loadOverview();
                    } catch (err) {
                        alert(err.message);
                    } finally {
                        btn.disabled = false;
                        btn.textContent = origText;
                    }
                });
            }
        });

        // File upload size tracking & utility
        let enroleFileSizes = {};

        function updateCumulativeSizeIndicator() {
            const totalBytes = Object.values(enroleFileSizes).reduce((a, b) => a + b, 0);
            const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
            const indicator = document.getElementById('cumulativeSizeIndicator');
            if (indicator) {
                indicator.textContent = `Taille cumulée actuelle : ${totalMb} Mo / 13 Mo`;
                if (totalBytes > 13 * 1024 * 1024) {
                    indicator.className = "block mt-1 text-red-600 font-bold animate-pulse";
                } else {
                    indicator.className = "block mt-1 text-violet-600 font-normal";
                }
            }
        }

        const uploadAndBindFile = (inputId, statusId, hiddenInputId) => {
            const input = document.getElementById(inputId);
            if (!input) return;
            
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            
            newInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    delete enroleFileSizes[inputId];
                    updateCumulativeSizeIndicator();
                    return;
                }

                if (file.size > 13 * 1024 * 1024) {
                    alert("Ce fichier dépasse la taille maximale autorisée de 13 Mo.");
                    newInput.value = "";
                    delete enroleFileSizes[inputId];
                    updateCumulativeSizeIndicator();
                    return;
                }

                const enrollmentInputs = [
                    'mAgentPhotoFile', 'file-CNI_Passeport', 'file-Extrait_Naissance',
                    'file-Casier_Judiciaire', 'file-CV', 'file-Diplomes',
                    'file-Certificats_Travail', 'file-Permis_Conduire',
                    'file-Attestations_Diverses', 'file-Photo_Identite'
                ];

                if (enrollmentInputs.includes(inputId)) {
                    const currentInputSize = enroleFileSizes[inputId] || 0;
                    const totalBytesExcludingCurrent = Object.values(enroleFileSizes).reduce((a, b) => a + b, 0) - currentInputSize;
                    const potentialTotal = totalBytesExcludingCurrent + file.size;

                    if (potentialTotal > 13 * 1024 * 1024) {
                        alert("La limite cumulée de 13 Mo pour l'ensemble des fichiers est dépassée. Le téléversement est bloqué.");
                        newInput.value = "";
                        delete enroleFileSizes[inputId];
                        updateCumulativeSizeIndicator();
                        return;
                    }

                    enroleFileSizes[inputId] = file.size;
                    updateCumulativeSizeIndicator();
                }

                const statusSpan = statusId ? document.getElementById(statusId) : null;
                if (statusSpan) {
                    statusSpan.textContent = "Téléversement en cours...";
                    statusSpan.className = "text-xs mt-1 block text-amber-500 font-bold animate-pulse";
                }

                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    const token = localStorage.getItem('token');
                    const response = await fetch('/api/agents/upload', {
                        method: 'POST',
                        body: formData,
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                    });
                    if (!response.ok) throw new Error("Erreur de téléversement");
                    const res = await response.json();
                    
                    const hiddenInput = document.getElementById(hiddenInputId);
                    if (hiddenInput) hiddenInput.value = res.url;
                    
                    if (statusSpan) {
                        statusSpan.textContent = "Téléversé ✓";
                        statusSpan.className = "text-xs mt-1 block text-green-600 font-bold";
                    }
                    
                    if (inputId === 'mAgentPhotoFile') {
                        const previewImg = document.getElementById('mAgentPhotoPreview');
                        const previewContainer = document.getElementById('mAgentPhotoPreviewContainer');
                        if (previewImg && previewContainer) {
                            previewImg.src = res.url;
                            previewContainer.classList.remove('hidden');
                        }
                        const photoStatus = document.getElementById('mAgentPhotoStatus');
                        if (photoStatus) {
                            photoStatus.textContent = file.name;
                        }
                    }
                } catch (err) {
                    console.error(err);
                    alert("Erreur lors du téléversement du fichier.");
                    newInput.value = "";
                    delete enroleFileSizes[inputId];
                    updateCumulativeSizeIndicator();
                    if (statusSpan) {
                        statusSpan.textContent = "Erreur de téléversement";
                        statusSpan.className = "text-xs mt-1 block text-red-500 font-bold";
                    }
                }
            });
        };

        function resetAddAgentModal() {
            document.getElementById('modalAddAgentForm').reset();
            enroleFileSizes = {};
            updateCumulativeSizeIndicator();
            const piecesTypes = [
                'CNI_Passeport', 'Extrait_Naissance', 'Casier_Judiciaire', 'CV',
                'Diplomes', 'Certificats_Travail', 'Permis_Conduire', 'Attestations_Diverses',
                'Photo_Identite'
            ];
            piecesTypes.forEach(type => {
                const statusSpan = document.getElementById(`status-${type}`);
                if (statusSpan) statusSpan.textContent = "Non fourni";
                const urlInput = document.getElementById(`url-${type}`);
                if (urlInput) urlInput.value = "";
            });
            const photoUrlInput = document.getElementById('mAgentPhotoUrl');
            if (photoUrlInput) photoUrlInput.value = "";
            const photoStatus = document.getElementById('mAgentPhotoStatus');
            if (photoStatus) photoStatus.textContent = "Aucune photo sélectionnée";
            const previewContainer = document.getElementById('mAgentPhotoPreviewContainer');
            if (previewContainer) previewContainer.classList.add('hidden');
        }

        // Geographic Validation Helper
        function setupGeographicValidation(inputId, datalistId, fieldName) {
            const input = document.getElementById(inputId);
            if (!input) return;
            const datalist = document.getElementById(datalistId);
            if (!datalist) return;
            
            input.setAttribute('list', datalistId);
            
            let isAlerting = false;
            const validate = () => {
                const val = input.value.trim();
                if (!val) return true;
                const options = Array.from(datalist.options).map(opt => opt.value.toLowerCase());
                if (!options.includes(val.toLowerCase())) {
                    if (!isAlerting) {
                        isAlerting = true;
                        alert(`⚠️ SÉLECTION REQUISE : Veuillez sélectionner une entrée valide pour le champ "${fieldName}" depuis la liste de suggestion.`);
                        input.value = '';
                        setTimeout(() => {
                            input.focus();
                            isAlerting = false;
                        }, 50);
                    }
                    return false;
                }
                return true;
            };
            
            input.addEventListener('change', validate);
            input.addEventListener('blur', validate);
        }

        // Initialize bindings and submit listeners
        window.initAgentModernModules = function() {
            setupGeographicValidation('mAgentLieuNaissance', 'villes-ci-list', 'Lieu de naissance');
            setupGeographicValidation('mAgentVille', 'villes-ci-list', 'Ville');
            setupGeographicValidation('mAgentCommune', 'communes-abidjan-list', 'Commune');

            uploadAndBindFile('mAgentPhotoFile', 'mAgentPhotoStatus', 'mAgentPhotoUrl');
            uploadAndBindFile('file-CNI_Passeport', 'status-CNI_Passeport', 'url-CNI_Passeport');
            uploadAndBindFile('file-Extrait_Naissance', 'status-Extrait_Naissance', 'url-Extrait_Naissance');
            uploadAndBindFile('file-Casier_Judiciaire', 'status-Casier_Judiciaire', 'url-Casier_Judiciaire');
            uploadAndBindFile('file-CV', 'status-CV', 'url-CV');
            uploadAndBindFile('file-Diplomes', 'status-Diplomes', 'url-Diplomes');
            uploadAndBindFile('file-Certificats_Travail', 'status-Certificats_Travail', 'url-Certificats_Travail');
            uploadAndBindFile('file-Permis_Conduire', 'status-Permis_Conduire', 'url-Permis_Conduire');
            uploadAndBindFile('file-Attestations_Diverses', 'status-Attestations_Diverses', 'url-Attestations_Diverses');
            uploadAndBindFile('file-Photo_Identite', 'status-Photo_Identite', 'url-Photo_Identite');

            // Bind contract forms inputs
            uploadAndBindFile('fcContractFile', null, 'fcDocumentUrl');
            uploadAndBindFile('frContractFile', null, 'frDocumentUrl');

            // Bind enrollment finalization contract file input
            uploadAndBindFile('feContratFile', 'feContratStatus', 'feContratUrl');

            const modalAddAgentForm = document.getElementById('modalAddAgentForm');
            if (modalAddAgentForm) {
                modalAddAgentForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const birthInput = document.getElementById('mAgentLieuNaissance');
                    const cityInput = document.getElementById('mAgentVille');
                    const communeInput = document.getElementById('mAgentCommune');

                    if (birthInput && birthInput.value.trim()) {
                        const datalist = document.getElementById('villes-ci-list');
                        const validOptions = Array.from(datalist.options).map(opt => opt.value);
                        if (!validOptions.includes(birthInput.value.trim())) {
                            alert("Erreur : Veuillez sélectionner un Lieu de naissance valide dans la liste des villes de Côte d'Ivoire.");
                            birthInput.focus();
                            return;
                        }
                    }
                    if (cityInput && cityInput.value.trim()) {
                        const datalist = document.getElementById('villes-ci-list');
                        const validOptions = Array.from(datalist.options).map(opt => opt.value);
                        if (!validOptions.includes(cityInput.value.trim())) {
                            alert("Erreur : Veuillez sélectionner une Ville valide dans la liste des villes de Côte d'Ivoire.");
                            cityInput.focus();
                            return;
                        }
                    }
                    if (communeInput && communeInput.value.trim()) {
                        const datalist = document.getElementById('communes-abidjan-list');
                        const validOptions = Array.from(datalist.options).map(opt => opt.value);
                        if (!validOptions.includes(communeInput.value.trim())) {
                            alert("Erreur : Veuillez sélectionner une Commune valide dans la liste des communes de Côte d'Ivoire.");
                            communeInput.focus();
                            return;
                        }
                    }

                    const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Création du dossier en cours...';

                    const piecesTypes = [
                        'CNI_Passeport', 'Extrait_Naissance', 'Casier_Judiciaire', 'CV',
                        'Diplomes', 'Certificats_Travail', 'Permis_Conduire', 'Attestations_Diverses',
                        'Photo_Identite'
                    ];

                    const payload = {
                        nom: document.getElementById('mAgentNom').value,
                        prenom: document.getElementById('mAgentPrenom').value,
                        genre: document.getElementById('mAgentGenre').value,
                        dateNaissance: document.getElementById('mAgentDateNaissance').value,
                        lieuNaissance: document.getElementById('mAgentLieuNaissance').value,
                        nationalite: document.getElementById('mAgentNationalite').value,
                        situationMatrimoniale: document.getElementById('mAgentSituationMatrimoniale').value,
                        nombreEnfants: document.getElementById('mAgentNombreEnfants').value,
                        photoUrl: document.getElementById('mAgentPhotoUrl').value,
                        contact: document.getElementById('mAgentContact').value,
                        telephoneSecondaire: document.getElementById('mAgentTelephoneSecondaire').value,
                        email: document.getElementById('mAgentEmail').value,
                        ville: document.getElementById('mAgentVille').value,
                        commune: document.getElementById('mAgentCommune').value,
                        adresse: document.getElementById('mAgentAdresse').value,
                        contactUrgenceNom: document.getElementById('mAgentUrgenceNom').value,
                        contactUrgenceTelephone: document.getElementById('mAgentUrgenceTelephone').value,
                        contactUrgenceLien: document.getElementById('mAgentUrgenceLien').value,
                        zoneId: document.getElementById('mAgentZoneSelect').value
                    };

                    try {
                        const resAgent = await apiFetch('/agents', {
                            method: 'POST',
                            headers: {
                                'Idempotency-Key': window.agentCreationIdempotencyKey
                            },
                            body: JSON.stringify(payload)
                        });

                        const agentId = resAgent.agentId;

                        for (const type of piecesTypes) {
                            const urlVal = document.getElementById(`url-${type}`).value;
                            if (urlVal) {
                                await apiFetch(`/agents/${agentId}/pieces`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        type: type,
                                        urlDocument: urlVal,
                                        statut: 'VALIDE'
                                    })
                                });
                            }
                        }

                        // 3. Create pending contract if emploi selected in tab 4
                        const emploiId = document.getElementById('mAgentEmploiSelect').value;
                        const typeContrat = document.getElementById('mAgentContratType').value;
                        if (emploiId) {
                            const opt = document.getElementById('mAgentEmploiSelect').options[document.getElementById('mAgentEmploiSelect').selectedIndex];
                            const libelle = opt.getAttribute('data-libelle');
                            const salaire = opt.getAttribute('data-salaire');

                            await apiFetch('/contrats', {
                                method: 'POST',
                                headers: {
                                    'Idempotency-Key': window.contractCreationIdempotencyKey
                                },
                                body: JSON.stringify({
                                    agentId: agentId,
                                    type: typeContrat,
                                    fonction: libelle,
                                    salaireBase: salaire,
                                    dateDebut: new Date().toISOString().split('T')[0],
                                    statut: 'EN_ATTENTE_CONTRAT_SIGNE'
                                })
                            });
                        }

                        alert("Dossier Agent complet créé avec succès ! Le contrat est en attente de signature.");
                        closeAddAgentModal();
                        loadAgents();
                    } catch (err) {
                        alert(err.message);
                    } finally {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Créer le dossier complet';
                    }
                });
            }

            const folderCreateContractForm = document.getElementById('folderCreateContractForm');
            if (folderCreateContractForm) {
                folderCreateContractForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Création...';
                    try {
                        const agentId = window.currentFolderAgentId;
                        const funcSelect = document.getElementById('fcFonctionSelect');
                        const selectedFunctionName = funcSelect.options[funcSelect.selectedIndex].text;
                        
                        const payload = {
                            agentId: agentId,
                            type: document.getElementById('fcType').value,
                            dateDebut: document.getElementById('fcDateDebut').value,
                            dateFin: document.getElementById('fcDateFin').value,
                            salaireBase: document.getElementById('fcSalaireBase').value,
                            fonction: selectedFunctionName,
                            departement: document.getElementById('fcDepartement').value,
                            direction: document.getElementById('fcDirection').value,
                            structureClienteId: document.getElementById('fcStructureCliente').value,
                            documentUrl: document.getElementById('fcDocumentUrl').value
                        };

                        await apiFetch('/contrats', {
                            method: 'POST',
                            body: JSON.stringify(payload)
                        });

                        alert("Contrat créé avec succès !");
                        folderCreateContractForm.reset();
                        document.getElementById('fcDocumentUrl').value = "";
                        loadFolderContract();
                    } catch (err) { alert(err.message); }
                    finally {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Générer & Activer le Contrat';
                    }
                });
            }

            const folderRenewContractForm = document.getElementById('folderRenewContractForm');
            if (folderRenewContractForm) {
                folderRenewContractForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Validation...';
                    try {
                        const contractId = window.currentActiveContractId;
                        const payload = {
                            nouvelleDateFin: document.getElementById('frNouvelleDateFin').value,
                            motif: document.getElementById('frMotif').value,
                            documentUrl: document.getElementById('frDocumentUrl').value
                        };

                        await apiFetch(`/contrats/${contractId}/renouvellements`, {
                            method: 'POST',
                            body: JSON.stringify(payload)
                        });

                        alert("Contrat renouvelé avec succès !");
                        folderRenewContractForm.reset();
                        document.getElementById('frDocumentUrl').value = "";
                        
                        document.getElementById('renewContractFormContainer').classList.add('hidden');
                        loadFolderContract();
                    } catch (err) { alert(err.message); }
                    finally {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Confirmer le renouvellement';
                    }
                });
            }
        };

        // ─── Modal Dossier Agent Tab & CRUD Handlers ───────────────────
        window.openAgentFolder = async function(agentId) {
            window.currentFolderAgentId = agentId;
            
            const a = window.allCoordAgents.find(x => String(x.id) === String(agentId));
            if (a) {
                window.currentFolderAgentObj = a;
            }
            if (!a) {
                alert("Agent introuvable.");
                return;
            }

            document.getElementById('folderAgentPhoto').src = a.photoUrl || '/shared/default-avatar.png';
            document.getElementById('folderAgentTitle').textContent = `${a.nom} ${a.prenom}`;
            document.getElementById('folderAgentSub').textContent = `Matricule : ${a.matricule || 'En cours'}`;
            
            document.getElementById('fAgentGenre').textContent = a.genre || '—';
            document.getElementById('fAgentNaissance').textContent = a.dateNaissance ? `${a.dateNaissance} (Lieu: ${a.lieuNaissance || '—'})` : '—';
            document.getElementById('fAgentNationalite').textContent = a.nationalite || '—';
            document.getElementById('fAgentMatrimoniale').textContent = a.situationMatrimoniale || '—';
            document.getElementById('fAgentEnfants').textContent = a.nombreEnfants ?? '0';
            document.getElementById('fAgentContact').textContent = a.contact || '—';
            document.getElementById('fAgentTelSec').textContent = a.telephoneSecondaire || '—';
            document.getElementById('fAgentEmail').textContent = a.email || '—';
            document.getElementById('fAgentLocalisation').textContent = `${a.commune || '—'} / ${a.ville || '—'}`;
            document.getElementById('fAgentAdresse').textContent = a.adresse || '—';
            
            document.getElementById('fUrgenceNom').textContent = a.contactUrgenceNom || '—';
            document.getElementById('fUrgenceTel').textContent = a.contactUrgenceTelephone || '—';
            document.getElementById('fUrgenceLien').textContent = a.contactUrgenceLien || '—';
            
            document.getElementById('fIdentifiantNfc').value = a.identifiantNfc || '';

            switchFolderTab('bio');
            document.getElementById('agentFolderModal').classList.remove('hidden');
        };

        window.closeAgentFolderModal = function() {
            document.getElementById('agentFolderModal').classList.add('hidden');
        };

        window.switchFolderTab = function(tabName) {
            const tabs = ['bio', 'docs', 'contract', 'hardware'];
            tabs.forEach(t => {
                const btn = document.getElementById(`folderTabBtn-${t}`);
                const content = document.getElementById(`folderTab-${t}`);
                if (t === tabName) {
                    btn.classList.add('shadow-sm', 'bg-white', 'text-indigo-700', 'ring-1', 'ring-slate-200', 'font-bold');
                    btn.classList.remove('text-slate-500', 'hover:text-slate-700', 'hover:bg-slate-200/50', 'font-medium');
                    if (content) content.classList.remove('hidden');
                } else {
                    btn.classList.remove('shadow-sm', 'bg-white', 'text-indigo-700', 'ring-1', 'ring-slate-200', 'font-bold');
                    btn.classList.add('text-slate-500', 'hover:text-slate-700', 'hover:bg-slate-200/50', 'font-medium');
                    if (content) content.classList.add('hidden');
                }
            });

            if (tabName === 'docs') loadFolderDocs();
            if (tabName === 'contract') loadFolderContract();
            if (tabName === 'hardware') loadFolderHardware();
        };

        async function loadFolderDocs() {
            const agentId = window.currentFolderAgentId;
            try {
                const pieces = await apiFetch(`/agents/${agentId}/pieces`);
                const container = document.getElementById('folderPiecesList');
                
                const labels = {
                    'CNI_Passeport': 'CNI / Passeport',
                    'Extrait_Naissance': 'Extrait de naissance',
                    'Casier_Judiciaire': 'Casier judiciaire',
                    'CV': 'CV',
                    'Diplomes': 'Diplômes',
                    'Certificats_Travail': 'Certificats de travail',
                    'Permis_Conduire': 'Permis de conduire',
                    'Attestations_Diverses': 'Attestations diverses',
                    'Photo_Identite': "Photo d'identité"
                };

                if (!pieces || pieces.length === 0) {
                    container.innerHTML = '<div class="col-span-full text-center text-slate-400 py-6">Aucune pièce justificative fournie.</div>';
                    return;
                }

                container.innerHTML = pieces.map(p => {
                    const label = labels[p.type] || p.type;
                    return `
                        <div class="border rounded-2xl p-4 bg-slate-50 flex flex-col justify-between space-y-3">
                            <div>
                                <div class="text-xs font-bold text-slate-700">${label}</div>
                                <span class="badge bg-green-100 text-green-800 text-[10px] mt-1 inline-block">${p.statut || 'VALIDE'}</span>
                            </div>
                            <div class="flex gap-2">
                                <a href="${p.urlDocument}" target="_blank" class="flex-1 text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-1.5 rounded-lg text-xs border border-indigo-200">
                                    Voir PDF
                                </a>
                                <button onclick="deletePiece('${p.id}')" class="text-red-500 hover:text-red-700 font-bold text-xs p-1">
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            } catch (err) { console.error(err); }
        }

        window.uploadDocToFolder = async function() {
            const agentId = window.currentFolderAgentId;
            const selectType = document.getElementById('newDocType').value;
            const fileInput = document.getElementById('newDocFile');
            const file = fileInput.files[0];
            
            if (!file) {
                alert("Veuillez sélectionner un fichier PDF.");
                return;
            }

            const btn = document.querySelector('[onclick="uploadDocToFolder()"]');
            btn.disabled = true;
            btn.textContent = 'En cours...';

            try {
                const formData = new FormData();
                formData.append('file', file);
                
                const token = localStorage.getItem('token');
                const response = await fetch('/api/agents/upload', {
                    method: 'POST',
                    body: formData,
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                
                if (!response.ok) throw new Error("Erreur de téléversement");
                const res = await response.json();
                
                await apiFetch(`/agents/${agentId}/pieces`, {
                    method: 'POST',
                    body: JSON.stringify({
                        type: selectType,
                        urlDocument: res.url,
                        statut: 'VALIDE'
                    })
                });

                alert("Document ajouté avec succès !");
                fileInput.value = "";
                loadFolderDocs();
            } catch (err) {
                alert(err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Télécharger le document';
            }
        };

        window.deletePiece = async function(pieceId) {
            if (!confirm("Supprimer ce document ?")) return;
            try {
                await apiFetch(`/agents/pieces/${pieceId}`, { method: 'DELETE' });
                alert("Document supprimé avec succès.");
                loadFolderDocs();
            } catch (e) { alert(e.message); }
        };

        window.saveNfcConfig = async function() {
            const agentId = window.currentFolderAgentId;
            const nfcVal = document.getElementById('fIdentifiantNfc').value.trim();
            
            try {
                await apiFetch(`/agents/${agentId}/carte/configurer`, {
                    method: 'POST',
                    body: JSON.stringify({
                        identifiantNfc: nfcVal,
                        sourceBiometrie: 'EMPREINTE_DIGITALE'
                    })
                });
                alert("Identifiant NFC associé avec succès !");
                loadAgents();
            } catch (err) { alert(err.message); }
        };

        window.folderContractJobs = [];

        window.handleContractJobChange = function(jobId) {
            const job = window.folderContractJobs.find(j => j.id == jobId);
            if (job) {
                document.getElementById('fcSalaireBase').value = job.salaireBrutReference || '';
            }
        };

        async function loadFolderContract() {
            const agentId = window.currentFolderAgentId;
            try {
                const fcContractBulle = document.getElementById('fcContractBulle');
                if (fcContractBulle) fcContractBulle.classList.add('hidden');

                const structures = await apiFetch('/organisation/structures');
                const structSelect = document.getElementById('fcStructureCliente');
                if (structSelect) {
                    structSelect.innerHTML = '<option value="">Choisir la structure...</option>' +
                        structures.map(s => `<option value="${s.id}">${s.raisonSociale}</option>`).join('');
                }

                const emplois = await apiFetch('/organisation/emplois');
                window.folderContractJobs = emplois || [];
                const funcSelect = document.getElementById('fcFonctionSelect');
                if (funcSelect) {
                    funcSelect.innerHTML = '<option value="">Choisir la fonction...</option>' +
                        emplois.map(e => `<option value="${e.id}">${e.libelle}</option>`).join('');
                }

                const contrats = await apiFetch(`/contrats/agent/${agentId}`);
                const activeContainer = document.getElementById('activeContractDetails');
                const createContainer = document.getElementById('createContractFormContainer');
                const renewContainer = document.getElementById('renewContractFormContainer');
                const renewalsTbody = document.getElementById('folderRenewalsTableBody');
                
                if (!contrats || contrats.length === 0) {
                    if (activeContainer) activeContainer.innerHTML = '<div class="text-center text-slate-400 py-4 font-semibold text-xs">Aucun contrat actif pour cet agent.</div>';
                    if (createContainer) createContainer.classList.remove('hidden');
                    if (renewContainer) renewContainer.classList.add('hidden');
                    if (renewalsTbody) renewalsTbody.innerHTML = '<tr><td colspan="5" class="p-2 text-center text-slate-400">Aucun historique.</td></tr>';
                    window.currentActiveContractId = null;
                    return;
                }

                const activeC = contrats[0];
                window.currentActiveContractId = activeC.id;
                
                if (activeContainer) {
                    activeContainer.innerHTML = `
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="badge ${activeC.statut === 'ACTIF' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'} mb-2 inline-block text-[10px]">${activeC.statut}</span>
                                <h3 class="text-sm font-extrabold text-slate-800">Contrat ${activeC.type} — ${activeC.fonction || 'Non renseignée'}</h3>
                                <p class="text-xs text-slate-500 mt-1">Département: ${activeC.departement || '—'} | Direction: ${activeC.direction || '—'}</p>
                            </div>
                            <div class="text-right">
                                <span class="text-xs font-bold text-indigo-700 block">${activeC.salaireBase ? activeC.salaireBase + ' FCFA' : '—'}</span>
                                <span class="text-[10px] text-slate-400">Salaire de base</span>
                            </div>
                        </div>
                        <hr class="border-slate-100 my-3">
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div>
                                <span class="text-slate-400 block text-[10px]">Date Début</span>
                                <span class="font-bold text-slate-700">${activeC.dateDebut || '—'}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 block text-[10px]">Date Fin</span>
                                <span class="font-bold text-slate-700">${activeC.dateFin || 'Indéterminée (CDI)'}</span>
                            </div>
                            <div>
                                <span class="text-slate-400 block text-[10px]">Structure Cliente</span>
                                <span class="font-bold text-slate-700">${activeC.structureCliente || 'Placement interne'}</span>
                            </div>
                        </div>

                    `;
                }

                if (createContainer) createContainer.classList.add('hidden');

                const renewals = await apiFetch(`/contrats/${activeC.id}/renouvellements`);
                if (renewalsTbody) {
                    if (!renewals || renewals.length === 0) {
                        renewalsTbody.innerHTML = '<tr><td colspan="5" class="p-2 text-center text-slate-400">Aucun historique de renouvellement.</td></tr>';
                    } else {
                        renewalsTbody.innerHTML = renewals.map(r => `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="p-2 text-slate-700">${r.creeLe ? new Date(r.creeLe).toLocaleDateString() : '—'}</td>
                                <td class="p-2 text-slate-500">${r.ancienneDateFin || '—'}</td>
                                <td class="p-2 text-slate-700 font-bold">${r.nouvelleDateFin || '—'}</td>
                                <td class="p-2 text-slate-500">${r.motif || '—'}</td>
                                <td class="p-2">
                                    ${r.documentUrl ? `<a href="${r.documentUrl}" target="_blank" class="text-indigo-600 font-bold hover:underline">Voir PDF</a>` : '—'}
                                </td>
                            </tr>
                        `).join('');
                    }
                }
            } catch (err) { console.error(err); }
        }

        async function loadFolderHardware() {
            const agentId = window.currentFolderAgentId;
            try {
                const affectations = await apiFetch(`/materiels/agent/${agentId}`);
                const tbody = document.getElementById('folderHardwareTableBody');
                
                if (tbody) {
                    if (!affectations || affectations.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="7" class="p-2 text-center text-slate-400">Aucun équipement assigné.</td></tr>';
                    } else {
                        tbody.innerHTML = affectations.map(a => {
                            const dateRemise = a.dateRemise ? new Date(a.dateRemise).toLocaleDateString('fr-FR') : '—';
                            const dateRetour = a.dateRetour ? new Date(a.dateRetour).toLocaleDateString('fr-FR') : '';
                            return `
                                <tr class="hover:bg-slate-50/50 transition-colors">
                                    <td class="p-2 font-bold text-slate-700">${a.materiel?.categorie || '—'}</td>
                                    <td class="p-2 text-slate-500">${a.materiel?.libelle || '—'}</td>
                                    <td class="p-2 text-slate-500">${a.materiel?.imei || a.materiel?.numeroSim || '—'}</td>
                                    <td class="p-2 text-slate-500">${a.materiel?.numeroSerie || '—'}</td>
                                    <td class="p-2 text-slate-500">${dateRemise}</td>
                                    <td class="p-2">
                                        <span class="badge ${a.statut === 'REMIS' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'} text-[10px]">
                                            ${a.statut}
                                        </span>
                                    </td>
                                    <td class="p-2">
                                        ${a.statut === 'REMIS' ? `
                                            <button onclick="returnHardware('${a.materiel?.id}')" class="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded font-bold">
                                                Retourner
                                            </button>
                                        ` : `<span class="text-slate-400 text-[10px]">Retourné le ${dateRetour}</span>`}
                                    </td>
                                </tr>
                            `;
                        }).join('');
                    }
                }

                const allMateriels = await apiFetch('/materiels');
                const select = document.getElementById('newHardwareSelect');
                if (select) {
                    const disponibles = (allMateriels || []).filter(m => m.statut === 'DISPONIBLE' || m.statut === 'ASSIGNE');
                    if (disponibles.length === 0) {
                        select.innerHTML = '<option value="">Aucun matériel disponible dans l\'inventaire...</option>';
                    } else {
                        select.innerHTML = '<option value="">Choisir un matériel à assigner...</option>' +
                            disponibles.map(m => `<option value="${m.id}">${m.categorie} - ${m.libelle} (S/N: ${m.numeroSerie || '—'})</option>`).join('');
                    }
                }
            } catch (err) { console.error(err); }
        }

        window.remiseHardwareToAgent = async function() {
            const agentId = window.currentFolderAgentId;
            const materielId = document.getElementById('newHardwareSelect').value;
            if (!materielId) {
                alert("Veuillez sélectionner un matériel disponible.");
                return;
            }
            
            const btn = document.querySelector('[onclick="remiseHardwareToAgent()"]');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'En cours...';
            }
            
            try {
                await apiFetch(`/materiels/${materielId}/remise`, {
                    method: 'POST',
                    body: JSON.stringify({
                        agentId: agentId,
                        signatureUrl: ''
                    })
                });
                alert("Matériel remis avec succès !");
                loadFolderHardware();
                if (typeof loadCoordMateriel === 'function') loadCoordMateriel();
            } catch (err) { alert(err.message); }
            finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Valider la remise';
                }
            }
        };

        window.returnHardware = async function(materielId) {
            if (!confirm("Confirmer le retour de ce matériel ?")) return;
            try {
                await apiFetch(`/materiels/${materielId}/retour`, {
                    method: 'POST',
                    body: JSON.stringify({
                        signatureUrl: ''
                    })
                });
                alert("Matériel retourné avec succès !");
                loadFolderHardware();
                if (typeof loadCoordMateriel === 'function') loadCoordMateriel();
            } catch (err) { alert(err.message); }
        };

        // ─── Modal Badge & QR Zoom Handlers ──────────────────────────
        window.zoomQr = function(fullName, qrData, zone) {
            document.getElementById('adminQrModalTitle').textContent = "Badge — " + fullName;
            const canvas = document.getElementById('adminModalQrCanvas');
            QRCode.toCanvas(canvas, qrData, { width: 220, margin: 2 }, function (error) {
                if (error) console.error(error);
            });
            document.getElementById('adminDownloadPdfBtn').onclick = () => generateAdminBadgePdf(fullName, qrData, zone || '');
            document.getElementById('adminPrintQrBtn').onclick = () => printAdminBadge(fullName, qrData, zone || '');
            document.getElementById('adminQrModal').classList.remove('hidden');
        };

        window.closeAdminQrModal = function() {
            document.getElementById('adminQrModal').classList.add('hidden');
        };

        window.deleteAgent = async function(id) {
            if (!confirm("Attention: La suppression de cet agent est irréversible et supprimera également toutes ses pièces justificatives, ses contrats, ses affectations de matériel et ses cartes de pointage. Voulez-vous continuer ?")) {
                return;
            }
            try {
                await apiFetch(`/agents/${id}`, { method: 'DELETE' });
                alert("Agent et toutes ses dépendances supprimés avec succès !");
                loadAgents();
            } catch (err) {
                alert(err.message);
            }
        };

        // ─── Badge Generation & Print PDF ────────────────────────────
        window.generateAdminBadgePdf = function(fullName, qrData, zone) {
            QRCode.toDataURL(qrData, { width: 400, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } }, function(err, qrDataUrl) {
                if (err) { alert('Erreur QR : ' + err); return; }
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const W = doc.internal.pageSize.getWidth();
                const H = doc.internal.pageSize.getHeight();

                doc.setFillColor(240, 249, 255);
                doc.rect(0, 0, W, H, 'F');

                doc.setFillColor(2, 132, 199);
                doc.rect(0, 0, W, 40, 'F');
                doc.setFillColor(14, 165, 233);
                doc.rect(0, 33, W, 7, 'F');

                doc.setFillColor(255, 255, 255);
                doc.circle(20, 20, 10, 'F');
                doc.setFontSize(10); doc.setFont('helvetica', 'bold');
                doc.setTextColor(2, 132, 199);
                doc.text('ST', 16.5, 21.5);

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(18); doc.text('SimpleTaff', 35, 18);
                doc.setFontSize(9); doc.setFont('helvetica', 'normal');
                doc.text('Badge de pointage — Accès sécurisé', 35, 26);

                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(226, 232, 240);
                doc.roundedRect(20, 55, W - 40, H - 90, 8, 8, 'FD');

                const initiales = fullName.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase();
                doc.setFillColor(2, 132, 199);
                doc.circle(W / 2, 82, 16, 'F');
                doc.setFontSize(14); doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text(initiales, W / 2, 87, { align: 'center' });

                doc.setTextColor(15, 23, 42);
                doc.setFontSize(18);
                doc.text(fullName.toUpperCase(), W / 2, 110, { align: 'center' });

                doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
                doc.text('Agent Terrain' + (zone ? ' — ' + zone : ''), W / 2, 119, { align: 'center' });

                doc.setDrawColor(186, 230, 253); doc.setLineWidth(0.5);
                doc.line(30, 126, W - 30, 126);

                const qrSize = 88;
                doc.addImage(qrDataUrl, 'PNG', (W - qrSize) / 2, 134, qrSize, qrSize);

                doc.setFontSize(9); doc.setTextColor(100, 116, 139);
                doc.text('Scannez ce code lors de chaque pointage', W / 2, 231, { align: 'center' });

                doc.setFillColor(224, 242, 254);
                doc.roundedRect(30, 237, W - 60, 14, 4, 4, 'F');
                doc.setFontSize(8); doc.setTextColor(3, 105, 161); doc.setFont('helvetica', 'bold');
                doc.text('🔒  Code sécurisé JWT — Usage strictement personnel', W / 2, 246, { align: 'center' });

                doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
                const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
                doc.text(`Émis le ${now}`, W / 2, 258, { align: 'center' });

                doc.setFillColor(2, 132, 199);
                doc.rect(0, H - 12, W, 12, 'F');
                doc.setTextColor(255, 255, 255); doc.setFontSize(8);
                doc.text('SimpleTaff — Plateforme de Gestion du Personnel', W / 2, H - 5, { align: 'center' });

                doc.save(`Badge_${fullName.replace(/ /g, '_')}.pdf`);
            });
        };

        window.printAdminBadge = function(fullName, qrData, zone) {
            QRCode.toDataURL(qrData, { width: 400, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } }, function(err, qrDataUrl) {
                if (err) return;
                const initiales = fullName.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase();
                const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
                const w = window.open('', '_blank', 'width=700,height=900');
                w.document.write(`<!DOCTYPE html><html><head><title>Badge — ${fullName}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Outfit',sans-serif;background:#f0f9ff;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .badge{background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(2,132,199,.15);width:320px;overflow:hidden}
  .header{background:linear-gradient(135deg,#0284c7,#0ea5e9);padding:24px;display:flex;align-items:center;gap:12px}
  .logo{width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:16px}
  .header h1{color:#fff;font-size:18px;font-weight:800}
  .header p{color:rgba(255,255,255,.7);font-size:11px;margin-top:2px}
  .body{padding:24px;text-align:center}
  .avatar{width:56px;height:56px;border-radius:50%;background:#0284c7;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:20px;margin:0 auto 10px}
  .name{font-size:20px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.5px}
  .role{font-size:11px;color:#94a3b8;margin-top:3px}
  .divider{border:none;border-top:1.5px solid #e0f2fe;margin:16px 0}
  .qr-wrap{background:#f0f9ff;border-radius:16px;padding:14px;display:inline-block;border:1.5px solid #bae6fd}
  .instruction{font-size:11px;color:#94a3b8;margin-top:12px}
  .security{background:#e0f2fe;border-radius:10px;padding:10px;margin-top:12px;font-size:10px;color:#0369a1;font-weight:600}
  .date{font-size:10px;color:#94a3b8;margin-top:8px}
  .footer{background:#0284c7;color:#fff;text-align:center;padding:10px;font-size:10px}
  @media print{body{background:#fff}.badge{box-shadow:none;border:1px solid #e0f2fe}}
</style></head><body>
<div class="badge">
  <div class="header"><div class="logo">ST</div><div><h1>SimpleTaff</h1><p>Badge de pointage</p></div></div>
  <div class="body">
    <div class="avatar">${initiales}</div>
    <div class="name">${fullName}</div>
    <div class="role">Agent Terrain${zone ? ' — ' + zone : ''}</div>
    <hr class="divider">
    <div class="qr-wrap"><img src="${qrDataUrl}" width="180" height="180"></div>
    <p class="instruction">Scannez ce QR lors de chaque pointage</p>
    <div class="security">🔒 Code sécurisé — Usage strictly personnel</div>
    <div class="date">Émis le ${now}</div>
  </div>
  <div class="footer">SimpleTaff — Gestion du Personnel &copy; ${new Date().getFullYear()}</div>
</div>
<script>window.onload=()=>{window.print();window.close();}<\/script>
</body></html>`);
                w.document.close();
            });
        };

        // ── Mobile sidebar ────────────────────────────────────────
        window.toggleMobileSidebar = function() {
            const sidebar = document.querySelector('.main-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            const btn     = document.getElementById('hamburger-btn');
            const isOpen  = sidebar.classList.contains('sidebar-open');
            if (isOpen) {
                sidebar.classList.remove('sidebar-open');
                overlay.classList.remove('active');
                btn.classList.remove('open');
            } else {
                sidebar.classList.add('sidebar-open');
                overlay.classList.add('active');
                btn.classList.add('open');
            }
        };

        window.closeMobileSidebar = function() {
            const sidebar = document.querySelector('.main-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            const btn     = document.getElementById('hamburger-btn');
            sidebar.classList.remove('sidebar-open');
            overlay.classList.remove('active');
            btn && btn.classList.remove('open');
        };

        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 768) closeMobileSidebar();
            });
        });

        // ── Notifications loader ──────────────────────────────────
        window.loadNotifications = async function() {
            try {
                const data = await apiFetch('/notifications');
                const container = document.getElementById('notification-bell-dropdown');
                if (container) {
                    container.innerHTML = data.length > 0 ? data.map(n => `<div class="p-2 border-b text-sm">${n.message}</div>`).join('') : '<div class="p-4 text-center text-slate-400">Aucune notification</div>';
                }
            } catch (e) { console.error('Notifications load failed', e); }
        };

        // ── Toast helper ─────────────────────────────────────────
        window.showToast = function(message, type = 'info', duration = 3500) {
            const container = document.getElementById('toast-container');
            if (!container) return;
            const icons = { success: '✓', error: '✕', info: 'ℹ' };
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `<span style="font-size:15px">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(6px)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        };

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
                const agentsData = typeof window.allCoordAgents !== 'undefined' ? window.allCoordAgents : [];
                agentsData.forEach(a => {
                    const name = ((a.nom||a.agentNom||'') + ' ' + (a.prenom||'')).toLowerCase();
                    if (name.includes(q) || (a.telephone||'').includes(q)) {
                        results.push({ type: 'Agent', icon: '👤', text: (a.nom||a.agentNom||'') + ' ' + (a.prenom||''), tab: 'agents', action: () => { if(typeof showTab==='function') showTab('agents'); searchInput.value=''; searchDropdown.classList.add('hidden'); }});
                    }
                });
                
                                // Search Affectations
                const affectationsData = typeof window.allCoordAffectations !== 'undefined' ? window.allCoordAffectations : [];
                affectationsData.forEach(a => {
                    const name = (a.agentNom || '').toLowerCase();
                    const site = (a.siteNom || '').toLowerCase();
                    if (name.includes(q) || site.includes(q)) {
                        results.push({ type: 'Affectation', icon: '🏢', text: (a.agentNom||'') + ' - ' + (a.siteNom||''), tab: 'affectations', action: () => { if(typeof showTab==='function') showTab('affectations'); searchInput.value=''; searchDropdown.classList.add('hidden'); }});
                    }
                });

                // Search Entreprises
                const entreprisesData = typeof window.entreprises !== 'undefined' ? window.entreprises : [];
                entreprisesData.forEach(ent => {
                    if ((ent.nom||'').toLowerCase().includes(q)) {
                        results.push({ type: 'Entreprise', icon: '🏢', text: ent.nom, tab: 'entreprises', action: () => { if(typeof showTab==='function') showTab('entreprises'); searchInput.value=''; searchDropdown.classList.add('hidden'); }});
                    }
                });
                
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
