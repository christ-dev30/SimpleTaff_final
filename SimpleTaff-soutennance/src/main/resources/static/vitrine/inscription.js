const token = new URLSearchParams(window.location.search).get('token');

        function showError(msg) {
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('errorState').classList.remove('hidden');
            document.getElementById('errorMsg').textContent = msg;
        }

        function showAlert(msg, type) {
            const el = document.getElementById('alertMsg');
            el.textContent = msg;
            el.className = `text-sm p-3 rounded-xl ${type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`;
            el.classList.remove('hidden');
        }

        async function init() {
            if (!token) { showError("Aucun token fourni dans le lien."); return; }

            try {
                const res = await fetch(`/api/invitations/verifier?token=${token}`);
                const data = await res.json();

                if (!data.valid) { const msg = (data.message || "Lien invalide."); showError(msg); return; }

                // Populate form
                document.getElementById('entrepriseNom').textContent = data.entreprise;
                document.getElementById('formuleLabel').textContent = data.formule;
                document.getElementById('emailLabel').textContent = data.email;
                document.getElementById('emailDisplay').value = data.email;

                // Format expiration
                const exp = new Date(data.expiration);
                document.getElementById('expirationTime').textContent =
                    exp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                document.getElementById('loadingState').classList.add('hidden');
                document.getElementById('formState').classList.remove('hidden');
            } catch (e) {
                showError("Impossible de vérifier ce lien. Veuillez réessayer.");
            }
        }

        document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirmPassword').value;

            if (password !== confirm) {
                showAlert("Les mots de passe ne correspondent pas.", 'error');
                return;
            }

            const btnText = document.getElementById('btnText');
            const spinner = document.getElementById('btnSpinner');
            btnText.textContent = 'Activation en cours…';
            spinner.classList.remove('hidden');
            document.getElementById('submitBtn').disabled = true;

            try {
                const res = await fetch('/api/invitations/inscrire', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token,
                        nom: document.getElementById('nom').value,
                        prenom: document.getElementById('prenom').value,
                        password
                    })
                });
                const data = await res.json();

                if (res.ok) {
                    document.getElementById('formState').classList.add('hidden');
                    document.getElementById('successState').classList.remove('hidden');
                } else {
                    showAlert(data.message || "Erreur lors de l'activation.", 'error');
                    btnText.textContent = 'Activer mon compte';
                    spinner.classList.add('hidden');
                    document.getElementById('submitBtn').disabled = false;
                }
            } catch (err) {
                showAlert("Erreur réseau. Veuillez réessayer.", 'error');
                btnText.textContent = 'Activer mon compte';
                spinner.classList.add('hidden');
                document.getElementById('submitBtn').disabled = false;
            }
        });

        init();