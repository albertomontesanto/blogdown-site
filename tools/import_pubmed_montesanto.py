#!/usr/bin/env python3
"""Fetch PubMed works by Alberto Montesanto; safely update a Wowchemy/Hugo site.
No third-party Python dependencies. Run from the Hugo project root.
"""
from __future__ import annotations
import argparse
import calendar
import csv
from collections import Counter
from datetime import datetime, timezone
import html
import io
import json
import os
from pathlib import Path
import re
import shutil
import sys
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from xml.etree import ElementTree as ET

API = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'
QUERY = 'Montesanto A[Author]'
KNOWN_COAUTHORS = {'passarino', 'de rango', 'dato', 'rose', 'bellizzi', 'paparazzo', 'crocco', 'soraci', 'corsonello', 'bruno', 'maletta', 'lagana', 'ghidoni', 'longobardi', 'spadafora', 'lattanzio', 'bagnoli', 'nacmias', 'geracitano'}


def get_bytes(endpoint, params):
    params = dict(params)
    params.setdefault('tool', 'MontesantoHugoPubMedImporter')
    mail = os.getenv('NCBI_EMAIL', '').strip()
    key = os.getenv('NCBI_API_KEY', '').strip()
    if mail:
        params['email'] = mail
    if key:
        params['api_key'] = key
    url = API + endpoint + '?' + urlencode(params)
    for attempt in range(5):
        try:
            req = Request(url, headers={'User-Agent': f'MontesantoHugoPubMedImporter/1.0 ({mail or "academic website"})', 'Accept': 'application/xml, application/json'})
            with urlopen(req, timeout=45) as resp:
                data = resp.read()
            time.sleep(0.37 if not key else 0.12)
            return data
        except (HTTPError, URLError, TimeoutError) as e:
            if isinstance(e, HTTPError) and e.code not in (429, 500, 502, 503, 504):
                raise RuntimeError(f'NCBI request failed: HTTP {e.code}') from e
            if attempt == 4:
                raise RuntimeError(f'NCBI request failed after retries: {e}') from e
            time.sleep(1.5 * (attempt + 1))
    raise AssertionError('unreachable')


def text(el, path, default=''):
    child = el.find(path)
    if child is None:
        return default
    return ''.join(child.itertext()).strip()


def normalized(s):
    return re.sub(r'[^a-z0-9]+', '', (s or '').lower())


