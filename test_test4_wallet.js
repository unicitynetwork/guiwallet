const fs = require('fs');
const crypto = require('crypto');
const { Database } = require('sqlite3').verbose();
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');

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

function publicKeyToSegwitAddress(publicKey) {
    const pubKeyBuffer = Buffer.from(publicKey, 'hex');
    const pubKeyHash = hash160(pubKeyBuffer);
    
    // Convert to 5-bit groups for bech32
    const data = [0]; // witness version 0
    for (let i = 0; i < pubKeyHash.length; i++) {
        data.push(pubKeyHash[i] >> 5);
        if (i < pubKeyHash.length - 1) {
            data.push(((pubKeyHash[i] & 0x1f) << 3) | (pubKeyHash[i + 1] >> 5));
        } else {
            data.push((pubKeyHash[i] & 0x1f) << 3);
        }
    }
    
    // Remove any trailing zeros
    while (data[data.length - 1] === 0 && data.length > 1) {
        data.pop();
    }
    
    return bech32Encode('alpha', data);
}

// Read and parse test4.dat
const db = new Database('ref_materials/test4.dat', { readonly: true });

console.log('=== Analyzing test4.dat ===\n');

// Since test4 is a descriptor wallet with only xpub (no private keys),
// we need to derive addresses from the xpub

// Get descriptors
db.all("SELECT hex(key) as key_hex, hex(value) as value_hex FROM main WHERE hex(key) LIKE '1077616c6c657464657363726970746f72%'", (err, rows) => {
    if (err) {
        console.error('Error reading database:', err);
        return;
    }
    
    console.log(`Found ${rows.length} descriptor records\n`);
    
    // Parse descriptors to find wpkh ones
    const wpkhDescriptors = [];
    
    rows.forEach(row => {
        try {
            // Skip first byte (length indicator)
            const valueHex = row.value_hex;
            const valueBytes = Buffer.from(valueHex, 'hex');
            
            // Try to decode as string (skip first byte which is length)
            const descriptorStr = valueBytes.slice(1).toString('utf8');
            
            if (descriptorStr.includes('wpkh(')) {
                console.log('Found wpkh descriptor:', descriptorStr.substring(0, 100) + '...');
                
                // Extract xpub from descriptor
                const xpubMatch = descriptorStr.match(/xpub[A-Za-z0-9]{107,}/);
                if (xpubMatch) {
                    console.log('xpub:', xpubMatch[0].substring(0, 50) + '...');
                    wpkhDescriptors.push({
                        descriptor: descriptorStr,
                        xpub: xpubMatch[0]
                    });
                }
            }
        } catch (e) {
            // Skip if can't parse
        }
    });
    
    console.log(`\nFound ${wpkhDescriptors.length} wpkh descriptors`);
    
    // Since we can't derive from xpub without HD wallet functionality,
    // let's check what addresses Alpha generated
    console.log('\n=== Alpha node generated address ===');
    console.log('alpha1qq2lyp57n0j379uhjsgzaxhj02s6htd5tpptpxu');
    
    console.log('\n=== Note ===');
    console.log('test4.dat is a watch-only wallet with only extended public keys (xpub).');
    console.log('It cannot be used to sign transactions, only to generate addresses and watch balances.');
    console.log('To fully test address generation, we would need to implement BIP32 HD wallet derivation from xpub.');
    
    db.close();
});