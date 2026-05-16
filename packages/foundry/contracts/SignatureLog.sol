// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract SignatureLog is Ownable {
    error EmptyDocumentHash();
    error EmptySignatureHash();
    error EmptySignerHash();
    error SignatureAlreadyLogged(bytes32 sigHash);

    struct SignatureRecord {
        bytes32 docHash;
        bytes32 payloadHash;
        bytes32 sigHash;
        bytes32 previousSigHash;
        bytes32 signerHash;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 sigHash => SignatureRecord signatureRecord) private signatures;
    mapping(bytes32 docHash => bytes32[] sigHashes) private documentSignatures;

    event DocumentSigned(
        bytes32 indexed docHash,
        bytes32 indexed signerHash,
        bytes32 indexed sigHash,
        bytes32 payloadHash,
        bytes32 previousSigHash,
        uint256 timestamp
    );
    event SigningDelegated(
        bytes32 indexed docHash, bytes32 indexed fromHash, bytes32 indexed toHash, uint256 timestamp
    );

    constructor(address initialOwner) Ownable(initialOwner) { }

    function logSignature(
        bytes32 docHash,
        bytes32 payloadHash,
        bytes32 sigHash,
        bytes32 previousSigHash,
        bytes32 signerHash
    ) external onlyOwner returns (bool created) {
        if (docHash == bytes32(0)) revert EmptyDocumentHash();
        if (payloadHash == bytes32(0)) revert EmptySignatureHash();
        if (sigHash == bytes32(0)) revert EmptySignatureHash();
        if (signerHash == bytes32(0)) revert EmptySignerHash();

        if (signatures[sigHash].exists) revert SignatureAlreadyLogged(sigHash);

        signatures[sigHash] = SignatureRecord({
            docHash: docHash,
            payloadHash: payloadHash,
            sigHash: sigHash,
            previousSigHash: previousSigHash,
            signerHash: signerHash,
            timestamp: block.timestamp,
            exists: true
        });
        documentSignatures[docHash].push(sigHash);
        emit DocumentSigned(docHash, signerHash, sigHash, payloadHash, previousSigHash, block.timestamp);
        return true;
    }

    function logDelegation(bytes32 docHash, bytes32 fromHash, bytes32 toHash) external onlyOwner {
        if (docHash == bytes32(0)) revert EmptyDocumentHash();
        if (fromHash == bytes32(0) || toHash == bytes32(0)) revert EmptySignerHash();
        emit SigningDelegated(docHash, fromHash, toHash, block.timestamp);
    }

    function getSignature(bytes32 sigHash)
        external
        view
        returns (
            bytes32 docHash,
            bytes32 payloadHash,
            bytes32 previousSigHash,
            bytes32 signerHash,
            uint256 timestamp,
            bool exists
        )
    {
        SignatureRecord storage signatureRecord = signatures[sigHash];
        return (
            signatureRecord.docHash,
            signatureRecord.payloadHash,
            signatureRecord.previousSigHash,
            signatureRecord.signerHash,
            signatureRecord.timestamp,
            signatureRecord.exists
        );
    }

    function getDocumentSignatureCount(bytes32 docHash) external view returns (uint256) {
        return documentSignatures[docHash].length;
    }

    function getDocumentSignatureAt(bytes32 docHash, uint256 index) external view returns (bytes32) {
        return documentSignatures[docHash][index];
    }
}
