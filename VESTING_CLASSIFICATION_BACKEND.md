# Vesting Classification Engine - Backend Implementation Guide

This document provides instructions for implementing a vesting classification engine for the Unicity backend service. The engine traces UTXOs back to their coinbase origin to determine vesting status.

## Overview

The Unicity network has a vesting mechanism where coins mined before a certain block height are considered "vested" (fully available), while coins mined after are "unvested" (subject to restrictions).

### Vesting Rules

```
VESTING_CUTOFF_BLOCK = 280000

If UTXO traces back to coinbase at block height <= 280000:
    → VESTED (fully available)

If UTXO traces back to coinbase at block height > 280000:
    → UNVESTED (restricted)
```

## Classification Algorithm

### Core Logic

Every UTXO ultimately traces back to a coinbase transaction. The classification algorithm:

1. **Start with the UTXO's transaction**
2. **Check if it's a coinbase transaction** (has no inputs, first input has `coinbase` field)
3. **If coinbase**: Return vesting status based on block height
4. **If not coinbase**: Follow the first input (vin[0]) back to its source transaction
5. **Repeat** until coinbase is found (with iteration limit to prevent infinite loops)

### Pseudocode

```javascript
const VESTING_CUTOFF_BLOCK = 280000;
const MAX_TRACE_ITERATIONS = 1000;

async function classifyUtxo(txid, vout) {
    let currentTxid = txid;
    let iterations = 0;

    while (iterations < MAX_TRACE_ITERATIONS) {
        iterations++;

        // Fetch transaction details
        const tx = await fetchTransaction(currentTxid, true); // verbose=true

        // Check if coinbase transaction
        if (isCoinbase(tx)) {
            const blockHeight = tx.height || await getBlockHeight(tx.blockhash);
            return {
                isVested: blockHeight <= VESTING_CUTOFF_BLOCK,
                coinbaseHeight: blockHeight,
                coinbaseTxid: currentTxid
            };
        }

        // Not coinbase - follow first input
        const firstInput = tx.vin[0];
        currentTxid = firstInput.txid;
    }

    // Max iterations exceeded - treat as unvested for safety
    return { isVested: false, coinbaseHeight: null, error: 'max_iterations' };
}

function isCoinbase(tx) {
    return tx.vin &&
           tx.vin.length === 1 &&
           tx.vin[0].coinbase !== undefined;
}
```

## Electrum/Fulcrum API Integration

### Required API Methods

The classification engine requires these Electrum protocol methods:

#### 1. `blockchain.transaction.get`

Fetch transaction details with verbose output:

```javascript
// Request
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "blockchain.transaction.get",
    "params": ["<txid>", true]  // true = verbose output
}

// Response (coinbase example)
{
    "txid": "abc123...",
    "hash": "abc123...",
    "blockhash": "def456...",
    "height": 150000,
    "vin": [{
        "coinbase": "03a8...",  // <-- coinbase field present
        "sequence": 4294967295
    }],
    "vout": [...]
}

// Response (regular transaction)
{
    "txid": "xyz789...",
    "blockhash": "ghi012...",
    "height": 300000,
    "vin": [{
        "txid": "prev_txid...",  // <-- txid of previous transaction
        "vout": 0,
        "scriptSig": {...}
    }],
    "vout": [...]
}
```

#### 2. `blockchain.scripthash.listunspent`

Fetch UTXOs for an address:

```javascript
// Request
{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "blockchain.scripthash.listunspent",
    "params": ["<scripthash>"]
}

// Response
[
    {
        "tx_hash": "abc123...",
        "tx_pos": 0,
        "height": 300000,
        "value": 50000000000  // satoshis
    },
    ...
]
```

#### 3. `blockchain.scripthash.get_balance`

Fetch total balance (for verification):

```javascript
// Request
{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "blockchain.scripthash.get_balance",
    "params": ["<scripthash>"]
}

// Response
{
    "confirmed": 100000000000,
    "unconfirmed": 0
}
```

### Address to ScriptHash Conversion

Fulcrum uses script hashes instead of addresses. Convert bech32 addresses:

```javascript
const crypto = require('crypto');

function addressToScriptHash(address) {
    // Decode bech32 address to get witness program
    const decoded = bech32Decode(address);
    const witnessVersion = decoded.words[0];
    const witnessProgram = convertBits(decoded.words.slice(1), 5, 8, false);

    // Build P2WPKH script: OP_0 <20-byte-pubkey-hash>
    const script = Buffer.concat([
        Buffer.from([0x00, 0x14]),  // OP_0, PUSH_20
        Buffer.from(witnessProgram)
    ]);

    // SHA256 hash, then reverse bytes
    const hash = crypto.createHash('sha256').update(script).digest();
    return Buffer.from(hash.reverse()).toString('hex');
}
```

## Caching Strategy

### Transaction Cache (TXO Cache)

Cache classification results to avoid repeated API calls:

