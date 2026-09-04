import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,           // 1 seul utilisateur pour debug
  duration: '10s',  // juste 10 secondes pour tester
};

const BASE = 'https://simpletafffinal.up.railway.app';

export default function () {
  // Test 1 : la racine (vitrine)
  const home = http.get(`${BASE}/`);
  console.log(`[HOME] status=${home.status}`);

  // Test 2 : connexion
  const login = http.post(`${BASE}/api/auth/signin`, JSON.stringify({
    email: 'admin@simpletaff.ci',      // ← adapte
    password: 'password123',           // ← adapte
  }), { headers: { 'Content-Type': 'application/json' } });

  console.log(`[LOGIN] status=${login.status}`);
  console.log(`[LOGIN] body=${login.body.substring(0, 300)}`);

  if (login.status === 200) {
    const token = login.json('token') || login.json('accessToken');
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    // Test 3 : liste des agents
    const agents = http.get(`${BASE}/api/agents`, auth);
    console.log(`[AGENTS] status=${agents.status}`);
  }

  sleep(2);
}
