# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the Unicity WEB GUI Wallet - a comprehensive web-based wallet for managing funds on the Unicity network. The wallet supports the consensus layer (Proof of Work blockchain) and is designed to also support the upcoming offchain state transition layer. It runs entirely in the browser as a single self-contained HTML file (`index.html`) with embedded JavaScript and CSS.

## Purpose

The Unicity WEB GUI Wallet serves as the primary interface for:
- **Consensus Layer Management**: Interact with the Alpha cryptocurrency on the PoW blockchain
- **Offchain Layer Support** (Planned): Future integration with the high-speed offchain state transition layer
- **Cross-Layer Operations**: Seamless fund management across both layers (when offchain is implemented)

> Note: The offchain state transition layer is not yet implemented. Current functionality focuses on the consensus layer.

## Project Structure

- `index.html` - Single self-contained HTML file containing the entire wallet application with embedded:
  - CryptoJS library for cryptographic operations
  - Elliptic curve cryptography implementation
  - BIP32/BIP44 HD wallet functionality
  - Bech32 address encoding for SegWit support
  - QR code generation
  - Fulcrum server integration
  - Complete UI and wallet logic
- `alpha-migrate.sh` - Shell script for migrating funds from wallet to Alpha node
- `ref_materials/` - Reference materials directory
- `README.md` - User documentation
- `CLAUDE.md` - This file (AI assistant guidance)

## Key Architecture Components

### Multi-Layer Architecture Support
- **Consensus Layer**: Full support for PoW blockchain operations
- **Offchain Layer**: Placeholder for future state transition layer integration
- **WebSocket Integration**: Real-time updates via Fulcrum server connections

### Cryptographic Implementation
The wallet uses several embedded cryptographic libraries:
- **CryptoJS**: Provides AES encryption, PBKDF2 key derivation, and SHA-512 hashing
- **Elliptic**: Implements secp256k1 elliptic curve operations for Bitcoin/Alpha compatibility
- **Custom BIP32/BIP44**: HD wallet derivation following Bitcoin standards
- **Bech32**: SegWit address encoding for `alpha1` prefixed addresses

### Security Model
- All operations occur client-side with no server communication (except optional Fulcrum)
- Private keys are generated using Web Crypto API for secure randomness
- Wallet encryption uses AES with PBKDF2 (100,000 iterations)
- Auto-hide feature for private keys after 30 seconds
- IndexedDB for persistent storage across browser sessions

### Operating Modes
1. **Full Wallet Mode**: Complete control with private keys
2. **Watch-Only Mode**: Monitor addresses without private keys
3. **Online Mode**: Connected to Fulcrum for real-time data
4. **Offline Mode**: Create and sign transactions without internet

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

### Transaction Management
- `createTransaction`: Build transactions with UTXO selection
- `signTransaction`: Offline signing capability
- `broadcastTransaction`: Submit to network via Fulcrum
- `updateTransactionHistory`: Paginated transaction display (20 per page)
- `updateUtxoListDisplay`: Paginated UTXO display (20 per page)

### Fulcrum Integration
- `connectToElectrumServer`: WebSocket connection management
- `electrumRequest`: JSON-RPC communication
- `subscribeToAddressChanges`: Real-time balance updates
- `refreshBalance`: Fetch current UTXOs and balance

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

## Important Technical Notes

1. **No External Dependencies**: The entire application is self-contained in `index.html`
2. **Multi-Mode Design**: Supports online/offline and full/watch-only operations
3. **Browser Compatibility**: Uses modern Web APIs (Crypto, IndexedDB, WebSocket)
4. **Key Export**: The wallet exports the child private key, not the master key
5. **Address Format**: Uses SegWit Bech32 encoding with custom `alpha1` prefix
6. **Pagination**: Both transactions and UTXOs display 20 items per page
7. **Future-Ready**: Architecture designed to support offchain layer when implemented

## Testing Considerations

- Test address generation matches expected SegWit format
- Verify encryption/decryption with various password strengths
- Ensure QR codes scan correctly
- Test wallet backup/restore functionality
- Verify migration script imports keys correctly to Alpha node
- Test online/offline mode transitions
- Verify pagination works correctly for large transaction/UTXO lists
- Test watch-only mode functionality

## Future Integration Points

When implementing offchain state transition layer support:
1. Add layer selection UI (consensus vs offchain)
2. Implement state channel management functions
3. Add cross-layer transfer mechanisms
4. Update balance displays to show both layers
5. Implement offchain transaction format and signing