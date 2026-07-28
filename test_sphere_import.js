// Regression + unit tests for Sphere wallet import.
// Functions are extracted from index.html so the shipped file is what gets tested.
// Never prints mnemonics, seeds or private keys.
const fs = require('fs');
const path = require('path');
const CryptoJS = require('crypto-js');
const elliptic = require('elliptic');

const INDEX = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

/** Extract a top-level `function NAME(...) { ... }` block by brace matching. */
function extractFunction(html, name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(', 'm');
  const m = re.exec(html);
  if (!m) throw new Error('function not found in index.html: ' + name);
  let i = html.indexOf('{', m.index + m[0].length - 1);
  if (i === -1) throw new Error('no body found for: ' + name);
  let depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) return html.slice(m.index, i + 1);
    }
  }
  throw new Error('unbalanced braces for: ' + name);
}

/** Extract a top-level `const NAME = ...;` single-line declaration. */
function extractConst(html, name) {
  const re = new RegExp('^\\s*const\\s+' + name + '\\s*=[^\\n]*$', 'm');
  const m = re.exec(html);
  if (!m) throw new Error('const not found in index.html: ' + name);
  return m[0].trim();
}

/**
 * Build a sandbox containing the named functions/consts from index.html.
 *
 * This evaluates source read from index.html in this repo. It is a local test
 * script and never ships to the browser; the point is to exercise the real
 * shipped code rather than a copy that can drift out of sync.
 */
function loadFromIndex(names, consts = []) {
  const src = [
    ...consts.map((c) => extractConst(INDEX, c)),
    ...names.map((n) => extractFunction(INDEX, n)),
    'return { ' + names.join(', ') + ' };',
  ].join('\n\n');
  // eslint-disable-next-line no-new-func
  return new Function('CryptoJS', 'elliptic', src)(CryptoJS, elliptic);
}

let pass = 0;
let fail = 0;
function check(name, got, want) {
  if (got === want) {
    pass++;
    console.log('PASS  ' + name);
  } else {
    fail++;
    console.log('FAIL  ' + name + '\n      got:  ' + got + '\n      want: ' + want);
  }
}
function checkThrows(name, fn, expectedSubstring) {
  try {
    fn();
    fail++;
    console.log('FAIL  ' + name + '\n      expected throw containing: ' + expectedSubstring);
  } catch (e) {
    if (String(e.message).includes(expectedSubstring)) {
      pass++;
      console.log('PASS  ' + name);
    } else {
      fail++;
      console.log(
        'FAIL  ' + name + '\n      got error: ' + e.message + '\n      want substring: ' + expectedSubstring
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Ground truth: sphere-sdk tests/integration/wallet-derivation.test.ts
// Those wallets are documented there as "exported from webwallet".
// ---------------------------------------------------------------------------
const SDK_BIP32_WALLET = {
  masterKey: '44af427cc3e4eca15633682c50383df02f5598ff70ae972060b32529106efea3',
  chainCode: 'ef9b229fa43b5321834bce029dcca011db64764538f06e5b50b9dd5f38d16678',
  descriptorPath: "84'/1'/0'",
  expected: [
    'alpha1q64c7vmezvqd43l4g0hg8l72uttc0sc5cqrhpqz',
    'alpha1qpanlhfjynerdp3vwjfd6uctexa2n6c9pusnsja',
    'alpha1q8m2m2sele36p3js0ju8rfcrk4ynjylvjnjl4x7',
  ],
};
const SDK_WIF_WALLET = {
  masterKey: '86f38045ecb4f6ae0d655e866f13937b9892fbd1ff4b3ade8998df7422b4dd1b',
  expected: [
    'alpha1qr82m4mgx7ngy32cfr5jkrcrmqw4j4as8spu8al',
    'alpha1qm4x7zc4ewz058kszsut73x9ujrgt0vdw5fw3jr',
  ],
};

const DERIVATION_FNS = [
  'bytesToHex',
  'hexToBytes',
  'deriveKeyBIP32',
  'deriveHDPath',
  'bech32Polymod',
  'hrpExpand',
  'bech32Checksum',
  'convertBits',
  'createBech32',
  'deriveAddressAtIndex',
];

console.log('=== Existing derivation is unchanged (sphere-sdk vectors) ===');
{
  const w = loadFromIndex(DERIVATION_FNS, ['CHARSET']);
  SDK_BIP32_WALLET.expected.forEach((want, i) => {
    const r = w.deriveAddressAtIndex(
      SDK_BIP32_WALLET.masterKey,
      SDK_BIP32_WALLET.chainCode,
      i,
      true,
      false,
      SDK_BIP32_WALLET.descriptorPath
    );
    check('BIP32 index ' + i + ' (' + r.path + ')', r.address, want);
  });
  SDK_WIF_WALLET.expected.forEach((want, i) => {
    const r = w.deriveAddressAtIndex(SDK_WIF_WALLET.masterKey, null, i, true, false, null);
    check('HMAC index ' + i + ' (' + r.path + ')', r.address, want);
  });
}

console.log('\n=== BIP39 wordlist + validation ===');
{
  const w = loadFromIndex(['bip39NormalizeMnemonic', 'bip39ValidateMnemonic'], ['BIP39_WORDLIST']);
  const src = extractConst(INDEX, 'BIP39_WORDLIST');
  // eslint-disable-next-line no-new-func
  const list = new Function(src + '; return BIP39_WORDLIST;')();

  check('wordlist length', list.length, 2048);
  check('first word', list[0], 'abandon');
  check('last word', list[2047], 'zoo');
  check(
    'wordlist sha256 matches canonical english.txt',
    CryptoJS.SHA256(list.join('\n') + '\n').toString(),
    '2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda'
  );

  const VALID_12 =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const VALID_24 =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon ' +
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
  check('valid 12-word phrase', w.bip39ValidateMnemonic(VALID_12), true);
  check('valid 24-word phrase', w.bip39ValidateMnemonic(VALID_24), true);
  check(
    'mixed case and padding accepted',
    w.bip39ValidateMnemonic('  ABANDON  ' + VALID_12.split(' ').slice(1).join(' ') + ' '),
    true
  );
  check(
    'bad checksum rejected',
    w.bip39ValidateMnemonic(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon'
    ),
    false
  );
  check('unknown word rejected', w.bip39ValidateMnemonic(VALID_12.replace('about', 'zzzznotaword')), false);
  check('wrong word count rejected', w.bip39ValidateMnemonic('abandon abandon about'), false);
  check('empty string rejected', w.bip39ValidateMnemonic(''), false);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
