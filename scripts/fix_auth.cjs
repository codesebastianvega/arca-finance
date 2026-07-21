const fs = require('fs');
const path = 'src/components/google-auth-button.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the hardcoded baseOrigin logic
content = content.replace(
  'const hostname = window.location.hostname;\n    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";\n    const baseOrigin = isLocalhost ? "http://localhost:3000" : window.location.origin;\n    const redirectTo = `${baseOrigin}/auth/callback`;',
  'const baseOrigin = window.location.origin;\n    const redirectTo = `${baseOrigin}/auth/callback`;'
);

fs.writeFileSync(path, content);
console.log('Fixed google-auth-button.tsx');
