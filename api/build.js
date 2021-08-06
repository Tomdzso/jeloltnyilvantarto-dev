const fs = require("fs");

fs.writeFileSync("./key.json", process.env.GOOGLE_CLOUD_KEY)