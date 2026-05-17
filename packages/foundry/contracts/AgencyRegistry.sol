// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract AgencyRegistry is Ownable {
    error EmptyAgencyId();
    error EmptyNameHash();
    error EmptyMemberHash();
    error EmptyServiceId();
    error EmptyWorkflowHash();

    event AgencyEnrolled(bytes32 indexed agencyId, bytes32 indexed nameHash, uint256 timestamp);
    event AgencyAdminRegistered(bytes32 indexed agencyId, bytes32 indexed adminWalletHash, uint256 timestamp);
    event AgencyOfficerRegistered(bytes32 indexed agencyId, bytes32 indexed officerWalletHash, uint256 timestamp);
    event AgencyServiceCreated(
        bytes32 indexed agencyId, bytes32 indexed serviceId, bytes32 serviceNameHash, uint256 timestamp
    );
    event AgencyWorkflowConfigured(
        bytes32 indexed agencyId, bytes32 indexed serviceId, bytes32 workflowHash, uint256 timestamp
    );

    constructor(address initialOwner) Ownable(initialOwner) { }

    function logAgencyEnrolled(bytes32 agencyId, bytes32 nameHash) external onlyOwner {
        if (agencyId == bytes32(0)) revert EmptyAgencyId();
        if (nameHash == bytes32(0)) revert EmptyNameHash();
        emit AgencyEnrolled(agencyId, nameHash, block.timestamp);
    }

    function logAgencyAdminRegistered(bytes32 agencyId, bytes32 adminWalletHash) external onlyOwner {
        if (agencyId == bytes32(0)) revert EmptyAgencyId();
        if (adminWalletHash == bytes32(0)) revert EmptyMemberHash();
        emit AgencyAdminRegistered(agencyId, adminWalletHash, block.timestamp);
    }

    function logAgencyOfficerRegistered(bytes32 agencyId, bytes32 officerWalletHash) external onlyOwner {
        if (agencyId == bytes32(0)) revert EmptyAgencyId();
        if (officerWalletHash == bytes32(0)) revert EmptyMemberHash();
        emit AgencyOfficerRegistered(agencyId, officerWalletHash, block.timestamp);
    }

    function logAgencyServiceCreated(bytes32 agencyId, bytes32 serviceId, bytes32 serviceNameHash) external onlyOwner {
        if (agencyId == bytes32(0)) revert EmptyAgencyId();
        if (serviceId == bytes32(0)) revert EmptyServiceId();
        if (serviceNameHash == bytes32(0)) revert EmptyNameHash();
        emit AgencyServiceCreated(agencyId, serviceId, serviceNameHash, block.timestamp);
    }

    function logAgencyWorkflowConfigured(bytes32 agencyId, bytes32 serviceId, bytes32 workflowHash) external onlyOwner {
        if (agencyId == bytes32(0)) revert EmptyAgencyId();
        if (serviceId == bytes32(0)) revert EmptyServiceId();
        if (workflowHash == bytes32(0)) revert EmptyWorkflowHash();
        emit AgencyWorkflowConfigured(agencyId, serviceId, workflowHash, block.timestamp);
    }
}
