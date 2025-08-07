#!/usr/bin/env python3
"""
Debug which key is generating the wrong address
"""

import hashlib
import hmac
from binascii import hexlify, unhexlify

# Test different keys
master_key = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"

# Apply HMAC-SHA512 with "Bitcoin seed"
h = hmac.new(b"Bitcoin seed", unhexlify(master_key), hashlib.sha512).digest()
master_key_after_hmac = hexlify(h[:32]).decode()
master_chain_code = hexlify(h[32:]).decode()

print("Master key:", master_key)
print("After HMAC with 'Bitcoin seed':", master_key_after_hmac)
print("Master chain code:", master_chain_code)
print()

# The wrong address hash we're seeing
wrong_hash = "68ba1ed8ae2f76233b06c9a3c2f6d0c5ee399093"
print("Wrong address pubkey hash:", wrong_hash)
print()

# Let's check if it's the master key after HMAC
print("Most likely scenario:")
print("The wallet is using the key after HMAC-SHA512(masterKey, 'Bitcoin seed')")
print("And then applying the 3-level derivation m/44'/0'/0'")
print()
print("This would happen if:")
print("1. The deriveChildKeyForIndex function is being called")
print("2. Which applies HMAC first, then does 3-level derivation")
print("3. Instead of using the stored privateKey from wallet.dat import")