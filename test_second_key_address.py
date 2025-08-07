#!/usr/bin/env python3
"""
Test if the second key from wallet.dat generates our expected address
"""

import hashlib
from binascii import hexlify, unhexlify
import ecdsa
import bech32

# The second key from wallet.dat
SECOND_KEY_HEX = "11395f88d9dd258680a74ad1be8c7a350332859769eb99b5bbba592ea53e3200"
EXPECTED_ADDRESS = "alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz"

# Generate public key using ecdsa library
sk = ecdsa.SigningKey.from_string(unhexlify(SECOND_KEY_HEX), curve=ecdsa.SECP256k1)
vk = sk.get_verifying_key()
pub_key = b'\x02' + vk.to_string()[:32] if vk.to_string()[63] % 2 == 0 else b'\x03' + vk.to_string()[:32]

print(f"Second key: {SECOND_KEY_HEX}")
print(f"Public key: {hexlify(pub_key).decode()}")

# Generate address
sha256_hash = hashlib.sha256(pub_key).digest()
ripemd160_hash = hashlib.new('ripemd160', sha256_hash).digest()

print(f"RIPEMD160 hash: {hexlify(ripemd160_hash).decode()}")
print(f"Expected hash:  d571e66f22601b58fea87dd07ff95c5af0f86298")

# Encode as bech32
witver = 0
witprog = ripemd160_hash
encoded = bech32.bech32_encode("alpha", bech32.convertbits([witver] + list(witprog), 8, 5))

print(f"\nGenerated address: {encoded}")
print(f"Expected address:  {EXPECTED_ADDRESS}")
print(f"Match: {encoded == EXPECTED_ADDRESS}")

# Now test our derived key too
DERIVED_KEY_HEX = "f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726"

sk2 = ecdsa.SigningKey.from_string(unhexlify(DERIVED_KEY_HEX), curve=ecdsa.SECP256k1)
vk2 = sk2.get_verifying_key()
pub_key2 = b'\x02' + vk2.to_string()[:32] if vk2.to_string()[63] % 2 == 0 else b'\x03' + vk2.to_string()[:32]

print(f"\n=== Testing Derived Key ===")
print(f"Derived key: {DERIVED_KEY_HEX}")
print(f"Public key:  {hexlify(pub_key2).decode()}")

sha256_hash2 = hashlib.sha256(pub_key2).digest()
ripemd160_hash2 = hashlib.new('ripemd160', sha256_hash2).digest()
print(f"RIPEMD160 hash: {hexlify(ripemd160_hash2).decode()}")

encoded2 = bech32.bech32_encode("alpha", bech32.convertbits([witver] + list(ripemd160_hash2), 8, 5))
print(f"Generated address: {encoded2}")