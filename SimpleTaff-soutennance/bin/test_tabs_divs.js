const fs = require('fs');
const html = fs.readFileSync('./src/main/resources/static/admin-entreprise/index.html', 'utf8');

function checkTab(tab1, tab2) {
  const i1 = html.indexOf('id="' + tab1 + '"');
  const i2 = tab2 ? html.indexOf('id="' + tab2 + '"') : html.length;
  const substr = html.substring(i1, i2);
  const opens = (substr.match(/<div/gi) || []).length;
  const closes = (substr.match(/<\/div>/gi) || []).length;
  console.log(tab1, '-> Opens:', opens, 'Closes:', closes, 'Diff:', opens - closes);
}

checkTab('tab-overview', 'tab-org');
checkTab('tab-org', 'tab-catalog');
checkTab('tab-catalog', 'tab-clients');
checkTab('tab-clients', 'tab-postes');
checkTab('tab-postes', 'tab-paie');
checkTab('tab-paie', 'tab-remplacements');
checkTab('tab-remplacements', 'tab-parametres');
checkTab('tab-parametres', 'tab-contrats');
checkTab('tab-contrats', 'tab-pointage');
checkTab('tab-pointage', 'tab-presences');
checkTab('tab-presences', 'tab-materiel');
checkTab('tab-materiel', 'tab-conges');
checkTab('tab-conges', 'tab-disciplinaire');
checkTab('tab-disciplinaire', 'tab-evaluations');
checkTab('tab-evaluations', 'tab-rapports');
checkTab('tab-rapports', 'tab-audit');
checkTab('tab-audit', null);
