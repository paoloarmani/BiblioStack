#!/usr/bin/env python3
"""
Conversione del vecchio catalogo WinIride (SCUOLE.XML) verso lo schema BiblioStack (PostgreSQL, schema school_library).

Uso:
    python3 -I converti.py ../SCUOLE.XML [cartella_output] [--online]

    --online  verifica gli ISBN su Open Library (openlibrary.org): conferma che l'ISBN corrisponda al titolo,
              corregge gli ISBN con una cifra sbagliata/mancante/scambiata quando il titolo coincide,
              aggiunge copertina, pagine e anno se mancanti. Le risposte sono salvate in cache_openlibrary.json:
              le esecuzioni successive (anche senza --online) riusano la cache senza rifare richieste.
    --google  per gli ISBN che Open Library non conosce interroga Google Books con la chiave GOOGLE_BOOKS_API_KEY
              (variabile d'ambiente o backend/.env). Massimo --google-max=N richieste per esecuzione (default 300),
              una al secondo, stop immediato a quota esaurita: si rilancia il giorno dopo e riprende dalla cache
              (cache_googlebooks.json), senza togliere quota all'applicazione.

Produce nella cartella di output:
    import_bibliostack.sql   -> script SQL da eseguire su un DB BiblioStack appena inizializzato (senza seed demo)
    opere.csv, copie.csv, autori.csv, editori.csv, ...  -> dati puliti, per revisione umana (UTF-8, separatore ;)
    anomalie.csv             -> tutto ciò che è stato corretto, scartato o va verificato a mano
    riepilogo.txt            -> statistiche della conversione

Nessuna dipendenza esterna: solo libreria standard Python 3.9+.
Le scelte di mappatura modificabili sono raccolte nella sezione CONFIGURAZIONE.
"""
import collections
import csv
import datetime as dt
import difflib
import html
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import re
import sys
import unicodedata

# =========================== CONFIGURAZIONE ===========================

SCHOOL_NAME = 'Istituto Tecnico Tecnologico "A. Pozzo"'
SCHOOL_CITY = "Trento"
LIRE_PER_EURO = 1936.27
CURRENT_YEAR = dt.date.today().year

# Stato della copia (campo <disponibilità>) -> enum item_status ('active' | 'damaged' | 'lost').
# N = "Non prestabile" (raccolte, dizionari, opere generali): resta 'active' ma con loanable = false.
# P non è documentato (vecchio "Prestato"? dotazione di laboratorio?): resta 'active' e prestabile, in anomalie.csv.
STATUS_MAP = {"S": "active", "SI": "active", "SIS": "active", "1": "active", "A": "active", "D": "active",
              "P": "active", "N": "active"}
NOT_LOANABLE_CODES = {"N"}
# Codici "U-xxxx" = copia in prestito a un utente del vecchio sistema (utenti non presenti nell'export)

# Lingue: codice sorgente (ISO 639-2/B o varianti sporche) -> (codice ISO 639-2/T usato dal seed, nome)
LANGUAGES = {
    "ita": ("ita", "Italiano"), "it": ("ita", "Italiano"),
    "eng": ("eng", "Inglese"),
    "fre": ("fra", "Francese"), "fra": ("fra", "Francese"),
    "ger": ("deu", "Tedesco"), "deu": ("deu", "Tedesco"),
    "mul": ("mul", "Multilingue"),
}

# Paesi: codici ISO 3166-1 alpha-2 in minuscolo, come li invia il frontend (vincolo CHECK nel DB)
COUNTRIES = {
    "it": ("it", "Italia"), "ita": ("it", "Italia"), "itita": ("it", "Italia"), "itiy": ("it", "Italia"),
    "gb": ("gb", "Regno Unito"), "fr": ("fr", "Francia"), "ch": ("ch", "Svizzera"),
    "gr": ("gr", "Grecia"), "de": ("de", "Germania"), "us": ("us", "Stati Uniti"), "mt": ("mt", "Malta"),
}

# Ruoli di contributo: radice cercata nel testo -> nome canonico. "Autore" DEVE avere id 1
# (backend/src/utils/workBuilder.util.js usa contributionId: 1 in modo fisso).
CONTRIBUTIONS = ["Autore", "Curatore", "Traduttore", "Introduttore", "Prefatore", "Postfatore", "Presentatore",
                 "Collaboratore", "Coordinatore", "Redattore", "Direttore", "Illustratore", "Fotografo",
                 "Commentatore", "Regista", "Altro contributo"]
CONTRIB_STEMS = [
    (r"autor", "Autore"), (r"cur|scelta e cura", "Curatore"),
    (r"tr?a?d+u|trtadu|versione|ed\. italiana", "Traduttore"),
    (r"int(r|o)?o?d|inrod|\bint\.", "Introduttore"), (r"prefa", "Prefatore"), (r"postfa", "Postfatore"),
    (r"presenta", "Presentatore"), (r"colla|contribut|intervent|relator|correlat|consulen", "Collaboratore"),
    (r"coordin|organizz|promot|progett|ideator", "Coordinatore"), (r"reda", "Redattore"),
    (r"dirett|responsabile", "Direttore"), (r"illustra|disegn|grafic|copertina|impagin", "Illustratore"),
    (r"fotogra", "Fotografo"),
    (r"comment|critic|sagg|apparat|analisi|note|nota|cronolog|bibliogra|revision|testi|testo|guida|studio|confront|scritti",
     "Commentatore"),
    (r"regist", "Regista"),
]

AAVV_KEYS = {"aavv", "aa", "vv", "autorivari", "vari", "variautori", "aavvv"}

# =========================== UTILITÀ ===========================

TOK = re.compile(r"<(/?)([^<>]+)>")


def clean(s):
    s = html.unescape(s.replace("\r", ""))
    return re.sub(r"\s+", " ", s).strip()


