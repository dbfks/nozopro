// scripts/deploy.js
require('dotenv').config();
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);

  // 1) ContractRegistry 배포
  const Registry = await hre.ethers.getContractFactory('ContractRegistry');
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  console.log(
   'ContractRegistry deployed to:',
   await registry.getAddress()
  );

  // 2) TimeSheet 배포
  const TimeSheet = await hre.ethers.getContractFactory('TimeSheet');
  const timesheet = await TimeSheet.deploy();
  await timesheet.waitForDeployment();
  console.log(
    'TimeSheet deployed to:',
    await timesheet.getAddress()
  );

  // ▶ .env 복사를 위해 실제 배포된 주소를 변수에 저장
   const registryAddr  = await registry.getAddress();
   const timesheetAddr = await timesheet.getAddress();
 
   console.log('\n👉 .env 에 다음 값을 복사하세요:');
   console.log(`CONTRACT_ADDRESS=${registryAddr}`);
   console.log(`TIMESHEET_ADDRESS=${timesheetAddr}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
