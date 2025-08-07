#!/usr/bin/env python3
"""
Extract walletdescriptorkey entries from wallet.dat
"""

import sqlite3
from binascii import hexlify, unhexlify
import struct

# Connect to wallet.dat
conn = sqlite3.connect('ref_materials/test_wallet.dat')
cursor = conn.cursor()

print("=== Extracting walletdescriptorkey entries ===\n")

# Get all data from main table
cursor.execute("SELECT key, value FROM main")
rows = cursor.fetchall()

# Look for walletdescriptorkey entries
descriptor_keys = []
descriptors = []
xpubs = []

for key, value in rows:
    if key and value:
        key_str = key.decode('utf-8', errors='ignore') if isinstance(key, bytes) else str(key)
        
        # Look for walletdescriptorkey entries
        if 'walletdescriptorkey' in key_str:
            print(f"Found walletdescriptorkey entry:")
            print(f"  Key hex: {hexlify(key).decode() if isinstance(key, bytes) else key}")
            print(f"  Value hex: {hexlify(value).decode()[:64]}... (length: {len(value)})")
            descriptor_keys.append((key, value))
            
        # Look for walletdescriptor entries
        elif 'walletdescriptor' in key_str and 'cache' not in key_str:
            value_str = value.decode('utf-8', errors='ignore') if isinstance(value, bytes) else str(value)
            if 'xpub' in value_str:
                print(f"\nFound descriptor with xpub:")
                # Extract the descriptor string
                start = value_str.find('wpkh(')
                if start == -1:
                    start = value_str.find('pkh(')
                if start == -1:
                    start = value_str.find('sh(')
                if start == -1:
                    start = value_str.find('tr(')
                if start != -1:
                    end = value_str.find(')', start)
                    if end != -1:
                        desc = value_str[start:end+1]
                        print(f"  Descriptor: {desc[:100]}...")
                        descriptors.append(desc)
                        
                        # Extract xpub
                        xpub_start = desc.find('xpub')
                        if xpub_start != -1:
                            xpub_end = desc.find('/', xpub_start)
                            if xpub_end == -1:
                                xpub_end = desc.find(')', xpub_start)
                            xpub = desc[xpub_start:xpub_end]
                            if xpub not in xpubs:
                                xpubs.append(xpub)

conn.close()

print(f"\n=== Summary ===")
print(f"Found {len(descriptor_keys)} walletdescriptorkey entries")
print(f"Found {len(descriptors)} descriptors")
print(f"Found {len(xpubs)} unique xpubs:")
for xpub in xpubs:
    print(f"  {xpub}")

# The walletdescriptorkey values contain the extended private keys
# They are typically stored in a specific format that needs to be decoded
print("\n=== Analyzing walletdescriptorkey values ===")
for i, (key, value) in enumerate(descriptor_keys):
    print(f"\nEntry {i}:")
    value_hex = hexlify(value).decode()
    print(f"  Full value: {value_hex}")
    
    # The value might contain:
    # - Version bytes (4 bytes)
    # - Depth (1 byte)
    # - Parent fingerprint (4 bytes)
    # - Child number (4 bytes)
    # - Chain code (32 bytes)
    # - Private key (32 bytes) prefixed with 0x00
    
    # Try to find potential private keys in the value
    for j in range(len(value) - 32):
        potential_key = value[j:j+32]
        key_hex = hexlify(potential_key).decode()
        # Check if it looks like a valid private key
        if (key_hex != '0' * 64 and 
            key_hex != 'f' * 64 and
            len(set(key_hex)) > 8):
            # Check if preceded by 0x00 (common for private keys in extended format)
            if j > 0 and value[j-1] == 0x00:
                print(f"  Potential private key at offset {j-1}: 00{key_hex}")
                
print("\n=== Next Steps ===")
print("The walletdescriptorkey values likely contain the extended private keys (xprv)")
print("that correspond to the xpubs in the descriptors.")
print("These need to be properly decoded to extract the master private key.")
print("\nFor the address alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz,")
print("we need to find which descriptor generates it and extract its corresponding private key.")