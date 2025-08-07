#!/usr/bin/env python3
"""
Verify the correct BIP32 derivation steps
"""

import hashlib
import hmac
from binascii import hexlify, unhexlify

def derive_bip32_child(parent_key, parent_chain_code, index):
    """Derive a BIP32 child key"""
    if index >= 0x80000000:
        # Hardened derivation: data = 0x00 || parent_private_key || index
        data = b'\x00' + unhexlify(parent_key) + index.to_bytes(4, 'big')
    else:
        # Non-hardened derivation: data = parent_public_key || index
        # First derive the public key from parent private key
        from ecdsa import SECP256k1, SigningKey
        sk = SigningKey.from_string(unhexlify(parent_key), curve=SECP256k1)
        parent_pub = sk.get_verifying_key().to_string("compressed")
        data = parent_pub + index.to_bytes(4, 'big')
    
    # HMAC-SHA512(Key=parent_chain_code, Data=data)
    h = hmac.new(unhexlify(parent_chain_code), data, hashlib.sha512).digest()
    
    # Split result
    child_key_material = h[:32]
    child_chain_code = h[32:]
    
    # Add parent key to child key material (mod n)
    n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
    child_key_int = (int.from_bytes(child_key_material, 'big') + int(parent_key, 16)) % n
    child_key = child_key_int.to_bytes(32, 'big')
    
    return hexlify(child_key).decode(), hexlify(child_chain_code).decode()

# Test with our wallet
master_key = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"

# Step 1: Master seed from HMAC-SHA512(master_key, "Bitcoin seed")
seed = hmac.new(b"Bitcoin seed", unhexlify(master_key), hashlib.sha512).digest()
current_key = hexlify(seed[:32]).decode()
current_chain = hexlify(seed[32:]).decode()

print("Initial master key derivation:")
print(f"Master key: {master_key}")
print(f"After HMAC: {current_key}")
print(f"Chain code: {current_chain}")
print()

# Path: m/44'/0'/0'/0/0
path = [
    (44 + 0x80000000, "44'"),
    (0 + 0x80000000, "0'"),
    (0 + 0x80000000, "0'"),
    (0, "0"),
    (0, "0")
]

print("Deriving path m/44'/0'/0'/0/0:")
for index, label in path:
    print(f"\nLevel {label}:")
    print(f"  Parent key: {current_key}")
    print(f"  Parent chain: {current_chain}")
    current_key, current_chain = derive_bip32_child(current_key, current_chain, index)
    print(f"  Child key: {current_key}")

print(f"\nFinal derived key: {current_key}")
print(f"Expected: f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726")
print(f"Match: {current_key == 'f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726'}")