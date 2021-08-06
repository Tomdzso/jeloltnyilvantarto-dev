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
    const fs = require("fs");

    fs.writeFileSync("./key.json", process.env.GOOGLE_CLOUD_KEY)

    const serviceAccount = require("./key.json");
    
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

    const database = admin.firestore();

    const bucket = admin.storage().bucket();
    console.log("Bucket loaded!");

    var politicians = [];
    var otherOneReady = false;

    const makeJson = () => {
        if (otherOneReady) {
            console.log("Politicians JSON: All politicians loaded!");
            fs.writeFileSync("politicians.json", JSON.stringify(politicians));
            console.log("Politicians JSON: File written!");
            bucket
                .upload("politicians.json", {
                    destination: "data/politicians.json",
                })
                .then((response) => {
                    console.log("Politicians JSON: File uploaded! Public download path:", response[0].publicUrl());
                    fs.unlinkSync("politicians.json");
                    console.log("Politicians JSON: File deleted!");
                })
                .catch((error) => {
                    console.error(error);
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
            fs.writeFileSync("firstDocuments.bundle", firstDocumentsBuffer);
            console.log("First politicians bundle: File written!");
            bucket
                .upload("firstDocuments.bundle", {
                    destination: "data/firstDocuments.bundle",
                })
                .then((response) => {
                    console.log("First politicians bundle: File uploaded! Public download path:", response[0].publicUrl());
                    fs.unlinkSync("firstDocuments.bundle");
                    console.log("First politicians bundle: File deleted!");
                })
                .catch((error) => {
                    console.error(error);
                });
            querySnapshot.docs.forEach((document) => {
                politicians.push({ id: document.id, ...document.data() });
            });
            makeJson();
        })
        .catch((error) => {
            console.error(error);
        });

    database
        .collection("politicians")
        .orderBy("constituency")
        .startAt(25)
        .get()
        .then((querySnapshot) => {
            console.log("Last politicians: Received response!");
            const lastDocumentsBuffer = database.bundle("lastDocuments").add("lastDocuments", querySnapshot).build();
            fs.writeFileSync("lastDocuments.bundle", lastDocumentsBuffer);
            console.log("Last politicians bundle: File written!");
            bucket
                .upload("lastDocuments.bundle", {
                    destination: "data/lastDocuments.bundle",
                })
                .then((response) => {
                    console.log("Last politicians bundle: File uploaded! Public download path:", response[0].publicUrl());
                    fs.unlinkSync("lastDocuments.bundle");
                    console.log("Last politicians bundle: File deleted!");
                })
                .catch((error) => {
                    console.error(error);
                });
            querySnapshot.docs.forEach((document) => {
                politicians.push({ id: document.id, ...document.data() });
            });
            makeJson();
        })
        .catch((error) => {
            console.error(error);
        });

    database
        .collection("details")
        .get()
        .then((querySnapshot) => {
            console.log("Details: Received response!");
            const lastDocumentsBuffer = database.bundle("details").add("details", querySnapshot).build();
            fs.writeFileSync("details.bundle", lastDocumentsBuffer);
            console.log("Details bundle: File written!");
            bucket
                .upload("details.bundle", {
                    destination: "data/details.bundle",
                })
                .then((response) => {
                    console.log("Details bundle: File uploaded! Public download path:", response[0].publicUrl());
                    fs.unlinkSync("details.bundle");
                    console.log("Details bundle: File deleted!");
                })
                .catch((error) => {
                    console.error(error);
                });

            var details = [];
            querySnapshot.docs.forEach((document) => {
                details.push({ id: document.id, ...document.data() });
            });
            fs.writeFileSync("details.json", JSON.stringify(details));
            console.log("Details JSON: File written!");
            bucket
                .upload("details.json", {
                    destination: "data/details.json",
                })
                .then((response) => {
                    console.log("Details JSON: File uploaded! Public download path:", response[0].publicUrl());
                    fs.unlinkSync("details.json");
                    console.log("Details JSON: File deleted!");
                })
                .catch((error) => {
                    console.error(error);
                });
        })
        .catch((error) => {
            console.error(error);
        });

    response.status(200).send("done");
    /*
    const lastDocuments = database.collection("politicians").orderBy("id").startAt(25).get()

    const lastDocumentsBuffer = database.bundle("lastDocuments").add("lastDocuments", lastDocuments).build()
*/
};
