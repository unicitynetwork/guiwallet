const crypto = require('crypto');
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');

// Base58 decode function
function base58Decode(str) {
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let decoded = BigInt(0);
    let multi = BigInt(1);
    
    for (let i = str.length - 1; i >= 0; i--) {
        decoded += multi * BigInt(ALPHABET.indexOf(str[i]));
        multi *= BigInt(58);
    }
    
    // Convert to bytes
    let hex = decoded.toString(16);
    if (hex.length % 2) hex = '0' + hex;
    
    // Count leading 1s
    let leadingOnes = 0;
    for (let i = 0; i < str.length && str[i] === '1'; i++) {
        leadingOnes++;
    }
    
    return Buffer.concat([Buffer.alloc(leadingOnes), Buffer.from(hex, 'hex')]);
}

// Bech32 encoding functions
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

// Decode extended key
function decodeExtendedKey(xkey) {
    const decoded = base58Decode(xkey);
    
    // Remove checksum (last 4 bytes)
    const data = decoded.slice(0, -4);
    
    // Parse components
    const version = data.slice(0, 4);
    const depth = data[4];
    const fingerprint = data.slice(5, 9);
    const childNumber = data.readUInt32BE(9);
    const chainCode = data.slice(13, 45);
    const keyData = data.slice(45, 78);
    
    return {
        version: version.toString('hex'),
        depth,
        fingerprint: fingerprint.toString('hex'),
        childNumber,
        chainCode: chainCode.toString('hex'),
        keyData: keyData.toString('hex'),
        isPrivate: keyData[0] === 0x00
    };
}

// BIP32 derivation from public key
function derivePublicChild(parentPubKey, parentChainCode, index) {
    // For non-hardened derivation from public key
    const data = Buffer.concat([
        Buffer.from(parentPubKey, 'hex'),
        Buffer.from(index.toString(16).padStart(8, '0'), 'hex')
    ]);
    
    const hmac = crypto.createHmac('sha512', Buffer.from(parentChainCode, 'hex'));
    hmac.update(data);
    const result = hmac.digest('hex');
    
    const childKeyOffset = result.substring(0, 64);
    const childChainCode = result.substring(64);
    
    // Add parent public key to child key offset
    const parentPoint = ec.keyFromPublic(parentPubKey, 'hex').getPublic();
    const offsetPoint = ec.g.mul(Buffer.from(childKeyOffset, 'hex'));
    const childPoint = parentPoint.add(offsetPoint);
    
    return {
        pubKey: childPoint.encode('hex', true),
        chainCode: childChainCode
    };
}

// Test the xpub
const xpub = 'xpub661MyMwAqRbcGvo3ScFFZaTDc4LqgMm2yt2HHPp5UTwGM69DK5FNbukRSuC7dv6h5EU4EpwT32rxpHtdtn9fVyB9HCLnL9VmFMzyMfYCWGV';
const expectedAddress = 'alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz';

console.log('=== Testing xpub derivation ===\n');
console.log(`xpub: ${xpub}`);
console.log(`Target: ${expectedAddress}\n`);

// Decode the xpub
const decoded = decodeExtendedKey(xpub);
console.log('Decoded xpub:');
console.log(`  Version: ${decoded.version}`);
console.log(`  Depth: ${decoded.depth}`);
console.log(`  Parent fingerprint: ${decoded.fingerprint}`);
console.log(`  Child number: ${decoded.childNumber}`);
console.log(`  Chain code: ${decoded.chainCode}`);
console.log(`  Public key: ${decoded.keyData}\n`);

// The descriptor shows: wpkh(xpub.../84h/1h/0h/1/*)
// This means we need to derive index 1, then index 0 (for the first address)

// Derive m/1
const child1 = derivePublicChild(decoded.keyData, decoded.chainCode, 1);
console.log('Derived m/1:');
console.log(`  Public key: ${child1.pubKey}`);
console.log(`  Chain code: ${child1.chainCode}\n`);

// Derive m/1/0 (first address)
const child2 = derivePublicChild(child1.pubKey, child1.chainCode, 0);
console.log('Derived m/1/0:');
console.log(`  Public key: ${child2.pubKey}\n`);

// Generate address
const pubkeyHash = hash160(child2.pubKey);
const address = segwit_addr_encode('alpha', 0, Array.from(pubkeyHash));

console.log(`Generated address: ${address}`);
console.log(`Match: ${address === expectedAddress ? 'YES! ✓' : 'NO'}\n`);

// Try other indices
console.log('Trying other indices:');
for (let i = 0; i < 5; i++) {
    const child = derivePublicChild(child1.pubKey, child1.chainCode, i);
    const hash = hash160(child.pubKey);
    const addr = segwit_addr_encode('alpha', 0, Array.from(hash));
    console.log(`  m/1/${i}: ${addr} ${addr === expectedAddress ? '✓' : ''}`);
}