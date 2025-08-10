# Unicity WEB GUI Wallet v0.1.2 Release Notes

## Overview
This release introduces a robust transaction broadcast queue system, enhanced transaction displays, and numerous UI/UX improvements to make the wallet more reliable and user-friendly.

## Key Features

### 🚀 Transaction Broadcast Queue System
- **Automatic Queue Management**: All transactions are now queued for reliable delivery
- **Rate Limiting**: Broadcasts up to 30 transactions per block to prevent network congestion
- **Persistent Queue**: Survives page refreshes and connection drops
- **Smart Retry Logic**: Failed transactions automatically retry up to 3 times
- **UTXO Protection**: Prevents double-spending by tracking consumed UTXOs

### 📊 Enhanced Transaction Display
- **From Address**: Now visible for all transactions in the transaction list
- **Multiple Recipients**: Shows all destination addresses when no wallet is loaded
- **Complete Details**: Transaction exports now preserve full transaction information
- **Better Queue Visibility**: Click transaction counts to see detailed information

### 🎨 User Interface Improvements
- **Max Available Button**: Quickly calculate maximum sendable amount with fees
- **Version Display**: Version number (v0.1.2) shown in top-right corner
- **Cleaner Notifications**: Limited to 3 visible popups, removed redundant notifications
- **Updated Help**: "How to use" modal now includes broadcast queue instructions

### 📁 File Import Enhancements
- **Wallet Restore**: Now accepts `.txt` and `.dat` files
- **Transaction Import**: Accepts only `.json` files for better validation
- **UTXO Import**: Accepts only `.json` files

## Technical Improvements
- Updated default Fulcrum endpoint to `fulcrum.unicity.network`
- Fixed multiple initialization order issues
- Improved error handling and connection management
- Enhanced transaction amount calculations
- Better localStorage state management

## Bug Fixes
- Fixed `encryptionStatus` undefined error
- Fixed modal close button syntax errors
- Fixed export notifications for cancelled transactions
- Fixed import error handling
- Resolved ERR_CONNECTION_RESET issues
- Added missing favicon.ico

## Installation
1. Download `index.html` from this release
2. Open in a modern web browser
3. For offline use, save the page locally using the "Download Wallet" feature

## Upgrading
If you're upgrading from a previous version:
1. Backup your existing wallet using the "Backup Wallet" button
2. Download the new `index.html`
3. Restore your wallet using the backup file

## Security Notes
- Always backup your wallet before upgrading
- For maximum security, use the wallet on an offline computer
- Never share your private keys or seed phrases
- Verify the integrity of downloaded files

## What's Next
Future updates will focus on:
- Support for the upcoming offchain state transition layer
- Enhanced multi-signature capabilities
- Improved transaction fee estimation
- Additional blockchain explorer integrations

## Support
For issues or questions:
- Create an issue on GitHub
- Consult the updated "How to use" section in the wallet

---
**Full Changelog**: See CHANGELOG.md for detailed changes