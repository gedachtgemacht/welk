# welk.

**Welche deiner Dateien sind in zehn Jahren noch lesbar?** welk. prüft einen Ordner und zeigt dir, bei welchen Formaten sich eine Umwandlung vorsorglich lohnt.

Fotos, Briefe, Tabellen und Videos liegen oft jahrelang auf einer Festplatte. Manche Formate überstehen das gut (JPEG, PNG, PDF, Klartext), andere hängen an einem Hersteller oder an Programmen, die es nicht mehr gibt (RealMedia, WordPerfect, Works, Flash, binäre Office-Formate). Du merkst es erst, wenn eine Datei nicht mehr aufgeht. welk. liest den Ordner im Browser, erkennt die Formate und sagt dir pro Format: Ampel, Risikospanne, Grund und wohin du migrieren kannst.

Reine Rechnung, keine KI, kein Server. Alles bleibt auf deinem Gerät.

<p align="center">
  <img src="bilder/1-uebersicht.png" width="240" alt="">
  <img src="bilder/2-breit.png" width="480" alt="">
</p>

## Warum

Ob ein Format in Zukunft lesbar bleibt, lässt sich vorher einschätzen: Ist die Spezifikation offen? Gibt es eine Norm? Ist das Format verbreitet? Lesen es mehrere unabhängige freie Programme? Archive beantworten diese Fragen seit Jahren, aber für Fachleute. Werkzeuge wie DROID oder Siegfried erkennen Formate sehr genau, bewerten das Risiko aber nicht. welk. ist die einfache Variante für Privatleute, kleine Vereine und Büros.

Wie stark Format-Veralterung wirklich droht, ist in der Fachwelt umstritten. Deshalb gibt welk. keine Prognose mit Kommastelle, sondern eine Spanne und eine Ampel.

## Funktionen

- **Ordner wählen** oder per Drag and Drop ablegen. Ohne Ordnerauswahl im Browser (manche mobilen Browser) geht die Auswahl einzelner Dateien
- **Formaterkennung** für 45 Alltagsformate (Bild, Dokument, Audio, Video, Archiv) über Signaturen und Dateiendung, mit Hinweis bei Widerspruch (zum Beispiel `.jpg`, aber PNG-Inhalt)
- **Risikospanne** von 0 bis 10 pro Format, dazu Ampel (grün, gelb, rot), kurzer Grund und Migrationsziel
- **Übersicht** mit Dateien und Bytes je Ampel, dem Anteil gefährdeter Dateien als Spanne und den Formaten nach Risiko sortiert, rot zuerst
- **Risikotabelle** mit allen Formaten, Kriterien, Quellen und Stand in der App einsehbar
- **Export** des Berichts als JSON (`welk-bericht/1`) oder CSV für deutsches Excel
- **Beispielordner** mit erfundenen Dateien, als `Beispiel` markiert und mit einem Klick entfernbar
- Hell und dunkel, funktioniert offline, installierbar als App

welk. wandelt nichts um, validiert nichts (ob ein PDF wirklich PDF/A ist) und schaut nicht in Archive wie ZIP hinein. Es empfiehlt nur.

## Datenschutz

Nichts verlässt dein Gerät. welk. hat keinen Server, kein Konto, keine Analyse, keine Werbung und lädt nichts aus dem Netz nach. Pro Datei werden nur die ersten 512 Byte gelesen, der Rest bleibt unberührt. Ergebnisse existieren nur, solange die Seite offen ist, und werden nicht im Browser gespeichert. Berichte entstehen nur, wenn du sie selbst exportierst.

## Installation

welk. ist eine statische Web-App. Es gibt keinen Build-Schritt und keine Abhängigkeiten.

