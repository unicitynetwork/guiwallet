#!/usr/bin/env python3
"""
Check Fulcrum for address information
"""

import asyncio
import websockets
import json
import hashlib
from binascii import hexlify, unhexlify

def address_to_scripthash(address):
    """Convert bech32 address to electrum script hash"""
    # For alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz
    # The witness program is: d571e66f22601b58fea87dd07ff95c5af0f86298
    
    # Create the script: OP_0 (0x00) + push20 (0x14) + hash160
    script = b'\x00\x14' + unhexlify('d571e66f22601b58fea87dd07ff95c5af0f86298')
    
    # Electrum script hash is sha256 of the script, reversed
    script_hash = hashlib.sha256(script).digest()
    return hexlify(script_hash[::-1]).decode()

async def query_fulcrum():
    """Query Fulcrum server for address info"""
    uri = "wss://unicorn.unicity.network:50004"
    
    address = "alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz"
    script_hash = address_to_scripthash(address)
    
    print(f"Connecting to Fulcrum: {uri}")
    print(f"Address: {address}")
    print(f"Script hash: {script_hash}")
    
    try:
        async with websockets.connect(uri) as websocket:
            # Get balance
            request = {
                "id": 1,
                "method": "blockchain.scripthash.get_balance",
                "params": [script_hash]
            }
            
            await websocket.send(json.dumps(request))
            response = await websocket.recv()
            balance_data = json.loads(response)
            
            print(f"\nBalance response: {json.dumps(balance_data, indent=2)}")
            
            # Get history
            request = {
                "id": 2,
                "method": "blockchain.scripthash.get_history",
                "params": [script_hash]
            }
            
            await websocket.send(json.dumps(request))
            response = await websocket.recv()
            history_data = json.loads(response)
            
            print(f"\nHistory response: {json.dumps(history_data, indent=2)}")
            
            # Get UTXOs
            request = {
                "id": 3,
                "method": "blockchain.scripthash.listunspent",
                "params": [script_hash]
            }
            
            await websocket.send(json.dumps(request))
            response = await websocket.recv()
            utxo_data = json.loads(response)
            
            print(f"\nUTXO response: {json.dumps(utxo_data, indent=2)}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(query_fulcrum())