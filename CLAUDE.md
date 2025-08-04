# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the Unicity Offline Wallet - a secure, client-side cryptocurrency wallet that runs entirely in the browser. The wallet is designed for offline use and consists of a single self-contained HTML file (`index.html`) with embedded JavaScript and CSS.

## Project Structure

- `index.html` - Single self-contained HTML file containing the entire wallet application with embedded:
  - CryptoJS library for cryptographic operations
  - Elliptic curve cryptography implementation
  - BIP32/BIP44 HD wallet functionality
  - Bech32 address encoding for SegWit support
  - QR code generation
  - Complete UI and wallet logic
- `alpha-migrate.sh` - Shell script for migrating funds from offline wallet to Alpha node
- `ref_materials/` - Reference materials directory

## Key Architecture Components

### Cryptographic Implementation
The wallet uses several embedded cryptographic libraries:
- **CryptoJS**: Provides AES encryption, PBKDF2 key derivation, and SHA-512 hashing
- **Elliptic**: Implements secp256k1 elliptic curve operations for Bitcoin/Alpha compatibility
- **Custom BIP32/BIP44**: HD wallet derivation following Bitcoin standards
- **Bech32**: SegWit address encoding for `alpha1` prefixed addresses

### Security Model
- All operations occur client-side with no server communication
- Private keys are generated using Web Crypto API for secure randomness
- Wallet encryption uses AES with PBKDF2 (100,000 iterations)
- Auto-hide feature for private keys after 30 seconds
- IndexedDB for persistent storage across browser sessions

### Address Generation
The wallet implements a hierarchical deterministic (HD) wallet:
1. Master key generation using secure random entropy
2. BIP44 derivation path: `m/44'/0'/{addressIndex}'` for child key derivation
3. Child key derivation using HMAC-SHA512
4. SegWit (Bech32) address format with `alpha1` prefix

## Key Functions and Flow

### Wallet Initialization (`initializeWallet`)
- Generates 32 bytes of cryptographically secure random data
- Creates secp256k1 key pair from random entropy
- Automatically generates first address after wallet creation

### Address Generation (`generateNewAddress`)
- Derives child private key using HMAC-SHA512(masterKey, derivationPath)
- Generates public key using elliptic curve multiplication
- Creates P2WPKH (Pay-to-Witness-Public-Key-Hash) address
- Encodes as Bech32 with `alpha1` prefix

### Bech32 Implementation
- `createBech32`: Main function for creating Bech32 addresses
- `bech32Checksum`: Generates 6-character checksum
- `bech32Polymod`: Implements BCH polynomial for error detection
- `hrpExpand`: Expands human-readable part for checksum calculation

### Storage
- Uses IndexedDB for cross-tab persistence
- Falls back to localStorage if IndexedDB unavailable
- Stores encrypted wallet data when password protected

## Development Commands

Since this is a single HTML file with no build process:

```bash
# Open the wallet in browser
open index.html

# Or serve locally for testing
python3 -m http.server 8000
# Then navigate to http://localhost:8000/index.html

# Make the migration script executable
chmod +x alpha-migrate.sh
```

## Migration Process

The wallet shows the derived child private key (not master key) which can be imported to Alpha nodes:

```bash
./alpha-migrate.sh <private_key_wif> <wallet_name>
```

The migration script:
1. Creates or uses existing Alpha wallet
2. Imports the private key using descriptors for SegWit compatibility
3. Verifies the import and checks for available funds

## Important Technical Notes

1. **No External Dependencies**: The entire application is self-contained in `index.html`
2. **Offline-First Design**: Can be saved and run completely offline
3. **Browser Compatibility**: Uses modern Web APIs (Crypto, IndexedDB)
4. **Key Export**: The wallet exports the child private key, not the master key
5. **Address Format**: Uses SegWit Bech32 encoding with custom `alpha1` prefix
6. **Single Address**: Currently displays only one address at a time (index 0)

## Testing Considerations

- Test address generation matches expected SegWit format
- Verify encryption/decryption with various password strengths
- Ensure QR codes scan correctly
- Test wallet backup/restore functionality
- Verify migration script imports keys correctly to Alpha node