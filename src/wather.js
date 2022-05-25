const { ethers } = require("ethers");
const { getMethodData } = require("./api/etherscan");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyConstract(tx, provider) {
  /*   const code = await provider.getCode(address);
  if (code == "0x") {
    return false;
  } */
  const contract = new ethers.Contract(
    tx.to,
    [
      {
        inputs: [
          {
            internalType: "bytes4",
            name: "interfaceId",
            type: "bytes4",
          },
        ],
        name: "supportsInterface",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "owner",
        outputs: [
          {
            internalType: "address",
            name: "",
            type: "address",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    ],
    provider
  );

  const checkList = [
    async () => {
      // 检查是否为ERC-721合约
      return await contract.supportsInterface("0x80ac58cd");
    },
    async () => {
      // 检查是否为非owner调用
      return (await await contract.owner()) != tx.from;
    },
  ];

  // 如果有一个检查失败，则认为是不符合条件
  try {
    for (let i = 0; i < checkList.length; i++) {
      const check = checkList[i];
      const result = await check();
      if (!result) {
        return false;
      }
    }
  } catch (e) {
    return false;
  }
  return true;
}

module.exports = {
  Watcher: class {
    _options = {};
    onMint = null;

    constructor(options) {
      if (options) {
        Object.assign(this._options, options);
      }
    }

    async run() {
      const queue = [];
      this._provider = new ethers.providers.AlchemyProvider(
        "mainnet",
        this._options.alchemyApiKey
      );
      this._provider.on(
        [
          ethers.utils.id("Transfer(address,address,uint256)"),
          ethers.utils.hexZeroPad(ethers.constants.HashZero, 32),
        ],
        (log) => {
          if (log.topics.length == 4 && log.data == "0x") {
            queue.push(log);
          }
        }
      );

      const CONTRACT_CACHE = {};

      while (true) {
        let log = queue.pop();
        if (!log) {
          await sleep(1000);
          continue;
        }
        if (this.onMint) {
          try {
            const tx = await this._provider.getTransaction(log.transactionHash);
            if (tx.value.toBigInt() > this._options.maxValue) {
              continue;
            }
            const address = tx.to;
            if (!(address in CONTRACT_CACHE)) {
              CONTRACT_CACHE[address] = true;
              if (await verifyConstract(tx, this._provider)) {
                // 合约函数调用数据
                const methodData = await getMethodData(
                  this._options.etherscanApiKey,
                  address,
                  tx.data
                );
                if (!methodData) {
                  continue;
                }
                this.onMint({
                  tx,
                  methodData,
                });
              }
            }
          } catch (e) {
            console.error("出现异常：" + e);
          }
        }
      }
    }
  },
};