```javascript
// Cache key: "txid:vout"
// Cache value: { isVested: boolean, coinbaseHeight: number, timestamp: number }

const txoCache = new Map();

async function classifyWithCache(txid, vout) {
    const cacheKey = `${txid}:${vout}`;

    // Check cache first
    if (txoCache.has(cacheKey)) {
        return txoCache.get(cacheKey);
    }

    // Classify and cache result
    const result = await classifyUtxo(txid, vout);
    txoCache.set(cacheKey, {
        ...result,
        timestamp: Date.now()
    });

    return result;
}
```

### Persistence Options

1. **In-memory**: Fast, but lost on restart
2. **Redis**: Good for distributed systems
3. **SQLite/PostgreSQL**: Persistent, queryable
4. **IndexedDB**: Browser-based (for web wallet)

### Recommended Schema (SQL)

```sql
CREATE TABLE txo_classification (
    txid VARCHAR(64) NOT NULL,
    vout INTEGER NOT NULL,
    is_vested BOOLEAN NOT NULL,
    coinbase_height INTEGER,
    coinbase_txid VARCHAR(64),
    classified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (txid, vout)
);

CREATE INDEX idx_coinbase_height ON txo_classification(coinbase_height);
CREATE INDEX idx_is_vested ON txo_classification(is_vested);
```

## Implementation Structure

### Recommended File Structure

```
src/
├── vesting/
│   ├── classifier.js       # Core classification logic
│   ├── cache.js            # TXO cache implementation
│   ├── electrum.js         # Fulcrum API client
│   └── index.js            # Public API
├── utils/
│   ├── address.js          # Address/scripthash utilities
│   └── constants.js        # VESTING_CUTOFF_BLOCK, etc.
└── tests/
    └── vesting.test.js     # Unit tests
```

### Core Module: `classifier.js`

```javascript
const { VESTING_CUTOFF_BLOCK, MAX_TRACE_ITERATIONS } = require('../utils/constants');
const electrum = require('./electrum');
const cache = require('./cache');

/**
 * Classify a single UTXO's vesting status
 * @param {string} txid - Transaction ID
 * @param {number} vout - Output index
 * @returns {Promise<{isVested: boolean, coinbaseHeight: number|null}>}
 */
async function classifyUtxo(txid, vout) {
    // Check cache first
    const cached = await cache.get(txid, vout);
    if (cached) {
        return cached;
    }

    // Trace back to coinbase
    let currentTxid = txid;
    const visited = new Set();

    for (let i = 0; i < MAX_TRACE_ITERATIONS; i++) {
        // Prevent cycles
        if (visited.has(currentTxid)) {
            console.error(`Cycle detected at ${currentTxid}`);
            break;
        }
        visited.add(currentTxid);

        const tx = await electrum.getTransaction(currentTxid, true);

        if (!tx || !tx.vin) {
            console.error(`Failed to fetch transaction ${currentTxid}`);
            break;
        }

        // Check if coinbase
        if (tx.vin.length === 1 && tx.vin[0].coinbase !== undefined) {
            const result = {
                isVested: tx.height <= VESTING_CUTOFF_BLOCK,
                coinbaseHeight: tx.height,
                coinbaseTxid: currentTxid
            };

            // Cache the result
            await cache.set(txid, vout, result);
            return result;
        }

        // Follow first input
        currentTxid = tx.vin[0].txid;
    }

    // Failed to classify - default to unvested
    const result = { isVested: false, coinbaseHeight: null };
    await cache.set(txid, vout, result);
    return result;
}

/**
 * Classify all UTXOs for an address
 * @param {string} address - Bech32 address (alpha1...)
 * @returns {Promise<{vested: bigint, unvested: bigint, utxos: Array}>}
 */
async function classifyAddress(address) {
    const scriptHash = addressToScriptHash(address);
    const utxos = await electrum.listUnspent(scriptHash);

    let vestedBalance = 0n;
    let unvestedBalance = 0n;
    const classifiedUtxos = [];

    for (const utxo of utxos) {
        const classification = await classifyUtxo(utxo.tx_hash, utxo.tx_pos);
        const value = BigInt(utxo.value);

        if (classification.isVested) {
            vestedBalance += value;
        } else {
            unvestedBalance += value;
        }

        classifiedUtxos.push({
            txid: utxo.tx_hash,
            vout: utxo.tx_pos,
            value: utxo.value,
            height: utxo.height,
            ...classification
        });
    }

    return {
        vested: vestedBalance,
        unvested: unvestedBalance,
        total: vestedBalance + unvestedBalance,
        utxos: classifiedUtxos
    };
}

module.exports = { classifyUtxo, classifyAddress };
```

### Electrum Client: `electrum.js`

