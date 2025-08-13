const crypto = require('crypto');

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

// BIP32 derivation function
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
        throw new Error('Non-hardened derivation not implemented in this test');
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

console.log('=== Debugging Alpha derivation for test_wallet.dat ===\n');

// From our test
const masterKey = '4f87da2c3b88a5ab8b481fb476b3f6bd09ddeb51034fe8a43aaa087f1cb2b4e2';
const masterChainCode = 'ef9b229fa43b5321834bce029dcca011db64764538f06e5b50b9dd5f38d16678';

console.log('Master private key:', masterKey);
console.log('Master chain code:', masterChainCode);

// Derive step by step and show intermediate results
let key = masterKey;
let chainCode = masterChainCode;

console.log('\n--- Deriving m/84\' ---');
let result = deriveKeyBIP32(key, chainCode, 84, true);
console.log('Private key:', result.key);
console.log('Chain code:', result.chainCode);
key = result.key;
chainCode = result.chainCode;

console.log('\n--- Deriving m/84\'/1\' ---');
result = deriveKeyBIP32(key, chainCode, 1, true);
console.log('Private key:', result.key);
console.log('Chain code:', result.chainCode);
key = result.key;
chainCode = result.chainCode;

console.log('\n--- Deriving m/84\'/1\'/0\' ---');
result = deriveKeyBIP32(key, chainCode, 0, true);
console.log('Private key:', result.key);
console.log('Chain code:', result.chainCode);

// Now decode Alpha's xpub at m/84'/1'/0' to compare
console.log('\n=== Alpha\'s xpub at m/84\'/1\'/0\' ===');
const alphaXpub = 'xpub6DSe99Sv25TK7BSNrAXH7FRsDj6qke1Z1zepxfGjtQDRwiENTUzr9Q6TZqEPJJjN34LdTazQJCDLVBB4fmi9eJchhEoGZrAwizUt1hTVB29';

try {
    const decoded = base58Decode(alphaXpub);
    const chainCodeFromXpub = decoded.slice(13, 45);
    console.log('Chain code from Alpha xpub:', Buffer.from(chainCodeFromXpub).toString('hex'));
    console.log('Our derived chain code:', result.chainCode);
    console.log('Match?', Buffer.from(chainCodeFromXpub).toString('hex') === result.chainCode);
} catch (e) {
    console.error('Failed to decode xpub:', e);
}

// Also check the corresponding xprv if we can get it
console.log('\n=== Checking Alpha\'s xprv ===');
// We'd need to get this from alpha-cli dumpwallet or similar