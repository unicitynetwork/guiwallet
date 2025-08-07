const crypto = require('crypto');
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');

// The xpub public key we found
const xpubPubKey = '03e148ddf405483ba64f63b5a6ddbc9977ba8ed3ad2afbbb7222f9f3b65a17250f';
const targetAddress = 'alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz';

// The private keys we found in wallet.dat
const walletKeys = [
    '44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3',
    '11395f88d9dd258680a74ad1be8c7a350332859769eb99b5bbba592ea53e3200'
];

console.log('=== Reverse Engineering xpub ===\n');
console.log(`xpub public key: ${xpubPubKey}`);
console.log(`Target address: ${targetAddress}\n`);

// Test if either of our wallet keys generates this public key
for (const key of walletKeys) {
    console.log(`Testing wallet key: ${key}`);
    
    // Test 1: Direct key
    const kp1 = ec.keyFromPrivate(key, 'hex');
    const pub1 = kp1.getPublic(true, 'hex');
    console.log(`  Direct public key: ${pub1}`);
    console.log(`  Matches xpub: ${pub1 === xpubPubKey ? 'YES!' : 'NO'}`);
    
    // Test 2: After SetSeed (HMAC-SHA512 with "Bitcoin seed")
    const hmac = crypto.createHmac('sha512', 'Bitcoin seed');
    hmac.update(Buffer.from(key, 'hex'));
    const seedResult = hmac.digest('hex');
    const masterKey = seedResult.substring(0, 64);
    
    const kp2 = ec.keyFromPrivate(masterKey, 'hex');
    const pub2 = kp2.getPublic(true, 'hex');
    console.log(`  After SetSeed public key: ${pub2}`);
    console.log(`  Matches xpub: ${pub2 === xpubPubKey ? 'YES!' : 'NO'}\n`);
}

// The xpub chain code
const xpubChainCode = 'ef9b229fa43b5321834bce029dcca011db64764538f06e5b50b9dd5f38d16678';

console.log('\n=== Hypothesis ===');
console.log('The xpub might be derived from one of our keys at a specific path.');
console.log('Since the descriptor shows m/84\'/1\'/0\'/1/*, the xpub represents m/84\'/1\'/0\'.');
console.log('So we need to derive m/84\'/1\'/0\' from our master key to get this xpub.\n');

// Helper function to derive a hardened child
function deriveHardened(parentKey, parentChainCode, index) {
    const hardenedIndex = 0x80000000 + index;
    const data = Buffer.concat([
        Buffer.from([0x00]),
        Buffer.from(parentKey, 'hex'),
        Buffer.from(hardenedIndex.toString(16).padStart(8, '0'), 'hex')
    ]);
    
    const hmac = crypto.createHmac('sha512', Buffer.from(parentChainCode, 'hex'));
    hmac.update(data);
    const result = hmac.digest('hex');
    
    const childKey = result.substring(0, 64);
    const childChainCode = result.substring(64);
    
    // Add keys modulo n
    const n = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
    const parent = BigInt('0x' + parentKey);
    const child = BigInt('0x' + childKey);
    let sum = (parent + child) % n;
    if (sum < 0n) sum += n;
    
    return {
        key: sum.toString(16).padStart(64, '0'),
        chainCode: childChainCode
    };
}

// Test deriving m/84'/1'/0' from each wallet key
for (const walletKey of walletKeys) {
    console.log(`\nTesting derivation from wallet key: ${walletKey.substring(0, 16)}...`);
    
    // Apply SetSeed
    const hmac = crypto.createHmac('sha512', 'Bitcoin seed');
    hmac.update(Buffer.from(walletKey, 'hex'));
    const seedResult = hmac.digest('hex');
    
    let currentKey = seedResult.substring(0, 64);
    let currentChainCode = seedResult.substring(64);
    
    // Derive m/84'
    const child84 = deriveHardened(currentKey, currentChainCode, 84);
    
    // Derive m/84'/1'
    const child1 = deriveHardened(child84.key, child84.chainCode, 1);
    
    // Derive m/84'/1'/0'
    const child0 = deriveHardened(child1.key, child1.chainCode, 0);
    
    // Check if this generates our xpub
    const kp = ec.keyFromPrivate(child0.key, 'hex');
    const pubKey = kp.getPublic(true, 'hex');
    
    console.log(`  m/84'/1'/0' public key: ${pubKey}`);
    console.log(`  m/84'/1'/0' chain code: ${child0.chainCode}`);
    console.log(`  Public key matches xpub: ${pubKey === xpubPubKey ? 'YES!' : 'NO'}`);
    console.log(`  Chain code matches xpub: ${child0.chainCode === xpubChainCode ? 'YES!' : 'NO'}`);
    
    if (pubKey === xpubPubKey && child0.chainCode === xpubChainCode) {
        console.log('\n*** FOUND THE MASTER KEY! ***');
        console.log(`The wallet.dat master key is: ${walletKey}`);
        console.log(`After m/84'/1'/0' derivation, it generates the xpub found in the descriptor.`);
        
        // Now derive the actual address at m/84'/1'/0'/1/0
        // First derive m/84'/1'/0'/1 (non-hardened)
        const data1 = Buffer.concat([
            Buffer.from(pubKey, 'hex'),
            Buffer.from('00000001', 'hex')
        ]);
        
        const hmac1 = crypto.createHmac('sha512', Buffer.from(child0.chainCode, 'hex'));
        hmac1.update(data1);
        const result1 = hmac1.digest('hex');
        
        const key1 = addPrivateKeys(child0.key, result1.substring(0, 64));
        const chainCode1 = result1.substring(64);
        
        // Then derive m/84'/1'/0'/1/0 (non-hardened)
        const kp1 = ec.keyFromPrivate(key1, 'hex');
        const pubKey1 = kp1.getPublic(true, 'hex');
        
        const data2 = Buffer.concat([
            Buffer.from(pubKey1, 'hex'),
            Buffer.from('00000000', 'hex')
        ]);
        
        const hmac2 = crypto.createHmac('sha512', Buffer.from(chainCode1, 'hex'));
        hmac2.update(data2);
        const result2 = hmac2.digest('hex');
        
        const finalKey = addPrivateKeys(key1, result2.substring(0, 64));
        
        console.log(`\nFinal private key at m/84'/1'/0'/1/0: ${finalKey}`);
        
        // Generate address
        const finalKp = ec.keyFromPrivate(finalKey, 'hex');
        const finalPubKey = finalKp.getPublic(true, 'hex');
        console.log(`Final public key: ${finalPubKey}`);
    }
}

function addPrivateKeys(key1Hex, key2Hex) {
    const n = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
    const key1 = BigInt('0x' + key1Hex);
    const key2 = BigInt('0x' + key2Hex);
    let sum = (key1 + key2) % n;
    if (sum < 0n) sum += n;
    return sum.toString(16).padStart(64, '0');
}