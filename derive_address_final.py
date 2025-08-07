#!/usr/bin/env python3
"""
Derive addresses using the exact method from the web wallet
"""

import hashlib
import hmac
from binascii import hexlify, unhexlify

# Bech32 encoding
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
    spec = convertbits(list(witprog), 8, 5)
    if spec is None:
        return None
    return bech32_encode(hrp, [witver] + spec)

def derive_address_webwallet_method(master_private_key, address_index=0):
    """Derive address using the exact method from the web wallet"""
    
    # Step 1: Create seed from master private key using HMAC-SHA512
    seed_hmac = hmac.new(b"Bitcoin seed", unhexlify(master_private_key), hashlib.sha512).digest()
    
    # Extract master private key and chain code
    current_key = hexlify(seed_hmac[:32]).decode()
    current_chain_code = hexlify(seed_hmac[32:]).decode()
    
    print(f"Master private key: {master_private_key}")
    print(f"After HMAC with 'Bitcoin seed':")
    print(f"  Derived key: {current_key}")
    print(f"  Chain code: {current_chain_code}")
    
    # BIP32 constants
    HARDENED_OFFSET = 0x80000000
    
    # Path components: m/44'/0'/index'
    # But wait! The wallet.dat shows coin_type=1 (testnet), not 0!
    # Let's try both paths
    paths_to_try = [
        ([44 + HARDENED_OFFSET, 0 + HARDENED_OFFSET, address_index + HARDENED_OFFSET], "m/44'/0'/0' (mainnet)"),
        ([44 + HARDENED_OFFSET, 1 + HARDENED_OFFSET, address_index + HARDENED_OFFSET], "m/44'/1'/0' (testnet)"),
        ([84 + HARDENED_OFFSET, 1 + HARDENED_OFFSET, address_index + HARDENED_OFFSET], "m/84'/1'/0' (segwit testnet)"),
    ]
    
    for path_components, path_name in paths_to_try:
        print(f"\n\nTrying path: {path_name}")
        
        temp_key = current_key
        temp_chain_code = current_chain_code
        
        for i, index in enumerate(path_components):
            # Hardened derivation: 0x00 || parent_private_key || index
            data = unhexlify('00' + temp_key + index.to_bytes(4, 'big').hex())
            
            # HMAC-SHA512(parent_chain_code, data)
            hmac_result = hmac.new(unhexlify(temp_chain_code), data, hashlib.sha512).digest()
            
            # Split result
            child_key_material = hmac_result[:32]
            temp_chain_code = hexlify(hmac_result[32:]).decode()
            
            # Add parent private key to child key material (modulo curve order)
            child_key_int = int.from_bytes(child_key_material, 'big')
            parent_key_int = int.from_bytes(unhexlify(temp_key), 'big')
            
            # secp256k1 curve order
            curve_order = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
            
            # Add and take modulo
            sum_keys = (child_key_int + parent_key_int) % curve_order
            
            # Convert back to hex string
            temp_key = hex(sum_keys)[2:].zfill(64)
            
            print(f"  After index {index}: {temp_key[:16]}...")
        
        # Now generate address from the final derived key
        # We need to generate the public key (we'll use the known one for now)
        # In reality, we'd use elliptic curve multiplication
        
        # For the correct derivation, the public key should give us the expected hash
        print(f"  Final private key: {temp_key}")
        
        # Generate address (we know the expected public key hash)
        # For the address alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz
        # The hash is: d571e66f22601b58fea87dd07ff95c5af0f86298
        
        # Let's check if this could be our key by seeing if it's mentioned in any online tools

def main():
    master_key = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"
    
    print("=== Web Wallet Derivation Method ===")
    print(f"Expected address: alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz")
    print(f"Expected pubkey hash: d571e66f22601b58fea87dd07ff95c5af0f86298")
    
    derive_address_webwallet_method(master_key, 0)
    
    print("\n\n=== IMPORTANT REALIZATION ===")
    print("The wallet.dat contains descriptors for TESTNET (coin_type=1)")
    print("But the web wallet might be using MAINNET paths (coin_type=0)")
    print("OR the address might be from a different index than 0")
    print("\nThe address alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz IS in the wallet")
    print("So the private key MUST be derivable from the master key we found")

if __name__ == "__main__":
    main()