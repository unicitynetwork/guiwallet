const crypto = require('crypto');
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');

// The private key extracted from test4.dat
const masterPrivateKeyHex = '34eca3cfb3ef6760dc45fabe2b9883182231095a03480fa2444a72dc6a95a72c';

// Bech32 encoding for addresses
function bech32Encode(hrp, data) {
    const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
    
    function polymod(values) {
        const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
        let chk = 1;
        for (let v of values) {
            let b = chk >> 25;
            chk = (chk & 0x1ffffff) << 5 ^ v;
            for (let i = 0; i < 5; i++) {
                if ((b >> i) & 1) {
                    chk ^= GEN[i];
                }
            }
        }
        return chk;
    }
    
    function hrpExpand(hrp) {
        let ret = [];
        for (let i = 0; i < hrp.length; i++) {
            ret.push(hrp.charCodeAt(i) >> 5);
        }
        ret.push(0);
        for (let i = 0; i < hrp.length; i++) {
            ret.push(hrp.charCodeAt(i) & 31);
        }
        return ret;
    }
    
    function createChecksum(hrp, data) {
        const values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
        const mod = polymod(values) ^ 1;
        let ret = [];
        for (let i = 0; i < 6; i++) {
            ret.push((mod >> (5 * (5 - i))) & 31);
        }
        return ret;
    }
    
    const combined = data.concat(createChecksum(hrp, data));
    let ret = hrp + '1';
    for (let d of combined) {
        ret += CHARSET[d];
    }
    return ret;
}

function hash160(buffer) {
    const sha256Hash = crypto.createHash('sha256').update(buffer).digest();
    return crypto.createHash('ripemd160').update(sha256Hash).digest();
}

function deriveChildKey(masterPrivateKey, index) {
    // BIP32-style derivation using HMAC-SHA512
    const hmac = crypto.createHmac('sha512', Buffer.from('Bitcoin seed'));
    hmac.update(Buffer.concat([
        Buffer.from(masterPrivateKey, 'hex'),
        Buffer.from(index.toString(16).padStart(8, '0'), 'hex')
    ]));
    const result = hmac.digest();
    
    // First 32 bytes is the child private key
    return result.slice(0, 32);
}

function privateKeyToAddress(privateKeyHex) {
    // Create key pair from private key
    const keyPair = ec.keyFromPrivate(privateKeyHex, 'hex');
    
    // Get compressed public key
    const publicKey = keyPair.getPublic(true, 'hex');
    const pubKeyBuffer = Buffer.from(publicKey, 'hex');
    
    // Hash the public key
    const pubKeyHash = hash160(pubKeyBuffer);
    
    // Convert to 5-bit groups for bech32
    const data = [0]; // witness version 0
    for (let i = 0; i < pubKeyHash.length; i++) {
        if (i < pubKeyHash.length - 1) {
            data.push(pubKeyHash[i] >> 3);
            data.push(((pubKeyHash[i] & 0x07) << 2) | (pubKeyHash[i + 1] >> 6));
            data.push((pubKeyHash[i + 1] & 0x3f) >> 1);
            data.push(((pubKeyHash[i + 1] & 0x01) << 4) | (pubKeyHash[i + 2] >> 4));
            if (i + 2 < pubKeyHash.length) {
                data.push(((pubKeyHash[i + 2] & 0x0f) << 1) | (pubKeyHash[i + 3] >> 7));
                if (i + 3 < pubKeyHash.length) {
                    data.push((pubKeyHash[i + 3] & 0x7f) >> 2);
                    data.push(((pubKeyHash[i + 3] & 0x03) << 3) | (pubKeyHash[i + 4] >> 5));
                    if (i + 4 < pubKeyHash.length) {
                        data.push(pubKeyHash[i + 4] & 0x1f);
                    }
                }
            }
            i += 4;
        } else {
            // Handle last byte
            data.push(pubKeyHash[i] >> 3);
            data.push((pubKeyHash[i] & 0x07) << 2);
        }
    }
    
    // Remove trailing zeros
    while (data[data.length - 1] === 0 && data.length > 1) {
        data.pop();
    }
    
    return bech32Encode('alpha', data);
}

console.log('=== test4.dat Address Verification ===\n');
console.log('Extracted private key from test4.dat:');
console.log(masterPrivateKeyHex);

// Generate the first address directly from master key
const masterAddress = privateKeyToAddress(masterPrivateKeyHex);
console.log('\nAddress from master key:');
console.log(masterAddress);

// Generate first few child addresses
console.log('\nDerived addresses (BIP32-style):');
for (let i = 0; i < 3; i++) {
    const childKey = deriveChildKey(masterPrivateKeyHex, i);
    const childAddress = privateKeyToAddress(childKey.toString('hex'));
    console.log(`Address ${i}: ${childAddress}`);
}

console.log('\n=== Expected from Alpha node ===');
console.log('alpha1qq2lyp57n0j379uhjsgzaxhj02s6htd5tpptpxu');

console.log('\n=== Analysis ===');
console.log('test4.dat contains a private key in the wallet descriptor.');
console.log('However, the descriptor uses xpub (extended public key) for address derivation.');
console.log('The private key found (34eca3cf...) is likely the master key for the HD wallet.');
console.log('To properly generate addresses, we need to implement full BIP32/BIP44 derivation.');