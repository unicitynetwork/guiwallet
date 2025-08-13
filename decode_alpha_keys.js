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

console.log('=== Decoding Alpha master xprv ===');
const masterXprv = 'xprv9s21ZrQH143K4SiaLaiFCSWV42WMGu3Bcf6gV1QTv8QHUHp4mXw847Rwbb2dt4tmrh5QmX2uMEndsQZ9LNomU2iHzo4Q9xACtJTtuuPsrdK';

try {
    const decoded = base58Decode(masterXprv);
    console.log('Version:', Buffer.from(decoded.slice(0, 4)).toString('hex'));
    console.log('Depth:', decoded[4]);
    console.log('Fingerprint:', Buffer.from(decoded.slice(5, 9)).toString('hex'));
    console.log('Child number:', Buffer.from(decoded.slice(9, 13)).toString('hex'));
    console.log('Chain code:', Buffer.from(decoded.slice(13, 45)).toString('hex'));
    console.log('Key data:', Buffer.from(decoded.slice(45, 78)).toString('hex'));
    
    // The key in xprv has 0x00 prefix for private keys
    if (decoded[45] === 0x00) {
        const privateKey = Buffer.from(decoded.slice(46, 78)).toString('hex');
        console.log('Master private key:', privateKey);
        
        console.log('\nExpected master key:', '4f87da2c3b88a5ab8b481fb476b3f6bd09ddeb51034fe8a43aaa087f1cb2b4e2');
        console.log('Match?', privateKey === '4f87da2c3b88a5ab8b481fb476b3f6bd09ddeb51034fe8a43aaa087f1cb2b4e2');
    }
} catch (e) {
    console.error('Failed to decode xprv:', e);
}

// Now let's check if Alpha is using the seed incorrectly
console.log('\n=== Testing seed derivation ===');
// Maybe Alpha uses the private key as the seed?
const testSeed = '4f87da2c3b88a5ab8b481fb476b3f6bd09ddeb51034fe8a43aaa087f1cb2b4e2';
const hmac = crypto.createHmac('sha512', Buffer.from('Bitcoin seed', 'utf8'));
hmac.update(Buffer.from(testSeed, 'hex'));
const I = hmac.digest();

const derivedKey = I.slice(0, 32).toString('hex');
const derivedChainCode = I.slice(32).toString('hex');

console.log('If using master key as seed:');
console.log('Derived key:', derivedKey);
console.log('Derived chain code:', derivedChainCode);
console.log('Match expected chain code?', derivedChainCode === 'ef9b229fa43b5321834bce029dcca011db64764538f06e5b50b9dd5f38d16678');