def strip_accents(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def key(s):
    return re.sub(r"[^a-z0-9]", "", strip_accents(s.lower())) if s else ""


def records(path):
    """Il file non è XML valido (niente radice, tag con spazi e accenti): tokenizzazione manuale.
    Ogni record è una lista ordinata di (percorso, valore); valore None = apertura di un gruppo."""
    txt = open(path, "rb").read().decode("cp1252", errors="replace")
    rec, stack, last = None, [], 0
    for m in TOK.finditer(txt):
        close, name = m.group(1), m.group(2).strip()
        between = clean(txt[last:m.start()])
        last = m.end()
        if close:
            if between and rec is not None:
                rec.append(("/".join(stack[1:]), between))
            stack.pop()
            if name == "wiride":
                yield rec
                rec = None
        else:
            if name == "wiride":
                rec = []
            elif rec is not None:
                rec.append(("/".join(stack[1:] + [name]), None))
            stack.append(name)


ANOMALIES = []
SUBJECTS = {}  # chiave normalizzata -> (id, nome)


def anomaly(scheda, campo, valore, problema, azione):
    ANOMALIES.append({"codice_scheda": scheda, "campo": campo, "valore_originale": valore,
                      "problema": problema, "azione": azione})


def fix_title(s):
    """Convenzione catalografica '<Il >Principe' (articolo non ordinabile) -> 'Il Principe'."""
    if not s:
        return s
    s = re.sub(r"<([^<>]*?)\s*>\s*", lambda m: m.group(1) + ("" if m.group(1).endswith("'") else " "), s)
    s = s.replace("<", "").replace(">", "")
    # Numeri con la lettura per l'ordinamento: "100 =cento errori" -> "100 errori", "1984=millenovecento..." -> "1984"
    s = re.sub(r"(?<![\w=])(\d[\d\-]*)\s*=\s*[a-zà-ü][a-zà-ü\-]*(\s*\.(?=\s))?", r"\1", s, flags=re.I)
    return re.sub(r"\s+", " ", s).strip(" .;,")


def nice_case(s):
    """Normalizza il TUTTO MAIUSCOLO in Iniziali Maiuscole, lasciando il resto intatto."""
    if s and s.isupper() and len(re.sub(r"[^A-Z]", "", s)) > 3:
        return s.title()
    return s


def most_common_display(counter):
    """Fra le varianti di scrittura, sceglie la più frequente preferendo quelle non tutte maiuscole."""
    return sorted(counter.items(), key=lambda kv: (kv[0].isupper(), -kv[1], kv[0]))[0][0]


# =========================== PARSING CAMPI ===========================

def parse_isbn(raw):
    if not raw:
        return None
    s = isbn_digits(raw)
    if re.fullmatch(r"\d{9}[\dX]", s):
        tot = sum((10 - i) * (10 if c == "X" else int(c)) for i, c in enumerate(s))
        if tot % 11:
            return None
        core = "978" + s[:9]
    elif re.fullmatch(r"97[89]\d{10}", s):
        core = s[:12]
    else:
        return None
    check = (10 - sum((1 if i % 2 == 0 else 3) * int(c) for i, c in enumerate(core)) % 10) % 10
    full = core + str(check)
    if len(s) == 13 and full != s:
        return None
    return full


def isbn_digits(raw):
    return re.sub(r"(?i)i\.?s\.?b\.?n\.?|[\s\-.]", "", raw or "").upper().replace("O", "0")


def isbn_candidates(raw):
    """ISBN plausibili per un codice con cifra di controllo errata: una cifra sostituita, mancante, in più,
    o due cifre adiacenti scambiate. Restituisce solo quelli con cifra di controllo valida (in ISBN-13)."""
    s = isbn_digits(raw)
    m = re.match(r"\d{8,13}X?", s)
    if not m:
        return []
    s = m.group(0)
    variants = set()
    digits = "0123456789"
    for i in range(len(s)):
        for d in digits + ("X" if i == len(s) - 1 else ""):
            variants.add(s[:i] + d + s[i + 1:])            # sostituzione
        variants.add(s[:i] + s[i + 1:])                     # cifra in più
        if i + 1 < len(s):
            variants.add(s[:i] + s[i + 1] + s[i] + s[i + 2:])  # trasposizione
    for i in range(len(s) + 1):
        for d in digits:
            variants.add(s[:i] + d + s[i:])                 # cifra mancante
    out = set()
    for v in variants:
        if len(v) in (10, 13) and v != s:
            ok = parse_isbn(v)
            if ok:
                out.add(ok)
    return sorted(out)


def title_matches(ours, theirs):
    a, b = key(fix_title(ours or "")), key(theirs or "")
    if not a or not b:
        return False
    if b.startswith(a) and len(a) >= 4:          # Open Library ha spesso titolo + sottotitolo uniti
        return True
    if len(os.path.commonprefix([a, b])) >= 20:  # stesso titolo, sottotitolo/edizione diversi
        return True
    if len(a) >= 6 and len(b) >= 6 and (a in b or b in a):
        return True
    if difflib.SequenceMatcher(None, a, b[:len(a) + 3]).ratio() >= 0.8:  # refusi nel titolo
        return True
    wa = {key(x) for x in re.split(r"\W+", strip_accents(fix_title(ours).lower())) if len(x) > 3}
    wb = {key(x) for x in re.split(r"\W+", strip_accents(theirs.lower())) if len(x) > 3}
    return bool(wa) and len(wa & wb) / len(wa) >= 0.75


class OpenLibrary:
    API = "https://openlibrary.org/api/books"
    UA = "BiblioStack-catalog-migration/1.0 (school library data migration)"

    def __init__(self, cache_path, online):
        self.cache_path, self.online = cache_path, online
        self.cache = json.load(open(cache_path, encoding="utf-8")) if os.path.exists(cache_path) else {}
        self.requests = 0

    def lookup(self, isbns):
        """Restituisce {isbn13: record|None}; interroga solo gli ISBN non in cache (se online)."""
        missing = [i for i in dict.fromkeys(isbns) if i not in self.cache]
        if self.online:
            for start in range(0, len(missing), 40):
                chunk = missing[start:start + 40]
                url = self.API + "?" + urllib.parse.urlencode(
                    {"bibkeys": ",".join("ISBN:" + i for i in chunk), "format": "json", "jscmd": "data"})
                for attempt in range(4):
                    try:
                        req = urllib.request.Request(url, headers={"User-Agent": self.UA})
                        with urllib.request.urlopen(req, timeout=60) as r:
                            data = json.load(r)
                        break
                    except Exception as e:  # rete/rate limit: attesa crescente e nuovo tentativo
                        print(f"  Open Library: {e}, nuovo tentativo...", file=sys.stderr)
                        time.sleep(5 * (attempt + 1))
                else:
                    continue
                self.requests += 1
                for i in chunk:
                    rec = data.get("ISBN:" + i)
                    self.cache[i] = None if not rec else {
                        "title": " ".join(x for x in [rec.get("title"), rec.get("subtitle")] if x),
                        "pages": rec.get("number_of_pages"),
                        "publish_date": rec.get("publish_date"),
                        "cover": (rec.get("cover") or {}).get("large") or (rec.get("cover") or {}).get("medium"),
                        "authors": [a.get("name") for a in rec.get("authors", [])],
                        "publishers": [p.get("name") for p in rec.get("publishers", [])],
                    }
                if self.requests % 10 == 0:
                    self.save()
                    print(f"  Open Library: {self.requests} richieste, {len(self.cache)} ISBN in cache", file=sys.stderr)
                time.sleep(1.0)  # cortesia verso il servizio pubblico
            self.save()
        return {i: self.cache.get(i) for i in isbns}

    def save(self):
        with open(self.cache_path, "w", encoding="utf-8") as f:
            json.dump(self.cache, f, ensure_ascii=False, indent=0, sort_keys=True)


class GoogleBooks:
    API = "https://www.googleapis.com/books/v1/volumes"

    def __init__(self, cache_path, api_key, max_requests):
        self.cache_path, self.key, self.left = cache_path, api_key, max_requests
        self.cache = json.load(open(cache_path, encoding="utf-8")) if os.path.exists(cache_path) else {}
        self.stopped = False

    def lookup(self, isbns):
        for i in dict.fromkeys(isbns):
            if i in self.cache or self.stopped or not self.key:
                continue
            if self.left <= 0:
                print("  Google Books: raggiunto il tetto di richieste per questa esecuzione", file=sys.stderr)
                self.stopped = True
                break
            url = self.API + "?" + urllib.parse.urlencode({"q": f"isbn:{i}", "key": self.key, "country": "IT"})
            try:
                req = urllib.request.Request(url, headers={"User-Agent": OpenLibrary.UA})
                with urllib.request.urlopen(req, timeout=30) as r:
                    data = json.load(r)
            except urllib.error.HTTPError as e:  # 429/403: quota o chiave -> ci si ferma subito (il messaggio non contiene la chiave)
                print(f"  Google Books: HTTP {e.code}, interrompo (riprende dalla cache alla prossima esecuzione)", file=sys.stderr)
                self.stopped = True
                break
            except Exception as e:
                print(f"  Google Books: {type(e).__name__}, salto {i}", file=sys.stderr)
                time.sleep(3)
                continue
            self.left -= 1
            rec = None
            for item in data.get("items", []):
                v = item.get("volumeInfo", {})
                ids = {x.get("identifier", "").replace("-", "") for x in v.get("industryIdentifiers", [])}
                if i in ids or i[3:12] in {x[:9] for x in ids if len(x) == 10}:
                    links = v.get("imageLinks") or {}
                    cover = links.get("thumbnail") or links.get("smallThumbnail")
                    rec = {"title": " ".join(x for x in [v.get("title"), v.get("subtitle")] if x),
                           "pages": v.get("pageCount"), "publish_date": v.get("publishedDate"),
                           "cover": cover.replace("http://", "https://") if cover else None,
                           "authors": v.get("authors", []), "publishers": [v["publisher"]] if v.get("publisher") else []}
                    break
            self.cache[i] = rec
            if len(self.cache) % 25 == 0:
                self.save()
            time.sleep(1.0)
        self.save()
        return {i: self.cache.get(i) for i in isbns}

    def save(self):
        with open(self.cache_path, "w", encoding="utf-8") as f:
            json.dump(self.cache, f, ensure_ascii=False, indent=0, sort_keys=True)


def google_key():
    if os.environ.get("GOOGLE_BOOKS_API_KEY"):
        return os.environ["GOOGLE_BOOKS_API_KEY"].strip()
    env = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "backend", ".env")
    if os.path.exists(env):
        for line in open(env, encoding="utf-8"):
            if line.startswith("GOOGLE_BOOKS_API_KEY="):
                k = line.split("=", 1)[1].strip().strip('"\'')
                return None if k.startswith("your_") else k
    return None


