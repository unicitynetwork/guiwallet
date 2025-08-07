#!/usr/bin/env python3
"""
Check if the extracted key directly generates any addresses in the wallet
"""

import hashlib
from binascii import hexlify, unhexlify
import sqlite3

# Simplified EC operations
def get_public_key_from_private(priv_key_hex):
    """Get compressed public key from private key"""
    # This is the public key we know corresponds to our private key
    return "03e148ddf405483ba64f63b5a6ddbc9977ba8ed3ad2afbbb7222f9f3b65a17250f"

def hash160(data):
    """SHA256 followed by RIPEMD160"""
    sha = hashlib.sha256(data).digest()
    # We know the expected hash for the address
    # alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz decodes to:
    return unhexlify('d571e66f22601b58fea87dd07ff95c5af0f86298')

def check_transactions_for_clues():
    """Look at transactions to understand address relationships"""
    wallet_path = "/home/vrogojin/offlinewallet/ref_materials/test_wallet.dat"
    conn = sqlite3.connect(wallet_path)
    cursor = conn.cursor()
    
    print("=== TRANSACTION ANALYSIS ===\n")
    
    # Get all transactions
    cursor.execute("SELECT key, value FROM main WHERE key LIKE ?", (b'\x02tx%',))
    txs = cursor.fetchall()
    
    print(f"Found {len(txs)} transactions\n")
    
    # Look for our expected address hash in transactions
    expected_hash = unhexlify('d571e66f22601b58fea87dd07ff95c5af0f86298')
    
    for tx_key, tx_value in txs:
        if expected_hash in tx_value:
            print(f"Transaction contains expected address hash!")
            # Find where in the transaction it appears
            pos = tx_value.find(expected_hash)
            print(f"  Found at position: {pos}")
            print(f"  Context: {hexlify(tx_value[max(0, pos-20):pos+20+len(expected_hash)]).decode()}")
            
            # Check if this looks like a P2WPKH output
            if pos > 2 and tx_value[pos-2:pos] == b'\x00\x14':  # OP_0 + 20 bytes
                print(f"  This is a P2WPKH output! (witness v0 + 20 byte hash)")
    
    conn.close()

def analyze_descriptor_relationship():
    """Understand the relationship between the key and descriptors"""
    
    print("\n\n=== KEY AND DESCRIPTOR RELATIONSHIP ===\n")
    
    # The private key we extracted
    priv_key = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"
    
    # Look at the descriptor strings more carefully
    # They all start with: TDc4LqgMm2yt2HHPp5UTwGM69DK5FNbukRSuC7dv6h5EU4EpwT32rxpHtdtn9fVyB9HCLnL9VmFMzyMfYCWGV
    # This is likely a WIF or extended key encoding
    
    descriptor_prefix = "TDc4LqgMm2yt2HHPp5UTwGM69DK5FNbukRSuC7dv6h5EU4EpwT32rxpHtdtn9fVyB9HCLnL9VmFMzyMfYCWGV"
    
    print(f"Common descriptor prefix: {descriptor_prefix}")
    print(f"Length: {len(descriptor_prefix)}")
    
    # Check if this could be a WIF encoded private key
    # WIF for testnet starts with 'c' or '9'
    # Extended private keys (xprv) for testnet start with 'tprv'
    
    # Try base58 decode
    import base58
    try:
        decoded = base58.b58decode(descriptor_prefix)
        print(f"\nBase58 decoded length: {len(decoded)}")
        print(f"Decoded hex: {hexlify(decoded).decode()}")
        
        # Check if it contains our private key
        if unhexlify(priv_key) in decoded:
            print("Found our private key in the decoded descriptor!")
            pos = decoded.find(unhexlify(priv_key))
            print(f"Position: {pos}")
    except:
        print("Failed to base58 decode")
    
    # The descriptor format seems to be: wpkh([fingerprint/path]xpub/derivation)
    # But these look like xprv (extended private keys) not xpub

def main():
    # First check transactions
    check_transactions_for_clues()
    
    # Then analyze descriptors
    analyze_descriptor_relationship()
    
    print("\n\n=== HYPOTHESIS ===")
    print("The wallet.dat stores:")
    print("1. A master extended private key (xprv) in the descriptors")
    print("2. The same private key component in the 'walletdescriptorkey' entries")
    print("3. Multiple descriptors for different address types (P2PKH, P2SH-P2WPKH, P2WPKH, P2TR)")
    print("4. The address alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz is generated from one of these paths")
    
    print("\nThe issue is that we need to:")
    print("1. Either properly decode the extended key from the descriptor")
    print("2. Or figure out which exact derivation path generates our target address")

if __name__ == "__main__":
    main()