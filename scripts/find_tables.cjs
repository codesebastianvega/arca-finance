const fs = require('fs');
const content = fs.readFileSync('app/actions.ts', 'utf8');
const regex = /\.from\("([^"]+)"\)/g;
const matches = new Set();
let match;
while ((match = regex.exec(content)) !== null) {
  matches.add(match[1]);
}
console.log(Array.from(matches).join(', '));
