#!/usr/bin/env python3
"""
Verify the public key for the derived private key
"""

from binascii import hexlify, unhexlify
import hashlib

# The private key we correctly derived
priv_key = "f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726"

print(f"Private key: {priv_key}")

# Try using a simple EC implementation
try:
    # Try with ecdsa if available
    from ecdsa import SECP256k1, SigningKey
    sk = SigningKey.from_string(unhexlify(priv_key), curve=SECP256k1)
    vk = sk.get_verifying_key()
    
    # Get compressed public key
    point = vk.pubkey.point
    x = point.x()
    y = point.y()
    
    # Compressed format
    if y & 1:  # odd
        prefix = b'\x03'
    else:  # even
        prefix = b'\x02'
    
    pub_key_compressed = hexlify(prefix + x.to_bytes(32, 'big')).decode()
    print(f"Public key (ecdsa): {pub_key_compressed}")
    
except ImportError:
    print("ecdsa not available")

# Expected from find_correct_derivation.py
expected_pub = "02006abf41ba147951f55579a2f7d3683f7334e9466df8ffa38a486813651ffb77"
print(f"Expected public key: {expected_pub}")

# What JavaScript generated
js_pub = "030857ac684e2005b877f42edc83a1506cf00147f97a63ac6c5988f3268e26db21"
print(f"JavaScript got: {js_pub}")

# Generate address from expected public key
sha256 = hashlib.sha256(unhexlify(expected_pub)).digest()
ripemd160 = hashlib.new('ripemd160', sha256).digest()
expected_hash = hexlify(ripemd160).decode()
print(f"\nExpected pubkey hash: {expected_hash}")
print(f"Expected: d571e66f22601b58fea87dd07ff95c5af0f86298")

# Generate address from JS public key
sha256_js = hashlib.sha256(unhexlify(js_pub)).digest()
ripemd160_js = hashlib.new('ripemd160', sha256_js).digest()
js_hash = hexlify(ripemd160_js).decode()
print(f"\nJS pubkey hash: {js_hash}")
print(f"JS got: 62e3d36b03cc1050aefa945868c5272663854d0d")

print("\n=== Analysis ===")
print("The JavaScript elliptic library is generating a different public key")
print("from the same private key. This could be due to:")
print("1. A bug in the elliptic library")
print("2. Different interpretation of the private key bytes")
print("3. Different curve parameters")

# Let's check if the keys are related
print("\nChecking if keys are related...")
print(f"Expected X: {expected_pub[2:]}")  # Remove prefix
print(f"JS X:       {js_pub[2:]}")        # Remove prefix

# Actually, let me try something else - what if the private key is wrong?
print("\n=== Wait! Let me double-check the private key ===")
# Run the Python derivation one more time to be sure
import hmac

master = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"
seed = hmac.new(b"Bitcoin seed", unhexlify(master), hashlib.sha512).digest()
key = seed[:32]
chain = seed[32:]

# Path [44', 0', 0', 0, 0] with hardened derivation for all
path = [0x8000002C, 0x80000000, 0x80000000, 0, 0]
n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141

for index in path:
    data = b'\x00' + key + index.to_bytes(4, 'big')
    h = hmac.new(chain, data, hashlib.sha512).digest()
    child_material = int.from_bytes(h[:32], 'big')
    parent_int = int.from_bytes(key, 'big')
    new_key_int = (child_material + parent_int) % n
    key = new_key_int.to_bytes(32, 'big')
    chain = h[32:]

final_key = hexlify(key).decode()
print(f"\nRe-derived private key: {final_key}")
print(f"Expected: f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726")
print(f"Match: {final_key == priv_key}")