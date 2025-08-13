const fs = require('fs');
const crypto = require('crypto');

// Read wallet file
function readWalletFile(filename) {
    const data = fs.readFileSync(filename);
    console.log(`\n=== Analyzing ${filename} ===`);
    console.log(`File size: ${data.length} bytes`);
    
    // Look for the master private key we know
    const knownKeys = {
        'test_wallet.dat': '4f87da2c3b88a5ab8b481fb476b3f6bd09ddeb51034fe8a43aaa087f1cb2b4e2',
        'test3.dat': '64c165321a1e49e4305bdfae73df17e3161504d812e811638a99d137ca8c44aa'
    };
    
    const masterKey = knownKeys[filename.split('/').pop()];
    if (masterKey) {
        // Convert hex to bytes and search
        const keyBytes = Buffer.from(masterKey, 'hex');
        let keyIndex = data.indexOf(keyBytes);
        if (keyIndex !== -1) {
            console.log(`Found master key at position ${keyIndex}`);
            
            // Look around this position for potential chain code
            // Chain code should be 32 bytes
            console.log('\nBytes around master key:');
            const start = Math.max(0, keyIndex - 64);
            const end = Math.min(data.length, keyIndex + keyBytes.length + 64);
            
            for (let i = start; i < end; i += 16) {
                const chunk = data.slice(i, Math.min(i + 16, end));
                const hex = chunk.toString('hex');
                const ascii = chunk.toString('ascii').replace(/[^\x20-\x7E]/g, '.');
                console.log(`${i.toString().padStart(6)}: ${hex.padEnd(32)} ${ascii}`);
            }
        }
    }
    
    // Look for "seed" pattern
    const seedPattern = Buffer.from('seed');
    let seedIndex = 0;
    while ((seedIndex = data.indexOf(seedPattern, seedIndex)) !== -1) {
        console.log(`\nFound "seed" at position ${seedIndex}`);
        // Show context
        const start = Math.max(0, seedIndex - 32);
        const end = Math.min(data.length, seedIndex + 64);
        const context = data.slice(start, end);
        console.log('Context:', context.toString('hex'));
        console.log('ASCII:', context.toString('ascii').replace(/[^\x20-\x7E]/g, '.'));
        seedIndex += 4;
    }
    
    // Look for BIP32 master seed pattern
    // Usually derived as HMAC-SHA512(seed, "Bitcoin seed")
    const bitcoinSeed = Buffer.from('Bitcoin seed');
    let bsIndex = 0;
    while ((bsIndex = data.indexOf(bitcoinSeed, bsIndex)) !== -1) {
        console.log(`\nFound "Bitcoin seed" at position ${bsIndex}`);
        bsIndex += bitcoinSeed.length;
    }
}

// Test both wallet files
readWalletFile('ref_materials/test_wallet.dat');
readWalletFile('ref_materials/test3.dat');