def pub_date(article):
    # Prefer electronic date if present; fall back to print and MEDLINE date.
    for xpath in ('./MedlineCitation/Article/ArticleDate', './MedlineCitation/Article/Journal/JournalIssue/PubDate'):
        val = article.find(xpath)
        if val is None:
            continue
        year = text(val, 'Year')
        month = text(val, 'Month')
        day = text(val, 'Day')
        if not year:
            d = text(val, 'MedlineDate')
            m = re.search(r'\b(?:19|20)\d{2}\b', d)
            year = m.group(0) if m else ''
        if year:
            if not month.isdigit():
                months = {'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12}
                month = str(months.get(month.lower()[:3], 1))
            if not day.isdigit():
                day = '1'
            return f'{int(year):04d}-{max(1,min(12,int(month))):02d}-{max(1,min(calendar.monthrange(int(year), max(1,min(12,int(month))))[1], int(day))):02d}'
    return None


def parse_article(a):
    med = a.find('./MedlineCitation')
    if med is None:
        return None
    pmid = text(med, 'PMID')
    title = html.unescape(text(med, 'Article/ArticleTitle'))
    if not pmid or not title:
        return None
    authors, has_full_name, has_initial, strong_context = [], False, False, False
    affiliation_hits, orcid_hits = [], []
    for au in a.findall('./MedlineCitation/Article/AuthorList/Author'):
        surname = text(au, 'LastName')
        firstname = text(au, 'ForeName')
        initials = text(au, 'Initials')
        collective = text(au, 'CollectiveName')
        name = (' '.join((firstname or initials, surname)).strip() if surname else collective)
        if name:
            authors.append(name)
        if surname.lower().strip() == 'montesanto':
            if firstname.lower().strip() == 'alberto':
                has_full_name = True
            if initials.upper().startswith('A') or firstname.lower().startswith('a'):
                has_initial = True
            for aff in au.findall('AffiliationInfo/Affiliation'):
                val = ''.join(aff.itertext()).strip()
                affiliation_hits.append(val)
            for ident in au.findall('Identifier'):
                if ident.attrib.get('Source','').upper() == 'ORCID':
                    orcid_hits.append(''.join(ident.itertext()).strip())
    journal = text(med, 'Article/Journal/Title') or text(med, 'Article/Journal/ISOAbbreviation') or 'Unknown journal'
    abst_parts = []
    for el in a.findall('./MedlineCitation/Article/Abstract/AbstractText'):
        label = el.get('Label', '')
        val = ''.join(el.itertext()).strip()
        if val:
            abst_parts.append((label + ': ' if label else '') + val)
    abstract = '\n\n'.join(abst_parts)
    doi = ''
    for el in a.findall('./PubmedData/ArticleIdList/ArticleId'):
        if el.get('IdType') == 'doi':
            doi = (el.text or '').strip()
            break
    if not doi:
        for el in a.findall('./MedlineCitation/Article/ELocationID'):
            if el.get('EIdType') == 'doi':
                doi = (el.text or '').strip(); break
    aff_text = ' '.join(affiliation_hits).lower()
    if any(t in aff_text for t in ('calabria', 'unical.it', 'rende', 'cosenza')):
        strong_context = True
    if any('0000-0002-9563-2216' in v for v in orcid_hits):
        strong_context = True
    collaborator_lastnames = {text(au,'LastName').lower().strip() for au in a.findall('./MedlineCitation/Article/AuthorList/Author')}
    if collaborator_lastnames & KNOWN_COAUTHORS:
        strong_context = True
    if has_full_name:
        status, reason = 'confirmed', 'full author name Alberto Montesanto'
    elif has_initial and strong_context:
        status, reason = 'confirmed', 'initial A + institutional or collaborator evidence'
    elif has_initial:
        status, reason = 'review', 'author shown as A Montesanto; identity uncertain'
    else:
        status, reason = 'excluded', 'author name does not match Alberto Montesanto'
    date = pub_date(a)
    # Unknown publication dates are not guessed; keep record in review list.
    if not date and status == 'confirmed':
        status, reason = 'review', 'missing publication year; manually review'
    return dict(pmid=pmid, doi=doi, title=title, authors=authors, journal=journal,
                date=date or '', year=int(date[:4]) if date else None, abstract=abstract,
                url=f'https://pubmed.ncbi.nlm.nih.gov/{pmid}/', status=status,
                evidence=reason)


def parse_xml(data):
    root = ET.fromstring(data)
    items = []
    for a in root.findall('.//PubmedArticle'):
        item = parse_article(a)
        if item:
            items.append(item)
    return items


def fetch_pubmed():
    data = json.loads(get_bytes('esearch.fcgi', {'db':'pubmed', 'term': QUERY, 'retmode':'json', 'retmax':10000, 'sort':'pub_date'}))
    result = data['esearchresult']; pmids = result['idlist']; count = int(result['count'])
    if count > 10000:
        raise RuntimeError('NCBI returned >10,000 records; aborting to avoid an incomplete import')
    if count != len(pmids):
        raise RuntimeError(f'Incomplete PubMed search: expected {count}, retrieved {len(pmids)}')
    print(f'PubMed search: {count} candidate records found')
    records = []
    for i in range(0,len(pmids),100):
        block = pmids[i:i+100]
        xml = get_bytes('efetch.fcgi', {'db':'pubmed','id':','.join(block),'retmode':'xml'})
        chunk = parse_xml(xml)
        records.extend(chunk)
        print(f'  {min(i+100,len(pmids))}/{len(pmids)} fetched')
    fetched = {r['pmid']:r for r in records}
    if len(fetched) != len(pmids):
        missing = set(pmids) - set(fetched)
        raise RuntimeError(f'NCBI records missing from EFetch: {len(missing)} ({", ".join(sorted(missing)[:5])})')
    return list(fetched.values())


def existing_metadata(root):
    md = root / 'content' / 'publication'
    ids, dois, titles = set(), set(), set()
    if md.exists():
        for path in md.rglob('*.md'):
            try:
                blob = path.read_text(encoding='utf-8')
            except OSError:
                continue
            for x in re.findall(r'(?i)pubmed\.ncbi\.nlm\.nih\.gov/(\d+)|\bpmid\s*[:=]\s*["\']?(\d+)', blob):
                ids.add(next(z for z in x if z))
            for x in re.findall(r'(?im)^\s*doi\s*[:=]\s*["\']?([^\s"\']+)', blob):
                dois.add(x.strip().lower().rstrip('"\''))
            for x in re.findall(r'(?im)^\s*title\s*[:=]\s*["\']?([^\r\n]+)', blob):
                titles.add(normalized(x.strip().strip('"\'')))
    return ids, dois, titles


def q(v):
    return json.dumps(str(v or ''), ensure_ascii=False)


def record_md(item):
    authors = '\n'.join('  - '+q(a) for a in item['authors'])
    abstract = item['abstract'].replace('\r', ' ').replace('\x00','').strip()
    intro = f'''---
title: {q(item['title'])}
authors:
{authors}
date: {q(item['date'] + 'T00:00:00Z')}
publication: {q(item['journal'])}
publication_short: {q(item['journal'])}
publication_types: ["2"]
doi: {q(item['doi'])}
url_source: {q(item['url'])}
abstract: {q(abstract)}
summary: {q((abstract or item['title'])[:320])}
featured: false
draft: false
tags:
  - "PubMed"
---

[View on PubMed]({item['url']})
'''
    return intro


def main():
    p = argparse.ArgumentParser(description='Import all verified Alberto Montesanto PubMed papers into Hugo and build public statistics')
    p.add_argument('--project', default='.', help='path to Hugo project; default current directory')
    p.add_argument('--xml-fixture', help='offline PubMed XML input for testing')
    p.add_argument('--no-native', action='store_true', help='do not create Hugo publication entries')
    p.add_argument('--dry-run', action='store_true', help='fetch and report only; no writes')
    p.add_argument('--review-file', default='tools/pubmed_review_decisions.csv', help='CSV (pmid,decision): accept or exclude ambiguous records')
    args = p.parse_args()
    root = Path(args.project).resolve()
    if not (root/'config'/'_default'/'menus.yaml').exists():
        raise SystemExit('Wrong working directory: config/_default/menus.yaml not found. Run from blogdown root.')
    records = parse_xml(Path(args.xml_fixture).read_bytes()) if args.xml_fixture else fetch_pubmed()
    records = sorted(records, key=lambda x: (x.get('date') or '', int(x['pmid'])), reverse=True)
    decisions_path = root / args.review_file
    if decisions_path.exists():
        with decisions_path.open(encoding='utf-8-sig',newline='') as f:
            for row in csv.DictReader(f):
                pmid,decision=(row.get('pmid') or '').strip(),(row.get('decision') or '').strip().lower()
                if decision not in ('accept','exclude',''):
                    raise SystemExit(f'Invalid decision {decision!r} for PMID {pmid}: use accept, exclude or blank')
                for r in records:
                    if r['pmid'] == pmid and r['status']=='review':
                        if decision=='accept':r['status']='confirmed';r['evidence']='manually approved via review file'
                        if decision=='exclude':r['status']='excluded';r['evidence']='manually excluded via review file'
    valid = [r for r in records if r['status']=='confirmed']
    needs_review = [r for r in records if r['status']=='review']
    excluded = [r for r in records if r['status']=='excluded']
    print(f'Confirmed: {len(valid)}, needs review: {len(needs_review)}, excluded: {len(excluded)}')
    if not valid:
        raise SystemExit('No confirmed publications. Nothing changed; review PubMed author metadata.')
    if args.dry_run:
        for r in needs_review:
            print('Review:',r['pmid'],r['title'])
        return
    dest = root/'static'/'publications'/'data'
    dest.mkdir(parents=True,exist_ok=True)
    output = {'source':'NCBI PubMed','query':QUERY,'last_updated':datetime.now(timezone.utc).strftime('%Y-%m-%d'), 'records':valid,
              'review_count':len(needs_review), 'description':'Counts refer to confirmed PubMed-indexed works only. Not all scholarly outputs are indexed in PubMed.'}
    (dest/'publications.json').write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    with (dest/'publications.csv').open('w',newline='',encoding='utf-8-sig') as f:
        fields = ['year','title','authors','journal','doi','pmid','url']
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader()
        for x in valid:
            w.writerow({k: ', '.join(x[k]) if k=='authors' else x[k] for k in fields})
    if needs_review:
        with (dest/'needs_review.csv').open('w', newline='',encoding='utf-8-sig') as f:
            w=csv.DictWriter(f,fieldnames=['pmid','title','year','evidence','url']);w.writeheader()
            for r in needs_review:
                w.writerow({k:r[k] for k in ['pmid','title','year','evidence','url']})
    else:
        (dest/'needs_review.csv').unlink(missing_ok=True)
    added, existed = 0, 0
    if not args.no_native:
        ids, dois, titles = existing_metadata(root)
        for r in valid:
            if r['pmid'] in ids or (r['doi'] and r['doi'].lower() in dois) or normalized(r['title']) in titles:
                existed += 1
                continue
            path = root/'content'/'publication'/('pubmed-'+r['pmid'])/'index.md'
            if path.exists():
                existed += 1; continue
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(record_md(r), encoding='utf-8')
            added += 1
    # Keep other menu entries and hierarchy intact; redirect only Publications.
    menu = root/'config'/'_default'/'menus.yaml'
    original = menu.read_text(encoding='utf-8')
    rx = r'(?m)^(  - name: Publications\s*\n(?:[ \t]{4}[^\n]*\n)*?[ \t]{4}url:[ \t]*)[^\n]+'
    matches=list(re.finditer(rx,original))
    if len(matches)!=1:
        print('WARNING: Publications menu not automatically changed (unexpected format). Set its url to /publications/ manually.')
    else:
        changed = re.sub(rx, r'\g<1>/publications/',original,count=1)
        if changed != original:
            shutil.copy2(menu,menu.with_name('menus.yaml.pubmed.bak'))
            menu.write_text(changed,encoding='utf-8')
            print('Menu Publications now points to /publications/')
    years = Counter(x['year'] for x in valid if x['year'])
    print(f'OK. {len(valid)} PubMed papers in dashboard. Added {added} Wowchemy entries; {existed} already present.')
    print(f'Years: {min(years)}–{max(years)} | Journals: {len(set(x["journal"] for x in valid))}')
    print('Output: static/publications/ and content/publication/pubmed-*/')
    if needs_review:
        print('Manual identity review suggested: static/publications/data/needs_review.csv')
    print('Next: hugo --destination /tmp/hugo_pubmed_test; git add targeted files; git commit; git push origin main')

if __name__ == '__main__':
    main()
