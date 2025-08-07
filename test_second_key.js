const crypto = require('crypto');
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');

// Bech32 encoding
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32_polymod(values) {
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

function bech32_hrp_expand(hrp) {
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

function bech32_create_checksum(hrp, data) {
    const values = bech32_hrp_expand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
    const mod = bech32_polymod(values) ^ 1;
    const ret = [];
    for (let p = 0; p < 6; ++p) {
        ret.push((mod >> 5 * (5 - p)) & 31);
    }
    return ret;
}

function bech32_encode(hrp, data) {
    const combined = data.concat(bech32_create_checksum(hrp, data));
    let ret = hrp + '1';
    for (let p = 0; p < combined.length; ++p) {
        ret += CHARSET.charAt(combined[p]);
    }
    return ret;
}

function convertbits(data, frombits, tobits, pad = true) {
    let acc = 0;
    let bits = 0;
    const ret = [];
    const maxv = (1 << tobits) - 1;
    for (let p = 0; p < data.length; ++p) {
        const value = data[p];
        acc = (acc << frombits) | value;
        bits += frombits;
        while (bits >= tobits) {
            bits -= tobits;
            ret.push((acc >> bits) & maxv);
        }
    }
    if (pad) {
        if (bits > 0) {
            ret.push((acc << (tobits - bits)) & maxv);
        }
    }
    return ret;
}

function segwit_addr_encode(hrp, witver, witprog) {
    const ret = bech32_encode(hrp, [witver].concat(convertbits(witprog, 8, 5)));
    return ret;
}

function hash160(data) {
    const sha = crypto.createHash('sha256').update(Buffer.from(data, 'hex')).digest();
    const ripemd = crypto.createHash('ripemd160').update(sha).digest();
    return ripemd;
}

// Test the second key from wallet.dat
const secondKey = '11395f88d9dd258680a74ad1be8c7a350332859769eb99b5bbba592ea53e3200';
const targetAddress = 'alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz';
const expectedPubkeyHash = '0656ecf66f92201aa8fea87dd0ffc55e52cc7c14';

console.log('=== Testing Second Key ===\n');
console.log(`Second key: ${secondKey}`);
console.log(`Target address: ${targetAddress}`);
console.log(`Expected pubkey hash: ${expectedPubkeyHash}\n`);

// Test the key directly
const kp = ec.keyFromPrivate(secondKey, 'hex');
const pubKey = kp.getPublic(true, 'hex');
const pubkeyHash = hash160(pubKey);
const address = segwit_addr_encode('alpha', 0, Array.from(pubkeyHash));

console.log('Direct key test:');
console.log(`  Public key: ${pubKey}`);
console.log(`  Pubkey hash: ${pubkeyHash.toString('hex')}`);
console.log(`  Address: ${address}`);
console.log(`  Match: ${address === targetAddress ? 'YES! ✓' : 'NO'}\n`);

if (pubkeyHash.toString('hex') === expectedPubkeyHash) {
    console.log('*** FOUND! ***');
    console.log(`The private key for ${targetAddress} is: ${secondKey}`);
    return;
}

// Maybe it's a child of the first key?
console.log('Testing as a derived key from the first key...\n');

// First key info
const firstKey = '44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3';
const xpubChainCode = 'ef9b229fa43b5321834bce029dcca011db64764538f06e5b50b9dd5f38d16678';

// Try different indices
for (let i = 0; i < 10; i++) {
    const kp1 = ec.keyFromPrivate(firstKey, 'hex');
    const pubKey1 = kp1.getPublic(true, 'hex');
    
    const data = Buffer.concat([
        Buffer.from(pubKey1, 'hex'),
        Buffer.from(i.toString(16).padStart(8, '0'), 'hex')
    ]);
    
    const hmac = crypto.createHmac('sha512', Buffer.from(xpubChainCode, 'hex'));
    hmac.update(data);
    const result = hmac.digest('hex');
    
    const childKey = result.substring(0, 64);
    
    // Add keys modulo n
    const n = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
    const parent = BigInt('0x' + firstKey);
    const child = BigInt('0x' + childKey);
    let sum = (parent + child) % n;
    if (sum < 0n) sum += n;
    const derivedKey = sum.toString(16).padStart(64, '0');
    
    // Check if this matches the second key
    if (derivedKey === secondKey) {
        console.log(`Found! Second key is child at index ${i} of first key`);
        
        // Now generate the address
        const kp2 = ec.keyFromPrivate(secondKey, 'hex');
        const pubKey2 = kp2.getPublic(true, 'hex');
        const hash2 = hash160(pubKey2);
        const addr2 = segwit_addr_encode('alpha', 0, Array.from(hash2));
        
        console.log(`  Address: ${addr2}`);
        console.log(`  Match: ${addr2 === targetAddress ? 'YES! ✓' : 'NO'}`);
        break;
    }
}

// Also test if the expected pubkey hash leads us somewhere
console.log('\n=== Analyzing Expected Pubkey Hash ===');
console.log(`If we have the correct pubkey hash (${expectedPubkeyHash}),`);
console.log('we just need to find which private key generates a public key with this hash.');