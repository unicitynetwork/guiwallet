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

console.log('=== Decoding test3 master xprv ===');
const masterXprv = 'xprv9s21ZrQH143K2rgqEwd1ACRuWQH2o69zzmZQqtRB7f6k3sQ3szpFtePGM1Qc1HRBpHo1HcGMcn7QFEjCVvnZRdWietSZ33zHSzgfAZWRWnp';

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
        console.log('\nMaster private key:', privateKey);
        
        console.log('\nKey we extracted:', '64c165321a1e49e4305bdfae73df17e3161504d812e811638a99d137ca8c44aa');
        console.log('Match?', privateKey === '64c165321a1e49e4305bdfae73df17e3161504d812e811638a99d137ca8c44aa');
    }
} catch (e) {
    console.error('Failed to decode xprv:', e);
}