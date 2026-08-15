// Simulate browser DOM environment to test bundle execution
const fs = require('fs');
const path = require('path');

const jsFiles = fs.readdirSync(path.join(__dirname, '../dist/_expo/static/js/web'));
console.log('Found web bundles:', jsFiles);
