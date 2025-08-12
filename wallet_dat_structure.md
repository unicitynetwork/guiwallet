# Bitcoin Core wallet.dat Structure

## Overview
Bitcoin Core (and Alpha) wallet.dat files are Berkeley DB (BDB) databases, not SQLite databases. The current implementation incorrectly assumes SQLite format.

## Key Types Stored in wallet.dat

### 1. Master Keys (HD Wallets)
- **Key**: `hdmaster` 
- **Value**: Extended private key (xprv) with chain code
- **Format**: BIP32 serialized format

### 2. HD Chain Data
- **Key**: `hdchain`
- **Value**: Current derivation index and chain information

### 3. Individual Private Keys
- **Key**: `key` + public key
- **Value**: Private key (32 bytes)
- **Note**: Can be either:
  - Legacy non-HD keys
  - Derived HD keys with their derivation path

### 4. Key Metadata
- **Key**: `keymeta` + public key
- **Value**: Creation time, HD key path, key origin info

### 5. Default Key
- **Key**: `defaultkey`
- **Value**: Public key of the default address

### 6. Address Book Entries
- **Key**: `name` + address
- **Value**: Label for the address

### 7. HD Seed (BIP32)
- **Key**: `hdseed`
- **Value**: The HD seed used to generate the master key

## Derivation Paths
- **External addresses**: m/0'/0'/k' (receiving addresses)
- **Internal addresses**: m/0'/1'/k' (change addresses)
- **Hardened derivation**: Uses ' (or h) notation, adds 2^31 to index

## Important Considerations

1. **Multiple Keys**: wallet.dat contains many keys:
   - The HD master key (if HD wallet)
   - All derived keys that have been used
   - Any imported keys
   - Pre-generated key pool

2. **Key Pool**: Bitcoin Core pre-generates keys for privacy
   - Default pool size: 1000 keys
   - Both receiving and change addresses

3. **Encryption**: If wallet is encrypted:
   - Master key is encrypted with AES-256-CBC
   - Individual keys may also be encrypted
   - Need passphrase to decrypt

4. **Descriptors**: Newer versions use output descriptors
   - More flexible than traditional HD paths
   - Can specify complex scripts

## Proper Import Process

1. Parse as Berkeley DB (not SQLite)
2. Find and extract `hdmaster` or `hdseed`
3. Extract derivation paths from `keymeta`
4. Handle both hardened and non-hardened derivation
5. Verify addresses match expected derivation