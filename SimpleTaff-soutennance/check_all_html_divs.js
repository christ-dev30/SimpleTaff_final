const fs = require('fs');
const path = require('path');

function checkFileDivs(filePath) {
  try {
    const html = fs.readFileSync(filePath, 'utf8');
    const opens = (html.match(/<div/gi) || []).length;
    const closes = (html.match(/<\/div>/gi) || []).length;
    const diff = opens - closes;
    if (diff !== 0) {
      console.log(`[WARNING] Unbalanced divs in ${filePath}: Opens: ${opens}, Closes: ${closes}, Diff: ${diff}`);
    } else {
      console.log(`[OK] Balanced divs in ${filePath}`);
    }
  } catch(e) {
    console.error(`Error reading ${filePath}: ${e.message}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.html')) {
      checkFileDivs(fullPath);
    }
  }
}

walkDir('./src/main/resources/static');
