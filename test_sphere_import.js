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

const BIP39_FNS = [
  'bip39NormalizeMnemonic',
  'bip39ValidateMnemonic',
  'bip39MnemonicToSeedHex',
  'masterKeyFromSeedHex',
  'sphereWalletFromMnemonic',
];
const VALID_12 =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

console.log('\n=== BIP39 seed + master key (canonical vectors) ===');
{
  const w = loadFromIndex(BIP39_FNS, ['BIP39_WORDLIST', 'SPHERE_DESCRIPTOR_PATH']);

  // BIP39 canonical vector, empty passphrase (sphere-sdk tests/fixtures/test-vectors.ts)
  check(
    'seed matches BIP39 vector',
    w.bip39MnemonicToSeedHex(VALID_12),
    '5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4'
  );

  // BIP32 canonical vector (sphere-sdk tests/fixtures/test-vectors.ts BIP32_VECTORS[0])
  const m = w.masterKeyFromSeedHex('000102030405060708090a0b0c0d0e0f');
  check(
    'master private key from seed',
    m.masterPrivateKey,
    'e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35'
  );
  check(
    'master chain code from seed',
    m.masterChainCode,
    '873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508'
  );

  const parsed = w.sphereWalletFromMnemonic(VALID_12);
  check('phrase import uses Sphere descriptor path', parsed.descriptorPath, "44'/0'/0'");
  check('phrase import has no anchor pubkey', parsed.expectedPublicKey, null);
  check('phrase import produces a 64-hex chain code', /^[0-9a-f]{64}$/.test(parsed.masterChainCode), true);
  checkThrows(
    'bad phrase is rejected',
    () => w.sphereWalletFromMnemonic('not a real phrase at all'),
    'Invalid recovery phrase'
  );
}

console.log('\n=== End-to-end: phrase -> alpha1 address on Sphere path ===');
{
  const w = loadFromIndex([...DERIVATION_FNS, ...BIP39_FNS], [
    'CHARSET',
    'BIP39_WORDLIST',
    'SPHERE_DESCRIPTOR_PATH',
  ]);
  const p = w.sphereWalletFromMnemonic(VALID_12);
  const a = w.deriveAddressAtIndex(p.masterPrivateKey, p.masterChainCode, 0, true, false, p.descriptorPath);
  check('derived path is the Sphere path', a.path, "m/44'/0'/0'/0/0");
  check('address is bech32 alpha1', /^alpha1[02-9ac-hj-np-z]{38,}$/.test(a.address), true);
}

console.log('\n=== Sphere JSON export ===');
{
  const w = loadFromIndex([...DERIVATION_FNS, ...BIP39_FNS, 'parseSphereWalletJSON'], [
    'CHARSET',
    'BIP39_WORDLIST',
    'SPHERE_DESCRIPTOR_PATH',
  ]);

  const MASTER = 'e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35';
  const CHAIN = '873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508';
  const PUBKEY = w.deriveAddressAtIndex(MASTER, CHAIN, 0, true, false, "44'/0'/0'").publicKey;

  const plain = {
    version: '1.0',
    type: 'sphere-wallet',
    wallet: {
      masterPrivateKey: MASTER,
      chainCode: CHAIN,
      descriptorPath: "44'/0'/0'",
      isBIP32: true,
      addresses: [{ address: PUBKEY, publicKey: PUBKEY, path: "m/44'/0'/0'/0/0", index: 0 }],
    },
    encrypted: false,
    derivationMode: 'bip32',
  };

  const p = w.parseSphereWalletJSON(JSON.stringify(plain));
  check('reads master key', p.masterPrivateKey, MASTER);
  check('reads chain code', p.masterChainCode, CHAIN);
  check('reads descriptor path', p.descriptorPath, "44'/0'/0'");
  check('reads anchor pubkey', p.expectedPublicKey, PUBKEY);

  // Missing descriptorPath falls back to Sphere's path, not the 84'/1'/0' wallet default.
  const noPath = JSON.parse(JSON.stringify(plain));
  delete noPath.wallet.descriptorPath;
  check(
    'missing descriptorPath falls back to Sphere path',
    w.parseSphereWalletJSON(JSON.stringify(noPath)).descriptorPath,
    "44'/0'/0'"
  );

  // Encrypted export: Sphere uses CryptoJS.AES.encrypt(value, password) directly.
  const enc = JSON.parse(JSON.stringify(plain));
  enc.encrypted = true;
  enc.wallet.masterPrivateKey = CryptoJS.AES.encrypt(MASTER, 'SphereTest123').toString();
  check(
    'decrypts with the right password',
    w.parseSphereWalletJSON(JSON.stringify(enc), 'SphereTest123').masterPrivateKey,
    MASTER
  );
  checkThrows(
    'encrypted without password is rejected',
    () => w.parseSphereWalletJSON(JSON.stringify(enc)),
    'encrypted'
  );
  checkThrows('wrong password is rejected', () => w.parseSphereWalletJSON(JSON.stringify(enc), 'wrong'), 'password');

  checkThrows('non-JSON is rejected', () => w.parseSphereWalletJSON('not json at all'), 'valid JSON');
  checkThrows('foreign JSON is rejected', () => w.parseSphereWalletJSON('{"type":"something-else"}'), 'Sphere wallet');
  checkThrows(
    'missing chain code is rejected',
    () => {
      const bad = JSON.parse(JSON.stringify(plain));
      delete bad.wallet.chainCode;
      w.parseSphereWalletJSON(JSON.stringify(bad));
    },
    'chain code'
  );
}

