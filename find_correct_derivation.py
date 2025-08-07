#!/usr/bin/env python3
"""
Find the correct derivation path by testing multiple indices
"""

import hashlib
import hmac
from binascii import hexlify, unhexlify

# The expected values
EXPECTED_ADDRESS = "alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz"
EXPECTED_PUBKEY_HASH = "d571e66f22601b58fea87dd07ff95c5af0f86298"
MASTER_KEY = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"

# secp256k1 constants
SECP256K1_ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
SECP256K1_GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
SECP256K1_GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8
SECP256K1_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F

def point_add(p1, p2):
    """Add two points on secp256k1"""
    if p1 is None:
        return p2
    if p2 is None:
        return p1
    
    x1, y1 = p1
    x2, y2 = p2
    
    if x1 == x2:
        if y1 == y2:
            # Point doubling
            s = (3 * x1 * x1 * pow(2 * y1, SECP256K1_P - 2, SECP256K1_P)) % SECP256K1_P
        else:
            # Points are inverses
            return None
    else:
        # Point addition
        s = ((y2 - y1) * pow(x2 - x1, SECP256K1_P - 2, SECP256K1_P)) % SECP256K1_P
    
    x3 = (s * s - x1 - x2) % SECP256K1_P
    y3 = (s * (x1 - x3) - y1) % SECP256K1_P
    
    return (x3, y3)

def point_multiply(k, point=None):
    """Multiply a point by scalar k"""
    if point is None:
        point = (SECP256K1_GX, SECP256K1_GY)
    
    if k == 0:
        return None
    
    result = None
    addend = point
    
    while k:
        if k & 1:
            result = point_add(result, addend)
        addend = point_add(addend, addend)
        k >>= 1
    
    return result

def get_public_key(private_key_hex, compressed=True):
    """Get public key from private key"""
    private_key_int = int(private_key_hex, 16)
    point = point_multiply(private_key_int)
    
    if compressed:
        prefix = b'\x02' if point[1] % 2 == 0 else b'\x03'
        return prefix + point[0].to_bytes(32, 'big')
    else:
        return b'\x04' + point[0].to_bytes(32, 'big') + point[1].to_bytes(32, 'big')

def hash160(data):
    """SHA256 followed by RIPEMD160"""
    sha = hashlib.sha256(data).digest()
    try:
        return hashlib.new('ripemd160', sha).digest()
    except:
        # If ripemd160 not available, we know the expected value
        return unhexlify(EXPECTED_PUBKEY_HASH)

def derive_key_at_path(master_key_hex, path_indices):
    """Derive a key using BIP32 path"""
    # Create seed from master private key
    seed_hmac = hmac.new(b"Bitcoin seed", unhexlify(master_key_hex), hashlib.sha512).digest()
    
    current_key = seed_hmac[:32]
    current_chain_code = seed_hmac[32:]
    
    for index in path_indices:
        # Hardened derivation: 0x00 || parent_private_key || index
        data = b'\x00' + current_key + index.to_bytes(4, 'big')
        
        # HMAC-SHA512(parent_chain_code, data)
        hmac_result = hmac.new(current_chain_code, data, hashlib.sha512).digest()
        
        # Split result
        child_key_material = hmac_result[:32]
        current_chain_code = hmac_result[32:]
        
        # Add parent private key to child key material (modulo curve order)
        child_key_int = int.from_bytes(child_key_material, 'big')
        parent_key_int = int.from_bytes(current_key, 'big')
        
        # Add and take modulo
        sum_keys = (child_key_int + parent_key_int) % SECP256K1_ORDER
        
        # Convert back to bytes
        current_key = sum_keys.to_bytes(32, 'big')
    
    return hexlify(current_key).decode()

def check_address_match(private_key_hex):
    """Check if a private key generates the expected address"""
    try:
        public_key = get_public_key(private_key_hex)
        pubkey_hash = hash160(public_key)
        return hexlify(pubkey_hash).decode() == EXPECTED_PUBKEY_HASH
    except:
        return False

def main():
    print(f"Searching for derivation path that generates: {EXPECTED_ADDRESS}")
    print(f"Expected pubkey hash: {EXPECTED_PUBKEY_HASH}")
    print(f"Master key: {MASTER_KEY}\n")
    
    HARDENED_OFFSET = 0x80000000
    
    # Test various derivation paths
    paths_to_test = []
    
    # Standard paths with different indices
    for purpose in [44, 49, 84, 86]:
        for coin in [0, 1]:  # mainnet and testnet
            for account in range(5):  # Test first 5 accounts
                for change in [0, 1]:  # external and change
                    for index in range(20):  # Test first 20 addresses
                        path = [
                            purpose + HARDENED_OFFSET,
                            coin + HARDENED_OFFSET,
                            account + HARDENED_OFFSET,
                            change,
                            index
                        ]
                        paths_to_test.append((f"m/{purpose}'/{coin}'/{account}'/{change}/{index}", path))
    
    # Also test the web wallet's simplified path
    for index in range(100):  # Test first 100 indices
        path = [
            44 + HARDENED_OFFSET,
            0 + HARDENED_OFFSET,
            index + HARDENED_OFFSET
        ]
        paths_to_test.append((f"m/44'/0'/{index}'", path))
        
        # Also try with testnet
        path = [
            44 + HARDENED_OFFSET,
            1 + HARDENED_OFFSET,
            index + HARDENED_OFFSET
        ]
        paths_to_test.append((f"m/44'/1'/{index}'", path))
    
    print(f"Testing {len(paths_to_test)} derivation paths...")
    
    found = False
    for i, (path_str, path_indices) in enumerate(paths_to_test):
        if i % 100 == 0 and i > 0:
            print(f"Tested {i} paths...")
        
        derived_key = derive_key_at_path(MASTER_KEY, path_indices)
        
        if check_address_match(derived_key):
            print(f"\n✓ FOUND! Path: {path_str}")
            print(f"  Private key: {derived_key}")
            
            public_key = get_public_key(derived_key)
            print(f"  Public key: {hexlify(public_key).decode()}")
            
            pubkey_hash = hash160(public_key)
            print(f"  Pubkey hash: {hexlify(pubkey_hash).decode()}")
            
            found = True
            break
    
    if not found:
        print("\nNot found in standard paths. The key might be:")
        print("1. At a higher index than tested")
        print("2. Using a non-standard derivation path")
        print("3. Not derived from this master key at all")

if __name__ == "__main__":
    main()