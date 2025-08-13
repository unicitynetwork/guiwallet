import sqlite3
import binascii
import hashlib
from hashlib import sha256

def hash160(data):
    """Compute RIPEMD160(SHA256(data))"""
    import hashlib
    sha = hashlib.sha256(data).digest()
    ripe = hashlib.new('ripemd160')
    ripe.update(sha)
    return ripe.digest()

conn = sqlite3.connect('ref_materials/test4.dat')
cursor = conn.cursor()

# Get all records
cursor.execute("SELECT key, value FROM main")
records = cursor.fetchall()

print(f"Total records: {len(records)}")
print("\nAnalyzing wallet structure:")

descriptors = []
keys_found = []

for key, value in records:
    key_hex = binascii.hexlify(key).decode()
    
    # Check for wallet descriptor records
    if key_hex.startswith('1077616c6c657464657363726970746f72'):
        print(f"\nWallet descriptor found:")
        descriptor_id = key_hex[36:]  # Get the descriptor ID part
        print(f"Descriptor ID: {descriptor_id}")
        
        # Try to decode value
        try:
            # Skip first byte (length indicator)
            desc_str = value[1:].decode('utf-8', errors='ignore')
            if 'pkh(' in desc_str or 'wpkh(' in desc_str:
                print(f"Descriptor: {desc_str[:200]}")
                descriptors.append(desc_str)
                
                # Extract xpub or private key from descriptor
                if 'xpub' in desc_str:
                    start = desc_str.find('xpub')
                    end = desc_str.find(')', start)
                    if end > start:
                        xpub = desc_str[start:end]
                        print(f"Found xpub: {xpub[:50]}...")
                elif 'xprv' in desc_str:
                    start = desc_str.find('xprv')
                    end = desc_str.find(')', start)
                    if end > start:
                        xprv = desc_str[start:end]
                        print(f"Found xprv: {xprv[:50]}...")
                        
        except Exception as e:
            print(f"Error decoding: {e}")
            print(f"Raw value (hex): {binascii.hexlify(value[:50]).decode()}")
    
    # Check for key records (33 or 34 bytes starting with 02/03)
    elif len(key) in [33, 34] and key[0] in [0x02, 0x03]:
        pubkey_hex = binascii.hexlify(key).decode()
        print(f"\nFound compressed public key: {pubkey_hex}")
        keys_found.append(pubkey_hex)
        
        # Check if value contains private key
        if len(value) >= 32:
            print(f"Value length: {len(value)} bytes")
            print(f"Value (first 50 bytes hex): {binascii.hexlify(value[:50]).decode()}")

print(f"\n\nSummary:")
print(f"Descriptors found: {len(descriptors)}")
print(f"Public keys found: {len(keys_found)}")

# Check for activeexternalspk and activeinternalspk
print("\n\nActive SPK records:")
cursor.execute("SELECT key, value FROM main WHERE hex(key) LIKE '11%'")
spk_records = cursor.fetchall()
for key, value in spk_records:
    key_str = key.decode('utf-8', errors='ignore')
    if 'spk' in key_str:
        print(f"Key: {key_str}")
        print(f"Value (hex): {binascii.hexlify(value).decode()}")

conn.close()