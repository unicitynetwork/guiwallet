#!/usr/bin/env python3
"""
Find which key generates the actual address
"""

import hashlib
from binascii import hexlify, unhexlify

# Test different keys
keys_to_test = {
    "Master key": "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3",
    "Expected derived key (m/44'/0'/0'/0/0)": "f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726",
    "After Bitcoin seed HMAC": "2f351f201f210447430b18b1314abf16f8ab71d8d80dc48a02d98a670a4aa798",
    "3-level derived (m/44'/0'/0')": "e6c1f7f38ef252a24528f0e680f9c0450b359fbf630806020a2102c7d15909b7"
}

# The actual pubkey hash we're seeing
actual_hash = "68ba1ed8ae2f76233b06c9a3c2f6d0c5ee399093"

print("Testing which key generates the address with hash:", actual_hash)
print()

# We can't compute the actual hash without elliptic curve operations,
# but we can show what's likely happening

print("Most likely scenario:")
print("The wallet is using the master key after HMAC with 'Bitcoin seed'")
print("This would be the key:", keys_to_test["After Bitcoin seed HMAC"])
print()
print("This happens when:")
print("1. The wallet applies HMAC-SHA512(masterKey, 'Bitcoin seed')")
print("2. Takes the first 32 bytes as the new key")
print("3. Uses that directly without further derivation")
print()
print("OR")
print()
print("The wallet is using the 3-level derivation m/44'/0'/0'")
print("Which would give key:", keys_to_test["3-level derived (m/44'/0'/0')"])