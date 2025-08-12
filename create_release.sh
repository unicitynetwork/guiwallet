#!/bin/bash

# Create GitHub release for v0.1.2
echo "Creating GitHub release for Unicity WEB GUI Wallet v0.1.2..."

# Create the release with the index.html file as an asset
gh release create v0.1.2 \
  --repo unicitynetwork/guiwallet \
  --title "Unicity WEB GUI Wallet v0.1.2" \
  --notes-file RELEASE_NOTES_v0.1.2.md \
  --latest \
  index.html#unicity-wallet-v0.1.2.html

echo "Release created successfully!"
echo "View it at: https://github.com/unicitynetwork/guiwallet/releases/tag/v0.1.2"