# The tsunami's pictures, started from scratch by the owner on 19 Nov 2026. The source is SpriteCook sheet B1
# (b1-spritecook.png, asset 3dbc32e4-01b4-438a-a024-dd4051bc833b), AI-made (SpriteCook) at the owner's request,
# 2026-11-19: four stages of one wave (splash, rise, curl, crash), cut from their backdrop into b1-cut.png.
# This cuts the stages apart, gives them one 14-colour palette, drops the stray dark shard under the lip, and
# pre-scales them to the heights the game plays. Run: python3 design/weapon-art/tsunami/frames.py
# The tsunami from scratch (owner, 19 Nov 2026): SpriteCook sheet B1 (asset 3dbc32e4), four stages of one
# wave, cut from its backdrop. Each stage is pre-scaled to the heights the move needs, so playing it only
# picks a frame. Facing right; the left-going wave is the same frames mirrored.
import numpy as np, json
from PIL import Image
from scipy import ndimage
import os
HERE=os.path.dirname(os.path.abspath(__file__))
cut=Image.open(os.path.join(HERE,'b1-cut.png')); A=np.array(cut)
alpha=A[...,3]>0
cols=alpha.sum(0)
def gap(lo,hi): return lo+int(np.argmin(cols[lo:hi]))
b=[0,gap(42,50),gap(112,122),gap(180,195),272]
print('stage columns',b)
# one palette for every stage: 14 colours from the cut pixels
px=A[alpha][:,:3]
pim=Image.fromarray(px.reshape(-1,1,3)).quantize(14,method=Image.Quantize.MEDIANCUT)
pal=np.array(pim.getpalette()[:42]).reshape(14,3)
KEYS='0123456789abcd'
order=np.argsort(pal.sum(1)); pal=pal[order]
HEX=['#%02X%02X%02X'%tuple(c) for c in pal]
def stage(i):
    s=A[:,b[i]:b[i+1]].copy(); m=s[...,3]>0
    # drop detached dark shards (pieces of the old backdrop's shading); keep the body and the bright spray
    # the thin water line along the bottom joins the shards to the body: judge them without it
    H0=m.shape[0]; base=np.zeros_like(m); base[H0-3:]=m[H0-3:]; mm=m.copy(); mm[H0-3:]=False
    lab,n=ndimage.label(mm,np.ones((3,3))); sz=ndimage.sum(mm,lab,range(1,n+1)); main=1+int(np.argmax(sz))
    for k in range(1,n+1):
        if k==main: continue
        pk=lab==k
        if s[pk][:,:3].sum(1).mean()<420 or np.where(pk)[0].max()>H0*0.55: s[pk,3]=0   # dark, or low down: not spray
    # the bottom rows stay only under what is left above them
    keep=ndimage.binary_dilation((s[...,3]>0)&~base,iterations=2)
    s[(base)&~keep,3]=0
    m=s[...,3]>0
    if i==1:
        # low down, the face is the first run of water from the left; anything past a gap (the shard under
        # the lip), or spreading forward faster than the face does, is not the wave
        ys,xs=np.where(m); y0,y1=ys.min(),ys.max(); prev=None
        for y in range(y0+int((y1-y0)*0.55),y1+1):
            row=np.where(m[y])[0]
            if not len(row): continue
            end=row[0]
            while end+1<m.shape[1] and m[y,end+1]: end+=1
            if prev is not None: end=min(end,prev+2)
            s[y,end+1:,3]=0; m[y,end+1:]=False; prev=end
    ys,xs=np.where(m); s=s[ys.min():ys.max()+1,xs.min():xs.max()+1]
    return s
def rows_at(s,h):
    # nearest-neighbour scale to height h, then each pixel to its nearest palette colour
    sc=h/s.shape[0]; w=max(1,round(s.shape[1]*sc))
    im=Image.fromarray(s).resize((w,h),Image.NEAREST); a=np.array(im).astype(int)
    d=((a[...,None,:3]-pal[None,None])**2).sum(-1).argmin(-1)
    out=[]
    for y in range(h):
        out.append(''.join(KEYS[d[y,x]] if a[y,x,3]>0 else '.' for x in range(w)))
    return out
def front(rows):
    # the wave's front: the rightmost column with water in the lower half
    h=len(rows); lo=rows[h//2:]
    return max(max((x for x,c in enumerate(r) if c!='.'),default=0) for r in lo)
def build(heights):
    out={}
    for name,i,hs in (('splash',0,heights['splash']),('rise',1,heights['rise']),('curl',2,heights['curl']),('crash',3,heights['crash'])):
        st=stage(i); out[name]=[]
        for h in hs:
            r=rows_at(st,h); out[name].append({'h':h,'w':len(r[0]),'fx':front(r),'rows':r})
    return out
def tops(fr):
    for f in fr: f['tops']=[next((y for y in range(f['h']) if f['rows'][y][x]!='.'),f['h']) for x in range(f['w'])]
    return fr
# The boss's waves: 90 tall at the curl (2.5 times his height, the owner's retune of 16 Nov 2026).
boss=build({'splash':[20,34,48],'rise':[37,45,53,62,70,78,86],'curl':[90],'crash':[54]})
# The Torrent Cannon's nosedive: the same wave small, one picture set per height the tank can pay for.
tidal={str(h):build({'splash':[max(5,h//3),max(7,h//2)],'rise':[max(8,h*2//3),h-2],'curl':[h],'crash':[max(7,h*2//3)]}) for h in (14,18,22,26,30,34)}
for set_ in [boss]+list(tidal.values()):
    for k in set_: tops(set_[k])
out={'note':"The tsunami (owner, 19 Nov 2026): SpriteCook sheet B1 (asset 3dbc32e4-01b4-438a-a024-dd4051bc833b), AI-made (SpriteCook) at the owner's request, 2026-11-19. Written by design/weapon-art/tsunami/frames.py; never edit by hand.",
     'pal':dict(zip(KEYS,HEX)),'boss':boss,'tidal':tidal}
json.dump(out,open(os.path.join(HERE,'../../../src/data/tempest-tsunami.json'),'w'),separators=(',',':'))
print('written', {k:[f['h'] for f in boss[k]] for k in boss})
