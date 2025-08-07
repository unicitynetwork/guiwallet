const crypto = require('crypto');
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');

// Bech32 implementation
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

// Custom hash160 that uses Node's crypto
function hash160(data) {
    const sha = crypto.createHash('sha256').update(Buffer.from(data, 'hex')).digest();
    const ripemd = crypto.createHash('ripemd160').update(sha).digest();
    return ripemd;
}

// Test Alpha's double-seed theory
function testDoubleSeed() {
    const walletKey = '44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3';
    const expectedAddress = 'alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz';
    
    console.log('=== Testing Alpha\'s Double-Seed Theory ===\n');
    console.log(`Wallet key: ${walletKey}`);
    console.log(`Target: ${expectedAddress}\n`);
    
    // Apply double-seed: HMAC-SHA512("Bitcoin seed", wallet_key)
    const hmac = crypto.createHmac('sha512', 'Bitcoin seed');
    hmac.update(Buffer.from(walletKey, 'hex'));
    const seedResult = hmac.digest('hex');
    
    const masterKey = seedResult.substring(0, 64);
    const masterChainCode = seedResult.substring(64);
    
    console.log('Double-seed result:');
    console.log(`  Master key: ${masterKey}`);
    console.log(`  Chain code: ${masterChainCode}\n`);
    
    // Test if this key directly generates the target address
    console.log('Testing direct key (no further derivation):');
    testAddress(masterKey);
    
    // Test simple derivation paths
    const paths = [
        { name: 'm/0', indices: [0] },
        { name: 'm/0/0', indices: [0, 0] },
        { name: 'm/84\'/1\'/0\'/0/0', indices: [0x80000054, 0x80000001, 0x80000000, 0, 0] }
    ];
    
    for (const path of paths) {
        console.log(`\nTesting path ${path.name}:`);
        const derivedKey = derivePath(masterKey, masterChainCode, path.indices);
        testAddress(derivedKey);
    }
    
    // Test the second key
    console.log('\n\n=== Testing Second Key ===');
    const secondKey = '11395f88d9dd258680a74ad1be8c7a350332859769eb99b5bbba592ea53e3200';
    console.log(`Second key: ${secondKey}`);
    
    // Apply double-seed to second key
    const hmac2 = crypto.createHmac('sha512', 'Bitcoin seed');
    hmac2.update(Buffer.from(secondKey, 'hex'));
    const seedResult2 = hmac2.digest('hex');
    
    const masterKey2 = seedResult2.substring(0, 64);
    console.log('After double-seed:', masterKey2);
    testAddress(masterKey2);
}

function derivePath(startKey, startChainCode, indices) {
    let currentKey = startKey;
    let currentChainCode = startChainCode;
    
    for (const index of indices) {
        const hardened = index >= 0x80000000;
        
        let data;
        if (hardened) {
            // Hardened: 0x00 || key || index
            data = Buffer.concat([
                Buffer.from([0x00]),
                Buffer.from(currentKey, 'hex'),
                Buffer.from(index.toString(16).padStart(8, '0'), 'hex')
            ]);
        } else {
            // Non-hardened: pubkey || index
            const kp = ec.keyFromPrivate(currentKey, 'hex');
            const pubKey = kp.getPublic(true, 'hex');
            data = Buffer.concat([
                Buffer.from(pubKey, 'hex'),
                Buffer.from(index.toString(16).padStart(8, '0'), 'hex')
            ]);
        }
        
        const hmac = crypto.createHmac('sha512', Buffer.from(currentChainCode, 'hex'));
        hmac.update(data);
        const result = hmac.digest('hex');
        
        const childKey = result.substring(0, 64);
        currentChainCode = result.substring(64);
        
        // Add keys modulo n
        currentKey = addPrivateKeys(currentKey, childKey);
    }
    
    return currentKey;
}

function addPrivateKeys(key1Hex, key2Hex) {
    const n = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
    const key1 = BigInt('0x' + key1Hex);
    const key2 = BigInt('0x' + key2Hex);
    let sum = (key1 + key2) % n;
    if (sum < 0n) sum += n;
    return sum.toString(16).padStart(64, '0');
}

function testAddress(privateKey) {
    const kp = ec.keyFromPrivate(privateKey, 'hex');
    const pubKey = kp.getPublic(true, 'hex');
    
    const pubkeyHash = hash160(pubKey);
    const address = segwit_addr_encode('alpha', 0, Array.from(pubkeyHash));
    
    const expectedAddress = 'alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz';
    console.log(`  Private key: ${privateKey}`);
    console.log(`  Public key: ${pubKey}`);
    console.log(`  Address: ${address}`);
    console.log(`  Match: ${address === expectedAddress ? 'YES! ✓' : 'NO'}`);
    
    if (address === expectedAddress) {
        console.log('\n*** FOUND! ***');
        console.log(`The correct private key is: ${privateKey}`);
    }
}

// Run the test
testDoubleSeed();