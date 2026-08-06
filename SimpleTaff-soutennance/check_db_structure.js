const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'simpletaff_db',
  password: '@Juniorehui15',
  port: 5432,
});

client.connect();

async function run() {
  try {
    const resAgent = await client.query(`SELECT id, nom, prenom FROM agent_terrain WHERE nom = 'koffi jean'`);
    if (resAgent.rows.length === 0) {
       console.log('Agent non trouvǸ');
       return;
    }
    const agent = resAgent.rows[0];
    console.log('Agent:', agent);

    const resContrat = await client.query(`SELECT statut, structure_cliente_id FROM contrat_agent WHERE agent_id = $1`, [agent.id]);
    console.log('Contrats:', resContrat.rows);

    const resAffectation = await client.query(`SELECT statut, poste_id FROM affectation WHERE agent_id = $1`, [agent.id]);
    console.log('Affectations:', resAffectation.rows);
    
    if (resAffectation.rows.length > 0) {
        for (let aff of resAffectation.rows) {
            const resPoste = await client.query(`SELECT site_id FROM poste WHERE id = $1`, [aff.poste_id]);
            if (resPoste.rows.length > 0) {
                const site = resPoste.rows[0];
                console.log('Site ID for poste:', site.site_id);
                const resSite = await client.query(`SELECT structure_demandeuse_id FROM site WHERE id = $1`, [site.site_id]);
                console.log('Site details:', resSite.rows);
                if (resSite.rows.length > 0) {
                    const structId = resSite.rows[0].structure_demandeuse_id;
                    const resStruct = await client.query(`SELECT raison_sociale FROM structure_demandeuse WHERE id = $1`, [structId]);
                    console.log('Structure Demandeuse:', resStruct.rows);
                }
            }
        }
    }

  } catch (err) {
    console.error(err);
  } finally {
    client.end();
  }
}

run();
