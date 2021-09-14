# értem én, hogy egy API-t nem tudtak csinálni, de még letölthető CSV sincs, ennyi pénzből ennyi emberrel biztosan nem telik rá
# végülis csak kormányt akarnak váltani, nincs ezeknek az adatoknak semmi jelentősége

from http.server import BaseHTTPRequestHandler
import os
import requests
from bs4 import BeautifulSoup  # mindenhova beférkőzik ez a levesember. igazából engem is megvett kilóra, ez a projekt az ő megrendelésére készül szigorúan szabad piaci alapon.
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from unidecode import unidecode  # erre igazán írhattam volna egy függvényt magamnak
import threading
from urllib.parse import urlparse, parse_qs
import re

session = requests.Session()
session.mount("https://", requests.adapters.HTTPAdapter(pool_connections=1, pool_maxsize=100))

constituencyPadding = {
    "BARANYA": 24,
    "BAZ": 32,
    "BÁCS": 18,
    "BÉKÉS": 28,
    "CSONGRÁD": 39,
    "FEJÉR": 43,
    "GYŐR": 48,
    "HAJDÚ": 53,
    "HEVES": 59,
    "JÁSZ": 62,
    "KOMÁROM": 66,
    "NÓGRÁD": 69,
    "PEST": 71,
    "SOMOGY": 83,
    "SZABOLCS": 87,
    "TOLNA": 93,
    "VAS": 96,
    "VESZPRÉM": 99,
    "ZALA": 103
}

knownOrganizations = ["mszp", "parbeszed", "jobbik", "momentum", "mmm", "lmp", "dk", "liberalisok", "uvnp", "la75"]

def getConstituency(string):
    if string.startswith("BP"):
        return int(string[2:])

    county, localConstituency = string.split(" ")
    return constituencyPadding[county] + int(localConstituency)

def handleParagraph(paragraph):
    string = str(paragraph)
    if "Választott frakció:" in string:
        originalString = paragraph.findChildren("strong")[0].next_sibling.strip()
        formattedString = unidecode(originalString.lower())
        return "party", formattedString if formattedString in knownOrganizations else originalString

    if "Egyéni választókerület:" in string:
        return "constituency", getConstituency(paragraph.findChildren("strong")[0].next_sibling.strip())
    
    if "Jelölő szervezetek:" in string:
        supporterList = paragraph.findChildren("strong")[0].next_sibling.strip().split(", ")
        return "supporters", [unidecode(i.lower()) if unidecode(i.lower()) in knownOrganizations else i for i in supporterList]

    keys = {
        "nyilvános önéletrajz": "cv",
        "vagyonnyilatkozat": "declarationOfAssets",
        "feddhetetlenségi nyilatkozat": "declarationOfIntegrity",
        "etikai kódex": "codeOfEthics",
        "értéknyilatkozat": "declarationOfValues",
        "nyilvántartásba vételi határozat": "decisionOfRegistration"
    }

    for a in paragraph.findChildren("a"):
        try:
            return "document", keys[a.getText()], a["href"]
        except KeyError:
            pass


def split(inputList, parts):
    quotient, remainder = divmod(len(inputList), parts)
    return [inputList[i*quotient + min(i, remainder):(i+1)*quotient+min(i+1, remainder)] for i in range(parts)]


def handleProfile(profile, index=None, pm=False):
    candidate = {}
    politicianSoup = BeautifulSoup(profile, "html.parser").find("article")

    candidate["name"] = politicianSoup.findChildren("h1", {"class": "entry-title"}, recursive=True)[0].getText()
    currentCandidateContent = politicianSoup.findChildren("div", {"class": "entry-content"}, recursive=True)[0]

    for paragraph in re.compile("<br\/?>").split(str(currentCandidateContent.findChildren("p")[0])):
        result = handleParagraph(BeautifulSoup(paragraph, "html.parser"))
        if not result:
            continue

        if result[0] == "document":
            if "documents" not in candidate:
                candidate["documents"] = {}
            candidate["documents"][result[1]] = result[2]
        else:
            candidate[result[0]] = result[1]

    if "supporters" in candidate:
        if candidate["supporters"] == ["fuggetlen"]:
            candidate["supporters"] = []
        elif "party" in candidate:
            try:
                candidate["supporters"].remove(candidate["party"])
            except ValueError:
                pass

    firebaseThread.join()
    batch.set((pmCandidatesCollection if pm else politiciansCollection).document((unidecode(candidate["name"].split(" ")[0].lower()) if pm else str(index).zfill(3))), candidate)


def getProfile(link, index, pm=False):
    handleProfile(session.get(link).content, index, pm)


def getPmCandidates():
    pmCandidateSoup = BeautifulSoup(session.get("https://elovalasztas2021.hu/me-jeloltek/").content, "html.parser").find("article").findChildren("div", {"class": "entry-content"})[0].findChildren("div", {"class": "one_third"})

    threads = []
    for index, candidateContainer in enumerate(pmCandidateSoup):
        try:
            link = candidateContainer.findChildren("a")[0]["href"]
        except IndexError:
            continue

        newThread = threading.Thread(None, getProfile, args=(link, None, True))
        newThread.start()

    for thread in threads:
        thread.join()


def getPoliticians(part, parts):
    confirmedPoliticianSoup = BeautifulSoup(session.get("https://elovalasztas2021.hu/oevk-jeloltek/").content, "html.parser").find("article").findChildren("div", {"class": "entry-content"})[0].findChildren("a")

    threads = []

    links = split(confirmedPoliticianSoup[2:-2], parts)
    padding = sum(len(i) for i in links[0:part])
    
    for index, a in enumerate(links[part]):
        newThread = threading.Thread(None, getProfile, args=("https://elovalasztas2021.hu" + a["href"], padding + index))
        threads.append(newThread)
        newThread.start()

    for thread in threads:
        thread.join()


def initFirebase():
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate("./api/key.json"))
    database = firestore.client()

    global batch
    batch = database.batch()

    global pmCandidatesCollection
    pmCandidatesCollection = database.collection("pmCandidates")

    global politiciansCollection
    politiciansCollection = database.collection("politicians")


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        auth = self.headers.get("Authorization")
        if auth != "Basic " + os.getenv("AUTH_B64"):
            self.send_response(401)
            self.send_header("WWW-Authenticate", "Basic")
            self.end_headers()
            return

        try:
            part = int(parse_qs(urlparse(self.path).query)["part"][0])
        except:
            part = 0
            
        try:
            parts = int(parse_qs(urlparse(self.path).query)["parts"][0])
        except:
            parts = 4

        self.send_response(200)
        self.end_headers()

        global firebaseThread
        firebaseThread = threading.Thread(None, initFirebase)
        firebaseThread.start()

        if part != parts-1:
            pmThread = threading.Thread(None, getPmCandidates)
            pmThread.start()

        politiciansThread = threading.Thread(None, getPoliticians, args=(part, parts))
        politiciansThread.start()

        if part != parts-1:
            pmThread.join()
        politiciansThread.join()

        batch.commit()

        self.wfile.write("done".encode())
        return
