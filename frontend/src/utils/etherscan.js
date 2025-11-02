const ETHERSCAN_API_KEY = process.env.REACT_APP_ETHERSCAN_API_KEY || "";
const ETHERSCAN_API = "https://api-sepolia.etherscan.io/api";

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// Fetch transaction, receipt, and block for human-friendly details
export async function getTxDetails(txHash) {
  try {
    console.log("Fetching tx details for:", txHash);
    const key = ETHERSCAN_API_KEY ? `&apikey=${ETHERSCAN_API_KEY}` : "";
    
    // 트랜잭션 정보 조회
    const txUrl = `${ETHERSCAN_API}?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}${key}`;
    console.log("TX URL:", txUrl);
    const txRes = await fetchJson(txUrl);
    console.log("TX Response:", txRes);
    const tx = txRes?.result || null;
    if (!tx) {
      console.log("No transaction found");
      return null;
    }

    // 리시트 정보 조회
    const rcUrl = `${ETHERSCAN_API}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}${key}`;
    console.log("Receipt URL:", rcUrl);
    const rcRes = await fetchJson(rcUrl);
    console.log("Receipt Response:", rcRes);
    const rc = rcRes?.result || {};

    const blockNumberHex = tx.blockNumber || rc.blockNumber;
    let timestamp = null;
    if (blockNumberHex) {
      const blkUrl = `${ETHERSCAN_API}?module=proxy&action=eth_getBlockByNumber&tag=${blockNumberHex}&boolean=true${key}`;
      console.log("Block URL:", blkUrl);
      const blkRes = await fetchJson(blkUrl);
      console.log("Block Response:", blkRes);
      const blk = blkRes?.result;
      if (blk?.timestamp) {
        timestamp = parseInt(blk.timestamp, 16) * 1000;
      }
    }

    const toLower = (v) => (typeof v === "string" ? v.toLowerCase() : v);

    const result = {
      hash: txHash,
      from: toLower(tx.from),
      to: toLower(tx.to || rc.to),
      blockNumber: blockNumberHex ? parseInt(blockNumberHex, 16) : null,
      status: rc.status === "0x1" ? "success" : rc.status === "0x0" ? "failed" : "pending",
      gasUsed: rc.gasUsed ? parseInt(rc.gasUsed, 16) : null,
      cumulativeGasUsed: rc.cumulativeGasUsed ? parseInt(rc.cumulativeGasUsed, 16) : null,
      timestamp,
    };
    
    console.log("Final result:", result);
    return result;
  } catch (e) {
    console.error("getTxDetails error", e);
    return null;
  }
}

export function etherscanTxUrl(txHash) {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}


