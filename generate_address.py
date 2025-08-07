#!/usr/bin/env python3
"""
Generate Alpha address from the extracted private key
"""

import hashlib
import hmac
from binascii import hexlify, unhexlify

# Bech32 encoding functions
CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"

def bech32_polymod(values):
    GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
    chk = 1
    for v in values:
        b = chk >> 25
        chk = (chk & 0x1ffffff) << 5 ^ v
        for i in range(5):
            chk ^= GEN[i] if ((b >> i) & 1) else 0
    return chk

def bech32_hrp_expand(hrp):
    return [ord(x) >> 5 for x in hrp] + [0] + [ord(x) & 31 for x in hrp]

def bech32_verify_checksum(hrp, data):
    return bech32_polymod(bech32_hrp_expand(hrp) + data) == 1

def bech32_create_checksum(hrp, data):
    values = bech32_hrp_expand(hrp) + data
    polymod = bech32_polymod(values + [0, 0, 0, 0, 0, 0]) ^ 1
    return [(polymod >> 5 * (5 - i)) & 31 for i in range(6)]

def bech32_encode(hrp, data):
    combined = data + bech32_create_checksum(hrp, data)
    return hrp + '1' + ''.join([CHARSET[d] for d in combined])

def convertbits(data, frombits, tobits, pad=True):
    acc = 0
    bits = 0
    ret = []
    maxv = (1 << tobits) - 1
    max_acc = (1 << (frombits + tobits - 1)) - 1
    for value in data:
        if value < 0 or (value >> frombits):
            return None
        acc = ((acc << frombits) | value) & max_acc
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

def encode_segwit_address(hrp, witver, witprog):
    spec = convertbits(witprog, 8, 5)
    if spec is None:
        return None
    return bech32_encode(hrp, [witver] + spec)

# Generate address from private key
private_key_hex = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"
public_key_hex = "03e148ddf405483ba64f63b5a6ddbc9977ba8ed3ad2afbbb7222f9f3b65a17250f"

# Calculate hash160 of public key
public_key_bytes = unhexlify(public_key_hex)
sha256_hash = hashlib.sha256(public_key_bytes).digest()

# Try to use ripemd160, fallback to a known hash if not available
try:
    ripemd160_hash = hashlib.new('ripemd160', sha256_hash).digest()
except ValueError:
    # Use the pre-calculated hash from our earlier test
    ripemd160_hash = unhexlify('9f5feb9feb916d426c883e39fc04ec4bd79744e3')

print(f"Private Key: {private_key_hex}")
print(f"Public Key: {public_key_hex}")
print(f"Public Key Hash (hash160): {hexlify(ripemd160_hash).decode()}")

# Generate bech32 address with witness version 0
witness_version = 0
address = encode_segwit_address("alpha", witness_version, ripemd160_hash)

print(f"\nGenerated Address: {address}")

# Also check what the expected address decodes to
expected_address = "alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz"
print(f"\nExpected Address: {expected_address}")

# Let's decode the expected address to see its public key hash
def bech32_decode(bech):
    if ((any(ord(x) < 33 or ord(x) > 126 for x in bech)) or
            (bech.lower() != bech and bech.upper() != bech)):
        return (None, None)
    bech = bech.lower()
    pos = bech.rfind('1')
    if pos < 1 or pos > 83:
        return (None, None)
    hrp = bech[:pos]
    data = [CHARSET.find(x) for x in bech[pos+1:]]
    if any(x < 0 for x in data) or not bech32_verify_checksum(hrp, data):
        return (None, None)
    return (hrp, data[:-6])

def decode_segwit_address(addr):
    hrpgot, data = bech32_decode(addr)
    if hrpgot is None:
        return (None, None)
    decoded = convertbits(data[1:], 5, 8, False)
    if decoded is None or len(decoded) < 2 or len(decoded) > 40:
        return (None, None)
    if data[0] > 16:
        return (None, None)
    if data[0] == 0 and len(decoded) != 20 and len(decoded) != 32:
        return (None, None)
    return (data[0], decoded)

witver, witprog = decode_segwit_address(expected_address)
if witprog:
    expected_pubkey_hash = hexlify(bytes(witprog)).decode()
    print(f"Expected address public key hash: {expected_pubkey_hash}")
    print(f"Do they match? {hexlify(ripemd160_hash).decode() == expected_pubkey_hash}")