console.log('\n=== Wallet object: anchor check + descriptorPath persistence ===');
{
  const w = loadFromIndex(
    [...DERIVATION_FNS, ...BIP39_FNS, 'parseSphereWalletJSON', 'buildSphereImportedWallet'],
    ['CHARSET', 'BIP39_WORDLIST', 'SPHERE_DESCRIPTOR_PATH']
  );

  const MASTER = 'e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35';
  const CHAIN = '873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508';
  const good = w.deriveAddressAtIndex(MASTER, CHAIN, 0, true, false, "44'/0'/0'");

  const built = w.buildSphereImportedWallet({
    masterPrivateKey: MASTER,
    masterChainCode: CHAIN,
    descriptorPath: "44'/0'/0'",
    expectedPublicKey: good.publicKey,
  });
  check('descriptorPath is persisted on the wallet', built.descriptorPath, "44'/0'/0'");
  check('marked as an imported BIP32 wallet', built.isImportedAlphaWallet, true);
  check('starts with no addresses (UI generates the first)', built.addresses.length, 0);
  check('never marked encrypted at rest', built.isEncrypted, false);

  checkThrows(
    'mismatched anchor pubkey refuses the import',
    () =>
      w.buildSphereImportedWallet({
        masterPrivateKey: MASTER,
        masterChainCode: CHAIN,
        descriptorPath: "84'/1'/0'", // wrong branch for this export
        expectedPublicKey: good.publicKey,
      }),
    'does not match'
  );

  // No anchor (phrase import) must still work.
  const noAnchor = w.buildSphereImportedWallet({
    masterPrivateKey: MASTER,
    masterChainCode: CHAIN,
    descriptorPath: "44'/0'/0'",
    expectedPublicKey: null,
  });
  check('phrase import without anchor succeeds', noAnchor.descriptorPath, "44'/0'/0'");

  // The persistence bug this guards against: address #1 and address #2 on the same branch.
  const a0 = w.deriveAddressAtIndex(built.masterPrivateKey, built.masterChainCode, 0, true, false, built.descriptorPath);
  const a1 = w.deriveAddressAtIndex(built.masterPrivateKey, built.masterChainCode, 1, true, false, built.descriptorPath);
  check('address 0 path', a0.path, "m/44'/0'/0'/0/0");
  check('address 1 stays on the same branch', a1.path, "m/44'/0'/0'/0/1");
}

