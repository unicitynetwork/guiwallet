import sqlite3
import binascii
import hashlib

def hash160(data):
    """Compute RIPEMD160(SHA256(data))"""
    sha = hashlib.sha256(data).digest()
    ripe = hashlib.new('ripemd160')
    ripe.update(sha)
    return ripe.digest()

def b58encode(data):
    """Base58 encode"""
    alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    num = int.from_bytes(data, 'big')
    encoded = ''
    while num > 0:
        num, remainder = divmod(num, 58)
        encoded = alphabet[remainder] + encoded
    # Add leading zeros
    for byte in data:
        if byte == 0:
            encoded = '1' + encoded
        else:
            break
    return encoded

def privkey_to_wif(privkey_bytes, compressed=True):
    """Convert private key bytes to WIF format"""
    # Add version byte (0x80 for mainnet)
    extended = b'\x80' + privkey_bytes
    if compressed:
        extended += b'\x01'
    
    # Add checksum
    checksum = hashlib.sha256(hashlib.sha256(extended).digest()).digest()[:4]
    
    # Encode to base58
    return b58encode(extended + checksum)

# Analyze test3.dat
conn = sqlite3.connect('ref_materials/test3.dat')
cursor = conn.cursor()

print("=== Extracting private key from test3.dat ===\n")

# Look for wallet descriptor keys - test3.dat uses shorter prefix
cursor.execute("SELECT hex(key), hex(value) FROM main WHERE hex(key) LIKE '1777616C6C6574646573%'")
desc_keys = cursor.fetchall()

print(f"Found {len(desc_keys)} wallet descriptor keys")

wif_keys = []

for key_hex, value_hex in desc_keys:
    # Look for DER-encoded private key pattern
    if '308201130201010420' in value_hex:
        start = value_hex.index('308201130201010420') + 18
        privkey_hex = value_hex[start:start+64]
        
        privkey_bytes = bytes.fromhex(privkey_hex)
        wif = privkey_to_wif(privkey_bytes, compressed=True)
        
        print(f"Found private key: {privkey_hex}")
        print(f"WIF format: {wif}")
        wif_keys.append(wif)
        break  # We only need one key

if wif_keys:
    print(f"\n=== Ready for import ===")
    print(f"Private key (WIF): {wif_keys[0]}")
    
    # Write to file for easy access
    with open('test3_privkey.txt', 'w') as f:
        f.write(wif_keys[0])
    print(f"Saved to test3_privkey.txt")
else:
    print("No private keys found in test3.dat")

conn.close()