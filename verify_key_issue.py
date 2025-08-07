#!/usr/bin/env python3
"""
Check if there's something special about this key
"""

from binascii import hexlify, unhexlify

# The problematic private key
key = "e6c1f7f38ef252a24528f0e680f9c0450b359fbf630806020a2102c7d15909b7"

print(f"Private key: {key}")
print(f"Length: {len(key)} chars")

# Check if it's within the valid range
key_int = int(key, 16)
n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141

print(f"\nKey as integer: {key_int}")
print(f"Curve order n:  {n}")
print(f"Key < n: {key_int < n}")
print(f"Key is valid: {0 < key_int < n}")

# Check the bytes
key_bytes = unhexlify(key)
print(f"\nKey bytes: {hexlify(key_bytes)}")
print(f"First byte: 0x{key_bytes[0]:02x}")
print(f"Last byte: 0x{key_bytes[-1]:02x}")

# Wait, I just noticed something in the console output!
# Look at the key after level 2: e6c1f7f38ef252a24528f0e680f9c0450b359fbf630806020a2102c7d15909b7
# The Python correct pubkey is: 02a96e5e8c7b17e5a30ad7c13c6f4761e38e56d5c3beacdc89bec37e83a3034b7e
# Notice anything? The last part of the private key contains "02a2102c7d15909b7"
# And the pubkey starts with "02a9..."

print("\n=== WAIT! I SEE THE ISSUE! ===")
print("Look at the private key more carefully:")
print(key)
print("                                                      ^^^^^^^^^^^^^^^^^^")
print("It contains '02a2102c7' which looks like it might be part of a public key!")
print()
print("This suggests the key might be corrupted or there's a parsing issue.")

# Let's check our Python derivation
print("\nLet's verify our Python test that found the correct key...")
print("It says the key at level 3 should be: e6c1f7f38ef252a24528f0e680f9c0450b359fbf630806020a2102c7d15909b7")
print("But this looks suspicious with that '02' in the middle.")

# Actually, let me recompute the derivation to double-check
import hashlib
import hmac

master = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"
seed = hmac.new(b"Bitcoin seed", unhexlify(master), hashlib.sha512).digest()
key1 = hexlify(seed[:32]).decode()
chain1 = hexlify(seed[32:]).decode()

print(f"\nRechecking derivation:")
print(f"After seed: {key1}")

# m/44'
data = unhexlify('00' + key1) + (44 + 0x80000000).to_bytes(4, 'big')
h = hmac.new(unhexlify(chain1), data, hashlib.sha512).digest()
child_material = int.from_bytes(h[:32], 'big')
parent_int = int(key1, 16)
key2_int = (child_material + parent_int) % n
key2 = hex(key2_int)[2:].rjust(64, '0')
chain2 = hexlify(h[32:]).decode()

print(f"After 44': {key2}")

# m/44'/0'
data = unhexlify('00' + key2) + (0x80000000).to_bytes(4, 'big')
h = hmac.new(unhexlify(chain2), data, hashlib.sha512).digest()
child_material = int.from_bytes(h[:32], 'big')
parent_int = int(key2, 16)
key3_int = (child_material + parent_int) % n
key3 = hex(key3_int)[2:].rjust(64, '0')
chain3 = hexlify(h[32:]).decode()

print(f"After 44'/0': {key3}")

# m/44'/0'/0'
data = unhexlify('00' + key3) + (0x80000000).to_bytes(4, 'big')
h = hmac.new(unhexlify(chain3), data, hashlib.sha512).digest()
child_material = int.from_bytes(h[:32], 'big')
parent_int = int(key3, 16)
key4_int = (child_material + parent_int) % n
key4 = hex(key4_int)[2:].rjust(64, '0')

print(f"After 44'/0'/0': {key4}")
print(f"Expected: e6c1f7f38ef252a24528f0e680f9c0450b359fbf630806020a2102c7d15909b7")
print(f"Match: {key4 == key}")