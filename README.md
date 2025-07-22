# nozopro

## Contract Interface

### Functions

| 함수명                           | 파라미터                            | 반환값    | 설명                                                     |
|---------------------------------|-------------------------------------|----------|----------------------------------------------------------|
| `registerContract`              | `bytes32 fileHash`, `uint256 expiry` | `uint256 id`* | 계약 등록, 새로운 `id` 발급 후 `ContractRegistered` 이벤트 발생 |
| `signByEmployer`                | `uint256 id`                        | —        | 고용주 서명 처리, `EmployerSigned` 이벤트 발생           |
| `signByWorker`                  | `uint256 id`                        | —        | 근로자 서명 처리, `WorkerSigned` 이벤트 발생             |
| `triggerExpiry`                 | `uint256 id`                        | —        | 만료 체크 및 `ContractExpired` 이벤트 발생               |
| `approveContract`               | `uint256 id`                        | —        | 최종 승인 처리, `ContractApproved` 이벤트 발생           |

---

### Events

| 이벤트명                        | 파라미터                            | 설명                                     |
|---------------------------------|-------------------------------------|------------------------------------------|
| `ContractRegistered(uint256 id, bytes32 fileHash, uint256 expiry)` | `id`, `fileHash`, `expiry` | 계약 등록 시 발생                         |
| `EmployerSigned(uint256 id)`    | `id`                                | 고용주가 서명 완료했을 때 발생            |
| `WorkerSigned(uint256 id)`      | `id`                                | 근로자가 서명 완료했을 때 발생            |
| `ContractExpired(uint256 id)`   | `id`                                | 만료일 도래 시 발생                       |
| `ContractApproved(uint256 id)`  | `id`                                | 최종 승인 시 발생                         |
