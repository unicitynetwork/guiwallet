#!/usr/bin/env python3
"""
Advanced parser for wallet.dat file with proper ASN.1 DER decoding
"""

import sqlite3
import struct
import hashlib
from binascii import hexlify, unhexlify
import json

def decode_der_private_key(data):
    """Decode ASN.1 DER encoded private key"""
    if len(data) < 32:
        return None
    
    # Look for the private key pattern in DER encoding
    # The private key is typically preceded by 0x04 0x20 (indicating 32 bytes follow)
    for i in range(len(data) - 33):
        if data[i] == 0x04 and data[i+1] == 0x20:
            private_key = data[i+2:i+34]
            if len(private_key) == 32:
                return hexlify(private_key).decode()
    
    # Alternative: Look for the sequence 0x02 0x01 0x01 0x04 0x20 which is common in DER
    for i in range(len(data) - 35):
        if data[i:i+3] == b'\x02\x01\x01' and data[i+3] == 0x04 and data[i+4] == 0x20:
            private_key = data[i+5:i+37]
            if len(private_key) == 32:
                return hexlify(private_key).decode()
    
    return None

def decode_public_key(data):
    """Extract public key from DER encoded data"""
    # Look for uncompressed public key (0x04 followed by 64 bytes)
    for i in range(len(data) - 65):
        if data[i] == 0x04 and i + 65 <= len(data):
            pub_key = data[i+1:i+65]
            if len(pub_key) == 64:
                return hexlify(data[i:i+65]).decode()
    
    # Look for compressed public key (0x02 or 0x03 followed by 32 bytes)
    for i in range(len(data) - 33):
        if (data[i] == 0x02 or data[i] == 0x03) and i + 33 <= len(data):
            pub_key = data[i:i+33]
            return hexlify(pub_key).decode()
    
    return None

def parse_wallet_dat(wallet_path):
    """Parse wallet.dat SQLite file and extract key-value pairs"""
    conn = sqlite3.connect(wallet_path)
    cursor = conn.cursor()
    
    # Get all key-value pairs from the main table
    cursor.execute("SELECT key, value FROM main")
    entries = cursor.fetchall()
    
    results = {}
    for key_blob, value_blob in entries:
        results[key_blob] = value_blob
    
    conn.close()
    return results

def analyze_wallet_keys(wallet_data):
    """Analyze wallet data and extract all key information"""
    key_info = {
        'master_keys': [],
        'descriptor_keys': [],
        'active_keys': [],
        'transactions': [],
        'addresses': []
    }
    
    for key_blob, value_blob in wallet_data.items():
        key_hex = hexlify(key_blob).decode()
        
        # Parse key type from the raw key
        if b'walletdescriptorkey' in key_blob:
            # Extract descriptor ID and parse the key
            desc_id = key_blob[19:51]  # 32 bytes after 'walletdescriptorkey'
            
            private_key = decode_der_private_key(value_blob)
            public_key = decode_public_key(value_blob)
            
            if private_key:
                key_info['descriptor_keys'].append({
                    'descriptor_id': hexlify(desc_id).decode(),
                    'private_key': private_key,
                    'public_key': public_key,
                    'raw_value_hex': hexlify(value_blob).decode()
                })
        
        elif b'activeexternalspk' in key_blob or b'activeinternalspk' in key_blob:
            # These reference descriptor IDs
            if len(value_blob) == 32:
                key_type = 'external' if b'activeexternalspk' in key_blob else 'internal'
                key_info['active_keys'].append({
                    'type': key_type,
                    'descriptor_ref': hexlify(value_blob).decode()
                })
        
        elif key_blob.startswith(b'name-'):
            # Address name
            try:
                address = key_blob[5:].decode('utf-8')
                key_info['addresses'].append(address)
            except:
                pass
        
        elif key_blob.startswith(b'\x02tx'):
            # Transaction data
            key_info['transactions'].append({
                'tx_key': key_hex,
                'size': len(value_blob)
            })
    
    return key_info

def find_unique_private_keys(key_info):
    """Extract unique private keys from the analyzed data"""
    unique_keys = {}
    
    for desc_key in key_info['descriptor_keys']:
        priv_key = desc_key['private_key']
        if priv_key and priv_key not in unique_keys:
            unique_keys[priv_key] = {
                'private_key': priv_key,
                'public_key': desc_key['public_key'],
                'descriptor_ids': [desc_key['descriptor_id']]
            }
        elif priv_key and priv_key in unique_keys:
            unique_keys[priv_key]['descriptor_ids'].append(desc_key['descriptor_id'])
    
    return list(unique_keys.values())

def main():
    wallet_path = "/home/vrogojin/offlinewallet/ref_materials/test_wallet.dat"
    
    print(f"Parsing wallet: {wallet_path}")
    wallet_data = parse_wallet_dat(wallet_path)
    
    print(f"\nTotal entries found: {len(wallet_data)}")
    
    # Analyze keys
    key_info = analyze_wallet_keys(wallet_data)
    
    print(f"\n=== Wallet Analysis ===")
    print(f"Descriptor keys found: {len(key_info['descriptor_keys'])}")
    print(f"Active keys found: {len(key_info['active_keys'])}")
    print(f"Addresses found: {len(key_info['addresses'])}")
    print(f"Transactions found: {len(key_info['transactions'])}")
    
    # Get unique private keys
    unique_keys = find_unique_private_keys(key_info)
    
    print(f"\n=== Unique Private Keys ===")
    print(f"Found {len(unique_keys)} unique private key(s)")
    
    for i, key_data in enumerate(unique_keys):
        print(f"\nKey {i+1}:")
        print(f"  Private Key: {key_data['private_key']}")
        if key_data['public_key']:
            print(f"  Public Key: {key_data['public_key']}")
        print(f"  Used in {len(key_data['descriptor_ids'])} descriptors")
    
    # Show addresses
    if key_info['addresses']:
        print(f"\n=== Addresses ===")
        for addr in key_info['addresses'][:5]:  # Show first 5
            print(f"  {addr}")
        if len(key_info['addresses']) > 5:
            print(f"  ... and {len(key_info['addresses']) - 5} more")
    
    # Match active keys to descriptors
    print(f"\n=== Active Key Mappings ===")
    for active_key in key_info['active_keys'][:5]:  # Show first 5
        print(f"  {active_key['type']}: {active_key['descriptor_ref']}")
    
    # Export the key for use in web wallet
    if unique_keys:
        print(f"\n=== Export for Web Wallet ===")
        print(f"Master Private Key (hex): {unique_keys[0]['private_key']}")
        print(f"\nTo import this into the web wallet:")
        print(f"1. Open index.html in your browser")
        print(f"2. Click 'Import Wallet'")
        print(f"3. Select 'Import from Alpha wallet.dat'")
        print(f"4. Enter the private key above")

if __name__ == "__main__":
    main()