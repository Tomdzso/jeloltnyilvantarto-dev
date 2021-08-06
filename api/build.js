const fs = require("fs");

fs.writeFileSync("./private/key.json", process.env.GOOGLE_CLOUD_KEY)