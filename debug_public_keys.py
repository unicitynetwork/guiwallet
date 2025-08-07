#!/usr/bin/env python3
"""
Debug what public keys should be used
"""

import hashlib
import hmac
from binascii import hexlify, unhexlify

# Use ecdsa library for proper public key generation
try:
    from ecdsa import SECP256k1, SigningKey
    
    def private_to_public(private_key_hex):
        """Convert private key to compressed public key"""
        sk = SigningKey.from_string(unhexlify(private_key_hex), curve=SECP256k1)
        vk = sk.get_verifying_key()
        # Get compressed public key
        point = vk.pubkey.point
        x = point.x()
        y = point.y()
        if y & 1:  # odd
            prefix = b'\x03'
        else:  # even
            prefix = b'\x02'
        return hexlify(prefix + x.to_bytes(32, 'big')).decode()
except ImportError:
    print("ecdsa not available, using known values")
    def private_to_public(private_key_hex):
        known = {
            "e6c1f7f38ef252a24528f0e680f9c0450b359fbf630806020a2102c7d15909b7": "02a96e5e8c7b17e5a30ad7c13c6f4761e38e56d5c3beacdc89bec37e83a3034b7e"
        }
        return known.get(private_key_hex, "unknown")

# Trace the full derivation
master_key = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"

# Initial seed
seed = hmac.new(b"Bitcoin seed", unhexlify(master_key), hashlib.sha512).digest()
current_key = hexlify(seed[:32]).decode()
current_chain = hexlify(seed[32:]).decode()

print("=== Correct BIP32 Derivation ===")
print(f"Master: {master_key}")
print(f"After seed: {current_key}")

# Path m/44'/0'/0'/0/0
path = [
    (0x8000002C, "44'", True),
    (0x80000000, "0'", True),
    (0x80000000, "0'", True),
    (0, "0", False),
    (0, "0", False)
]

for index, label, is_hardened in path:
    print(f"\nLevel {label}:")
    print(f"  Current key: {current_key}")
    
    if is_hardened:
        # Hardened
        data = unhexlify('00' + current_key) + index.to_bytes(4, 'big')
        data_hex = hexlify(data).decode()
        print(f"  Data: {data_hex}")
    else:
        # Non-hardened
        pub = private_to_public(current_key)
        print(f"  Public key: {pub}")
        data = unhexlify(pub) + index.to_bytes(4, 'big')
        data_hex = hexlify(data).decode()
        print(f"  Data: {data_hex}")
    
    # HMAC
    h = hmac.new(unhexlify(current_chain), data, hashlib.sha512).digest()
    new_key_material = h[:32]
    new_chain = h[32:]
    
    # Add keys
    n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
    new_key_int = (int.from_bytes(new_key_material, 'big') + int(current_key, 16)) % n
    
    current_key = hex(new_key_int)[2:].rjust(64, '0')
    current_chain = hexlify(new_chain).decode()
    
    print(f"  Result: {current_key}")

print(f"\nFinal key: {current_key}")
print(f"Expected: f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726")

# Also check what JavaScript got
js_level3_key = "e6c1f7f38ef252a24528f0e680f9c0450b359fbf630806020a2102c7d15909b7"
js_level3_pub = "03bcd7b7d8dc639aa4776dee0f31f87aadb5ce9f4660d6859515d2835d09f096d5"

print(f"\n=== JavaScript Results ===")
print(f"Level 3 key: {js_level3_key}")
print(f"Level 3 pub: {js_level3_pub}")
print(f"Expected pub: {private_to_public(js_level3_key)}")

# The issue might be the public key format
print("\n=== Diagnosis ===")
print("The JavaScript is generating different public keys than expected.")
print("This suggests either:")
print("1. The elliptic library is producing uncompressed keys")
print("2. There's a bug in the public key generation")
print("3. The keys are correct but in a different format")