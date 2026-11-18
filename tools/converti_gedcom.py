#!/usr/bin/env python3
"""Converts GEDCOM 5.5.x to radici-calabria-v1 JSON for the interactive viewer.

This GEDCOM is an INDEPENDENT genealogical reconstruction: no comparison,
matching or reuse of identifiers from any previously published dataset.
All person IDs are 'G' + native GEDCOM xref; family IDs are 'GF' + xref.

Example:
python3 tools/converti_gedcom.py Cariati_18_8_26.ged \
  --out static/genealogia/data/cariati/rete.json
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re

YEAR = re.compile(r'(?<!\d)(1[4-9]\d{2}|20\d{2})(?!\d)')
MON = {'JAN':1,'FEB':2,'MAR':3,'APR':4,'MAY':5,'JUN':6,'JUL':7,'AUG':8,'SEP':9,'OCT':10,'NOV':11,'DEC':12}
DATE_EXACT = re.compile(r'^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$')

def year(raw):
    m=YEAR.search(raw or '')
    return int(m.group()) if m else None

def pseudo_time(raw):
    # The browser only uses timestamps to sort event lists.
    if not raw:return None
    m=DATE_EXACT.fullmatch(raw.upper())
    if m and m.group(2) in MON:
        try: return int(datetime(int(m.group(3)),MON[m.group(2)],int(m.group(1)),tzinfo=timezone.utc).timestamp())
        except ValueError:pass
    y=year(raw)
    return int(datetime(y,7,1,tzinfo=timezone.utc).timestamp()) if y is not None else None

def parse_gedcom(path):
    people={}; families={}; current=None; kind=None; active_event=None; main_name=None; source=''; ged_version=''
    with path.open(encoding='utf-8-sig',errors='replace') as f:
        for line in f:
            line=line.rstrip('\r\n')
            m=re.match(r'^(\d+)\s+(.*)$',line)
            if not m:continue
            level=int(m.group(1)); body=m.group(2)
            parts=body.split(' ',2)
            if level==0:
                active_event=None; main_name=None
                if len(parts)>=2 and parts[0].startswith('@') and parts[0].endswith('@') and parts[1] in ('INDI','FAM'):
                    uid=parts[0][1:-1];kind=parts[1]
                    current={'id':uid,'names':[], 'sex':None, 'events':{}, 'fams':[], 'famc':[]} if kind=='INDI' else {'id':uid,'husband':None,'wife':None,'children':[], 'events':{}}
                    (people if kind=='INDI' else families)[uid]=current
                else:
                    current=None;kind=None
                continue
            if current is None:
                if level==1 and body.startswith('SOUR '):source=body[5:]
                if level==2 and body.startswith('VERS '):ged_version=body[5:]
                continue
            tag,_,value=body.partition(' ')
            if level==1:
                active_event=None
                if kind=='INDI':
                    if tag=='NAME':
                        main_name={'raw':value,'given':'','surname':'','suffix':''}
                        current['names'].append(main_name)
                    elif tag=='SEX':current['sex']=value.upper().strip()
                    elif tag=='FAMS':current['fams'].append(value.strip('@'))
                    elif tag=='FAMC':current['famc'].append(value.strip('@'))
                    elif tag in {'BIRT','DEAT','BAPM','CHR','BURI','CREM','CENS','IMMI','EMIG','NATU','OCCU','RESI','EDUC','EVEN'}:
                        active_event=tag;current['events'].setdefault(tag,[]).append({'date':'','place':'','value':value})
                else:
                    if tag=='HUSB':current['husband']=value.strip('@')
                    elif tag=='WIFE':current['wife']=value.strip('@')
                    elif tag=='CHIL':current['children'].append(value.strip('@'))
                    elif tag in {'MARR','DIV','ANUL','ENGA','EVEN'}:
                        active_event=tag;current['events'].setdefault(tag,[]).append({'date':'','place':'','value':value})
            elif level==2:
                if kind=='INDI' and main_name is not None and tag in {'GIVN','SURN','NSFX'}:
                    main_name[{'GIVN':'given','SURN':'surname','NSFX':'suffix'}[tag]]=value
                if active_event and tag in {'DATE','PLAC'}:
                    current['events'][active_event][-1][{'DATE':'date','PLAC':'place'}[tag]]=value
    return people,families,source,ged_version

def names_of(p):
    n=p['names'][0] if p['names'] else {'raw':'','given':'','surname':'','suffix':''}
    given=n['given'].strip(); surname=n['surname'].strip()
    raw=n['raw']
    if not given and raw:
        given=raw.split('/')[0].strip()
    if not surname and '/' in raw:
        surname=raw.split('/')[1].strip()
    suffix=n['suffix'].strip()
    return given,surname,suffix

def firstdate(p,kind):
    e=p['events'].get(kind) or []
    return e[0].get('date','') if e else ''

def build(people,families,source,version,slug='cariati',comune='Cariati',provincia='Cosenza'):
    mapped={pid:'G'+pid for pid in people}
    if len(set(mapped.values()))!=len(mapped):raise ValueError('Duplicate person identifier after mapping')
    persons=[];events=[];fams=[];years=[]
    person_tag={'BIRT':'_PersonEvent_Birth','DEAT':'_PersonEvent_Death','BAPM':'Battesimo','CHR':'Battesimo','BURI':'Sepoltura','CREM':'Cremazione','CENS':'Censimento','IMMI':'Immigrazione','EMIG':'Emigrazione','NATU':'Naturalizzazione','OCCU':'Professione','RESI':'Residenza','EDUC':'Istruzione','EVEN':'Altro evento'}
    family_tag={'MARR':'_FamilyEvent_Marriage','DIV':'Divorzio','ANUL':'Annullamento','ENGA':'Fidanzamento','EVEN':'Altro evento'}
    def event_add(prefix, raw_uid, tag, i, ev, mapping):
        eid=f'E-{prefix}-{raw_uid}-{tag}-{i}'
        date=ev.get('date','');yyyy=year(date)
        if yyyy is not None:years.append(yyyy)
        # preserve event textual value, if present, without inventing a date
        events.append([eid,mapping.get(tag,tag),date,'',pseudo_time(date),None])
        return eid
    for rawid,p in people.items():
        given,surname,suffix=names_of(p)
        birth=firstdate(p,'BIRT');death=firstdate(p,'DEAT')
        sexe={'M':0,'F':1}.get(p['sex'])
        refs=[]
        for tag, items in p['events'].items():
            for i,ev in enumerate(items):
                refs.append(event_add('P',rawid,tag,i,ev,person_tag))
        persons.append([mapped[rawid],given,surname,sexe,birth,death,year(birth),year(death),refs,suffix])
    persons.sort(key=lambda p:(p[2].casefold(),p[1].casefold(),p[0]))
    missing_refs=0;multi_child=0
    for rawid,f in families.items():
        father=mapped.get(f['husband']);mother=mapped.get(f['wife']);ch=[]
        for c in f['children']:
            if c in mapped:
                if mapped[c] not in ch:ch.append(mapped[c])
                else:multi_child+=1
            else:missing_refs+=1
        if f['husband'] and not father:missing_refs+=1
        if f['wife'] and not mother:missing_refs+=1
        erefs=[]
        for tag,items in f['events'].items():
            for i,ev in enumerate(items):erefs.append(event_add('F',rawid,tag,i,ev,family_tag))
        marr=firstdate(f,'MARR')
        fams.append(['GF'+rawid,father,mother,ch,marr,erefs])
    fams.sort(key=lambda f:f[0])
    counts={'persone':len(persons),'famiglie':len(fams),'eventi':len(events)}
    dataset={'schema':'radici-calabria-v1','comune':comune,'provincia':provincia,'slug':slug,
             'periodo':[min(years),max(years)] if years else [],
             'sorgente':f'GEDCOM 5.5.1 ({source or "origine non indicata"})',
             'cutoffNascita':None,'archivioCompleto':True,
             'criterioPubblicazione':'Tutte le persone e famiglie presenti nel GEDCOM fornito, senza filtro cronologico.',
             'totaliOriginali':counts,'totaliPubblici':counts.copy(),
             'persone':persons,'famiglie':fams,'eventi':events}
    report={'source':source,'gedcom_version':version,'dataset':counts,'periodo':dataset['periodo'],
            'id_policy':'Independent GEDCOM IDs, prefixed G for people and GF for families; no ID matching',
            'unknown_family_references':missing_refs,'duplicate_child_links_skipped':multi_child,
            'input_people':len(people),'input_families':len(families)}
    return dataset,report

def main():
    parser=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('gedcom',type=Path)
    parser.add_argument('--out',required=True,type=Path)
    parser.add_argument('--report',type=Path,default=None)
    parser.add_argument('--slug',default='cariati')
    parser.add_argument('--comune',default='Cariati')
    parser.add_argument('--provincia',default='Cosenza')
    args=parser.parse_args()
    pp,ff,source,ver=parse_gedcom(args.gedcom)
    ds,report=build(pp,ff,source,ver,args.slug,args.comune,args.provincia)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(ds,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    if args.report:
        args.report.parent.mkdir(parents=True,exist_ok=True)
        args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
