#!/usr/bin/env python3
"""
Analyze what the JavaScript is doing wrong
"""

import hashlib
import hmac
from binascii import hexlify, unhexlify

def correct_bip32_derivation():
    """The correct BIP32 derivation that produces the expected key"""
    master_key = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"
    
    # Initial seed
    seed = hmac.new(b"Bitcoin seed", unhexlify(master_key), hashlib.sha512).digest()
    current_key = hexlify(seed[:32]).decode()
    current_chain = hexlify(seed[32:]).decode()
    
    print("=== Correct BIP32 Derivation ===")
    print(f"Initial key: {current_key}")
    print(f"Initial chain: {current_chain}")
    
    # Path m/44'/0'/0'/0/0
    path = [0x8000002C, 0x80000000, 0x80000000, 0, 0]
    
    for i, index in enumerate(path):
        # Prepare data
        if index >= 0x80000000:
            # Hardened: 0x00 || private_key || index
            data = unhexlify('00' + current_key) + index.to_bytes(4, 'big')
        else:
            # Non-hardened would need public key - skip for now
            print("Non-hardened derivation needs implementation")
            return
            
        # HMAC with chain code as key
        h = hmac.new(unhexlify(current_chain), data, hashlib.sha512).digest()
        
        # Extract new key material and chain code
        new_key_material = h[:32]
        new_chain = h[32:]
        
        # Add to current key (mod n)
        n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
        new_key_int = (int.from_bytes(new_key_material, 'big') + int(current_key, 16)) % n
        
        current_key = hex(new_key_int)[2:].rjust(64, '0')
        current_chain = hexlify(new_chain).decode()
        
        print(f"\nAfter index {hex(index)}:")
        print(f"  Key: {current_key}")
    
    print(f"\nFinal key: {current_key}")
    print(f"Expected: f3f19a6c29abaa38fce2d00ac8737fcb50bc52720ddf67d8c59caf0bd0af6726")
    return current_key

def what_js_is_doing():
    """What the JavaScript code is actually doing"""
    master_key = "44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3"
    
    # Initial seed - this part is correct
    seed = hmac.new(b"Bitcoin seed", unhexlify(master_key), hashlib.sha512).digest()
    current_key = hexlify(seed[:32]).decode()
    current_chain = hexlify(seed[32:]).decode()
    
    print("\n=== What JavaScript is Doing ===")
    print(f"Initial key: {current_key}")
    print(f"Initial chain: {current_chain}")
    
    # First derivation (44')
    index = 0x8000002C
    data_hex = '00' + current_key + hex(index)[2:].rjust(8, '0')
    
    # The bug: JS might have parameters in wrong order
    # Let's test both ways
    print(f"\nTesting index {hex(index)}:")
    print(f"Data: {data_hex}")
    
    # Correct way: HMAC(key=chain, data=data)
    h_correct = hmac.new(unhexlify(current_chain), unhexlify(data_hex), hashlib.sha512).digest()
    print(f"Correct HMAC: {hexlify(h_correct).decode()}")
    
    # Wrong way: HMAC(key=data, data=chain) - this might be what JS is doing
    h_wrong = hmac.new(unhexlify(data_hex), unhexlify(current_chain), hashlib.sha512).digest()
    print(f"Wrong HMAC: {hexlify(h_wrong).decode()}")

# Run both analyses
correct_key = correct_bip32_derivation()
what_js_is_doing()