def enrich_with_openlibrary(works, ol, stats, gb=None):
    # 1) ISBN da correggere: genera candidati e tiene l'unico il cui titolo coincide
    to_fix = {id(w): isbn_candidates(w["isbn_originale"]) for w in works
              if w["isbn_originale"] and not w["isbn"] and not re.search(r"(?i)issn", w["isbn_originale"])}
    found = ol.lookup([c for cands in to_fix.values() for c in cands] + [w["isbn"] for w in works if w["isbn"]])
    # ISBN validi sconosciuti a Open Library: Google Books (rete solo con --google, altrimenti cache)
    if gb:
        missing = [w["isbn"] for w in works if w["isbn"] and not found.get(w["isbn"])]
        for i, rec in gb.lookup(missing).items():
            if rec:
                found[i] = rec
                stats["isbn_trovati_su_googlebooks"] += 1
    for w in works:
        cands = to_fix.get(id(w))
        if cands:
            hits = [c for c in cands if found.get(c) and title_matches(w["title"], found[c]["title"])]
            if len(hits) == 1:
                w["isbn"] = hits[0]
                anomaly(w["scheda"], "isbn", w["isbn_originale"], "ISBN corretto automaticamente via Open Library",
                        f"usato {hits[0]} ('{found[hits[0]]['title']}')")
                stats["isbn_corretti_via_openlibrary"] += 1
        if not w["isbn"]:
            continue
        rec = found.get(w["isbn"])
        if rec is None:
            stats["isbn_non_ancora_trovati"] += 1
            continue
        if w["title"] == "[senza titolo]" and rec.get("title"):
            w["title"] = rec["title"]
            anomaly(w["scheda"], "titolo", "", "titolo mancante recuperato da Open Library tramite ISBN", f"usato '{rec['title']}'")
            stats["titoli_recuperati_da_openlibrary"] += 1
        if not title_matches(w["title"], rec["title"]):
            anomaly(w["scheda"], "isbn", w["isbn"], f"nelle banche dati (Open Library/Google Books) l'ISBN corrisponde a '{rec['title']}'",
                    "mantenuto: verificare se l'ISBN o il titolo sono errati")
            stats["isbn_con_titolo_diverso_nelle_banche_dati"] += 1
            continue
        stats["isbn_confermati_da_banche_dati"] += 1
        if rec.get("cover"):
            w["cover_url"] = rec["cover"]
            stats["copertine_aggiunte"] += 1
        if not w["pages"] and isinstance(rec.get("pages"), int) and 0 < rec["pages"] < 32767:
            w["pages"] = rec["pages"]
            stats["pagine_aggiunte"] += 1
        if not w["year"]:
            y = parse_year(rec.get("publish_date"))
            if y:
                w["year"] = y
                stats["anni_aggiunti"] += 1


