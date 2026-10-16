const fs = require('fs');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');

// Extract clearAll block (lines 380-403, 0-indexed: 379-402)
const clearAllBlock = lines.splice(379, 24); // removes lines 380-403

// Insert before app.post('/api/:table') which was at line 329 (0-indexed: 328)
// After removal of 24 lines, line 329 is now at 328 still (since we removed after it)
const insertAt = 328; // before app.post('/api/:table')
lines.splice(insertAt, 0, ...clearAllBlock);

fs.writeFileSync('server.js', lines.join('\n'));
console.log('Routes reordered: clearAll now before /api/:table');
