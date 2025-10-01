# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The Unicity WEB GUI Wallet is a self-contained, browser-based cryptocurrency wallet for the Unicity network. The entire application runs in a single HTML file (`index.html`, 12281 lines, 854KB) with embedded JavaScript and CSS, requiring no build process or external dependencies. It supports the Alpha cryptocurrency on the consensus layer (PoW blockchain) with architecture designed for future offchain layer integration.

## Key Architecture

### Single-File Design
- **index.html**: Complete wallet application (735KB) containing:
  - Embedded CryptoJS library for AES, PBKDF2, SHA-512
  - Embedded elliptic.js for secp256k1 curve operations  
  - BIP32/BIP44 HD wallet implementation
  - Bech32 encoding for SegWit addresses
  - QR code generation library
  - Fulcrum WebSocket integration
  - Complete UI with tabbed interface

### Cryptographic Stack
- **Key Generation**: Web Crypto API → 32 bytes entropy → secp256k1 keypair
- **HD Derivation**: BIP44 path `m/44'/0'/{index}'` using HMAC-SHA512
- **Address Format**: P2WPKH (SegWit) with `alpha1` Bech32 prefix
- **Wallet Encryption**: AES-256 with PBKDF2 (100,000 iterations)

### Operating Modes
1. **Full Wallet**: Private key control for sending/receiving
2. **Watch-Only**: Monitor addresses without private keys
3. **Online**: Connected to Fulcrum for real-time blockchain data
4. **Offline**: Create/sign transactions without network

## Core Functions

### Wallet Management
- `initializeWallet()`: Generate master key from secure entropy (line ~1980)
- `generateNewAddress()`: Derive child keys via BIP32
- `restoreFromWalletDat(file)`: Import Alpha wallet.dat (SQLite) (line ~3083)
  - Auto-detects: descriptor wallets, legacy HD, legacy non-HD, encrypted wallets
  - Extracts DER-encoded private keys from SQLite binary format
  - Searches for patterns: `walletdescriptorkey`, `hdchain`, `mkey` (encryption), `ckey` (encrypted keys)
  - Triggers address scanning for BIP32 wallets (up to 100 addresses)
- Multi-wallet support: Switch between multiple wallets stored in localStorage/IndexedDB

### Transaction Handling
- `createTransaction()`: Build with UTXO selection
- `signTransaction()`: Offline signing capability
- `broadcastTransaction()`: Submit via Fulcrum
- `updateTransactionHistory()`: Paginated display (20/page)
- `updateUtxoListDisplay()`: Paginated UTXOs (20/page)

### Fulcrum Integration
- `connectToElectrumServer()`: WebSocket connection
- `subscribeToAddressChanges()`: Real-time updates
- `refreshBalance()`: Fetch UTXOs and balance

## Development Commands

```bash
# Run the main wallet application
open index.html
# Or serve locally
python3 -m http.server 8000
# Navigate to http://localhost:8000/index.html

# Migrate wallet to Alpha Core node
./alpha-migrate.sh <private_key_wif> <wallet_name>

# Run debug service (for collecting debug reports from wallets)
cd debug-service
npm install
npm start        # Production mode on port 3487
npm run dev      # Development mode with auto-restart

# Test scripts for wallet.dat analysis (require Node.js)
node analyze_encrypted_wallet.js    # Analyze encrypted wallet structure
node test_wallet_decryption.js      # Test wallet decryption logic
node decrypt_wallet_standard.js     # Decrypt and extract keys
node compare_dat_files.js          # Compare multiple wallet files
# See individual .js files for more analysis/testing utilities

# Create release
./create_release.sh    # Creates GitHub release with index.html
```

## Migration Script

The `alpha-migrate.sh` script imports wallet private keys to Alpha Core:
1. Creates/uses specified wallet
2. Imports key using `wpkh()` descriptor format
3. Verifies import and checks balance
4. Provides rescan instructions if needed

## Critical Implementation Details

1. **No Build Process**: Direct HTML file execution, no npm/webpack required
2. **Child Key Export**: Exports derived keys (not master key) for security
3. **Address Scanning**: Auto-scans up to 100 addresses for BIP32 wallets after import
4. **Wallet.dat Formats**: Supports descriptor (modern), legacy HD, legacy non-HD, and encrypted formats
5. **Encrypted Wallet Support**: Can decrypt and import encrypted wallet.dat files with `mkey` records
6. **Storage**: IndexedDB primary, localStorage fallback for cross-tab persistence
7. **Multi-Wallet**: Supports multiple wallets with wallet switching functionality
8. **Auto-Hide**: Private keys hidden after 30 seconds for security
9. **Pagination**: 20 items per page for transactions/UTXOs
10. **Binary Parsing**: Direct SQLite binary parsing without SQL-js dependency

## Testing Focus Areas

- SegWit address generation (`alpha1` prefix)
- Wallet.dat import (descriptor, legacy, encrypted formats)
- BIP32 address scanning functionality (100 address limit)
- Encryption/decryption with various passwords
- Online/offline mode transitions
- QR code generation/scanning
- Migration script functionality
- Watch-only mode operations
- Pagination for large datasets
- Multi-wallet switching
- Binary SQLite parsing accuracy

## Debug Service

The `debug-service/` directory contains a standalone Node.js microservice for collecting and analyzing debug reports:
- **Purpose**: Collects debug reports from wallet instances for troubleshooting
- **API Endpoints**: Submit reports, list reports, extract/export transactions
- **Web Interface**: Browse reports at http://localhost:3487
- **Storage**: File-based storage organized by date in `reports/` directory
- **Security**: Rate limiting (100 req/15min), CORS protection, 10MB size limit

## Analysis Scripts

The repository includes Node.js utilities for wallet.dat analysis and testing:
- **analyze_*.js**: Examine wallet structure, encryption, and key formats
- **decrypt_*.js**: Test decryption logic with various wallet types
- **test_*.js**: Validate address derivation, BIP32 functionality
- **compare_dat_files.js**: Compare multiple wallet.dat files
- **find_*.js**: Search for specific keys or derivation paths

These scripts require `node_modules/` dependencies (elliptic, crypto) and are used for debugging wallet import issues.

## Future Offchain Layer Integration Points

When implementing offchain support:
1. Add layer selection UI
2. Implement state channel management
3. Add cross-layer transfer mechanisms
4. Update balance displays for both layers
5. Implement offchain transaction formats