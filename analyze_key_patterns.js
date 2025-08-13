const fs = require('fs');

function findPattern(data, pattern, startIndex = 0) {
    for (let i = startIndex; i <= data.length - pattern.length; i++) {
        let match = true;
        for (let j = 0; j < pattern.length; j++) {
            if (data[i + j] !== pattern[j]) {
                match = false;
                break;
            }
        }
        if (match) return i;
    }
    return -1;
}

// Get filename from command line or use default
const filename = process.argv[2] || 'ref_materials/test_wallet.dat';
const data = fs.readFileSync(filename);

// Find walletdescriptorkey patterns
const descriptorKeyPattern = Buffer.from('walletdescriptorkey');
let index = 0;
let count = 0;

console.log(`Analyzing walletdescriptorkey patterns in ${filename}...\n`);

while ((index = findPattern(data, descriptorKeyPattern, index)) !== -1 && count < 5) {
    count++;
    console.log(`\n=== Pattern #${count} at position ${index} ===`);
    
    // Show context around the pattern
    const contextStart = index;
    const contextEnd = Math.min(index + 300, data.length);
    const context = data.slice(contextStart, contextEnd);
    
    // Look for the specific patterns
    // Pattern 1: d63081d30201010420 (what the code looks for)
    const pattern1 = Buffer.from('d63081d30201010420', 'hex');
    let p1Index = findPattern(context, pattern1);
    if (p1Index !== -1) {
        console.log('Found pattern d63081d30201010420 at offset', p1Index);
        const key = context.slice(p1Index + 9, p1Index + 41);
        console.log('Key:', key.toString('hex'));
    }
    
    // Pattern 2: d3020101042044 (what we see before the correct key)
    const pattern2Start = Buffer.from('d30201010420', 'hex');
    let p2Index = findPattern(context, pattern2Start);
    if (p2Index !== -1) {
        console.log('Found pattern d30201010420 at offset', p2Index);
        const key = context.slice(p2Index + 6, p2Index + 38);
        console.log('Key:', key.toString('hex'));
        if (key.toString('hex') === '44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3') {
            console.log('^^^ THIS IS THE CORRECT MASTER KEY!');
        }
    }
    
    // Show hex dump of first 150 bytes after pattern
    console.log('\nHex dump:');
    for (let i = 0; i < Math.min(150, context.length); i += 16) {
        const chunk = context.slice(i, Math.min(i + 16, context.length));
        const hex = chunk.toString('hex').padEnd(32);
        const ascii = chunk.toString('ascii').replace(/[^\x20-\x7E]/g, '.');
        console.log(`${(contextStart + i).toString().padStart(6)}: ${hex} ${ascii}`);
    }
    
    index += descriptorKeyPattern.length;
}