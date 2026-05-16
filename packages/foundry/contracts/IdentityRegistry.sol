// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract IdentityRegistry is Ownable {
    error EmptyLinkageHash();
    error EmptyWallet();
    error IdentityAlreadyBound(bytes32 linkageHash);

    struct IdentityBinding {
        address wallet;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 linkageHash => IdentityBinding binding) private bindings;
    mapping(address wallet => bytes32 linkageHash) public walletLinkageHashes;

    event IdentityBound(bytes32 indexed linkageHash, address indexed privyWallet, uint256 timestamp);

    constructor(address initialOwner) Ownable(initialOwner) { }

    function registerIdentity(bytes32 linkageHash, address privyWallet) external onlyOwner returns (bool created) {
        if (linkageHash == bytes32(0)) revert EmptyLinkageHash();
        if (privyWallet == address(0)) revert EmptyWallet();

        IdentityBinding storage existing = bindings[linkageHash];
        if (existing.exists) {
            if (existing.wallet == privyWallet) return false;
            revert IdentityAlreadyBound(linkageHash);
        }

        bytes32 existingLinkageHash = walletLinkageHashes[privyWallet];
        if (existingLinkageHash != bytes32(0) && existingLinkageHash != linkageHash) {
            revert IdentityAlreadyBound(existingLinkageHash);
        }

        bindings[linkageHash] = IdentityBinding({ wallet: privyWallet, timestamp: block.timestamp, exists: true });
        walletLinkageHashes[privyWallet] = linkageHash;
        emit IdentityBound(linkageHash, privyWallet, block.timestamp);
        return true;
    }

    function verifyIdentity(bytes32 linkageHash) external view returns (bool) {
        return bindings[linkageHash].exists;
    }

    function getIdentity(bytes32 linkageHash) external view returns (address wallet, uint256 timestamp, bool exists) {
        IdentityBinding storage binding = bindings[linkageHash];
        return (binding.wallet, binding.timestamp, binding.exists);
    }
}
