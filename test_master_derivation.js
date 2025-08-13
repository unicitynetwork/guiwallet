const crypto = require('crypto');

// Test deriving master key and chain code from seed
function deriveMasterFromSeed(seedHex) {
    // BIP32: Master key generation from seed
    // I = HMAC-SHA512(Key = "Bitcoin seed", Data = seed)
    const hmac = crypto.createHmac('sha512', Buffer.from('Bitcoin seed', 'utf8'));
    hmac.update(Buffer.from(seedHex, 'hex'));
    const I = hmac.digest();
    
    const masterKey = I.slice(0, 32).toString('hex');
    const masterChainCode = I.slice(32).toString('hex');
    
    return { masterKey, masterChainCode };
}

// Let's test if we can derive the known master keys from a seed
console.log('Testing master key derivation from seed...\n');

// Try to reverse engineer what seed would produce our known master keys
// This won't work directly, but let's see what we get

// For test_wallet.dat
const test_wallet_master_key = '4f87da2c3b88a5ab8b481fb476b3f6bd09ddeb51034fe8a43aaa087f1cb2b4e2';

// For test3.dat 
const test3_master_key = '64c165321a1e49e4305bdfae73df17e3161504d812e811638a99d137ca8c44aa';

// The problem is: Alpha wallet.dat files don't store the seed directly
// They store the master private key and various derived keys
// The chain code we need is the one that corresponds to the master private key

// Let's think about this differently:
// 1. wallet.dat stores the master private key (which we can extract)
// 2. wallet.dat also stores xpubs at various derivation levels
// 3. We need the chain code that goes with the master private key

// In BIP32, you can't derive the master chain code from just the master private key
// You need either:
// - The original seed (to derive both master key and chain code)
// - The master extended private key (xprv) which includes the chain code

console.log('Key insight: We need to find the master xprv (depth 0) in the wallet file');
console.log('The xpub we found is at depth 3 (m/84\'/1\'/0\')');
console.log('');
console.log('Alpha wallet structure:');
console.log('- Master seed → master key + master chain code (depth 0)');
console.log('- Master → m/84\' (depth 1)'); 
console.log('- m/84\' → m/84\'/1\' (depth 2)');
console.log('- m/84\'/1\' → m/84\'/1\'/0\' (depth 3) ← This is what we\'re extracting');
console.log('');
console.log('We need to find where Alpha stores the master chain code or seed.');