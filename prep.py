#!/usr/bin/env python3
"""Gera data.json a partir de data_raw.json. Uso: python3 prep.py [--no-fetch]"""
import json, re, sys, html, urllib.request
from concurrent.futures import ThreadPoolExecutor
from collections import Counter

AGENCIAS = {"chitolina": "Chitolina", "franciosi": "Franciosi", "seven": "Seven Negócios Imobiliários",
            "sedna": "Sedna", "conceito": "Conceito Imóveis", "albor": "Albor",
            "lopesnobre": "Lopes Nobre", "jjgomes": "JJ Gomes"}
NUM = {"um": 1, "uma": 1, "dois": 2, "duas": 2, "tres": 3, "três": 3, "quatro": 4, "cinco": 5, "seis": 6, "sete": 7, "oito": 8}
N = r"(\d{1,2}|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito)"
# marcas do fim do texto do imóvel (rodapé, imóveis relacionados, formulários)
CUT = re.compile(r"Central de Neg[óo]cios|repita:|Localiza[çc][ãa]o aproximada|SIMULE O FINANCIAMENTO|Ol[áa]! Achei|Carregando\.\.\.|Im[óo]veis (?:semelhantes|similares)|Mais Informa", re.I)

def num(s):
    s = s.lower()
    return int(s) if s.isdigit() else NUM.get(s)

def clean_text(t):
    t = html.unescape(t or "")
    st = t.find("Comprar R$")  # seven: o menu do topo contém "SIMULE O FINANCIAMENTO"; procurar o rodapé só depois do preço
    m = CUT.search(t, max(st, 0))
    if m: t = t[:m.start()]
    return re.sub(r"\s+", " ", t).strip()

def count(text, word):
    """Contagem explícita. Se há menção sem qualificador ("3 banheiros") ela é o total (1ª); senão soma as qualificadas
    ("1 banheiro social" + "1 banheiro externo"), deduplicando menções idênticas."""
    plain, qual, seen = [], 0, set()
    for m in re.finditer(N + r"\s*" + word + r"(\s+(?:social|adicional|extra|externo|de servi[çc]o|servi[çc]o|comum|privativo|coletivo))?", text, re.I):
        k = m.group(0).lower()
        if m.group(2) is None:
            plain.append(num(m.group(1)))
        elif k not in seen:
            seen.add(k); qual += num(m.group(1))
    return (plain[0] if plain else qual) or None

def extrai(text):
    r = {}
    r["banheiros"] = count(text, r"(?:banheiros?|wcs?\b)")
    su = count(text, r"su[ií]tes?")
    if su is None and re.search(r"\b(?:ambos|ambas|todos|todas)\b[^.]{0,20}su[ií]tes", text, re.I):
        q = re.search(N + r"\s*(?:quartos?|dormit[óo]rios?|dorms?\.?)", text, re.I)
        su = num(q.group(1)) if q else None
    r["suites"] = su
    q = re.search(N + r"\s*(?:quartos?|dormit[óo]rios?|dorms?\b)", text, re.I)
    r["quartos"] = num(q.group(1)) if q else None
    def area(p):
        m = re.search(p + r"[^0-9]{0,25}(\d[\d.]*(?:,\d+)?)\s*m", text, re.I)
        if not m: return None
        v = m.group(1).replace(".", "").replace(",", ".")
        try: return float(v)
        except ValueError: return None
    r["area_construida_m2"] = area(r"[áa]rea\s+constru[íi]da")
    r["area_terreno_m2"] = area(r"(?:[áa]rea\s+(?:do\s+terreno|total|de\s+terreno)|terreno\s+(?:de|com))")
    return r

def local_limpo(i):
    f, loc, tit = i["fonte"], (i.get("local") or "").strip(), i.get("titulo") or ""
    if f == "lopesnobre":
        m = re.search(r" em (.+?), Itapetininga", tit)
        if m: return m.group(1).strip()
    if f == "seven":
        m = re.search(r" em (.+?)\s+-\s+Itapetininga", tit)
        if m: return m.group(1).strip()
    parts = [p.strip() for p in loc.split(" / ")]
    parts = [p.strip(" /") for p in parts]
    out = [p for p in parts if p and p.lower() != "itapetininga"]
    out = [p.title() if p.islower() else p for p in out]
    return " / ".join(out) or None

