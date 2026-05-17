const fs = require('fs');
let content = fs.readFileSync('tsconfig.base.json', 'utf8');
content = content.replace('"types": ["jest"],', '');
fs.writeFileSync('tsconfig.base.json', content);
