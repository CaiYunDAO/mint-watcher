const http2 = require("http2");

function get(path) {
  return new Promise((resolve, reject) => {
    const session = http2.connect("https://api.opensea.io", {
      minVersion: "TLSv1.3",
      maxVersion: "TLSv1.3",
    });

    session.on("error", (err) => {
      reject(err);
    });

    const req = session.request({
      [http2.constants.HTTP2_HEADER_AUTHORITY]: "api.opensea.io",
      [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_GET,
      [http2.constants.HTTP2_HEADER_PATH]: path,
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36 Edg/100.0.1185.50",
    });

    req.setEncoding("utf8");
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      session.close();
      if (data) {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      }
    });
    req.on("error", (err) => {
      reject(err);
    });
    req.end();
  });
}

module.exports = {
  async getAssetContract(address) {
    return await get(`/api/v1/asset_contract/${address}`);
  },
  async getCollection(slug) {
    return await get(`/api/v1/collection/${slug}`);
  },
};