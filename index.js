const { Watcher } = require("./src/wather");
const { getAssetContract, getCollection } = require("./src/api/opensea");

require("dotenv").config();

const watcher = new Watcher({
  alchemyApiKey: process.env.ALCHEMY_API_KEY,
  etherscanApiKey: process.env.ETHERSCAN_API_KEY,
  maxValue: 0, // 大于此费用的mint事件直接过滤掉
});
watcher.onMint = async function ({ tx, methodData }) {
  const address = tx.to;
  const { collection } = await getAssetContract(address);
  if (collection?.slug) {
    const { collection: slugCollection } = await getCollection(collection.slug);
    const slugStats = slugCollection?.stats;
    console.log(`:information_source:  Free Mint 通知 :information_source: 
合约调用：${methodData.method}(${methodData.inputs
      .map((e) => `${e.name} ${e.type}`)
      .join(", ")})
NFT：${collection.slug}
Etherscan：https://etherscan.io/address/${address}
官网：${collection.external_url || "未捕获"}
Opeansea：https://opensea.io/collection/${collection.slug}
已铸造数： ${slugStats?.total_supply || 0}
地板价格： ${slugStats?.floor_price || 0} ETH
总交易额： ${slugStats?.total_volume || 0} ETH
    `);
  }
};
watcher.run();
