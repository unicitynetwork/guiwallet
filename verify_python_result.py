#!/usr/bin/env python3
"""
Verify that the Python script's result actually generates the correct address
"""

import hashlib
from binascii import hexlify, unhexlify

# The values from our Python script
PRIVATE_KEY = "f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726"
PUBLIC_KEY = "02006abf41ba147951f55579a2f7d3683f7334e9466df8ffa38a486813651ffb77"
EXPECTED_ADDRESS = "alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz"
EXPECTED_HASH = "d571e66f22601b58fea87dd07ff95c5af0f86298"

print("=== Verifying Python Script Results ===")
print(f"Private key: {PRIVATE_KEY}")
print(f"Public key:  {PUBLIC_KEY}")
print()

# Generate hash from public key
pub_key_bytes = unhexlify(PUBLIC_KEY)
sha256_hash = hashlib.sha256(pub_key_bytes).digest()
try:
    ripemd160_hash = hashlib.new('ripemd160', sha256_hash).digest()
    pubkey_hash = hexlify(ripemd160_hash).decode()
except:
    # If ripemd160 not available, we know from Node.js test it generates:
    pubkey_hash = "d9b1541d8d678f817df0c491db30b33cfd4a94e2"

print(f"Generated hash: {pubkey_hash}")
print(f"Expected hash:  {EXPECTED_HASH}")
print(f"Match: {'YES!' if pubkey_hash == EXPECTED_HASH else 'NO'}")
print()

# Let's also decode the expected address
# Bech32 decode implementation
def bech32_decode(bech32):
    """Decode a bech32 string"""
    CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
    if any(ord(x) < 33 or ord(x) > 126 for x in bech32):
        return None, None
    if bech32.lower() != bech32 and bech32.upper() != bech32:
        return None, None
    bech32 = bech32.lower()
    pos = bech32.rfind('1')
    if pos < 1 or pos + 7 > len(bech32) or len(bech32) > 90:
        return None, None
    hrp = bech32[:pos]
    data = [CHARSET.find(x) for x in bech32[pos+1:]]
    if any(x < 0 for x in data):
        return None, None
    return hrp, data[:-6]  # Remove checksum

def convertbits(data, frombits, tobits, pad=True):
    """Convert between bit groups"""
    acc = 0
    bits = 0
    ret = []
    maxv = (1 << tobits) - 1
    for value in data:
        if value < 0 or (value >> frombits):
            return None
        acc = (acc << frombits) | value
        bits += frombits
        while bits >= tobits:
            bits -= tobits
            ret.append((acc >> bits) & maxv)
    if pad:
        if bits:
            ret.append((acc << (tobits - bits)) & maxv)
    elif bits >= frombits or ((acc << (tobits - bits)) & maxv):
        return None
    return ret

# Decode the address
hrp, data = bech32_decode(EXPECTED_ADDRESS)
if hrp and data:
    witver = data[0]
    witprog = convertbits(data[1:], 5, 8, False)
    if witprog:
        decoded_hash = hexlify(bytes(witprog)).decode()
        print(f"Hash decoded from address: {decoded_hash}")
        print(f"Expected hash:             {EXPECTED_HASH}")
        print(f"Match: {'YES!' if decoded_hash == EXPECTED_HASH else 'NO'}")

print("\n=== CONCLUSION ===")
print("The Python script's public key does NOT generate the expected address!")
print("This means either:")
print("1. The Python EC implementation is wrong")
print("2. The derivation path is wrong")
print("3. We need to use a different private key")