#!/usr/bin/env node

// This script tests wallet.dat keys using the same elliptic library as index.html
// to find which key generates the target address

const crypto = require('crypto');

// We'll simulate the elliptic library behavior for testing
// In the browser, we'd use the actual elliptic library

const EXPECTED_ADDRESS = 'alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz';
const EXPECTED_HASH = 'd571e66f22601b58fea87dd07ff95c5af0f86298';

// Keys from wallet.dat
const walletKeys = [
    {
        name: 'First Key (Master)',
        key: '44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3'
    },
    {
        name: 'Second Key',
        key: '11395f88d9dd258680a74ad1be8c7a350332859769eb99b5bbba592ea53e3200'
    }
];

console.log('=== Testing Wallet.dat Keys ===');
console.log(`Target address: ${EXPECTED_ADDRESS}`);
console.log(`Target hash: ${EXPECTED_HASH}\n`);

console.log('Since Node.js crypto doesn\'t have built-in secp256k1 support,');
console.log('we need to test these keys in the browser with the elliptic library.\n');

console.log('Keys to test:');
walletKeys.forEach((keyInfo, i) => {
    console.log(`${i + 1}. ${keyInfo.name}: ${keyInfo.key}`);
});

console.log('\n=== What to do next ===');
console.log('1. Open test_direct_keys.html in browser');
console.log('2. Check which key generates: ' + EXPECTED_ADDRESS);
console.log('3. Update index.html to use that key directly');
console.log('4. Remove BIP32 derivation for wallet.dat imports');

console.log('\n=== Expected behavior ===');
console.log('One of these keys should generate the target address directly.');
console.log('Alpha-qt likely stores the actual private key for each address,');
console.log('not a master seed with BIP32 derivation.');