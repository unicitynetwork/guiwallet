#!/usr/bin/env python3
"""
Trace the exact derivation to find where JS goes wrong
"""

import hashlib
import hmac
from binascii import hexlify, unhexlify

# After 3 hardened levels, both Python and JS have:
key_after_3_levels = "e6c1f7f38ef252a24528f0e680f9c0450b359fbf630806020a2102c7d15909b7"
chain_after_3_levels = "ca15f71b7d8f05c524733d5209b5367f0727bf5a226f7636a95467f679ba7f2e"

print("After 3 hardened levels (m/44'/0'/0'):")
print(f"Key: {key_after_3_levels}")
print(f"Chain: {chain_after_3_levels}")
print()

# For the 4th level (first non-hardened, index 0):
# Python gets public key: 02a96e5e8c7b17e5a30ad7c13c6f4761e38e56d5c3beacdc89bec37e83a3034b7e
# JS gets public key: 03bcd7b7d8dc639aa4776dee0f31f87aadb5ce9f4660d6859515d2835d09f096d5

print("Level 4 (index 0, non-hardened):")
print("Python public key: 02a96e5e8c7b17e5a30ad7c13c6f4761e38e56d5c3beacdc89bec37e83a3034b7e")
print("JS public key:     03bcd7b7d8dc639aa4776dee0f31f87aadb5ce9f4660d6859515d2835d09f096d5")
print()

# Let's compute what happens with each public key
def compute_child_key(parent_key, parent_chain, public_key_hex, index):
    # Data for non-hardened: public_key || index
    data = unhexlify(public_key_hex) + index.to_bytes(4, 'big')
    
    # HMAC
    h = hmac.new(unhexlify(parent_chain), data, hashlib.sha512).digest()
    child_material = h[:32]
    child_chain = h[32:]
    
    # Add parent key
    n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
    child_key_int = (int.from_bytes(child_material, 'big') + int(parent_key, 16)) % n
    child_key = hex(child_key_int)[2:].rjust(64, '0')
    
    return child_key, hexlify(child_chain).decode()

# With Python's public key
py_child4, py_chain4 = compute_child_key(
    key_after_3_levels,
    chain_after_3_levels,
    "02a96e5e8c7b17e5a30ad7c13c6f4761e38e56d5c3beacdc89bec37e83a3034b7e",
    0
)

# With JS's public key
js_child4, js_chain4 = compute_child_key(
    key_after_3_levels,
    chain_after_3_levels,
    "03bcd7b7d8dc639aa4776dee0f31f87aadb5ce9f4660d6859515d2835d09f096d5",
    0
)

print("Results for level 4:")
print(f"With Python pubkey: {py_child4}")
print(f"With JS pubkey:     {js_child4}")
print(f"JS actually got:    4972f92b81798815d507883566c1e71ef9295dc04fa206d53ca9424bf5675e4f")
print()

# The issue is the public key is wrong!
print("=== DIAGNOSIS ===")
print("The JavaScript elliptic library is generating the wrong public key!")
print("This is causing the entire derivation to go wrong.")
print()

# Let me check if this is a known private key
print("Private key e6c1f7f38ef252a24528f0e680f9c0450b359fbf630806020a2102c7d15909b7")
print("should generate public key 02a96e5e8c7b17e5a30ad7c13c6f4761e38e56d5c3beacdc89bec37e83a3034b7e")
print("but JavaScript generates 03bcd7b7d8dc639aa4776dee0f31f87aadb5ce9f4660d6859515d2835d09f096d5")

# Actually, let me check if there's an issue with the key itself
print("\nChecking the private key format...")
print(f"Length: {len(key_after_3_levels)} chars")
if len(key_after_3_levels) == 64:
    print("✓ Correct length (64 hex chars = 32 bytes)")
else:
    print("✗ Wrong length!")