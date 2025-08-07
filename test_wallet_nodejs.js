#!/usr/bin/env node

const fs = require('fs');
const crypto = require('crypto');

// Target values we're looking for
const EXPECTED_ADDRESS = 'alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz';
const EXPECTED_PUBKEY_HASH = 'd571e66f22601b58fea87dd07ff95c5af0f86298';

console.log(`Looking for address: ${EXPECTED_ADDRESS}`);
console.log(`Expected pubkey hash: ${EXPECTED_PUBKEY_HASH}\n`);

// Read wallet.dat file
const walletData = fs.readFileSync('ref_materials/test_wallet.dat');
console.log(`Loaded wallet.dat: ${walletData.length} bytes`);

// Extract all private keys from wallet.dat
function extractPrivateKeys(data) {
    const privateKeys = [];
    const derPattern = Buffer.from([0x04, 0x20]); // DER encoding pattern
    
    for (let i = 0; i < data.length - 34; i++) {
        // Check for DER pattern
        if (data[i] === 0x04 && data[i + 1] === 0x20) {
            const privKey = data.slice(i + 2, i + 34);
            const privKeyHex = privKey.toString('hex');
            
            // Validate it's not all zeros and is unique
            if (privKeyHex !== '0'.repeat(64) && !privateKeys.includes(privKeyHex)) {
                privateKeys.push(privKeyHex);
            }
        }
    }
    
    return privateKeys;
}

const privateKeys = extractPrivateKeys(walletData);
console.log(`Found ${privateKeys.length} unique private keys:`);
privateKeys.forEach((key, i) => console.log(`  ${i}: ${key}`));
console.log();

// Elliptic curve operations using Node.js crypto
function generatePublicKey(privateKeyHex) {
    try {
        // Create ECDSA key pair from private key
        const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');
        
        // Use Node.js crypto to create key pair
        const keyObject = crypto.createPrivateKey({
            key: privateKeyBuffer,
            format: 'der',
            type: 'sec1'
        });
        
        // This won't work directly with raw private key bytes
        // Let's use a different approach with secp256k1 math
        
        return null; // We'll implement manual EC operations
    } catch (error) {
        return null;
    }
}

// Manual secp256k1 implementation for testing
// Since Node.js doesn't have built-in secp256k1, let's use a simple approach
// We'll verify our approach matches what the browser elliptic library does

console.log('=== Testing Known Keys ===\n');

// Test the keys we know about
const knownKeys = [
    { name: 'Master Key', key: '44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3' },
    { name: 'Second Key', key: '11395f88d9dd258680a74ad1be8c7a350332859769eb99b5bbba592ea53e3200' },
    { name: 'Derived Key', key: 'f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726' }
];

