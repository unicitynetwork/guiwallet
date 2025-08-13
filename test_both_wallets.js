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

console.log('=== TESTING test_wallet.dat ===');
const test_wallet_master_key = '4f87da2c3b88a5ab8b481fb476b3f6bd09ddeb51034fe8a43aaa087f1cb2b4e2';
const test_wallet_chain_code = 'ef9b229fa43b5321834bce029dcca011db64764538f06e5b50b9dd5f38d16678';
const test_wallet_expected_address = 'alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz';

console.log('Master key:', test_wallet_master_key);
console.log('Chain code:', test_wallet_chain_code);
console.log('Expected first address:', test_wallet_expected_address);

// Test if the chain code from the wallet file is actually the master chain code
// or if it's from a derived level
console.log('\nChecking xpub from test_wallet.dat:');
const test_wallet_xpub = 'xpub6DBrLz5EEeSVfT2CnSUJqgnqGWdkre4BmXUhKg4Y8HwRxH9CZMdUBCNGiKE5gGEqJJ7NGCrEFWU51VsJmr7zZ4RpTgQpUPSMzxgfLnhGPro';
try {
    const decoded = base58Decode(test_wallet_xpub);
    const chainCodeFromXpub = decoded.slice(13, 45);
    console.log('Chain code from xpub:', Buffer.from(chainCodeFromXpub).toString('hex'));
    console.log('Match with our chain code?', Buffer.from(chainCodeFromXpub).toString('hex') === test_wallet_chain_code);
} catch (e) {
    console.error('Failed to decode xpub:', e);
}

console.log('\n=== TESTING test3.dat ===');
const test3_master_key = '64c165321a1e49e4305bdfae73df17e3161504d812e811638a99d137ca8c44aa';
const test3_chain_code = '503b9544e02e1a101abc2982e513c16d71fb3f103bbad3974c27ba9983aa130a';
const test3_expected_address = 'alpha1qw0nylklglj2trsn4saeqy6wnzjwcwdp27a3zmf';

console.log('Master key:', test3_master_key);
console.log('Chain code:', test3_chain_code);
console.log('Expected first address:', test3_expected_address);

// Test if the chain code from the wallet file is actually the master chain code
// or if it's from a derived level
console.log('\nChecking xpub from test3.dat:');
const test3_xpub = 'xpub6DCZL2LEFeQVeSm29A2wAAKWKmgxc7eNx1uBJqJj3cqKqf8cxFfcMX4SHX2FBc2L1VkbLHCGYGX3Aj6YNX5h9sVQCMBbqDUrHBJGgfKcXnH';
try {
    const decoded = base58Decode(test3_xpub);
    const chainCodeFromXpub = decoded.slice(13, 45);
    console.log('Chain code from xpub:', Buffer.from(chainCodeFromXpub).toString('hex'));
    console.log('Match with our chain code?', Buffer.from(chainCodeFromXpub).toString('hex') === test3_chain_code);
} catch (e) {
    console.error('Failed to decode xpub:', e);
}

// Now let's check what level the xpub is at
console.log('\n=== Checking xpub depth ===');
try {
    const decoded1 = base58Decode(test_wallet_xpub);
    const decoded3 = base58Decode(test3_xpub);
    console.log('test_wallet.dat xpub depth:', decoded1[4]);
    console.log('test3.dat xpub depth:', decoded3[4]);
} catch (e) {
    console.error('Failed to decode xpubs:', e);
}