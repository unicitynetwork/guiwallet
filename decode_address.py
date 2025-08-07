#!/usr/bin/env python3
"""
Decode the actual address to see what private key generated it
"""

from binascii import hexlify, unhexlify

# Bech32 decoding
CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"

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
    if any(x < 0 for x in data):
        return (None, None)
    return (hrp, data[:-6])  # Remove checksum

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

# Decode the addresses
actual_address = "alpha1qdzapak9w9amzxwcxex3u9akschhrnyynafnjfg"
expected_address = "alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz"

print("=== Address Analysis ===\n")

witver1, witprog1 = decode_segwit_address(actual_address)
if witprog1:
    hash1 = hexlify(bytes(witprog1)).decode()
    print(f"Actual address: {actual_address}")
    print(f"  Witness version: {witver1}")
    print(f"  PubKey hash: {hash1}")

print()

witver2, witprog2 = decode_segwit_address(expected_address)
if witprog2:
    hash2 = hexlify(bytes(witprog2)).decode()
    print(f"Expected address: {expected_address}")
    print(f"  Witness version: {witver2}")
    print(f"  PubKey hash: {hash2}")

print("\n=== Analysis ===")
print("The actual address has a different pubkey hash, meaning:")
print("1. A different private key is being used")
print("2. Most likely the master key is being used directly")
print("3. Or the wallet is using the 3-level derivation path instead of 5-level")