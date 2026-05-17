// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";
import { AgencyRegistry } from "../contracts/AgencyRegistry.sol";
import { DocumentRegistry } from "../contracts/DocumentRegistry.sol";
import { IdentityRegistry } from "../contracts/IdentityRegistry.sol";
import { SignatureLog } from "../contracts/SignatureLog.sol";
import { WorkflowTracker } from "../contracts/WorkflowTracker.sol";

contract DeployBondChain is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        new IdentityRegistry(deployer);
        new DocumentRegistry(deployer);
        new SignatureLog(deployer);
        new WorkflowTracker(deployer);
        new AgencyRegistry(deployer);
    }
}
