const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function run() {
    try {
        console.log("Tentative de login...");
        const loginRes = await fetch("http://localhost:8080/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "coord@simpletaff.com",
                motDePasse: "password"
            })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            console.error("Login failed:", loginData);
            return;
        }
        const token = loginData.token;
        console.log("Token obtenu avec succès.");

        console.log("Appel de /api/coordonnateur/agents...");
        const agentsRes = await fetch("http://localhost:8080/api/coordonnateur/agents", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        console.log("Status:", agentsRes.status);
        const text = await agentsRes.text();
        console.log("Response text:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
