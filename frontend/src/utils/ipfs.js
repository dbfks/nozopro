// Build a gateway URL for an IPFS CID or ipfs:// URL
export function ipfsGatewayUrl(cidOrUrl, opts = {}) {
  const gateway = opts.gateway || "https://gateway.pinata.cloud/ipfs/"; // default Pinata public gateway
  let cid = String(cidOrUrl || "");
  cid = cid.replace(/^ipfs:\/\//, "");
  cid = cid.replace(/^https?:\/\/[^/]+\/ipfs\//, "");
  // remove leading / if present
  if (cid.startsWith("/")) cid = cid.slice(1);
  return gateway + cid;
}

export function ipfsGatewayUrls(cidOrUrl) {
  const gateways = [
    "https://gateway.pinata.cloud/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://ipfs.io/ipfs/",
  ];
  return gateways.map((g) => ipfsGatewayUrl(cidOrUrl, { gateway: g }));
}


