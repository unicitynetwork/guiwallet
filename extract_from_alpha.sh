#!/bin/bash

# Script to extract private keys from wallet.dat using alpha-cli

WALLET_FILE="ref_materials/test_wallet.dat"
TARGET_ADDRESS="alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz"
ALPHA_DIR="ref_materials/alpha"

echo "=== Extracting private key from wallet.dat using alpha-cli ==="
echo
echo "Target address: $TARGET_ADDRESS"
echo "Wallet file: $WALLET_FILE"
echo

# First, build alpha if not already built
if [ ! -f "$ALPHA_DIR/src/alpha-cli" ]; then
    echo "Building alpha-cli..."
    cd "$ALPHA_DIR"
    ./autogen.sh
    ./configure --without-gui
    make src/alpha-cli
    cd - > /dev/null
fi

# Create a temporary directory for alpha data
TEMP_DIR=$(mktemp -d)
echo "Using temporary directory: $TEMP_DIR"

# Copy wallet.dat to the temp directory
mkdir -p "$TEMP_DIR/wallets"
cp "$WALLET_FILE" "$TEMP_DIR/wallets/wallet.dat"

# Start alpha daemon in regtest mode (doesn't need network)
echo "Starting alpha daemon..."
$ALPHA_DIR/src/alphad -regtest -datadir="$TEMP_DIR" -daemon -fallbackfee=0.00001

# Wait for daemon to start
sleep 3

# Method 1: List all addresses to find our target
echo
echo "Method 1: Listing address groupings..."
$ALPHA_DIR/src/alpha-cli -regtest -datadir="$TEMP_DIR" listaddressgroupings

# Method 2: Get address info
echo
echo "Method 2: Getting address info for $TARGET_ADDRESS..."
$ALPHA_DIR/src/alpha-cli -regtest -datadir="$TEMP_DIR" getaddressinfo "$TARGET_ADDRESS"

# Method 3: Try to dump the private key directly
echo
echo "Method 3: Attempting to dump private key for $TARGET_ADDRESS..."
$ALPHA_DIR/src/alpha-cli -regtest -datadir="$TEMP_DIR" dumpprivkey "$TARGET_ADDRESS" 2>&1

# Method 4: Dump entire wallet
echo
echo "Method 4: Dumping entire wallet to file..."
DUMP_FILE="$TEMP_DIR/wallet_dump.txt"
$ALPHA_DIR/src/alpha-cli -regtest -datadir="$TEMP_DIR" dumpwallet "$DUMP_FILE"

# Show relevant parts of the dump
echo
echo "Searching for target address in dump file..."
grep -B2 -A2 "$TARGET_ADDRESS" "$DUMP_FILE" || echo "Address not found in dump"

# Also search for any private keys
echo
echo "First few private keys in dump:"
grep -E "^[KL5][1-9A-HJ-NP-Za-km-z]{51}" "$DUMP_FILE" | head -5

# Stop the daemon
echo
echo "Stopping alpha daemon..."
$ALPHA_DIR/src/alpha-cli -regtest -datadir="$TEMP_DIR" stop

# Wait for shutdown
sleep 2

# Cleanup
echo
echo "Cleaning up..."
rm -rf "$TEMP_DIR"

echo
echo "Done!"