1. Den Ordner auf einen beliebigen statischen Host legen (eigener Webspace, GitHub Pages, Netlify, ein Raspberry Pi). Für die Installation als App ist HTTPS nötig.
2. Die Adresse im Browser öffnen.
3. Im Browsermenü **Zum Startbildschirm hinzufügen** oder **Installieren** wählen. Danach startet welk. wie eine App und funktioniert auch ohne Netz.

Lokal testen:

```
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen. `index.html` läuft auch direkt per Doppelklick, nur die Installation als App braucht einen Server.

## Wie es funktioniert

Die vollständige Spezifikation steht in [`SPEC.md`](SPEC.md). Sie reicht, um welk. in einer anderen Sprache nachzubauen. Die Referenzimplementierung ist `welk.js` (läuft in Browser und Node, keine Abhängigkeiten), die Daten stehen in `tabelle.js`, die Testvektoren in `testvektoren.json`.

**Kurz:**

1. **Erkennen.** Aus den ersten 512 Byte und der Endung wird das Format bestimmt. Spezifische Signaturen kommen vor allgemeinen. Mehrdeutige Signaturen (OLE2, ZIP, TIFF) entscheidet erst die Endung.
2. **Bewerten.** Jedes Format hat vier Kriterien als Spanne von 0 (gut) bis 2 (schlecht): `offen`, `norm`, `verbreitung`, `vielfalt`. Risiko = 10 × Summe ÷ 8, gerundet, getrennt für die untere und obere Grenze. Unbekannte Formate haben fest `[2, 10]`.
3. **Ampel.** Grün, wenn die obere Grenze höchstens 3 ist. Rot, wenn die untere Grenze mindestens 6 ist. Sonst gelb.
4. **Summe.** Als gefährdet gilt ab Risiko 6. Der Anteil gefährdeter Dateien ist eine Spanne: von „sicher gefährdet“ (untere Grenze mindestens 6) bis „höchstens gefährdet“ (obere Grenze mindestens 6).

Beispiel: Eine `.doc`-Datei hat die Summen 4 (unten) und 6 (oben), also Risiko `[5, 8]` und damit gelb. `film.rm` (RealMedia) kommt auf `[9, 10]`, also rot. Ein Ordner aus `urlaub.jpg`, `brief.doc`, `film.rm` und einer unbekannten Datei hat 25 % bis 75 % gefährdete Dateien.

**Getestet:** Die Rechenfunktionen sind reine Funktionen und mit `node test-calc.js` gegen Handrechnungen und die Testvektoren aus `testvektoren.json` geprüft. Die Testvektoren entstehen mit `werkzeuge/testvektoren-erzeugen.js` aus ausdrücklich hingeschriebenen Bytes, nicht aus der Tabelle.

**Bekannt und Vermutung:**

- Die Formaterkennung ist bekannt und prüfbar, aber gröber als bei DROID oder Siegfried. Unterformate (PDF und PDF/A, RAW-Varianten, Codecs in Containern) werden nicht unterschieden.
- Die Bewertung der Kriterien ist eine kuratierte Einschätzung mit Quellen, keine Messung. Fachleute würden manche Werte anders setzen. Die PUIDs sind nach bestem Wissen zugeordnet und sollten bei archivarischem Einsatz gegen PRONOM geprüft werden.
- Vermutung bleibt, ob Alltagsformate in zehn bis zwanzig Jahren wirklich unlesbar werden. welk. bewertet Wahrscheinlichkeiten, keine Gewissheiten.
- Gleiche Gewichtung der vier Kriterien sowie die Grenzen 3 und 6 sind gesetzt, nicht hergeleitet.
- Grün heißt nicht „für immer lesbar“, nur geringes Formatrisiko. Sehr breite Spannen (zum Beispiel HEIC und Kamera-RAW) zeigen, dass die Lage umstritten ist.

## Lizenz

GNU Affero General Public License v3.0 (AGPL-3.0), siehe `LICENSE`.

---

**gedacht.gemacht.** Kleine, ehrliche Software. Alles bleibt auf deinem Gerät.
