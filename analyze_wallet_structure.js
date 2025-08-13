const fs = require('fs');

// Base58 decode function
function base58Decode(str) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const ALPHABET_MAP = {};
    for (let i = 0; i < ALPHABET.length; i++) {
        ALPHABET_MAP[ALPHABET[i]] = i;
    }
    
    let zeros = 0;
    for (let i = 0; i < str.length && str[i] === '1'; i++) {
        zeros++;
    }
    
    let num = BigInt(0);
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (!(char in ALPHABET_MAP)) {
            throw new Error('Invalid base58 character: ' + char);
        }
        num = num * BigInt(58) + BigInt(ALPHABET_MAP[char]);
    }
    
    const bytes = [];
    while (num > 0) {
        bytes.unshift(Number(num % BigInt(256)));
        num = num / BigInt(256);
    }
    
    for (let i = 0; i < zeros; i++) {
        bytes.unshift(0);
    }
    
    return new Uint8Array(bytes);
}

// Find all base58 encoded strings that could be xpub/xprv
function findExtendedKeys(data) {
    const patterns = ['xpub', 'xprv', 'tpub', 'tprv'];
    const results = [];
    
    for (const pattern of patterns) {
        const patternBytes = Buffer.from(pattern);
        let index = 0;
        
        while ((index = data.indexOf(patternBytes, index)) !== -1) {
            // Extract the full extended key
            const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
            let keyStr = pattern;
            let pos = index + pattern.length;
            
            while (pos < data.length && keyStr.length < 120) {
                const char = String.fromCharCode(data[pos]);
                if (base58Chars.includes(char)) {
                    keyStr += char;
                    pos++;
                } else {
                    break;
                }
            }
            
            if (keyStr.length > 100) {
                try {
                    const decoded = base58Decode(keyStr);
                    const depth = decoded[4];
                    const chainCode = Buffer.from(decoded.slice(13, 45)).toString('hex');
                    const keyData = decoded.slice(45, 78);
                    
                    results.push({
                        type: pattern,
                        key: keyStr,
                        position: index,
                        depth: depth,
                        chainCode: chainCode,
                        keyHex: pattern.startsWith('xpr') ? 
                            Buffer.from(keyData.slice(1)).toString('hex') : 
                            Buffer.from(keyData).toString('hex')
                    });
                } catch (e) {
                    // Invalid extended key
                }
            }
            
            index += pattern.length;
        }
    }
    
    return results;
}

// Analyze wallet files
function analyzeWallet(filename) {
    console.log(`\n=== Analyzing ${filename} ===`);
    const data = fs.readFileSync(filename);
    
    const extendedKeys = findExtendedKeys(data);
    
    console.log(`Found ${extendedKeys.length} extended keys:`);
    for (const key of extendedKeys) {
        console.log(`\n${key.type} at depth ${key.depth} (position ${key.position}):`);
        console.log(`  Key: ${key.key.substring(0, 50)}...`);
        console.log(`  Chain code: ${key.chainCode}`);
        if (key.type.startsWith('xpr')) {
            console.log(`  Private key: ${key.keyHex}`);
        }
    }
    
    // Sort by depth to find master (depth 0) keys
    const masterKeys = extendedKeys.filter(k => k.depth === 0);
    if (masterKeys.length > 0) {
        console.log('\n*** MASTER KEYS (depth 0) ***');
        for (const key of masterKeys) {
            console.log(`${key.type}: chain code = ${key.chainCode}`);
        }
    } else {
        console.log('\n*** NO MASTER KEYS FOUND (depth 0) ***');
        console.log('This wallet may not store the master extended key.');
    }
}

analyzeWallet('ref_materials/test_wallet.dat');
analyzeWallet('ref_materials/test3.dat');