def parse_date(raw):
    if not raw:
        return None
    m = re.fullmatch(r"(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})", raw.strip())
    if not m:
        return None
    d, mo, y = int(m.group(1)), int(m.group(2)), m.group(3)
    y = int(y) if len(y) == 4 else (2000 + int(y) if int(y) <= CURRENT_YEAR % 100 else 1900 + int(y))
    try:
        res = dt.date(y, mo, d)
    except ValueError:
        return None
    return res if 1900 <= y <= CURRENT_YEAR else None


def parse_price(lire_raw, euro_raw, acq):
    """Restituisce il prezzo in EUR (stringa con 2 decimali) oppure None."""
    if euro_raw:
        s = euro_raw.strip().replace(" ", "")
        if re.fullmatch(r"\d+,\d+|\d+\.\d{1,3}", s):
            return f"{float(s.replace(',', '.')):.2f}"
        if re.fullmatch(r"\d{4}", s):  # "1800" = 18,00 (virgola dimenticata)
            return f"{int(s) / 100:.2f}"
        if re.fullmatch(r"\d{1,3}", s):
            return f"{int(s):.2f}"
    if lire_raw:
        s = lire_raw.strip().replace(".", "")
        s = re.sub(r"(?<=\d)[Oo]", "0", s)
        m = re.match(r"\d+", s)
        if m:
            v = int(m.group(0))
            if acq and acq.year >= 2002 and v < 1000:  # dopo il 2002 importi piccoli sono già euro
                return f"{v:.2f}"
            if v > 0:
                return f"{v / LIRE_PER_EURO:.2f}"
    return None


def parse_dewey(raw):
    if not raw:
        return None
    m = re.match(r"\s*(\d{3})(?:\s*\.\s*([\d ]*\d))?", raw)
    if not m:
        return None
    dec = (m.group(2) or "").replace(" ", "")
    return m.group(1) + ("." + dec if dec else "")


def parse_year(raw):
    if not raw:
        return None
    for y in re.findall(r"(?<!\d)(1[4-9]\d\d|20\d\d)(?!\d)", raw):
        if int(y) <= CURRENT_YEAR:
            return int(y)
    return None


def parse_pages(raw):
    if not raw or re.search(r"\d+\s*v\b", raw):  # opere in più volumi: pagine non significative
        return None
    nums = [int(n) for n in re.findall(r"(\d+)\s*p", raw)]
    return max(nums) if nums and 0 < max(nums) < 32767 else None


def parse_contributions(raw):
    if not raw:
        return ["Autore"]
    s = raw.lower()
    found = []
    for stem, name in CONTRIB_STEMS:
        m = re.search(stem, s)
        if m:
            found.append((m.start(), name))
    names = []
    for _, n in sorted(found):
        if n not in names:
            names.append(n)
    return names or ["Altro contributo"]


GENRE_FIX = {"racconti": "racconto", "poesie": "poesia", "saggi": "saggio", "manuali": "manuale",
             "interviste": "intervista", "cd - rom": "cd-rom", "libri di testo": "libro di testo",
             "testo scolastico": "libro scolastico", "dvd": "dvd video", "rivista": "periodico",
             "fiabe": "fiaba", "carta geograficaù": "carta geografica"}


# =========================== CONVERSIONE ===========================

def copies_of(rec):
    """I campi amministrativi sono una sequenza piatta: una nuova copia inizia a ogni <inventario>
    (o quando un campo si ripete)."""
    out, cur = [], None
    for k, v in rec:
        if v is None or not k.startswith("dati_amministrativi/"):
            continue
        f = k.split("/", 1)[1].replace("disponibilità", "disponibilita")
        if f == "inventario" or cur is None or f in cur:
            cur = {}
            out.append(cur)
        cur[f] = v
    return out


def people_of(rec):
    """Dentro <autore> ci possono essere più persone: cognome/nome/tipo_contributo in sequenza."""
    people, cur, in_block = [], None, False
    for k, v in rec:
        if k == "autore":
            in_block, cur = True, None
            continue
        if not k.startswith("autore/") or v is None:
            continue
        f = k.split("/", 1)[1]
        if f in ("cognome", "ente", "congresso_titolo") or (f == "nome" and (cur is None or cur.get("nome"))):
            cur = {}
            people.append(cur)
        if f == "ente" or f == "congresso_titolo":
            cur["cognome"] = v
        elif f in ("cognome", "nome"):
            cur[f] = v
        elif f == "tipo_contributo":
            cur["tipo"] = v
    return people


