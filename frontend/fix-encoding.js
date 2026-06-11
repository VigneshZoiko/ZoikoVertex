const fs = require('fs');
const path = require('path');

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
  'â€': '' // catch-all for leftover broken sequences if any, but replace specific ones first
};

function walk(dir) {
  let results = [];
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

const files = walk('f:/CodeSpace/ZoikoVertex/frontend/src');
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  for (const [bad, good] of Object.entries(replacements)) {
    // Escape for global regex if needed, or just use split/join
    content = content.split(bad).join(good);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log('Fixed:', file);
  }
});

console.log('Total files fixed:', changedFiles);
