const crypto = require('crypto');
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');

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

function addPrivateKeys(key1Hex, key2Hex) {
    const n = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
    const key1 = BigInt('0x' + key1Hex);
    const key2 = BigInt('0x' + key2Hex);
    let sum = (key1 + key2) % n;
    if (sum < 0n) sum += n;
    return sum.toString(16).padStart(64, '0');
}

console.log('=== Final Derivation ===\n');

// The wallet.dat key that is already at m/84'/1'/0'
const walletKey = '44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3';
// The xpub chain code
const xpubChainCode = 'ef9b229fa43b5321834bce029dcca011db64764538f06e5b50b9dd5f38d16678';
const targetAddress = 'alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz';

console.log(`Wallet key (at m/84'/1'/0'): ${walletKey}`);
console.log(`Chain code: ${xpubChainCode}`);
console.log(`Target address: ${targetAddress}\n`);

// The descriptor shows wpkh(xpub.../84h/1h/0h/1/*)
// Since the wallet key is already at m/84'/1'/0', we need to derive:
// - m/84'/1'/0'/1 (index 1, non-hardened)
// - m/84'/1'/0'/1/0 (index 0, non-hardened) for the first address

// Step 1: Derive m/84'/1'/0'/1
console.log("Step 1: Derive m/84'/1'/0'/1");
const kp = ec.keyFromPrivate(walletKey, 'hex');
const pubKey = kp.getPublic(true, 'hex');

const data1 = Buffer.concat([
    Buffer.from(pubKey, 'hex'),
    Buffer.from('00000001', 'hex')  // index 1
]);

const hmac1 = crypto.createHmac('sha512', Buffer.from(xpubChainCode, 'hex'));
hmac1.update(data1);
const result1 = hmac1.digest('hex');

const childKey1 = result1.substring(0, 64);
const childChainCode1 = result1.substring(64);
const derivedKey1 = addPrivateKeys(walletKey, childKey1);

console.log(`  Private key: ${derivedKey1}`);
console.log(`  Chain code: ${childChainCode1}\n`);

// Step 2: Derive m/84'/1'/0'/1/0
console.log("Step 2: Derive m/84'/1'/0'/1/0");
const kp1 = ec.keyFromPrivate(derivedKey1, 'hex');
const pubKey1 = kp1.getPublic(true, 'hex');

const data2 = Buffer.concat([
    Buffer.from(pubKey1, 'hex'),
    Buffer.from('00000000', 'hex')  // index 0
]);

const hmac2 = crypto.createHmac('sha512', Buffer.from(childChainCode1, 'hex'));
hmac2.update(data2);
const result2 = hmac2.digest('hex');

const childKey2 = result2.substring(0, 64);
const finalPrivateKey = addPrivateKeys(derivedKey1, childKey2);

console.log(`  Private key: ${finalPrivateKey}\n`);

// Generate the address
const finalKp = ec.keyFromPrivate(finalPrivateKey, 'hex');
const finalPubKey = finalKp.getPublic(true, 'hex');

console.log('Final key details:');
console.log(`  Private key: ${finalPrivateKey}`);
console.log(`  Public key: ${finalPubKey}`);

const pubkeyHash = hash160(finalPubKey);
const address = segwit_addr_encode('alpha', 0, Array.from(pubkeyHash));

console.log(`  Pubkey hash: ${pubkeyHash.toString('hex')}`);
console.log(`  Generated address: ${address}`);
console.log(`  Match: ${address === targetAddress ? 'YES! ✓' : 'NO'}\n`);

if (address === targetAddress) {
    console.log('*** SUCCESS! ***');
    console.log(`The private key for ${targetAddress} is:`);
    console.log(finalPrivateKey);
    console.log('\nDerivation path from wallet.dat key: m/1/0');
    console.log('Full path from seed: m/84\'/1\'/0\'/1/0');
}