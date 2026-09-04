const fs = require('fs');

const js = fs.readFileSync('./src/main/resources/static/admin-entreprise/admin-entreprise.js', 'utf8');

const regex = /(async function load\w+|window\.load\w+\s*=\s*async function)\s*\([^)]*\)\s*\{([\s\S]*?)(?=\n(?:async function|window\.load\w+|function\s|\/\/ ============|\/\*\*))/g;

let match;
console.log("Analyzing load functions for error handling...");
while ((match = regex.exec(js)) !== null) {
  const name = match[1].replace(/\s*=\s*async function/, '').trim();
  const body = match[2];
  if (!body.includes('catch')) {
    console.log(`[WARNING] No try/catch in: ${name}`);
  } else if (!body.includes('innerHTML') && !body.includes('innerText') && !body.includes('showToast')) {
    console.log(`[WARNING] Catch block in ${name} might not show errors to the user.`);
  } else {
    // console.log(`[OK] ${name}`);
  }
}
