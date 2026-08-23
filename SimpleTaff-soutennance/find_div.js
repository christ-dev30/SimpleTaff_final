const fs = require('fs');
const html = fs.readFileSync('./src/main/resources/static/admin-entreprise/index.html', 'utf8');
const overIdx = html.indexOf('id="tab-overview"');
const orgIdx = html.indexOf('id="tab-org"');
const lines = html.substring(overIdx, orgIdx).split('\n');
let depth = 0;
let lastUnclosed = 0;
for(let i=0; i<lines.length; i++) {
  const line = lines[i];
  const opens = (line.match(/<div/gi) || []).length;
  const closes = (line.match(/<\/div>/gi) || []).length;
  depth += (opens - closes);
}
console.log("Final depth:", depth);
