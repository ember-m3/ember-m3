const fs = require('fs');
const path = require('path');

const packagePath = path.resolve(__dirname, '../package.json');

const package = require(packagePath);

package.isCanary = true;

fs.writeFileSync(packagePath, JSON.stringify(package, null, 2) + '\n');