console.log('\n=== Address scan keeps the wallet on its own branch ===');
{
  // performWalletScan() rebuilds extractedWalletData when given a master key.
  // The merge must not drop descriptorPath, or the scan walks a different branch
  // than the address the wallet was imported at.
  const w = loadFromIndex(['mergeScanWalletData']);
  const merged = w.mergeScanWalletData(
    { masterKey: 'old', masterChainCode: 'old', isAlphaWallet: true, descriptorPath: "44'/0'/0'" },
    'aa'.repeat(32),
    'bb'.repeat(32),
    true
  );
  check('scan keeps descriptorPath', merged.descriptorPath, "44'/0'/0'");
  check('scan takes the new master key', merged.masterKey, 'aa'.repeat(32));
  check(
    'no previous data means no descriptorPath',
    w.mergeScanWalletData(null, 'aa'.repeat(32), 'bb'.repeat(32), true).descriptorPath,
    null
  );

  // selectWalletForImport() builds the wallet object after the user picks a scanned
  // address. It touches DOM and module globals, so they get stubbed here.
  const src = [
    extractFunction(INDEX, 'selectWalletForImport'),
    'return { selectWalletForImport, getWallet: () => wallet };',
  ].join('\n\n');
  // eslint-disable-next-line no-new-func
  const sandbox = new Function(
    'wallet',
    'extractedWalletData',
    'window',
    'updateButtonStates',
    'addAddressToUI',
    'saveWalletData',
    'closeRestoreModal',
    'showInAppNotification',
    'clearClassificationQueue',
    'electrumConnected',
    'refreshBalance',
    'updateScannedWalletsDisplay',
    src
  )(
    {},
    { masterKey: 'aa'.repeat(32), masterChainCode: 'bb'.repeat(32), isAlphaWallet: true, descriptorPath: "44'/0'/0'" },
    {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    false,
    () => {},
    () => {}
  );
  sandbox.selectWalletForImport({
    index: 3,
    address: 'alpha1qexample',
    publicKey: '02'.repeat(17),
    path: "m/44'/0'/0'/0/3",
    privateKey: 'cc'.repeat(32),
  });
  const picked = sandbox.getWallet();
  check('picking a scanned address persists descriptorPath', picked.descriptorPath, "44'/0'/0'");
  check('picking a scanned address keeps the chain code', picked.masterChainCode, 'bb'.repeat(32));
  check('picking a scanned address keeps the index', picked.addresses[0].index, 3);
}

console.log('\n=== Text backup round-trip keeps the branch ===');
{
  const w = loadFromIndex(
    [
      ...DERIVATION_FNS,
      ...BIP39_FNS,
      'descriptorPathLine',
      'parseDescriptorPathFromText',
      'parseFirstAddressFromText',
      'resolveDescriptorPathFromBackup',
    ],
    ['CHARSET', 'BIP39_WORDLIST', 'SPHERE_DESCRIPTOR_PATH']
  );

  const MASTER = 'e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35';
  const CHAIN = '873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508';
  const onSphere = w.deriveAddressAtIndex(MASTER, CHAIN, 0, true, false, "44'/0'/0'").address;
  const onLegacy = w.deriveAddressAtIndex(MASTER, CHAIN, 0, true, false, "84'/1'/0'").address;

  // What this app writes now must read back as the same path.
  check(
    'written line reads back',
    w.parseDescriptorPathFromText('WALLET TYPE: BIP32' + w.descriptorPathLine("44'/0'/0'") + '\n\nYOUR ADDRESSES:'),
    "44'/0'/0'"
  );
  check('no path means no line', w.descriptorPathLine(null), '');
  check('absent line reads as null', w.parseDescriptorPathFromText('UNICITY WALLET DETAILS\nnothing here'), null);

  // Sphere's own exportToTxt writes the same label.
  check(
    "Sphere's text export is understood",
    w.parseDescriptorPathFromText("MASTER CHAIN CODE ...\n\nDESCRIPTOR PATH: 84'/1'/0'\n\nWALLET TYPE: BIP32"),
    "84'/1'/0'"
  );
  check('a leading m/ is stripped', w.parseDescriptorPathFromText("DESCRIPTOR PATH: m/44'/0'/0'"), "44'/0'/0'");

  check('address line without a path suffix', w.parseFirstAddressFromText('YOUR ADDRESSES:\nAddress 1: ' + onSphere), onSphere);
  check(
    'address line with a path suffix',
    w.parseFirstAddressFromText("YOUR ADDRESSES:\nAddress 1: " + onSphere + " (Path: m/44'/0'/0'/0/0)"),
    onSphere
  );

  // Backups already saved in the wild have no DESCRIPTOR PATH line, but they do record the
  // address. Matching against it recovers the branch exactly.
  const legacyBackup = (addr) =>
    'UNICITY WALLET DETAILS\n===========================\n\n' +
    'MASTER PRIVATE KEY (keep secret!):\n' + MASTER + '\n\n' +
    'MASTER CHAIN CODE (for BIP32 HD wallet compatibility):\n' + CHAIN + '\n\n' +
    'WALLET TYPE: BIP32 hierarchical deterministic wallet\n\n' +
    'YOUR ADDRESSES:\nAddress 1: ' + addr + '\n';

  check(
    'old backup on the Sphere branch is recovered',
    w.resolveDescriptorPathFromBackup(legacyBackup(onSphere), MASTER, CHAIN),
    "44'/0'/0'"
  );
  check(
    'old backup on the legacy branch is recovered',
    w.resolveDescriptorPathFromBackup(legacyBackup(onLegacy), MASTER, CHAIN),
    "84'/1'/0'"
  );
  check(
    'an explicit line beats address matching',
    w.resolveDescriptorPathFromBackup(
      legacyBackup(onLegacy) + "\nDESCRIPTOR PATH: 44'/0'/0'\n",
      MASTER,
      CHAIN
    ),
    "44'/0'/0'"
  );
  check(
    'nothing to go on stays null',
    w.resolveDescriptorPathFromBackup('UNICITY WALLET DETAILS\nno addresses here', MASTER, CHAIN),
    null
  );
  check(
    'an unknown address stays null rather than guessing',
    w.resolveDescriptorPathFromBackup(legacyBackup('alpha1qnotarealaddressatall'), MASTER, CHAIN),
    null
  );
}

console.log('\n=== Old non-BIP32 (WIF/HMAC) backups are unaffected ===');
{
  const w = loadFromIndex(
    [
      ...DERIVATION_FNS,
      ...BIP39_FNS,
      'descriptorPathLine',
      'parseDescriptorPathFromText',
      'parseFirstAddressFromText',
      'resolveDescriptorPathFromBackup',
      'mergeScanWalletData',
    ],
    ['CHARSET', 'BIP39_WORDLIST', 'SPHERE_DESCRIPTOR_PATH']
  );

  // A wallet created by this app has no chain code: derivation is HMAC-SHA512(masterKey, path).
  const wifAddr0 = w.deriveAddressAtIndex(SDK_WIF_WALLET.masterKey, null, 0, true, false, null);
  check('WIF address 0 still matches the SDK vector', wifAddr0.address, SDK_WIF_WALLET.expected[0]);
  check('WIF path is unchanged', wifAddr0.path, "m/44'/0'/0'");

  // Exactly what saveWallet() writes for a standard wallet - the branch that was not touched.
  const wifBackup =
    'UNICITY WALLET DETAILS\n===========================\n\n' +
    'MASTER PRIVATE KEY (keep secret!):\n' + SDK_WIF_WALLET.masterKey + '\n\n' +
    'MASTER PRIVATE KEY IN WIF FORMAT (for importprivkey command):\nL1exampleWifKey\n\n' +
    'WALLET TYPE: Standard wallet (HMAC-based)\n\n' +
    'ENCRYPTION STATUS: Not encrypted\n\n' +
    "YOUR ADDRESSES:\nAddress 1: " + SDK_WIF_WALLET.expected[0] + " (Path: m/44'/0'/0')\n";

  check('a standard backup carries no descriptor path', w.parseDescriptorPathFromText(wifBackup), null);
  check(
    'no chain code means no path is invented',
    w.resolveDescriptorPathFromBackup(wifBackup, SDK_WIF_WALLET.masterKey, null),
    null
  );
  check('a standard wallet writes no path line', w.descriptorPathLine(undefined), '');

  // With no chain code the wallet stays on the HMAC branch whatever the path says.
  const forced = w.deriveAddressAtIndex(SDK_WIF_WALLET.masterKey, null, 0, true, false, "44'/0'/0'");
  check('a path cannot drag a chain-code-less wallet onto BIP32', forced.address, SDK_WIF_WALLET.expected[0]);

  // Scanning a standard wallet must not acquire a path either.
  const merged = w.mergeScanWalletData(null, SDK_WIF_WALLET.masterKey, null, false);
  check('scan of a standard wallet has no path', merged.descriptorPath, null);
  check('scan of a standard wallet stays non-BIP32', merged.isAlphaWallet, false);

  // An old BIP32 backup written before the path line still lands where it always did.
  const legacyBip32 =
    'MASTER PRIVATE KEY (keep secret!):\n' + SDK_BIP32_WALLET.masterKey + '\n\n' +
    'MASTER CHAIN CODE (for BIP32 HD wallet compatibility):\n' + SDK_BIP32_WALLET.chainCode + '\n\n' +
    'WALLET TYPE: BIP32 hierarchical deterministic wallet\n\n' +
    'YOUR ADDRESSES:\nAddress 1: ' + SDK_BIP32_WALLET.expected[0] + '\n';
  const legacyPath = w.resolveDescriptorPathFromBackup(
    legacyBip32,
    SDK_BIP32_WALLET.masterKey,
    SDK_BIP32_WALLET.chainCode
  );
  check('pre-existing BIP32 backup resolves to its own branch', legacyPath, "84'/1'/0'");
  check(
    'pre-existing BIP32 backup yields the same address as before',
    w.deriveAddressAtIndex(SDK_BIP32_WALLET.masterKey, SDK_BIP32_WALLET.chainCode, 0, true, false, legacyPath).address,
    SDK_BIP32_WALLET.expected[0]
  );
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
