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
            details.forEach((politician, index) => {
                Object.keys(politician).forEach((key) => {
                    politicians[index][key] = politician[key];
                });
            });
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
