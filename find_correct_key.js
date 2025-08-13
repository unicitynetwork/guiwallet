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

// Search for both private keys in test_wallet.dat
const data = fs.readFileSync('ref_materials/test_wallet.dat');

const wrongKey = Buffer.from('4f87da2c3b88a5ab8b481fb476b3f6bd09ddeb51034fe8a43aaa087f1cb2b4e2', 'hex');
const correctKey = Buffer.from('44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3', 'hex');

console.log('Searching for keys in test_wallet.dat...\n');

// Search for the wrong key
let index = findPattern(data, wrongKey);
if (index !== -1) {
    console.log('Found wrong key at position:', index);
    console.log('Context:');
    const start = Math.max(0, index - 32);
    const end = Math.min(data.length, index + wrongKey.length + 32);
    const context = data.slice(start, end);
    console.log('Hex:', context.toString('hex'));
    console.log('ASCII:', context.toString('ascii').replace(/[^\x20-\x7E]/g, '.'));
}

console.log('\n---\n');

// Search for the correct key
index = findPattern(data, correctKey);
if (index !== -1) {
    console.log('Found correct key at position:', index);
    console.log('Context:');
    const start = Math.max(0, index - 32);
    const end = Math.min(data.length, index + correctKey.length + 32);
    const context = data.slice(start, end);
    console.log('Hex:', context.toString('hex'));
    console.log('ASCII:', context.toString('ascii').replace(/[^\x20-\x7E]/g, '.'));
} else {
    console.log('Correct key not found in raw form');
    
    // Maybe it's stored in a different format
    // Check for patterns that might indicate a private key
    const keyPattern = Buffer.from('key');
    let keyIndex = 0;
    let foundKeys = [];
    
    while ((keyIndex = findPattern(data, keyPattern, keyIndex)) !== -1) {
        // Look for 32-byte sequences that could be private keys
        for (let i = keyIndex - 50; i < keyIndex + 50 && i < data.length - 32; i++) {
            if (i < 0) continue;
            
            // Check for DER encoding pattern: 0x04 0x20 (32 bytes)
            if (data[i] === 0x04 && data[i + 1] === 0x20) {
                const potentialKey = data.slice(i + 2, i + 34);
                const keyHex = potentialKey.toString('hex');
                if (!foundKeys.includes(keyHex)) {
                    foundKeys.push(keyHex);
                }
            }
            
            // Check for raw 32-byte sequences
            if (data[i] === 0x00 && data[i + 1] === 0x20) {
                const potentialKey = data.slice(i + 2, i + 34);
                const keyHex = potentialKey.toString('hex');
                if (!foundKeys.includes(keyHex)) {
                    foundKeys.push(keyHex);
                }
            }
        }
        keyIndex++;
    }
    
    console.log('\nFound', foundKeys.length, 'potential keys:');
    foundKeys.forEach((key, idx) => {
        console.log(`${idx + 1}. ${key}`);
        if (key === '44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3') {
            console.log('   ^^^ This is the correct master key!');
        }
    });
}