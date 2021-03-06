module.exports = (request, response) => {
    const {
        query: { filename, download },
    } = request;

    const admin = require("firebase-admin");

    if (admin.apps.length === 0) {
        const serviceAccount = require("../key.json");

        admin.initializeApp({
            credentials: admin.credential.cert(serviceAccount),
            apiKey: "AIzaSyCuueHgTYGlmCv1QKzCKz_Hw4hF7-8XTAA",
            authDomain: "jeloltek.igenzet.hu",
            projectId: "ellenzeki-osszefogas22",
            storageBucket: "ellenzeki-osszefogas22.appspot.com",
            messagingSenderId: "916575293124",
            appId: "1:916575293124:web:52f9a3f944e7a2649dc391",
            measurementId: "G-42V9PXX3L5",
        });
    }

    const bucket = admin.storage().bucket();

    const file = bucket.file(filename);

    const shrug = () => {
        response.status(502).json({ message: "This is probably not a problem with Jelöltnyilvántartó API." });
    };
    const downloadFile = () => {
        file.getMetadata()
            .then((data) => {
                response.setHeader("Content-Type", data[0].contentType);
                response.setHeader("Content-Length", data[0].size);
                file.download()
                    .then((data) => {
                        // temporary: caching will be unique for each directory
                        // store config file in cloud storage?
                        var date = new Date(Date.now());
                        date.setHours(date.getHours() + 1, 1, 0, 0);

                        response.setHeader("Cache-Control", "public, max-age=" + Math.round((date.getTime() - Date.now()) / 1000));
                        response.setHeader("Expires", date.toUTCString());
                        response.setHeader("Access-Control-Allow-Origin", "*");
                        if (download) {
                            const filenameSplit = filename.split("/");
                            response.setHeader("Content-Disposition", `attachment; filename="${filenameSplit[filenameSplit.length - 1]}"`);
                        }
                        response.status(200).send(data[0]);
                    })
                    .catch((error) => {
                        console.error(error);
                        shrug();
                    });
            })
            .catch((error) => {
                console.error(error);
                shrug();
            });
    };
    file.exists()
        .then((data) => {
            if (data[0]) {
                if (
                    JSON.parse(process.env.PUBLIC_DIRECTORIES).some((path) => {
                        return filename.startsWith(path);
                    })
                ) {
                    downloadFile();
                } else {
                    file.isPublic().then((data) => {
                        if (data[0]) {
                            downloadFile();
                        } else {
                            response.status(403).json({ error: "For Biden" });
                        }
                    });
                }
            } else {
                response.status(404).json({ error: "Not Found" });
            }
        })
        .catch((error) => {
            console.error(error);
            shrug();
        });
};