def main(src, outdir, online=False, google=False, google_max=300):
    os.makedirs(outdir, exist_ok=True)
    recs = list(records(src))
    stats = collections.Counter(record_totali=len(recs))

    works, items = [], []
    publisher_variants = collections.defaultdict(collections.Counter)
    author_variants = collections.defaultdict(collections.Counter)
    genre_counter = collections.Counter()
    isbn_seen = {}

    for idx, rec in enumerate(recs):
        d = collections.defaultdict(list)
        for k, v in rec:
            if v is not None:
                d[k].append(v)
        first = lambda k: d[k][0] if d[k] else None  # noqa: E731

        scheda = first("codice_scheda")
        if not scheda:
            scheda = f"SCHEDA-SENZA-CODICE-{idx + 1}"
            anomaly(scheda, "codice_scheda", "", "record senza codice scheda", "generato codice sostitutivo")

        # --- titolo
        titles = list({key(t): t for t in reversed([fix_title(t) for t in d["titolo/proprio"] if t])}.values())[::-1]
        title = " ; ".join(titles)
        if not title:
            title = fix_title(first("Struttura dell'opera/t_generale") or "")
        if not title:
            title = "[senza titolo]"
            anomaly(scheda, "titolo", "", "titolo mancante", "inserito segnaposto")
        if len(title) > 128:
            anomaly(scheda, "titolo", title, "più lungo di 128 caratteri (limite del form di modifica)",
                    "importato intero, da accorciare se si modifica l'opera da interfaccia")
        other = [fix_title(x) for x in d["titolo/complemento"]] + ["= " + fix_title(x) for x in d["titolo/parallelo"]]
        other_title = " ; ".join(x for x in other if x) or None

        # --- descrizione: abstract + note di contenuto + collana + edizione
        desc = []
        if d["abstract"]:
            desc.append(" ".join(d["abstract"]))
        if d["Note/note_contenuto"]:
            desc.append("Contiene: " + " ; ".join(d["Note/note_contenuto"]))
        if d["Collezione/t_collezione"]:
            coll = d["Collezione/t_collezione"][0]
            if d["Collezione/numero_collezione"]:
                coll += " ; " + d["Collezione/numero_collezione"][0]
            desc.append("Collana: " + coll)
        if d["edizione/ed_indicazione"]:
            desc.append("Edizione: " + d["edizione/ed_indicazione"][0])
        description = "\n\n".join(desc) or None

        # --- editore
        pub_raw = first("pubblicazione/editore")
        publisher_key = None
        if pub_raw:
            p = re.split(r"\s*[;:]\s*", pub_raw)[0].strip(" .,[]")
            if key(p) and key(p) not in ("sn", "sine nomine", "snt"):
                publisher_key = key(p)
                publisher_variants[publisher_key][nice_case(p)] += 1

        # --- lingua / paese / dewey / anno / pagine
        lang_raw = (first("lingua") or "").lower().replace("ù", "i")
        lang = LANGUAGES.get(lang_raw)
        if lang_raw and not lang:
            anomaly(scheda, "lingua", lang_raw, "codice lingua non riconosciuto", "lasciato vuoto")
        ctry_raw = (first("paese_pubblicazione") or "").lower()
        ctry = COUNTRIES.get(ctry_raw)
        if ctry_raw and not ctry:
            anomaly(scheda, "paese_pubblicazione", ctry_raw, "codice paese non riconosciuto", "lasciato vuoto")
        dewey = parse_dewey(first("codice_dewey"))
        if first("codice_dewey") and not dewey:
            anomaly(scheda, "codice_dewey", first("codice_dewey"), "Dewey non valido", "lasciato vuoto")
        year = parse_year(first("pubblicazione/data_pubblicazione"))
        pages = parse_pages(first("descrizione_fisica/pagine_volumi"))

        # --- ISBN (diventa l'id dell'opera: è così che l'app cerca le opere col lettore di barcode)
        isbn_raw = first("isbn")
        isbn = parse_isbn(isbn_raw)
        if isbn_raw and not isbn:
            anomaly(scheda, "isbn", isbn_raw, "ISBN con cifra di controllo errata o formato non valido",
                    "usato codice_scheda come id")

        # --- generi
        genres = []
        for g in d["genere"]:
            for part in re.split(r"\s*[+,]\s*", g.lower().replace("ù", "")):
                part = GENRE_FIX.get(part.strip(), part.strip())
                if part:
                    genres.append(part)
                    genre_counter[part] += 1

        # --- autori
        people = []
        for p in people_of(rec):
            last = nice_case((p.get("cognome") or "").strip(" .,;"))
            firstn = nice_case((p.get("nome") or "").strip(" .,;")) or None
            if not last and firstn:
                last, firstn = firstn, None
            if not last:
                continue
            if key(last + (firstn or "")) in AAVV_KEYS or key(last) in AAVV_KEYS:
                stats["autori_AAVV_scartati"] += 1
                continue
            akey = key(last) + "|" + key(firstn or "")
            author_variants[akey][(last, firstn)] += 1
            for c in parse_contributions(p.get("tipo")):
                people.append((akey, c))

        works.append(dict(scheda=scheda, isbn=isbn, title=title, other_title=other_title, description=description,
                          publisher_key=publisher_key, lang=lang, ctry=ctry, dewey=dewey, year=year, pages=pages,
                          genres=list(dict.fromkeys(genres)), people=list(dict.fromkeys(people)),
                          # campi non presenti nello schema BiblioStack, conservati solo nei CSV
                          luogo=first("pubblicazione/luogo"), isbn_originale=isbn_raw,
                          data_pubbl_originale=first("pubblicazione/data_pubblicazione"),
                          pagine_originale=first("descrizione_fisica/pagine_volumi"),
                          soggetti=" ; ".join(d["soggetti"]), descrittori=" ; ".join(
                              d["descrittori_tee"] + d["descrittori_proposti"] + d["descrittori_lgi"]),
                          destinatari=first("destinatari"), tipo_materiale=first("tipo_materiale"),
                          copies=copies_of(rec), istituzione=first("localizzazione/istituzione")))
        if first("localizzazione/istituzione") and "pozzo" not in first("localizzazione/istituzione").lower():
            anomaly(scheda, "istituzione", first("localizzazione/istituzione"),
                    "istituzione diversa da A. Pozzo (forse una collocazione)", "ignorato: unico istituto")

    # ---------- verifica e arricchimento con Open Library (solo cache se non --online)
    cache_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache_openlibrary.json")
    gb_cache = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cache_googlebooks.json")
    gb = None
    if google or os.path.exists(gb_cache):
        gkey = google_key() if google else None
        if google and not gkey:
            print("  Google Books: nessuna chiave valida (GOOGLE_BOOKS_API_KEY), passo solo dalla cache", file=sys.stderr)
        gb = GoogleBooks(gb_cache, gkey, google_max)
    if online or os.path.exists(cache_path):
        enrich_with_openlibrary(works, OpenLibrary(cache_path, online), stats, gb)

    # ---------- id opere: ISBN se valido e univoco; opere duplicate (stesso ISBN e titolo) vengono fuse
    by_isbn = collections.defaultdict(list)
    for w in works:
        if w["isbn"]:
            by_isbn[w["isbn"]].append(w)
    merged = set()
    for isbn, group in by_isbn.items():
        head = group[0]
        head["id"] = isbn
        for other in group[1:]:
            if key(other["title"]) == key(head["title"]):
                head["copies"] += other["copies"]
                head["people"] = list(dict.fromkeys(head["people"] + other["people"]))
                head["genres"] = list(dict.fromkeys(head["genres"] + other["genres"]))
                merged.add(id(other))
                anomaly(other["scheda"], "scheda", other["title"], f"scheda duplicata di {head['scheda']} (stesso ISBN)",
                        f"copie spostate sull'opera {isbn}")
                stats["schede_duplicate_fuse"] += 1
            else:
                anomaly(other["scheda"], "isbn", isbn, f"stesso ISBN di {head['scheda']} ma titolo diverso",
                        "usato codice_scheda come id")
    works = [w for w in works if id(w) not in merged]
    for w in works:
        w.setdefault("id", w["scheda"])
        if w["id"] == w["scheda"]:
            w["isbn"] = None if w["isbn"] and w["isbn"] in by_isbn and by_isbn[w["isbn"]][0] is not w else w["isbn"]

    # ---------- anagrafiche deduplicate
    publishers = {}
    for k, variants in sorted(publisher_variants.items(), key=lambda kv: most_common_display(kv[1]).lower()):
        publishers[k] = (len(publishers) + 1, most_common_display(variants))
        if len(variants) > 1:
            stats["editori_con_varianti_unificate"] += 1

    authors = {}
    for k, variants in sorted(author_variants.items(), key=lambda kv: kv[0]):
        last, firstn = sorted(variants.items(), key=lambda kv: (kv[0][0].isupper(), -kv[1]))[0][0]
        authors[k] = (len(authors) + 1, firstn, last)
        if len(variants) > 1:
            stats["autori_con_varianti_unificate"] += 1

    # possibili doppioni "Rossi, M." / "Rossi, Mario": solo segnalati, non fusi (l'iniziale potrebbe essere un'altra persona)
    by_last = collections.defaultdict(list)
    for k, (aid, firstn, last) in authors.items():
        by_last[key(last)].append((aid, firstn or "", last))
    for group in by_last.values():
        for aid, fn, last in group:
            if 0 < len(key(fn)) <= 2:
                full = [(a2, f2) for a2, f2, _ in group if len(key(f2)) > 2 and key(f2).startswith(key(fn))]
                if len(full) == 1:
                    anomaly("", "autore", f"{last}, {fn} (id {aid})", f"possibile stesso autore di {last}, {full[0][1]} (id {full[0][0]})",
                            "non fusi: verificare")
                    stats["autori_possibili_doppioni"] += 1

    # soggetti: <soggetti> (intestazioni) + <descrittori_*> (parole chiave), deduplicati senza badare a maiuscole/accenti
    subject_variants = collections.defaultdict(collections.Counter)
    for w in works:
        keys = []
        for raw in (w["soggetti"] + " ; " + w["descrittori"]).split(" ; "):
            t = re.sub(r"\s+", " ", raw).strip(" .;,-")
            if len(key(t)) < 2:
                continue
            subject_variants[key(t)][t[:1].upper() + t[1:]] += 1
            keys.append(key(t))
        w["subject_keys"] = list(dict.fromkeys(keys))
    SUBJECTS.clear()
    for i, (k, variants) in enumerate(sorted(subject_variants.items(), key=lambda kv: most_common_display(kv[1]).lower())):
        SUBJECTS[k] = (i + 1, most_common_display(variants))
    stats["soggetti"] = len(SUBJECTS)
    stats["opere_con_soggetti"] = sum(1 for w in works if w["subject_keys"])

    # generi: errori di battitura rari -> genere frequente più simile
    frequent = [g for g, n in genre_counter.items() if n >= 5]
    genre_map = {}
    for g, n in genre_counter.items():
        target = g
        if n < 5:
            close = difflib.get_close_matches(g, frequent, n=1, cutoff=0.84)
            if close:
                target = close[0]
                anomaly("", "genere", g, "probabile refuso", f"unificato in '{target}'")
        genre_map[g] = target
    genre_names = sorted(set(genre_map.values()))
    genres = {g: (i + 1, g[:1].upper() + g[1:]) for i, g in enumerate(genre_names)}

    contributions = {c: i + 1 for i, c in enumerate(CONTRIBUTIONS)}

    # ---------- copie, collocazioni, stati
    locations = {}
    item_ids = collections.Counter()
    for w in works:
        seen = set()
        for c in w["copies"]:
            sig = (c.get("inventario"), c.get("collocazione"), c.get("data"))
            if sig in seen:
                anomaly(w["scheda"], "inventario", c.get("inventario"), "copia ripetuta identica nella stessa scheda",
                        "scartata")
                stats["copie_doppie_scartate"] += 1
                continue
            seen.add(sig)
            inv = re.sub(r"\s+", " ", (c.get("inventario") or "").strip()).upper()
            if not inv:
                inv = f"SENZA-INV-{w['scheda']}"
                anomaly(w["scheda"], "inventario", "", "copia senza numero di inventario", f"id generato {inv}")
            acq = parse_date(c.get("data"))
            if c.get("data") and not acq:
                anomaly(w["scheda"], "data", c.get("data"), "data di acquisizione non valida", "lasciata vuota")
            price = parse_price(c.get("prezzo"), c.get("euro"), acq)
            if (c.get("prezzo") or c.get("euro")) and not price:
                anomaly(w["scheda"], "prezzo", f"{c.get('prezzo')} / {c.get('euro')}", "prezzo illeggibile",
                        "lasciato vuoto")
            disp = (c.get("disponibilita") or "").strip().upper()
            status = STATUS_MAP.get(disp, "active")
            if disp.startswith("U-"):
                anomaly(w["scheda"], "disponibilita", disp, f"copia {inv} risultava in prestito all'utente {disp}",
                        "importata come disponibile: verificare a scaffale")
                stats["copie_in_prestito_nel_vecchio_sistema"] += 1
            elif disp in NOT_LOANABLE_CODES:
                stats["copie_prestito_non_consentito"] += 1
            elif disp not in ("S", "SI", ""):
                anomaly(w["scheda"], "disponibilita", disp, f"stato copia {inv} non standard",
                        f"importata come '{status}': verificare")
            mark = re.sub(r"\s+", " ", (c.get("collocazione") or "").strip()).upper() or None
            loc = mark.split(" ")[0] if mark else None  # scaffale = primo elemento della collocazione
            if loc and loc not in locations:
                locations[loc] = len(locations) + 1
            item_ids[inv] += 1
            items.append(dict(inv=inv, work=w["id"], scheda=w["scheda"], loc=loc, mark=mark, acq=acq, price=price,
                              status=status, loanable=disp not in NOT_LOANABLE_CODES, disp_originale=c.get("disponibilita"),
                              provenienza=(c.get("provenienza") or "").upper().replace("Ù", "")))
    # inventari duplicati fra opere diverse: id univoco con suffisso.
    # Il registro è unico e cresce nel tempo (dal 2002 in modo regolare; 1995-2001 è la catalogazione retrospettiva):
    # il numero originale resta alla copia la cui data è coerente con la sequenza del suo anno.
    by_year = collections.defaultdict(list)
    for it in items:
        if it["acq"] and re.fullmatch(r"\d+", it["inv"]):
            by_year[it["acq"].year].append(int(it["inv"]))
    bounds = {}
    for y, v in by_year.items():
        v.sort()
        bounds[y] = (v[int(0.05 * (len(v) - 1))], v[int(0.95 * (len(v) - 1))])

    def out_of_sequence(it):
        if not it["acq"] or it["acq"].year not in bounds or not re.fullmatch(r"\d+", it["inv"]):
            return 1
        lo, hi = bounds[it["acq"].year]
        return 0 if lo <= int(it["inv"]) <= hi else 2
    order = {id(it): (out_of_sequence(it), n) for n, it in enumerate(items)}
    used = collections.Counter()
    for it in sorted(items, key=lambda x: order[id(x)]):
        if item_ids[it["inv"]] > 1:
            used[it["inv"]] += 1
            if used[it["inv"]] > 1:
                new = f"{it['inv']}-DUP{used[it['inv']]}"
                anomaly(it["scheda"], "inventario", it["inv"], "numero di inventario già usato da un'altra copia",
                        f"id cambiato in {new}")
                it["inv"] = new
                stats["inventari_duplicati_rinominati"] += 1
        it["id"] = it["inv"]
    # collocazioni (shelf_mark, UNIQUE nel DB) assegnate a più copie: stesso trattamento degli inventari
    marks = collections.Counter(it["mark"] for it in items if it["mark"])
    used = collections.Counter()
    for it in items:
        if it["mark"] and marks[it["mark"]] > 1:
            used[it["mark"]] += 1
            if used[it["mark"]] > 1:
                new = f"{it['mark']} DUP{used[it['mark']]}"
                anomaly(it["scheda"], "collocazione", it["mark"], f"collocazione già assegnata a un'altra copia (copia {it['id']})",
                        f"cambiata in '{new}'")
                it["mark"] = new
                stats["collocazioni_duplicate_rinominate"] += 1

    stats.update(opere=len(works), copie=len(items), autori=len(authors), editori=len(publishers),
                 generi=len(genres), scaffali=len(locations), copie_con_collocazione=sum(1 for i in items if i["mark"]), opere_con_isbn_come_id=sum(w["id"] != w["scheda"] for w in works))

    write_sql(os.path.join(outdir, "import_bibliostack.sql"), works, items, authors, publishers, genres, genre_map,
              contributions, locations)
    write_csvs(outdir, works, items, authors, publishers, genres, locations)
    with open(os.path.join(outdir, "riepilogo.txt"), "w", encoding="utf-8") as f:
        for k, v in sorted(stats.items()):
            f.write(f"{k}: {v}\n")
        f.write(f"anomalie_registrate: {len(ANOMALIES)}\n")
        def category(p):
            p = re.sub(r"copia \S+ (risultava|non)", r"copia \1", p)
            p = re.sub(r"utente \S+", "utente U-…", p)
            p = re.sub(r"di [MN]-\w+", "di un'altra scheda", p)
            p = re.sub(r" \(copia .*\)$| corrisponde a '.*'$|(possibile stesso autore di).*", r"\1", p)
            return p.split(" (")[0]
        for k, v in collections.Counter(category(a["problema"]) for a in ANOMALIES).most_common():
            f.write(f"  {v:6}  {k}\n")
    print(open(os.path.join(outdir, "riepilogo.txt"), encoding="utf-8").read())


