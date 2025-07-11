// generate-tree.js
const fs = require('fs');
const path = require('path');

const EXCLUDE_DIRS = ['node_modules', '.git', '.next', '.history', 'out','.vercel','.lh'];
const EXCLUDE_FILES = ['.DS_Store', 'package-lock.json'];

let output = '📁 Project File Tree:\n';

function printTree(dirPath, prefix = '') {
  const items = fs.readdirSync(dirPath).filter((item) => {
    const fullPath = path.join(dirPath, item);
    const isDir = fs.statSync(fullPath).isDirectory();
    return !EXCLUDE_DIRS.includes(item) && !EXCLUDE_FILES.includes(item);
  });

  items.forEach((item, index) => {
    const fullPath = path.join(dirPath, item);
    const isDir = fs.statSync(fullPath).isDirectory();
    const isLast = index === items.length - 1;
    const connector = isLast ? '└── ' : '├── ';

    output += `${prefix}${connector}${item}\n`;

    if (isDir) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      printTree(fullPath, newPrefix);
    }
  });
}

// Start from current directory
printTree('./');

// Save to file
fs.writeFileSync('project-tree.txt', output, 'utf8');
