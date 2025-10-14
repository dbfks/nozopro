// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TimeSheet {
    struct Entry {
        address worker;
        uint256 inTime;
        uint256 outTime;
    }

    // 계약 ID(string) → 출퇴근 기록 배열
    mapping(string => Entry[]) public entries;

    event ClockIn(string indexed agreementId, address indexed worker, uint256 time);
    event ClockOut(string indexed agreementId, address indexed worker, uint256 time);

    function clockIn(string calldata _agreementId) external {
        Entry[] storage arr = entries[_agreementId];
        if (arr.length > 0) {
            require(arr[arr.length - 1].outTime != 0, "Already clocked in");
        }
        arr.push(Entry(msg.sender, block.timestamp, 0));
        emit ClockIn(_agreementId, msg.sender, block.timestamp);
    }

    function clockOut(string calldata _agreementId) external {
        Entry[] storage arr = entries[_agreementId];
        require(arr.length > 0, "No clock-in found");

        Entry storage e = arr[arr.length - 1];
        require(e.worker == msg.sender, "Not your entry");
        require(e.outTime == 0, "Already clocked out");

        e.outTime = block.timestamp;
        emit ClockOut(_agreementId, msg.sender, block.timestamp);
    }

    function getEntriesByWorker(string calldata _agreementId, address _worker)
        external
        view
        returns (Entry[] memory)
    {
        Entry[] storage arr = entries[_agreementId];
        uint256 count;
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i].worker == _worker) count++;
        }
        Entry[] memory result = new Entry[](count);
        uint256 idx;
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i].worker == _worker) {
                result[idx] = arr[i];
                idx++;
            }
        }
        return result;
    }
}
