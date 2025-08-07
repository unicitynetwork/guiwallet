#!/usr/bin/env python3
"""
Find which key in wallet.dat actually generates the target address
WITHOUT cheating!
"""

import sqlite3
from binascii import hexlify, unhexlify

# Expected values
EXPECTED_ADDRESS = "alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz"
EXPECTED_PUBKEY_HASH = "d571e66f22601b58fea87dd07ff95c5af0f86298"

# Read wallet.dat
conn = sqlite3.connect('ref_materials/test_wallet.dat')
cursor = conn.cursor()
cursor.execute("SELECT key, value FROM main")
rows = cursor.fetchall()
conn.close()

# Extract private keys
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

print(f"Found {len(private_keys)} private keys in wallet.dat")
for i, key in enumerate(private_keys):
    print(f"  {i}: {key}")

print(f"\nTarget address: {EXPECTED_ADDRESS}")
print(f"Target hash: {EXPECTED_PUBKEY_HASH}")

print("\n=== IMPORTANT ===")
print("Since we cannot generate public keys in pure Python without additional libraries,")
print("and the previous Python script had a bug (returning expected hash when ripemd160 failed),")
print("we need to test these keys in JavaScript with the elliptic library.")
print("\nThe correct approach is:")
print("1. Test each private key directly with elliptic library")
print("2. See which one generates address:", EXPECTED_ADDRESS)
print("3. Use that key directly in wallet.dat import (no BIP32 derivation)")

# Let's also check if any of these keys might be the right one based on patterns
print("\n=== Analysis ===")
print("Based on the wallet.dat structure:")
print("- First key (master): 44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3")
print("- Second key: 11395f88d9dd258680a74ad1be8c7a350332859769eb99b5bbba592ea53e3200")
print("\nAlpha-qt likely stores the actual address private key directly.")
print("We should test both keys to see which generates the target address.")