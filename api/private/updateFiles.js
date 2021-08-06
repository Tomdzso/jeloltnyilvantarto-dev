module.exports = (request, response) => {
    if (
        !request.headers.authorization ||
        request.headers.authorization.indexOf("Basic ") === -1 ||
        request.headers.authorization.indexOf(process.env.AUTH_B64) === -1
    ) {
        response.setHeader("WWW-Authenticate", "Basic");
        return response.status(401).json({ message: "Unauthorized: Are you sure you want to lurk around here?" });
    }

    const admin = require("firebase-admin");
    const stream = require("stream");

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

    const database = admin.firestore();

    const bucket = admin.storage().bucket();
    console.log("Bucket loaded!");

    var politicians = [];
    var otherOneReady = false;

    var tasks = 3;

    const callback = () => {
        if (--tasks === 0) {
            response.status(200).send("done");
        }
    }

    const makeJson = () => {
        if (otherOneReady) {
            console.log("Politicians JSON: All politicians loaded!");
            const bufferStream = new stream.PassThrough();
            bufferStream.end(Buffer.from(JSON.stringify(politicians)));
            console.log("Politicians JSON: Buffer stream created!");
            bufferStream
                .pipe(bucket.file("data/politicians.json").createWriteStream())
                .on("error", (error) => {
                    console.error(error);
                    response.status(500).json({ error: error });
                })
                .on("finish", () => {
                    console.log("Politicians JSON: File uploaded!");
                    callback()
                });
        } else {
            otherOneReady = true;
        }
    };

    database
        .collection("politicians")
        .orderBy("constituency")
        .endBefore(25)
        .get()
        .then((querySnapshot) => {
            console.log("First politicians: Received response!");
            const firstDocumentsBuffer = database.bundle("first25Documents").add("first25Documents", querySnapshot).build();
            const bufferStream = new stream.PassThrough();
            bufferStream.end(Buffer.from(firstDocumentsBuffer));
            console.log("First politicians bundle: Buffer stream created!");

            bufferStream
                .pipe(bucket.file("data/firstDocuments.bundle").createWriteStream())
                .on("error", (error) => {
                    console.error(error);
                    response.status(500).json({ error: error });
                })
                .on("finish", () => {
                    console.log("First politicians bundle: File uploaded!");
                });
            querySnapshot.docs.forEach((document) => {
                politicians.push(document.data());
            });
            makeJson();
        })
        .catch((error) => {
            console.error(error);
            response.status(500).json({ error: error });
        });

    database
        .collection("politicians")
        .orderBy("constituency")
        .startAt(25)
        .get()
        .then((querySnapshot) => {
            console.log("Last politicians: Received response!");
            const lastDocumentsBuffer = database.bundle("lastDocuments").add("lastDocuments", querySnapshot).build();
            const bufferStream = new stream.PassThrough();
            bufferStream.end(Buffer.from(lastDocumentsBuffer));
            console.log("Last politicians bundle: Buffer stream created!");
            bufferStream
                .pipe(bucket.file("data/lastDocuments.bundle").createWriteStream())
                .on("error", (error) => {
                    console.error(error);
                    response.status(500).json({ error: error });
                })
                .on("finish", () => {
                    console.log("Last politicians bundle: File uploaded!");
                });

            querySnapshot.docs.forEach((document) => {
                politicians.push(document.data());
            });
            makeJson();
        })
        .catch((error) => {
            console.error(error);
            response.status(500).json({ error: error });
        });

    database
        .collection("details")
        .get()
        .then((querySnapshot) => {
            console.log("Details: Received response!");
            const detailsBuffer = database.bundle("details").add("details", querySnapshot).build();
            const bufferStream = new stream.PassThrough();
            bufferStream.end(Buffer.from(detailsBuffer));
            console.log("Details bundle: Buffer stream created!");
            bufferStream
                .pipe(bucket.file("data/details.bundle").createWriteStream())
                .on("error", (error) => {
                    console.error(error);
                    response.status(500).json({ error: error });
                })
                .on("finish", () => {
                    console.log("Details bundle: File uploaded!");
                    callback()
                });

            var details = [];
            querySnapshot.docs.forEach((document) => {
                details.push(document.data());
            });

            const detailsBufferStream = new stream.PassThrough();
            detailsBufferStream.end(Buffer.from(JSON.stringify(details)));
            console.log("Details JSON: Buffer stream created!");

            detailsBufferStream
                .pipe(bucket.file("data/details.json").createWriteStream())
                .on("error", (error) => {
                    console.error(error);
                    response.status(500).json({ error: error });
                })
                .on("finish", () => {
                    console.log("Details JSON: File uploaded!");
                    callback()
                });
        })
        .catch((error) => {
            console.error(error);
            response.status(500).json({ error: error });
        });
};
