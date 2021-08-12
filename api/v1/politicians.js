module.exports = (request, response) => {
    const admin = require("firebase-admin");

    if (admin.apps.length === 0) {
        const serviceAccount = require("../key.json");

        admin.initializeApp({
            credentials: admin.credential.cert(serviceAccount),
            apiKey: "AIzaSyCuueHgTYGlmCv1QKzCKz_Hw4hF7-8XTAA",
            authDomain: "jeloltek.tk",
            projectId: "ellenzeki-osszefogas22",
            storageBucket: "ellenzeki-osszefogas22.appspot.com",
            messagingSenderId: "916575293124",
            appId: "1:916575293124:web:52f9a3f944e7a2649dc391",
            measurementId: "G-42V9PXX3L5",
        });
    }

    const bucket = admin.storage().bucket();
    var politicians;
    var details;
    var otherOneReady = false;
    const sendResponse = () => {
        if (otherOneReady) {
            details.forEach((politician) => {
                Object.keys(politician).forEach((key) => {
                    if (key !== "id" && !(typeof politician[key] === "object" && politician[key].length == 0)) {
                        politicians[politician.id][key] = politician[key];
                    }
                });
            });
            var date = new Date(Date.now());
            date.setHours(date.getHours() + 1, 1, 0, 0);

            response.setHeader("Cache-Control", "public, max-age=" + Math.round((date.getTime() - Date.now()) / 1000));
            response.setHeader("Expires", date.toUTCString());
            response.setHeader("Access-Control-Allow-Origin", "*");
            response.status(200).json(politicians);
        } else {
            otherOneReady = true;
        }
    };

    bucket
        .file("data/politicians.json")
        .download()
        .then((data) => {
            politicians = JSON.parse(data[0]);
            sendResponse();
        })
        .catch((error) => {
            console.error(error);
            response.status(500).json({ error: error });
        });
    bucket
        .file("data/details.json")
        .download()
        .then((data) => {
            details = JSON.parse(data[0]);
            sendResponse();
        })
        .catch((error) => {
            console.error(error);
            response.status(500).json({ error: error });
        });
};
