from html.parser import HTMLParser
from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]
class Checker(HTMLParser):
    void = {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}
    def __init__(self):
        super().__init__(convert_charrefs=True); self.stack=[]; self.errors=[]
    def handle_starttag(self, tag, attrs):
        if tag not in self.void: self.stack.append((tag,self.getpos()))
        attrs=dict(attrs)
        for key in ("src","href"):
            value=attrs.get(key,"")
            if value and not value.startswith(("http://","https://","mailto:","tel:","#","data:")):
                target=(ROOT/value.split("#",1)[0].split("?",1)[0]).resolve()
                if not target.exists(): self.errors.append(f"Missing local {key}: {value} at {self.getpos()}")
    def handle_endtag(self, tag):
        if tag in self.void: return
        if not self.stack: self.errors.append(f"Unexpected closing tag </{tag}> at {self.getpos()}"); return
        if self.stack[-1][0] == tag: self.stack.pop(); return
        names=[x[0] for x in self.stack]
        if tag in names:
            self.errors.append(f"Misnested tag </{tag}> at {self.getpos()}, expected </{self.stack[-1][0]}>")
            while self.stack and self.stack[-1][0] != tag: self.stack.pop()
            if self.stack: self.stack.pop()
        else: self.errors.append(f"Unmatched closing tag </{tag}> at {self.getpos()}")
parser=Checker()
parser.feed((ROOT/"index.html").read_text(encoding="utf-8")); parser.close()
if parser.stack: parser.errors.extend(f"Unclosed <{tag}> opened at {pos}" for tag,pos in parser.stack)
for error in parser.errors: print("ERROR:",error)
if parser.errors: sys.exit(1)
scripts=re.findall(r'<script[^>]+src=["\']([^"\']+\.js)["\']', (ROOT/"index.html").read_text(encoding="utf-8"))
for script in scripts:
    if not (ROOT/script).exists(): print("ERROR: missing script",script); sys.exit(1)
print(f"HTML structure and {len(scripts)} local script references checked.")
