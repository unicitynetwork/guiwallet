#!/usr/bin/env python3
"""
Find where JavaScript diverges from Python
"""

import hashlib
import hmac
from binascii import hexlify, unhexlify

# The derivation steps from JavaScript console
js_steps = [
    ("Initial", "2f351f201f210447430b18b1314abf16f8ab71d8d80dc48a02d98a670a4aa798"),
    ("After 44'", "09eb9c381b9ea244842f88505a9206dbc240ec6ec0984582d72d945a1b28ba8e"),
    ("After 0'", "e8374aa2596addb940ad27caab30df7c5164f50b25a927ea6e451f71e0014baa"),
    ("After 0'", "e6c1f7f38ef252a24528f0e680f9c0450b359fbf630806020a2102c7d15909b7"),
    ("After 0", "4972f92b81798815d507883566c1e71ef9295dc04fa206d53ca9424bf5675e4f"),
    ("After 0", "c96167c899bd776e34b41f2025a2a97a8de9bec2009fa2bd32aebe54ffae3980")
]

# Python correct derivation (from find_correct_derivation.py)
python_final = "f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726"

print("=== Comparing JavaScript vs Expected ===\n")

for i, (label, js_key) in enumerate(js_steps):
    print(f"{label}: {js_key}")
    
print(f"\nExpected final: {python_final}")
print(f"JS got:         {js_steps[-1][1]}")

# The issue starts at level 4 (first non-hardened)
print("\n=== The divergence point ===")
print("After 3 hardened levels, both have: e6c1f7f38ef252a24528f0e680f9c0450b359fbf630806020a2102c7d15909b7")
print("Then for the first non-hardened (index 0):")
print("- JS gets:  4972f92b81798815d507883566c1e71ef9295dc04fa206d53ca9424bf5675e4f")
print("- Should get: ???")

print("\n=== The issue ===")
print("JavaScript is using a different public key for the non-hardened derivation.")
print("This causes the entire chain to diverge.")

# Let me see what the intermediate Python values should be
print("\n=== What Python should get ===")
print("We need to run the full Python derivation with proper public key generation")