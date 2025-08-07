#!/usr/bin/env python3
"""
Debug the JavaScript BIP32 implementation
"""

import hashlib
import hmac
from binascii import hexlify, unhexlify

# Our wallet data
master_key = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"

# Step 1: What the JS code does
print("=== JavaScript Implementation Debug ===\n")

# Initial HMAC - JS: CryptoJS.HmacSHA512(message, key)
# In Python: hmac.new(key, message, hashlib.sha512)
# So JS: HmacSHA512(masterKey, "Bitcoin seed") 
# equals Python: hmac.new(b"Bitcoin seed", masterKey)

seed = hmac.new(b"Bitcoin seed", unhexlify(master_key), hashlib.sha512).digest()
js_current_key = hexlify(seed[:32]).decode()
js_current_chain = hexlify(seed[32:]).decode()

print(f"After initial HMAC:")
print(f"  Key: {js_current_key}")
print(f"  Chain: {js_current_chain}")

# Now let's trace through one hardened derivation
index = 44 + 0x80000000  # 44'
data_hex = '00' + js_current_key + hex(index)[2:].rjust(8, '0')
print(f"\nFirst derivation (44'):")
print(f"  Index: {hex(index)}")
print(f"  Data: {data_hex}")

# The JS code does: CryptoJS.HmacSHA512(data, chainCode)
# This is backwards! BIP32 spec says HMAC-SHA512(Key=chainCode, Data=data)

# What JS is doing (wrong):
js_hmac = hmac.new(unhexlify(data_hex), unhexlify(js_current_chain), hashlib.sha512).digest()
print(f"  JS HMAC (wrong): {hexlify(js_hmac).decode()}")

# What it should do:
correct_hmac = hmac.new(unhexlify(js_current_chain), unhexlify(data_hex), hashlib.sha512).digest()
print(f"  Correct HMAC: {hexlify(correct_hmac).decode()}")

print("\n=== The Bug ===")
print("The JavaScript code has the HMAC parameters backwards!")
print("It's doing: HMAC(Key=data, Message=chainCode)")
print("Should be: HMAC(Key=chainCode, Message=data)")
print("\nThis is why it's deriving the wrong keys!")