# =========================== OUTPUT ===========================

def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, dt.date):
        return f"'{v.isoformat()}'"
    return "'" + str(v).replace("'", "''") + "'"


def insert(f, table, cols, rows, overriding=False, conflict=""):
    rows = list(rows)
    for i in range(0, len(rows), 500):
        f.write(f"INSERT INTO {table} ({', '.join(cols)})" + (" OVERRIDING SYSTEM VALUE" if overriding else "") + " VALUES\n")
        f.write(",\n".join("(" + ", ".join(q(v) for v in r) + ")" for r in rows[i:i + 500]))
        f.write(f"{conflict};\n")


def write_sql(path, works, items, authors, publishers, genres, genre_map, contributions, locations):
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"""-- Import del vecchio catalogo WinIride in BiblioStack. Generato da converti.py il {dt.date.today()}.
-- Da eseguire su un database inizializzato con docker/postgres/init/*.sql ma SENZA seed demo
-- (authors, publishers, works, items, contributions, ... devono essere vuote).
-- Tutto in un'unica transazione: in caso di errore non resta nulla di parziale.

BEGIN;
SET search_path TO school_library, public;
SET client_encoding TO 'UTF8';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM works) OR EXISTS (SELECT 1 FROM items) OR EXISTS (SELECT 1 FROM authors)
       OR EXISTS (SELECT 1 FROM publishers) OR EXISTS (SELECT 1 FROM contributions) OR EXISTS (SELECT 1 FROM genres)
       OR EXISTS (SELECT 1 FROM schools) OR EXISTS (SELECT 1 FROM locations) OR EXISTS (SELECT 1 FROM subjects) THEN
        RAISE EXCEPTION 'Il database contiene già dati di catalogo (seed?): import annullato.';
    END IF;
END $$;

""")
        insert(f, "currencies", ["code"], [("EUR",)], conflict=" ON CONFLICT DO NOTHING")
        langs = sorted({w["lang"] for w in works if w["lang"]})
        insert(f, "languages", ["language_code", "name"], langs, conflict=" ON CONFLICT DO NOTHING")
        ctrs = sorted({w["ctry"] for w in works if w["ctry"]})
        insert(f, "publication_countries", ["country_code", "name"], ctrs, conflict=" ON CONFLICT DO NOTHING")
        deweys = sorted({w["dewey"] for w in works if w["dewey"]})
        insert(f, "dewey_codes", ["code"], [(x,) for x in deweys], conflict=" ON CONFLICT DO NOTHING")
        insert(f, "contributions", ["id", "name"], [(i, n) for n, i in contributions.items()], overriding=True)
        insert(f, "publishers", ["id", "name"], sorted(publishers.values()), overriding=True)
        insert(f, "authors", ["id", "first_name", "last_name"], sorted(authors.values()), overriding=True)
        insert(f, "genres", ["id", "name"], sorted(genres.values()), overriding=True)
        insert(f, "school_cities", ["id", "name"], [(1, SCHOOL_CITY)], overriding=True)
        insert(f, "schools", ["id", "city_id", "name"], [(1, 1, SCHOOL_NAME)], overriding=True)
        insert(f, "locations", ["id", "school_id", "shelf_code"],
               sorted((i, 1, code) for code, i in locations.items()), overriding=True)
        insert(f, "works", ["id", "publisher_id", "dewey_code", "language_code", "publication_country", "title",
                            "other_title_information", "description", "pages", "publication_date", "cover_url"],
               [(w["id"], publishers[w["publisher_key"]][0] if w["publisher_key"] else None, w["dewey"],
                 w["lang"][0] if w["lang"] else None, w["ctry"][0] if w["ctry"] else None, w["title"],
                 w["other_title"], w["description"], w["pages"],
                 dt.date(w["year"], 1, 1) if w["year"] else None, w.get("cover_url")) for w in works])
        insert(f, "author_works", ["author_id", "work_id", "contribution_id"],
               [(authors[a][0], w["id"], contributions[c]) for w in works for a, c in w["people"]],
               conflict=" ON CONFLICT DO NOTHING")
        insert(f, "work_genres", ["work_id", "genre_id"],
               [(w["id"], genres[genre_map[g]][0]) for w in works for g in w["genres"]],
               conflict=" ON CONFLICT DO NOTHING")
        insert(f, "subjects", ["id", "name"], sorted(SUBJECTS.values()), overriding=True)
        insert(f, "work_subjects", ["work_id", "subject_id"],
               [(w["id"], SUBJECTS[k][0]) for w in works for k in w["subject_keys"]], conflict=" ON CONFLICT DO NOTHING")
        insert(f, "items", ["id", "work_id", "location_id", "shelf_mark", "loanable", "currency_code", "acquisition_date", "status", "price"],
               [(it["id"], it["work"], locations.get(it["loc"]), it["mark"], it["loanable"], "EUR" if it["price"] else None,
                 it["acq"], it["status"], it["price"]) for it in items])
        f.write("\n-- Riallinea le sequenze identity dopo gli id espliciti\n")
        for t in ["contributions", "publishers", "authors", "genres", "subjects", "school_cities", "schools", "locations"]:
            f.write(f"SELECT setval(pg_get_serial_sequence('school_library.{t}', 'id'), (SELECT max(id) FROM {t}));\n")
        f.write("\nCOMMIT;\n")


