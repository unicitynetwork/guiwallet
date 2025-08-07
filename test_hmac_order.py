#!/usr/bin/env python3
"""
Test HMAC parameter order to match CryptoJS
"""

import hmac
import hashlib
from binascii import hexlify, unhexlify

# Test data
master_key = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"
bitcoin_seed = b"Bitcoin seed"

# In Python HMAC, the syntax is: hmac.new(key, msg, digestmod)
# BIP32 specifies: HMAC-SHA512(Key="Bitcoin seed", Data=master_key)

# Correct BIP32 way
h = hmac.new(bitcoin_seed, unhexlify(master_key), hashlib.sha512).digest()
result = hexlify(h).decode()

print("BIP32 HMAC-SHA512(Key='Bitcoin seed', Data=master_key):")
print("Result:", result)
print("Master key part:", result[:64])
print("Chain code part:", result[64:])
print()

# Expected values from our Python script
print("Expected master key after HMAC:", "2f351f201f210447430b18b1314abf16f8ab71d8d80dc48a02d98a670a4aa798")
print("Match:", result[:64] == "2f351f201f210447430b18b1314abf16f8ab71d8d80dc48a02d98a670a4aa798")