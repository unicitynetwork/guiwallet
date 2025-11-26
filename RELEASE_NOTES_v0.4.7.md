# Unicity WEB GUI Wallet v0.4.7 - Vesting Classification Fixes

## What's New

### Per-Address Vesting Cache
- **Fixed vesting classification for BIP32 wallets** - Each derived address now maintains its own vesting cache
- **New `addressVestingCache` Map** - Proper per-address UTXO classification storage
- **Helper functions added** - `getAddressVestingCache()` and `getCurrentVestingAddress()` for clean cache management
- **Proper cache clearing** - Wallet switch/delete operations now correctly clear per-address caches

### Critical Vesting Bug Fixes
- **Fixed callback signature bug** - Electrum request callbacks were using reversed parameter order (`error, result` vs correct `result, error`), causing ALL successful transaction fetches to be treated as errors
- **Fixed null block height handling** - Added guards to prevent NaN calculations when `currentBlockHeight` is not yet available
- **Added retry logic** - Vesting classification now waits for block height before processing
- **Skip invalid cache entries** - Cached coinbase entries with null blockHeight are now re-fetched

### Address Switching Fix
- **Fixed crash on cached wallet address click** - Added null check for master key before attempting derivation
- **User-friendly notification** - Shows warning message when wallet needs re-import
- **Visual indicators** - Cached-only addresses display grayed out with "Re-import wallet.dat to switch" message
- **Prevents `Cannot read properties of null` error** - Properly handles wallets loaded from cache without master keys

### Developer Tools
- **Exposed `VestingClassifier` to window** - Available as `window.VestingClassifier` for debugging
- **Exposed `addressVestingCache` to window** - Inspect per-address classification state
- **New cache clearing methods** - `VestingClassifier.clearIndexedDBCache()` and `VestingClassifier.clearAllCaches()`

## Technical Details

### Vesting Classification Architecture
The vesting system now uses a per-address cache structure:
```javascript
// Map: address -> { classifiedUtxos, vestingBalances }
addressVestingCache = new Map();
```

Each address stores:
- `classifiedUtxos`: `{ vested: [], unvested: [], all: [] }`
- `vestingBalances`: `{ vested: 0n, unvested: 0n, all: 0n }`

### Electrum Callback Convention
Fixed the callback signature to match the actual implementation:
- **On success**: `callback(result)` - result in first parameter
- **On error**: `callback(null, error)` - error in second parameter

### Block Height Guards
Added multiple safeguards for block height calculations:
- Null checks before calculating `blockHeight = currentBlockHeight - confirmations + 1`
- Retry mechanism that waits 1 second for block height to become available
- Skip and re-fetch cached entries that have null blockHeight

## Bug Fixes Summary
- Fixed per-address vesting cache (was using global state for all addresses)
- Fixed Electrum callback parameter order causing 100% classification failure
- Fixed NaN block height calculations when currentBlockHeight is null
- Fixed address switching crash for cached wallets without master keys
- Fixed VestingClassifier scope (now accessible via window object)

## Installation

Simply download and open `index.html` in your web browser. No build process or dependencies required.

## Upgrading from v0.4.5

No breaking changes. Your existing wallet data will work seamlessly with v0.4.7. If you experience vesting classification issues, use the browser console to clear caches:
```javascript
await VestingClassifier.clearAllCaches();
addressVestingCache.clear();
```

## Files Changed
- **index.html**: Core wallet application (vesting fixes, address switching fix, version bump)

## Full Changelog

**Full Changelog**: https://github.com/unicitynetwork/guiwallet/compare/v0.4.5...v0.4.7
