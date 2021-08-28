# értem én, hogy egy API-t nem tudtak csinálni, de még letölthető CSV sincs, ennyi pénzből ennyi emberrel biztosan nem telik rá
# végülis csak kormányt akarnak váltani, nincs ezeknek az adatoknak semmi jelentősége

from http.server import BaseHTTPRequestHandler
import os
import requests
from bs4 import BeautifulSoup # mindenhova beférkőzik ez a levesember. igazából engem is megvett kilóra, ez a projekt az ő megrendelésére készül szigorúan szabad piaci alapon.
from io import BytesIO as IO
import json
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from unidecode import unidecode  # erre igazán írhattam volna egy függvényt magamnak


def handleParagraph(paragraph):
    if "Jelölő szervezet:" in str(paragraph):
        return "party", [unidecode(i.lower()) for i in paragraph.findChildren("strong")[0].next_sibling.strip().split("-")]

    keys = {
        "nyilvános önéletrajz": "cv",
        "vagyonnyilatkozat": "declarationOfAssets",
        "feddhetetlenségi nyilatkozat": "declarationOfIntegrity",
        "etikai kódex": "codeOfEthics",
        "értéknyilatkozat": "declarationOfValues",
        "nyilvántartásba vételi határozat": "decisionOfRegistration"
    }

    documents = {}
    for i in paragraph.findChildren("a"):
        try:
            documents[keys[i.getText()]] = i["href"]
        except KeyError:
            pass

    if documents:
        return "documents", documents


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        auth = self.headers.get("Authorization")
        if auth != "Basic " + os.getenv("AUTH_B64"):
            self.send_response(401)
            self.send_header("WWW-Authenticate", "Basic")
            self.end_headers()
            return

        self.send_response(200)
        self.end_headers()

        firebase_admin.initialize_app(credentials.Certificate("./api/key.json"))
        database = firestore.client()

        pmCandidateSoup = BeautifulSoup(requests.get("https://elovalasztas2021.hu/me-jeloltek/").content, "html.parser").find("article").findChildren("div", {"class": "entry-content"})[0].findChildren("div", {"class": "one_third"})

        collection = database.collection("pmCandidates")

        for index, candidateContainer in enumerate(pmCandidateSoup):
            candidate = {}
            try:
                link = candidateContainer.findChildren("a")[0]["href"]
            except IndexError:
                continue

            candidate["image"] = candidateContainer.findChildren("img", recursive=True)[0]["src"]

            currentCandidateSoup = BeautifulSoup(requests.get(link).content, "html.parser").find("article")
            currentCandidateContent = currentCandidateSoup.findChildren("div", {"class": "entry-content"})[0]
            try:
                candidate["name"] = currentCandidateSoup.findChildren("h1", {"class": "entry-title"})[0].getText()
            except IndexError:
                pass

            for paragraph in currentCandidateContent.findChildren("p"):
                result = handleParagraph(paragraph)
                if result:
                    candidate[result[0]] = result[1]

            collection.document(str(index)).set(candidate)

        self.wfile.write("done".encode())
        return
