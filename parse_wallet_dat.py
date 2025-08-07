#!/usr/bin/env python3
"""
Parse wallet.dat file and extract private keys
Based on alpha-qt's BDB format
"""

import sqlite3
import struct
import hashlib
from binascii import hexlify, unhexlify

def parse_wallet_dat(wallet_path):
    """Parse wallet.dat SQLite file and extract key-value pairs"""
    conn = sqlite3.connect(wallet_path)
    cursor = conn.cursor()
    
    # Get all key-value pairs from the main table
    cursor.execute("SELECT key, value FROM main")
    entries = cursor.fetchall()
    
    results = {}
    for key_blob, value_blob in entries:
        # Try to decode the key
        try:
            key_str = key_blob.decode('utf-8', errors='ignore')
            results[key_str] = value_blob
        except:
            # If decoding fails, use hex representation
            results[hexlify(key_blob).decode()] = value_blob
    
    conn.close()
    return results

def extract_private_keys(wallet_data):
    """Extract private keys from wallet data"""
    private_keys = []
    
    for key, value in wallet_data.items():
        # Look for entries that might contain private keys
        # Based on the hex dumps, keys starting with certain patterns contain wallet data
        if isinstance(key, str):
            # Check for wallet descriptor keys (contain private key data)
            if 'walletdescriptorkey' in key:
                # Parse the value to extract the private key
                # Skip the first 32 bytes (likely a key ID or descriptor ID)
                if len(value) > 32:
                    # The next 32 bytes should be the private key
                    private_key = value[32:64]
                    if len(private_key) == 32:
                        private_keys.append({
                            'key_type': 'descriptor',
                            'private_key': hexlify(private_key).decode(),
                            'full_entry': hexlify(value).decode()
                        })
            
            # Check for active external spend keys
            elif 'activeexternalspk' in key:
                # These entries contain references to wallet descriptors
                if len(value) == 32:
                    private_keys.append({
                        'key_type': 'spk_reference',
                        'reference': hexlify(value).decode()
                    })
    
    return private_keys

def analyze_wallet_structure(wallet_data):
    """Analyze the structure of the wallet to understand key storage"""
    print("=== Wallet Structure Analysis ===")
    
    # Group entries by type
    entry_types = {}
    for key, value in wallet_data.items():
        if isinstance(key, str):
            # Extract the base key type
            if key.startswith('07'):  # Hex encoded
                decoded = unhexlify(key)
                key_type = decoded.decode('utf-8', errors='ignore')
            else:
                key_type = key.split('\x00')[0] if '\x00' in key else key
            
            if key_type not in entry_types:
                entry_types[key_type] = []
            entry_types[key_type].append((key, value))
    
    # Print summary
    for key_type, entries in sorted(entry_types.items()):
        print(f"\n{key_type}: {len(entries)} entries")
        # Show first few entries for each type
        for i, (k, v) in enumerate(entries[:3]):
            print(f"  Entry {i+1}:")
            print(f"    Key: {k[:50]}..." if len(str(k)) > 50 else f"    Key: {k}")
            print(f"    Value length: {len(v)} bytes")
            if len(v) <= 64:
                print(f"    Value (hex): {hexlify(v).decode()}")

def main():
    wallet_path = "/home/vrogojin/offlinewallet/ref_materials/test_wallet.dat"
    
    print(f"Parsing wallet: {wallet_path}")
    wallet_data = parse_wallet_dat(wallet_path)
    
    print(f"\nTotal entries found: {len(wallet_data)}")
    
    # Analyze structure
    analyze_wallet_structure(wallet_data)
    
    # Extract private keys
    print("\n\n=== Extracting Private Keys ===")
    private_keys = extract_private_keys(wallet_data)
    
    for i, key_info in enumerate(private_keys):
        print(f"\nKey {i+1}:")
        for k, v in key_info.items():
            print(f"  {k}: {v}")

if __name__ == "__main__":
    main()