def fetch(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
                                                   "Accept-Language": "pt-BR,pt;q=0.9"})
        raw = urllib.request.urlopen(req, timeout=15).read().decode("utf-8", "ignore")
    except Exception:
        return None
    raw = html.unescape(raw)
    raw = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", raw)
    return re.sub(r"\s+", " ", re.sub(r"(?s)<[^>]+>", " ", raw))

def banheiros_pagina(p):
    """Campo estruturado da página ("3 Banheiros" / "Banheiro: 1"); usa só a 1ª ocorrência (as seguintes são imóveis relacionados)."""
    best = None
    for m in re.finditer(r"(\d{1,2})\s*Banheiros?\b|Banheiros?:\s*(\d{1,2})", p, re.I):
        return int(m.group(1) or m.group(2))
    return best

def main():
    raw = [i for i in json.load(open("data_raw.json")) if not i.get("excluido")]
    out = []
    for i in raw:
        ex = extrai(clean_text(i["descricao"]))
        pisc = i.get("piscina") or "não informado"
        out.append({
            "id": f'{i["fonte"]}-{i["codigo"]}',
            "preco": i.get("preco"),
            "area_terreno_m2": i.get("area_terreno_m2") if i.get("area_terreno_m2") is not None else ex["area_terreno_m2"],
            "area_construida_m2": i.get("area_construida_m2") if i.get("area_construida_m2") is not None else ex["area_construida_m2"],
            "quartos": i.get("quartos") if i.get("quartos") is not None else ex["quartos"],
            "banheiros": ex["banheiros"], "suites": ex["suites"],
            "fonte_banheiros": "anuncio" if ex["banheiros"] is not None else None,
            "piscina": pisc if pisc in ("sim", "não", "não informado") else "não informado",
            "agua": i.get("agua") or "não informado",
            "local": local_limpo(i),
            "dist_km": i["dist"][0] if i.get("dist") else None,
            "imobiliaria": AGENCIAS.get(i["fonte"], i["fonte"]),
            "titulo": re.sub(r"\s*\|\s*Seven Neg[óo]cios Imobili[áa]rios\s*$", "", i.get("titulo") or "").replace("  ", " "),
            "url": i["url"], "obs": i.get("obs") or None,
        })
    if "--no-fetch" not in sys.argv:
        falt = [o for o in out if o["banheiros"] is None]
        with ThreadPoolExecutor(12) as ex_:
            pages = list(ex_.map(lambda o: fetch(o["url"]), falt))
        for o, p in zip(falt, pages):
            if not p: continue
            b = banheiros_pagina(p)
            if b is not None and not (o["suites"] and b < o["suites"]):  # total < suítes = leitura incoerente
                o["banheiros"], o["fonte_banheiros"] = b, "pagina"
    json.dump(out, open("data.json", "w"), ensure_ascii=False, indent=1)
    n = len(out)
    st = [f"total: {n}",
          f"banheiros conhecidos: {sum(o['banheiros'] is not None for o in out)} "
          f"(anuncio {sum(o['fonte_banheiros']=='anuncio' for o in out)}, pagina {sum(o['fonte_banheiros']=='pagina' for o in out)})",
          f"suites conhecidas: {sum(o['suites'] is not None for o in out)}",
          "piscina: " + ", ".join(f"{k}={v}" for k, v in Counter(o["piscina"] for o in out).items()),
          f"quartos conhecidos: {sum(o['quartos'] is not None for o in out)}",
          f"area_terreno conhecida: {sum(o['area_terreno_m2'] is not None for o in out)}",
          f"area_construida conhecida: {sum(o['area_construida_m2'] is not None for o in out)}"]
    print("\n".join(st))
    open("DATA_NOTES.md", "w").write("# DATA_NOTES\n\nGerado por `prep.py` a partir de `data_raw.json` (excluido != true).\n\n"
        + "\n".join("- " + s for s in st) + "\n\nNotas:\n- Valores desconhecidos = null (UI mostra \"não informado\").\n"
        "- banheiros: só contagens explícitas no texto (\"N banheiro(s)\"/WC); suítes não são somadas; lavabo ignorado.\n"
        "- `fonte_banheiros`: anuncio = descrição já coletada; pagina = re-fetch da URL; null = desconhecido.\n"
        "- dist_km é estimativa em linha reta.\n- piscina \"não\" não é inferido: ausência de menção = \"não informado\".\n")
main()
