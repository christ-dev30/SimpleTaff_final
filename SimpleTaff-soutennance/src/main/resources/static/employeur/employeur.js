import { apiFetch, logout, checkAuth } from '/shared/api.js';
        
        window.logout = logout;
        let html5QrCode = null;
        let pendingPointageType = null;

        function showTab(name) {
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            document.getElementById('tab-' + name).classList.add('active');
            
            document.querySelectorAll('.sidebar-link').forEach(l => {
                if (l.getAttribute('onclick')?.includes("'" + name + "'")) l.classList.add('active');
            });
            
            // Stop scanning if leaving scan tab
            if (name !== 'pointage') {
                stopScanning();
            }

            if (name === 'overview') loadOverview();
            if (name === 'pointage') {
                loadPointageDates();
                loadPointagesLog();
            }
            if (name === 'personnel') loadPersonnelQr();
            if (name === 'evaluations') loadEvaluations();
            if (name === 'disciplinaire') loadDisciplinaire();
        }
        window.showTab = showTab;

        // ── Personnel Assigné ─────────────────────────────────────────────────
        async function loadPersonnelQr() {
            const grid = document.getElementById('personnelQrGrid');
            grid.innerHTML = `<div class="glass p-8 rounded-2xl text-center text-slate-400 text-sm col-span-full">Chargement des agents…</div>`;
            try {
                const agents = await apiFetch('/employeur/personnel/qr');
                if (!agents || agents.length === 0) {
                    grid.innerHTML = `<div class="glass p-8 rounded-2xl text-center text-slate-400 text-sm col-span-full">Aucun agent assigné à vos sites pour le moment.</div>`;
                    return;
                }
                grid.innerHTML = '';
                for (const agent of agents) {
                    const card = document.createElement('div');
                    card.className = 'glass rounded-2xl p-4 flex flex-col items-center gap-3 text-center shadow-sm hover:shadow-md transition-shadow';

                    const statutColor = agent.statut === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
                    const carteInfo = agent.carteStatut === 'AUCUNE'
                        ? `<span class="badge bg-red-100 text-red-600 text-[10px]">Pas de carte active</span>`
                        : `<span class="badge ${agent.carteStatut === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'} text-[10px]">Carte active</span>`;

                    const initiales = (agent.agentNom || 'AG').split(' ').map(p => p[0]).join('').toUpperCase().slice(0,2);

                    card.innerHTML = `
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-white font-extrabold text-lg shadow">${initiales}</div>
                        <div>
                            <div class="font-bold text-slate-900 text-sm">${agent.agentNom}</div>
                            <div class="text-xs text-slate-400">${agent.posteLibelle}</div>
                            <div class="text-[10px] text-slate-300 mt-0.5">${agent.siteNom}</div>
                        </div>
                        <div class="flex gap-1 flex-wrap justify-center">${carteInfo} <span class="badge ${statutColor} text-[10px]">${agent.statut}</span></div>
                        ${agent.identifiantNfc ? `<div class="text-[10px] text-slate-450 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100">NFC: ${agent.identifiantNfc.slice(0,20)}…</div>` : ''}
                        <div class="w-full grid grid-cols-2 gap-1.5 mt-1">
                            <button onclick="generateFichePdf('${agent.agentNom}','${agent.posteLibelle}','${agent.siteNom}','${agent.statut}')" class="flex items-center justify-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                Fiche PDF
                            </button>
                            <button onclick="printFiche('${agent.agentNom}','${agent.posteLibelle}','${agent.siteNom}','${agent.statut}')" class="flex items-center justify-center gap-1 bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold py-1.5 rounded-lg hover:bg-sky-100 transition-colors">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                                Imprimer
                            </button>
                        </div>
                    `;
                    grid.appendChild(card);
                }
            } catch (err) {
                grid.innerHTML = `<div class="glass p-8 rounded-2xl text-center text-red-400 text-sm col-span-full">Erreur de chargement : ${err.message}</div>`;
            }
        }
        window.loadPersonnelQr = loadPersonnelQr;

        // Start HTML5 QR Scanner
        function startScanning(typePointage = null) {
            pendingPointageType = typePointage;
            if (html5QrCode) {
                return;
            }
            document.getElementById('btnStartScan').classList.add('hidden');
            document.getElementById('btnStopScan').classList.remove('hidden');
            
            html5QrCode = new Html5Qrcode("reader");
            const config = { fps: 15, qrbox: { width: 250, height: 250 } };
            
            html5QrCode.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    // Success callback
                    document.getElementById('agentCardId').value = decodedText;
                    
                    // Visual feedback
                    const msg = document.getElementById('pointageMsg');
                    msg.textContent = `Code QR détecté : ${decodedText}`;
                    msg.className = 'text-xs p-3 rounded-lg bg-indigo-50 text-indigo-700';
                    msg.classList.remove('hidden');

                    const scannerContainer = document.getElementById('scannerContainer');
                    if (scannerContainer) {
                        scannerContainer.classList.remove('border-indigo-200', 'border-dashed');
                        scannerContainer.classList.add('border-emerald-500', 'border-solid', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]');
                        setTimeout(() => {
                            scannerContainer.classList.add('border-indigo-200', 'border-dashed');
                            scannerContainer.classList.remove('border-emerald-500', 'border-solid', 'shadow-[0_0_15px_rgba(16,185,129,0.3)]');
                        }, 2000);
                    }

                    if (pendingPointageType) {
                        const typeToSubmit = pendingPointageType;
                        pendingPointageType = null;
                        stopScanning();
                        enregistrerPointage(typeToSubmit);
                    }
                },
                (errorMessage) => {
                    // Fail callback (silent mostly)
                }
            ).catch(err => {
                console.error("Camera startup failed", err);
                alert("Impossible de démarrer la caméra. Assurez-vous d'avoir donné les permissions.");
                stopScanning();
            });
        }
        window.startScanning = startScanning;

        function stopScanning() {
            pendingPointageType = null;
            document.getElementById('btnStartScan').classList.remove('hidden');
            document.getElementById('btnStopScan').classList.add('hidden');
            
            if (html5QrCode) {
                html5QrCode.stop().then(() => {
                    html5QrCode = null;
                }).catch(err => console.error("Error stopping scanner", err));
            }
        }
        window.stopScanning = stopScanning;

        // ===== Pointage multi-modes (QR / NFC / Photo+GPS / Biométrie) =====
        let activePointageMode = 'QR_CODE';

        function setPointageMode(mode) {
            activePointageMode = mode;

            // Toggle styles
            const btns = {
                QR_CODE: document.getElementById('modeBtnQR'),
                NFC: document.getElementById('modeBtnNFC'),
                PHOTO_GPS: document.getElementById('modeBtnPHOTO'),
                BIOMETRIE: document.getElementById('modeBtnBIO')
            };

            Object.entries(btns).forEach(([key, el]) => {
                if (!el) return;
                const isActive = key === mode;
                el.classList.toggle('border-indigo-600', isActive);
                el.classList.toggle('bg-indigo-50', isActive);
                el.classList.toggle('text-indigo-700', isActive);
                el.classList.toggle('border-2', isActive && key === 'QR_CODE');

                // Default colors (keep simple)
                if (!isActive) {
                    el.classList.remove('bg-indigo-50');
                    el.classList.add('bg-white');
                    el.classList.remove('text-indigo-700');
                    el.classList.add('text-slate-700');
                    el.classList.remove('border-indigo-600');
                }
            });

            // Toggle photo section
            const photoSection = document.getElementById('photoGpsSection');
            if (photoSection) {
                photoSection.classList.toggle('hidden', mode !== 'PHOTO_GPS');
            }

            // QR mode can use camera, others are manual by id (ou future GPS/biometric integration)
            if (mode === 'QR_CODE') {
                document.getElementById('labelAgentCard').textContent = 'Identifiant (QR / NFC / Biometrie)';
            } else if (mode === 'NFC') {
                document.getElementById('labelAgentCard').textContent = 'Identifiant NFC (tag)';
            } else if (mode === 'BIOMETRIE') {
                document.getElementById('labelAgentCard').textContent = 'Identifiant Biométrie (ID lecteur)';
            } else if (mode === 'PHOTO_GPS') {
                document.getElementById('labelAgentCard').textContent = 'Identifiant (QR / NFC / Biometrie)';
            }
        }

        window.setPointageMode = setPointageMode;

        async function getCurrentGps() {
            return await new Promise((resolve) => {
                if (!navigator.geolocation) return resolve(null);
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                    },
                    () => resolve(null),
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 2000 }
                );
            });
        }

        async function tryReadSelfieAsDataUrl() {
            const input = document.getElementById('selfieFileInput');
            if (!input || !input.files || input.files.length === 0) return null;
            const file = input.files[0];
            // NOTE: we only send a dataUrl as a placeholder. Backend may not accept this yet.
            // If backend expects a URL, we must upload first.
            return await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });
        }

        // Register attendance pointage
        async function enregistrerPointage(typePointage) {
            const cardId = document.getElementById('agentCardId').value.trim();
            const msg = document.getElementById('pointageMsg');
            msg.className = 'hidden text-sm p-3 rounded-lg font-bold';

            const isQrMode = activePointageMode === 'QR_CODE';

            if (!cardId) {
                pendingPointageType = typePointage;

                if (isQrMode) {
                    startScanning(typePointage);
                    msg.textContent = `Scannez le QR code pour pointer ${typePointage}.`;
                    msg.classList.add('bg-indigo-50', 'text-indigo-700');
                    msg.classList.remove('hidden');
                    return;
                }

                msg.textContent = `Identifiant requis (${activePointageMode}).`;
                msg.classList.add('bg-red-50', 'text-red-700');
                msg.classList.remove('hidden');
                return;
            }

            try {
                // Backend (PointageController) supporte déjà mode/anomalie/selfieUrl/identifiantNfc/sourceBiometrie/GPS.
                // Ici on mappe le mode actif vers ces champs et on envoie vers l'endpoint employeur.
                const payload = {
                    cardId: cardId,
                    type: typePointage,
                    mode: activePointageMode,
                    anomalie: null,

                    // legacy key for backward compatibility with current controller signature
                    qrCode: (activePointageMode === 'QR_CODE' || activePointageMode === 'PHOTO_GPS') ? cardId : undefined,
                    identifiantNfc: (activePointageMode === 'NFC') ? cardId : undefined,
                    sourceBiometrie: (activePointageMode === 'BIOMETRIE') ? cardId : undefined,

                    latitude: undefined,
                    longitude: undefined,
                    selfieUrl: undefined
                };

                if (activePointageMode === 'PHOTO_GPS') {
                    const gps = await getCurrentGps();
                    if (gps) {
                        payload.latitude = gps.latitude;
                        payload.longitude = gps.longitude;
                    }

                    const selfieDataUrl = await tryReadSelfieAsDataUrl();
                    payload.selfieUrl = selfieDataUrl || undefined;
                }

                // remove undefined fields
                Object.keys(payload).forEach(k => {
                    if (payload[k] === undefined || payload[k] === null) delete payload[k];
                });

                await apiFetch('/employeur/pointages/scanner', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                msg.textContent = `Pointage ${typePointage} (${activePointageMode}) validé avec succès !`;
                msg.classList.add('bg-green-50', 'text-green-700');
                msg.classList.remove('hidden');
                pendingPointageType = null;

                document.getElementById('pointageForm').reset();
                setPointageMode('QR_CODE');
                loadPointageDates();
                loadPointagesLog();
            } catch (err) {
                pendingPointageType = null;
                msg.textContent = err.message || 'Erreur lors de la validation du pointage.';
                msg.classList.add('bg-red-50', 'text-red-700');
                msg.classList.remove('hidden');
            }
        }
        window.enregistrerPointage = enregistrerPointage;

        // Fetch agents assignés & Vue d'ensemble
        async function loadOverview() {
            try {
                // Fetch structure profile for name
                try {
                    const meInfo = await apiFetch('/employeur/me');
                    if (meInfo) {
                        if(meInfo.structureCliente) { document.getElementById('clientNom').textContent = meInfo.structureCliente; }
                        if(meInfo.nom && meInfo.prenom) { 
                            const profilNom = document.getElementById('profilNom');
                            if(profilNom) profilNom.textContent = meInfo.prenom + ' ' + meInfo.nom; 
                        }
                        if(meInfo.email) { 
                            const profilEmail = document.getElementById('profilEmail');
                            if(profilEmail) profilEmail.textContent = meInfo.email; 
                        }
                    }
                } catch (eMe) {
                    console.warn("Could not load structure profile", eMe);
                }

                // Fetch agents
                const response = await apiFetch('/employeur/personnel');
                const agents = Array.isArray(response) ? response : [];
                window.allAgents = agents;

                try {
                    const statsRes = await apiFetch('/employeur/stats');
                    if (statsRes) {
                        document.getElementById('statOverviewTotal').textContent = statsRes.totalAgents || 0;
                        document.getElementById('statOverviewPointagesDay').textContent = statsRes.postesActifs || 0;
                        document.getElementById('statOverviewEvals').textContent = statsRes.moyenneEvaluations || 0;
                        document.getElementById('statOverviewDernier').textContent = (statsRes.heuresSupp || 0) + 'h';
                        
                        const hPrestees = document.getElementById('statHeuresPresteesGlobal');
                        if (hPrestees) hPrestees.textContent = (statsRes.heuresPrestees || 0) + 'h';
                        
                        const dAffecte = document.getElementById('statDernierAffecte');
                        if (dAffecte) dAffecte.textContent = statsRes.dernierAffecte || 'Aucun';
                        
                        const iSatisfaction = document.getElementById('statIndiceSatisfaction');
                        if (iSatisfaction) iSatisfaction.textContent = (statsRes.indiceSatisfaction || 0) + '%';
                    }
                } catch (eStats) {
                    console.warn("Could not load stats", eStats);
                }

                // Render Personnel Table
                const tbody = document.getElementById('personnelTableBody');
                if (!agents || agents.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-6 text-center text-slate-400">Aucun agent assigné sur votre site.</td></tr>';
                } else {
                    tbody.innerHTML = agents.map(a => {
                        const initiales = (a.agentNom || 'AG').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
                        return `
                            <tr class="hover:bg-slate-50/60 transition-colors">
                                <td class="px-5 py-3.5 flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                                        ${initiales}
                                    </div>
                                    <div>
                                        <div class="font-bold text-slate-900">${a.agentNom || 'N/A'}</div>
                                        <div class="text-[10px] text-slate-400">ID: ${a.agentId}</div>
                                    </div>
                                </td>
                                <td class="px-5 py-3.5 text-slate-600 font-medium">${a.posteLibelle || 'Agent Terrain'}</td>
                                <td class="px-5 py-3.5">
                                    <div class="text-slate-800 font-medium">${a.zone || 'Zone Principale'}</div>
                                    <div class="text-[10px] text-indigo-500 mt-0.5">Fin: ${a.dateFin || 'Indéterminée'}</div>
                                </td>
                                <td class="px-5 py-3.5">
                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        ${a.statut || 'ACTIF'}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }

                // Fetch Today's Pointages for overview stream & stats
                const todayStr = new Date().toISOString().slice(0, 10);
                let pointages = [];
                try {
                    const resP = await apiFetch(`/employeur/pointages?date=${todayStr}`);
                    pointages = Array.isArray(resP) ? resP : [];
                } catch (errP) {
                    console.warn("Could not load today pointages for overview", errP);
                }

                const streamTbody = document.getElementById('overviewPointagesStream');
                if (streamTbody) {
                    if (!pointages || pointages.length === 0) {
                        streamTbody.innerHTML = '<tr><td colspan="4" class="px-6 py-6 text-center text-slate-400">Aucun pointage enregistré aujourd\'hui.</td></tr>';
                    } else {
                        streamTbody.innerHTML = pointages.slice(0, 5).map(p => `
                            <tr class="hover:bg-slate-50/60 transition-colors">
                                <td class="px-5 py-3.5 font-bold text-slate-800">${p.agent_nom || 'Agent'}</td>
                                <td class="px-5 py-3.5 text-emerald-600 font-bold">${formatTime(p.heure_entree)}</td>
                                <td class="px-5 py-3.5 text-rose-600 font-bold">${formatTime(p.heure_sortie)}</td>
                                <td class="px-5 py-3.5">
                                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${p.heure_sortie ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                                        ${p.heure_sortie ? 'Complet' : 'Présent'}
                                    </span>
                                </td>
                            </tr>
                        `).join('');
                    }
                }

                // Fetch Evaluations for score stat
                try {
                    const evals = await apiFetch('/evaluations');
                    if (Array.isArray(evals) && evals.length > 0) {
                        const totalScore = evals.reduce((sum, e) => sum + (e.scoreGlobal || e.scoreTotal || 8), 0);
                        const avg = (totalScore / evals.length).toFixed(1);
                        document.getElementById('statOverviewEvals').textContent = `${avg} / 10`;
                    } else {
                        document.getElementById('statOverviewEvals').textContent = '—';
                    }
                } catch (eEval) {
                    document.getElementById('statOverviewEvals').textContent = '—';
                }

            } catch (e) {
                console.error("Overview error:", e);
                document.getElementById('personnelTableBody').innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Erreur de chargement: ' + (e.message || 'Inconnu') + '</td></tr>';
            }
        }

        function formatTime(value) {
            return value ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        }

        // Fetch attendance logs
        async function loadPointagesLog() {
            try {
                const dateInput = document.getElementById('employeurPointageDate');
                const selectedDate = dateInput ? dateInput.value : new Date().toISOString().slice(0, 10);
                const response = await apiFetch(`/employeur/pointages?date=${selectedDate}`);
                const pointages = Array.isArray(response) ? response : [];
                const tbody = document.getElementById('pointageLogsTableBody');
                
                if (pointages && pointages.length > 0) {
                    tbody.innerHTML = pointages.map(p => `
                        <tr>
                            <td class="px-6 py-3 font-bold">${p.agent_nom || 'N/A'}</td>
                            <td class="px-6 py-3 text-green-700 font-bold">${formatTime(p.heure_entree)}</td>
                            <td class="px-6 py-3 text-red-700 font-bold">${formatTime(p.heure_sortie) || '--:--'}</td>
                            <td class="px-6 py-3">
                                <span class="badge ${p.heure_sortie ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">${p.heure_sortie ? 'Complet' : 'En cours'}</span>
                            </td>
                        </tr>
                    `).join('');
                    if (pointages[0]) {
                        document.getElementById('statOverviewDernier').textContent = pointages[0].agent_nom + (pointages[0].heure_sortie ? " (Sortie)" : " (Entree)");
                    }
                } else {
                    tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-slate-400">Aucun pointage le ${formatDateLabel(selectedDate)}.</td></tr>`;
                }
            } catch(e) {
                console.error("Error loading pointages log", e);
                document.getElementById('pointageLogsTableBody').innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Erreur: ' + (e.message || 'Inconnu') + '</td></tr>';
            }
        }
        window.loadPointagesLog = loadPointagesLog;

        async function loadPointageDates() {
            const container = document.getElementById('employeurPointageDates');
            if (!container) return;
            try {
                const dates = await apiFetch('/employeur/pointages/dates');
                if (!dates || dates.length === 0) {
                    container.innerHTML = '<span class="text-slate-400">Aucun jour enregistré pour le moment.</span>';
                    return;
                }
                const selectedDate = document.getElementById('employeurPointageDate')?.value;
                container.innerHTML = dates.map(d => `
                    <button type="button" onclick="selectEmployeurPointageDate('${d.date}')"
                        class="px-3 py-2 rounded-xl font-bold transition-colors ${d.date === selectedDate ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'}">
                        ${formatDateLabel(d.date)} (${d.total})
                    </button>
                `).join('');
            } catch (e) {
                container.innerHTML = `<span class="text-slate-400">Erreur: ${e.message || 'Inconnu'}</span>`;
            }
        }
        window.loadPointageDates = loadPointageDates;

        function selectEmployeurPointageDate(date) {
            const input = document.getElementById('employeurPointageDate');
            if (input) input.value = date;
            loadPointagesLog();
            loadPointageDates();
        }
        window.selectEmployeurPointageDate = selectEmployeurPointageDate;

        function formatDateLabel(value) {
            return value ? new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date inconnue';
        }

        document.addEventListener('DOMContentLoaded', () => {
            if (!checkAuth()) {
                window.location.href = '/vitrine/login.html';
                return;
            }
            const pointageDate = document.getElementById('employeurPointageDate');
            if (pointageDate) {
                pointageDate.value = new Date().toISOString().slice(0, 10);
                pointageDate.addEventListener('change', () => {
                    loadPointagesLog();
                    loadPointageDates();
                });
            }
            loadOverview();
            loadPointageDates();
        });

        // ─── Génération Fiche PDF Agent (sans QR) ───────────────────
        window.generateFichePdf = function(nom, poste, site, statut) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const W = doc.internal.pageSize.getWidth();
            const H = doc.internal.pageSize.getHeight();

            // Fond clair
            doc.setFillColor(240, 249, 255);
            doc.rect(0, 0, W, H, 'F');

            // Header bleu/indigo
            doc.setFillColor(14, 165, 233);
            doc.rect(0, 0, W, 45, 'F');
            // Accent violet
            doc.setFillColor(99, 102, 241);
            doc.rect(0, 38, W, 7, 'F');

            // Logo
            doc.setFillColor(255, 255, 255);
            doc.circle(22, 22, 11, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(14, 165, 233);
            doc.text('ST', 18, 23.5);

            // Titre
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.text('SimpleTaff', 38, 20);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Fiche de Personnel — Espace Client', 38, 29);

            // Carte blanche
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(15, 60, W - 30, 130, 8, 8, 'FD');

            // Avatar circulaire
            const initiales = nom.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase();
            doc.setFillColor(99, 102, 241);
            doc.circle(W / 2, 90, 18, 'F');
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(initiales, W / 2, 95, { align: 'center' });

            // Nom complet
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(18);
            doc.text(nom.toUpperCase(), W / 2, 120, { align: 'center' });

            // Séparateur
            doc.setDrawColor(196, 181, 253);
            doc.setLineWidth(0.5);
            doc.line(30, 127, W - 30, 127);

            // Infos
            const infoY = 140;
            const leftX = 30;
            const rightX = W / 2 + 5;

            // Poste
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text('POSTE', leftX, infoY);
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'normal');
            doc.text(poste || '—', leftX, infoY + 8);

            // Site
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text('SITE D\'AFFECTATION', rightX, infoY);
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'normal');
            doc.text(site || '—', rightX, infoY + 8);

            // Statut
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139);
            doc.text('STATUT', leftX, infoY + 24);
            const statutColor = statut === 'ACTIVE' || statut === 'ACTIF' ? [16, 185, 129] : [245, 158, 11];
            doc.setFillColor(...statutColor);
            doc.roundedRect(leftX, infoY + 28, 40, 9, 3, 3, 'F');
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text(statut, leftX + 20, infoY + 34, { align: 'center' });

            // Date d'émission
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
            doc.text(`Document émis le ${now}`, W / 2, 200, { align: 'center' });

            // Note confidentialité
            doc.setFillColor(239, 246, 255);
            doc.roundedRect(20, 206, W - 40, 14, 4, 4, 'F');
            doc.setFontSize(8);
            doc.setTextColor(59, 130, 246);
            doc.setFont('helvetica', 'bold');
            doc.text('Ce document est confidentiel — usage interne uniquement', W / 2, 214, { align: 'center' });

            // Footer
            doc.setFillColor(14, 165, 233);
            doc.rect(0, H - 12, W, 12, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('SimpleTaff — Gestion du Personnel & Sécurité', W / 2, H - 5, { align: 'center' });

            doc.save(`Fiche_${nom.replace(/ /g, '_')}.pdf`);
        };

        // ─── Impression Fiche Agent ──────────────────────────────────
        window.printFiche = function(nom, poste, site, statut) {
            const initiales = nom.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase();
            const statutBg = (statut === 'ACTIVE' || statut === 'ACTIF') ? '#10b981' : '#f59e0b';
            const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
            const w = window.open('', '_blank', 'width=700,height=900');
            w.document.write(`<!DOCTYPE html><html><head><title>Fiche — ${nom}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Outfit',sans-serif;background:#f0f9ff;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(14,165,233,.15);width:340px;overflow:hidden}
  .header{background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:24px;text-align:center}
  .avatar{width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#fff;margin:0 auto 12px;border:3px solid rgba(255,255,255,.5)}
  .header h1{color:#fff;font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:.5px}
  .body{padding:24px}
  .field{margin-bottom:16px}
  .field label{font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:4px}
  .field p{font-size:14px;font-weight:600;color:#0f172a}
  .statut{display:inline-block;padding:4px 14px;border-radius:999px;color:#fff;font-weight:800;font-size:12px}
  .divider{border:none;border-top:1.5px solid #e0f2fe;margin:16px 0}
  .note{background:#eff6ff;border-radius:10px;padding:10px;font-size:10px;color:#3b82f6;font-weight:600;text-align:center;margin-top:12px}
  .footer{background:#0ea5e9;color:#fff;text-align:center;padding:10px;font-size:10px}
  .date{font-size:10px;color:#94a3b8;text-align:center;margin-top:10px}
  @media print{body{background:#fff}.card{box-shadow:none;border:1px solid #e0f2fe}}
</style></head><body>
<div class="card">
  <div class="header">
    <div class="avatar">${initiales}</div>
    <h1>${nom}</h1>
  </div>
  <div class="body">
    <div class="field"><label>Poste</label><p>${poste || '—'}</p></div>
    <hr class="divider">
    <div class="field"><label>Site d'affectation</label><p>${site || '—'}</p></div>
    <hr class="divider">
    <div class="field"><label>Statut</label><br><span class="statut" style="background:${statutBg}">${statut}</span></div>
    <div class="date">Document émis le ${now}</div>
    <div class="note">Document confidentiel — usage interne uniquement</div>
  </div>
  <div class="footer">SimpleTaff — Gestion du Personnel &copy; ${new Date().getFullYear()}</div>
</div>
<script>window.onload=()=>{window.print();window.close();}<\/script>
</body></html>`);
            w.document.close();
        };

        // ── Evaluations ───────────────────────────────────────────────────
        async function loadEvaluations() {
            try {
                // Load select list
                const response = await apiFetch('/employeur/personnel');
                const agents = Array.isArray(response) ? response : [];
                window.allAgents = agents;
                const evalAgentSelect = document.getElementById('evalAgentSelect');
                if (evalAgentSelect) {
                    evalAgentSelect.innerHTML = agents.map(a => `<option value="${a.agentId}">${a.agentNom || 'N/A'}</option>`).join('');
                }
                
                const evals = await apiFetch('/evaluations');
                window.allEvaluationsList = evals || [];
                renderEvaluations(window.allEvaluationsList);
            } catch (err) {
                console.error(err);
                const tbody = document.getElementById('evaluationsTableBody');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-red-500">Erreur de chargement des évaluations</td></tr>';
                }
            }
        }
        window.loadEvaluations = loadEvaluations;

        function renderEvaluations(list) {
            const tbody = document.getElementById('evaluationsTableBody');
            if (!tbody) return;
            if (list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-center text-slate-400">Aucune évaluation enregistrée.</td></tr>';
                return;
            }
            tbody.innerHTML = list.map(ev => {
                const dateEval = ev.dateEvaluation ? ev.dateEvaluation : '—';
                const agentNom = ev.agent ? (ev.agent.nom || 'N/A') : 'N/A';
                const structure = ev.structureCliente || '—';
                return `
                    <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                        <td class="p-3 font-bold text-slate-900">${agentNom}</td>
                        <td class="p-3 text-slate-600">${structure}</td>
                        <td class="p-3">${ev.annee}</td>
                        <td class="p-3 text-slate-500">${dateEval}</td>
                        <td class="p-3 font-bold text-indigo-600">${ev.scoreTotal || 0} / 80</td>
                        <td class="p-3 text-slate-500 max-w-xs truncate" title="${ev.commentaire || ''}">${ev.commentaire || '—'}</td>
                    </tr>
                `;
            }).join('');
        }

        window.filterEvaluationsTable = function() {
            const query = document.getElementById('searchEvaluations')?.value?.toLowerCase() || '';
            if (!window.allEvaluationsList) return;
            const filtered = window.allEvaluationsList.filter(ev => {
                const agentNom = ev.agent ? (ev.agent.nom || '') : '';
                return agentNom.toLowerCase().includes(query);
            });
            renderEvaluations(filtered);
        };

        // Form submit handler for Evaluation
        document.getElementById('addEvaluationForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
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
                        agentId, annee, ponctualite, discipline, qualite, productivite,
                        espritEquipe, respectProcedures, satisfactionClient, communication,
                        commentaire
                    })
                });
                alert('Évaluation enregistrée avec succès !');
                document.getElementById('addEvaluationForm').reset();
                loadEvaluations();
            } catch (err) {
                alert("Erreur lors de l'enregistrement de l'évaluation: " + err.message);
            }
        });

        // ── Disciplinaire ─────────────────────────────────────────────────
        async function loadDisciplinaire() {
            try {
                const sanctions = await apiFetch('/disciplinaire/sanctions');
                window.allSanctionsList = sanctions || [];
                renderSanctions(window.allSanctionsList);
            } catch (err) {
                console.error(err);
                const tbody = document.getElementById('sanctionsTableBody');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-center text-red-500">Erreur de chargement des sanctions</td></tr>';
                }
            }
        }
        window.loadDisciplinaire = loadDisciplinaire;

        function renderSanctions(list) {
            const tbody = document.getElementById('sanctionsTableBody');
            if (!tbody) return;
            if (list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="p-3 text-center text-slate-400">Aucune sanction enregistrée.</td></tr>';
                return;
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            tbody.innerHTML = list.map(s => {
                const dateFin = s.dateFin ? s.dateFin : '—';
                const agentNom = s.agent ? (s.agent.nom || 'N/A') : 'N/A';
                const structure = s.structureCliente || s.clientFinal || '—';
                const isExpired = s.dateFin && new Date(s.dateFin) < today;
                let badgeHTML = '';
                if (isExpired) {
                    badgeHTML = '<span class="badge bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-md text-xs">Terminé</span>';
                } else {
                    const badgeClass = s.statut === 'EN_COURS' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';
                    badgeHTML = `<span class="badge ${badgeClass} font-bold px-2 py-0.5 rounded-md text-xs">${s.statut}</span>`;
                }
                return `
                    <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                        <td class="p-3 font-bold text-slate-900">${agentNom}</td>
                        <td class="p-3 text-slate-600">${structure}</td>
                        <td class="p-3 font-medium text-slate-700">${s.type}</td>
                        <td class="p-3 text-slate-500">${s.dateDecision}</td>
                        <td class="p-3 text-slate-500">${dateFin}</td>
                        <td class="p-3 text-slate-500 max-w-xs truncate" title="${s.motif || ''}">${s.motif || '—'}</td>
                        <td class="p-3">${badgeHTML}</td>
                    </tr>
                `;
            }).join('');
        }

        window.filterSanctionsTable = function() {
            const query = document.getElementById('searchSanctions')?.value?.toLowerCase() || '';
            if (!window.allSanctionsList) return;
            const filtered = window.allSanctionsList.filter(s => {
                const agentNom = s.agent ? (s.agent.nom || '') : '';
                return agentNom.toLowerCase().includes(query);
            });
            renderSanctions(filtered);
        };
        window.toggleMobileSidebar = function() {
            const sidebar = document.getElementById('mainSidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar) sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('active');
        };

        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 767) {
                    const sidebar = document.getElementById('mainSidebar');
                    const overlay = document.getElementById('sidebar-overlay');
                    if (sidebar) sidebar.classList.remove('open');
                    if (overlay) overlay.classList.remove('active');
                }
            });
        });

        window.loadNotifications = async function() {
            try {
                const notifications = await apiFetch('/notifications').catch(() => []);
                const container = document.getElementById('notificationsContainer');
                const badge = document.getElementById('notificationBadge');

                const validNotifications = Array.isArray(notifications) ? notifications : [];
                const unread = validNotifications.filter(n => n.statut !== 'LU');
                
                const lastUnreadCount = parseInt(badge?.dataset?.lastCount || '0');
                if (unread.length > lastUnreadCount) {
                    if (window.showToast) window.showToast("Vous avez de nouvelles notifications", "info");
                }
                if(badge) badge.dataset.lastCount = unread.length;

                if (badge) {
                    if (unread.length > 0) {
                        badge.textContent = unread.length;
                        badge.classList.remove('hidden');
                        badge.style.display = 'inline-flex';
                    } else {
                        badge.classList.add('hidden');
                        badge.style.display = 'none';
                    }
                }

                if (container) {
                    if (validNotifications.length === 0) {
                        container.innerHTML = '<div class="text-center text-slate-400 text-sm py-4">Aucune notification</div>';
                    } else {
                        container.innerHTML = validNotifications.map(n => `
                            <div class="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${n.statut === 'NON_LU' ? 'bg-sky-50/30' : ''}">
                                <div class="flex justify-between items-start mb-1">
                                    <span class="font-bold text-slate-800 text-sm">${n.titre}</span>
                                    <span class="text-[10px] text-slate-400">${new Date(n.dateCreation).toLocaleDateString()}</span>
                                </div>
                                <p class="text-xs text-slate-500">${n.message}</p>
                                ${n.lienAction ? `<a href="${n.lienAction}" class="text-[10px] font-bold text-[#12312E] mt-2 inline-block hover:underline">Voir l'action -></a>` : ''}
                            </div>
                        `).join('');
                    }
                }
            } catch (err) {
                console.error("Erreur notifications", err);
            }
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
                const agentsData = typeof window.allAgents !== 'undefined' ? window.allAgents : [];
                agentsData.forEach(a => {
                    const name = ((a.nom||a.agentNom||'') + ' ' + (a.prenom||'')).toLowerCase();
                    if (name.includes(q) || (a.telephone||'').includes(q)) {
                        results.push({ type: 'Agent', icon: '👤', text: (a.nom||a.agentNom||'') + ' ' + (a.prenom||''), tab: 'agents', action: () => { if(typeof showTab==='function') showTab('agents'); searchInput.value=''; searchDropdown.classList.add('hidden'); }});
                    }
                });
                
                // Search Affectations
                const affectationsData = typeof window.allAffectations !== 'undefined' ? window.allAffectations : [];
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
