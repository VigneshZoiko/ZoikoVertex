const fs = require('fs');
const path = require('path');

const targetDirs = [
  'f:/CodeSpace/ZoikoVertex/frontend/src',
  'f:/CodeSpace/ZoikoVertex/backend/src',
  'f:/CodeSpace/ZoikoVertex/landing/src'
];

const replacements = {
  'Â·': '·',
  'â”€': '—',
  'â€”': '—',
  'âœ“': '✓',
  'ðŸŒ ': '🌐',
  'â‚¹': '₹',
  'â‚¬': '€',
  'Â£': '£',
  'Ø¯.Ø¥': 'د.إ',
  'âš ': '⚠',
  'â–¾': '▾',
  'â–¸': '▸',
  'â€“': '–',
  'â€': ''
};

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

let changedFiles = 0;

targetDirs.forEach(dir => {
  const files = walk(dir);
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let originalContent = content;
    
    for (const [bad, good] of Object.entries(replacements)) {
      content = content.split(bad).join(good);
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      changedFiles++;
      console.log('Fixed:', file);
    }
  });
});

console.log('Total files fixed:', changedFiles);
