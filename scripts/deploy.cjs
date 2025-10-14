// scripts/deploy.js
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // ContractRegistry 배포
  const Registry = await hre.ethers.getContractFactory("ContractRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  console.log("ContractRegistry deployed to:", await registry.getAddress());

  // TimeSheet 배포
  const TimeSheet = await hre.ethers.getContractFactory("TimeSheet");
  const timesheet = await TimeSheet.deploy();
  await timesheet.waitForDeployment();
  console.log("TimeSheet deployed to:", await timesheet.getAddress());

  console.log("\n👉 .env 파일에 복사하세요:");
  console.log(`CONTRACT_ADDRESS=${await registry.getAddress()}`);
  console.log(`TIMESHEET_ADDRESS=${await timesheet.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
