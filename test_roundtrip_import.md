# Test Round-Trip Import/Export

## Test Procedure

To verify that wallet.dat import → export to txt → re-import from txt preserves the same wallet:

### 1. Import from wallet.dat
- Use the "Restore Wallet" button
- Select a wallet.dat file (e.g., test_wallet.dat)
- The wallet should import with:
  - Master private key
  - Master chain code
  - Flag indicating it's an Alpha descriptor wallet
  - Addresses generated using BIP32 derivation

### 2. Export to txt
- Click "Backup Wallet"
- The exported file should now contain:
  - MASTER PRIVATE KEY
  - MASTER CHAIN CODE (if Alpha wallet)
  - WALLET TYPE information

### 3. Delete current wallet
- Click "Delete Wallet"
- Confirm deletion

### 4. Re-import from txt
- Click "Restore Wallet"
- Select the txt file exported in step 2
- The wallet should restore with:
  - Same master private key
  - Same master chain code
  - Same wallet type (Alpha descriptor)
  - Generate the same addresses

## Expected Results

When importing an Alpha wallet.dat and then re-importing from the exported txt:
- The same addresses should be generated
- The derivation method should remain BIP32 (not switch to HMAC)
- All wallet properties should be preserved

## Key Changes Made

1. **Export Enhancement**: The txt export now includes:
   - Master chain code (for Alpha wallets)
   - Wallet type indicator

2. **Import Enhancement**: The txt import now:
   - Parses the master chain code
   - Detects Alpha descriptor wallet type
   - Sets the appropriate flags for BIP32 derivation

This ensures complete round-trip compatibility for wallets imported from Alpha's wallet.dat files.