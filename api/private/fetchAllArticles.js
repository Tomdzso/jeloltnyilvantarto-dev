// pacsi a Telexnek, nagyon jó az API
// bár nem tűnik publikusnak... 🤔
module.exports = async (req, res) => {
    if (
        !req.headers.authorization ||
        req.headers.authorization.indexOf("Basic ") === -1 ||
        req.headers.authorization.indexOf(process.env.AUTH_B64) === -1
    ) {
        res.setHeader("WWW-Authenticate", "Basic");
        res.status(401).json({ message: "Unauthorized: Are you sure you want to lurk around here?" });
    }

    const config = {
        headers: {
            "User-Agent": "jeloltnyilvantarto", // maradjon etikus. tegyünk úgy, mintha számítana. szokatlan nem "hu.ekreta.student/1.0.5/Android/0/0" jellegűt írni ide.
        },
    };

    const fetch = require("node-fetch");

    var politicians = {};

    const politiciansResponse = await (await fetch("https://dev.jeloltek.tk/api/v1/politicians")).json();
    politiciansResponse.forEach((politician, index /*van másik*/) => {
        politicians[politician.name] = index.toString().padStart(3, "0");
    });

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

    const database = admin.firestore();
    const batch = database.batch();

    var articleNum = 0;
    var remainingArticles;

    async function handleArticle(article) {
        const date = new Date(article.pubDate * 1000);
        var articleData = {
            title: article.title,
            description: article.recommender ?? article.lead,
            published: date,
            politicians: [],
            link: [
                "https://telex.hu",
                article.mainSuperTag.slug,
                date.getFullYear(),
                (date.getMonth() + 1).toString().padStart(2, "0"),
                date.getDate().toString().padStart(2, "0"),
                article.slug,
            ].join("/"),
            authors: article.articleAuthors.map((author) => ({ name: author.name, avatar: "https://telex.hu" + author.avatarSrc })),
        };
        const image = article.coverImage ?? article.imageSrc ?? article.resizedRecommendedBoxImage ?? article.facebookImage;
        if (image) {
            articleData.image = "https://telex.hu" + image;
        }
        article.tags.forEach((tag) => {
            if (Object.keys(politicians).includes(tag.name)) {
                articleData.politicians.push(database.collection("politicians").doc(politicians[tag.name]));
            }
        });
        if (articleData.politicians.length > 0) {
            batch.set(database.collection("articles").doc(articleNum.toString().padStart(4, "0")), articleData);
            articleNum++;
        }
        if (--remainingArticles === 0) {
            await batch.commit();
            res.status(200).send("done");
        }
    }

    async function handlePage(page) {
        page.forEach(async (article) => {
            const response = await (await fetch("https://telex.hu/api/articles/" + article.slug)).json();
            handleArticle(response);
        });
    }

    fetch(
        "https://telex.hu/api/search?filters=%7B%22tags%22:[%22el%C5%91v%C3%A1laszt%C3%A1s%22],%22superTags%22:[],%22authors%22:[],%22title%22:[]%7D", // keresés az "előválasztás" tag-re
        config
    )
        .then((response) => response.json())
        .then((data) => {
            remainingArticles = data.totalItems;
            handlePage(data.items);
            for (var i = 2; i <= data.totalPages; i++) {
                fetch(
                    "https://telex.hu/api/search?filters=%7B%22tags%22:[%22el%C5%91v%C3%A1laszt%C3%A1s%22],%22superTags%22:[],%22authors%22:[],%22title%22:[]%7D&oldal=" +
                        i,
                    config
                )
                    .then((response) => response.json())
                    .then((articles) => {
                        handlePage(articles.items);
                    });
            }
        });
};
