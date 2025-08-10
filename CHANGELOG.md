# Changelog

All notable changes to the Unicity WEB GUI Wallet will be documented in this file.

## [v0.1.2] - 2024-01-10

### Added
- **Transaction Broadcast Queue System**
  - Automatic queue management for reliable transaction delivery
  - Rate limiting: Up to 30 transactions per block
  - Visual progress indicator showing pending, broadcasting, complete, failed, and cancelled transactions
  - Queue persistence across page refreshes and connection drops
  - Automatic retry for failed transactions (up to 3 attempts)
  - UTXO consumption tracking to prevent double-spending
  - Clickable transaction counts for detailed information
  - Export functionality for failed/cancelled transactions
  - Individual and bulk actions for cancelled transactions (Resend, Save, Delete)
  - Auto-cleanup of completed transactions after 24 hours

- **Enhanced Transaction Display**
  - "From" address shown for all transactions in the transaction list
  - Multiple destination addresses displayed when no wallet is loaded
  - Complete transaction details preserved in exports
  - Improved address display in broadcast queue modals

- **User Interface Improvements**
  - "Max available" button between amount field and Send button for quick fee calculation
  - Version number display (v0.1.2) in top-right corner
  - Updated "How to use" modal with broadcast queue instructions
  - Limited popup notifications to maximum 3 visible at once
  - Removed redundant "New Block" and "Address Activity" notifications

- **File Import Enhancements**
  - Wallet restore accepts .txt and .dat files
  - Import & Broadcast Transactions accepts only .json files
  - Import UTXO Data accepts only .json files

### Changed
- Updated default Fulcrum endpoint from unicorn.unicity.network to fulcrum.unicity.network
- Transaction broadcast limit increased from 1 to 30 per block
- Improved error handling for connection issues

### Fixed
- Fixed encryptionStatus undefined error
- Fixed multiple variable initialization order issues
- Fixed modal close button syntax errors
- Fixed export notifications showing wrong messages for cancelled transactions
- Fixed import error handling for cancelled transactions
- Fixed missing favicon.ico 404 error
- Fixed ERR_CONNECTION_RESET issues

### Technical Details
- Implemented consumed UTXO tracking in transaction creation
- Added address field to UTXOs when fetching from Electrum
- Improved transaction amount calculations for proper recipient totals
- Enhanced queue state persistence with localStorage
- Better handling of block height changes for queue processing

## [v0.1.1] - 2024-01-10
- Minor bug fixes and improvements

## [v0.1.0] - 2024-01-10
- Initial release of Unicity WEB GUI Wallet
- Basic wallet functionality for Alpha cryptocurrency
- Support for SegWit addresses with 'alpha1' prefix
- Online and offline transaction capabilities
- Watch-only mode for monitoring addresses
- Wallet encryption and backup features