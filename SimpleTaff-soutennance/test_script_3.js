
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



        // NOTE: window.showTab est dÃ©fini dans le <head> pour Ã©viter les ReferenceErrors
        // au chargement initial. Il appelle les fonctions via typeof window.loadXxx === 'function'.


        // QR Code Modal Helper
        window.zoomQr = function(agentNom, codeQr) {
            document.getElementById('qrModalTitle').textContent = `Badge QR Code â€” ${agentNom}`;
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
                checkContractExpirations();
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
                            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-6 text-center text-slate-400">Aucune affectation rÃ©cente.</td></tr>';
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
                                                <span class="font-bold text-slate-900">${a.agentNom || 'â€”'}</span>
                                            </div>
                                        </td>
                                        <td class="px-5 py-3 text-slate-600 font-medium">${a.posteLibelle || 'â€”'}</td>
                                        <td class="px-5 py-3 text-slate-500">${a.siteNom || 'â€”'}</td>
                                        <td class="px-5 py-3 text-slate-500">${a.dateDebut || 'â€”'}</td>
                                        <td class="px-5 py-3"><span class="badge ${badgeClass}">${isActif ? 'ðŸŸ¢ Active' : (a.statut || 'â€”')}</span></td>
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
                                const timeStr = p.dateHeureEntree ? new Date(p.dateHeureEntree).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'â€”';
                                return `
                                    <tr class="hover:bg-slate-50/70 transition-colors">
                                        <td class="px-5 py-3">
                                            <div class="flex items-center gap-2">
                                                <div class="w-6 h-6 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-[9px]">${initials}</div>
                                                <span class="font-bold text-slate-800">${agentName}</span>
                                            </div>
                                        </td>
                                        <td class="px-5 py-3">
                                            ${isSortie ? '<span class="badge bg-rose-100 text-rose-700 font-bold">ðŸ”´ Sortie</span>' : '<span class="badge bg-emerald-100 text-emerald-700 font-bold">ðŸŸ¢ EntrÃ©e</span>'}
                                        </td>
                                        <td class="px-5 py-3 font-mono text-slate-600 font-medium">${timeStr}</td>
                                        <td class="px-5 py-3 text-slate-500">${p.siteNom || 'â€”'}</td>
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
                    const villesStr = (Array.isArray(z.villes) && z.villes.length > 0) ? z.villes.join(', ') : (z.perimetre || 'â€”');
                    return `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="p-2 font-bold">${z.nom}</td>
                        <td class="p-2 text-slate-700 font-medium">${villesStr}</td>
                        <td class="p-2 text-slate-500">${z.description || 'â€”'}</td>
                        <td class="p-2"><button onclick="deleteZone('${z.id}')" class="text-red-500 hover:underline">Supprimer</button></td>
                    </tr>`;
                }).join('') || '<tr><td colspan="4" class="p-3 text-center text-slate-400">Aucune zone.</td></tr>';

                // Populate Dropdown for Coordonnateurs
                const coordZoneSelect = document.getElementById('coordZoneSelect');
                coordZoneSelect.innerHTML = '<option value="">Associer Ã  une zone (Optionnel)</option>' +
                    zones.map(z => `<option value="${z.id}">${z.nom}</option>`).join('');

                // Get Coordonnateurs
                const coords = await apiFetch('/organisation/coordonnateurs');
                const coordTbody = document.getElementById('coordsTableBody');
                coordTbody.innerHTML = coords.map(c => `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="p-2 font-bold">${c.nom} ${c.prenom}</td>
                        <td class="p-2 text-slate-500">${c.email}</td>
                        <td class="p-2"><span class="badge bg-slate-100 text-slate-600">${c.zoneNom || 'Non assignÃ©'}</span></td>
                        <td class="p-2"><button onclick="deleteCoord('${c.id}')" class="text-red-500 hover:underline">Supprimer</button></td>
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
                container.innerHTML = '<span class="text-xs text-slate-400 w-full text-center py-1" id="noCitiesPlaceholder">Aucune ville ajoutÃ©e</span>';
                return;
            }

            container.innerHTML = window.selectedZoneCities.map(city => {
                const escapedCity = city.replace(/'/g, "\\'");
                return `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 shadow-xs">
                        ðŸ“ ${city}
                        <button type="button" onclick="removeCityFromZone('${escapedCity}')" class="hover:text-rose-600 font-black ml-0.5" title="Retirer ${city}">Ã—</button>
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
                alert("Veuillez sÃ©lectionner au moins une ville pour cette zone.");
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'CrÃ©ation...';
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
                alert(err.message || "Impossible de crÃ©er la zone.");
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'CrÃ©er la zone';
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
                                <button onclick="previewJobContractTemplate('${e.libelle}', ${e.salaireBrutReference})" class="text-brand-600 hover:underline font-semibold">AperÃ§u ModÃ¨le</button>
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
                                    <i class="fa-solid fa-file-contract"></i> AperÃ§u ModÃ¨le
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
                    agentZoneSelect.innerHTML = '<option value="">SÃ©lectionner sa zone</option>' +
                        zones.map(z => `<option value="${z.id}">${z.nom}</option>`).join('');
                }
                
                const mAgentZoneSelect = document.getElementById('mAgentZoneSelect');
                if (mAgentZoneSelect) {
                    mAgentZoneSelect.innerHTML = '<option value="">SÃ©lectionner sa zone...</option>' +
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
            
            const activeList = allAgents.filter(a => a.statut !== 'EN_ATTENTE_CONTRAT_SIGNE');
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
                        <td class="p-2 text-slate-500 font-mono text-xs">${a.matricule || 'â€”'}</td>
                        <td class="p-2">${avatarHtml}</td>
                        <td class="p-2 font-bold text-slate-800">${a.nom || ''} ${a.prenom || ''}</td>
                        <td class="p-2 text-slate-500">${a.contact || 'â€”'}</td>
                        <td class="p-2 text-slate-500">${a.zoneNom || 'â€”'}</td>`;
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
                                    ðŸ–¨ï¸
                                </button>
                            </div>
                        </td>
                        <td class="p-2">
                            <button onclick="openAgentFolder('${a.id}')" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-2 py-1 rounded-lg text-xs border border-indigo-200">
                                Voir Dossier
                            </button>
                        </td>
                        <td class="p-2">
                            <button onclick="deleteAgent('${a.id}')" class="text-red-500 hover:underline">Supprimer</button>
                        </td>
                    </tr>`;
                }).join('') || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucun agent enregistrÃ©.</td></tr>';
            }

            const pendingList = allAgents.filter(a => a.statut === 'EN_ATTENTE_CONTRAT_SIGNE');
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
            if (!confirm("Attention: La suppression de cet agent est irrÃ©versible et supprimera Ã©galement toutes ses piÃ¨ces justificatives, ses contrats, ses affectations de matÃ©riel et ses cartes de pointage. Voulez-vous continuer ?")) {
                return;
            }
            try {
                await apiFetch(`/agents/${id}`, { method: 'DELETE' });
                alert("Agent et toutes ses dÃ©pendances supprimÃ©s avec succÃ¨s !");
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


        // â”€â”€â”€ Modal Ajouter Agent Tab Toggling & Submission â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            if (photoStatus) photoStatus.textContent = "Aucune photo sÃ©lectionnÃ©e";
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

            const nom = document.getElementById('mAgentNom').value || 'â€”';
            const prenom = document.getElementById('mAgentPrenom').value || 'â€”';
            const genre = document.getElementById('mAgentGenre').value || 'â€”';
            const dateNais = document.getElementById('mAgentDateNaissance').value || 'â€”';
            const lieuNais = document.getElementById('mAgentLieuNaissance').value || 'â€”';
            const nationalite = document.getElementById('mAgentNationalite').value || 'â€”';
            const contact = document.getElementById('mAgentContact').value || 'â€”';
            const ville = document.getElementById('mAgentVille').value || 'â€”';
            const commune = document.getElementById('mAgentCommune').value || 'â€”';

            recapDiv.innerHTML = `
                <div class="bg-sky-50/50 p-4 rounded-2xl border border-sky-100/50 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-4">
                    <div><span class="text-slate-400 block">Nom & PrÃ©noms :</span><strong class="text-slate-800">${nom} ${prenom}</strong></div>
                    <div><span class="text-slate-400 block">Genre / Naissance :</span><strong class="text-slate-800">${genre === 'M' ? 'Masculin' : (genre === 'F' ? 'FÃ©minin' : 'â€”')} (${dateNais} Ã  ${lieuNais})</strong></div>
                    <div><span class="text-slate-400 block">NationalitÃ© :</span><strong class="text-slate-800">${nationalite}</strong></div>
                    <div><span class="text-slate-400 block">Contact TÃ©lÃ©phonique :</span><strong class="text-slate-800">${contact}</strong></div>
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
                    btn.classList.add('border-sky-600', 'text-sky-600');
                    btn.classList.remove('border-transparent', 'text-slate-500', 'hover:text-slate-800');
                    content.classList.remove('hidden');
                } else {
                    btn.classList.remove('border-sky-600', 'text-sky-600');
                    btn.classList.add('border-transparent', 'text-slate-500', 'hover:text-slate-800');
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
                indicator.textContent = `Taille cumulÃ©e actuelle : ${totalMb} Mo / 13 Mo`;
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
                    alert("Ce fichier dÃ©passe la taille maximale autorisÃ©e de 13 Mo.");
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
                        alert("La limite cumulÃ©e de 13 Mo pour l'ensemble des fichiers est dÃ©passÃ©e. Le tÃ©lÃ©versement est bloquÃ©.");
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
                    statusSpan.textContent = "TÃ©lÃ©versement en cours...";
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
                    if (!response.ok) throw new Error("Erreur de tÃ©lÃ©versement");
                    const res = await response.json();
                    document.getElementById(hiddenInputId).value = res.url;
                    if (statusSpan) {
                        statusSpan.textContent = "TÃ©lÃ©versÃ© âœ“";
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
                    alert("Erreur lors du tÃ©lÃ©versement du fichier.");
                    newInput.value = "";
                    delete enroleFileSizes[inputId];
                    updateCumulativeSizeIndicator();
                    if (statusSpan) {
                        statusSpan.textContent = "Erreur de tÃ©lÃ©versement";
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
            submitBtn.textContent = 'CrÃ©ation du dossier en cours...';

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

                alert("Dossier Agent complet crÃ©Ã© avec succÃ¨s ! Le contrat est en attente de signature.");
                document.getElementById('modalAddAgentForm').reset();
                
                // Clear state
                piecesTypes.forEach(type => {
                    const statusSpan = document.getElementById(`status-${type}`);
                    if (statusSpan) statusSpan.textContent = "Non fourni";
                    document.getElementById(`url-${type}`).value = "";
                });
                document.getElementById('mAgentPhotoUrl').value = "";
                document.getElementById('mAgentPhotoStatus').textContent = "Aucune photo sÃ©lectionnÃ©e";
                const previewContainer = document.getElementById('mAgentPhotoPreviewContainer');
                if (previewContainer) previewContainer.classList.add('hidden');

                closeAddAgentModal();
                loadCatalog();
            } catch (err) {
                alert(err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'CrÃ©er le dossier complet';
            }
        });

        // â”€â”€â”€ Sub-tabs switching & finalization queue logic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                        <td class="p-2 text-slate-500 font-mono text-xs">${a.matricule || 'â€”'}</td>
                        <td class="p-2 font-bold text-slate-800">${a.nom} ${a.prenom}</td>
                        <td class="p-2 text-slate-500">${a.contact}</td>
                        <td class="p-2 text-slate-500">${a.zoneNom || 'â€”'}</td>
                        <td class="p-2">
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Contrat en attente</span>
                        </td>
                        <td class="p-2 flex gap-1">
                            <button onclick="openFinalizeEnrollmentModal('${a.id}')" class="bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold px-2 py-1 rounded-lg text-xs border border-sky-200">
                                Finaliser & Activer
                            </button>
                            <button onclick="deleteAgent('${a.id}')" class="text-red-500 hover:underline text-xs ml-2">Supprimer</button>
                        </td>
                    </tr>`).join('') || '<tr><td colspan="6" class="p-3 text-center text-slate-400">Aucun agent en cours d\'enrÃ´lement.</td></tr>';
            }
        };

        window.filterEnrolementAgents = function() {
            const pendingList = allAgents.filter(a => a.statut === 'EN_ATTENTE_CONTRAT_SIGNE');
            renderEnrolementAgents(pendingList);
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
                    feSiteSelect.innerHTML = '<option value="">Ne pas affecter immÃ©diatement</option>' +
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

        document.getElementById('finalizeEnrollmentForm')?.addEventListener('submit', async (e) => {
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
            const siteId = document.getElementById('feSiteSelect')?.value || '';

            try {
                if (!documentUrl) {
                    throw new Error("Veuillez d'abord tÃ©lÃ©verser le contrat signÃ©.");
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

                // Si toujours pas de contrat, tente l'endpoint gÃ©nÃ©rique
                if (!pendingContrat) {
                    try {
                        const allContracts = await apiFetch('/contrats?agentId=' + agentId);
                        pendingContrat = (allContracts || [])[0] || null;
                    } catch (_) {}
                }

                if (pendingContrat) {
                    await apiFetch(`/contrats/${pendingContrat.id}/finaliser`, {
                        method: 'POST',
                        body: JSON.stringify({ dateDebut, documentUrl })
                    });
                } else {
                    // Fallback : activer l'agent directement sans contrat trouvÃ©
                    await apiFetch(`/agents/${agentId}/activer`, {
                        method: 'POST',
                        body: JSON.stringify({ dateDebut, documentUrl })
                    });
                }

                if (siteId) {
                    await apiFetch('/admin/affectations', {
                        method: 'POST',
                        body: JSON.stringify({ siteId, agentId, dateDebut, heureDebut, heureFin })
                    });
                }

                showToast("L'enrÃ´lement a Ã©tÃ© finalisÃ© ! L'agent est dÃ©sormais ACTIF.", 'success');
                closeFinalizeEnrollmentModal();
                loadCatalog();
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
            const nationalite = document.getElementById('mAgentNationalite').value || '[NATIONALITÃ‰]';
            const adresse = document.getElementById('mAgentAdresse').value || '[ADRESSE]';
            const ville = document.getElementById('mAgentVille').value || '[VILLE]';
            const commune = document.getElementById('mAgentCommune').value || '[COMMUNE]';

            const text = `CONTRAT DE TRAVAIL DE DROIT IVOIRIEN (${type})

ENTRE LES SOUSSIGNÃ‰S :
L'entreprise de sÃ©curitÃ© privÃ©e, reprÃ©sentÃ©e par son Administrateur, ci-aprÃ¨s dÃ©nommÃ©e "L'EMPLOYEUR", d'une part,

ET :
M./Mme ${nom} ${prenom}, nÃ©(e) le ${dateNaissance} Ã  ${lieuNaissance}, de nationalitÃ© ${nationalite}, rÃ©sidant Ã  ${adresse}, ci-aprÃ¨s dÃ©nommÃ©(e) "L'EMPLOYÃ‰(E)", d'autre part.

Il a Ã©tÃ© convenu et arrÃªtÃ© ce qui suit, conformÃ©ment au Code du Travail de CÃ´te d'Ivoire (Loi nÂ° 2015-532) et Ã  la Convention Collective Interprofessionnelle :

ARTICLE 1 : OBJET ET QUALIFICATION
L'EmployÃ©(e) est engagÃ©(e) en qualitÃ© de "${libelle}" sous le rÃ©gime du contrat de type ${type}. Il/Elle exercera ses fonctions principalement Ã  ${ville} / ${commune} ou sur tout autre site d'affectation de l'entreprise.

ARTICLE 2 : DURÃ‰E DU CONTRAT ET PÃ‰RIODE D'ESSAI
Le prÃ©sent contrat est conclu pour une durÃ©e ${type === 'CDD' ? 'dÃ©terminÃ©e correspondant Ã  la mission confiÃ©e' : 'indÃ©terminÃ©e'}.
Une pÃ©riode d'essai de ${type === 'CDD' ? '15 jours' : '1 mois'} est convenue, durant laquelle chaque partie peut rompre le contrat sans prÃ©avis ni indemnitÃ©.

ARTICLE 3 : REMUNERATION
En contrepartie de l'exÃ©cution de ses tÃ¢ches, l'EmployÃ©(e) percevra un salaire de base mensuel brut de ${salaire} F CFA. Ã€ cette rÃ©munÃ©ration s'ajoutent les indemnitÃ©s lÃ©gales en vigueur en CÃ´te d'Ivoire, notamment la prime de transport obligatoire.

ARTICLE 4 : DURÃ‰E DU TRAVAIL
La durÃ©e hebdomadaire du travail est fixÃ©e conformÃ©ment Ã  la lÃ©gislation ivoirienne en vigueur, soit 40 heures par semaine. Les heures supplÃ©mentaires seront rÃ©munÃ©rÃ©es selon les taux lÃ©gaux.

ARTICLE 5 : CONGÃ‰S ANNUELS
L'EmployÃ©(e) bÃ©nÃ©ficie d'un congÃ© annuel payÃ© au taux de 2,2 jours ouvrables par mois de service effectif, conformÃ©ment au Code du Travail ivoirien.

ARTICLE 6 : RÃ‰SILIATION
En dehors de la pÃ©riode d'essai, la rÃ©siliation du prÃ©sent contrat s'effectuera conformÃ©ment aux dispositions lÃ©gales du Code du Travail de CÃ´te d'Ivoire.

Fait de bonne foi Ã  Abidjan, le ${new Date().toLocaleDateString('fr-FR')}

Pour l'Employeur                               L'EmployÃ©(e)
(Signature prÃ©cÃ©dÃ©e de la                     (Signature prÃ©cÃ©dÃ©e de la
mention "Lu et approuvÃ©")                     mention "Lu et approuvÃ©")`;

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
            const dateDebut = dateDebutInput ? new Date(dateDebutInput).toLocaleDateString('fr-FR') : '[DATE DÃ‰BUT]';
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
            const nationalite = agent.nationalite || '[NATIONALITÃ‰]';
            const adresse = agent.adresse || '[ADRESSE]';
            const ville = agent.ville || '[VILLE]';
            const commune = agent.commune || '[COMMUNE]';

            let dateFinText = '';
            if (type === 'CDD') {
                dateFinText = dateFin ? ` jusqu'au ${dateFin}` : ' (durÃ©e dÃ©terminÃ©e)';
            }

            const text = `CONTRAT DE PLACEMENT ET DE TRAVAIL DE DROIT IVOIRIEN (${type})

ENTRE LES SOUSSIGNÃ‰S :
L'entreprise de sÃ©curitÃ© privÃ©e SimpleTaff, reprÃ©sentÃ©e par son Administrateur, ci-aprÃ¨s dÃ©nommÃ©e "L'EMPLOYEUR", d'une part,

ET :
M./Mme ${nom} ${prenom}, nÃ©(e) le ${dateNaissance} Ã  ${lieuNaissance}, de nationalitÃ© ${nationalite}, rÃ©sidant Ã  ${adresse}, ci-aprÃ¨s dÃ©nommÃ©(e) "L'EMPLOYÃ‰(E)", d'autre part.

Il a Ã©tÃ© convenu et arrÃªtÃ© ce qui suit, conformÃ©ment au Code du Travail de CÃ´te d'Ivoire (Loi nÂ° 2015-532) et Ã  la Convention Collective Interprofessionnelle :

ARTICLE 1 : OBJET ET QUALIFICATION
L'EmployÃ©(e) est engagÃ©(e) en qualitÃ© de "${libelle}" sous le rÃ©gime du contrat de type ${type}. Il/Elle exercera ses fonctions principalement au sein de la structure cliente "${structureName}" situÃ©e Ã  ${ville} / ${commune} ou sur tout autre site d'affectation dÃ©signÃ© par l'entreprise.

ARTICLE 2 : DURÃ‰E DU CONTRAT ET PÃ‰RIODE D'ESSAI
Le prÃ©sent contrat prend effet le ${dateDebut}${dateFinText}.
Une pÃ©riode d'essai de ${type === 'CDD' ? '15 jours' : '1 mois'} est convenue, durant laquelle chaque partie peut rompre le contrat sans prÃ©avis ni indemnitÃ©.

ARTICLE 3 : REMUNERATION
En contrepartie de l'exÃ©cution de ses tÃ¢ches, l'EmployÃ©(e) percevra un salaire de base mensuel brut de ${salaire} F CFA. Ã€ cette rÃ©munÃ©ration s'ajoutent les indemnitÃ©s lÃ©gales en vigueur en CÃ´te d'Ivoire, notamment la prime de transport obligatoire.

ARTICLE 4 : DURÃ‰E DU TRAVAIL
La durÃ©e hebdomadaire du travail est fixÃ©e conformÃ©ment Ã  la lÃ©gislation ivoirienne en vigueur, soit 40 heures par semaine. Les heures supplÃ©mentaires seront rÃ©munÃ©rÃ©es selon les taux lÃ©gaux.

ARTICLE 5 : CONGÃ‰S ANNUELS
L'EmployÃ©(e) bÃ©nÃ©ficie d'un congÃ© annuel payÃ© au taux de 2,2 jours ouvrables par mois de service effectif, conformÃ©ment au Code du Travail ivoirien.

ARTICLE 6 : RÃ‰SILIATION
En dehors de la pÃ©riode d'essai, la rÃ©siliation du prÃ©sent contrat s'effectuera conformÃ©ment aux dispositions lÃ©gales du Code du Travail de CÃ´te d'Ivoire.

Fait de bonne foi Ã  Abidjan, le ${new Date().toLocaleDateString('fr-FR')}

Pour l'Employeur                               L'EmployÃ©(e)
(Signature prÃ©cÃ©dÃ©e de la                     (Signature prÃ©cÃ©dÃ©e de la
mention "Lu et approuvÃ©")                     mention "Lu et approuvÃ©")`;

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

            const text = `CONTRAT DE TRAVAIL DE DROIT IVOIRIEN (CDD / CDI) - MODÃˆLE DE RÃ‰FÃ‰RENCE

ENTRE LES SOUSSIGNÃ‰S :
L'entreprise de sÃ©curitÃ© privÃ©e, reprÃ©sentÃ©e par son Administrateur, ci-aprÃ¨s dÃ©nommÃ©e "L'EMPLOYEUR", d'une part,

ET :
M./Mme [NOM DE L'AGENT] [PRÃ‰NOM DE L'AGENT], nÃ©(e) le [DATE DE NAISSANCE] Ã  [LIEU DE NAISSANCE], de nationalitÃ© [NATIONALITÃ‰], rÃ©sidant Ã  [ADRESSE], ci-aprÃ¨s dÃ©nommÃ©(e) "L'EMPLOYÃ‰(E)", d'autre part.

Il a Ã©tÃ© convenu et arrÃªtÃ© ce qui suit, conformÃ©ment au Code du Travail de CÃ´te d'Ivoire (Loi nÂ° 2015-532) et Ã  la Convention Collective Interprofessionnelle :

ARTICLE 1 : OBJET ET QUALIFICATION
L'EmployÃ©(e) est engagÃ©(e) en qualitÃ© de "${libelle}" (Poste paramÃ©trÃ© dans le catalogue de l'entreprise).

ARTICLE 2 : DURÃ‰E DU CONTRAT ET PÃ‰RIODE D'ESSAI
Le contrat est conclu pour une durÃ©e dÃ©terminÃ©e (CDD) ou indÃ©terminÃ©e (CDI) selon l'affectation finale de l'agent. La pÃ©riode d'essai est fixÃ©e conformÃ©ment au Code du Travail ivoirien.

ARTICLE 3 : REMUNERATION
En contrepartie de l'exÃ©cution de ses tÃ¢ches, l'EmployÃ©(e) percevra le salaire de base mensuel brut paramÃ©trÃ© de ${salaire} F CFA.
Ã€ cette rÃ©munÃ©ration s'ajoutent la prime de transport obligatoire et les indemnitÃ©s lÃ©gales en vigueur en CÃ´te d'Ivoire.

ARTICLE 4 : DURÃ‰E DU TRAVAIL
La durÃ©e hebdomadaire du travail est de 40 heures, conformÃ©ment Ã  la lÃ©gislation du travail ivoirienne.

ARTICLE 5 : CONGÃ‰S ANNUELS
L'EmployÃ©(e) accumulera 2,2 jours ouvrables de congÃ© payÃ© par mois de service effectif.

ARTICLE 6 : RÃ‰SILIATION & LITIGES
Toute rupture en dehors de la pÃ©riode d'essai ou tout litige relatif Ã  l'interprÃ©tation ou Ã  l'exÃ©cution du prÃ©sent contrat sera soumis aux tribunaux du travail compÃ©tents de CÃ´te d'Ivoire.

Fait Ã  Abidjan, le ${new Date().toLocaleDateString('fr-FR')}

Pour l'Employeur                               L'EmployÃ©(e)
(Signature prÃ©cÃ©dÃ©e de la                     (Signature prÃ©cÃ©dÃ©e de la
mention "Lu et approuvÃ©")                     mention "Lu et approuvÃ©")`;

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

        // â”€â”€â”€ Modal Dossier Agent Tab & CRUD Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            
            document.getElementById('fAgentGenre').textContent = a.genre || 'â€”';
            document.getElementById('fAgentNaissance').textContent = a.dateNaissance ? `${a.dateNaissance} (Lieu: ${a.lieuNaissance || 'â€”'})` : 'â€”';
            document.getElementById('fAgentNationalite').textContent = a.nationalite || 'â€”';
            document.getElementById('fAgentMatrimoniale').textContent = a.situationMatrimoniale || 'â€”';
            document.getElementById('fAgentEnfants').textContent = a.nombreEnfants ?? '0';
            document.getElementById('fAgentContact').textContent = a.contact || 'â€”';
            document.getElementById('fAgentTelSec').textContent = a.telephoneSecondaire || 'â€”';
            document.getElementById('fAgentEmail').textContent = a.email || 'â€”';
            document.getElementById('fAgentLocalisation').textContent = `${a.commune || 'â€”'} / ${a.ville || 'â€”'}`;
            document.getElementById('fAgentAdresse').textContent = a.adresse || 'â€”';
            
            document.getElementById('fUrgenceNom').textContent = a.contactUrgenceNom || 'â€”';
            document.getElementById('fUrgenceTel').textContent = a.contactUrgenceTelephone || 'â€”';
            document.getElementById('fUrgenceLien').textContent = a.contactUrgenceLien || 'â€”';
            
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
                    btn.classList.add('border-sky-600', 'text-sky-600');
                    btn.classList.remove('border-transparent', 'text-slate-500', 'hover:text-slate-800');
                    if (content) content.classList.remove('hidden');
                } else {
                    btn.classList.remove('border-sky-600', 'text-sky-600');
                    btn.classList.add('border-transparent', 'text-slate-500', 'hover:text-slate-800');
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
                    'Diplomes': 'DiplÃ´mes',
                    'Certificats_Travail': 'Certificats de travail',
                    'Permis_Conduire': 'Permis de conduire',
                    'Attestations_Diverses': 'Attestations diverses',
                    'Photo_Identite': "Photo d'identitÃ©"
                };

                if (!pieces || pieces.length === 0) {
                    container.innerHTML = '<div class="col-span-full text-center text-slate-400 py-6">Aucune piÃ¨ce justificative fournie.</div>';
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
                alert("Veuillez sÃ©lectionner un fichier PDF.");
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
                
                if (!response.ok) throw new Error("Erreur de tÃ©lÃ©versement");
                const res = await response.json();
                
                await apiFetch(`/agents/${agentId}/pieces`, {
                    method: 'POST',
                    body: JSON.stringify({
                        type: selectType,
                        urlDocument: res.url,
                        statut: 'VALIDE'
                    })
                });

                alert("Document ajoutÃ© avec succÃ¨s !");
                fileInput.value = "";
                loadFolderDocs();
            } catch (err) {
                alert(err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'TÃ©lÃ©charger le document';
            }
        };

        window.deletePiece = async function(pieceId) {
            if (!confirm("Supprimer ce document ?")) return;
            try {
                await apiFetch(`/agents/pieces/${pieceId}`, { method: 'DELETE' });
                alert("Document supprimÃ© avec succÃ¨s.");
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
                alert("Identifiant NFC associÃ© avec succÃ¨s !");
                
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
                            <h3 class="text-sm font-extrabold text-slate-800">Contrat ${activeC.type} â€” ${activeC.fonction || 'Non renseignÃ©e'}</h3>
                            <p class="text-xs text-slate-500 mt-1">DÃ©partement: ${activeC.departement || 'â€”'} | Direction: ${activeC.direction || 'â€”'}</p>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-bold text-indigo-700 block">${activeC.salaireBase ? activeC.salaireBase + ' FCFA' : 'â€”'}</span>
                            <span class="text-[10px] text-slate-400">Salaire de base</span>
                        </div>
                    </div>
                    <hr class="border-slate-100 my-3">
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div>
                            <span class="text-slate-400 block text-[10px]">Date DÃ©but</span>
                            <span class="font-bold text-slate-700">${activeC.dateDebut || 'â€”'}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px]">Date Fin</span>
                            <span class="font-bold text-slate-700">${activeC.dateFin || 'IndÃ©terminÃ©e (CDI)'}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px]">Structure Cliente</span>
                            <span class="font-bold text-slate-700">${activeC.structureCliente || 'Placement interne'}</span>
                        </div>
                    </div>
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
                            <td class="p-2 text-slate-700">${r.creeLe ? new Date(r.creeLe).toLocaleDateString() : 'â€”'}</td>
                            <td class="p-2 text-slate-500">${r.ancienneDateFin || 'â€”'}</td>
                            <td class="p-2 text-slate-700 font-bold">${r.nouvelleDateFin || 'â€”'}</td>
                            <td class="p-2 text-slate-500">${r.motif || 'â€”'}</td>
                            <td class="p-2">
                                ${r.documentUrl ? `<a href="${r.documentUrl}" target="_blank" class="text-indigo-600 font-bold hover:underline">Voir PDF</a>` : 'â€”'}
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
            submitBtn.textContent = 'CrÃ©ation...';
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

                alert("Contrat crÃ©Ã© avec succÃ¨s !");
                document.getElementById('folderCreateContractForm')?.reset();
                document.getElementById('fcDocumentUrl').value = "";
                loadFolderContract();
            } catch (err) { alert(err.message); }
            finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'GÃ©nÃ©rer & Activer le Contrat';
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

                alert("Contrat renouvelÃ© avec succÃ¨s !");
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
                    tbody.innerHTML = '<tr><td colspan="7" class="p-2 text-center text-slate-400">Aucun Ã©quipement assignÃ©.</td></tr>';
                } else {
                    tbody.innerHTML = affectations.map(a => {
                        const dateRemise = a.dateRemise ? new Date(a.dateRemise).toLocaleDateString('fr-FR') : 'â€”';
                        const dateRetour = a.dateRetour ? new Date(a.dateRetour).toLocaleDateString('fr-FR') : '';
                        return `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="p-2 font-bold text-slate-700">${a.materiel?.categorie || 'â€”'}</td>
                                <td class="p-2 text-slate-500">${a.materiel?.libelle || 'â€”'}</td>
                                <td class="p-2 text-slate-500">${a.materiel?.imei || a.materiel?.numeroSim || 'â€”'}</td>
                                <td class="p-2 text-slate-500">${a.materiel?.numeroSerie || 'â€”'}</td>
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
                                    ` : `<span class="text-slate-400 text-[10px]">RetournÃ© le ${dateRetour}</span>`}
                                </td>
                            </tr>
                        `;
                    }).join('');
                }

                const allMateriels = await apiFetch('/materiels');
                const select = document.getElementById('newHardwareSelect');
                const disponibles = (allMateriels || []).filter(m => m.statut === 'DISPONIBLE');
                
                if (disponibles.length === 0) {
                    select.innerHTML = '<option value="">Aucun matÃ©riel disponible dans l\'inventaire...</option>';
                } else {
                    select.innerHTML = '<option value="">Choisir un matÃ©riel Ã  assigner...</option>' +
                        disponibles.map(m => `<option value="${m.id}">${m.categorie} - ${m.libelle} (S/N: ${m.numeroSerie || 'â€”'})</option>`).join('');
                }
            } catch (err) { console.error(err); }
        }

        window.remiseHardwareToAgent = async function() {
            const agentId = window.currentFolderAgentId;
            const materielId = document.getElementById('newHardwareSelect').value;
            if (!materielId) {
                alert("Veuillez sÃ©lectionner un matÃ©riel disponible.");
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
                alert("MatÃ©riel remis avec succÃ¨s !");
                loadFolderHardware();
                loadMateriel();
            } catch (err) { alert(err.message); }
            finally {
                btn.disabled = false;
                btn.textContent = 'Valider la remise';
            }
        };

        window.returnHardware = async function(materielId) {
            if (!confirm("Confirmer le retour de ce matÃ©riel ?")) return;
            try {
                await apiFetch(`/materiels/${materielId}/retour`, {
                    method: 'POST',
                    body: JSON.stringify({
                        signatureUrl: ''
                    })
                });
                alert("MatÃ©riel retournÃ© avec succÃ¨s !");
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
                siteStructSelect.innerHTML = '<option value="">SÃ©lectionner le Client</option>' +
                    structures.map(s => `<option value="${s.id}">${s.raisonSociale}</option>`).join('');

                const empStructSelect = document.getElementById('empStructSelect');
                empStructSelect.innerHTML = '<option value="">Lier au Client</option>' +
                    structures.map(s => `<option value="${s.id}">${s.raisonSociale}</option>`).join('');

                const zones = await apiFetch('/organisation/zones');
                const siteZoneSelect = document.getElementById('siteZoneSelect');
                siteZoneSelect.innerHTML = '<option value="">Associer Ã  une Zone</option>' +
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
                `).join('') || '<div class="text-slate-400">Aucun site crÃ©Ã©</div>';

                // Get Employeurs
                const employeurs = await apiFetch('/organisation/employeurs');
                const employeursTbody = document.getElementById('employeursTableBody');
                employeursTbody.innerHTML = employeurs.map(emp => `
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="p-2 font-bold">${emp.nom} ${emp.prenom}</td>
                        <td class="p-2 text-slate-500">${emp.structureNom}</td>
                        <td class="p-2 text-slate-500">${emp.sites.join(', ') || 'â€”'}</td>
                        <td class="p-2"><button onclick="deleteEmployeur('${emp.id}')" class="text-red-500 hover:underline">Supprimer</button></td>
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
                dropdown.innerHTML = '<div class="p-2 text-xs text-slate-400">Aucun rÃ©sultat</div>';
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

                    empInput.disabled = false;
                    empInput.classList.remove('bg-slate-100/50');
                    empInput.value = '';
                    document.getElementById('affEmployeurEmail').value = '';

                    // Filter
                    filteredSites = allSites.filter(s => s.structureId === selectedId);
                    filteredEmployeurs = allEmployeurs.filter(e => e.structureId === selectedId);

                    // Re-bind autocomplete with filtered data
                    setupAutocomplete('affSiteInput', 'affSiteDropdown', 'affSiteId', filteredSites, 'nom');
                    setupAutocomplete('affEmployeurInput', 'affEmployeurDropdown', 'affEmployeurEmail', filteredEmployeurs, 'email');
                });

                // Get Affectations
                const affectations = await apiFetch('/admin/affectations') || [];
                const affTbody = document.getElementById('affectationsTableBody');
                if (affTbody) {
                    affTbody.innerHTML = affectations.map(a => {
                        const agentName = a.agentNom || (a.agent ? `${a.agent.nom || ''} ${a.agent.prenom || ''}`.trim() : '') || 'Agent';
                        const siteName = a.siteNom || a.siteTravail || (a.site ? a.site.nom : '') || 'Site non attribuÃ©';
                        const posteName = a.posteLibelle || (a.poste ? a.poste.libelle : (a.agent ? a.agent.fonction : '')) || 'Agent Terrain';
                        const zoneName = a.zoneOperationnelle || a.zoneNom || (a.site && (a.site.zoneNom || (a.site.zone ? a.site.zone.nom : ''))) || (a.agent && a.agent.zoneNom) || 'Zone Principale';
                        const villeName = a.ville || (a.site && (a.site.ville || a.site.adresse)) || (a.agent && a.agent.ville) || 'Abidjan';
                        const supervisorName = a.employeurResponsable || a.superviseur || (a.employeur ? `${a.employeur.nom || ''} ${a.employeur.prenom || ''}`.trim() : '') || 'Superviseur Site';
                        const hDebut = a.heureDebut || a.heureArriveeSite || a.heureArrivee || '08:00';
                        const hFin = a.heureFin || a.heureDepartSite || a.heureDepart || '18:00';

                        return `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="p-2 font-bold text-slate-800">${agentName}</td>
                            <td class="p-2 text-slate-500">${posteName} <span class="text-slate-400">Ã </span> ${siteName}</td>
                            <td class="p-2 text-slate-500"><span class="font-bold text-slate-700">${zoneName}</span> <span class="text-slate-400">(${villeName})</span></td>
                            <td class="p-2 text-slate-500">${supervisorName}</td>
                            <td class="p-2 text-slate-500 font-mono text-xs"><span class="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">${hDebut} - ${hFin}</span></td>
                            <td class="p-2 text-slate-500">${a.dateDebut || 'â€”'}</td>
                            <td class="p-2"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${a.statut === 'ACTIVE' || !a.statut ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}">${a.statut || 'ACTIVE'}</span></td>
                            <td class="p-2">
                                ${a.statut === 'ACTIVE' || !a.statut ? `<button onclick="cloturerAff('${a.id}')" class="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 font-bold transition-colors">ClÃ´turer</button>` : 'â€”'}
                            </td>
                        </tr>`;
                    }).join('') || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucune affectation.</td></tr>';
                }
            } catch(e) {
                console.error(e);
            }
        }

        window.cloturerAff = async function(id) {
            if (!confirm("ClÃ´turer cette affectation ?")) return;
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
                    if (enterpriseNameDisplay) enterpriseNameDisplay.textContent = config.nom || 'â€”';
                }

                // Populate Dropdown for manual calcul
                const calcAffSelect = document.getElementById('calcAffSelect');
                if (calcAffSelect) {
                    const affectations = await apiFetch('/admin/affectations') || [];
                    calcAffSelect.innerHTML = '<option value="">Choisir l\'Affectation</option>' +
                        affectations.filter(a => a.statut === 'ACTIVE').map(a => `<option value="${a.id}">${a.agentNom} â€” ${a.posteLibelle}</option>`).join('');
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
                                ${b.statutPaiement === 'EN_ATTENTE' ? `<button onclick="payerBulletin('${b.id}')" class="bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 rounded text-xs font-bold">Marquer PayÃ©</button>` : 'â€”'}
                            </td>
                        </tr>`).join('') || '<tr><td colspan="6" class="p-3 text-center text-slate-400">Aucun bulletin de paie Ã©mis.</td></tr>';
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
                                ${f.statutPaiement === 'EN_ATTENTE' ? `<button onclick="payerFacture('${f.id}')" class="bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 rounded text-xs font-bold">Encaisser</button>` : 'â€”'}
                            </td>
                        </tr>`).join('') || '<tr><td colspan="6" class="p-3 text-center text-slate-400">Aucune facture Ã©mise.</td></tr>';
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
                        `).join('') || '<tr><td colspan="3" class="p-1 text-center text-slate-400">Aucune rÃ¨gle.</td></tr>';
                    } catch (e) {
                        console.error("Erreur chargement rÃ¨gles primes", e);
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
                alert("RÃ¨gles de paie mises Ã  jour !");
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
                        <div class="font-bold text-slate-800">RÃ©sultat de la simulation :</div>
                        <div>RÃ¨gle appliquÃ©e : <strong>${res.regleAssociee}</strong></div>
                        <div>Seuil appliquÃ© : <strong>${res.seuilMinimumApplique} points</strong></div>
                        <div>Montant / point : <strong>${res.montantParPointApplique} FCFA</strong></div>
                        <div class="mt-1 text-sm font-extrabold text-indigo-700">Prime calculÃ©e : ${res.montantCalcule} FCFA</div>
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
                        alert(`âš ï¸ SÃ‰LECTION REQUISE : Veuillez sÃ©lectionner une entrÃ©e valide pour le champ "${fieldName}" depuis la liste de suggestion.`);
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

                    alert('Sanction enregistrÃ©e avec succÃ¨s !');
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

                    alert('Ã‰valuation de performance enregistrÃ©e avec succÃ¨s !');
                    e.target.reset();
                    loadEvaluations();
                } catch (err) {
                    console.error(err);
                    alert('Erreur lors de l\'enregistrement de l\'Ã©valuation : ' + err.message);
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
                const contrats = await apiFetch('/contrats');
                safeRenderTbody(document.getElementById('contratsTableBody'),
                    (contrats || []).map(c => {
                        const agentId = c.agentId || (c.agent && c.agent.id) || '';
                        const agentNom = c.agentNom || (c.agent ? (c.agent.nom + ' ' + c.agent.prenom) : '-');
                        const docBtn = agentId ? `<button onclick="openAgentFolder('${agentId}');setTimeout(()=>switchFolderTab('contract'),400)" class="text-sky-600 hover:underline font-bold text-xs flex items-center gap-1">Voir dossier</button>` : (c.documentUrl ? `<a href="${c.documentUrl}" target="_blank" class="text-sky-600 hover:underline font-bold text-xs">PDF</a>` : '-');
                        return `<tr class="hover:bg-slate-50/50 transition-colors"><td class="p-2 font-bold text-slate-800">${agentNom}</td><td class="p-2 text-slate-500">${c.type||'-'}</td><td class="p-2 text-slate-500">${c.dateDebut||'-'}</td><td class="p-2 text-slate-500">${c.dateFin||'-'}</td><td class="p-2 text-slate-500">${c.structureCliente||'-'}</td><td class="p-2"><span class="badge ${c.statut==='ACTIF'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-600'}">${c.statut||'-'}</span></td><td class="p-2">${docBtn}</td></tr>`;
                    }).join('') || '<tr><td colspan="7" class="p-3 text-center text-slate-400">Aucun contrat.</td></tr>'
                );
                } catch (e) {
                console.error(e);
                safeRenderTbody(document.getElementById('contratsTableBody'), '<tr><td colspan="7" class="p-3 text-center text-red-500">Erreur chargement contrats</td></tr>');
            }
        }

        window.checkContractExpirations = async function() {
            try {
                // Fetch contracts expiring in the next 60 days
                const list = await apiFetch('/contrats/expirations?jours=60') || [];
                
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
                        const isUrgent = daysRemaining <= 30; // 1 month or less
                        const cardBg = isUrgent ? 'bg-red-50/90 border-red-200 text-red-900' : 'bg-amber-50/90 border-amber-200 text-amber-900';
                        const iconColor = isUrgent ? 'text-red-500' : 'text-amber-500';
                        const btnColor = isUrgent ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white';
                        const labelEcheance = isUrgent ? 'âš ï¸ 1 mois ou moins' : 'â³ 2 mois';
                        
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
                console.error("Erreur lors de la vÃ©rification des expirations de contrats:", e);
            }
        };

        window.openRenewContractFromAlert = async function(agentId) {
            await openAgentFolder(agentId);
            switchFolderTab('contract');
        };

        // â”€â”€ POINTAGE HISTORY MODULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        let _allPointages = [];

        function fmtDateTime(dt) {
            if (!dt) return 'â€”';
            try { return new Date(dt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }); }
            catch { return dt; }
        }

        function fmtDuree(min) {
            if (min == null || min === 0) return 'â€”';
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
            return `<span class="badge ${cls}">${statut || 'â€”'}</span>`;
        }

        function modeBadge(mode) {
            const colors = {
                QR_CODE: 'bg-blue-100 text-blue-700',
                NFC: 'bg-purple-100 text-purple-700',
                BIOMETRIE: 'bg-green-100 text-green-700',
                MANUEL: 'bg-slate-100 text-slate-600',
            };
            const cls = colors[mode] || 'bg-slate-100 text-slate-600';
            return `<span class="badge ${cls}">${mode || 'â€”'}</span>`;
        }

        function renderPointageRows(data) {
            const tbody = document.getElementById('pointagesTableBody');
            if (!data || data.length === 0) {
                safeRenderTbody(tbody, '<tr><td colspan="8" class="p-4 text-center text-slate-400">Aucun pointage pour cette date.</td></tr>');
                return;
            }
            safeRenderTbody(tbody, data.map(p => `
                <tr class="hover:bg-slate-50/70 transition-colors">
                    <td class="p-3 font-semibold text-slate-800">${p.agentNom || 'â€”'}</td>
                    <td class="p-3 text-slate-600">${fmtDateTime(p.dateHeureEntree)}</td>
                    <td class="p-3 text-slate-600">${fmtDateTime(p.dateHeureSortie)}</td>
                    <td class="p-3 text-slate-600 font-mono text-xs">${fmtDuree(p.dureeMinutes)}</td>
                    <td class="p-3">${modeBadge(p.mode)}</td>
                    <td class="p-3 text-slate-500">${p.siteNom || 'â€”'}</td>
                    <td class="p-3 text-xs ${p.anomalie ? 'text-red-600 font-semibold' : 'text-slate-400'}">${p.anomalie || 'â€”'}</td>
                    <td class="p-3">${statutBadge(p.statut)}</td>
                </tr>
            `).join(''));
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
            document.getElementById('statDureeAvg').textContent = avgDuree || 'â€”';
            document.getElementById('pointageCount').textContent = `${total} enregistrement${total > 1 ? 's' : ''}`;
        }

        function filterPointageTable() {
            const agentQ = (document.getElementById('pointageAgentFilter')?.value || '').toLowerCase();
            const modeQ = document.getElementById('pointageModeFilter')?.value || '';
            const filtered = _allPointages.filter(p => {
                const matchAgent = !agentQ || (p.agentNom || '').toLowerCase().includes(agentQ);
                const matchMode = !modeQ || (p.mode || '') === modeQ;
                return matchAgent && matchMode;
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
                    '<tr><td colspan="8" class="p-4 text-center text-slate-400">Chargementâ€¦</td></tr>');

                _allPointages = await apiFetch(url) || [];
                renderPointageRows(_allPointages);
                updatePointageStats(_allPointages);
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
                        <td class="p-3 font-semibold text-slate-800">${d.date || 'â€”'}</td>
                        <td class="p-3">
                            <span class="badge bg-sky-100 text-sky-700">${d.total} pointage${d.total > 1 ? 's' : ''}</span>
                        </td>
                        <td class="p-3">
                            <button onclick="viewDatePointages('${d.date}')"
                                class="text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline transition-colors">
                                Voir le dÃ©tail â†’
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
        // â”€â”€ END POINTAGE HISTORY MODULE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


        async function loadPresences() {
            try {
                const mois = document.getElementById('presencesMois')?.value;
                if (!mois) {
                    safeRenderTbody(document.getElementById('presencesTableBody'), '<tr><td colspan="5" class="p-3 text-center text-slate-400">SÃ©lectionnez un mois.</td></tr>');
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
                            <td class="p-2 font-bold">${p.agentNom || 'â€”'}</td>
                            <td class="p-2 text-slate-500">${p.date || 'â€”'}</td>
                            <td class="p-2 text-slate-500">${p.heureArrivee || 'â€”'}</td>
                            <td class="p-2 text-slate-500">${p.heureDepart || 'â€”'}</td>
                            <td class="p-2 text-slate-500">${p.presence || 'â€”'}</td>
                            <td class="p-2 text-slate-500">${p.siteTravail || 'â€”'}</td>
                            <td class="p-2 text-slate-500">${p.employeur || 'â€”'}</td>
                            <td class="p-2">${p.retard ? '<span class="badge bg-red-100 text-red-700">RETARD</span>' : '<span class="badge bg-green-100 text-green-700">OK</span>'}</td>
                        </tr>
                    `;
                }).join('');

                const hours = Math.floor(totalHeures / 60);
                const minutes = totalHeures % 60;
                const totalRowHtml = presences && presences.length > 0 ? `
                    <tr class="bg-slate-200 font-bold border-t-2 border-slate-300">
                        <td class="p-2" colspan="4">TOTAUX</td>
                        <td class="p-2">${totalPresences} prÃ©sence(s)</td>
                        <td class="p-2" colspan="2">Total d'heures: ${hours}h${minutes.toString().padStart(2, '0')}</td>
                        <td class="p-2 text-red-600">${totalRetards} retard(s)</td>
                    </tr>
                ` : '';

                safeRenderTbody(document.getElementById('presencesTableBody'),
                    (rowsHtml || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucune prÃ©sence.</td></tr>') + totalRowHtml
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
                    throw new Error("Erreur lors de l'exportation des prÃ©sences: " + response.statusText);
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
                        assignZoneSelect.innerHTML = '<option value="">SÃ©lectionner une zone...</option>' +
                            zones.map(z => `<option value="${z.id}">${z.nom} (${z.villes ? (Array.isArray(z.villes) ? z.villes.join(', ') : z.villes) : z.perimetre || ''})</option>`).join('');
                    }

                    const coords = await apiFetch('/organisation/coordonnateurs') || [];
                    const assignCoordSelect = document.getElementById('assignCoordSelect');
                    if (assignCoordSelect) {
                        assignCoordSelect.innerHTML = '<option value="">Aucun (Assigner Ã  la Zone uniquement)</option>' +
                            coords.map(c => `<option value="${c.id}">${c.nom} ${c.prenom} (${c.zoneNom || 'Sans zone'})</option>`).join('');
                    }
                } catch (errPop) {
                    console.error("Erreur remplissage dropdowns assignation zone :", errPop);
                }

                // Chargement de l'inventaire
                const materiels = await apiFetch('/materiels') || [];
                const displayElem = document.getElementById('materielCountDisplay');
                if (displayElem) displayElem.textContent = `${materiels.length} Ã©quipement(s)`;

                // Populate disponible materiel select for zone assignment
                const assignZoneMaterielSelect = document.getElementById('assignZoneMaterielSelect');
                if (assignZoneMaterielSelect) {
                    const disponibles = materiels.filter(m => (m.statut || '').toUpperCase() === 'DISPONIBLE');
                    if (disponibles.length === 0) {
                        assignZoneMaterielSelect.innerHTML = '<option value="">Aucun matÃ©riel disponible...</option>';
                    } else {
                        assignZoneMaterielSelect.innerHTML = '<option value="">Choisir un matÃ©riel disponible...</option>' +
                            disponibles.map(m => `<option value="${m.id}">${m.libelle || m.nom} - S/N: ${m.numeroSerie || m.serialNumber || 'â€”'}</option>`).join('');
                    }
                }

                safeRenderTbody(document.getElementById('materielTableBody'),
                    materiels.map(m => {
                        let statusBadge = '';
                        const st = (m.statut || '').toUpperCase();
                        if (st === 'DISPONIBLE') {
                            statusBadge = '<span class="badge bg-green-100 text-green-700 font-bold">ðŸŸ¢ Disponible</span>';
                        } else if (st === 'ASSIGNE' || st === 'REMIS') {
                            statusBadge = '<span class="badge bg-sky-100 text-sky-700 font-bold">ðŸ”µ AssignÃ©</span>';
                        } else if (st === 'DEFECTUEUX' || st === 'EN_PANNE' || st === 'REPARATION') {
                            statusBadge = '<span class="badge bg-amber-100 text-amber-800 font-bold">âš ï¸ En Panne / DÃ©faut</span>';
                        } else if (st === 'INUTILISABLE') {
                            statusBadge = '<span class="badge bg-rose-100 text-rose-700 font-bold">â›” Inutilisable</span>';
                        } else if (st === 'PERDU') {
                            statusBadge = '<span class="badge bg-purple-100 text-purple-700 font-bold">ðŸ” Perdu</span>';
                        } else {
                            statusBadge = `<span class="badge bg-slate-100 text-slate-700 font-bold">${st || 'â€”'}</span>`;
                        }

                        const val = m.valeurAchat != null ? `${Number(m.valeurAchat).toFixed(2)} â‚¬` : 'â€”';
                        const numSerie = m.numeroSerie || m.serialNumber || 'â€”';
                        const imeiStr = m.imei ? ` / ${m.imei}` : '';

                        // Read zone and coordonnateur from nested API objects
                        const zoneText = (m.zone && m.zone.nom) ? m.zone.nom : (m.zoneNom || null);
                        const coordText = m.coordonnateur ? `${m.coordonnateur.nom || ''} ${m.coordonnateur.prenom || ''}`.trim() : (m.coordonnateurNom || null);

                        let assignmentInfo = '<span class="text-slate-400 text-xs">â€”</span>';
                        if (zoneText || coordText) {
                            assignmentInfo = `
                                <div class="space-y-0.5">
                                    ${zoneText ? `<div class="text-xs font-bold text-slate-700">ðŸ“ ${zoneText}</div>` : ''}
                                    ${coordText ? `<div class="text-[10px] text-sky-600 font-semibold">ðŸ‘¤ ${coordText}</div>` : ''}
                                </div>
                            `;
                        }

                        return `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="p-3 font-bold text-slate-800">${m.libelle || m.nom || 'â€”'}</td>
                                <td class="p-3 text-slate-600">${m.categorie || 'â€”'}</td>
                                <td class="p-3 font-mono text-slate-600 font-semibold">${numSerie}${imeiStr}</td>
                                <td class="p-3 text-slate-700 font-bold">${val}</td>
                                <td class="p-3 text-slate-600">${assignmentInfo}</td>
                                <td class="p-3">${statusBadge}</td>
                            </tr>
                        `;
                    }).join('') || '<tr><td colspan="6" class="p-3 text-center text-slate-400">Aucun matÃ©riel dans l\'inventaire.</td></tr>'
                );

                const paramMaterielTbody = document.getElementById('paramMaterielTableBody');
                if (paramMaterielTbody) {
                    paramMaterielTbody.innerHTML = materiels.map(m => {
                        let statusBadge = '';
                        const st = (m.statut || '').toUpperCase();
                        if (st === 'DISPONIBLE') {
                            statusBadge = '<span class="badge bg-green-100 text-green-700 font-bold">ðŸŸ¢ Disponible</span>';
                        } else if (st === 'ASSIGNE' || st === 'REMIS') {
                            statusBadge = '<span class="badge bg-sky-100 text-sky-700 font-bold">ðŸ”µ AssignÃ©</span>';
                        } else if (st === 'DEFECTUEUX' || st === 'EN_PANNE' || st === 'REPARATION') {
                            statusBadge = '<span class="badge bg-amber-100 text-amber-800 font-bold">âš ï¸ En Panne</span>';
                        } else {
                            statusBadge = `<span class="badge bg-slate-100 text-slate-700 font-bold">${st || 'â€”'}</span>`;
                        }
                        const numSerie = m.numeroSerie || m.serialNumber || 'â€”';
                        const imeiStr = m.imei ? ` / ${m.imei}` : '';
                        return `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="p-3 font-bold text-slate-800">${m.libelle || m.nom || 'â€”'}</td>
                                <td class="p-3 text-slate-600">${m.categorie || 'â€”'}</td>
                                <td class="p-3 font-mono text-slate-600 font-semibold">${numSerie}${imeiStr}</td>
                                <td class="p-3">${statusBadge}</td>
                                <td class="p-3 text-right">
                                    <button onclick="deleteMateriel('${m.id}')" class="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded-lg font-bold transition-colors">
                                        <i class="fa-solid fa-trash"></i> Supprimer
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('') || '<tr><td colspan="5" class="p-3 text-center text-slate-400">Aucun matÃ©riel.</td></tr>';
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
                            actionButtons = `<span class="text-xs text-slate-400">â€”</span>`;
                        }

                        let statusBadge = '';
                        if (d.statut === 'APPROUVE') {
                            statusBadge = '<span class="badge bg-green-100 text-green-700 font-bold">ApprouvÃ©e</span>';
                        } else if (d.statut === 'REFUSE') {
                            statusBadge = '<span class="badge bg-red-100 text-red-700 font-bold">RefusÃ©e</span>';
                        } else {
                            statusBadge = '<span class="badge bg-amber-100 text-amber-700 font-bold">En attente</span>';
                        }

                        const val = d.valeurAchat != null ? `${Number(d.valeurAchat).toFixed(2)} â‚¬` : 'â€”';
                        const numSerie = d.numeroSerie || 'â€”';

                        // Display Coordinator and assigned Zone upon approval
                        const coordName = d.coordonnateurNom || (d.coordonnateur ? `${d.coordonnateur.nom} ${d.coordonnateur.prenom}` : 'â€”');
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
                                <td class="p-3 font-bold text-slate-800">${d.libelle || 'â€”'}</td>
                                <td class="p-3 text-slate-600">${d.categorie || 'â€”'}</td>
                                <td class="p-3 font-mono text-slate-600 font-semibold">${numSerie}</td>
                                <td class="p-3 text-slate-700 font-bold">${val}</td>
                                <td class="p-3 text-slate-500 italic max-w-xs truncate" title="${d.motif || ''}">"${d.motif || 'Aucun motif'}"</td>
                                <td class="p-3">${statusBadge}</td>
                                <td class="p-3 text-right">${actionButtons}</td>
                            </tr>
                        `;
                    }).join('') || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucune demande de matÃ©riel reÃ§ue.</td></tr>'
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
                                    <td class="p-3 font-semibold text-slate-700">${h.agentNom || h.agentMatricule || 'â€”'}</td>
                                    <td class="p-3 font-bold text-slate-800">${h.materielLibelle || 'â€”'}</td>
                                    <td class="p-3 font-mono text-slate-600 font-semibold">${h.materielNumeroSerie || 'â€”'}</td>
                                    <td class="p-3 text-slate-500">${h.dateRemise || 'â€”'}</td>
                                    <td class="p-3 text-slate-500">${h.dateRetour || 'â€”'}</td>
                                    <td class="p-3 text-slate-600">${h.etatRemise || 'Bon Ã©tat'}</td>
                                    <td class="p-3 text-slate-600">${h.etatRetour || 'â€”'}</td>
                                    <td class="p-3">${statBadge}</td>
                                </tr>
                            `;
                        }).join('') || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucun historique d\'affectation.</td></tr>'
                    );
                } catch (e) {
                    console.error("Erreur historique matÃ©riel:", e);
                }
            } catch (e) {
                console.error(e);
                safeRenderTbody(document.getElementById('materielTableBody'), '<tr><td colspan="6" class="p-3 text-center text-red-500">Erreur chargement matÃ©riel</td></tr>');
            }
        }

        window.assignMaterielToZone = async function() {
            const materielId = document.getElementById('assignZoneMaterielSelect')?.value;
            const zoneId = document.getElementById('assignZoneSelect')?.value;
            const coordonnateurId = document.getElementById('assignCoordSelect')?.value || null;

            if (!materielId || !zoneId) {
                alert("Veuillez sÃ©lectionner le matÃ©riel Ã  assigner et la zone de destination.");
                return;
            }

            try {
                // Try specific endpoint for zone assignment first
                await apiFetch(`/materiels/${materielId}/assigner-zone`, {
                    method: 'POST',
                    body: JSON.stringify({ zoneId, coordonnateurId })
                });
                alert("MatÃ©riel assignÃ© Ã  la zone avec succÃ¨s !");
                loadMateriel();
            } catch (e) {
                try {
                    // Fallback route using remise or update
                    await apiFetch(`/materiels/${materielId}/remise`, {
                        method: 'POST',
                        body: JSON.stringify({ zoneId, coordonnateurId, signatureUrl: '' })
                    });
                    alert("MatÃ©riel assignÃ© Ã  la zone avec succÃ¨s !");
                    loadMateriel();
                } catch (errFallback) {
                    alert("Erreur lors de l'assignation du matÃ©riel : " + errFallback.message);
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
                    alert("LibellÃ© requis.");
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

                alert("Emploi ajoutÃ© au catalogue avec succÃ¨s !");
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

                alert("MatÃ©riel ajoutÃ© au stock avec succÃ¨s !");
                loadMateriel();
            } catch (e) {
                alert("Erreur : " + e.message);
            }
        };

        window.deleteMateriel = async function(id) {
            if (!confirm("Supprimer ce matÃ©riel du stock ?")) return;
            try {
                await apiFetch(`/materiels/${id}`, { method: 'DELETE' });
                alert("MatÃ©riel supprimÃ© avec succÃ¨s !");
                loadMateriel();
            } catch (e) {
                alert("Erreur lors de la suppression du matÃ©riel : " + e.message);
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
                    alert("Veuillez renseigner le nom/libellÃ© du matÃ©riel.");
                    return;
                }
                if (!numeroSerie) {
                    alert("Veuillez indiquer un numÃ©ro de sÃ©rie.");
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
                
                alert("MatÃ©riel ajoutÃ© au stock avec succÃ¨s !");
                loadMateriel();
            } catch (e) {
                console.error(e);
                alert('Erreur lors de la crÃ©ation du matÃ©riel: ' + e.message);
            }
        };

        window.declarerIncidentMateriel = async function(id, libelle) {
            const choixStatut = prompt(
                `DÃ©claration d'incident pour "${libelle}" :\n\n` +
                `Tapez le numÃ©ro ou le nom de l'incident :\n` +
                `1 - DEFECTUEUX (DÃ©faut / Panne technique)\n` +
                `2 - INUTILISABLE (Hors service / CassÃ© irrÃ©parable)\n` +
                `3 - PERDU (MatÃ©riel perdu / Ã©garÃ© par un agent)\n`,
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

            const details = prompt(`PrÃ©cisez les dÃ©tails ou le motif de l'incident (ex: Chute lors de la mission, bouton radio cassÃ©...) :`, "");
            if (details === null) return;

            try {
                await apiFetch(`/materiels/${id}/incident`, {
                    method: 'POST',
                    body: JSON.stringify({ statut, details: details || '' })
                });

                alert(`Incident enregistrÃ© (${statut}) ! L'Ã©tat du matÃ©riel a Ã©tÃ© mis Ã  jour.`);
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
                            actionButtons = `<span class="text-xs text-slate-400">â€”</span>`;
                        }

                        let statusBadge = '';
                        if (c.statut === 'VALIDEE') {
                            statusBadge = '<span class="badge bg-green-100 text-green-700">ValidÃ©e</span>';
                        } else if (c.statut === 'REFUSEE') {
                            statusBadge = '<span class="badge bg-red-100 text-red-700">RefusÃ©e</span>';
                        } else {
                            statusBadge = `<span class="badge bg-amber-100 text-amber-700">${c.statut.replace('EN_ATTENTE_', 'Attente ')}</span>`;
                        }

                        const agentName = c.agent ? `${c.agent.nom} ${c.agent.prenom}` : 'â€”';

                        const justifCell = c.justifUrl
                            ? `<a href="${c.justifUrl}" target="_blank" class="text-sky-600 hover:underline font-bold text-[10px] flex items-center gap-1"><i class="fa-solid fa-file text-sky-400"></i> Voir</a>`
                            : `<span class="text-slate-300 text-xs">â€”</span>`;
                        return `
                            <tr class="hover:bg-slate-50/50 transition-colors">
                                <td class="p-3 font-bold text-slate-800">${agentName}</td>
                                <td class="p-3 text-slate-600 font-semibold">${c.type || 'â€”'}</td>
                                <td class="p-3 text-slate-500">${c.dateDebut || 'â€”'}</td>
                                <td class="p-3 text-slate-500">${c.dateFin || 'â€”'}</td>
                                <td class="p-3 text-slate-500">${c.structureCliente || 'â€”'}</td>
                                <td class="p-3 text-slate-500">${c.posteOccupe || 'â€”'}</td>
                                <td class="p-3">${justifCell}</td>
                                <td class="p-3">${statusBadge}</td>
                                <td class="p-3">${actionButtons}</td>
                            </tr>
                        `;
                    }).join('') || '<tr><td colspan="9" class="p-3 text-center text-slate-400">Aucune demande de congÃ© ou absence en cours.</td></tr>'
                );
            } catch (e) {
                console.error(e);
                safeRenderTbody(document.getElementById('congesTableBody'), '<tr><td colspan="8" class="p-3 text-center text-red-500">Erreur chargement congÃ©s</td></tr>');
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
                alert('Erreur lors de la validation du congÃ©: ' + e.message);
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
                    const agentNom = s.agent ? `${s.agent.nom || ''} ${s.agent.prenom || ''}`.trim() : (s.agentNom || 'â€”');
                    const decisionHtml = s.decisionUrl ? `<a href="${s.decisionUrl}" target="_blank" class="text-sky-600 hover:underline inline-flex items-center gap-1 font-bold">ðŸ“„ Voir</a>` : 'â€”';
                    const dateFinStr = s.dateFin ? s.dateFin : 'IndÃ©terminÃ©e';
                    const badgeColor = s.statut === 'VALIDE' || s.statut === 'TERMINE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
                    return `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="p-3 font-bold text-slate-800">${agentNom}</td>
                            <td class="p-3 text-slate-600 font-medium">${s.clientFinal || 'â€”'}</td>
                            <td class="p-3 text-slate-600 font-medium">${s.type || 'â€”'}</td>
                            <td class="p-3 text-slate-500">${s.dateDecision || 'â€”'}</td>
                            <td class="p-3 text-slate-500">${dateFinStr}</td>
                            <td class="p-3 text-slate-500 max-w-xs truncate" title="${s.motif || ''}">${s.motif || 'â€”'}</td>
                            <td class="p-3"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">${s.statut || 'EN_COURS'}</span></td>
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
                safeRenderTbody(document.getElementById('evaluationsTableBody'), '<tr><td colspan="7" class="p-3 text-center text-red-500">Erreur chargement Ã©valuations</td></tr>');
            }
        }

        function renderEvaluations(list) {
            safeRenderTbody(document.getElementById('evaluationsTableBody'),
                list.map(ev => {
                    const agentNom = ev.agent ? `${ev.agent.nom || ''} ${ev.agent.prenom || ''}`.trim() : (ev.agentNom || 'â€”');
                    const dateEval = ev.dateEvaluation ? ev.dateEvaluation : 'â€”';
                    // Cherche structureCliente dans plusieurs champs possibles
                    const structureEv = ev.structureCliente
                        || ev.clientFinal
                        || (ev.agent && (ev.agent.structureCliente || ev.agent.clientFinal || ev.agent.structure))
                        || 'â€”';
                    const evaluateurEv = ev.employeurEvaluateur || ev.evaluateurNom || ev.evaluateur || 'â€”';
                    return `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="p-3 font-bold text-slate-800">${agentNom}</td>
                            <td class="p-3 text-slate-600 font-medium">${structureEv}</td>
                            <td class="p-3 text-slate-500 font-medium">${evaluateurEv}</td>
                            <td class="p-3 text-slate-600 font-medium">${ev.annee || 'â€”'}</td>
                            <td class="p-3 text-slate-500">${dateEval}</td>
                            <td class="p-3 text-slate-800 font-bold"><span class="px-2.5 py-0.5 rounded bg-sky-50 text-sky-700">${ev.scoreTotal || ev.scoreTotalCalcule || '0'}/80</span></td>
                            <td class="p-3 text-slate-500 max-w-xs truncate" title="${ev.commentaire || ''}">${ev.commentaire || 'â€”'}</td>
                        </tr>
                    `;
                }).join('') || '<tr><td colspan="7" class="p-3 text-center text-slate-400">Aucune Ã©valuation.</td></tr>'
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

            const titre = payload.titre || 'Rapport OpÃ©rationnel';
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
                            <div><span class="font-bold text-slate-800">Date de GÃ©nÃ©ration :</span> ${dateGen}</div>
                            <div><span class="font-bold text-slate-800">PÃ©riode concernÃ©e :</span> <span class="px-2 py-0.5 rounded bg-brand-50 text-brand-700 font-bold">${period}</span></div>
                        </div>
                    </div>
            `;

            // 1. PrÃ©sences & Pointages Section
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
                            <span>â±ï¸ 1. PRÃ‰SENCES & POINTAGES</span>
                            <span class="text-slate-300 font-normal">EntrÃ©es: ${sec.nombre_entrees || list.length} | JournÃ©es: ${sec.journees_presentes || 'â€”'}</span>
                        </div>
                        <div class="overflow-x-auto border border-slate-200 rounded-xl">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th class="p-3">Agent</th>
                                        <th class="p-3">Date</th>
                                        <th class="p-3">Heure d'arrivÃ©e</th>
                                        <th class="p-3">Heure de dÃ©part</th>
                                        <th class="p-3">PrÃ©sence</th>
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
                                                    <td class="p-3 font-semibold text-slate-900">${p.agentNom || p.agent || 'â€”'}</td>
                                                    <td class="p-3 text-slate-600">${p.date || 'â€”'}</td>
                                                    <td class="p-3 text-slate-600">${p.heureArrivee || p.heure_entree || 'â€”'}</td>
                                                    <td class="p-3 text-slate-600">${p.heureDepart || p.heure_sortie || 'â€”'}</td>
                                                    <td class="p-3 text-slate-600">${p.presence || 'â€”'}</td>
                                                    <td class="p-3 text-slate-600">${p.siteTravail || 'â€”'}</td>
                                                    <td class="p-3 text-slate-600">${p.employeur || 'â€”'}</td>
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
                                                    <td class="p-3">${list.length} prÃ©sence(s)</td>
                                                    <td class="p-3" colspan="2">Total d'heures: ${hours}h${mins.toString().padStart(2, '0')}</td>
                                                    <td class="p-3 text-red-600">${totalRetards} retard(s)</td>
                                                </tr>
                                            `;
                                        }
                                        return rows || '<tr><td colspan="8" class="p-3 text-center text-slate-400">Aucun pointage enregistrÃ© sur la pÃ©riode.</td></tr>';
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            // 2. CongÃ©s & Absences Section
            if (payload.conges) {
                const sec = payload.conges;
                const list = sec.liste || [];
                html += `
                    <div class="space-y-3 pt-2">
                        <div class="flex justify-between items-center bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs">
                            <span>ðŸŒ´ 2. CONGÃ‰S & ABSENCES</span>
                            <span class="text-slate-300 font-normal">Total: ${sec.total_demandes || list.length} | ApprouvÃ©s: ${sec.approuves || 0} | En attente: ${sec.en_attente || 0}</span>
                        </div>
                        <div class="overflow-x-auto border border-slate-200 rounded-xl">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th class="p-3">Agent</th>
                                        <th class="p-3">Type</th>
                                        <th class="p-3">PÃ©riode</th>
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
                                            <td class="p-3 font-semibold text-slate-900">${c.agent || 'â€”'}</td>
                                            <td class="p-3 text-slate-600">${c.type || 'CONGE'}</td>
                                            <td class="p-3 text-slate-600">${c.debut || 'â€”'} au ${c.fin || 'â€”'}</td>
                                            <td class="p-3 font-bold text-slate-800">${c.jours || 0} j</td>
                                            <td class="p-3"><span class="px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${badgeClass}">${st}</span></td>
                                        </tr>
                                        `;
                                    }).join('') : '<tr><td colspan="5" class="p-3 text-center text-slate-400">Aucune demande de congÃ© enregistrÃ©e sur la pÃ©riode.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            // 3. MatÃ©riels & Ã‰quipements Section
            if (payload.materiels) {
                const sec = payload.materiels;
                const list = sec.liste || [];
                html += `
                    <div class="space-y-3 pt-2">
                        <div class="flex justify-between items-center bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs">
                            <span>ðŸ“¦ 3. PARC MATÃ‰RIEL & Ã‰QUIPEMENTS</span>
                            <span class="text-slate-300 font-normal">Total: ${sec.total_equipements || list.length} | Disponibles: ${sec.disponibles || 0} | En Panne: ${sec.en_panne || 0}</span>
                        </div>
                        <div class="overflow-x-auto border border-slate-200 rounded-xl">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th class="p-3">Ã‰quipement</th>
                                        <th class="p-3">CatÃ©gorie</th>
                                        <th class="p-3">NÂ° SÃ©rie</th>
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
                                            <td class="p-3 font-semibold text-slate-900">${m.libelle || 'â€”'}</td>
                                            <td class="p-3 text-slate-600">${m.categorie || 'AUTRE'}</td>
                                            <td class="p-3 font-mono text-slate-500">${m.numero_serie || 'â€”'}</td>
                                            <td class="p-3 font-bold text-slate-800">${m.valeur || '0 EUR'}</td>
                                            <td class="p-3"><span class="px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${badgeClass}">${st}</span></td>
                                        </tr>
                                        `;
                                    }).join('') : '<tr><td colspan="5" class="p-3 text-center text-slate-400">Aucun Ã©quipement enregistrÃ© dans l\'inventaire.</td></tr>'}
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
                            <span>âš–ï¸ 4. DISCIPLINAIRE & SANCTIONS</span>
                            <span class="text-slate-300 font-normal">Sanctions: ${sec.total_sanctions || list.length}</span>
                        </div>
                        <div class="overflow-x-auto border border-slate-200 rounded-xl">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th class="p-3">Agent</th>
                                        <th class="p-3">Sanction</th>
                                        <th class="p-3">Motif</th>
                                        <th class="p-3">Date DÃ©cision</th>
                                        <th class="p-3">Statut</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${list.length ? list.map(s => `
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="p-3 font-semibold text-slate-900">${s.agent || 'â€”'}</td>
                                            <td class="p-3 font-bold text-rose-700">${s.type || 'SANCTION'}</td>
                                            <td class="p-3 text-slate-600 max-w-xs truncate">${s.motif || 'â€”'}</td>
                                            <td class="p-3 text-slate-600">${s.date || 'â€”'}</td>
                                            <td class="p-3"><span class="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-slate-100 text-slate-700 border border-slate-200">${s.statut || 'ACTIVE'}</span></td>
                                        </tr>
                                    `).join('') : '<tr><td colspan="5" class="p-3 text-center text-slate-400">Aucune sanction enregistrÃ©e sur la pÃ©riode.</td></tr>'}
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
                            <span>ðŸš€ 5. MISSIONS & DÃ‰PLACEMENTS</span>
                            <span class="text-slate-300 font-normal">Missions: ${sec.total_missions || list.length}</span>
                        </div>
                        <div class="overflow-x-auto border border-slate-200 rounded-xl">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th class="p-3">Titre Mission</th>
                                        <th class="p-3">Agent AssignÃ©</th>
                                        <th class="p-3">DÃ©but</th>
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
                                            <td class="p-3 font-semibold text-slate-900">${m.titre || 'â€”'}</td>
                                            <td class="p-3 text-slate-600">${m.agent || 'â€”'}</td>
                                            <td class="p-3 text-slate-600">${m.debut || 'â€”'}</td>
                                            <td class="p-3 text-slate-600">${m.fin || 'â€”'}</td>
                                            <td class="p-3"><span class="px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${badgeClass}">${st}</span></td>
                                        </tr>
                                        `;
                                    }).join('') : '<tr><td colspan="5" class="p-3 text-center text-slate-400">Aucune mission enregistrÃ©e sur la pÃ©riode.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            }

            // Document Footer
            html += `
                    <div class="border-t border-slate-200 pt-4 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400">
                        <div>SimpleTaff - SystÃ¨me d'Information OpÃ©rationnel SaaS</div>
                        <div>AperÃ§u visuel identique au document tÃ©lÃ©chargeable (PDF / Excel)</div>
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
                        const user = l.utilisateurEmail || l.utilisateur || l.username || 'SystÃ¨me';
                        const act = l.action || l.type || 'â€”';
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

        // CongÃ© form submit
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
                const res = await fetch('/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }, body: fd });
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
                    apiFetch('/missions?agentId=' + agentId)
                ]);
                var ag = results[0].status==='fulfilled' ? results[0].value : {};
                var cg = results[1].status==='fulfilled' ? (results[1].value||[]) : [];
                var sc = results[2].status==='fulfilled' ? (results[2].value||[]) : [];
                var ms = results[3].status==='fulfilled' ? (results[3].value||[]) : [];
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
                        '<div class="grid grid-cols-2 md:grid-cols-3 gap-4">' +
                            '<div class="bg-amber-50 rounded-xl p-4 text-center"><div class="text-2xl font-black text-amber-700">' + cg.filter(function(x){return x.statut==='VALIDEE';}).length + '</div><div class="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-wide">Conges valides</div></div>' +
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
            var url = '/rapports/agent/' + agentId + '?' + params;
            showToast && showToast('Generation du rapport...','info');
            try {
                var res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('authToken')||'') } });
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


        // â”€â”€â”€ Admin: Zoom / Modal QR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

        // â”€â”€â”€ Admin: GÃ©nÃ©ration PDF Badge Agent (avec QR) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                doc.text('Badge de pointage â€” AccÃ¨s sÃ©curisÃ©', 35, 26);

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
                doc.text('Agent Terrain' + (zone ? ' â€” ' + zone : ''), W / 2, 119, { align: 'center' });

                doc.setDrawColor(186, 230, 253); doc.setLineWidth(0.5);
                doc.line(30, 126, W - 30, 126);

                const qrSize = 88;
                doc.addImage(qrDataUrl, 'PNG', (W - qrSize) / 2, 134, qrSize, qrSize);

                doc.setFontSize(9); doc.setTextColor(100, 116, 139);
                doc.text('Scannez ce code lors de chaque pointage', W / 2, 231, { align: 'center' });

                doc.setFillColor(224, 242, 254);
                doc.roundedRect(30, 237, W - 60, 14, 4, 4, 'F');
                doc.setFontSize(8); doc.setTextColor(3, 105, 161); doc.setFont('helvetica', 'bold');
                doc.text('ðŸ”’  Code sÃ©curisÃ© JWT â€” Usage strictement personnel', W / 2, 246, { align: 'center' });

                doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
                const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
                doc.text(`Ã‰mis le ${now}`, W / 2, 258, { align: 'center' });

                doc.setFillColor(2, 132, 199);
                doc.rect(0, H - 12, W, 12, 'F');
                doc.setTextColor(255, 255, 255); doc.setFontSize(8);
                doc.text('SimpleTaff â€” Plateforme de Gestion du Personnel', W / 2, H - 5, { align: 'center' });

                doc.save(`Badge_${fullName.replace(/ /g, '_')}.pdf`);
            });
        };

        // â”€â”€â”€ Admin: Impression Badge Agent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        window.printAdminBadge = function(fullName, qrData, zone) {
            QRCode.toDataURL(qrData, { width: 400, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } }, function(err, qrDataUrl) {
                if (err) return;
                const initiales = fullName.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase();
                const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
                const w = window.open('', '_blank', 'width=700,height=900');
                w.document.write(`<!DOCTYPE html><html><head><title>Badge â€” ${fullName}</title>
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
    <div class="role">Agent Terrain${zone ? ' â€” ' + zone : ''}</div>
    <hr class="divider">
    <div class="qr-wrap"><img src="${qrDataUrl}" width="180" height="180"></div>
    <p class="instruction">Scannez ce QR lors de chaque pointage</p>
    <div class="security">ðŸ”’ Code sÃ©curisÃ© â€” Usage strictement personnel</div>
    <div class="date">Ã‰mis le ${now}</div>
  </div>
  <div class="footer">SimpleTaff â€” Gestion du Personnel &copy; ${new Date().getFullYear()}</div>
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
                const lastUnreadCount = parseInt(badge.dataset.lastCount || '0');
                if (unread.length > lastUnreadCount) {
                    if (window.showToast) window.showToast("Vous avez de nouvelles notifications", "info");
                }
                badge.dataset.lastCount = unread.length;

                if (unread.length > 0) {
                    badge.textContent = unread.length;
                    badge.classList.remove('hidden');
                    badge.style.display = 'inline-flex';
                } else {
                    badge.classList.add('hidden');
                    badge.style.display = '';
                }

                container.innerHTML = validNotifications.map(n => {
                    const isUnread = n.statut !== 'LU';
                    return `
                        <div class="p-3 hover:bg-slate-50 flex justify-between items-start gap-2 ${isUnread ? 'bg-sky-50/40 font-semibold' : ''}">
                            <div class="flex-1">
                                <p class="text-slate-800">${n.message || 'â€”'}</p>
                                <span class="text-[10px] text-slate-400">${new Date(n.creeLe || Date.now()).toLocaleString()}</span>
                            </div>
                            <div class="flex gap-1.5 items-center">
                                ${isUnread ? `<button onclick="markNotificationAsRead('${n.id}')" class="text-[10px] text-sky-600 hover:text-sky-800 font-bold" title="Marquer comme lu">âœ“</button>` : ''}
                                <button onclick="deleteNotification('${n.id}')" class="text-[10px] text-rose-600 hover:text-rose-800 font-bold" title="Supprimer">âœ•</button>
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

        // â”€â”€ Mobile sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

        // Close sidebar when a nav item is clicked on mobile
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 768) closeMobileSidebar();
            });
        });

        // â”€â”€ Toast helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        window.showToast = function(message, type = 'info', duration = 3500) {
            const container = document.getElementById('toast-container');
            if (!container) return;
            const icons = { success: 'âœ“', error: 'âœ•', info: 'â„¹' };
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.innerHTML = `<span style="font-size:15px">${icons[type] || 'â„¹'}</span><span>${message}</span>`;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(6px)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        };
        // showTab est dÃ©fini globalement dans le <head> pour Ã©viter les ReferenceErrors.
    
