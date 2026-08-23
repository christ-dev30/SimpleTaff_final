const fs = require('fs');
const html = fs.readFileSync('./src/main/resources/static/admin-entreprise/index.html', 'utf8');
const opens = (html.match(/<div/gi) || []).length;
const closes = (html.match(/<\/div>/gi) || []).length;
console.log('Opens:', opens, 'Closes:', closes, 'Diff:', opens - closes);
