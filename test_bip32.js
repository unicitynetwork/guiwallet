const crypto = require('crypto');

// Base58 decode function
function base58Decode(str) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const ALPHABET_MAP = {};
    for (let i = 0; i < ALPHABET.length; i++) {
        ALPHABET_MAP[ALPHABET[i]] = i;
    }
    
    // Count leading zeros (represented as '1' in base58)
    let zeros = 0;
    for (let i = 0; i < str.length && str[i] === '1'; i++) {
        zeros++;
    }
    
    // Decode from base58 to number
    let num = BigInt(0);
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (!(char in ALPHABET_MAP)) {
            throw new Error('Invalid base58 character: ' + char);
        }
        num = num * BigInt(58) + BigInt(ALPHABET_MAP[char]);
    }
    
    // Convert to bytes
    const bytes = [];
    while (num > 0) {
        bytes.unshift(Number(num % BigInt(256)));
        num = num / BigInt(256);
    }
    
    // Add leading zeros
    for (let i = 0; i < zeros; i++) {
        bytes.unshift(0);
    }
    
    return new Uint8Array(bytes);
}

// BIP32 derivation function
function deriveKeyBIP32(parentKey, parentChainCode, index, hardened = false) {
    const secp256k1_n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
    
    // Create data for HMAC
    let data;
    if (hardened) {
        // Hardened: 0x00 || parentKey || index
        data = Buffer.alloc(37);
        data[0] = 0x00;
        const keyBytes = Buffer.from(parentKey, 'hex');
        keyBytes.copy(data, 1);
        // Set index as big-endian 32-bit integer with hardened bit
        const hardenedIndex = index + 0x80000000;
        data.writeUInt32BE(hardenedIndex, 33);
    } else {
        // For non-hardened, we'd need elliptic curve library
        throw new Error('Non-hardened derivation not implemented in this test');
    }
    
    // HMAC-SHA512 with parent chain code
    const hmac = crypto.createHmac('sha512', Buffer.from(parentChainCode, 'hex'));
    hmac.update(data);
    const I = hmac.digest();
    
    const IL = I.slice(0, 32);  // Left 32 bytes
    const IR = I.slice(32);      // Right 32 bytes (chain code)
    
    // Calculate child private key: (IL + parentKey) mod n
    const ILBigInt = BigInt('0x' + IL.toString('hex'));
    const parentKeyBigInt = BigInt('0x' + parentKey);
    const childKeyBigInt = (ILBigInt + parentKeyBigInt) % secp256k1_n;
    
    // Convert back to hex string (padded to 64 chars)
    const childKey = childKeyBigInt.toString(16).padStart(64, '0');
    
    return {
        key: childKey,
        chainCode: IR.toString('hex')
    };
}

// Test with test3.dat values
const test3_master_key = '64c165321a1e49e4305bdfae73df17e3161504d812e811638a99d137ca8c44aa';
const test3_chain_code = '503b9544e02e1a101abc2982e513c16d71fb3f103bbad3974c27ba9983aa130a';
const test3_expected_address = 'alpha1qw0nylklglj2trsn4saeqy6wnzjwcwdp27a3zmf';

console.log('Testing BIP32 derivation for test3.dat');
console.log('Master key:', test3_master_key);
console.log('Chain code:', test3_chain_code);
console.log('Expected first address:', test3_expected_address);
console.log('');

// Derive m/84'/1'/0'
let key = test3_master_key;
let chainCode = test3_chain_code;

console.log('Deriving m/84\'');
let result = deriveKeyBIP32(key, chainCode, 84, true);
key = result.key;
chainCode = result.chainCode;
console.log('  Key:', key);
console.log('  Chain code:', chainCode);

console.log('\nDeriving m/84\'/1\'');
result = deriveKeyBIP32(key, chainCode, 1, true);
key = result.key;
chainCode = result.chainCode;
console.log('  Key:', key);
console.log('  Chain code:', chainCode);

console.log('\nDeriving m/84\'/1\'/0\'');
result = deriveKeyBIP32(key, chainCode, 0, true);
key = result.key;
chainCode = result.chainCode;
console.log('  Key:', key);
console.log('  Chain code:', chainCode);

// Compare with alpha-cli output
console.log('\n--- Comparison with alpha-cli output ---');
console.log('alpha-cli xprv at m/84\'/1\'/0\':');
console.log('xprv9zCVvWoLQGrCRxxjhQwKUYo6iUpGT9mLQJa6XHevbxQT2VC48NMEBbhrDjK8N5aejQQdqePfUfqP3x3bckfWnafpsXhchUGtpBfJqKphPz4');

// Decode the xprv to extract key and chain code
const xprv = 'xprv9zCVvWoLQGrCRxxjhQwKUYo6iUpGT9mLQJa6XHevbxQT2VC48NMEBbhrDjK8N5aejQQdqePfUfqP3x3bckfWnafpsXhchUGtpBfJqKphPz4';
try {
    const decoded = base58Decode(xprv);
    const version = decoded.slice(0, 4);
    const depth = decoded[4];
    const fingerprint = decoded.slice(5, 9);
    const childNumber = decoded.slice(9, 13);
    const chainCodeFromXprv = decoded.slice(13, 45);
    const keyData = decoded.slice(45, 78);
    
    console.log('Decoded xprv:');
    console.log('  Version:', Buffer.from(version).toString('hex'));
    console.log('  Depth:', depth);
    console.log('  Chain code:', Buffer.from(chainCodeFromXprv).toString('hex'));
    console.log('  Key data:', Buffer.from(keyData).toString('hex'));
    
    // The key in xprv has 0x00 prefix for private keys
    if (keyData[0] === 0x00) {
        const privateKey = Buffer.from(keyData.slice(1)).toString('hex');
        console.log('  Private key:', privateKey);
        console.log('\nOur derived key:', key);
        console.log('Match?', privateKey === key);
    }
} catch (e) {
    console.error('Failed to decode xprv:', e);
}