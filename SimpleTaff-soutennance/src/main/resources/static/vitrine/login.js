const form = document.getElementById('loginForm');
        const errorMsg = document.getElementById('errorMsg');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMsg.classList.add('hidden');
            btnText.textContent = 'Connexion en cours...';
            btnSpinner.classList.remove('hidden');

            localStorage.removeItem('token');
            localStorage.removeItem('userRole');

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/auth/signin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (!res.ok) {
                    throw new Error('Identifiants incorrects.');
                }

                const response = await res.json();
                localStorage.setItem('token', response.token);
                localStorage.setItem('userRole', response.role);
                
                // Redirection basée sur le rôle
                switch(response.role) {
                    case 'ROLE_SUPER_ADMIN': window.location.href = '/super-admin/'; break;
                    case 'ROLE_ADMIN_ENTREPRISE': window.location.href = '/admin-entreprise/'; break;
                    case 'ROLE_COORDONNATEUR': window.location.href = '/coordonnateur/'; break;
                    case 'ROLE_EMPLOYEUR': window.location.href = '/employeur/'; break;
                    default: window.location.href = '/';
                }
            } catch (err) {
                errorMsg.textContent = 'Identifiants incorrects ou erreur réseau.';
                errorMsg.classList.remove('hidden');
            } finally {
                btnText.textContent = 'Se connecter';
                btnSpinner.classList.add('hidden');
            }
        });