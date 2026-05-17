// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { AgencyRegistry } from "../contracts/AgencyRegistry.sol";
import { DocumentRegistry } from "../contracts/DocumentRegistry.sol";
import { IdentityRegistry } from "../contracts/IdentityRegistry.sol";
import { SignatureLog } from "../contracts/SignatureLog.sol";
import { WorkflowTracker } from "../contracts/WorkflowTracker.sol";

contract BondChainTest is Test {
    AgencyRegistry private agencyRegistry;
    IdentityRegistry private identityRegistry;
    DocumentRegistry private documentRegistry;
    SignatureLog private signatureLog;
    WorkflowTracker private workflowTracker;

    address private owner = address(0xA11CE);
    address private wallet = address(0xB0B);
    bytes32 private linkageHash = keccak256("did:key:zDemo:0xB0B");
    bytes32 private docHash = keccak256("document");
    bytes32 private sigHash = keccak256("signature");
    bytes32 private payloadHash = keccak256(abi.encodePacked(docHash, bytes32(0)));
    bytes32 private signerHash = keccak256(abi.encodePacked(address(0xB0B)));
    bytes32 private agencyId = keccak256("agency");
    bytes32 private serviceId = keccak256("service");

    function setUp() public {
        vm.startPrank(owner);
        agencyRegistry = new AgencyRegistry(owner);
        identityRegistry = new IdentityRegistry(owner);
        documentRegistry = new DocumentRegistry(owner);
        signatureLog = new SignatureLog(owner);
        workflowTracker = new WorkflowTracker(owner);
        vm.stopPrank();
    }

    function testRegistersIdentityBinding() public {
        vm.prank(owner);
        bool created = identityRegistry.registerIdentity(linkageHash, wallet);

        (address boundWallet,, bool exists) = identityRegistry.getIdentity(linkageHash);
        assertTrue(created);
        assertTrue(exists);
        assertEq(boundWallet, wallet);
        assertTrue(identityRegistry.verifyIdentity(linkageHash));
    }

    function testIdentityRegistrationIsIdempotentForSameWallet() public {
        vm.startPrank(owner);
        assertTrue(identityRegistry.registerIdentity(linkageHash, wallet));
        assertFalse(identityRegistry.registerIdentity(linkageHash, wallet));
        vm.stopPrank();
    }

    function testOnlyOwnerCanRegisterDocument() public {
        vm.expectRevert();
        documentRegistry.registerDocument(docHash, wallet, "bafy-demo");
    }

    function testRegistersDocumentAndSignature() public {
        vm.startPrank(owner);
        assertEq(documentRegistry.registerDocument(docHash, wallet, "bafy-demo"), 0);
        assertTrue(signatureLog.logSignature(docHash, payloadHash, sigHash, bytes32(0), signerHash));
        vm.stopPrank();

        (address ownerWallet, string memory cid,, bool documentExists) = documentRegistry.getDocument(docHash);
        (
            bytes32 signedDocHash,
            bytes32 storedPayloadHash,
            bytes32 previousSigHash,
            bytes32 storedSignerHash,,
            bool signatureExists
        ) = signatureLog.getSignature(sigHash);

        assertTrue(documentExists);
        assertEq(ownerWallet, wallet);
        assertEq(cid, "bafy-demo");
        assertTrue(signatureExists);
        assertEq(signedDocHash, docHash);
        assertEq(storedPayloadHash, payloadHash);
        assertEq(previousSigHash, bytes32(0));
        assertEq(storedSignerHash, signerHash);
        assertEq(signatureLog.getDocumentSignatureCount(docHash), 1);
    }

    function testRegistersDuplicateDocumentHashes() public {
        vm.startPrank(owner);
        uint256 firstId = documentRegistry.registerDocument(docHash, wallet, "bafy-demo-1");
        uint256 secondId = documentRegistry.registerDocument(docHash, address(0xCAFE), "bafy-demo-2");
        vm.stopPrank();

        (address latestOwner, string memory latestCid,, bool exists) = documentRegistry.getDocument(docHash);
        (uint256 storedFirstId, address firstOwner, string memory firstCid,) =
            documentRegistry.getDocumentByHashAt(docHash, 0);
        (uint256 storedSecondId, address secondOwner, string memory secondCid,) =
            documentRegistry.getDocumentByHashAt(docHash, 1);

        assertEq(firstId, 0);
        assertEq(secondId, 1);
        assertTrue(exists);
        assertEq(latestOwner, address(0xCAFE));
        assertEq(latestCid, "bafy-demo-2");
        assertEq(documentRegistry.getDocumentCount(), 2);
        assertEq(documentRegistry.getDocumentCountByHash(docHash), 2);
        assertEq(storedFirstId, firstId);
        assertEq(firstOwner, wallet);
        assertEq(firstCid, "bafy-demo-1");
        assertEq(storedSecondId, secondId);
        assertEq(secondOwner, address(0xCAFE));
        assertEq(secondCid, "bafy-demo-2");
    }

    function testTracksWorkflowRejectionAndFinalization() public {
        vm.startPrank(owner);
        assertTrue(workflowTracker.createWorkflow(docHash));
        workflowTracker.advanceStep(docHash, 1, wallet);
        workflowTracker.rejectWorkflow(docHash, wallet, "Needs changes");
        workflowTracker.markResubmitted(docHash);
        workflowTracker.advanceStep(docHash, 3, wallet);
        workflowTracker.finalizeDocument(docHash, "https://bondchain.app/verify/demo");
        vm.stopPrank();

        (uint8 currentStep, WorkflowTracker.WorkflowStatus status, string memory verificationUrl,, bool exists) =
            workflowTracker.getWorkflow(docHash);

        assertTrue(exists);
        assertEq(currentStep, 3);
        assertEq(uint8(status), uint8(WorkflowTracker.WorkflowStatus.Approved));
        assertEq(verificationUrl, "https://bondchain.app/verify/demo");
    }

    function testLogsAgencyLifecycleEvents() public {
        vm.startPrank(owner);
        agencyRegistry.logAgencyEnrolled(agencyId, keccak256("Ministry"));
        agencyRegistry.logAgencyAdminRegistered(agencyId, signerHash);
        agencyRegistry.logAgencyOfficerRegistered(agencyId, keccak256("officer"));
        agencyRegistry.logAgencyServiceCreated(agencyId, serviceId, keccak256("Permit"));
        agencyRegistry.logAgencyWorkflowConfigured(agencyId, serviceId, keccak256("workflow"));
        vm.stopPrank();
    }

    function testOnlyOwnerCanLogAgencyLifecycle() public {
        vm.expectRevert();
        agencyRegistry.logAgencyEnrolled(agencyId, keccak256("Ministry"));
    }
}
