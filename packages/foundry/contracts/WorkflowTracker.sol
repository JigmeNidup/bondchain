// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract WorkflowTracker is Ownable {
    error EmptyDocumentHash();
    error EmptyApprover();
    error WorkflowMissing(bytes32 docHash);

    enum WorkflowStatus {
        None,
        Pending,
        InReview,
        AwaitingApproval,
        Approved,
        Rejected,
        Resubmitted
    }

    struct Workflow {
        bytes32 docHash;
        uint8 currentStep;
        WorkflowStatus status;
        string verificationUrl;
        uint256 updatedAt;
        bool exists;
    }

    mapping(bytes32 docHash => Workflow workflow) private workflows;

    event WorkflowCreated(bytes32 indexed docHash, uint256 timestamp);
    event WorkflowStepCompleted(bytes32 indexed docHash, uint8 step, address indexed approver, uint256 timestamp);
    event WorkflowRejected(bytes32 indexed docHash, address indexed approver, string reason, uint256 timestamp);
    event DocumentFinalized(bytes32 indexed docHash, string verificationUrl, uint256 timestamp);

    constructor(address initialOwner) Ownable(initialOwner) { }

    function createWorkflow(bytes32 docHash) external onlyOwner returns (bool created) {
        if (docHash == bytes32(0)) revert EmptyDocumentHash();
        if (workflows[docHash].exists) return false;

        workflows[docHash] = Workflow({
            docHash: docHash,
            currentStep: 0,
            status: WorkflowStatus.Pending,
            verificationUrl: "",
            updatedAt: block.timestamp,
            exists: true
        });
        emit WorkflowCreated(docHash, block.timestamp);
        return true;
    }

    function advanceStep(bytes32 docHash, uint8 step, address approver) external onlyOwner {
        if (approver == address(0)) revert EmptyApprover();
        Workflow storage workflow = _requireWorkflow(docHash);

        workflow.currentStep = step;
        workflow.updatedAt = block.timestamp;
        if (step == 1) {
            workflow.status = WorkflowStatus.InReview;
        } else if (step == 2) {
            workflow.status = WorkflowStatus.AwaitingApproval;
        } else {
            workflow.status = WorkflowStatus.Approved;
        }

        emit WorkflowStepCompleted(docHash, step, approver, block.timestamp);
    }

    function rejectWorkflow(bytes32 docHash, address approver, string calldata reason) external onlyOwner {
        if (approver == address(0)) revert EmptyApprover();
        Workflow storage workflow = _requireWorkflow(docHash);

        workflow.currentStep = 0;
        workflow.status = WorkflowStatus.Rejected;
        workflow.updatedAt = block.timestamp;

        emit WorkflowRejected(docHash, approver, reason, block.timestamp);
    }

    function markResubmitted(bytes32 docHash) external onlyOwner {
        Workflow storage workflow = _requireWorkflow(docHash);
        workflow.status = WorkflowStatus.Resubmitted;
        workflow.updatedAt = block.timestamp;
    }

    function finalizeDocument(bytes32 docHash, string calldata verificationUrl) external onlyOwner {
        Workflow storage workflow = _requireWorkflow(docHash);
        workflow.status = WorkflowStatus.Approved;
        workflow.verificationUrl = verificationUrl;
        workflow.updatedAt = block.timestamp;
        emit DocumentFinalized(docHash, verificationUrl, block.timestamp);
    }

    function getWorkflow(bytes32 docHash)
        external
        view
        returns (
            uint8 currentStep,
            WorkflowStatus status,
            string memory verificationUrl,
            uint256 updatedAt,
            bool exists
        )
    {
        Workflow storage workflow = workflows[docHash];
        return (workflow.currentStep, workflow.status, workflow.verificationUrl, workflow.updatedAt, workflow.exists);
    }

    function _requireWorkflow(bytes32 docHash) private view returns (Workflow storage workflow) {
        if (docHash == bytes32(0)) revert EmptyDocumentHash();
        workflow = workflows[docHash];
        if (!workflow.exists) revert WorkflowMissing(docHash);
    }
}
