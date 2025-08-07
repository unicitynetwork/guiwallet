#!/usr/bin/env python3
"""
Debug the exact Python derivation that finds the correct key
"""

import hashlib
import hmac
from binascii import hexlify, unhexlify

# Constants
SECP256K1_ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141

def derive_step_by_step():
    """Step by step derivation matching what find_correct_derivation.py does"""
    master_key_hex = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"
    
    # Create seed from master private key
    seed_hmac = hmac.new(b"Bitcoin seed", unhexlify(master_key_hex), hashlib.sha512).digest()
    
    current_key = seed_hmac[:32]
    current_chain_code = seed_hmac[32:]
    
    print("=== Python Derivation (matching find_correct_derivation.py) ===")
    print(f"Master key: {master_key_hex}")
    print(f"After seed: key={hexlify(current_key).decode()}")
    print(f"           chain={hexlify(current_chain_code).decode()}")
    
    # Path indices for m/44'/0'/0'/0/0
    # But the Python script treats ALL as hardened!
    path_indices = [
        44 + 0x80000000,  # 44'
        0 + 0x80000000,   # 0'
        0 + 0x80000000,   # 0'
        0,                # 0 (but treated as hardened!)
        0                 # 0 (but treated as hardened!)
    ]
    
    for i, index in enumerate(path_indices):
        index_str = str(index) if index < 0x80000000 else str(index - 0x80000000) + "'"
        print(f"\nLevel {i} (index {index_str}):")
        
        # The Python script ALWAYS uses hardened derivation
        data = b'\x00' + current_key + index.to_bytes(4, 'big')
        print(f"  Data: {hexlify(data).decode()}")
        
        # HMAC-SHA512(parent_chain_code, data)
        hmac_result = hmac.new(current_chain_code, data, hashlib.sha512).digest()
        print(f"  HMAC: {hexlify(hmac_result).decode()}")
        
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
        
        print(f"  Result: {hexlify(current_key).decode()}")
    
    final_key = hexlify(current_key).decode()
    print(f"\nFinal key: {final_key}")
    print(f"Expected: f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726")
    print(f"Match: {final_key == 'f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726'}")
    
    # Compare with JavaScript results
    js_results = {
        "After seed": "2f351f201f210447430b18b1314abf16f8ab71d8d80dc48a02d98a670a4aa798",
        "After 44'": "09eb9c381b9ea244842f88505a9206dbc240ec6ec0984582d72d945a1b28ba8e",
        "After 0'": "e8374aa2596addb940ad27caab30df7c5164f50b25a927ea6e451f71e0014baa",
        "After 0'": "e6c1f7f38ef252a24528f0e680f9c0450b359fbf630806020a2102c7d15909b7",
        "After 0' (4th)": "57a6e5efec84990fdfbc221d2011d8ca2a3d0185ad45b58469130a04c09474c1",
        "After 0' (5th)": "c19be7ba92a3fa78089244b8d75d7a61cb67eb61ae49a9afbd4f268b6face04a"
    }
    
    print("\n=== Comparing with JavaScript ===")
    print("JS After 3rd level: e6c1f7f38ef252a24528f0e680f9c0450b359fbf630806020a2102c7d15909b7")
    print("Py After 3rd level: Should match above")
    print("\nThe divergence happens at level 4!")

# Run it
derive_step_by_step()