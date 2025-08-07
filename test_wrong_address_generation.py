#!/usr/bin/env python3
"""
Test to understand what generates the wrong address
"""

import hashlib
import hmac
from binascii import hexlify, unhexlify

# The master key from wallet.dat
master_key = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"

# The wrong address we're seeing
wrong_address = "alpha1qdzapak9w9amzxwcxex3u9akschhrnyynafnjfg"
wrong_pubkey_hash = "68ba1ed8ae2f76233b06c9a3c2f6d0c5ee399093"

# Expected values
expected_address = "alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz"
expected_pubkey_hash = "d571e66f22601b58fea87dd07ff95c5af0f86298"

print("=== Analysis of Wrong Address Generation ===\n")

print("Master key from wallet.dat:")
print(master_key)
print()

print("Wrong address being shown:")
print(wrong_address)
print("Its pubkey hash:", wrong_pubkey_hash)
print()

print("Expected address:")
print(expected_address)
print("Its pubkey hash:", expected_pubkey_hash)
print()

# Test: Apply HMAC-SHA512 with "Bitcoin seed" (what deriveChildKeyForIndex does first)
seed = hmac.new(b"Bitcoin seed", unhexlify(master_key), hashlib.sha512).digest()
key_after_hmac = hexlify(seed[:32]).decode()
chain_code = hexlify(seed[32:]).decode()

print("After HMAC-SHA512 with 'Bitcoin seed':")
print("Key:", key_after_hmac)
print("Chain code:", chain_code)
print()

print("DIAGNOSIS:")
print("The wrong address is being generated because:")
print("1. The wallet.dat import correctly stores the address and privateKey")
print("2. But when the wallet is loaded from storage, the address is missing privateKey")
print("3. Or the wallet is calling deriveChildKeyForIndex which uses 3-level derivation")
print("4. This creates a different key than the 5-level BIP44 path used in wallet.dat")
print()
print("The fix should ensure:")
print("1. The privateKey field is preserved when saving/loading wallet")
print("2. The wallet doesn't regenerate addresses for wallet.dat imports")
print("3. The childPrivateKey from wallet.dat import is used for signing")