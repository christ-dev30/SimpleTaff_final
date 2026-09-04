const fs = require('fs');
const html = fs.readFileSync('./src/main/resources/static/admin-entreprise/index.html', 'utf8');
const orgIdx = html.indexOf('id="tab-org"');
const overIdx = html.indexOf('id="tab-overview"');
const substr = html.substring(overIdx, orgIdx);
const opens = (substr.match(/<div/gi) || []).length;
const closes = (substr.match(/<\/div>/gi) || []).length;
console.log('Opens:', opens, 'Closes:', closes, 'Diff:', opens - closes);
