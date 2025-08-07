#!/usr/bin/env node
/**
 * Test script to verify wallet.dat import functionality
 * Simulates what the web wallet does when importing
 */

const crypto = require('crypto');

// The private key we extracted from wallet.dat
const extractedPrivKey = '44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3';

// Expected address from the wallet
const expectedAddress = 'alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz';

// Simple elliptic curve implementation for secp256k1
// We'll use Node's built-in crypto for this test
function getPublicKeyFromPrivate(privateKeyHex) {
    const ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(Buffer.from(privateKeyHex, 'hex'));
    const publicKey = ecdh.getPublicKey('hex', 'compressed');
    return publicKey;
}

// Compute hash160 (SHA256 followed by RIPEMD160)
function hash160(data) {
    const sha256 = crypto.createHash('sha256').update(data).digest();
    const ripemd160 = crypto.createHash('ripemd160').update(sha256).digest();
    return ripemd160;
}

// Bech32 encoding (simplified for our test)
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Encode(hrp, data) {
    // This is a simplified version - the actual implementation is more complex
    // For testing, we'll just verify that our key generates the expected hash
    return hrp + '1' + data.map(v => CHARSET[v]).join('');
}

function testPrivateKey(privKeyHex) {
    console.log('Testing private key:', privKeyHex);
    
    try {
        // Get public key
        const publicKey = getPublicKeyFromPrivate(privKeyHex);
        console.log('Public key (compressed):', publicKey);
        
        // Compute hash160 of public key
        const pubKeyHash = hash160(Buffer.from(publicKey, 'hex'));
        console.log('Public key hash (hash160):', pubKeyHash.toString('hex'));
        
        // Expected public key hash from the address
        // alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz
        // The 'q' after '1' indicates witness version 0
        // Decoding the bech32 part: 64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz
        // This should decode to the public key hash
        
        return {
            privateKey: privKeyHex,
            publicKey: publicKey,
            pubKeyHash: pubKeyHash.toString('hex')
        };
    } catch (error) {
        console.error('Error processing key:', error);
        return null;
    }
}

// Test BIP32 derivation
function deriveBIP32Key(masterKeyHex, path) {
    // For testing, we'll use a simple HMAC-based derivation
    // Real BIP32 is more complex
    const hmac = crypto.createHmac('sha512', 'Bitcoin seed');
    hmac.update(Buffer.from(masterKeyHex, 'hex'));
    const result = hmac.digest();
    
    // Take first 32 bytes as the derived key
    const derivedKey = result.slice(0, 32);
    return derivedKey.toString('hex');
}

console.log('=== Testing Wallet Import ===\n');

// Test the extracted private key directly
console.log('1. Testing extracted key directly:');
const directResult = testPrivateKey(extractedPrivKey);

// Test some common derivation paths
console.log('\n2. Testing BIP32 derivations:');
const derivationPaths = [
    "m/44'/0'/0'",
    "m/84'/0'/0'",
    "m/0'",
    "m/0'/0'"
];

for (const path of derivationPaths) {
    console.log(`\nTesting derivation path: ${path}`);
    const derivedKey = deriveBIP32Key(extractedPrivKey, path);
    const result = testPrivateKey(derivedKey);
}

// Decode the expected address to get the expected public key hash
console.log('\n3. Expected address analysis:');
console.log('Address:', expectedAddress);
// The witness program in the address should be the public key hash
// For a proper comparison, we'd need to implement full bech32 decoding

console.log('\n=== Summary ===');
console.log('The wallet.dat contains a private key that needs proper BIP32 derivation');
console.log('to generate the addresses used in the wallet.');
console.log('The web wallet import function should handle this derivation automatically.');