#!/usr/bin/env python3
"""
Parse wallet descriptors to understand the derivation paths
"""

import sqlite3
from binascii import hexlify, unhexlify
import re

def parse_wallet_descriptors(wallet_path):
    """Parse wallet descriptors to understand derivation"""
    conn = sqlite3.connect(wallet_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT key, value FROM main")
    entries = cursor.fetchall()
    
    print("=== WALLET DESCRIPTOR ANALYSIS ===\n")
    
    # Find all wallet descriptors
    descriptors = []
    for key_blob, value_blob in entries:
        if b'walletdescriptor' in key_blob and b'key' not in key_blob and b'cache' not in key_blob:
            # Extract descriptor string
            desc_str = ""
            for i in range(32, len(value_blob)):  # Skip first 32 bytes
                b = value_blob[i]
                if 32 <= b <= 126:  # Printable ASCII
                    desc_str += chr(b)
                elif desc_str and len(desc_str) > 10:  # End of descriptor
                    break
            
            if desc_str:
                descriptors.append({
                    'key': hexlify(key_blob).decode(),
                    'descriptor_id': hexlify(key_blob[19:51]).decode(),
                    'string': desc_str
                })
    
    # Parse each descriptor
    for desc in descriptors:
        print(f"Descriptor ID: {desc['descriptor_id']}")
        print(f"Descriptor: {desc['string']}")
        
        # Extract derivation path
        path_match = re.search(r'/(\d+)h/(\d+)h/(\d+)h/(\d+)/\*', desc['string'])
        if path_match:
            purpose = path_match.group(1)
            coin_type = path_match.group(2)
            account = path_match.group(3)
            change = path_match.group(4)
            print(f"  Derivation: m/{purpose}h/{coin_type}h/{account}h/{change}/*")
            print(f"  Purpose: {purpose} ({'BIP44' if purpose == '44' else 'BIP84' if purpose == '84' else 'BIP86' if purpose == '86' else 'BIP49' if purpose == '49' else 'Unknown'})")
            print(f"  Coin: {coin_type} ({'Bitcoin mainnet' if coin_type == '0' else 'Bitcoin testnet' if coin_type == '1' else 'Unknown'})")
            print(f"  Account: {account}")
            print(f"  Change: {change} ({'External' if change == '0' else 'Internal/Change'})")
        
        print()
    
    # Find which descriptor is used for the expected address
    print("\n=== FINDING DESCRIPTOR FOR EXPECTED ADDRESS ===")
    expected_addr = "alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz"
    
    # Look for active SPKs that might match our descriptors
    active_spks = []
    for key_blob, value_blob in entries:
        if b'activeexternalspk' in key_blob or b'activeinternalspk' in key_blob:
            spk_type = 'external' if b'activeexternalspk' in key_blob else 'internal'
            if len(value_blob) == 32:
                spk_id = hexlify(value_blob).decode()
                active_spks.append((spk_type, spk_id))
                print(f"Active {spk_type} SPK: {spk_id}")
    
    # Match descriptors to active SPKs
    print("\n=== MATCHING DESCRIPTORS ===")
    for desc in descriptors:
        desc_id = desc['descriptor_id']
        for spk_type, spk_id in active_spks:
            if desc_id == spk_id:
                print(f"Descriptor {desc_id} is active for {spk_type} addresses")
                print(f"  Path: {desc['string']}")
    
    conn.close()

if __name__ == "__main__":
    wallet_path = "/home/vrogojin/offlinewallet/ref_materials/test_wallet.dat"
    parse_wallet_descriptors(wallet_path)