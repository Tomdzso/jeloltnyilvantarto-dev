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
            authDomain: "jeloltek.igenzet.hu",
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

    var tasks = 4;

    const callback = () => {
        if (--tasks === 0) {
            response.status(200).send("done");
        }
    };

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
                    callback();
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
            const firstPoliticiansBuffer = database.bundle("first25Politicians").add("first25Politicians", querySnapshot).build();
            const bufferStream = new stream.PassThrough();
            bufferStream.end(Buffer.from(firstPoliticiansBuffer));
            console.log("First politicians bundle: Buffer stream created!");

            bufferStream
                .pipe(bucket.file("data/firstPoliticians.bundle").createWriteStream())
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
            const lastPoliticiansBuffer = database.bundle("lastPoliticians").add("lastPoliticians", querySnapshot).build();
            const bufferStream = new stream.PassThrough();
            bufferStream.end(Buffer.from(lastPoliticiansBuffer));
            console.log("Last politicians bundle: Buffer stream created!");
            bufferStream
                .pipe(bucket.file("data/lastPoliticians.bundle").createWriteStream())
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
                    callback();
                });

            var details = [];
            querySnapshot.docs.forEach((document) => {
                details.push({ id: parseInt(document.id), ...document.data() });
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
                    callback();
                });
        })
        .catch((error) => {
            console.error(error);
            response.status(500).json({ error: error });
        });
    
    database
        .collection("pmCandidates")
        .get()
        .then((querySnapshot) => {
            console.log("PM candidates: Received response!");
            const pmCandidatesBuffer = database.bundle("pmCandidates").add("pmCandidates", querySnapshot).build();
            const bufferStream = new stream.PassThrough();
            bufferStream.end(Buffer.from(pmCandidatesBuffer));
            console.log("PM candidates bundle: Buffer stream created!");
            bufferStream
                .pipe(bucket.file("data/pmCandidates.bundle").createWriteStream())
                .on("error", (error) => {
                    console.error(error);
                    response.status(500).json({ error: error });
                })
                .on("finish", () => {
                    console.log("PM candidates bundle: File uploaded!");
                    callback();
                });

            var pmCandidates = [];
            querySnapshot.docs.forEach((document) => {
                pmCandidates.push({ id: parseInt(document.id), ...document.data() });
            });

            const pmCandidatesBufferStream = new stream.PassThrough();
            pmCandidatesBufferStream.end(Buffer.from(JSON.stringify(pmCandidates)));
            console.log("PM candidates JSON: Buffer stream created!");

            pmCandidatesBufferStream
                .pipe(bucket.file("data/pmCandidates.json").createWriteStream())
                .on("error", (error) => {
                    console.error(error);
                    response.status(500).json({ error: error });
                })
                .on("finish", () => {
                    console.log("PM candidates JSON: File uploaded!");
                    callback();
                });
        })
        .catch((error) => {
            console.error(error);
            response.status(500).json({ error: error });
        });
};
