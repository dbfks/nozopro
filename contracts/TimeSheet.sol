// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TimeSheet {
    struct Entry {
        address worker;      // 누가 기록했는지
        uint256 inTime;      // 출근 타임스탬프
        uint256 outTime;     // 퇴근 타임스탬프
    }

    // agreementId → Entry 배열
    mapping(uint256 => Entry[]) public entries;

    // indexed로 agreementId·worker를 색인
    event ClockIn(
        uint256 indexed agreementId,
        address indexed worker,
        uint256 time
    );
    event ClockOut(
        uint256 indexed agreementId,
        address indexed worker,
        uint256 time
    );

    /// @notice 출근 기록
    function clockIn(uint256 _agreementId) external {
        // 가장 최근 Entry가 아직 퇴근하지 않았으면 중복 방지
        Entry[] storage arr = entries[_agreementId];
        if (arr.length > 0) {
            require(
                arr[arr.length - 1].outTime != 0,
                "Already clocked in"
            );
        }
        arr.push(Entry(msg.sender, block.timestamp, 0));
        emit ClockIn(_agreementId, msg.sender, block.timestamp);
    }

    /// @notice 퇴근 기록
    function clockOut(uint256 _agreementId) external {
        Entry[] storage arr = entries[_agreementId];
        require(arr.length > 0, "No clock-in found");

        Entry storage e = arr[arr.length - 1];
        require(e.worker == msg.sender, "Not your entry");
        require(e.outTime == 0, "Already clocked out");

        e.outTime = block.timestamp;
        emit ClockOut(_agreementId, msg.sender, block.timestamp);
    }
}
