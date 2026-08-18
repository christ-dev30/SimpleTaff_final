const fs = require('fs');
let code = fs.readFileSync('src/main/resources/static/employeur/employeur.js', 'utf8');

const searchFix = `                // Search Entreprises
                const entreprisesData = typeof window.entreprises !== 'undefined' ? window.entreprises : [];
                entreprisesData.forEach(ent => {
                    if ((ent.nom||'').toLowerCase().includes(q)) {
                        results.push({ type: 'Entreprise', icon: '🏢', text: ent.nom, tab: 'entreprises', action: () => { if(typeof showTab==='function') showTab('entreprises'); searchInput.value=''; searchDropdown.classList.add('hidden'); }});
                    }
                });`;

const startIdx = code.indexOf('// Search Entreprises (Super Admin)');
const endIdx = code.indexOf('if (results.length > 0) {', startIdx);

if (startIdx > -1 && endIdx > -1) {
  code = code.substring(0, startIdx) + searchFix + '\n                \n                ' + code.substring(endIdx);
  fs.writeFileSync('src/main/resources/static/employeur/employeur.js', code, 'utf8');
  console.log('Fixed employeur.js search block');
} else {
  console.log('Could not find boundaries');
}
