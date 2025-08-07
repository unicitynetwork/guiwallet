# Wallet.dat Import Analysis - Findings Report

## Overview
I've successfully analyzed the `test_wallet.dat` file and created scripts to extract private keys from Alpha wallet.dat files. Here's what I discovered:

## Key Findings

### 1. Wallet.dat Structure
- **Format**: SQLite 3 database (not Berkeley DB as in older Bitcoin versions)
- **Main table**: Single table called `main` with key-value pairs
- **Storage**: Keys and values stored as BLOB data

### 2. Key Storage Format
The wallet stores several types of keys:
- **walletdescriptorkey**: Contains the actual private keys (DER-encoded)
- **activeexternalspk**: References to active external script pubkeys
- **activeinternalspk**: References to active internal (change) script pubkeys
- **walletdescriptor**: Wallet descriptor information
- **walletdescriptorcache**: Cached descriptor data

### 3. Private Key Extraction
From the test wallet, I extracted:
- **Master Private Key**: `44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3`
- **Public Key**: `03e148ddf405483ba64f63b5a6ddbc9977ba8ed3ad2afbbb7222f9f3b65a17250f`
- This single private key is used across all 8 wallet descriptors in the file

### 4. Key Encoding
Private keys in wallet.dat are stored in ASN.1 DER format:
- Look for pattern `0x04 0x20` followed by 32 bytes (the private key)
- Keys are embedded in larger DER structures that include curve parameters

## Scripts Created

### 1. `parse_wallet_dat.py`
Basic parser that:
- Opens SQLite wallet.dat file
- Extracts all key-value pairs
- Shows wallet structure

### 2. `parse_wallet_advanced.py`
Advanced parser that:
- Properly decodes DER-encoded private keys
- Extracts unique private keys
- Shows address mappings
- Provides the key in format ready for web wallet import

### 3. `test_wallet_import.js`
Node.js test script that:
- Verifies private key to public key conversion
- Tests BIP32 derivation paths
- Computes public key hashes

## How to Use

### Extract Private Key from wallet.dat:
```bash
python3 parse_wallet_advanced.py
```

This will output:
```
Master Private Key (hex): 44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3
```

### Import into Web Wallet:
1. Open `index.html` in browser
2. Click "Import Wallet"
3. Select "Import from Alpha wallet.dat"
4. Either:
   - Upload the wallet.dat file directly (experimental)
   - Or manually enter the extracted private key

## Important Notes

1. **Wallet Type**: The test wallet appears to be a descriptor wallet (newer format) rather than legacy format
2. **Single Key**: All addresses in this wallet are derived from a single master private key
3. **Derivation**: The web wallet needs to properly derive child keys using BIP32 to generate the same addresses
4. **Address Format**: Alpha uses bech32 addresses with prefix `alpha1`

## Security Considerations

- Only work with unencrypted wallet.dat files
- Always make backups before attempting imports
- The scripts handle private keys in memory - be careful on shared systems
- Clear terminal history after running scripts that display private keys

## Conclusion

The wallet.dat import principle is straightforward:
1. Parse SQLite database
2. Find DER-encoded private keys in `walletdescriptorkey` entries
3. Extract the 32-byte private key from DER structure
4. Use this key in the web wallet (with proper BIP32 derivation)

The existing web wallet import function in `index.html` already implements this logic and should work with Alpha wallet.dat files.