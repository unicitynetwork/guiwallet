# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The Unicity WEB GUI Wallet is a self-contained, browser-based cryptocurrency wallet for the Unicity network. The entire application runs in a single HTML file (`index.html`, 9907 lines) with embedded JavaScript and CSS, requiring no build process or external dependencies. It supports the Alpha cryptocurrency on the consensus layer (PoW blockchain) with architecture designed for future offchain layer integration.

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
- `initializeWallet()`: Generate master key from secure entropy
- `generateNewAddress()`: Derive child keys via BIP32
- `restoreFromWalletDat(file)`: Import Alpha wallet.dat (SQLite)
  - Auto-detects: descriptor wallets, legacy HD, legacy non-HD
  - Extracts DER-encoded private keys
  - Triggers address scanning for BIP32 wallets

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
# Run the wallet
open index.html

# Or serve locally
python3 -m http.server 8000
# Navigate to http://localhost:8000/index.html

# Migrate to Alpha Core node
./alpha-migrate.sh <private_key_wif> <wallet_name>
```

## Migration Script

The `alpha-migrate.sh` script imports wallet private keys to Alpha Core:
1. Creates/uses specified wallet
2. Imports key using `wpkh()` descriptor format
3. Verifies import and checks balance
4. Provides rescan instructions if needed

## Critical Implementation Details

1. **No Build Process**: Direct HTML file execution, no npm/webpack
2. **Child Key Export**: Exports derived keys, not master key
3. **Address Scanning**: Auto-scans up to 100 addresses for BIP32 wallets
4. **Wallet.dat Formats**: Supports descriptor (modern) and legacy formats
5. **Storage**: IndexedDB primary, localStorage fallback
6. **Auto-Hide**: Private keys hidden after 30 seconds
7. **Pagination**: 20 items per page for transactions/UTXOs

## Testing Focus Areas

- SegWit address generation (`alpha1` prefix)
- Wallet.dat import (descriptor vs legacy)
- BIP32 address scanning functionality
- Encryption/decryption with various passwords
- Online/offline mode transitions
- QR code generation/scanning
- Migration script functionality
- Watch-only mode operations
- Pagination for large datasets

## Future Offchain Layer Integration Points

When implementing offchain support:
1. Add layer selection UI
2. Implement state channel management
3. Add cross-layer transfer mechanisms
4. Update balance displays for both layers
5. Implement offchain transaction formats