#!/usr/bin/env python3
"""
Check what's happening with the elliptic library
"""

from binascii import hexlify, unhexlify

# The private key
priv_key = "f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726"

# Expected vs actual public keys
expected_pub = "02006abf41ba147951f55579a2f7d3683f7334e9466df8ffa38a486813651ffb77"
js_pub = "030857ac684e2005b877f42edc83a1506cf00147f97a63ac6c5988f3268e26db21"

print("Private key:", priv_key)
print("Expected public key:", expected_pub)
print("JavaScript public key:", js_pub)
print()

# Extract X coordinates
expected_x = expected_pub[2:]  # Remove 02 prefix
js_x = js_pub[2:]              # Remove 03 prefix

print("Expected X:", expected_x)
print("JS X:      ", js_x)
print("X coordinates match:", expected_x == js_x)
print()

# The prefixes
print("Expected prefix: 02 (even Y)")
print("JS prefix:       03 (odd Y)")
print()

print("=== DIAGNOSIS ===")
print("The X coordinates are completely different!")
print("This means the elliptic library is computing a different public key")
print("from the same private key.")
print()

# Check if there's an endianness issue
priv_key_reversed = hexlify(unhexlify(priv_key)[::-1]).decode()
print("Private key reversed:", priv_key_reversed)
print()

# Or maybe the library expects a different format?
print("Possible issues:")
print("1. The elliptic library has a bug")
print("2. The private key needs different formatting")
print("3. There's a version mismatch")
print()

# Let me check the actual values
print("Private key as integer:", int(priv_key, 16))
print("Is it valid? (< n):", int(priv_key, 16) < 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141)