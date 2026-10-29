"""Browsertest für die Demoseite: Beispiel laden, Übersicht, Tabelle, Export.

Braucht Playwright mit Chromium. Aufruf: python3 werkzeuge/browsertest.py
Screenshots landen in .pruefung/ (nicht im Repo).
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

ordner = pathlib.Path(__file__).resolve().parent.parent
aus = ordner / '.pruefung'
aus.mkdir(exist_ok=True)
url = (ordner / 'index.html').as_uri()
probleme = []

with sync_playwright() as p:
    b = p.chromium.launch()
    for breite, schema in [(390, 'dark'), (390, 'light'), (1280, 'dark'), (1280, 'light')]:
        s = b.new_page(viewport={'width': breite, 'height': 900}, color_scheme=schema, accept_downloads=True)
        fehler = []
        s.on('console', lambda m: fehler.append(m.text) if m.type == 'error' else None)
        s.on('pageerror', lambda e: fehler.append(str(e)))
        s.goto(url)
        s.click('#beispiel')
        s.click('details.gruppe >> nth=0')
        if s.evaluate('document.documentElement.scrollWidth') > breite:
            probleme.append(f'{breite} {schema}: übersicht scrollt waagerecht')
        spanne = s.inner_text('#spanne')
        if 'gefährdet:' not in spanne:
            probleme.append(f'{breite} {schema}: spanne fehlt')
        if not s.is_visible('#marke-beispiel'):
            probleme.append(f'{breite} {schema}: marke Beispiel fehlt')
        s.screenshot(path=str(aus / f'ergebnis-{breite}-{schema}.png'), full_page=True)

        for knopf, endung in [('#export-json', '.json'), ('#export-csv', '.csv')]:
            with s.expect_download() as d:
                s.click(knopf)
            name = d.value.suggested_filename
            inhalt = pathlib.Path(d.value.path()).read_text(encoding='utf-8-sig')
            if not name.endswith(endung) or ('welk-bericht/1' not in inhalt and endung == '.json') \
                    or (endung == '.csv' and not inhalt.startswith('pfad;groesse;format')):
                probleme.append(f'{breite} {schema}: export {endung} kaputt')

        s.click('#tab-tabelle')
        if s.evaluate('document.documentElement.scrollWidth') > breite:
            probleme.append(f'{breite} {schema}: tabelle scrollt waagerecht')
        s.screenshot(path=str(aus / f'tabelle-{breite}-{schema}.png'))
        s.click('#tab-pruefen')
        s.click('#beispiel-weg')
        if not s.is_visible('#start'):
            probleme.append(f'{breite} {schema}: beispiel entfernen geht nicht')
        klein = s.evaluate("""[...document.querySelectorAll('button, label.btn, summary')]
            .filter(e => e.offsetParent && e.getBoundingClientRect().height < 44).map(e => e.id || e.textContent.trim())""")
        if klein:
            probleme.append(f'{breite} {schema}: tippflächen unter 44 px: {klein}')
        s.screenshot(path=str(aus / f'start-{breite}-{schema}.png'))
        if fehler:
            probleme.append(f'{breite} {schema}: konsole {fehler}')
        s.close()
    b.close()

if probleme:
    print('\n'.join(probleme))
    sys.exit(1)
print('browsertest ok, screenshots in .pruefung/')
