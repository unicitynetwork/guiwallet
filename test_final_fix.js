const fs = require('fs');
const crypto = require('crypto');
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');

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

// Find pattern in data
function findPattern(data, pattern, start = 0) {
    for (let i = start; i <= data.length - pattern.length; i++) {
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

// Extract master private key and chain code
function extractFromWalletDat(data) {
    // Extract master private key
    const descriptorKeyPattern = Buffer.from('walletdescriptorkey');
    let masterKey = null;
    
    let index = 0;
    while ((index = findPattern(data, descriptorKeyPattern, index)) !== -1 && !masterKey) {
        // Look for private key patterns after descriptor key
        for (let checkPos = index + descriptorKeyPattern.length; 
             checkPos < Math.min(index + 200, data.length); 
             checkPos++) {
            
            // Pattern 2: d30201010420 (the pattern we need for test_wallet.dat)
            if (data[checkPos] === 0xd3 &&
                data[checkPos + 1] === 0x02 &&
                data[checkPos + 2] === 0x01 &&
                data[checkPos + 3] === 0x01 &&
                data[checkPos + 4] === 0x04 &&
                data[checkPos + 5] === 0x20) {
                
                const privKeyBytes = data.slice(checkPos + 6, checkPos + 38);
                const privKeyHex = privKeyBytes.toString('hex');
                
                // Validate it's a valid private key
                try {
                    const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
                    const key = BigInt('0x' + privKeyHex);
                    if (key > 0n && key < n) {
                        masterKey = privKeyHex;
                        console.log('Found master private key:', masterKey);
                        break;
                    }
                } catch {}
            }
        }
        
        index++;
    }
    
    // Extract master chain code from depth 0 xpub
    const xpubPattern = Buffer.from('xpub');
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let searchPos = 0;
    let masterChainCode = null;
    
    while (!masterChainCode && searchPos < data.length) {
        let xpubIndex = findPattern(data, xpubPattern, searchPos);
        if (xpubIndex === -1) break;
        
        let xpubStr = 'xpub';
        let pos = xpubIndex + 4;
        
        while (pos < data.length && xpubStr.length < 120) {
            const char = String.fromCharCode(data[pos]);
            if (base58Chars.includes(char)) {
                xpubStr += char;
                pos++;
            } else {
                break;
            }
        }
        
        if (xpubStr.length > 100) {
            try {
                const decoded = base58Decode(xpubStr);
                const depth = decoded[4];
                
                if (depth === 0) {
                    const chainCodeBytes = decoded.slice(13, 45);
                    masterChainCode = Buffer.from(chainCodeBytes).toString('hex');
                    console.log('Found master chain code from depth 0 xpub:', masterChainCode);
                }
            } catch (e) {}
        }
        
        searchPos = xpubIndex + 4;
    }
    
    return { masterKey, masterChainCode };
}

// BIP32 derivation
function deriveKeyBIP32(parentKey, parentChainCode, index, hardened = false) {
    const secp256k1_n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
    
    let data;
    if (hardened) {
        data = Buffer.alloc(37);
        data[0] = 0x00;
        const keyBytes = Buffer.from(parentKey, 'hex');
        keyBytes.copy(data, 1);
        const hardenedIndex = index + 0x80000000;
        data.writeUInt32BE(hardenedIndex, 33);
    } else {
        const keyPair = ec.keyFromPrivate(parentKey);
        const pubKey = keyPair.getPublic(true, 'hex');
        const pubKeyBytes = Buffer.from(pubKey, 'hex');
        
        data = Buffer.alloc(37);
        pubKeyBytes.copy(data, 0);
        data.writeUInt32BE(index, 33);
    }
    
    const hmac = crypto.createHmac('sha512', Buffer.from(parentChainCode, 'hex'));
    hmac.update(data);
    const I = hmac.digest();
    
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    
    const ILBigInt = BigInt('0x' + IL.toString('hex'));
    const parentKeyBigInt = BigInt('0x' + parentKey);
    const childKeyBigInt = (ILBigInt + parentKeyBigInt) % secp256k1_n;
    
    const childKey = childKeyBigInt.toString(16).padStart(64, '0');
    
    return {
        key: childKey,
        chainCode: IR.toString('hex')
    };
}

// Bech32 encoding
function bech32Encode(hrp, witnessVersion, witnessProgram) {
    const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    
    function bech32Polymod(values) {
        const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
        let chk = 1;
        for (let p = 0; p < values.length; ++p) {
            const top = chk >> 25;
            chk = (chk & 0x1ffffff) << 5 ^ values[p];
            for (let i = 0; i < 5; ++i) {
                if ((top >> i) & 1) {
                    chk ^= GENERATOR[i];
                }
            }
        }
        return chk;
    }
    
    function hrpExpand(hrp) {
        const ret = [];
        for (let p = 0; p < hrp.length; ++p) {
            ret.push(hrp.charCodeAt(p) >> 5);
        }
        ret.push(0);
        for (let p = 0; p < hrp.length; ++p) {
            ret.push(hrp.charCodeAt(p) & 31);
        }
        return ret;
    }
    
    function createChecksum(hrp, data) {
        const values = hrpExpand(hrp).concat(data);
        const polymod = bech32Polymod(values.concat([0, 0, 0, 0, 0, 0])) ^ 1;
        const ret = [];
        for (let p = 0; p < 6; ++p) {
            ret.push((polymod >> 5 * (5 - p)) & 31);
        }
        return ret;
    }
    
    // Convert to 5-bit groups
    const data = [witnessVersion];
    let acc = 0;
    let bits = 0;
    for (let p = 0; p < witnessProgram.length; ++p) {
        const value = witnessProgram[p];
        acc = (acc << 8) | value;
        bits += 8;
        while (bits >= 5) {
            bits -= 5;
            data.push((acc >> bits) & 31);
        }
    }
    if (bits > 0) {
        data.push((acc << (5 - bits)) & 31);
    }
    
    const checksum = createChecksum(hrp, data);
    const combined = data.concat(checksum);
    
    let result = hrp + '1';
    for (let p = 0; p < combined.length; ++p) {
        result += CHARSET[combined[p]];
    }
    
    return result;
}

// Test wallet
function testWallet(filename, expectedAddress) {
    console.log(`\n=== Testing ${filename} ===`);
    const data = fs.readFileSync(filename);
    
    // Extract keys
    const { masterKey, masterChainCode } = extractFromWalletDat(data);
    
    if (!masterKey || !masterChainCode) {
        console.error('Failed to extract keys!');
        return;
    }
    
    // Derive the first address using BIP32
    let key = masterKey;
    let chainCode = masterChainCode;
    
    // m/84'/1'/0'/0/0
    let result = deriveKeyBIP32(key, chainCode, 84, true);
    key = result.key;
    chainCode = result.chainCode;
    
    result = deriveKeyBIP32(key, chainCode, 1, true);
    key = result.key;
    chainCode = result.chainCode;
    
    result = deriveKeyBIP32(key, chainCode, 0, true);
    key = result.key;
    chainCode = result.chainCode;
    
    result = deriveKeyBIP32(key, chainCode, 0, false);
    key = result.key;
    chainCode = result.chainCode;
    
    result = deriveKeyBIP32(key, chainCode, 0, false);
    const childPrivateKey = result.key;
    
    // Generate public key and address
    const keyPair = ec.keyFromPrivate(childPrivateKey);
    const publicKey = keyPair.getPublic(true, 'hex');
    
    // Create address
    const sha256 = crypto.createHash('sha256').update(Buffer.from(publicKey, 'hex')).digest();
    const ripemd160 = crypto.createHash('ripemd160').update(sha256).digest();
    
    const address = bech32Encode('alpha', 0, ripemd160);
    
    console.log('\nDerived first address:', address);
    console.log('Expected address:', expectedAddress);
    console.log('SUCCESS:', address === expectedAddress ? '✓' : '✗');
}

// Test both wallets
testWallet(
    'ref_materials/test_wallet.dat',
    'alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz'
);

testWallet(
    'ref_materials/test3.dat',
    'alpha1qw0nylklglj2trsn4saeqy6wnzjwcwdp27a3zmf'
);