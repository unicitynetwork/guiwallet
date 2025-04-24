# Unicity Offline Wallet

A simple, secure, client-side wallet that runs entirely in your browser. The  Wallet is designed for offline use, allowing you to manage private keys and generate addresses without exposing sensitive information to the internet.

![Unicity Offline Wallet](wallet-screenshot.png)

## Features

- **100% Client-Side**: All code runs in your browser - no data is ever sent to any server
- **Offline Capable**: Save the HTML file and run it offline for maximum security
- **Private Key Management**: Securely generate and manage private keys
- **QR Code Support**: Generate QR codes for easy address sharing
- **Wallet Encryption**: Protect your private keys with password encryption
- **WIF Format**: Export private keys in Wallet Import Format (WIF) for compatibility with other wallets
- **Simple Backup**: Easily backup your wallet data to a text file
- **Persistent Storage**: Wallet data is saved in your browser's local storage

## Security Features

- **Password Protection**: Optional encryption of your wallet with a password (using 100,000 PBKDF2 iterations)
- **Password Strength Meter**: Visual feedback on password strength
- **Auto-Hide**: Private keys automatically hide after 30 seconds
- **Confirmation Dialogs**: Extra verification steps before sensitive operations

## How to Use

1. **Setup**:
   - Clone or download this repository
   - Open `offline-wallet.html` in a web browser. You can either save as a file and transfer to an offline computer or open in the github pages https://unicitynetwork.github.io/offlinewallet/ and then go offline. 

2. **Create a Wallet**:
   - Click "Create Wallet" to create a new wallet
   - A master key will be securely generated using cryptographically-strong random numbers

3. **Security**:
   - Click "Encrypt Wallet" to protect your wallet with a password
   - Create a strong password to ensure maximum security

4. **Backup**:
   - Click "Backup Wallet" to download your wallet data as a text file
   - Store this file securely (preferably on an offline device)



## Technical Details

The wallet implements:
- BIP-44 style derivation paths for address generation
- Secure random number generation via Web Crypto API
- HMAC-SHA512 for HD wallet key derivation
- Bech32 address encoding
- AES encryption for wallet protection (with 100,000 PBKDF2 iterations for key derivation)
- IndexedDB for cross-tab persistent storage

## Import to Alpha Core

   - Click on Migrate Wallet and reveal the private key Note this is not the master key but the private key corresponding to the address (derived from the master key)
   - This key can then be imported into supported online wallets such as Alpha core. There is script provided called `alpha-migration.sh` which will do the automate the migration. 

```bash
###############################################################################
# Unicity Offline Wallet Migration Tool
###############################################################################
# 
# DESCRIPTION:
#   This script helps users migrate funds from an offline Unicity wallet by
#   importing the private key into an online Alpha node. The script
#   handles the technical details of importing a private key using descriptors,
#   allowing users to access funds stored at SegWit (alpha1...) addresses.
#
# BACKGROUND:
#   The offline wallet now shows the direct private key that generates your address,
#   making migration simpler and more reliable. This script ensures proper import
#   of this key with the correct descriptor format for compatibility with Alpha nodes.
#
# USAGE:
#   ./alpha-migrate.sh <private_key_wif> <wallet_name>
#
# ARGUMENTS:
#   private_key_wif - The private key in WIF format shown in the offline wallet
#   wallet_name     - Name of the wallet to create or use for importing
#
# EXAMPLES:
#   ./alpha-migrate.sh KxaRsSTC8uVbh6eJDwiyRu8oGgWpkFVFq7ff6QbaMTJfBHNZTMpV my_wallet
#
# NOTES:
#   - If no funds appear, try rescanning the blockchain
#   - The script will create a new wallet if the specified name doesn't exist
#
###############################################################################
```

Save the above as `alpha-migrate.sh` and make it executable with `chmod +x alpha-migrate.sh`, then run it with your private key and wallet name.

## Security Recommendations

- **Offline Use**: For maximum security, use this wallet on an offline computer
- **Backup**: Always backup your wallet data and store it securely
- **Strong Passwords**: Use a strong, unique password to encrypt your wallet
- **Private Environment**: Ensure no one can see your screen when viewing private keys

## Development

The entire wallet is contained in a single HTML file with embedded JavaScript and CSS. There are no external dependencies or build processes required.

## License

[MIT License](LICENSE)