def write_csvs(outdir, works, items, authors, publishers, genres, locations):
    def w(name, header, rows):
        with open(os.path.join(outdir, name), "w", encoding="utf-8-sig", newline="") as f:
            cw = csv.writer(f, delimiter=";")
            cw.writerow(header)
            cw.writerows(rows)
    inv_auth = {k: v for k, v in authors.items()}
    w("opere.csv", ["id", "codice_scheda", "isbn", "copertina", "titolo", "complemento_titolo", "autori", "editore", "luogo",
                    "anno", "data_pubbl_originale", "pagine", "pagine_originale", "lingua", "paese", "dewey", "generi",
                    "soggetti", "descrittori", "destinatari", "tipo_materiale", "isbn_originale", "descrizione"],
      [(x["id"], x["scheda"], x["isbn"], x.get("cover_url"), x["title"], x["other_title"],
        " ; ".join(f"{inv_auth[a][2]}{', ' + inv_auth[a][1] if inv_auth[a][1] else ''} ({c})" for a, c in x["people"]),
        publishers[x["publisher_key"]][1] if x["publisher_key"] else None, x["luogo"], x["year"],
        x["data_pubbl_originale"], x["pages"], x["pagine_originale"], x["lang"][0] if x["lang"] else None,
        x["ctry"][0] if x["ctry"] else None, x["dewey"], " ; ".join(x["genres"]), x["soggetti"], x["descrittori"],
        x["destinatari"], x["tipo_materiale"], x["isbn_originale"], x["description"]) for x in works])
    w("copie.csv", ["id_inventario", "opera_id", "codice_scheda", "collocazione", "scaffale", "data_acquisizione", "prezzo_eur",
                    "stato", "prestito_consentito", "disponibilita_originale", "provenienza"],
      [(i["id"], i["work"], i["scheda"], i["mark"], i["loc"], i["acq"], i["price"], i["status"], "sì" if i["loanable"] else "no", i["disp_originale"],
        i["provenienza"]) for i in items])
    w("autori.csv", ["id", "nome", "cognome"], sorted(authors.values()))
    w("editori.csv", ["id", "nome"], sorted(publishers.values()))
    w("generi.csv", ["id", "nome"], sorted(genres.values()))
    w("soggetti.csv", ["id", "nome"], sorted(SUBJECTS.values()))
    w("scaffali.csv", ["id", "scaffale"], sorted((i, c) for c, i in locations.items()))
    w("anomalie.csv", ["codice_scheda", "campo", "valore_originale", "problema", "azione"],
      [tuple(a.values()) for a in ANOMALIES])


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    main(args[0], args[1] if len(args) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "output"),
         online="--online" in sys.argv, google="--google" in sys.argv,
         google_max=next((int(a.split("=", 1)[1]) for a in sys.argv if a.startswith("--google-max=")), 300))
