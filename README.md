# nozopro

# 스마트컨트랙트 인터페이스 정리

## 1. ContractRegistry.sol

### 함수 (Functions)

| 함수명                | 파라미터                          | 반환값         | 설명                                                                                     |
|--------------------|---------------------------------|-------------|----------------------------------------------------------------------------------------|
| `registerContract` | `bytes32 fileHash`<br>`uint256 expiry` | `uint256 id` | 새로운 계약을 등록하고 발급된 `id` 리턴<br>`ContractRegistered(id, fileHash, expiry)` 이벤트 발생 |
| `signByEmployer`   | `uint256 id`                    | —           | 고용주 서명 처리<br>`EmployerSigned(id)` 이벤트 발생                                         |
| `signByWorker`     | `uint256 id`                    | —           | 근로자 서명 처리<br>`WorkerSigned(id)` 이벤트 발생                                         |
| `expireContract`   | `uint256 id`                    | —           | 만료일(`expiry`) 지난 계약에 한해 호출 가능<br>`ContractExpired(id)` 이벤트 발생                |
| `approveContract`  | `uint256 id`                    | —           | 고용주·근로자 서명 완료 & 만료 전인 계약에 한해 호출 가능<br>`ContractApproved(id)` 이벤트 발생  |

### 이벤트 (Events)

| 이벤트명                                                               | 파라미터                        | 설명               |
|---------------------------------------------------------------------|-----------------------------|------------------|
| `ContractRegistered(uint256 indexed id, bytes32 fileHash, uint256 expiry)` | `id`<br>`fileHash`<br>`expiry` | 계약 등록 시 발생       |
| `EmployerSigned(uint256 indexed id)`                                 | `id`                         | 고용주 서명 완료 시 발생 |
| `WorkerSigned(uint256 indexed id)`                                   | `id`                         | 근로자 서명 완료 시 발생 |
| `ContractExpired(uint256 indexed id)`                                | `id`                         | 만료일 도래 시 발생      |
| `ContractApproved(uint256 indexed id)`                               | `id`                         | 최종 승인 시 발생       |

---

## 2. TimeSheet.sol

### Entry 구조체

```solidity
struct Entry {
  uint256 inTime;
  uint256 outTime;
}
mapping(uint256 => Entry[]) public entries; // agreementId → 출퇴근 기록 배열

### 함수 (Functions)

| 함수명                | 파라미터                          | 반환값         | 설명                                                                                     |
|--------------------|---------------------------------|-------------|----------------------------------------------------------------------------------------|
| `clockIn` | `uint256 agreementId` | — | entries[agreementId]에 {inTime=block.timestamp, outTime=0} 추가<br>
ClockIn(agreementId, time) 이벤트 발생 |
| `clockOut`   | `uint256 agreementId`                    | —           | 마지막 Entry.outTime이 0일 때만 동작<br>
outTime = block.timestamp 설정<br>
ClockOut(agreementId, time) 이벤트 발생                                         |


### 이벤트 (Events)

| 이벤트명                                                               | 파라미터                        | 설명               |
|---------------------------------------------------------------------|-----------------------------|------------------|
| `ClockIn(uint256 indexed agreementId, uint256 time)` | `agreementId`<br>`time` | 출근(clockIn) 호출 시 발생      |
| `ClockOut(uint256 indexed agreementId, uint256 time)`                                 | `agreementId` <br>`time`                       | 퇴근(clockOut) 호출 시 발생 |
