#!/usr/bin/env python3
"""
Verify what's actually in the wallet.dat
"""

import sqlite3
from binascii import hexlify, unhexlify

# Connect to wallet.dat
conn = sqlite3.connect('ref_materials/test_wallet.dat')
cursor = conn.cursor()

# Query all data
cursor.execute("SELECT key, value FROM main")
rows = cursor.fetchall()

print("=== Analyzing wallet.dat contents ===\n")

# Look for private keys
private_keys = []
for key, value in rows:
    if value and len(value) > 34:
        # Look for DER-encoded private keys (0x04 0x20)
        for i in range(len(value) - 33):
            if value[i] == 0x04 and value[i+1] == 0x20:
                priv_key = value[i+2:i+34]
                priv_key_hex = hexlify(priv_key).decode()
                if priv_key_hex not in private_keys and priv_key_hex != '0' * 64:
                    private_keys.append(priv_key_hex)
                    print(f"Found private key: {priv_key_hex}")

print(f"\nTotal unique private keys: {len(private_keys)}")

# Check if our expected key is there
expected_master = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"
expected_derived = "f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726"

print(f"\nChecking for expected keys:")
print(f"Master key {expected_master}: {'FOUND' if expected_master in private_keys else 'NOT FOUND'}")
print(f"Derived key {expected_derived}: {'FOUND' if expected_derived in private_keys else 'NOT FOUND'}")

# Maybe the wallet stores the actual address key?
print("\n=== All private keys found ===")
for i, key in enumerate(private_keys):
    print(f"{i}: {key}")

conn.close()