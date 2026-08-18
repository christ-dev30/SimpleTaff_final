import { apiFetch, logout, checkAuth } from '/shared/api.js';
        window.logout = logout;
        window.apiFetch = apiFetch;


        if (!checkAuth()) {
            window.location.href = '/vitrine/login.html';
        }

        const currentRole = localStorage.getItem('userRole');
        if (currentRole !== 'ROLE_ADMIN_ENTREPRISE') {
            if (currentRole === 'ROLE_SUPER_ADMIN') {
                window.location.href = '/super-admin/';
            } else if (currentRole === 'ROLE_COORDONNATEUR') {
                window.location.href = '/coordonnateur/';
            } else if (currentRole === 'ROLE_EMPLOYEUR') {
                window.location.href = '/employeur/';
            } else {
                logout();
            }
            throw new Error('Redirection vers l espace autorise.');
        }



        // NOTE: window.showTab est défini dans le <head> pour éviter les ReferenceErrors
        // au chargement initial. Il appelle les fonctions via typeof window.loadXxx === 'function'.


        // QR Code Modal Helper
        window.zoomQr = function(agentNom, codeQr) {
            document.getElementById('qrModalTitle').textContent = `Badge QR Code — ${agentNom}`;
            document.getElementById('qrModalImg').src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${codeQr}`;
            document.getElementById('qrModal').classList.remove('hidden');
        };
        window.closeQrModal = function() {
            document.getElementById('qrModal').classList.add('hidden');
        };

        // Calculations Modal Helper
        window.openCalculModal = function() {
            document.getElementById('calculModal').classList.remove('hidden');
        };
        window.openFactureModal = function() {
            document.getElementById('factureModal').classList.remove('hidden');
        };
        window.closeFactureModal = function() {
            document.getElementById('factureModal').classList.add('hidden');
        };


        // Load Overview
        async function loadOverview() {
            try {
                const config = await apiFetch('/admin/entreprise/config');
                if (config) {
                    const enterpriseNameDisplay = document.getElementById('enterpriseNameDisplay');
                    if (enterpriseNameDisplay) enterpriseNameDisplay.textContent = config.nom || '-';
                }
                
                
                checkContractExpirations();
                
                // Donezo Layout: Populate Chart
                if (typeof allAffectations !== 'undefined' || typeof allAgents !== 'undefined') {
                    const dataSource = (typeof allAffectations !== 'undefined' && allAffectations.length) ? allAffectations : ((typeof allAgents !== 'undefined') ? allAgents : []);
                    const countByJob = {};
                    dataSource.forEach(a => {
                        const job = (a.poste || a.emploi || a.titre || 'Autre').substring(0, 3).toUpperCase();
                        countByJob[job] = (countByJob[job] || 0) + 1;
                    });
                    
                    const sortedJobs = Object.keys(countByJob).sort((a,b) => countByJob[b] - countByJob[a]).slice(0, 4);
                    if (sortedJobs.length > 0) {
                        const maxCount = countByJob[sortedJobs[0]];
                        const totalJobs = Object.values(countByJob).reduce((sum, val) => sum + val, 0) || 1;
                        
                        const barsContainer = document.getElementById('chartBarsContainer');
                        const labelsContainer = document.getElementById('chartLabelsContainer');
                        
                        if (barsContainer && labelsContainer) {
                            barsContainer.innerHTML = sortedJobs.map((job, idx) => {
                                const count = countByJob[job];
                                const percent = Math.round((count / totalJobs) * 100);
                                const heightPct = Math.max(15, Math.floor((count / maxCount) * 100));
                                const colorClass = idx === 0 ? 'bg-[#12312E]' : (idx === 1 ? 'bg-[#A3D977]' : 'bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#e2e8f0_2px,#e2e8f0_4px)]');
                                return `
                                <div class="w-full ${colorClass} rounded-full relative group" style="height: ${heightPct}%" title="${count} (${percent}%)">
                                    <div class="absolute -top-7 left-1/2 -translate-x-1/2 bg-white border border-slate-200 text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap text-slate-800">${percent}%</div>
                                </div>`;
                            }).join('');
                            
                            labelsContainer.innerHTML = sortedJobs.map(job => `<span>${job}</span>`).join('');
                        }
                    }
                }

                const stats = await apiFetch('/dashboard/admin') || {};
                document.getElementById('statOverviewAgents').textContent = stats.totalAgents ?? '0';
                document.getElementById('statOverviewPostes').textContent = stats.totalPostes ?? '0';
                document.getElementById('statOverviewAffectations').textContent = stats.totalAffectationsActives ?? '0';

                // Load recent affectations
                try {
                    const affectations = await apiFetch('/admin/affectations') || [];
                    const tbody = document.getElementById('overviewAffectationsTable');
                    if (tbody) {
                        if (!affectations || affectations.length === 0) {
                            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-6 text-center text-slate-400">Aucune affectation récente.</td></tr>';
                        } else {
                            tbody.innerHTML = affectations.slice(0, 6).map(a => {
                                const initials = (a.agentNom || 'A').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
                                const isActif = a.statut === 'ACTIVE' || a.statut === 'EN_COURS';
                                const badgeClass = isActif ? 'bg-emerald-100 text-emerald-700 font-bold' : 'bg-slate-100 text-slate-600 font-semibold';
                                return `
                                    <tr class="hover:bg-slate-50/70 transition-colors">
                                        <td class="px-5 py-3">
                                            <div class="flex items-center gap-2.5">
                                                <div class="w-7 h-7 rounded-full bg-sky-600 text-white font-extrabold flex items-center justify-center text-[10px] shadow-xs">${initials}</div>
                                                <span class="font-bold text-slate-900">${a.agentNom || '—'}</span>
                                            </div>
                                        </td>
                                        <td class="px-5 py-3 text-slate-600 font-medium">${a.posteLibelle || '—'}</td>
                                        <td class="px-5 py-3 text-slate-500">${a.siteNom || '—'}</td>
                                        <td class="px-5 py-3 text-slate-500">${a.dateDebut || '—'}</td>
                                        <td class="px-5 py-3"><span class="badge ${badgeClass}">${isActif ? '🟢 Active' : (a.statut || '—')}</span></td>
                                    </tr>`;
                            }).join('');
                        }
                    }
                } catch(e) { console.error('Error overview affectations:', e); }

                // Load today's pointages stream
                try {
                    const pointages = await apiFetch('/pointages/today') || [];
                    const ptStat = document.getElementById('statOverviewPointages');
                    if (ptStat) ptStat.textContent = pointages.length;

                    const tbodyPt = document.getElementById('overviewPointagesTable');
                    if (tbodyPt) {
                        if (!pointages || pointages.length === 0) {
                            tbodyPt.innerHTML = '<tr><td colspan="4" class="px-6 py-6 text-center text-slate-400">Aucun pointage aujourd\'hui.</td></tr>';
                        } else {
                            tbodyPt.innerHTML = pointages.slice(0, 6).map(p => {
                                const agentName = p.agentNom || 'Agent';
                                const initials = agentName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
                                const isSortie = !!p.dateHeureSortie;
                                const timeStr = p.dateHeureEntree ? new Date(p.dateHeureEntree).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—';
                                return `
                                    <tr class="hover:bg-slate-50/70 transition-colors">
                                        <td class="px-5 py-3">
                                            <div class="flex items-center gap-2">
                                                <div class="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-[9px]">${initials}</div>
                                                <span class="font-bold text-slate-800">${agentName}</span>
                                            </div>
                                        </td>
                                        <td class="px-5 py-3">
                                            ${isSortie ? '<span class="badge bg-rose-100 text-rose-700 font-bold">🔴 Sortie</span>' : '<span class="badge bg-emerald-100 text-emerald-700 font-bold">🟢 Entrée</span>'}
                                        </td>
                                        <td class="px-5 py-3 font-mono text-slate-600 font-medium">${timeStr}</td>
                                        <td class="px-5 py-3 text-slate-500">${p.siteNom || '—'}</td>
                                    </tr>`;
                            }).join('');
                        }
                    }
                } catch(e) { console.error('Error overview pointages:', e); }

            } catch(e) {
                console.error(e);
            }
        }

        // Load Organisation (Zones & Coordonnateurs)
        async function loadOrg() {
            try {
                // Get Zones
                const zones = await apiFetch('/organisation/zones');
                const zoneTbody = document.getElementById('zonesTableBody');
                zoneTbody.innerHTML = zones.map(z => {
                    const villesStr = (Array.isArray(z.villes) && z.villes.length > 0) ? z.villes.join(', ') : (z.perimetre || '—');
                    return `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="p-2 font-bold">${z.nom}</td>
                        <td class="p-2 text-slate-700 font-medium">${villesStr}</td>
                        <td class="p-2 text-slate-500">${z.description || '—'}</td>
                        <td class="p-2"><button onclick="deleteZone('${z.id}')" class="text-red-500 hover:underline">Supprimer</button></td>
                    </tr>`;
                }).join('') || '<tr><td colspan="4" class="p-3 text-center text-slate-400">Aucune zone.</td></tr>';

                // Populate Dropdown for Coordonnateurs
                const coordZoneSelect = document.getElementById('coordZoneSelect');
                coordZoneSelect.innerHTML = '<option value="">Associer à une zone (Optionnel)</option>' +
                    zones.map(z => `<option value="${z.id}">${z.nom}</option>`).join('');

                // Get Coordonnateurs
                const coords = await apiFetch('/organisation/coordonnateurs');
                const coordTbody = document.getElementById('coordsTableBody');
                coordTbody.innerHTML = coords.map(c => `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="p-2 font-bold">${c.nom} ${c.prenom}</td>
                        <td class="p-2 text-slate-500">${c.email}</td>
                        <td class="p-2"><span class="badge bg-slate-100 text-slate-600">${c.zoneNom || 'Non assigné'}</span></td>
                        <td class="p-2 flex gap-2"><button onclick="resetCoordPassword('${c.id}')" class="text-sky-500 hover:underline">Réinit. MDP</button><button onclick="deleteCoord('${c.id}')" class="text-red-500 hover:underline">Supprimer</button></td>
                    </tr>`).join('') || '<tr><td colspan="4" class="p-3 text-center text-slate-400">Aucun coordonnateur.</td></tr>';
            } catch(e) {
                console.error(e);
            }
        }

        window.deleteZone = async function(id) {
            if (!confirm("Supprimer cette zone ?")) return;
            try {
                await apiFetch(`/organisation/zones/${id}`, { method: 'DELETE' });
                loadOrg();
            } catch (e) { alert(e.message); }
        };

        window.deleteCoord = async function(id) {
            if (!confirm("Supprimer ce coordonnateur ?")) return;
            try {
                await apiFetch(`/organisation/coordonnateurs/${id}`, { method: 'DELETE' });
                loadOrg();
            } catch (e) { alert(e.message); }
        };

        window.resetCoordPassword = async function(id) {
            const newPassword = prompt("Entrez le nouveau mot de passe (min 8 caractères):");
            if (!newPassword) return;
            if (newPassword.length < 8) { alert("Le mot de passe doit contenir au moins 8 caractères."); return; }
            try {
                await apiFetch(`/organisation/coordonnateurs/${id}/password`, {
                    method: 'PUT',
                    body: JSON.stringify({ motDePasse: newPassword })
                });
                alert("Mot de passe réinitialisé avec succès.");
            } catch (e) { alert(e.message); }
        };

        // State for dynamic city selection in zone creation
        window.selectedZoneCities = [];

        window.addCityToZone = function(cityName) {
            const trimmed = cityName ? cityName.trim() : '';
            if (!trimmed) return;

            // Avoid duplicate cities
            if (!window.selectedZoneCities.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
                window.selectedZoneCities.push(trimmed);
                renderSelectedZoneCities();
            }
        };

        window.removeCityFromZone = function(cityName) {
            window.selectedZoneCities = window.selectedZoneCities.filter(c => c !== cityName);
            renderSelectedZoneCities();
        };

        window.renderSelectedZoneCities = function() {
            const container = document.getElementById('selectedCitiesContainer');
            if (!container) return;

            if (window.selectedZoneCities.length === 0) {
                container.innerHTML = '<span class="text-xs text-slate-400 w-full text-center py-1" id="noCitiesPlaceholder">Aucune ville ajoutée</span>';
                return;
            }

            container.innerHTML = window.selectedZoneCities.map(city => {
                const escapedCity = city.replace(/'/g, "\\'");
                return `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 shadow-xs">
                        📍 ${city}
                        <button type="button" onclick="removeCityFromZone('${escapedCity}')" class="hover:text-rose-600 font-black ml-0.5" title="Retirer ${city}">×</button>
                    </span>
                `;
            }).join('');
        };

        window.addSelectedCityFromInput = function() {
            const input = document.getElementById('zoneVilleInput');
            if (input && input.value) {
                addCityToZone(input.value);
                input.value = '';
            }
        };

        document.getElementById('addZoneForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            
            if (window.selectedZoneCities.length === 0) {
                alert("Veuillez sélectionner au moins une ville pour cette zone.");
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Création...';
            try {
                const selectedVilles = [...window.selectedZoneCities];
                const perimetreVal = document.getElementById('zonePerimetre').value.trim() || selectedVilles.join(', ');

                await apiFetch('/organisation/zones', {
                    method: 'POST',
                    body: JSON.stringify({
                        nom: document.getElementById('zoneNom').value.trim(),
                        description: document.getElementById('zoneDescription').value.trim(),
                        villes: selectedVilles,
                        perimetre: perimetreVal
                    })
                });
                form.reset();
                window.selectedZoneCities = [];
                renderSelectedZoneCities();
                loadOrg();
            } catch (err) {
                alert(err.message || "Impossible de créer la zone.");
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Créer la zone';
            }
        });

        document.getElementById('addCoordForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await apiFetch('/organisation/coordonnateurs', {
                    method: 'POST',
                    body: JSON.stringify({
                        nom: document.getElementById('coordNom').value,
                        prenom: document.getElementById('coordPrenom').value,
                        email: document.getElementById('coordEmail').value,
                        motDePasse: document.getElementById('coordPassword').value,
                        zoneId: document.getElementById('coordZoneSelect').value || null
                    })
                });
                document.getElementById('addCoordForm').reset();
                loadOrg();
            } catch (err) { alert(err.message); }
        });

        // Global Agent Data Cache
        let allAgents = [];
        window.currentFolderAgentId = null;
        window.currentActiveContractId = null;

        // Load Catalogue & Agents
        async function loadCatalog() {
            try {
                // Get Emplois
                const emplois = await apiFetch('/organisation/emplois');
                const emploiTbody = document.getElementById('emploisTableBody');
                if (emploiTbody) {
                    emploiTbody.innerHTML = emplois.map(e => `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="p-2 font-bold">${e.libelle}</td>
                            <td class="p-2 text-slate-500">${e.salaireBrutReference} FCFA</td>
                            <td class="p-2 flex gap-2">
                                <button onclick="previewJobContractTemplate('${e.libelle}', ${e.salaireBrutReference})" class="text-brand-600 hover:underline font-semibold">Aperçu Modèle</button>
                                <span class="text-slate-300">|</span>
                                <button onclick="deleteEmploi('${e.id}')" class="text-red-500 hover:underline">Supprimer</button>
                            </td>
                        </tr>`).join('') || '<tr><td colspan="3" class="p-3 text-center text-slate-400">Catalogue vide.</td></tr>';
                }

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

                // Fetch zones for agents creation and filters
                const zones = await apiFetch('/organisation/zones');
                
                const agentZoneSelect = document.getElementById('agentZoneSelect');
                if (agentZoneSelect) {
                    agentZoneSelect.innerHTML = '<option value="">Sélectionner sa zone</option>' +
                        zones.map(z => `<option value="${z.id}">${z.nom}</option>`).join('');
                }
                
                const mAgentZoneSelect = document.getElementById('mAgentZoneSelect');
                if (mAgentZoneSelect) {
                    mAgentZoneSelect.innerHTML = '<option value="">Sélectionner sa zone...</option>' +
                        zones.map(z => `<option value="${z.id}">${z.nom}</option>`).join('');
                }

                const filterZoneSelect = document.getElementById('filterAgentZoneSelect');
                if (filterZoneSelect) {
                    filterZoneSelect.innerHTML = '<option value="">Toutes les zones</option>' +
                        zones.map(z => `<option value="${z.id}">${z.nom}</option>`).join('');
                }

                // Get Agents
                const agents = await apiFetch('/agents');
                allAgents = agents || [];
                filterAgents();

            } catch(e) {
                console.error(e);
            }
        }

        window.filterAgents = function() {
            const searchVal = document.getElementById('searchAgentInput').value.toLowerCase().trim();
            const zoneId = document.getElementById('filterAgentZoneSelect').value;
            
            const activeList = allAgents.filter(a => a.statut !== 'EN_ATTENTE_CONTRAT_SIGNE' && a.statut !== 'EN_ATTENTE_FINALISATION_ADMIN');
            const filtered = activeList.filter(a => {
                const matchesSearch = !searchVal || 
                    (a.nom && a.nom.toLowerCase().includes(searchVal)) ||
                    (a.prenom && a.prenom.toLowerCase().includes(searchVal)) ||
                    (a.contact && a.contact.toLowerCase().includes(searchVal)) ||
                    (a.matricule && a.matricule.toLowerCase().includes(searchVal));
                    
                const matchesZone = !zoneId || (a.zoneId === zoneId || a.zoneNom === document.getElementById('filterAgentZoneSelect').options[document.getElementById('filterAgentZoneSelect').selectedIndex].text);
                
                return matchesSearch && matchesZone;
            });

            const agentsTbody = document.getElementById('agentsTableBody');
            if (agentsTbody) {
                agentsTbody.innerHTML = filtered.map(a => {
                    let photoSrc = a.photoUrl || a.photo || a.urlPhoto;
                    if (photoSrc && !photoSrc.startsWith('http') && !photoSrc.startsWith('/') && !photoSrc.startsWith('data:')) {
                        photoSrc = '/' + photoSrc;
                    }
                    const initial = (a.nom || 'A')[0].toUpperCase();
                    const avatarHtml = photoSrc 
                        ? `<img src="${photoSrc}" data-initial="${initial}" class="w-8 h-8 rounded-full object-cover border border-slate-200" onerror="fallbackAvatar(this)">` 
                        : `<span class="inline-flex w-8 h-8 rounded-full bg-slate-200 items-center justify-center text-slate-500 font-bold text-xs">${initial}</span>`;

                    return `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="p-2 text-slate-500 font-mono text-xs">${a.matricule || '—'}</td>
                        <td class="p-2">${avatarHtml}</td>
                        <td class="p-2 font-bold text-slate-800">${a.nom || ''} ${a.prenom || ''}</td>
                        <td class="p-2 text-slate-500">${a.contact || '—'}</td>
                        <td class="p-2 text-slate-500">${a.zoneNom || '—'}</td>`;
                }).map((rowHtml, idx) => {
                    const a = filtered[idx];
                    return rowHtml + `
                        <td class="p-2">
                            <div class="flex items-center gap-1.5">
                                <button onclick="zoomQr('${a.nom} ${a.prenom}', '${a.codeQr}', '${a.zoneNom}')" class="flex items-center gap-1 text-sky-600 hover:text-sky-800 font-bold text-xs border border-sky-200 bg-sky-50 px-2 py-1 rounded-lg">
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=20x20&data=${encodeURIComponent(a.codeQr || '')}" class="w-4 h-4 border rounded" />
                                    QR
                                </button>
                                <button onclick="generateAdminBadgePdf('${a.nom} ${a.prenom}', '${a.codeQr}', '${a.zoneNom}')" class="flex items-center gap-1 text-violet-600 hover:text-violet-800 font-bold text-xs border border-violet-200 bg-violet-50 px-2 py-1 rounded-lg">
                                    PDF
                                </button>
                                <button onclick="printAdminBadge('${a.nom} ${a.prenom}', '${a.codeQr}', '${a.zoneNom}')" class="flex items-center gap-1 text-slate-600 hover:text-slate-800 font-bold text-xs border border-slate-200 bg-slate-50 px-2 py-1 rounded-lg">
                                    🖨️
                                </button>
                            </div>
                        </td>
                        <td class="p-2">
                            <button onclick="openAgentFolder('${a.id}')" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-2 py-1 rounded-lg text-xs border border-indigo-200">
                                Voir dossier
                            </button>
                        </td>
                        <td class="p-2">
                            <button onclick="deleteAgent('${a.id}')" class="text-red-500 hover:underline">Supprimer</button>
                        </td>
                    </tr>`;
                }).join('') || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucun agent enregistré.</td></tr>';
            }

            const pendingList = allAgents.filter(a => a.statut === 'EN_ATTENTE_CONTRAT_SIGNE' || a.statut === 'EN_ATTENTE_FINALISATION_ADMIN');
            const badge = document.getElementById('enrolementQueueBadge');
            if (badge) {
                badge.textContent = pendingList.length;
                if (pendingList.length > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
            renderEnrolementAgents(pendingList);
        };

        window.deleteAgent = async function(id) {
            if (!confirm("Attention: La suppression de cet agent est irréversible et supprimera également toutes ses pièces justificatives, ses contrats, ses affectations de matériel et ses cartes de pointage. Voulez-vous continuer ?")) {
                return;
            }
            try {
                await apiFetch(`/agents/${id}`, { method: 'DELETE' });
                alert("Agent et toutes ses dépendances supprimés avec succès !");
                loadCatalog();
            } catch (e) { alert(e.message); }
        };

        window.deleteEmploi = async function(id) {
            if (!confirm("Supprimer cet emploi ?")) return;
            try {
                await apiFetch(`/organisation/emplois/${id}`, { method: 'DELETE' });
                loadCatalog();
            } catch (e) { alert(e.message); }
        };


        // ─── Modal Ajouter Agent Tab Toggling & Submission ──────────────
        function resetAddAgentModal() {
            const form = document.getElementById('modalAddAgentForm');
            if (form) form.reset();
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
        
        async function loadModalZones() {
            const zoneSelect = document.getElementById('agentZoneSelect');
            if (!zoneSelect) return;
            const zones = window.allZones || await apiFetch('/organisation/zones') || [];
            zoneSelect.innerHTML = '<option value="">Aucune (Optionnel)</option>' +
                zones.map(z => `<option value="${z.id}">${z.nom}</option>`).join('');
        }

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
                    document.getElementById(hiddenInputId).value = res.url;
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

        // Bind all registration inputs
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

        // Bind sanction file input
        uploadAndBindFile('sanctionFile', 'sanctionFileStatus', 'sanctionDecisionUrl');

        // Bind enrollment finalization contract file input
        uploadAndBindFile('feContratFile', 'feContratStatus', 'feContratUrl');

        // Register form submission
        document.getElementById('modalAddAgentForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
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
                // 1. Create agent
                const resAgent = await apiFetch('/agents', {
                    method: 'POST',
                    headers: {
                        'Idempotency-Key': window.agentCreationIdempotencyKey
                    },
                    body: JSON.stringify(payload)
                });

                const agentId = resAgent.agentId;

                // 2. Save pieces justificatives
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

                // 3. Create pending contract if emploi selected="selected" in tab 4
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
                document.getElementById('modalAddAgentForm').reset();
                
                // Clear state
                piecesTypes.forEach(type => {
                    const statusSpan = document.getElementById(`status-${type}`);
                    if (statusSpan) statusSpan.textContent = "Non fourni";
                    document.getElementById(`url-${type}`).value = "";
                });
                document.getElementById('mAgentPhotoUrl').value = "";
                document.getElementById('mAgentPhotoStatus').textContent = "Aucune photo sélectionnée";
                const previewContainer = document.getElementById('mAgentPhotoPreviewContainer');
                if (previewContainer) previewContainer.classList.add('hidden');

                closeAddAgentModal();
                loadCatalog();
            } catch (err) {
                alert(err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Créer le dossier complet';
            }
        });

        // ─── Sub-tabs switching & finalization queue logic ──────────────
        window.switchPersonnelSubTab = function(tab) {
            const btnActifs = document.getElementById('subTabBtn-agents-actifs');
            const btnEnrol = document.getElementById('subTabBtn-agents-enrolement');
            const secActifs = document.getElementById('agentsActifsSection');
            const secEnrol = document.getElementById('agentsEnrolementSection');
            if (!btnActifs || !btnEnrol || !secActifs || !secEnrol) return;

            if (tab === 'actifs') {
                btnActifs.className = "px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 shadow-sm bg-white text-indigo-700 ring-1 ring-slate-200";
                btnEnrol.className = "px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 flex items-center gap-1.5";
                secActifs.classList.remove('hidden');
                secEnrol.classList.add('hidden');
            } else {
                btnActifs.className = "px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 text-slate-500 hover:text-slate-700 hover:bg-slate-200/50";
                btnEnrol.className = "px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 shadow-sm bg-white text-indigo-700 ring-1 ring-slate-200 flex items-center gap-1.5";
                secActifs.classList.add('hidden');
                secEnrol.classList.remove('hidden');
            }
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
                            ${a.statut === 'EN_ATTENTE_FINALISATION_ADMIN'
                                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">Création par coordonnateur</span>`
                                : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Contrat en attente</span>`}
                        </td>
                        <td class="p-2 flex flex-wrap gap-1 items-center">
                            <button onclick="openAgentFolder('${a.id}')" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-2 py-1 rounded-lg text-xs border border-indigo-200">
                                Voir dossier
                            </button>
                            ${a.statut === 'EN_ATTENTE_FINALISATION_ADMIN'
                                ? `<button onclick="openFinaliserAgentAdminModal('${a.id}')" class="bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold px-2 py-1 rounded-lg text-xs border border-purple-200">
                                    Finaliser
                                </button>`
                                : `<button onclick="openFinalizeEnrollmentModal('${a.id}')" class="bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold px-2 py-1 rounded-lg text-xs border border-sky-200">
                                    Finaliser & Activer
                                </button>`}
                            <button onclick="deleteAgent('${a.id}')" class="text-red-500 hover:underline text-xs ml-2">Supprimer</button>
                        </td>
                    </tr>`).join('') || '<tr><td colspan="6" class="p-3 text-center text-slate-400">Aucun agent en cours d\'enrôlement.</td></tr>';
            }
        };

        window.filterEnrolementAgents = function() {
            const pendingList = allAgents.filter(a => a.statut === 'EN_ATTENTE_CONTRAT_SIGNE' || a.statut === 'EN_ATTENTE_FINALISATION_ADMIN');
            renderEnrolementAgents(pendingList);
        };

        window.openFinalizeEnrollmentModal = async function(agentId) {
            document.getElementById('feAgentId').value = agentId;
            document.getElementById('feDateDebut').value = new Date().toISOString().split('T')[0];
            document.getElementById('feHeureArrivee').value = "08:00";
            document.getElementById('feHeureDepart').value = "18:00";
            try { document.getElementById('feContratFile').value = ""; } catch (e) {}
            document.getElementById('feContratUrl').value = "";
            document.getElementById('feContratStatus').textContent = "";
            
            const agent = allAgents.find(a => a.id === agentId);
            const feCreatorInfo = document.getElementById('feCreatorInfo');
            if (agent && agent.createdByCoordonnateurNomPrenom) {
                const creatorName = agent.createdByCoordonnateurNomPrenom;
                const creatorEmail = agent.createdByCoordonnateurEmail ? ` (${agent.createdByCoordonnateurEmail})` : '';
                document.getElementById('feCreatorNameEmail').textContent = `${creatorName}${creatorEmail}`;
                feCreatorInfo.classList.remove('hidden');
            } else {
                feCreatorInfo.classList.add('hidden');
            }

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

        window.openFinaliserAgentAdminModal = async function(agentId) {
            const agent = allAgents.find(a => a.id === agentId);
            if (!agent) return;
            
            document.getElementById('finaliserAdminAgentId').value = agentId;
            document.getElementById('finaliserAdminNomPrenom').textContent = `${agent.nom || ''} ${agent.prenom || ''}`;
            document.getElementById('finaliserAdminContact').textContent = agent.contact || 'Non renseigné';
            document.getElementById('finaliserAdminZone').textContent = agent.zoneNom || 'Non renseignée';
            const creatorName = agent.createdByCoordonnateurNomPrenom || 'Inconnu';
            const creatorEmail = agent.createdByCoordonnateurEmail ? ` (${agent.createdByCoordonnateurEmail})` : '';
            document.getElementById('finaliserAdminCreator').textContent = `${creatorName}${creatorEmail}`;
            
            document.getElementById('finaliserAgentAdminModal').classList.remove('hidden');
        };

        window.closeFinaliserAgentAdminModal = function() {
            document.getElementById('finaliserAgentAdminModal').classList.add('hidden');
        };

        window.submitFinaliserAgentAdmin = async function() {
            const agentId = document.getElementById('finaliserAdminAgentId').value;
            const btn = document.getElementById('btnSubmitFinaliserAdmin');
            const origText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Validation...';
            
            try {
                const response = await apiFetch(`/agents/${agentId}/finaliser`, { method: 'POST' });
                if (window.showToast) window.showToast("Création finalisée avec succès. L'agent est maintenant en attente de contrat.", "success");
                closeFinaliserAgentAdminModal();
                loadCatalog(); // refresh agents
            } catch (err) {
                alert("Erreur lors de la finalisation : " + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = origText;
            }
        };

        document.getElementById('finalizeEnrollmentForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const origText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Finalisation...';

            const agentId = document.getElementById('feAgentId').value;
            const dateDebut = document.getElementById('feDateDebut').value;
            const dateFin = document.getElementById('feDateFin').value || null;
            const heureDebut = document.getElementById('feHeureArrivee').value;
            const heureFin = document.getElementById('feHeureDepart').value;
            const documentUrl = document.getElementById('feContratUrl').value;
            const siteId = document.getElementById('feSiteSelect')?.value || '';

            try {
                if (!documentUrl) {
                    throw new Error("Veuillez d'abord téléverser le contrat signé.");
                }

                // Utilise /contrats/agent/{id} (route correcte par agent)
                let pendingContrat = null;
                try {
                    const contracts = await apiFetch('/contrats/agent/' + agentId);
                    pendingContrat = (contracts || []).find(c =>
                        c.statut === 'EN_ATTENTE_CONTRAT_SIGNE'
                        || c.statut === 'EN_COURS'
                        || c.statut === 'BROUILLON'
                    ) || (contracts && contracts[0]) || null;
                } catch (contractErr) {
                    console.warn('Aucun contrat via /agent/ :', contractErr.message);
                }

                // Si toujours pas de contrat, tente l'endpoint générique
                if (!pendingContrat) {
                    try {
                        const allContracts = await apiFetch('/contrats?agentId=' + agentId);
                        pendingContrat = (allContracts || [])[0] || null;
                    } catch (_) {}
                }

                if (pendingContrat) {
                    await apiFetch(`/contrats/${pendingContrat.id}/finaliser`, {
                        method: 'POST',
                        body: JSON.stringify({ dateDebut, dateFin, documentUrl })
                    });
                } else {
                    // Fallback : activer l'agent en créant un contrat initial avec le document
                    await apiFetch(`/contrats`, {
                        method: 'POST',
                        body: JSON.stringify({ agentId, type: 'CDI', dateDebut, dateFin, documentUrl, statut: 'ACTIF' })
                    });
                }

                if (siteId) {
                    await apiFetch('/admin/affectations', {
                        method: 'POST',
                        body: JSON.stringify({ siteId, agentId, dateDebut, dateFin, heureDebut, heureFin })
                    });
                }

                showToast("L'enrôlement a été finalisé ! L'agent est désormais ACTIF.", 'success');
                closeFinalizeEnrollmentModal();
                loadCatalog();
                if (typeof loadOrg === 'function') loadOrg();
                if (typeof loadPostesAndAff === 'function') loadPostesAndAff();
            } catch (err) {
                console.error(err);
                alert('Erreur finalisation : ' + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = origText;
            }
        });

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

        // ─── Modal Dossier Agent Tab & CRUD Handlers ───────────────────
        window.openAgentFolder = async function(agentId) {
            window.currentFolderAgentId = agentId;
            
            const a = allAgents.find(x => x.id === agentId);
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
                
                // Refresh cache
                const agents = await apiFetch('/agents');
                allAgents = agents || [];
                filterAgents();
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

                const structures = await apiFetch('/organisation/structures') || [];
                const structSelect = document.getElementById('fcStructureCliente');
                if (structSelect) {
                    structSelect.innerHTML = '<option value="">Choisir la structure...</option>' +
                        structures.map(s => `<option value="${s.id}">${s.raisonSociale}</option>`).join('');
                }

                const emplois = await apiFetch('/organisation/emplois') || [];
                window.folderContractJobs = emplois;
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
                    activeContainer.innerHTML = '<div class="text-center text-slate-400 py-4 font-semibold text-xs">Aucun contrat actif pour cet agent.</div>';
                    createContainer.classList.remove('hidden');
                    renewContainer.classList.add('hidden');
                    renewalsTbody.innerHTML = '<tr><td colspan="5" class="p-2 text-center text-slate-400">Aucun historique.</td></tr>';
                    window.currentActiveContractId = null;
                    return;
                }

                const activeC = contrats[0];
                window.currentActiveContractId = activeC.id;
                
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
                    <div class="grid grid-cols-1 md:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
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
                    ${activeC.documentUrl ? `
                        <div class="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                            <a href="${activeC.documentUrl}" target="_blank" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
                                <i class="fa-solid fa-file-pdf"></i> Voir le contrat scanné
                            </a>
                        </div>
                    ` : ''}
                    ${activeC.type === 'CDD' && activeC.statut === 'ACTIF' ? `
                        <div class="mt-4 flex justify-end">
                            <button onclick="document.getElementById('renewContractFormContainer').classList.remove('hidden')" class="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs px-3 py-1.5 rounded-lg font-bold">
                                Renouveler le CDD
                            </button>
                        </div>
                    ` : ''}
                `;

                createContainer.classList.add('hidden');

                const renewals = await apiFetch(`/contrats/${activeC.id}/renouvellements`);
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

            } catch (err) { console.error(err); }
        }

        document.getElementById('folderCreateContractForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Création...';
            try {
                const agentId = window.currentFolderAgentId;
                const funcSelect = document.getElementById('fcFonctionSelect');
                const selectedFunctionName = funcSelect && funcSelect.selectedIndex >= 0 ? funcSelect.options[funcSelect.selectedIndex].text : '';

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
                document.getElementById('folderCreateContractForm')?.reset();
                document.getElementById('fcDocumentUrl').value = "";
                loadFolderContract();
            } catch (err) { alert(err.message); }
            finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Générer & Activer le Contrat';
            }
        });

        document.getElementById('folderRenewContractForm')?.addEventListener('submit', async (e) => {
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
                document.getElementById('folderRenewContractForm').reset();
                document.getElementById('frDocumentUrl').value = "";
                
                document.getElementById('renewContractFormContainer').classList.add('hidden');
                loadFolderContract();
            } catch (err) { alert(err.message); }
            finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirmer le renouvellement';
            }
        });

        async function loadFolderHardware() {
            const agentId = window.currentFolderAgentId;
            try {
                const affectations = await apiFetch(`/materiels/agent/${agentId}`);
                const tbody = document.getElementById('folderHardwareTableBody');
                
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

                const allMateriels = await apiFetch('/materiels');
                const select = document.getElementById('newHardwareSelect');
                const disponibles = (allMateriels || []).filter(m => m.statut === 'DISPONIBLE');
                
                if (disponibles.length === 0) {
                    select.innerHTML = '<option value="">Aucun matériel disponible dans l\'inventaire...</option>';
                } else {
                    select.innerHTML = '<option value="">Choisir un matériel à assigner...</option>' +
                        disponibles.map(m => `<option value="${m.id}">${m.categorie} - ${m.libelle} (S/N: ${m.numeroSerie || '—'})</option>`).join('');
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
            btn.disabled = true;
            btn.textContent = 'En cours...';
            
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
                loadMateriel();
            } catch (err) { alert(err.message); }
            finally {
                btn.disabled = false;
                btn.textContent = 'Valider la remise';
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
                loadMateriel();
            } catch (err) { alert(err.message); }
        };


        // Load Clients & Sites
        async function loadClients() {
            try {
                // Get Structures
                const structures = await apiFetch('/organisation/structures');
                const structuresTbody = document.getElementById('structuresTableBody');
                structuresTbody.innerHTML = structures.map(s => `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="p-2 font-bold">${s.raisonSociale}</td>
                        <td class="p-2"><button onclick="deleteStructure('${s.id}')" class="text-red-500 hover:underline">Supprimer</button></td>
                    </tr>`).join('') || '<tr><td colspan="2" class="p-3 text-center text-slate-400">Aucun client.</td></tr>';

                // Populate Dropdowns for Sites & Employeurs
                const siteStructSelect = document.getElementById('siteStructSelect');
                siteStructSelect.innerHTML = '<option value="">Sélectionner le Client</option>' +
                    structures.map(s => `<option value="${s.id}">${s.raisonSociale}</option>`).join('');

                const empStructSelect = document.getElementById('empStructSelect');
                empStructSelect.innerHTML = '<option value="">Lier au Client</option>' +
                    structures.map(s => `<option value="${s.id}">${s.raisonSociale}</option>`).join('');

                const zones = await apiFetch('/organisation/zones');
                const siteZoneSelect = document.getElementById('siteZoneSelect');
                siteZoneSelect.innerHTML = '<option value="">Associer à une Zone</option>' +
                    zones.map(z => `<option value="${z.id}">${z.nom}</option>`).join('');

                // Get Sites
                const sites = await apiFetch('/organisation/sites');
                const sitesTbody = document.getElementById('sitesTableBody');
                sitesTbody.innerHTML = sites.map(s => `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="p-2 font-bold">${s.nom}</td>
                        <td class="p-2 text-slate-500">${s.structureNom}</td>
                        <td class="p-2 text-slate-500">${s.zoneNom}</td>
                        <td class="p-2"><button onclick="deleteSite('${s.id}')" class="text-red-500 hover:underline">Supprimer</button></td>
                    </tr>`).join('') || '<tr><td colspan="4" class="p-3 text-center text-slate-400">Aucun site.</td></tr>';

                // Sites checklist in employeurs form
                const empSitesCheckboxList = document.getElementById('empSitesCheckboxList');
                empSitesCheckboxList.innerHTML = sites.map(s => `
                    <label class="flex items-center gap-2">
                        <input type="checkbox" name="empSites" value="${s.id}"> ${s.nom} (${s.structureNom})
                    </label>
                `).join('') || '<div class="text-slate-400">Aucun site créé</div>';

                // Get Employeurs
                const employeurs = await apiFetch('/organisation/employeurs');
                const employeursTbody = document.getElementById('employeursTableBody');
                employeursTbody.innerHTML = employeurs.map(emp => `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="p-2 font-bold">${emp.nom} ${emp.prenom}</td>
                        <td class="p-2 text-slate-500">${emp.structureNom}</td>
                        <td class="p-2 text-slate-500">${emp.sites.join(', ') || '—'}</td>
                        <td class="p-2 flex gap-2"><button onclick="resetEmployeurPassword('${emp.id}')" class="text-sky-500 hover:underline">Réinit. MDP</button><button onclick="deleteEmployeur('${emp.id}')" class="text-red-500 hover:underline">Supprimer</button></td>
                    </tr>`).join('') || '<tr><td colspan="4" class="p-3 text-center text-slate-400">Aucun compte employeur.</td></tr>';
            } catch(e) {
                console.error(e);
            }
        }

        window.deleteStructure = async function(id) {
            if (!confirm("Supprimer ce client ?")) return;
            try {
                await apiFetch(`/organisation/structures/${id}`, { method: 'DELETE' });
                loadClients();
            } catch (e) { alert(e.message); }
        };

        window.deleteSite = async function(id) {
            if (!confirm("Supprimer ce site ?")) return;
            try {
                await apiFetch(`/organisation/sites/${id}`, { method: 'DELETE' });
                loadClients();
            } catch (e) { alert(e.message); }
        };

        window.deleteEmployeur = async function(id) {
            if (!confirm("Supprimer ce compte employeur ?")) return;
            try {
                await apiFetch(`/organisation/employeurs/${id}`, { method: 'DELETE' });
                loadClients();
            } catch (e) { alert(e.message); }
        };

        window.resetEmployeurPassword = async function(id) {
            const newPassword = prompt("Entrez le nouveau mot de passe (min 8 caractères):");
            if (!newPassword) return;
            if (newPassword.length < 8) { alert("Le mot de passe doit contenir au moins 8 caractères."); return; }
            try {
                await apiFetch(`/organisation/employeurs/${id}/password`, {
                    method: 'PUT',
                    body: JSON.stringify({ motDePasse: newPassword })
                });
                alert("Mot de passe réinitialisé avec succès.");
            } catch (e) { alert(e.message); }
        };

        document.getElementById('addStructureForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await apiFetch('/organisation/structures', {
                    method: 'POST',
                    body: JSON.stringify({
                        raisonSociale: document.getElementById('structRaisonSociale').value,
                        secteur: document.getElementById('structSecteur').value,
                        besoinsRecurrents: document.getElementById('structBesoins').checked
                    })
                });
                document.getElementById('addStructureForm')?.reset();
                loadClients();
            } catch (err) { alert(err.message); }
        });

        document.getElementById('addSiteForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await apiFetch('/organisation/sites', {
                    method: 'POST',
                    body: JSON.stringify({
                        nom: document.getElementById('siteNom').value,
                        adresse: document.getElementById('siteAdresse').value,
                        structureId: document.getElementById('siteStructSelect').value,
                        zoneId: document.getElementById('siteZoneSelect').value
                    })
                });
                document.getElementById('addSiteForm')?.reset();
                loadClients();
            } catch (err) { alert(err.message); }
        });

        document.getElementById('addEmployeurForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const checkedSites = Array.from(document.querySelectorAll('input[name="empSites"]:checked')).map(cb => cb.value);
            try {
                await apiFetch('/organisation/employeurs', {
                    method: 'POST',
                    body: JSON.stringify({
                        nom: document.getElementById('empNom').value,
                        prenom: document.getElementById('empPrenom').value,
                        email: document.getElementById('empEmail').value,
                        motDePasse: document.getElementById('empPassword').value,
                        structureId: document.getElementById('empStructSelect').value,
                        siteIds: checkedSites
                    })
                });
                document.getElementById('addEmployeurForm').reset();
                loadClients();
            } catch (err) { alert(err.message); }
        });

        let allStructures = [];
        let allSites = [];
        let allEmployeurs = [];
        let filteredSites = [];
        let filteredEmployeurs = [];

        function setupAutocomplete(inputId, dropdownId, hiddenId, dataList, displayKey, onSelect) {
            const input = document.getElementById(inputId);
            const dropdown = document.getElementById(dropdownId);
            const hidden = document.getElementById(hiddenId);

            if (!input || !dropdown) return;

            // Remove existing event listeners by cloning
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);

            newInput.addEventListener('focus', () => {
                filterAndShow(newInput, dropdown, hidden, dataList, displayKey, onSelect);
            });

            newInput.addEventListener('input', () => {
                filterAndShow(newInput, dropdown, hidden, dataList, displayKey, onSelect);
            });

            document.addEventListener('click', (e) => {
                if (!newInput.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            });
        }

        function filterAndShow(input, dropdown, hidden, dataList, displayKey, onSelect) {
            const val = input.value.trim().toLowerCase();
            const filtered = dataList.filter(item => {
                const text = (item[displayKey] || '').toString().toLowerCase();
                return text.includes(val);
            });

            if (filtered.length === 0) {
                dropdown.innerHTML = '<div class="p-2 text-xs text-slate-400">Aucun résultat</div>';
            } else {
                dropdown.innerHTML = filtered.map(item => {
                    let sub = "";
                    if (input.id === 'affSiteInput' && item.structureNom) {
                        sub = ` <span class="text-[10px] text-slate-400">(${item.structureNom})</span>`;
                    } else if (input.id === 'affEmployeurInput' && item.prenom) {
                        sub = ` <span class="text-[10px] text-slate-400">(${item.prenom} ${item.nom} - ${item.email})</span>`;
                    }
                    return `<div class="p-2 text-xs hover:bg-slate-50 cursor-pointer text-slate-700 transition-colors border-b border-slate-100/50" data-id="${item.id}" data-value="${item[displayKey]}">
                        ${item[displayKey]}${sub}
                    </div>`;
                }).join('');
            }
            dropdown.classList.remove('hidden');

            // Add click handlers
            dropdown.querySelectorAll('[data-id]').forEach(el => {
                el.addEventListener('click', () => {
                    const selId = el.getAttribute('data-id');
                    const selVal = el.getAttribute('data-value');
                    input.value = selVal;
                    hidden.value = selId;
                    dropdown.classList.add('hidden');
                    if (onSelect) onSelect(selId, selVal);
                });
            });
        }

        // Load Postes & Affectations (Site-based Affectations)
        async function loadPostesAndAff() {
            try {
                // Populate Agents Dropdown (only Active ones)
                const agents = await apiFetch('/agents') || [];
                const activeAgents = agents.filter(a => a.statut === 'ACTIF');
                const affAgentSelect = document.getElementById('affAgentSelect');
                if (affAgentSelect) {
                    affAgentSelect.innerHTML = '<option value="">Choisir un Agent *</option>' +
                        activeAgents.map(a => `<option value="${a.id}">${a.nom} ${a.prenom}</option>`).join('');
                }

                // Fetch autocomplete datasets
                allStructures = await apiFetch('/organisation/structures') || [];
                allSites = await apiFetch('/organisation/sites') || [];
                allEmployeurs = await apiFetch('/organisation/employeurs') || [];

                // Initialize Autocomplete widgets
                setupAutocomplete('affEntrepriseInput', 'affEntrepriseDropdown', 'affEntrepriseId', allStructures, 'raisonSociale', (selectedId) => {
                    const siteInput = document.getElementById('affSiteInput');
                    const empInput = document.getElementById('affEmployeurInput');

                    siteInput.disabled = false;
                    siteInput.classList.remove('bg-slate-100/50');
                    siteInput.value = '';
                    document.getElementById('affSiteId').value = '';
                    
                    const zoneInput = document.getElementById('affZoneInput');
                    if (zoneInput) zoneInput.value = '';
                    const villeInput = document.getElementById('affVilleInput');
                    if (villeInput) villeInput.value = '';

                    empInput.disabled = false;
                    empInput.classList.remove('bg-slate-100/50');
                    empInput.value = '';
                    document.getElementById('affEmployeurEmail').value = '';

                    // Filter
                    filteredSites = allSites.filter(s => s.structureId === selectedId);
                    filteredEmployeurs = allEmployeurs.filter(e => e.structureId === selectedId);

                    // Re-bind autocomplete with filtered data
                    setupAutocomplete('affSiteInput', 'affSiteDropdown', 'affSiteId', filteredSites, 'nom', (selectedSiteId) => {
                        const site = filteredSites.find(s => s.id === selectedSiteId);
                        if (site) {
                            document.getElementById('affZoneInput').value = site.zoneNom || '—';
                            document.getElementById('affVilleInput').value = site.adresse || '—';
                        }
                    });
                    setupAutocomplete('affEmployeurInput', 'affEmployeurDropdown', 'affEmployeurEmail', filteredEmployeurs, 'email');
                });

                // Get Affectations
                const affectations = await apiFetch('/admin/affectations') || [];
                const affTbody = document.getElementById('affectationsTableBody');
                if (affTbody) {
                    affTbody.innerHTML = affectations.map(a => {
                        const agentName = a.agentNom || (a.agent ? `${a.agent.nom || ''} ${a.agent.prenom || ''}`.trim() : '') || 'Agent';
                        
                        // Site & Zone mapping
                        const siteIdFromPoste = (a.poste && a.poste.site) ? a.poste.site.id : null;
                        const foundSite = siteIdFromPoste ? allSites.find(s => s.id === siteIdFromPoste) : null;
                        const siteName = foundSite ? foundSite.nom : (a.siteNom || a.siteTravail || (a.site ? a.site.nom : 'Site non attribué'));
                        const posteName = a.posteLibelle || (a.poste ? a.poste.libelle : (a.agent ? a.agent.fonction : '')) || 'Agent Terrain';
                        
                        const zoneName = foundSite && foundSite.zoneNom ? foundSite.zoneNom : (a.zoneOperationnelle || a.zoneNom || (a.site && (a.site.zoneNom || (a.site.zone ? a.site.zone.nom : ''))) || (a.agent && a.agent.zoneNom) || 'Non définie');
                        const villeName = foundSite && foundSite.ville ? foundSite.ville : (a.ville || (a.site && (a.site.ville || a.site.adresse)) || (a.agent && a.agent.ville) || 'Non définie');
                        
                        // Supervisor mapping
                        const supervisorId = a.employeurResponsable || a.superviseur;
                        const foundEmp = supervisorId ? allEmployeurs.find(e => e.id === supervisorId || e.email === supervisorId) : null;
                        let supervisorName = '—';
                        if (foundEmp) {
                            supervisorName = `${foundEmp.nom || ''} ${foundEmp.prenom || ''}`.trim() || foundEmp.email;
                        } else if (a.employeur) {
                            supervisorName = `${a.employeur.nom || ''} ${a.employeur.prenom || ''}`.trim();
                        } else if (supervisorId && !supervisorId.includes('-')) {
                            supervisorName = supervisorId;
                        }

                        const hDebut = a.heureDebut || a.heureArriveeSite || a.heureArrivee || '08:00';
                        const hFin = a.heureFin || a.heureDepartSite || a.heureDepart || '18:00';

                        // Client Structure
                        const clientName = a.structureCliente && a.structureCliente !== '—' ? a.structureCliente : (a.client || 'Client Inconnu');

                        return `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="p-2 font-bold text-slate-800">${agentName}<div class="font-normal text-xs text-slate-500">${posteName}</div></td>
                            <td class="p-2 text-slate-700 font-medium">${clientName} <div class="text-xs text-slate-500">Site: ${siteName}</div></td>
                            <td class="p-2 text-slate-500"><span class="font-bold text-slate-700">${zoneName}</span> <span class="text-slate-400">(${villeName})</span></td>
                            <td class="p-2 text-slate-500">${supervisorName}</td>
                            <td class="p-2 text-slate-500 font-mono text-xs"><span class="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">${hDebut} - ${hFin}</span></td>
                            <td class="p-2 text-slate-500"><div class="font-medium text-emerald-600">Début: ${a.dateDebut || '—'}</div><div class="font-medium text-rose-500">Fin: ${a.dateFin || 'Indéterminée'}</div></td>
                            <td class="p-2"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${a.statut === 'ACTIVE' || !a.statut ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}">${a.statut || 'ACTIVE'}</span></td>
                            <td class="p-2">
                                ${a.statut === 'ACTIVE' || !a.statut ? `<button onclick="cloturerAff('${a.id}')" class="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 font-bold transition-colors">Clôturer</button>` : '—'}
                            </td>
                        </tr>`;
                    }).join('') || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucune affectation.</td></tr>';
                }
            } catch(e) {
                console.error(e);
            }
        }

        window.cloturerAff = async function(id) {
            if (!confirm("Clôturer cette affectation ?")) return;
            try {
                await apiFetch(`/admin/affectations/${id}/cloturer`, {
                    method: 'POST',
                    body: JSON.stringify({
                        motif: 'FIN_CONTRAT',
                        dateFin: new Date().toISOString().split('T')[0]
                    })
                });
                loadPostesAndAff();
            } catch (e) { alert(e.message); }
        };

        document.getElementById('addAffForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const payload = {
                    siteId: document.getElementById('affSiteId').value,
                    agentId: document.getElementById('affAgentSelect').value,
                    dateDebut: document.getElementById('affDateDebut').value,
                    employeurResponsable: document.getElementById('affEmployeurEmail').value,
                    heureDebut: document.getElementById('affHeureDebut').value,
                    heureFin: document.getElementById('affHeureFin').value
                };

                await apiFetch('/admin/affectations', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                document.getElementById('addAffForm').reset();

                // Reset inputs and values
                document.getElementById('affEntrepriseId').value = '';
                document.getElementById('affSiteId').value = '';
                document.getElementById('affEmployeurEmail').value = '';
                
                const siteInput = document.getElementById('affSiteInput');
                siteInput.disabled = true;
                siteInput.classList.add('bg-slate-100/50');
                
                const empInput = document.getElementById('affEmployeurInput');
                empInput.disabled = true;
                empInput.classList.add('bg-slate-100/50');

                loadPostesAndAff();
            } catch (err) { alert(err.message); }
        });


        // Load Config & Paie
        async function loadPaieAndConfig() {
            try {
                // Get config
                const config = await apiFetch('/admin/entreprise/config');
                if (config) {
                    const configTauxCotisation = document.getElementById('configTauxCotisation');
                    if (configTauxCotisation) configTauxCotisation.value = config.tauxCotisation || '0.00';
                    const configSeuilAbsence = document.getElementById('configSeuilAbsence');
                    if (configSeuilAbsence) configSeuilAbsence.value = config.seuilAbsenceLongueJours || '21';
                    const configTauxRetenue = document.getElementById('configTauxRetenue');
                    if (configTauxRetenue) configTauxRetenue.value = config.tauxRetenueReduite || '25.00';
                    
                    const enterpriseNameDisplay = document.getElementById('enterpriseNameDisplay');
                    if (enterpriseNameDisplay) enterpriseNameDisplay.textContent = config.nom || '—';
                }

                // Populate Dropdown for manual calcul
                const calcAffSelect = document.getElementById('calcAffSelect');
                if (calcAffSelect) {
                    const affectations = await apiFetch('/admin/affectations') || [];
                    calcAffSelect.innerHTML = '<option value="">Choisir l\'Affectation</option>' +
                        affectations.filter(a => a.statut === 'ACTIVE').map(a => `<option value="${a.id}">${a.agentNom} — ${a.posteLibelle}</option>`).join('');
                }

                // Populate Dropdown for client structures
                const factureStructSelect = document.getElementById('factureStructSelect');
                if (factureStructSelect) {
                    const structures = await apiFetch('/organisation/structures') || [];
                    factureStructSelect.innerHTML = '<option value="">Choisir la Structure Cliente</option>' +
                        structures.map(s => `<option value="${s.id}">${s.raisonSociale}</option>`).join('');
                }

                // Get bulletins
                const bulletinsTbody = document.getElementById('bulletinsTableBody');
                if (bulletinsTbody) {
                    const bulletins = await apiFetch('/paie/bulletins') || [];
                    bulletinsTbody.innerHTML = bulletins.map(b => `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="p-3 font-bold">${b.periode}</td>
                            <td class="p-3 font-semibold text-slate-800">${b.agentNom}</td>
                            <td class="p-3 text-slate-600">${b.salaireNetCalcule} FCFA</td>
                            <td class="p-3 text-slate-500">${b.joursValides} jours / abs non-just: ${b.joursAbsNonJust}</td>
                            <td class="p-3"><span class="badge ${b.statutPaiement === 'PAYE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${b.statutPaiement}</span></td>
                            <td class="p-3">
                                ${b.statutPaiement === 'EN_ATTENTE' ? `<button onclick="payerBulletin('${b.id}')" class="bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 rounded text-xs font-bold">Marquer Payé</button>` : '—'}
                            </td>
                        </tr>`).join('') || '<tr><td colspan="6" class="p-3 text-center text-slate-400">Aucun bulletin de paie émis.</td></tr>';
                }

                // Get factures
                const facturesTbody = document.getElementById('facturesTableBody');
                if (facturesTbody) {
                    const factures = await apiFetch('/paie/factures') || [];
                    facturesTbody.innerHTML = factures.map(f => `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="p-3 text-slate-500">${f.dateEmission.split('T')[0]}</td>
                            <td class="p-3 font-bold">${f.periode}</td>
                            <td class="p-3 font-semibold text-slate-800">${f.clientNom}</td>
                            <td class="p-3 text-slate-600 font-bold">${f.montantFacture} FCFA</td>
                            <td class="p-3"><span class="badge ${f.statutPaiement === 'PAYE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}">${f.statutPaiement}</span></td>
                            <td class="p-3">
                                ${f.statutPaiement === 'EN_ATTENTE' ? `<button onclick="payerFacture('${f.id}')" class="bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 rounded text-xs font-bold">Encaisser</button>` : '—'}
                            </td>
                        </tr>`).join('') || '<tr><td colspan="6" class="p-3 text-center text-slate-400">Aucune facture émise.</td></tr>';
                }

                // Get prime rules
                const primeRulesTbody = document.getElementById('primeRulesTableBody');
                if (primeRulesTbody) {
                    try {
                        const primeRules = await apiFetch('/primes/rendement/regles') || [];
                        primeRulesTbody.innerHTML = primeRules.map(r => `
                            <tr>
                                <td class="p-1 font-semibold">${r.libelle}</td>
                                <td class="p-1 text-slate-600">${r.montantParPoint} FCFA</td>
                                <td class="p-1 text-slate-500">${r.seuilMinimum} pts</td>
                            </tr>
                        `).join('') || '<tr><td colspan="3" class="p-1 text-center text-slate-400">Aucune règle.</td></tr>';
                    } catch (e) {
                        console.error("Erreur chargement règles primes", e);
                    }
                }

            } catch(e) {
                console.error(e);
            }
        }

        window.payerBulletin = async function(id) {
            try {
                await apiFetch(`/paie/bulletins/${id}/payer`, { method: 'POST' });
                loadPaieAndConfig();
            } catch(e) { alert(e.message); }
        };

        window.payerFacture = async function(id) {
            try {
                await apiFetch(`/paie/factures/${id}/payer`, { method: 'POST' });
                loadPaieAndConfig();
            } catch(e) { alert(e.message); }
        };

        document.getElementById('updateConfigForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await apiFetch('/admin/entreprise/config', {
                    method: 'PUT',
                    body: JSON.stringify({
                        tauxCotisation: document.getElementById('configTauxCotisation').value,
                        seuilAbsenceLongueJours: parseInt(document.getElementById('configSeuilAbsence').value, 10),
                        tauxRetenueReduite: document.getElementById('configTauxRetenue').value
                    })
                });
                alert("Règles de paie mises à jour !");
                loadPaieAndConfig();
            } catch(err) { alert(err.message); }
        });

        document.getElementById('calculBulletinForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await apiFetch('/paie/bulletins/generer', {
                    method: 'POST',
                    body: JSON.stringify({
                        affectationId: document.getElementById('calcAffSelect').value,
                        periode: document.getElementById('calcPeriode').value,
                        joursPrevus: parseInt(document.getElementById('calcJoursPrevus').value, 10),
                        joursValides: parseInt(document.getElementById('calcJoursValides').value, 10),
                        joursAbsJustCourte: parseInt(document.getElementById('calcAbsJustCourte').value || '0', 10),
                        joursAbsJustLongue: parseInt(document.getElementById('calcAbsJustLongue').value || '0', 10),
                        joursAbsNonJust: parseInt(document.getElementById('calcAbsNonJust').value || '0', 10),
                        joursCongePaye: parseInt(document.getElementById('calcConges').value || '0', 10)
                    })
                });
                closeCalculModal();
                document.getElementById('calculBulletinForm').reset();
                loadPaieAndConfig();
            } catch(err) { alert(err.message); }
        });

        document.getElementById('genererFactureForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await apiFetch('/paie/factures/generer', {
                    method: 'POST',
                    body: JSON.stringify({
                        structureId: document.getElementById('factureStructSelect').value,
                        periode: document.getElementById('facturePeriode').value,
                        montant: parseFloat(document.getElementById('factureMontant').value),
                        rapportUrl: document.getElementById('factureRapportUrl').value || null
                    })
                });
                closeFactureModal();
                document.getElementById('genererFactureForm').reset();
                loadPaieAndConfig();
            } catch(err) { alert(err.message); }
        });

        document.getElementById('addPrimeRuleForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await apiFetch('/primes/rendement/regles', {
                    method: 'POST',
                    body: JSON.stringify({
                        libelle: document.getElementById('primeLibelle').value,
                        montantParPoint: parseFloat(document.getElementById('primeMontantParPoint').value),
                        seuilMinimum: parseInt(document.getElementById('primeSeuilMinimum').value, 10),
                        statut: 'ACTIF'
                    })
                });
                document.getElementById('addPrimeRuleForm').reset();
                loadPaieAndConfig();
            } catch(err) { alert(err.message); }
        });

        document.getElementById('simulatePrimeForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const res = await apiFetch('/primes/rendement/simuler', {
                    method: 'POST',
                    body: JSON.stringify({
                        score: parseInt(document.getElementById('simScore').value, 10),
                        montantParPoint: document.getElementById('simMontantParPoint').value || "0",
                        seuilMinimum: document.getElementById('simSeuilMinimum').value || "0"
                    })
                });
                const resultDiv = document.getElementById('simPrimeResult');
                if (resultDiv) {
                    resultDiv.classList.remove('hidden');
                    resultDiv.innerHTML = `
                        <div class="font-bold text-slate-800">Résultat de la simulation :</div>
                        <div>Règle appliquée : <strong>${res.regleAssociee}</strong></div>
                        <div>Seuil appliqué : <strong>${res.seuilMinimumApplique} points</strong></div>
                        <div>Montant / point : <strong>${res.montantParPointApplique} FCFA</strong></div>
                        <div class="mt-1 text-sm font-extrabold text-indigo-700">Prime calculée : ${res.montantCalcule} FCFA</div>
                    `;
                }
            } catch(err) { alert(err.message); }
        });

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

        document.addEventListener('DOMContentLoaded', () => {
            if (!checkAuth()) { window.location.href = '/vitrine/login.html'; return; }
            document.getElementById('affDateDebut').value = new Date().toISOString().split('T')[0];
            
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const presMoisInput = document.getElementById('presencesMois');
            if (presMoisInput) {
                presMoisInput.value = currentMonth;
                presMoisInput.addEventListener('change', loadPresences);
            }

            loadOverview();
            loadNotifications();
            setInterval(loadNotifications, 30000);

            // Form submit handlers for Sanction and Evaluation
            document.getElementById('addSanctionForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = e.target.querySelector('button[type="submit"]');
                const origText = btn.textContent;
                btn.disabled = true;
                btn.textContent = 'Enregistrement...';
                try {
                    const agentId = document.getElementById('sanctionAgentSelect').value;
                    const type = document.getElementById('sanctionType').value;
                    const dateFin = document.getElementById('sanctionDateFin').value || null;
                    const motif = document.getElementById('sanctionMotif').value;
                    const decisionUrl = document.getElementById('sanctionDecisionUrl').value || null;

                    await apiFetch('/disciplinaire/sanctions', {
                        method: 'POST',
                        body: JSON.stringify({ agentId, type, dateFin, motif, decisionUrl })
                    });

                    alert('Sanction enregistrée avec succès !');
                    e.target.reset();
                    document.getElementById('sanctionDecisionUrl').value = '';
                    const statusSpan = document.getElementById('sanctionFileStatus');
                    if (statusSpan) statusSpan.textContent = '';
                    loadDisciplinaire();
                } catch (err) {
                    console.error(err);
                    alert('Erreur lors de l\'enregistrement de la sanction : ' + err.message);
                } finally {
                    btn.disabled = false;
                    btn.textContent = origText;
                }
            });

            document.getElementById('addEvaluationForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = e.target.querySelector('button[type="submit"]');
                const origText = btn.textContent;
                btn.disabled = true;
                btn.textContent = 'Enregistrement...';
                try {
                    const agentId = document.getElementById('evalAgentSelect').value;
                    const annee = parseInt(document.getElementById('evalAnnee').value);
                    const ponctualite = parseInt(document.getElementById('evalPonctualite').value);
                    const discipline = parseInt(document.getElementById('evalDiscipline').value);
                    const qualite = parseInt(document.getElementById('evalQualite').value);
                    const productivite = parseInt(document.getElementById('evalProductivite').value);
                    const espritEquipe = parseInt(document.getElementById('evalEspritEquipe').value);
                    const respectProcedures = parseInt(document.getElementById('evalRespectProcedures').value);
                    const satisfactionClient = parseInt(document.getElementById('evalSatisfactionClient').value);
                    const communication = parseInt(document.getElementById('evalCommunication').value);
                    const commentaire = document.getElementById('evalCommentaire').value;

                    await apiFetch('/evaluations', {
                        method: 'POST',
                        body: JSON.stringify({
                            agentId, annee, ponctualite, discipline, qualite,
                            productivite, espritEquipe, respectProcedures,
                            satisfactionClient, communication, commentaire
                        })
                    });

                    alert('Évaluation de performance enregistrée avec succès !');
                    e.target.reset();
                    loadEvaluations();
                } catch (err) {
                    console.error(err);
                    alert('Erreur lors de l\'enregistrement de l\'évaluation : ' + err.message);
                } finally {
                    btn.disabled = false;
                    btn.textContent = origText;
                }
            });

            // Setup geographic list restriction validations
            setupGeographicValidation('mAgentLieuNaissance', 'villes-ci-list', 'Lieu de naissance');
            setupGeographicValidation('mAgentVille', 'villes-ci-list', 'Ville');
            setupGeographicValidation('mAgentCommune', 'communes-abidjan-list', 'Commune');

            // Setup Enter key and selection listener for zone city input
            const zoneVilleInput = document.getElementById('zoneVilleInput');
            if (zoneVilleInput) {
                zoneVilleInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addSelectedCityFromInput();
                    }
                });
                zoneVilleInput.addEventListener('change', (e) => {
                    const val = e.target.value.trim();
                    if (!val) return;
                    const datalist = document.getElementById('villes-ci-list');
                    if (datalist && Array.from(datalist.options).some(opt => opt.value.toLowerCase() === val.toLowerCase())) {
                        addCityToZone(val);
                        e.target.value = '';
                    }
                });
            }
        });

        function safeRenderTbody(tbody, html) {
            if (!tbody) return;
            tbody.innerHTML = html;
        }

        async function loadContrats() {
            try {
                
                checkContractExpirations();
                
                // Donezo Layout: Populate Chart
                if (typeof allAffectations !== 'undefined' || typeof allAgents !== 'undefined') {
                    const dataSource = (typeof allAffectations !== 'undefined' && allAffectations.length) ? allAffectations : ((typeof allAgents !== 'undefined') ? allAgents : []);
                    const countByJob = {};
                    dataSource.forEach(a => {
                        let job = (a.poste || a.emploi || a.titre || 'Autre').trim();
                        // Capitalize the first letter and make the rest lowercase for consistent grouping
                        job = job.charAt(0).toUpperCase() + job.slice(1).toLowerCase();
                        countByJob[job] = (countByJob[job] || 0) + 1;
                    });
                    
                    const sortedJobs = Object.keys(countByJob).sort((a,b) => countByJob[b] - countByJob[a]).slice(0, 4);
                    if (sortedJobs.length > 0) {
                        const maxCount = countByJob[sortedJobs[0]];
                        const totalJobs = Object.values(countByJob).reduce((sum, val) => sum + val, 0) || 1;
                        
                        const barsContainer = document.getElementById('chartBarsContainer');
                        const labelsContainer = document.getElementById('chartLabelsContainer');
                        
                        if (barsContainer && labelsContainer) {
                            barsContainer.innerHTML = sortedJobs.map((job, idx) => {
                                const count = countByJob[job];
                                const percent = Math.round((count / totalJobs) * 100);
                                const heightPct = Math.max(15, Math.floor((count / maxCount) * 100));
                                const colorClass = idx === 0 ? 'bg-[#12312E]' : (idx === 1 ? 'bg-[#A3D977]' : 'bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#e2e8f0_2px,#e2e8f0_4px)]');
                                return `
                                <div class="w-full ${colorClass} rounded-full relative group" style="height: ${heightPct}%" title="${count} (${percent}%)">
                                    <div class="absolute -top-7 left-1/2 -translate-x-1/2 bg-white border border-slate-200 text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap text-slate-800">${percent}%</div>
                                </div>`;
                            }).join('');
                            
                            labelsContainer.innerHTML = sortedJobs.map(job => `<span class="truncate max-w-[60px]" title="${job}">${job}</span>`).join('');
                        }
                    }
                }

                const contrats = await apiFetch('/contrats');
                safeRenderTbody(document.getElementById('contratsTableBody'),
                    (contrats || []).map(c => {
                        const agentId = c.agentId || (c.agent && c.agent.id) || '';
                        const agentNom = c.agentNom || (c.agent ? (c.agent.nom + ' ' + c.agent.prenom) : '-');
                        const dateFinDisplay = c.dateFin
                            ? `<span class="text-rose-600 font-semibold">${c.dateFin}</span>`
                            : `<span class="text-slate-400">—</span>`;
                        const structureDisplay = c.structureCliente || '<span class="text-slate-400">—</span>';
                        const siteDisplay = c.siteNom || '<span class="text-slate-400">—</span>';
                        const docBtn = agentId ? `<button onclick="openAgentFolder('${agentId}');setTimeout(()=>switchFolderTab('contract'),400)" class="text-sky-600 hover:underline font-bold text-xs flex items-center gap-1">Voir contrat</button> <button onclick="openAgentFolder('${agentId}');setTimeout(()=>switchFolderTab('contract'),400);setTimeout(()=>document.getElementById('renewContractFormContainer').classList.remove('hidden'),500)" class="text-indigo-600 hover:underline font-bold text-xs flex items-center gap-1 ml-2">Renouveler</button>` : (c.documentUrl ? `<a href="${c.documentUrl}" target="_blank" class="text-sky-600 hover:underline font-bold text-xs">PDF</a>` : '-');
                        return `<tr class="hover:bg-slate-50/50 transition-colors"><td class="p-2 font-bold text-slate-800">${agentNom}</td><td class="p-2 text-slate-500">${c.type||'-'}</td><td class="p-2 text-slate-500">${c.dateDebut||'-'}</td><td class="p-2">${dateFinDisplay}</td><td class="p-2 text-slate-600 font-medium">${structureDisplay}</td><td class="p-2 text-slate-500">${siteDisplay}</td><td class="p-2"><span class="badge ${c.statut==='ACTIF'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-600'}">${c.statut||'-'}</span></td><td class="p-2 flex gap-2">${docBtn}</td></tr>`;
                    }).join('') || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucun contrat.</td></tr>'
                );
                } catch (e) {
                console.error(e);
                safeRenderTbody(document.getElementById('contratsTableBody'), '<tr><td colspan="8" class="p-3 text-center text-red-500">Erreur chargement contrats</td></tr>');
            }
        }

        window.checkContractExpirations = async function() {
            try {
                // Fetch contracts expiring in the next 90 days
                
                const list = await apiFetch('/contrats/expirations?jours=90') || [];
                
                // Donezo Layout Integration
                if (list.length > 0) {
                    const c = list[0]; // Take the most urgent
                    const agentNameDisplay = document.getElementById('reminderAgentName');
                    const dateDisplay = document.getElementById('reminderDate');
                    const btnDisplay = document.getElementById('reminderBtn');
                    
                    if (agentNameDisplay) agentNameDisplay.textContent = 'Renouvellement ' + (c.agentNom || 'Agent');
                    if (dateDisplay) dateDisplay.textContent = 'Date Limite : ' + c.dateFin;
                    if (btnDisplay) btnDisplay.onclick = function() { openAgentFolder(c.agentId || c.agent?.id); setTimeout(()=>switchFolderTab('contract'),400); };
                } else {
                    const agentNameDisplay = document.getElementById('reminderAgentName');
                    const dateDisplay = document.getElementById('reminderDate');
                    if (agentNameDisplay) agentNameDisplay.textContent = 'Aucun renouvellement';
                    if (dateDisplay) dateDisplay.textContent = 'Tout est à jour !';
                }

                const renderAlerts = (containerId) => {
                    const container = document.getElementById(containerId);
                    if (!container) return;
                    
                    if (list.length === 0) {
                        container.innerHTML = '';
                        container.classList.add('hidden');
                        return;
                    }
                    
                    container.innerHTML = list.map(c => {
                        // Calculate days remaining
                        const expiryDate = new Date(c.dateFin);
                        const today = new Date();
                        const timeDiff = expiryDate.getTime() - today.getTime();
                        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
                        
                        // Decide color scheme
                        const isUrgent = daysRemaining <= 60; // 2 months or less
                        const cardBg = isUrgent ? 'bg-red-50/90 border-red-200 text-red-900' : 'bg-amber-50/90 border-amber-200 text-amber-900';
                        const iconColor = isUrgent ? 'text-red-500' : 'text-amber-500';
                        const btnColor = isUrgent ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white';
                        const labelEcheance = isUrgent ? '⏳ ≤ 2 mois' : '⏳ 3 mois';
                        
                        return `
                            <div class="glass flex items-center justify-between p-4 rounded-xl border ${cardBg} shadow-sm transition-all duration-300">
                                <div class="flex items-center gap-3">
                                    <div class="text-xl ${iconColor}">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                    </div>
                                    <div class="text-xs">
                                        <div class="font-bold flex items-center gap-2">
                                            <span>Expiration Contrat : ${c.agentNom || 'Agent'}</span>
                                            <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${isUrgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">${labelEcheance}</span>
                                        </div>
                                        <p class="mt-0.5 opacity-90 text-[11px]">
                                            Le contrat de l'agent expire le ${c.dateFin} (dans ${daysRemaining} jours). Quelle action faut-il mener ?
                                        </p>
                                    </div>
                                </div>
                                <button onclick="openRenewContractFromAlert('${c.agentId}')" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${btnColor}">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5"/></svg>
                                    Renouveler le contrat
                                </button>
                            </div>
                        `;
                    }).join('');
                    
                    container.classList.remove('hidden');
                };
                
                renderAlerts('contractExpirationsContainerOverview');
                renderAlerts('contractExpirationsContainerContrats');
                
            } catch (e) {
                console.error("Erreur lors de la vérification des expirations de contrats:", e);
            }
        };

        window.openRenewContractFromAlert = async function(agentId) {
            await openAgentFolder(agentId);
            switchFolderTab('contract');
        };

        // ── POINTAGE HISTORY MODULE ──────────────────────────────────────
        let _allPointages = [];

        function fmtDateTime(dt) {
            if (!dt) return '—';
            try { return new Date(dt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }); }
            catch { return dt; }
        }

        function fmtDuree(min) {
            if (min == null || min === 0) return '—';
            const h = Math.floor(min / 60), m = min % 60;
            return h > 0 ? `${h}h${m.toString().padStart(2,'0')}` : `${m} min`;
        }

        function statutBadge(statut) {
            const colors = {
                VALIDE: 'bg-green-100 text-green-700',
                EN_COURS: 'bg-sky-100 text-sky-700',
                ANOMALIE: 'bg-red-100 text-red-700',
                ATTENTE: 'bg-amber-100 text-amber-700',
            };
            const cls = colors[statut] || 'bg-slate-100 text-slate-600';
            return `<span class="badge ${cls}">${statut || '—'}</span>`;
        }

        function modeBadge(mode) {
            const colors = {
                QR_CODE: 'bg-blue-100 text-blue-700',
                NFC: 'bg-purple-100 text-purple-700',
                BIOMETRIE: 'bg-green-100 text-green-700',
                MANUEL: 'bg-slate-100 text-slate-600',
            };
            const cls = colors[mode] || 'bg-slate-100 text-slate-600';
            return `<span class="badge ${cls}">${mode || '—'}</span>`;
        }

        function renderPointageRows(data) {
            const tbody = document.getElementById('pointagesTableBody');
            if (!data || data.length === 0) {
                safeRenderTbody(tbody, '<tr><td colspan="9" class="p-4 text-center text-slate-400">Aucun pointage pour cette date.</td></tr>');
                return;
            }
            safeRenderTbody(tbody, data.map(p => {
                const struct = p.structureCliente || '—';
                return `
                <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="p-3 font-semibold text-slate-800">${p.agentNom || '—'}</td>
                    <td class="p-3 text-slate-600 font-medium">${struct}</td>
                    <td class="p-3 text-slate-600">${fmtDateTime(p.dateHeureEntree)}</td>
                    <td class="p-3 text-slate-600">${fmtDateTime(p.dateHeureSortie)}</td>
                    <td class="p-3 text-slate-600 font-mono text-xs">${fmtDuree(p.dureeMinutes)}</td>
                    <td class="p-3">${modeBadge(p.mode)}</td>
                    <td class="p-3 text-slate-500">${p.siteNom || '—'}</td>
                    <td class="p-3 text-xs ${p.anomalie ? 'text-red-600 font-semibold' : 'text-slate-400'}">${p.anomalie || '—'}</td>
                    <td class="p-3">${statutBadge(p.statut)}</td>
                </tr>
            `}).join(''));
        }

        function updatePointageStats(data) {
            const total = data.length;
            const presents = data.filter(p => p.statut !== 'ANOMALIE').length;
            const anomalies = data.filter(p => p.anomalie).length;
            const durees = data.filter(p => p.dureeMinutes > 0).map(p => p.dureeMinutes);
            const avgDuree = durees.length ? Math.round(durees.reduce((a,b) => a+b, 0) / durees.length) : 0;

            document.getElementById('statTotal').textContent = total;
            document.getElementById('statPresents').textContent = presents;
            document.getElementById('statAnomalies').textContent = anomalies;
            document.getElementById('statDureeAvg').textContent = avgDuree || '—';
            document.getElementById('pointageCount').textContent = `${total} enregistrement${total > 1 ? 's' : ''}`;
        }

        function filterPointageTable() {
            const agentQ = (document.getElementById('pointageAgentFilter')?.value || '').toLowerCase();
            const modeQ = document.getElementById('pointageModeFilter')?.value || '';
            const structQ = document.getElementById('pointageStructureFilter')?.value || '';

            const filtered = _allPointages.filter(p => {
                const matchAgent = !agentQ || (p.agentNom || '').toLowerCase().includes(agentQ);
                const matchMode = !modeQ || (p.mode || '') === modeQ;
                const matchStruct = !structQ || (p.structureCliente === structQ);
                return matchAgent && matchMode && matchStruct;
            });
            renderPointageRows(filtered);
            updatePointageStats(filtered);
        }

        async function loadPointagesByDate(today = false) {
            try {
                let dateVal = document.getElementById('pointageDateFilter')?.value;
                if (today) {
                    dateVal = new Date().toISOString().split('T')[0];
                    const input = document.getElementById('pointageDateFilter');
                    if (input) input.value = dateVal;
                }
                const label = document.getElementById('pointageTableLabel');
                if (label) label.textContent = dateVal ? `Pointages du ${dateVal}` : 'Pointages du jour';

                const url = dateVal ? `/pointages?date=${dateVal}` : '/pointages/today';
                safeRenderTbody(document.getElementById('pointagesTableBody'),
                    '<tr><td colspan="8" class="p-4 text-center text-slate-400">Chargement…</td></tr>');

                _allPointages = await apiFetch(url) || [];
                
                const structFilter = document.getElementById('pointageStructureFilter');
                if (structFilter) {
                    const structs = [...new Set(_allPointages.map(p => p.structureCliente).filter(s => s && s !== '—'))];
                    const current = structFilter.value;
                    structFilter.innerHTML = '<option value="">Toutes</option>' + structs.map(s => `<option value="${s}">${s}</option>`).join('');
                    if (structs.includes(current)) structFilter.value = current;
                }

                filterPointageTable();
                // also refresh history dates
                loadPointageDates();
            } catch(e) {
                console.error('loadPointagesByDate error:', e);
                safeRenderTbody(document.getElementById('pointagesTableBody'),
                    '<tr><td colspan="8" class="p-4 text-center text-red-500">Erreur de chargement des pointages.</td></tr>');
            }
        }

        async function loadPointageDates() {
            try {
                const dates = await apiFetch('/pointages/dates') || [];
                const tbody = document.getElementById('pointageDatesBody');
                if (!dates.length) {
                    safeRenderTbody(tbody, '<tr><td colspan="3" class="p-4 text-center text-slate-400">Aucun historique disponible.</td></tr>');
                    return;
                }
                safeRenderTbody(tbody, dates.map(d => `
                    <tr class="hover:bg-slate-50/70 transition-colors">
                        <td class="p-3 font-semibold text-slate-800">${d.date || '—'}</td>
                        <td class="p-3">
                            <span class="badge bg-sky-100 text-sky-700">${d.total} pointage${d.total > 1 ? 's' : ''}</span>
                        </td>
                        <td class="p-3">
                            <button onclick="viewDatePointages('${d.date}')"
                                class="text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline transition-colors">
                                Voir le détail →
                            </button>
                        </td>
                    </tr>
                `).join(''));
            } catch(e) {
                console.error('loadPointageDates error:', e);
                safeRenderTbody(document.getElementById('pointageDatesBody'),
                    '<tr><td colspan="3" class="p-4 text-center text-red-500">Erreur de chargement de l\'historique.</td></tr>');
            }
        }

        function viewDatePointages(date) {
            const input = document.getElementById('pointageDateFilter');
            if (input) input.value = date;
            loadPointagesByDate(false);
            // Scroll to main table
            document.getElementById('pointagesTableBody')?.closest('.glass')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        async function loadPointages() {
            await loadPointagesByDate(true);
        }
        // ── END POINTAGE HISTORY MODULE ───────────────────────────────────


        async function loadPresences() {
            try {
                const mois = document.getElementById('presencesMois')?.value;
                if (!mois) {
                    safeRenderTbody(document.getElementById('presencesTableBody'), '<tr><td colspan="5" class="p-3 text-center text-slate-400">Sélectionnez un mois.</td></tr>');
                    return;
                }
                const presences = await apiFetch('/presences?mois=' + mois);
                let totalHeures = 0;
                let totalRetards = 0;
                let totalPresences = (presences || []).length;

                const rowsHtml = (presences || []).map(p => {
                    if (p.retard) totalRetards++;
                    if (p.dureeMinutes) totalHeures += p.dureeMinutes;
                    return `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="p-2 font-bold">${p.agentNom || '—'}</td>
                            <td class="p-2 text-slate-500">${p.date || '—'}</td>
                            <td class="p-2 text-slate-500">${p.heureArrivee || '—'}</td>
                            <td class="p-2 text-slate-500">${p.heureDepart || '—'}</td>
                            <td class="p-2 text-slate-500">${p.presence || '—'}</td>
                            <td class="p-2 text-slate-500">${p.siteTravail || '—'}</td>
                            <td class="p-2 text-slate-500">${p.employeur || '—'}</td>
                            <td class="p-2">${p.retard ? '<span class="badge bg-red-100 text-red-700">RETARD</span>' : '<span class="badge bg-green-100 text-green-700">OK</span>'}</td>
                        </tr>
                    `;
                }).join('');

                const hours = Math.floor(totalHeures / 60);
                const minutes = totalHeures % 60;
                const totalRowHtml = presences && presences.length > 0 ? `
                    <tr class="bg-slate-200 font-bold border-t-2 border-slate-300">
                        <td class="p-2" colspan="4">TOTAUX</td>
                        <td class="p-2">${totalPresences} présence(s)</td>
                        <td class="p-2" colspan="2">Total d'heures: ${hours}h${minutes.toString().padStart(2, '0')}</td>
                        <td class="p-2 text-red-600">${totalRetards} retard(s)</td>
                    </tr>
                ` : '';

                safeRenderTbody(document.getElementById('presencesTableBody'),
                    (rowsHtml || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucune présence.</td></tr>') + totalRowHtml
                );
            } catch (e) {
                console.error(e);
                safeRenderTbody(document.getElementById('presencesTableBody'), '<tr><td colspan="5" class="p-3 text-center text-red-500">Erreur de chargement.</td></tr>');
            }
        }

        window.exportPresences = async function(format) {
            try {
                const moisInput = document.getElementById('presencesMois');
                let mois = moisInput?.value;
                if (!mois) {
                    const now = new Date();
                    mois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    if (moisInput) moisInput.value = mois;
                }
                
                const token = localStorage.getItem('token');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                
                const response = await fetch(`/api/presences/export?format=${encodeURIComponent(format)}&mois=${encodeURIComponent(mois)}`, {
                    headers
                });
                
                if (!response.ok) {
                    throw new Error("Erreur lors de l'exportation des présences: " + response.statusText);
                }
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const isPdf = format.toLowerCase() === 'pdf';
                const ext = isPdf ? 'pdf' : 'csv';
                a.download = `presences_${mois}.${ext}`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } catch (err) {
                console.error(err);
                alert(err.message);
            }
        };

        async function loadMateriel() {
            try {
                // Populate dropdowns for zone hardware assignment
                try {
                    const zones = await apiFetch('/organisation/zones') || [];
                    const assignZoneSelect = document.getElementById('assignZoneSelect');
                    if (assignZoneSelect) {
                        assignZoneSelect.innerHTML = '<option value="">Sélectionner une zone...</option>' +
                            zones.map(z => `<option value="${z.id}">${z.nom} (${z.villes ? (Array.isArray(z.villes) ? z.villes.join(', ') : z.villes) : z.perimetre || ''})</option>`).join('');
                    }

                    const coords = await apiFetch('/organisation/coordonnateurs') || [];
                    const assignCoordSelect = document.getElementById('assignCoordSelect');
                    if (assignCoordSelect) {
                        assignCoordSelect.innerHTML = '<option value="">Aucun (Assigner à la Zone uniquement)</option>' +
                            coords.map(c => `<option value="${c.id}">${c.nom} ${c.prenom} (${c.zoneNom || 'Sans zone'})</option>`).join('');
                    }
                } catch (errPop) {
                    console.error("Erreur remplissage dropdowns assignation zone :", errPop);
                }

                // Chargement de l'inventaire
                const materiels = await apiFetch('/materiels') || [];
                const displayElem = document.getElementById('materielCountDisplay');
                if (displayElem) displayElem.textContent = `${materiels.length} équipement(s)`;

                // Populate disponible materiel select for zone assignment
                const assignZoneMaterielSelect = document.getElementById('assignZoneMaterielSelect');
                if (assignZoneMaterielSelect) {
                    const disponibles = materiels.filter(m => (m.statut || '').toUpperCase() === 'DISPONIBLE');
                    if (disponibles.length === 0) {
                        assignZoneMaterielSelect.innerHTML = '<option value="">Aucun matériel disponible...</option>';
                    } else {
                        assignZoneMaterielSelect.innerHTML = '<option value="">Choisir un matériel disponible...</option>' +
                            disponibles.map(m => `<option value="${m.id}">${m.libelle || m.nom} - S/N: ${m.numeroSerie || m.serialNumber || '—'}</option>`).join('');
                    }
                }

                safeRenderTbody(document.getElementById('materielTableBody'),
                    materiels.map(m => {
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
                        const imeiStr = m.imei ? ` / ${m.imei}` : '';

                        // Read zone and coordonnateur from nested API objects
                        const zoneText = (m.zone && m.zone.nom) ? m.zone.nom : (m.zoneNom || null);
                        const coordText = m.coordonnateur ? `${m.coordonnateur.nom || ''} ${m.coordonnateur.prenom || ''}`.trim() : (m.coordonnateurNom || null);

                        let assignmentInfo = '<span class="text-slate-400 text-xs">—</span>';
                        if (zoneText || coordText) {
                            assignmentInfo = `
                                <div class="space-y-0.5">
                                    ${zoneText ? `<div class="text-xs font-bold text-slate-700">📍 ${zoneText}</div>` : ''}
                                    ${coordText ? `<div class="text-[10px] text-sky-600 font-semibold">👤 ${coordText}</div>` : ''}
                                </div>
                            `;
                        }

                        return `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="p-3 font-bold text-slate-800">${m.libelle || m.nom || '—'}</td>
                                <td class="p-3 text-slate-600">${m.categorie || '—'}</td>
                                <td class="p-3 font-mono text-slate-600 font-semibold">${numSerie}${imeiStr}</td>
                                <td class="p-3 text-slate-700 font-bold">${val}</td>
                                <td class="p-3 text-slate-600">${assignmentInfo}</td>
                                <td class="p-3">${statusBadge}</td>
                            </tr>
                        `;
                    }).join('') || '<tr><td colspan="6" class="p-3 text-center text-slate-400">Aucun matériel dans l\'inventaire.</td></tr>'
                );

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

                // Chargement des demandes
                const demandes = await apiFetch('/materiels/demandes') || [];
                safeRenderTbody(document.getElementById('adminMaterielRequestsTable'),
                    demandes.map(d => {
                        let actionButtons = '';
                        if (d.statut === 'EN_ATTENTE') {
                            actionButtons = `
                                <div class="flex gap-2 justify-end">
                                    <button onclick="traiterDemandeMateriel('${d.id}', 'APPROUVE')" class="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2.5 rounded-lg text-xs transition-colors shadow-xs">Approuver</button>
                                    <button onclick="traiterDemandeMateriel('${d.id}', 'REFUSE')" class="bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-2.5 rounded-lg text-xs transition-colors shadow-xs">Refuser</button>
                                </div>
                            `;
                        } else {
                            actionButtons = `<span class="text-xs text-slate-400">—</span>`;
                        }

                        let statusBadge = '';
                        if (d.statut === 'APPROUVE') {
                            statusBadge = '<span class="badge bg-green-100 text-green-700 font-bold">Approuvée</span>';
                        } else if (d.statut === 'REFUSE') {
                            statusBadge = '<span class="badge bg-red-100 text-red-700 font-bold">Refusée</span>';
                        } else {
                            statusBadge = '<span class="badge bg-amber-100 text-amber-700 font-bold">En attente</span>';
                        }

                        const val = d.valeurAchat != null ? `${Number(d.valeurAchat).toFixed(2)} FCFA` : '—';
                        const numSerie = d.numeroSerie || '—';

                        // Display Coordinator and assigned Zone upon approval
                        const coordName = d.coordonnateurNom || (d.coordonnateur ? `${d.coordonnateur.nom} ${d.coordonnateur.prenom}` : '—');
                        const zoneName = d.zoneNom || d.zone || (d.coordonnateur ? d.coordonnateur.zoneNom : null);
                        
                        let coordZoneInfo = `<div class="font-semibold text-slate-700">${coordName}</div>`;
                        if (d.statut === 'APPROUVE') {
                            coordZoneInfo += `<div class="text-[10px] text-sky-600 font-bold flex items-center gap-1 mt-0.5"><i class="fa-solid fa-location-dot"></i> Zone: ${zoneName || 'Attribuee'}</div>`;
                        } else if (zoneName) {
                            coordZoneInfo += `<div class="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5"><i class="fa-solid fa-location-dot"></i> ${zoneName}</div>`;
                        }

                        return `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="p-3">${coordZoneInfo}</td>
                                <td class="p-3 font-bold text-slate-800">${d.libelle || '—'}</td>
                                <td class="p-3 text-slate-600">${d.categorie || '—'}</td>
                                <td class="p-3 font-mono text-slate-600 font-semibold">${numSerie}</td>
                                <td class="p-3 text-slate-700 font-bold">${val}</td>
                                <td class="p-3 text-slate-500 italic max-w-xs truncate" title="${d.motif || ''}">"${d.motif || 'Aucun motif'}"</td>
                                <td class="p-3">${statusBadge}</td>
                                <td class="p-3 text-right">${actionButtons}</td>
                            </tr>
                        `;
                    }).join('') || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucune demande de matériel reçue.</td></tr>'
                );
                // Chargement de l'historique d'affectation
                try {
                    const historique = await apiFetch('/materiels/historique') || [];
                    safeRenderTbody(document.getElementById('adminMaterielHistoryTable'),
                        historique.map(h => {
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
                        }).join('') || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucun historique d\'affectation.</td></tr>'
                    );
                } catch (e) {
                    console.error("Erreur historique matériel:", e);
                }
            } catch (e) {
                console.error(e);
                safeRenderTbody(document.getElementById('materielTableBody'), '<tr><td colspan="6" class="p-3 text-center text-red-500">Erreur chargement matériel</td></tr>');
            }
        }

        window.assignMaterielToZone = async function() {
            const materielId = document.getElementById('assignZoneMaterielSelect')?.value;
            const zoneId = document.getElementById('assignZoneSelect')?.value;
            const coordonnateurId = document.getElementById('assignCoordSelect')?.value || null;

            if (!materielId || !zoneId) {
                alert("Veuillez sélectionner le matériel à assigner et la zone de destination.");
                return;
            }

            try {
                // Try specific endpoint for zone assignment first
                await apiFetch(`/materiels/${materielId}/assigner-zone`, {
                    method: 'POST',
                    body: JSON.stringify({ zoneId, coordonnateurId })
                });
                alert("Matériel assigné à la zone avec succès !");
                loadMateriel();
            } catch (e) {
                try {
                    // Fallback route using remise or update
                    await apiFetch(`/materiels/${materielId}/remise`, {
                        method: 'POST',
                        body: JSON.stringify({ zoneId, coordonnateurId, signatureUrl: '' })
                    });
                    alert("Matériel assigné à la zone avec succès !");
                    loadMateriel();
                } catch (errFallback) {
                    alert("Erreur lors de l'assignation du matériel : " + errFallback.message);
                }
            }
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

        window.adminCreateMateriel = async function() {
            try {
                const libelle = document.getElementById('addMaterielLibelle').value.trim();
                const categorie = document.getElementById('addMaterielCategorie').value;
                const numeroSerie = document.getElementById('addMaterielNumeroSerie')?.value?.trim();
                const valeurAchatStr = document.getElementById('addMaterielValeurAchat')?.value;
                const valeurAchat = valeurAchatStr ? parseFloat(valeurAchatStr) : null;

                if (!libelle) {
                    alert("Veuillez renseigner le nom/libellé du matériel.");
                    return;
                }
                if (!numeroSerie) {
                    alert("Veuillez indiquer un numéro de série.");
                    return;
                }
                if (valeurAchat === null || isNaN(valeurAchat)) {
                    alert("Veuillez indiquer une valeur d'achat valide.");
                    return;
                }

                await apiFetch('/materiels', {
                    method: 'POST',
                    body: JSON.stringify({
                        libelle,
                        categorie,
                        numeroSerie,
                        valeurAchat,
                        statut: 'DISPONIBLE'
                    })
                });

                document.getElementById('addMaterielLibelle').value = '';
                if (document.getElementById('addMaterielNumeroSerie')) document.getElementById('addMaterielNumeroSerie').value = '';
                if (document.getElementById('addMaterielValeurAchat')) document.getElementById('addMaterielValeurAchat').value = '';
                
                alert("Matériel ajouté au stock avec succès !");
                loadMateriel();
            } catch (e) {
                console.error(e);
                alert('Erreur lors de la création du matériel: ' + e.message);
            }
        };

        window.declarerIncidentMateriel = async function(id, libelle) {
            const choixStatut = prompt(
                `Déclaration d'incident pour "${libelle}" :\n\n` +
                `Tapez le numéro ou le nom de l'incident :\n` +
                `1 - DEFECTUEUX (Défaut / Panne technique)\n` +
                `2 - INUTILISABLE (Hors service / Cassé irréparable)\n` +
                `3 - PERDU (Matériel perdu / égaré par un agent)\n`,
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

            const details = prompt(`Précisez les détails ou le motif de l'incident (ex: Chute lors de la mission, bouton radio cassé...) :`, "");
            if (details === null) return;

            try {
                await apiFetch(`/materiels/${id}/incident`, {
                    method: 'POST',
                    body: JSON.stringify({ statut, details: details || '' })
                });

                alert(`Incident enregistré (${statut}) ! L'état du matériel a été mis à jour.`);
                loadMateriel();
            } catch (e) {
                console.error(e);
                alert("Erreur lors de l'enregistrement de l'incident: " + (e.message || e));
            }
        };

        window.traiterDemandeMateriel = async function(id, statut) {
            try {
                await apiFetch(`/materiels/demandes/${id}/traiter`, {
                    method: 'POST',
                    body: JSON.stringify({ statut })
                });
                loadMateriel();
            } catch (e) {
                console.error(e);
                alert('Erreur lors du traitement de la demande: ' + e.message);
            }
        };

        async function loadConges() {
            try {
                // Peupler le select agents du formulaire
                const caSel = document.getElementById('congeAgentSelect');
                if (caSel && caSel.options.length <= 1) {
                    const ags = await apiFetch('/agents');
                    caSel.innerHTML = '<option value="">-- Choisir un agent --</option>' +
                        (ags||[]).filter(function(a){return a.statut==='ACTIF';}).map(function(a){
                            return '<option value="' + a.id + '">' + a.nom + ' ' + a.prenom + '</option>';
                        }).join('');
                }
                const conges = await apiFetch('/conges');
                safeRenderTbody(document.getElementById('congesTableBody'),
                    (conges || []).map(c => {
                        let actionButtons = '';
                        if (c.statut === 'EN_ATTENTE_RH') {
                            actionButtons = `
                                <div class="flex gap-2">
                                    <button onclick="validerConge('${c.id}', 'RH')" class="bg-sky-500 hover:bg-sky-600 text-white font-bold py-1 px-2.5 rounded-lg text-xs transition-colors">Valider RH</button>
                                    <button onclick="validerConge('${c.id}', 'REFUSER')" class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2.5 rounded-lg text-xs transition-colors">Refuser</button>
                                </div>
                            `;
                        } else if (c.statut === 'EN_ATTENTE_SUPERVISEUR') {
                            actionButtons = `
                                <div class="flex gap-2">
                                    <button onclick="validerConge('${c.id}', 'SUPERVISEUR')" class="bg-teal-500 hover:bg-teal-600 text-white font-bold py-1 px-2.5 rounded-lg text-xs transition-colors">Valider Superviseur</button>
                                    <button onclick="validerConge('${c.id}', 'REFUSER')" class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2.5 rounded-lg text-xs transition-colors">Refuser</button>
                                </div>
                            `;
                        } else if (c.statut === 'EN_ATTENTE_DIRECTION') {
                            actionButtons = `
                                <div class="flex gap-2">
                                    <button onclick="validerConge('${c.id}', 'DIRECTION')" class="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-2.5 rounded-lg text-xs transition-colors">Approuver</button>
                                    <button onclick="validerConge('${c.id}', 'REFUSER')" class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2.5 rounded-lg text-xs transition-colors">Refuser</button>
                                </div>
                            `;
                        } else {
                            actionButtons = `<span class="text-xs text-slate-400">—</span>`;
                        }

                        const today = new Date(); today.setHours(0,0,0,0);
                        const isExpired = c.dateFin && new Date(c.dateFin) <= today;

                        let statusBadge = '';
                        if (isExpired || c.statut === 'VALIDEE') {
                            statusBadge = '<span class="badge bg-slate-100 text-slate-600 font-bold">✔ Terminé</span>';
                        } else if (c.statut === 'REFUSEE') {
                            statusBadge = '<span class="badge bg-red-100 text-red-700">Refusée</span>';
                        } else {
                            statusBadge = `<span class="badge bg-amber-100 text-amber-700">${c.statut.replace('EN_ATTENTE_', 'Attente ')}</span>`;
                        }

                        const agentName = c.agent ? `${c.agent.nom} ${c.agent.prenom}` : '—';

                        const justifCell = c.justifUrl
                            ? `<a href="${c.justifUrl}" target="_blank" class="text-sky-600 hover:underline font-bold text-[10px] flex items-center gap-1"><i class="fa-solid fa-file text-sky-400"></i> Voir</a>`
                            : `<span class="text-slate-300 text-xs">—</span>`;
                        return `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="p-3 font-bold text-slate-800">${agentName}</td>
                                <td class="p-3 text-slate-600 font-semibold">${c.type || '—'}</td>
                                <td class="p-3 text-slate-500">${c.dateDebut || '—'}</td>
                                <td class="p-3 text-slate-500">${c.dateFin || '—'}</td>
                                <td class="p-3 text-slate-500">${c.structureCliente || '—'}</td>
                                <td class="p-3 text-slate-500">${c.siteNom || '—'}</td>
                                <td class="p-3 text-slate-500">${c.posteOccupe || '—'}</td>
                                <td class="p-3">${justifCell}</td>
                                <td class="p-3">${statusBadge}</td>
                                <td class="p-3">${actionButtons}</td>
                            </tr>
                        `;
                    }).join('') || '<tr><td colspan="9" class="p-3 text-center text-slate-400">Aucune demande de congé ou absence en cours.</td></tr>'
                );
            } catch (e) {
                console.error(e);
                safeRenderTbody(document.getElementById('congesTableBody'), '<tr><td colspan="8" class="p-3 text-center text-red-500">Erreur chargement congés</td></tr>');
            }
        }

        window.validerConge = async function(id, etape) {
            try {
                await apiFetch(`/conges/${id}/valider?etape=${etape}`, {
                    method: 'POST'
                });
                loadConges();
            } catch (e) {
                console.error(e);
                alert('Erreur lors de la validation du congé: ' + e.message);
            }
        };


        async function loadDisciplinaire() {
            try {
                // Populate agent dropdown
                const agents = await apiFetch('/agents') || [];
                const sanctionAgentSelect = document.getElementById('sanctionAgentSelect');
                if (sanctionAgentSelect) {
                    sanctionAgentSelect.innerHTML = agents.map(a => 
                        `<option value="${a.id}">${a.nom || ''} ${a.prenom || ''} (${a.matricule || 'Sans matricule'})</option>`
                    ).join('');
                }

                const sanctions = await apiFetch('/disciplinaire/sanctions');
                window.allSanctionsList = sanctions || [];
                renderSanctions(window.allSanctionsList);
            } catch (e) {
                console.error(e);
                safeRenderTbody(document.getElementById('sanctionsTableBody'), '<tr><td colspan="8" class="p-3 text-center text-red-500">Erreur chargement sanctions</td></tr>');
            }
        }

        function renderSanctions(list) {
            safeRenderTbody(document.getElementById('sanctionsTableBody'),
                list.map(s => {
                    const agentNom = s.agent ? `${s.agent.nom || ''} ${s.agent.prenom || ''}`.trim() : (s.agentNom || '—');
                    const decisionHtml = s.decisionUrl ? `<a href="${s.decisionUrl}" target="_blank" class="text-sky-600 hover:underline inline-flex items-center gap-1 font-bold">📄 Voir</a>` : '—';
                    const dateFinStr = s.dateFin ? s.dateFin : 'Indéterminée';
                    const today2 = new Date(); today2.setHours(0,0,0,0);
                    const sanctionExpired = s.dateFin && new Date(s.dateFin) <= today2;
                    const effectifStatut = sanctionExpired ? 'TERMINE' : (s.statut || 'EN_COURS');
                    const badgeColor = effectifStatut === 'VALIDE' || effectifStatut === 'TERMINE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
                    const badgeLabel = effectifStatut === 'TERMINE' ? '✔ Terminé' : effectifStatut;
                    return `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="p-3 font-bold text-slate-800">${agentNom}</td>
                            <td class="p-3 text-slate-600 font-medium">${s.structureCliente || s.clientFinal || '—'}</td>
                            <td class="p-3 text-slate-500">${s.siteNom || '—'}</td>
                            <td class="p-3 text-slate-600 font-medium">${s.type || '—'}</td>
                            <td class="p-3 text-slate-500">${s.dateDecision || '—'}</td>
                            <td class="p-3 text-slate-500">${dateFinStr}</td>
                            <td class="p-3 text-slate-500 max-w-xs truncate" title="${s.motif || ''}">${s.motif || '—'}</td>
                            <td class="p-3"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">${badgeLabel}</span></td>
                            <td class="p-3">${decisionHtml}</td>
                        </tr>
                    `;
                }).join('') || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucune sanction.</td></tr>'
            );
        }

        window.filterSanctionsTable = function() {
            const query = document.getElementById('searchSanctions')?.value?.toLowerCase() || '';
            if (!window.allSanctionsList) return;
            const filtered = window.allSanctionsList.filter(s => {
                const name = s.agent ? `${s.agent.nom || ''} ${s.agent.prenom || ''}`.toLowerCase() : (s.agentNom || '').toLowerCase();
                return name.includes(query);
            });
            renderSanctions(filtered);
        };

        async function loadEvaluations() {
            try {
                // Populate agent dropdown
                const agents = await apiFetch('/agents') || [];
                const evalAgentSelect = document.getElementById('evalAgentSelect');
                if (evalAgentSelect) {
                    evalAgentSelect.innerHTML = agents.map(a => 
                        `<option value="${a.id}">${a.nom || ''} ${a.prenom || ''} (${a.matricule || 'Sans matricule'})</option>`
                    ).join('');
                }

                const evals = await apiFetch('/evaluations');
                window.allEvaluationsList = evals || [];
                renderEvaluations(window.allEvaluationsList);
            } catch (e) {
                console.error(e);
                safeRenderTbody(document.getElementById('evaluationsTableBody'), '<tr><td colspan="7" class="p-3 text-center text-red-500">Erreur chargement évaluations</td></tr>');
            }
        }

        function renderEvaluations(list) {
            safeRenderTbody(document.getElementById('evaluationsTableBody'),
                list.map(ev => {
                    const agentNom = ev.agent ? `${ev.agent.nom || ''} ${ev.agent.prenom || ''}`.trim() : (ev.agentNom || '—');
                    const dateEval = ev.dateEvaluation ? ev.dateEvaluation : '—';
                    // Cherche structureCliente dans plusieurs champs possibles
                    const structureEv = ev.structureCliente
                        || ev.clientFinal
                        || (ev.agent && (ev.agent.structureCliente || ev.agent.clientFinal || ev.agent.structure))
                        || '—';
                    const evaluateurEv = ev.employeurEvaluateur || ev.evaluateurNom || ev.evaluateur || '—';
                    return `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="p-3 font-bold text-slate-800">${agentNom}</td>
                            <td class="p-3 text-slate-600 font-medium">${structureEv}</td>
                            <td class="p-3 text-slate-500">${ev.siteNom || '—'}</td>
                            <td class="p-3 text-slate-500 font-medium">${evaluateurEv}</td>
                            <td class="p-3 text-slate-600 font-medium">${ev.annee || '—'}</td>
                            <td class="p-3 text-slate-500">${dateEval}</td>
                            <td class="p-3 text-slate-800 font-bold"><span class="px-2.5 py-0.5 rounded bg-sky-50 text-sky-700">${ev.scoreTotal || ev.scoreTotalCalcule || '0'}/80</span></td>
                            <td class="p-3 text-slate-500 max-w-xs truncate" title="${ev.commentaire || ''}">${ev.commentaire || '—'}</td>
                        </tr>
                    `;
                }).join('') || '<tr><td colspan="7" class="p-3 text-center text-slate-400">Aucune évaluation.</td></tr>'
            );
        }

        window.filterEvaluationsTable = function() {
            const query = document.getElementById('searchEvaluations')?.value?.toLowerCase() || '';
            if (!window.allEvaluationsList) return;
            const filtered = window.allEvaluationsList.filter(ev => {
                const name = ev.agent ? `${ev.agent.nom || ''} ${ev.agent.prenom || ''}`.toLowerCase() : (ev.agentNom || '').toLowerCase();
                return name.includes(query);
            });
            renderEvaluations(filtered);
        };

        async function loadRapports(type) {
            try {
                if (!type && document.getElementById('rapportAgentSelect') && document.getElementById('rapportAgentSelect').options.length <= 1) {
                    if (typeof window.switchRapportMode === 'function') window.switchRapportMode('agent');
                }
                const moisInput = document.getElementById('rapportsMois');
                let mois = moisInput?.value;
                if (!mois) {
                    const now = new Date();
                    mois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    if (moisInput) moisInput.value = mois;
                }
                const reportType = type || document.getElementById('rapportsTypeSelect')?.value || 'global';
                const payload = await apiFetch(`/rapports/${reportType}?mois=${mois}`);

                if (document.getElementById('rapportsPreview')) {
                    document.getElementById('rapportsPreview').textContent = JSON.stringify(payload, null, 2);
                }
                renderVisualRapportPreview(payload);
            } catch (e) {
                console.error(e);
                if (document.getElementById('rapportsPreview')) {
                    document.getElementById('rapportsPreview').textContent = 'Erreur chargement rapports: ' + (e.message || e);
                }
                const container = document.getElementById('rapportsVisualPreview');
                if (container) {
                    container.innerHTML = `<div class="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold">Erreur de chargement du rapport : ${e.message || e}</div>`;
                }
            }
        }

        window.renderVisualRapportPreview = function(payload) {
            const container = document.getElementById('rapportsVisualPreview');
            if (!container || !payload) return;

            const titre = payload.titre || 'Rapport Opérationnel';
            const dateGen = payload.dateGeneration || new Date().toISOString().split('T')[0];
            const period = payload.period || 'Global';

            let html = `
                <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6 text-slate-800 font-sans">
                    <!-- Header Document -->
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 gap-4">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="px-2.5 py-1 text-[10px] font-extrabold tracking-wider uppercase bg-slate-900 text-white rounded-md">DOCUMENT OFFICIEL</span>
                                <span class="text-xs text-slate-500 font-bold">SimpleTaff SaaS Platform</span>
                            </div>
                            <h3 class="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                                <i class="fa-solid fa-file-invoice text-brand-600"></i> ${titre}
                            </h3>
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                            <div><span class="font-bold text-slate-800">Date de Génération :</span> ${dateGen}</div>
                            <div><span class="font-bold text-slate-800">Période concernée :</span> <span class="px-2 py-0.5 rounded bg-brand-50 text-brand-700 font-bold">${period}</span></div>
                        </div>
                    </div>
            `;

            // 1. Présences & Pointages Section
            if (payload.presences || payload.par_agent || payload.lignes) {
                const sec = payload.presences || {};
                let list = sec.liste || [];
                if (!list.length && payload.lignes) list = payload.lignes;
                if (!list.length && payload.par_agent) {
                    list = Object.values(payload.par_agent).flat();
                }

                html += `
                    <div class="space-y-3">
                        <div class="flex justify-between items-center bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs">
                            <span>⏱️ 1. PRÉSENCES & POINTAGES</span>
                            <span class="text-slate-300 font-normal">Entrées: ${sec.nombre_entrees || list.length} | Journées: ${sec.journees_presentes || '—'}</span>
                        </div>
                        <div class="overflow-x-auto border border-slate-200 rounded-xl">
                            <table class="min-w-full text-left text-xs whitespace-nowrap">
                                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th class="p-3">Agent</th>
                                        <th class="p-3">Date</th>
                                        <th class="p-3">Heure d'arrivée</th>
                                        <th class="p-3">Heure de départ</th>
                                        <th class="p-3">Présence</th>
                                        <th class="p-3">Site de travail</th>
                                        <th class="p-3">Employeur (Pointage)</th>
                                        <th class="p-3">Retard</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${(() => {
                                        let totalHeures = 0;
                                        let totalRetards = 0;
                                        let rows = list.map(p => {
                                            if (p.retard) totalRetards++;
                                            let minutes = p.duree_minutes || p.dureeMinutes || 0;
                                            totalHeures += minutes;
                                            return `
                                                <tr class="hover:bg-slate-50 transition-colors">
                                                    <td class="p-3 font-semibold text-slate-900">${p.agentNom || p.agent || '—'}</td>
                                                    <td class="p-3 text-slate-600">${p.date || '—'}</td>
                                                    <td class="p-3 text-slate-600">${p.heureArrivee || p.heure_entree || '—'}</td>
                                                    <td class="p-3 text-slate-600">${p.heureDepart || p.heure_sortie || '—'}</td>
                                                    <td class="p-3 text-slate-600">${p.presence || '—'}</td>
                                                    <td class="p-3 text-slate-600">${p.siteTravail || '—'}</td>
                                                    <td class="p-3 text-slate-600">${p.employeur || '—'}</td>
                                                    <td class="p-3">${p.retard ? '<span class="badge bg-red-100 text-red-700">RETARD</span>' : '<span class="badge bg-green-100 text-green-700">OK</span>'}</td>
                                                </tr>
                                            `;
                                        }).join('');
                                        
                                        if (list.length > 0) {
                                            const hours = Math.floor(totalHeures / 60);
                                            const mins = totalHeures % 60;
                                            rows += `
                                                <tr class="bg-slate-200 font-bold border-t-2 border-slate-300">
                                                    <td class="p-3" colspan="4">TOTAUX</td>
                                                    <td class="p-3">${list.length} présence(s)</td>
                                                    <td class="p-3" colspan="2">Total d'heures: ${hours}h${mins.toString().padStart(2, '0')}</td>
                                                    <td class="p-3 text-red-600">${totalRetards} retard(s)</td>
                                                </tr>
                                            `;
                                        }
                                        return rows || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucun pointage enregistré sur la période.</td></tr>';
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            // 2. Congés & Absences Section
            if (payload.conges) {
                const sec = payload.conges;
                const list = sec.liste || [];
                html += `
                    <div class="space-y-3 pt-2">
                        <div class="flex justify-between items-center bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs">
                            <span>🌴 2. CONGÉS & ABSENCES</span>
                            <span class="text-slate-300 font-normal">Total: ${sec.total_demandes || list.length} | Approuvés: ${sec.approuves || 0} | En attente: ${sec.en_attente || 0}</span>
                        </div>
                        <div class="overflow-x-auto border border-slate-200 rounded-xl">
                            <table class="min-w-full text-left text-xs whitespace-nowrap">
                                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th class="p-3">Agent</th>
                                        <th class="p-3">Type</th>
                                        <th class="p-3">Période</th>
                                        <th class="p-3">Jours</th>
                                        <th class="p-3">Statut</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${list.length ? list.map(c => {
                                        const st = (c.statut || '').toUpperCase();
                                        let badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                                        if (st.includes("APPROUV") || st.includes("ACCORD")) badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                        if (st.includes("REFUS")) badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                                        return `
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="p-3 font-semibold text-slate-900">${c.agent || '—'}</td>
                                            <td class="p-3 text-slate-600">${c.type || 'CONGE'}</td>
                                            <td class="p-3 text-slate-600">${c.debut || '—'} au ${c.fin || '—'}</td>
                                            <td class="p-3 font-bold text-slate-800">${c.jours || 0} j</td>
                                            <td class="p-3"><span class="px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${badgeClass}">${st}</span></td>
                                        </tr>
                                        `;
                                    }).join('') : '<tr><td colspan="5" class="p-3 text-center text-slate-400">Aucune demande de congé enregistrée sur la période.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            // 3. Matériels & Équipements Section
            if (payload.materiels) {
                const sec = payload.materiels;
                const list = sec.liste || [];
                html += `
                    <div class="space-y-3 pt-2">
                        <div class="flex justify-between items-center bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs">
                            <span>📦 3. PARC MATÉRIEL & ÉQUIPEMENTS</span>
                            <span class="text-slate-300 font-normal">Total: ${sec.total_equipements || list.length} | Disponibles: ${sec.disponibles || 0} | En Panne: ${sec.en_panne || 0}</span>
                        </div>
                        <div class="overflow-x-auto border border-slate-200 rounded-xl">
                            <table class="min-w-full text-left text-xs whitespace-nowrap">
                                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th class="p-3">Équipement</th>
                                        <th class="p-3">Catégorie</th>
                                        <th class="p-3">N° Série</th>
                                        <th class="p-3">Valeur</th>
                                        <th class="p-3">Statut</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${list.length ? list.map(m => {
                                        const st = (m.statut || '').toUpperCase();
                                        let badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                                        if (st.includes("ASSIGNE") || st.includes("UTILISE")) badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
                                        if (st.includes("PANNE") || st.includes("REPARATION")) badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                                        return `
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="p-3 font-semibold text-slate-900">${m.libelle || '—'}</td>
                                            <td class="p-3 text-slate-600">${m.categorie || 'AUTRE'}</td>
                                            <td class="p-3 font-mono text-slate-500">${m.numero_serie || '—'}</td>
                                            <td class="p-3 font-bold text-slate-800">${m.valeur || '0 FCFA'}</td>
                                            <td class="p-3"><span class="px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${badgeClass}">${st}</span></td>
                                        </tr>
                                        `;
                                    }).join('') : '<tr><td colspan="5" class="p-3 text-center text-slate-400">Aucun équipement enregistré dans l\'inventaire.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            // 4. Disciplinaire Section
            if (payload.disciplinaire) {
                const sec = payload.disciplinaire;
                const list = sec.liste || [];
                html += `
                    <div class="space-y-3 pt-2">
                        <div class="flex justify-between items-center bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs">
                            <span>⚖️ 4. DISCIPLINAIRE & SANCTIONS</span>
                            <span class="text-slate-300 font-normal">Sanctions: ${sec.total_sanctions || list.length}</span>
                        </div>
                        <div class="overflow-x-auto border border-slate-200 rounded-xl">
                            <table class="min-w-full text-left text-xs whitespace-nowrap">
                                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th class="p-3">Agent</th>
                                        <th class="p-3">Sanction</th>
                                        <th class="p-3">Motif</th>
                                        <th class="p-3">Date Décision</th>
                                        <th class="p-3">Statut</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${list.length ? list.map(s => `
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="p-3 font-semibold text-slate-900">${s.agent || '—'}</td>
                                            <td class="p-3 font-bold text-rose-700">${s.type || 'SANCTION'}</td>
                                            <td class="p-3 text-slate-600 max-w-xs truncate">${s.motif || '—'}</td>
                                            <td class="p-3 text-slate-600">${s.date || '—'}</td>
                                            <td class="p-3"><span class="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-slate-100 text-slate-700 border border-slate-200">${s.statut || 'ACTIVE'}</span></td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="5" class="p-3 text-center text-slate-400">Aucune sanction enregistrée sur la période.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            // 5. Missions Section
            if (payload.missions) {
                const sec = payload.missions;
                const list = sec.liste || [];
                html += `
                    <div class="space-y-3 pt-2">
                        <div class="flex justify-between items-center bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs">
                            <span>🚀 5. MISSIONS & DÉPLACEMENTS</span>
                            <span class="text-slate-300 font-normal">Missions: ${sec.total_missions || list.length}</span>
                        </div>
                        <div class="overflow-x-auto border border-slate-200 rounded-xl">
                            <table class="min-w-full text-left text-xs whitespace-nowrap">
                                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th class="p-3">Titre Mission</th>
                                        <th class="p-3">Agent Assigné</th>
                                        <th class="p-3">Début</th>
                                        <th class="p-3">Fin</th>
                                        <th class="p-3">Statut</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${list.length ? list.map(m => {
                                        const st = (m.statut || '').toUpperCase();
                                        let badgeClass = "bg-purple-50 text-purple-700 border-purple-200";
                                        if (st.includes("TERMINE")) badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                        return `
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="p-3 font-semibold text-slate-900">${m.titre || '—'}</td>
                                            <td class="p-3 text-slate-600">${m.agent || '—'}</td>
                                            <td class="p-3 text-slate-600">${m.debut || '—'}</td>
                                            <td class="p-3 text-slate-600">${m.fin || '—'}</td>
                                            <td class="p-3"><span class="px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${badgeClass}">${st}</span></td>
                                        </tr>
                                        `;
                                    }).join('') : '<tr><td colspan="5" class="p-3 text-center text-slate-400">Aucune mission enregistrée sur la période.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            // Document Footer
            html += `
                    <div class="border-t border-slate-200 pt-4 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400">
                        <div>SimpleTaff - Système d'Information Opérationnel SaaS</div>
                        <div>Aperçu visuel identique au document téléchargeable (PDF / Excel)</div>
                    </div>
                </div>
            `;

            container.innerHTML = html;
        };

        window.exportRapport = async function(type, format) {
            try {
                const moisInput = document.getElementById('rapportsMois');
                let mois = moisInput?.value;
                if (!mois) {
                    const now = new Date();
                    mois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    if (moisInput) moisInput.value = mois;
                }
                
                const reportType = type || document.getElementById('rapportsTypeSelect')?.value || 'pointages';
                const token = localStorage.getItem('token');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                
                const response = await fetch(`/api/rapports/${reportType}/export?format=${encodeURIComponent(format)}&mois=${encodeURIComponent(mois)}`, {
                    headers
                });
                
                if (!response.ok) {
                    throw new Error("Erreur lors de l'exportation du rapport: " + response.statusText);
                }
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const isPdf = format.toLowerCase() === 'pdf';
                const ext = isPdf ? 'pdf' : 'csv';
                a.download = `rapport_${reportType}_${mois}.${ext}`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            } catch (e) {
                console.error(e);
                alert(e.message);
            }
        };

        async function loadAudit() {
            try {
                const dateDebut = document.getElementById('auditDateDebut')?.value;
                const dateFin = document.getElementById('auditDateFin')?.value;
                const q = new URLSearchParams();
                if (dateDebut) q.set('dateDebut', dateDebut);
                if (dateFin) q.set('dateFin', dateFin);
                const logs = await apiFetch('/audit?' + q.toString());

                safeRenderTbody(document.getElementById('auditTableBody'),
                    (logs || []).map(l => {
                        const dateFormatted = fmtDateTime(l.creeLe || l.date);
                        const user = l.utilisateurEmail || l.utilisateur || l.username || 'Système';
                        const act = l.action || l.type || '—';
                        const mod = l.module ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mr-1">${l.module}</span>` : '';
                        const det = l.details ? `<div class="text-[11px] text-slate-400 mt-0.5">${l.details}</div>` : '';
                        return `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="p-2 text-slate-500 font-mono text-xs whitespace-nowrap">${dateFormatted}</td>
                                <td class="p-2 text-slate-700">${mod}${act}${det}</td>
                                <td class="p-2 font-bold text-slate-800">${user}</td>
                            </tr>
                        `;
                    }).join('') || '<tr><td colspan="3" class="p-3 text-center text-slate-400">Aucun log.</td></tr>'
                );
            } catch (e) {
                console.error(e);
                safeRenderTbody(document.getElementById('auditTableBody'), '<tr><td colspan="3" class="p-3 text-center text-red-500">Erreur chargement audit</td></tr>');
            }
        }

        // expose global
        // Vider journal audit
        window.clearAuditLog = async function() {
            if (!confirm("Etes-vous sur de vouloir vider tout le journal d'audit ?")) return;
            try {
                await apiFetch('/audit', { method: 'DELETE' });
            } catch (e) { console.log('DELETE audit not implemented, clearing display only'); }
            safeRenderTbody(document.getElementById('auditTableBody'), '<tr><td colspan="3" class="p-3 text-center text-slate-400">Journal vide.</td></tr>');
            showToast("Journal d'audit vide.", 'success');
        };

        // Congé form submit
        document.getElementById('addCongeForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const origText = btn.textContent; btn.disabled = true; btn.textContent = 'Envoi...';
            try {
                const agentId = document.getElementById('congeAgentSelect').value;
                const type = document.getElementById('congeType').value;
                const dateDebut = document.getElementById('congeDateDebut').value;
                const dateFin = document.getElementById('congeDateFin').value;
                const justifUrl = document.getElementById('congeJustifUrl').value || null;
                const commentaire = document.getElementById('congeCommentaire').value;
                await apiFetch('/conges', { method: 'POST', body: JSON.stringify({ agentId, type, dateDebut, dateFin, justifUrl, commentaire }) });
                showToast('Demande de conge enregistree !', 'success');
                e.target.reset();
                document.getElementById('congeFormPanel').classList.add('hidden');
                loadConges();
            } catch (err) { alert('Erreur : ' + err.message); }
            finally { btn.disabled = false; btn.textContent = origText; }
        });

        // File upload for conge justif
        document.getElementById('congeJustifFile')?.addEventListener('change', async (e) => {
            const file = e.target.files[0]; if (!file) return;
            const statusEl = document.getElementById('congeJustifStatus');
            statusEl.textContent = 'Envoi en cours...';
            try {
                const fd = new FormData(); fd.append('file', file);
                const res = await fetch('/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: fd });
                const data = await res.json();
                document.getElementById('congeJustifUrl').value = data.url || data.fileUrl || '';
                statusEl.textContent = 'Fichier charge : ' + file.name;
                statusEl.className = 'text-[10px] text-green-600 mt-1 block';
            } catch (err) { statusEl.textContent = 'Erreur upload.'; statusEl.className = 'text-[10px] text-red-500 mt-1 block'; }
        });

        window.loadOverview = loadOverview;
        window.loadOrg = loadOrg;
        window.loadCatalog = loadCatalog;
        window.loadClients = loadClients;
        window.loadPostesAndAff = loadPostesAndAff;
        window.loadPaieAndConfig = loadPaieAndConfig;
        window.loadContrats = loadContrats;
        window.loadPointages = loadPointages;
        window.loadPointagesByDate = loadPointagesByDate;
        window.loadPointageDates = loadPointageDates;
        window.filterPointageTable = filterPointageTable;
        window.viewDatePointages = viewDatePointages;
        window.loadPresences = loadPresences;
        window.loadMateriel = loadMateriel;
        window.loadConges = loadConges;
        window.loadDisciplinaire = loadDisciplinaire;
        window.loadEvaluations = loadEvaluations;
        window.loadRapports = loadRapports;
        window.loadAudit = loadAudit;

        // Rapport mode switcher
        window.switchRapportMode = function(mode) {
            ['agent','global'].forEach(function(m) {
                var sec = document.getElementById('rapportSection-' + m);
                var btn = document.getElementById('rapportTabBtn-' + m);
                if (!sec || !btn) return;
                if (m === mode) {
                    sec.classList.remove('hidden');
                    btn.classList.add('bg-white','shadow','text-sky-700');
                    btn.classList.remove('text-slate-500');
                } else {
                    sec.classList.add('hidden');
                    btn.classList.remove('bg-white','shadow','text-sky-700');
                    btn.classList.add('text-slate-500');
                }
            });
            if (mode === 'agent') {
                var sel = document.getElementById('rapportAgentSelect');
                if (sel && sel.options.length <= 1) {
                    apiFetch('/agents').then(function(agents) {
                        sel.innerHTML = '<option value="">-- Choisir un agent --</option>' +
                            (agents||[]).filter(function(a){return a.statut==='ACTIF';}).map(function(a){
                                return '<option value="' + a.id + '">' + a.nom + ' ' + a.prenom + ' (' + (a.matricule||'-') + ')</option>';
                            }).join('');
                    }).catch(function(){});
                }
            }
        };

        // Rapport par agent - apercu
        window.loadRapportAgent = async function() {
            var agentId = document.getElementById('rapportAgentSelect') && document.getElementById('rapportAgentSelect').value;
            var mois = document.getElementById('rapportAgentMois') && document.getElementById('rapportAgentMois').value;
            var type = (document.getElementById('rapportAgentType') && document.getElementById('rapportAgentType').value) || 'global';
            var container = document.getElementById('rapportAgentVisual');
            if (!agentId) { showToast && showToast('Selectionnez un agent.','error'); return; }
            if (container) container.innerHTML = '<div class="text-center text-slate-400 text-xs p-8"><i class="fa-solid fa-spinner fa-spin text-2xl mb-2 block"></i>Chargement...</div>';
            try {
                var results = await Promise.allSettled([
                    apiFetch('/agents/' + agentId),
                    apiFetch('/conges?agentId=' + agentId),
                    apiFetch('/disciplinaire/sanctions?agentId=' + agentId),
                    apiFetch('/missions?agentId=' + agentId),
                    apiFetch('/pointages?agentId=' + agentId + (mois ? '&mois=' + mois : ''))
                ]);
                var ag = results[0].status==='fulfilled' ? results[0].value : {};
                var cg = results[1].status==='fulfilled' ? (results[1].value||[]) : [];
                var sc = results[2].status==='fulfilled' ? (results[2].value||[]) : [];
                var ms = results[3].status==='fulfilled' ? (results[3].value||[]) : [];
                var pt = results[4].status==='fulfilled' ? (results[4].value||[]) : [];
                var nomAgent = ag.nom ? ag.nom + ' ' + ag.prenom : 'Agent';
                var periodeLabel = mois ? 'Periode : ' + mois : 'Toutes periodes';
                if (container) {
                    container.innerHTML = '<div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">' +
                        '<div class="flex justify-between items-start border-b border-slate-100 pb-4">' +
                            '<div><h4 class="text-lg font-extrabold text-slate-900">' + nomAgent + '</h4>' +
                            '<p class="text-xs text-slate-400">' + (ag.matricule||'-') + ' &middot; ' + (ag.emploi||ag.poste||'-') + '</p>' +
                            '<p class="text-xs text-slate-400 mt-0.5">' + periodeLabel + '</p></div>' +
                            '<span class="px-3 py-1 rounded-full text-xs font-bold ' + (ag.statut==='ACTIF'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-600') + '">' + (ag.statut||'-') + '</span>' +
                        '</div>' +
                        '<div class="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4">' +
                            '<div class="bg-blue-50 rounded-xl p-4 text-center"><div class="text-2xl font-black text-blue-700">' + pt.length + '</div><div class="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-wide">Presences</div></div>' +
                            '<div class="bg-amber-50 rounded-xl p-4 text-center"><div class="text-2xl font-black text-amber-700">' + cg.filter(function(x){return x.statut==='VALIDEE';}).length + '</div><div class="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-wide">Conges</div></div>' +
                            '<div class="bg-red-50 rounded-xl p-4 text-center"><div class="text-2xl font-black text-red-700">' + sc.length + '</div><div class="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-wide">Sanctions</div></div>' +
                            '<div class="bg-indigo-50 rounded-xl p-4 text-center"><div class="text-2xl font-black text-indigo-700">' + ms.length + '</div><div class="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-wide">Missions</div></div>' +
                        '</div>' +
                        (cg.length > 0 ? '<div><h5 class="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Derniers conges / absences</h5><div class="space-y-1.5">' +
                            cg.slice(0,5).map(function(x){return '<div class="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2 text-xs"><span class="font-semibold text-slate-700">'+(x.type||'-')+'</span><span class="text-slate-400">'+(x.dateDebut||'')+' - '+(x.dateFin||'')+'</span><span class="px-2 py-0.5 rounded text-[10px] font-bold '+(x.statut==='VALIDEE'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700')+'">'+(x.statut||'')+'</span></div>';}).join('') +
                        '</div></div>' : '') +
                        (sc.length > 0 ? '<div><h5 class="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Sanctions disciplinaires</h5><div class="space-y-1.5">' +
                            sc.slice(0,5).map(function(x){return '<div class="flex justify-between items-center bg-red-50 rounded-lg px-3 py-2 text-xs"><span class="font-semibold text-red-700">'+(x.type||'-')+'</span><span class="text-slate-500 truncate max-w-xs">'+(x.motif||'-')+'</span></div>';}).join('') +
                        '</div></div>' : '') +
                    '</div>';
                }
            } catch(err) {
                console.error(err);
                if(container) container.innerHTML='<div class="p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold">Erreur : ' + err.message + '</div>';
            }
        };

        // Export rapport agent PDF
        window.exportRapportAgent = async function(fmt) {
            var agentId = document.getElementById('rapportAgentSelect') && document.getElementById('rapportAgentSelect').value;
            var mois = document.getElementById('rapportAgentMois') && document.getElementById('rapportAgentMois').value;
            var type = (document.getElementById('rapportAgentType') && document.getElementById('rapportAgentType').value) || 'global';
            if (!agentId) { showToast && showToast("Selectionnez un agent.", 'error'); return; }
            var params = 'type=' + type + '&format=' + (fmt||'pdf') + (mois ? '&mois=' + mois : '');
            var url = '/api/rapports/agent/' + agentId + '/export?' + params;
            showToast && showToast('Generation du rapport...','info');
            try {
                var res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token')||'') } });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                var blob = await res.blob();
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'rapport_agent_' + agentId + '_' + (mois||'complet') + '.pdf';
                a.click();
                showToast && showToast('Rapport telecharge !','success');
            } catch(err) {
                console.error(err);
                showToast && showToast('Erreur export : ' + err.message, 'error');
            }
        };


        // ─── Admin: Zoom / Modal QR ──────────────────────────────────
        window.zoomQr = function(fullName, qrData, zone) {
            const modal = document.getElementById('adminQrModal');
            document.getElementById('adminQrModalTitle').textContent = fullName;
            modal.classList.remove('hidden');
            const canvas = document.getElementById('adminModalQrCanvas');
            QRCode.toCanvas(canvas, qrData, { width: 220, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } }, err => { if(err) console.error(err); });

            document.getElementById('adminDownloadPdfBtn').onclick = () => generateAdminBadgePdf(fullName, qrData, zone || '');
            document.getElementById('adminPrintQrBtn').onclick = () => printAdminBadge(fullName, qrData, zone || '');
        };

        window.closeAdminQrModal = function() {
            document.getElementById('adminQrModal').classList.add('hidden');
        };

        // ─── Admin: Génération PDF Badge Agent (avec QR) ─────────────
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

        // ─── Admin: Impression Badge Agent ──────────────────────────
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
    <div class="security">🔒 Code sécurisé — Usage strictement personnel</div>
    <div class="date">Émis le ${now}</div>
  </div>
  <div class="footer">SimpleTaff — Gestion du Personnel &copy; ${new Date().getFullYear()}</div>
</div>
<script>window.onload=()=>{window.print();window.close();}<\/script>
</body></html>`);
                w.document.close();
            });
        };

        // Global helper for broken agent photos
        window.fallbackAvatar = function(imgEl) {
            imgEl.onerror = null;
            const initial = (imgEl.getAttribute('data-initial') || 'A').charAt(0).toUpperCase();
            const span = document.createElement('span');
            span.className = 'inline-flex w-8 h-8 rounded-full bg-slate-200 items-center justify-center text-slate-500 font-bold text-xs';
            span.textContent = initial;
            imgEl.parentNode.replaceChild(span, imgEl);
        };

        window.toggleNotificationsDropdown = function() {
            const dropdown = document.getElementById('notificationsDropdown');
            dropdown.classList.toggle('hidden');
            if (!dropdown.classList.contains('hidden')) {
                loadNotifications();
            }
        };

        window.loadNotifications = async function() {
            try {
                const notifications = await apiFetch('/notifications').catch(() => []);
                const container = document.getElementById('notificationsContainer');
                const badge = document.getElementById('notificationBadge');

                const validNotifications = Array.isArray(notifications) ? notifications : [];
                const unread = validNotifications.filter(n => n.statut !== 'LU');
                
                // Trigger toast if new notifications arrived since last check
                const lastUnreadCount = parseInt(badge?.dataset?.lastCount || '0');
                if (unread.length > lastUnreadCount) {
                    if (window.showToast) window.showToast("Vous avez de nouvelles notifications", "info");
                }
                if (badge) badge.dataset.lastCount = unread.length;

                if (badge) {
                    if (unread.length > 0) {
                        badge.textContent = unread.length;
                        badge.classList.remove('hidden');
                        badge.style.display = 'inline-flex';
                    } else {
                        badge.classList.add('hidden');
                        badge.style.display = '';
                    }
                }

                container.innerHTML = validNotifications.map(n => {
                    const isUnread = n.statut !== 'LU';
                    return `
                        <div class="p-3 hover:bg-slate-50 flex justify-between items-start gap-2 ${isUnread ? 'bg-sky-50/40 font-semibold' : ''}">
                            <div class="flex-1">
                                <p class="text-slate-800">${n.message || '—'}</p>
                                <span class="text-[10px] text-slate-400">${new Date(n.creeLe || Date.now()).toLocaleString()}</span>
                            </div>
                            <div class="flex gap-1.5 items-center">
                                ${isUnread ? `<button onclick="markNotificationAsRead('${n.id}')" class="text-[10px] text-sky-600 hover:text-sky-800 font-bold" title="Marquer comme lu">✓</button>` : ''}
                                <button onclick="deleteNotification('${n.id}')" class="text-[10px] text-rose-600 hover:text-rose-800 font-bold" title="Supprimer">✕</button>
                            </div>
                        </div>
                    `;
                }).join('') || '<div class="p-4 text-center text-slate-400">Aucune notification.</div>';
            } catch (e) {
                console.error(e);
            }
        };

        window.markNotificationAsRead = async function(id) {
            try {
                await apiFetch(`/notifications/${id}/lu`, { method: 'POST' });
                loadNotifications();
            } catch (e) {
                console.error(e);
            }
        };

        window.deleteNotification = async function(id) {
            try {
                await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
                loadNotifications();
            } catch (e) {
                console.error(e);
            }
        };

        window.clearAllNotifications = async function() {
            try {
                const notifications = await apiFetch('/notifications').catch(() => []);
                for (const n of notifications) {
                    await apiFetch(`/notifications/${n.id}`, { method: 'DELETE' });
                }
                loadNotifications();
            } catch (e) {
                console.error(e);
            }
        };

        // ── Mobile sidebar ────────────────────────────────────────

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
        // showTab est défini globalement dans le <head> pour éviter les ReferenceErrors.

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
                if (typeof allAgents !== 'undefined' && allAgents.length > 0) {
                    allAgents.forEach(a => {
                        const name = ((a.nom||'') + ' ' + (a.prenom||'')).toLowerCase();
                        if (name.includes(q) || (a.telephone||'').includes(q)) {
                            results.push({ type: 'Agent', icon: '👤', text: (a.nom||'') + ' ' + (a.prenom||''), tab: 'agents', action: () => { showTab('agents'); searchInput.value=''; searchDropdown.classList.add('hidden'); }});
                        }
                    });
                }
                
                // Search Affectations
                if (typeof allAffectations !== 'undefined' && allAffectations.length > 0) {
                    allAffectations.forEach(a => {
                        const name = (a.agentNom || '').toLowerCase();
                        const site = (a.siteNom || '').toLowerCase();
                        if (name.includes(q) || site.includes(q)) {
                            results.push({ type: 'Affectation', icon: '🏢', text: (a.agentNom||'') + ' - ' + (a.siteNom||''), tab: 'affectations', action: () => { showTab('affectations'); searchInput.value=''; searchDropdown.classList.add('hidden'); }});
                        }
                    });
                }

                // Search Entreprises (Super Admin)
                if (typeof window.entreprises !== 'undefined' && window.entreprises.length > 0) {
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
