// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract DocumentRegistry is Ownable {
    error EmptyDocumentHash();
    error EmptyOwner();
    error EmptyIpfsCid();
    error DocumentIndexOutOfBounds(bytes32 docHash, uint256 index);

    struct DocumentRecord {
        bytes32 docHash;
        address ownerWallet;
        string ipfsCid;
        uint256 timestamp;
    }

    DocumentRecord[] private documentRecords;
    mapping(bytes32 docHash => uint256[] indexes) private documentIndexesByHash;

    event DocumentRegistered(
        bytes32 indexed docHash, uint256 indexed documentId, address indexed owner, string ipfsCid, uint256 timestamp
    );

    constructor(address initialOwner) Ownable(initialOwner) { }

    function registerDocument(bytes32 docHash, address ownerWallet, string calldata ipfsCid)
        external
        onlyOwner
        returns (uint256 documentId)
    {
        if (docHash == bytes32(0)) revert EmptyDocumentHash();
        if (ownerWallet == address(0)) revert EmptyOwner();
        if (bytes(ipfsCid).length == 0) revert EmptyIpfsCid();

        documentId = documentRecords.length;
        documentRecords.push(
            DocumentRecord({ docHash: docHash, ownerWallet: ownerWallet, ipfsCid: ipfsCid, timestamp: block.timestamp })
        );
        documentIndexesByHash[docHash].push(documentId);
        emit DocumentRegistered(docHash, documentId, ownerWallet, ipfsCid, block.timestamp);
        return documentId;
    }

    function getDocument(bytes32 docHash)
        external
        view
        returns (address ownerWallet, string memory ipfsCid, uint256 timestamp, bool exists)
    {
        uint256[] storage indexes = documentIndexesByHash[docHash];
        if (indexes.length == 0) return (address(0), "", 0, false);

        DocumentRecord storage document = documentRecords[indexes[indexes.length - 1]];
        return (document.ownerWallet, document.ipfsCid, document.timestamp, true);
    }

    function getDocumentRecord(uint256 documentId)
        external
        view
        returns (bytes32 docHash, address ownerWallet, string memory ipfsCid, uint256 timestamp)
    {
        DocumentRecord storage document = documentRecords[documentId];
        return (document.docHash, document.ownerWallet, document.ipfsCid, document.timestamp);
    }

    function getDocumentByHashAt(bytes32 docHash, uint256 index)
        external
        view
        returns (uint256 documentId, address ownerWallet, string memory ipfsCid, uint256 timestamp)
    {
        uint256[] storage indexes = documentIndexesByHash[docHash];
        if (index >= indexes.length) revert DocumentIndexOutOfBounds(docHash, index);

        documentId = indexes[index];
        DocumentRecord storage document = documentRecords[documentId];
        return (documentId, document.ownerWallet, document.ipfsCid, document.timestamp);
    }

    function getDocumentCount() external view returns (uint256) {
        return documentRecords.length;
    }

    function getDocumentCountByHash(bytes32 docHash) external view returns (uint256) {
        return documentIndexesByHash[docHash].length;
    }
}