```javascript
const WebSocket = require('ws');

class ElectrumClient {
    constructor(url = 'wss://fulcrum.unicity.network:50004') {
        this.url = url;
        this.ws = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.connected = false;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url);

            this.ws.on('open', () => {
                this.connected = true;
                resolve();
            });

            this.ws.on('message', (data) => {
                const response = JSON.parse(data.toString());
                if (response.id && this.pendingRequests.has(response.id)) {
                    const { resolve, reject } = this.pendingRequests.get(response.id);
                    this.pendingRequests.delete(response.id);

                    if (response.error) {
                        reject(new Error(response.error.message));
                    } else {
                        resolve(response.result);
                    }
                }
            });

            this.ws.on('error', reject);
        });
    }

    async request(method, params, timeout = 30000) {
        if (!this.connected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            const id = ++this.requestId;

            const timer = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Request timeout: ${method}`));
            }, timeout);

            this.pendingRequests.set(id, {
                resolve: (result) => {
                    clearTimeout(timer);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timer);
                    reject(error);
                }
            });

            this.ws.send(JSON.stringify({
                jsonrpc: '2.0',
                id,
                method,
                params
            }));
        });
    }

    async getTransaction(txid, verbose = true) {
        return this.request('blockchain.transaction.get', [txid, verbose]);
    }

    async listUnspent(scriptHash) {
        return this.request('blockchain.scripthash.listunspent', [scriptHash]);
    }

    async getBalance(scriptHash) {
        return this.request('blockchain.scripthash.get_balance', [scriptHash]);
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.connected = false;
        }
    }
}

module.exports = new ElectrumClient();
```

### Constants: `constants.js`

```javascript
module.exports = {
    // Block height cutoff for vesting
    VESTING_CUTOFF_BLOCK: 280000,

    // Maximum iterations when tracing transaction chain
    MAX_TRACE_ITERATIONS: 1000,

    // Fulcrum WebSocket endpoint
    FULCRUM_URL: 'wss://fulcrum.unicity.network:50004',

    // Cache TTL (optional, for time-based expiry)
    CACHE_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours

    // Satoshis per ALPHA
    SATOSHIS_PER_ALPHA: 100000000n
};
```

## API Endpoints (REST)

### Suggested Backend API

```javascript
const express = require('express');
const { classifyAddress, classifyUtxo } = require('./vesting');

const app = express();

/**
 * GET /api/vesting/:address
 * Classify all UTXOs for an address
 */
app.get('/api/vesting/:address', async (req, res) => {
    try {
        const result = await classifyAddress(req.params.address);
        res.json({
            address: req.params.address,
            vested: result.vested.toString(),
            unvested: result.unvested.toString(),
            total: result.total.toString(),
            utxoCount: result.utxos.length,
            utxos: result.utxos
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/vesting/utxo/:txid/:vout
 * Classify a single UTXO
 */
app.get('/api/vesting/utxo/:txid/:vout', async (req, res) => {
    try {
        const result = await classifyUtxo(req.params.txid, parseInt(req.params.vout));
        res.json({
            txid: req.params.txid,
            vout: parseInt(req.params.vout),
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Vesting API running on port 3000'));
```

## Testing

### Unit Test Examples

```javascript
const { classifyUtxo } = require('./vesting/classifier');

describe('Vesting Classification', () => {
    test('should classify coinbase UTXO at block 150000 as vested', async () => {
        // Known coinbase transaction at block 150000
        const result = await classifyUtxo('known_coinbase_txid_at_150000', 0);
        expect(result.isVested).toBe(true);
        expect(result.coinbaseHeight).toBe(150000);
    });

    test('should classify coinbase UTXO at block 300000 as unvested', async () => {
        // Known coinbase transaction at block 300000
        const result = await classifyUtxo('known_coinbase_txid_at_300000', 0);
        expect(result.isVested).toBe(false);
        expect(result.coinbaseHeight).toBe(300000);
    });

    test('should trace regular transaction back to coinbase', async () => {
        // Known transaction that traces back to vested coinbase
        const result = await classifyUtxo('known_regular_txid', 0);
        expect(result.coinbaseHeight).toBeDefined();
        expect(result.coinbaseHeight).toBeLessThanOrEqual(280000);
        expect(result.isVested).toBe(true);
    });
});
```

## Performance Considerations

### Batch Processing

For classifying many UTXOs efficiently:

```javascript
async function classifyUtxosBatch(utxos, concurrency = 5) {
    const results = [];

    for (let i = 0; i < utxos.length; i += concurrency) {
        const batch = utxos.slice(i, i + concurrency);
        const batchResults = await Promise.all(
            batch.map(utxo => classifyUtxo(utxo.txid, utxo.vout))
        );
        results.push(...batchResults);
    }

    return results;
}
```

### Cache Warming

Pre-populate cache for known addresses:

```javascript
async function warmCache(addresses) {
    for (const address of addresses) {
        console.log(`Warming cache for ${address}`);
        await classifyAddress(address);
    }
}
```

## Error Handling

### Retry Logic

```javascript
async function classifyWithRetry(txid, vout, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await classifyUtxo(txid, vout);
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);
            if (attempt === maxRetries) throw error;
            await sleep(1000 * attempt); // Exponential backoff
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

## Summary

1. **Vesting Rule**: Coinbase at height <= 280000 = vested, > 280000 = unvested
2. **Algorithm**: Trace UTXO back through transaction chain to coinbase
3. **Cache**: Essential for performance - cache all classification results
4. **API**: Use Electrum protocol via WebSocket to Fulcrum server
5. **Verification**: Total vested + unvested should equal Fulcrum direct balance

The web wallet implementation can be referenced at `/home/vrogojin/webwallet/index.html` (search for `classifyTxo`, `traceBackToCoinbase`, `fetchFulcrumDirectBalance`).
