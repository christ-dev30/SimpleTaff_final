# API Endpoint Discrepancies

## 🟢 Dans le Backend mais PAS dans le Frontend

| Méthode | Endpoint (Backend) |
|---|---|
| DELETE | `/api/admin/emplois/{id}` |
| DELETE | `/api/admin/postes/{id}` |
| GET | `/api/admin/emplois` |
| GET | `/api/admin/postes` |
| GET | `/api/admin/sites` |
| GET | `/api/agents/zones` |
| GET | `/api/agents/{id}/fiche` |
| GET | `/api/conges/solde/{agentId}` |
| GET | `/api/coordonnateur/pointages/today` |
| GET | `/api/disciplinaire/agents/{agentId}/alerte` |
| GET | `/api/employeur/pointages/today` |
| GET | `/api/formations/agent/{agentId}` |
| GET | `/api/notifications/all` |
| GET | `/api/presences/export` |
| GET | `/api/rapports/agent/{agentId}/export` |
| GET | `/api/rapports/{type}/export` |
| GET | `/api/workflows` |
| POST | `/api/admin/emplois` |
| POST | `/api/admin/postes` |
| POST | `/api/agents/{id}/activer` |
| POST | `/api/formations` |
| POST | `/api/missions/{id}/annuler` |
| POST | `/api/missions/{id}/demarrer` |
| POST | `/api/missions/{id}/suspendre` |
| POST | `/api/pointages/scanner` |
| POST | `/api/workflows` |
| PUT | `/api/superadmin/entreprises/{id}/activer` |
| PUT | `/api/superadmin/entreprises/{id}/suspendre` |

## 🔴 Dans le Frontend mais PAS dans le Backend

| Méthode supposée | Endpoint appelé (Frontend) |
|---|---|
| GET | `/api/contrats/agent/` |
| GET | `/api/superadmin/entreprises/${id}/${action}` |
| GET | `/api/upload` |
| GET | `/api/${API_BASE_URL}${endpoint}` |
