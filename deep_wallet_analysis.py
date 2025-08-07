#!/usr/bin/env python3
"""
Deep analysis of wallet.dat to understand key storage
"""

import sqlite3
from binascii import hexlify, unhexlify
import struct

def parse_wallet_dat(wallet_path):
    """Parse wallet.dat and show ALL entries in detail"""
    conn = sqlite3.connect(wallet_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT key, value FROM main")
    entries = cursor.fetchall()
    
    print(f"Total entries: {len(entries)}\n")
    
    # Group entries by type
    descriptors = []
    descriptor_keys = []
    addresses = []
    transactions = []
    other = []
    
    for key_blob, value_blob in entries:
        key_hex = hexlify(key_blob).decode()
        
        if b'walletdescriptor' in key_blob and b'key' not in key_blob and b'cache' not in key_blob:
            # This is a wallet descriptor
            descriptors.append((key_blob, value_blob))
        elif b'walletdescriptorkey' in key_blob:
            descriptor_keys.append((key_blob, value_blob))
        elif b'name-' in key_blob:
            addresses.append((key_blob, value_blob))
        elif key_blob.startswith(b'\x02tx'):
            transactions.append((key_blob, value_blob))
        else:
            other.append((key_blob, value_blob))
    
    # Analyze wallet descriptors
    print("=== WALLET DESCRIPTORS ===")
    for key_blob, value_blob in descriptors:
        print(f"\nDescriptor key: {hexlify(key_blob).decode()}")
        # Try to parse descriptor string
        try:
            # Skip first 32 bytes (descriptor ID)
            desc_data = value_blob[32:]
            # Look for ASCII text
            desc_str = ""
            for b in desc_data:
                if 32 <= b <= 126:  # Printable ASCII
                    desc_str += chr(b)
                else:
                    if desc_str:
                        print(f"  Descriptor string: {desc_str}")
                        desc_str = ""
        except:
            pass
    
    # Analyze descriptor keys
    print("\n\n=== DESCRIPTOR KEYS ===")
    for key_blob, value_blob in descriptor_keys[:2]:  # Show first 2
        print(f"\nKey entry: {hexlify(key_blob).decode()}")
        print(f"Value length: {len(value_blob)}")
        print(f"Value hex: {hexlify(value_blob).decode()}")
        
        # Try to find private key in the value
        for i in range(len(value_blob) - 33):
            if value_blob[i] == 0x04 and value_blob[i+1] == 0x20:
                priv_key = value_blob[i+2:i+34]
                print(f"  Found private key at offset {i}: {hexlify(priv_key).decode()}")
        
        # Also look for public keys
        for i in range(len(value_blob) - 33):
            if value_blob[i] in [0x02, 0x03]:  # Compressed public key
                pub_key = value_blob[i:i+33]
                # Verify it could be a valid public key
                if i + 33 <= len(value_blob):
                    print(f"  Possible public key at offset {i}: {hexlify(pub_key).decode()}")
    
    # Show addresses
    print("\n\n=== ADDRESSES ===")
    for key_blob, value_blob in addresses:
        addr = key_blob[5:].decode('utf-8', errors='ignore')
        print(f"Address: {addr}")
    
    # Look for specific patterns
    print("\n\n=== SEARCHING FOR EXPECTED ADDRESS ===")
    expected_addr = "alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz"
    expected_hash = "d571e66f22601b58fea87dd07ff95c5af0f86298"
    
    for key_blob, value_blob in entries:
        # Check if expected address appears in key
        if expected_addr.encode() in key_blob:
            print(f"Found expected address in key: {key_blob}")
            print(f"  Value: {hexlify(value_blob).decode()}")
        
        # Check if expected hash appears anywhere
        if unhexlify(expected_hash) in value_blob:
            print(f"Found expected hash in value for key: {hexlify(key_blob).decode()}")
    
    conn.close()

if __name__ == "__main__":
    wallet_path = "/home/vrogojin/offlinewallet/ref_materials/test_wallet.dat"
    parse_wallet_dat(wallet_path)