#!/usr/bin/env python3
"""
Test if the second key generates our address
"""

import hashlib
from binascii import hexlify, unhexlify

# The second key from wallet.dat
second_key = "11395f88d9dd258680a74ad1be8c7a350332859769eb99b5bbba592ea53e3200"

print(f"Testing second key: {second_key}")

# Import the EC functions from find_correct_derivation.py
import sys
sys.path.append('.')
from find_correct_derivation import get_public_key, EXPECTED_ADDRESS

# Generate public key
pub_key = get_public_key(second_key)
pub_key_hex = hexlify(pub_key).decode()
print(f"Public key: {pub_key_hex}")

# Generate address
sha256 = hashlib.sha256(pub_key).digest()
try:
    ripemd160 = hashlib.new('ripemd160', sha256).digest()
    pubkey_hash = hexlify(ripemd160).decode()
except:
    # Use known hash if ripemd160 not available
    pubkey_hash = "unknown"

print(f"Pubkey hash: {pubkey_hash}")
print(f"Expected: d571e66f22601b58fea87dd07ff95c5af0f86298")

# Maybe we should just use this second key directly?
print("\n=== Analysis ===")
print("The wallet.dat contains two keys:")
print("1. The master key we've been using")
print("2. This second key - maybe it's the actual address key?")