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

    // string 기반 식별자 사용
    mapping(string => ContractData) public contracts;

    event ContractRegistered(string indexed id, bytes32 fileHash, uint256 expiry);
    event EmployerSigned(string indexed id);
    event WorkerSigned(string indexed id);
    event ContractExpired(string indexed id);
    event ContractApproved(string indexed id);

    function registerContract(string calldata id, bytes32 fileHash, uint256 expiry) external {
        ContractData storage c = contracts[id];
        require(c.fileHash == 0, "Already exists"); // 중복 방지
        contracts[id] = ContractData({
            fileHash: fileHash,
            expiry: expiry,
            signedByEmployer: false,
            signedByWorker: false,
            approved: false
        });
        emit ContractRegistered(id, fileHash, expiry);
    }

    function signByEmployer(string calldata id) external {
        ContractData storage c = contracts[id];
        require(c.fileHash != 0, "Not exists");
        require(!c.signedByEmployer, "Already signed");
        c.signedByEmployer = true;
        emit EmployerSigned(id);
    }

    function signByWorker(string calldata id) external {
        ContractData storage c = contracts[id];
        require(c.fileHash != 0, "Not exists");
        require(!c.signedByWorker, "Already signed");
        c.signedByWorker = true;
        emit WorkerSigned(id);
    }

    function expireContract(string calldata id) external {
        ContractData storage c = contracts[id];
        require(block.timestamp >= c.expiry, "Not yet expired");
        emit ContractExpired(id);
    }

    function approveContract(string calldata id) external {
        ContractData storage c = contracts[id];
        require(c.signedByEmployer && c.signedByWorker, "Not fully signed");
        require(block.timestamp < c.expiry, "Expired");
        c.approved = true;
        emit ContractApproved(id);
    }
}
