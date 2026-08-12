import io

file_path = 'src/main/resources/static/super-admin/index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

replacements = {
    u'\u00c3\u00a9': u'é',
    u'\u00c3\u00a8': u'è',
    u'\u00c3\u00aa': u'ê',
    u'\u00c3\u00a0': u'à',
    u'\u00c3\u00a7': u'ç',
    u'\u00c3\u00b4': u'ô',
    u'\u00c3\u00ae': u'î',
    u'\u00e2\u0153\u2026': u'?',
    u'\u00e2\u0153\u201d': u'?',
    u'\u00e2\u0153\u2013': u'?',
    u'\u00e2\u2020\u00bb': u'?',
    u'\ufffd?"': u'—',
    u'\ufffd?': u'—',
    u'\ufffd': u'—',
}

for old, new in replacements.items():
    text = text.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
print('Done!')
