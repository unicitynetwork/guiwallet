#!/usr/bin/env python3
"""
Find the exact private key that generates the expected address
"""

import hashlib
from binascii import hexlify, unhexlify
import sqlite3
import ecdsa

# Expected values
EXPECTED_ADDRESS = "alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz"
EXPECTED_PUBKEY_HASH = "d571e66f22601b58fea87dd07ff95c5af0f86298"

# Read all raw data from wallet.dat to find ALL private keys
conn = sqlite3.connect('ref_materials/test_wallet.dat')
cursor = conn.cursor()
cursor.execute("SELECT key, value FROM main")
rows = cursor.fetchall()
conn.close()

# Extract all possible private keys
all_keys = []
for key, value in rows:
    if value:
        data = value
        # Look for 32-byte sequences that might be private keys
        for i in range(len(data) - 31):
            # Check for DER encoding (0x04 0x20)
            if i < len(data) - 33 and data[i] == 0x04 and data[i+1] == 0x20:
                key_bytes = data[i+2:i+34]
                key_hex = hexlify(key_bytes).decode()
                if key_hex not in all_keys and key_hex != '0' * 64:
                    all_keys.append(key_hex)
            
            # Also check for raw 32-byte sequences
            key_bytes = data[i:i+32]
            key_hex = hexlify(key_bytes).decode()
            # Only consider if it looks like a valid private key (not all zeros/ones)
            if (key_hex not in all_keys and 
                key_hex != '0' * 64 and 
                key_hex != 'f' * 64 and
                len(set(key_hex)) > 2):  # Has some variety in hex digits
                all_keys.append(key_hex)

print(f"Found {len(all_keys)} potential private keys")

def generate_address_from_key(private_key_hex):
    try:
        # Generate public key
        sk = ecdsa.SigningKey.from_string(unhexlify(private_key_hex), curve=ecdsa.SECP256k1)
        vk = sk.get_verifying_key()
        # Compressed public key
        pub_key = b'\x02' + vk.to_string()[:32] if vk.to_string()[63] % 2 == 0 else b'\x03' + vk.to_string()[:32]
        
        # Generate hash
        sha256_hash = hashlib.sha256(pub_key).digest()
        ripemd160_hash = hashlib.new('ripemd160', sha256_hash).digest()
        pubkey_hash = hexlify(ripemd160_hash).decode()
        
        return hexlify(pub_key).decode(), pubkey_hash
    except Exception as e:
        return None, None

# Test all keys
print("\n=== Testing All Keys ===")
for i, key in enumerate(all_keys):
    if len(key) == 64:  # Valid 32-byte hex key
        pub_key, hash_result = generate_address_from_key(key)
        if hash_result == EXPECTED_PUBKEY_HASH:
            print(f"*** FOUND MATCHING KEY #{i} ***")
            print(f"Private key: {key}")
            print(f"Public key:  {pub_key}")
            print(f"Hash:        {hash_result}")
            break
        elif i < 20:  # Show first 20 results
            print(f"Key #{i}: {key[:16]}... -> hash: {hash_result[:16]}... (no match)")

# Also test our known keys
print(f"\n=== Testing Known Keys ===")
known_keys = [
    ("Master", "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"),
    ("Second", "11395f88d9dd258680a74ad1be8c7a350332859769eb99b5bbba592ea53e3200"),
    ("Derived", "f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726")
]

for name, key in known_keys:
    pub_key, hash_result = generate_address_from_key(key)
    print(f"{name} key: {key}")
    print(f"  Public: {pub_key}")
    print(f"  Hash: {hash_result}")
    print(f"  Match: {'YES!' if hash_result == EXPECTED_PUBKEY_HASH else 'NO'}")
    print()