import openpyxl, json, sys
wb=openpyxl.load_workbook(sys.argv[1])
def v(ws,c):
    x=ws[c].value
    return '' if x is None else str(x).strip()
def rows(ws,r0,r1,cols):
    out=[]
    for r in range(r0,r1+1):
        d={k:v(ws,f'{c}{r}') for k,c in cols.items()}; d['row']=r
        if any(d[k] for k in cols): out.append(d)
    return out
def split(s,sep): return [p.strip().lstrip('□').strip() for p in s.split(sep) if p.strip()]
D={}
def head(ws): return {'sheet':ws.title,'title':v(ws,'A1'),'sub':v(ws,'A2')}
ws=wb['01 SALES SOP']; D['sop']=head(ws)
D['sop'].update(steps=rows(ws,6,17,dict(n='A',stage='B',do='C',result='D')),
  rules=rows(ws,21,26,dict(icon='A',case='B',how='C',expect='D')),
  facts=split(v(ws,'A29'),'•'), factsRow=29)
ws=wb['02 CALL SCRIPT']; D['script']=head(ws)
D['script'].update(lines=rows(ws,6,22,dict(n='A',when='B',say='C',action='D')),never=split(v(ws,'A25'),'•'),neverRow=25)
ws=wb['03 FAST QUOTES']; D['fast']=head(ws)
D['fast'].update(routine=rows(ws,6,13,dict(n='A',action='B',how='C',stop='D')),
  rates=rows(ws,17,19,dict(term='A',roof='B',mini='C',stake='D')),rateNote=v(ws,'A20'),
  checkpoint=rows(ws,24,29,dict(verify='B',why='C',action='D')),cantVerify=v(ws,'A32'))
ws=wb['04 SERVICE FACTS']; D['facts']=head(ws)
D['facts'].update(items=rows(ws,6,30,dict(topic='A',say='B',check='C')))
ws=wb['05 OBJECTIONS']; D['obj']=head(ws)
D['obj'].update(items=rows(ws,11,38,dict(says='A',answer='B',next='C')),policy=v(ws,'A7'))
ws=wb['06 AI MOCKUPS']; D['mock']=head(ws)
D['mock'].update(steps=rows(ws,6,10,dict(step='A',do='B',rule='C')),
  prompts=rows(ws,14,16,dict(label='A',text='B',use='C')),final=v(ws,'A18'))
ws=wb['07 FLYRA SOP']; D['flyra']=head(ws)
D['flyra'].update(steps=rows(ws,6,17,dict(n='A',action='B',detail='C',result='D')),
  notes=split(v(ws,'A20'),'|'),
  pipeline=dict(before=v(ws,'B24'),during=v(ws,'C24'),after=v(ws,'D24'),rbefore=v(ws,'B25'),rduring=v(ws,'C25'),rafter=v(ws,'D25')))
ws=wb['08 TEXT TEMPLATES']; D['texts']=head(ws)
D['texts'].update(items=rows(ws,6,16,dict(situation='A',text='B',when='C')),standards=split(v(ws,'A19'),'•'))
ws=wb['09 MEASURE SOP']; D['measure']=head(ws)
D['measure'].update(steps=rows(ws,4,13,dict(n='A',area='B',measure='C',rule='D')),
  checklist=[p for r in range(16,19) for c in 'BCD' for p in [v(ws,f'{c}{r}').lstrip('□').strip()] if p],
  script=v(ws,'B21'))
ws=wb['10 PRICE CARD']; D['price']=head(ws)
D['price'].update(rates=[dict(term=v(ws,f'A{r}'),roof=ws[f'B{r}'].value,mini=ws[f'C{r}'].value,stake=ws[f'D{r}'].value,row=r) for r in (4,5,6)],
  components=rows(ws,10,16,dict(comp='A',qty='B',how='C',example='D')),
  example=dict(label=v(ws,'A19'),scope=v(ws,'B19'),calc=v(ws,'C19'),total=v(ws,'D19')),
  scoping=rows(ws,22,26,dict(n='A',q='B')),
  safety=[v(ws,f'{c}{r}') for r in (29,30) for c in 'BCD'])
print('const DATA='+json.dumps(D,ensure_ascii=False)+';')