// Bech32 implementation
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Polymod(values) {
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

function bech32HrpExpand(hrp) {
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

function bech32CreateChecksum(hrp, data) {
    const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
    const mod = bech32Polymod(values) ^ 1;
    const ret = [];
    for (let p = 0; p < 6; ++p) {
        ret.push((mod >> 5 * (5 - p)) & 31);
    }
    return ret;
}

function bech32Encode(hrp, data) {
    const combined = data.concat(bech32CreateChecksum(hrp, data));
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

function segwitAddrEncode(hrp, witver, witprog) {
    const ret = bech32Encode(hrp, [witver].concat(convertbits(witprog, 8, 5)));
    return ret;
}

function bech32Decode(bech32) {
    let p;
    let has_lower = false;
    let has_upper = false;
    for (p = 0; p < bech32.length; ++p) {
        if (bech32.charCodeAt(p) < 33 || bech32.charCodeAt(p) > 126) {
            return null;
        }
        if (bech32.charCodeAt(p) >= 97 && bech32.charCodeAt(p) <= 122) {
            has_lower = true;
        }
        if (bech32.charCodeAt(p) >= 65 && bech32.charCodeAt(p) <= 90) {
            has_upper = true;
        }
    }
    if (has_lower && has_upper) {
        return null;
    }
    bech32 = bech32.toLowerCase();
    const pos = bech32.lastIndexOf('1');
    if (pos < 1 || pos + 7 > bech32.length || bech32.length > 90) {
        return null;
    }
    const hrp = bech32.substring(0, pos);
    const data = [];
    for (p = pos + 1; p < bech32.length; ++p) {
        const d = CHARSET.indexOf(bech32.charAt(p));
        if (d === -1) {
            return null;
        }
        data.push(d);
    }
    return {hrp: hrp, data: data.slice(0, data.length - 6)};
}

// Test address generation with hardcoded expected values
// We know the expected public key from our Python tests
function testAddressGeneration() {
    console.log('=== Testing Address Generation Logic ===\n');
    
    // Expected public key from Python script
    const expectedPubKey = '02006abf41ba147951f55579a2f7d3683f7334e9466df8ffa38a486813651ffb77';
    console.log(`Testing public key from Python: ${expectedPubKey}`);
    
    // Let me also decode the expected address to verify the hash
    console.log(`\nFirst, let's decode the expected address to verify the hash:`);
    const decoded = bech32Decode(EXPECTED_ADDRESS);
    if (decoded) {
        const witprog = convertbits(decoded.data.slice(1), 5, 8, false);
        const hashFromAddress = Buffer.from(witprog).toString('hex');
        console.log(`Hash from address: ${hashFromAddress}`);
        console.log(`Expected hash:     ${EXPECTED_PUBKEY_HASH}`);
        console.log(`Match: ${hashFromAddress === EXPECTED_PUBKEY_HASH ? 'YES!' : 'NO'}`);
    }
    
    // Test if this public key generates our expected address
    const pubKeyBuffer = Buffer.from(expectedPubKey, 'hex');
    
    // Generate hash
    const sha256 = crypto.createHash('sha256').update(pubKeyBuffer).digest();
    const ripemd160 = crypto.createHash('ripemd160').update(sha256).digest();
    const pubkeyHash = ripemd160.toString('hex');
    
    console.log(`\nHash from Python's public key:`);
    console.log(`Generated hash: ${pubkeyHash}`);
    console.log(`Expected hash:  ${EXPECTED_PUBKEY_HASH}`);
    console.log(`Hash match: ${pubkeyHash === EXPECTED_PUBKEY_HASH ? 'YES!' : 'NO'}`);
    
    if (pubkeyHash === EXPECTED_PUBKEY_HASH) {
        // Generate address
        const address = segwitAddrEncode('alpha', 0, Array.from(ripemd160));
        console.log(`Generated address: ${address}`);
        console.log(`Expected address:  ${EXPECTED_ADDRESS}`);
        console.log(`Address match: ${address === EXPECTED_ADDRESS ? 'YES!' : 'NO'}`);
    }
    
    console.log();
}

testAddressGeneration();

// Since we can't easily do EC operations in pure Node.js without additional libraries,
// let's focus on validating our approach and identifying which private key should work

console.log('=== Analysis ===\n');

console.log('The issue is clear:');
console.log('1. We have two private keys in wallet.dat:');
privateKeys.forEach((key, i) => console.log(`   ${i}: ${key}`));
console.log();

console.log('2. Our BIP32 derivation approach is wrong - wallet.dat likely stores the actual key directly');
console.log('3. We need to test each key with the elliptic library in the browser to see which generates:');
console.log(`   Public key: 02006abf41ba147951f55579a2f7d3683f7334e9466df8ffa38a486813651ffb77`);
console.log(`   Address: ${EXPECTED_ADDRESS}`);
console.log();

console.log('4. The Python script may have an error in its elliptic curve implementation');
console.log('5. We should trust the JavaScript elliptic library since it works correctly for native wallets');
console.log();

console.log('Next steps:');
console.log('- Test both wallet.dat keys directly in browser with elliptic library');
console.log('- Use whichever key generates the correct address');
console.log('- Update wallet.dat import to use the raw key, not BIP32 derivation');