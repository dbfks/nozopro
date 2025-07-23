// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ContractRegistry {
    struct ContractData {
        bytes32 fileHash;
        uint256 expiry;
        bool signedByEmployer;
        bool signedByWorker;
        bool approved;
    }

    mapping(uint256 => ContractData) public contracts;
    uint256 public nextId;

    event ContractRegistered(uint256 indexed id, bytes32 fileHash, uint256 expiry);
    event EmployerSigned(uint256 indexed id);
    event WorkerSigned(uint256 indexed id);
    event ContractExpired(uint256 indexed id);
    event ContractApproved(uint256 indexed id);

    function registerContract(bytes32 fileHash, uint256 expiry) external {
        uint256 id = nextId;
        contracts[id] = ContractData({
            fileHash: fileHash,
            expiry: expiry,
            signedByEmployer: false,
            signedByWorker: false,
            approved: false
        });
        nextId++;
        emit ContractRegistered(id, fileHash, expiry);
    }

    function signByEmployer(uint256 id) external {
        ContractData storage c = contracts[id];
        require(c.fileHash != 0, "Not exists");
        require(!c.signedByEmployer, "Already signed");
        c.signedByEmployer = true;
        emit EmployerSigned(id);
    }

    function signByWorker(uint256 id) external {
        ContractData storage c = contracts[id];
        require(c.fileHash != 0, "Not exists");
        require(!c.signedByWorker, "Already signed");
        c.signedByWorker = true;
        emit WorkerSigned(id);
    }

    function expireContract(uint256 id) external {
        ContractData storage c = contracts[id];
        require(block.timestamp >= c.expiry, "Not yet expired");
        emit ContractExpired(id);
    }

    function approveContract(uint256 id) external {
        ContractData storage c = contracts[id];
        require(c.signedByEmployer && c.signedByWorker, "Not fully signed");
        require(block.timestamp < c.expiry, "Expired");
        c.approved = true;
        emit ContractApproved(id);
    }
}
