# welk.

Prüft einen Ordner lokal im Browser auf Dateiformate, die in Jahren schwer lesbar werden könnten.

## Problem

Fotos, Briefe, Tabellen, Sprachnotizen und Videos liegen oft zehn oder zwanzig Jahre auf einer Festplatte. Manche Formate überstehen das gut (JPEG, PNG, PDF, MP3, Klartext), andere hängen an einem einzigen Hersteller oder an Programmen, die es nicht mehr gibt (RealMedia, WordPerfect, alte Works-Dateien, Flash, binäre Office-Formate, manche Kamera-RAW). Das Problem merkt man erst, wenn eine Datei nicht mehr aufgeht, und dann ist die passende Software oft weg.

Erkennen kann man es vorher: am Format selbst. Ist die Spezifikation offen, gibt es eine Norm, ist das Format verbreitet, lesen es mehrere unabhängige freie Programme? Diese Fragen beantworten Archive seit Jahren, aber nur für Fachleute. Wie stark Format-Veralterung wirklich droht, ist in der Fachwelt umstritten. Deshalb gibt welk. keine Prognose mit Kommastelle, sondern eine Spanne und eine Ampel.

## Zielgruppe

Privatleute und kleine Vereine oder Büros, die einen Ordner mit eigenen Dateien aufbewahren wollen und wissen möchten, wo sie vorsorglich umwandeln sollten. Kein Fachwissen nötig, kein Upload, kein Konto.

## Vorbild und Abgrenzung

- **DROID** (The National Archives) und **Siegfried**: erkennen Formate sehr genau anhand der PRONOM-Signaturen. Java-Oberfläche bzw. Kommandozeile, gedacht für Archivfachleute. Sie sagen, *was* eine Datei ist, nicht *wie riskant* das ist.
- **PRONOM**: Formatregister mit Signaturen und Beschreibungen. Keine Oberfläche für Privatleute, keine Risiko-Ampel.
- Empfehlungen wie die Format-Listen der Library of Congress oder nationaler Archive bewerten Formate, sind aber Fließtext und prüfen keinen Ordner.

welk. macht anders: läuft komplett im Browser, liest pro Datei nur die ersten 512 Byte, erkennt rund 35 Alltagsformate, rechnet aus offen gelegten Kriterien eine Risikospanne und sagt pro Format, wohin man migrieren kann. Ehrlich: Die Erkennung ist viel gröber als bei DROID oder Siegfried, und die Bewertung ist eine kuratierte Einschätzung mit Quellen, keine Messung.

## Funktionen v1

- Ordner wählen (`<input type="file" webkitdirectory>`) oder per Drag and Drop ablegen. Nichts verlässt das Gerät.
- Pro Datei: Formaterkennung über Magic Bytes plus Dateiendung, Hinweis bei Widerspruch (z. B. `.jpg`, aber PNG-Inhalt).
- Pro Format: Risikospanne 0 bis 10, Ampel (grün, gelb, rot), kurzer Grund, Migrationsziel.
- Ordner-Übersicht: Dateien und Bytes je Ampel, Anteil gefährdeter Dateien als Spanne, Liste nach Format gruppiert, rot zuerst.
- Bericht exportieren als JSON (`welk-bericht/1`) und CSV. Kein Import nötig.
- Risikotabelle mit Stand und Quellen in der Demoseite einsehbar.
- Beispielordner (erfundene Testdateien, als `Beispiel` markiert, mit einem Klick entfernbar).
- PWA, offline, hell und dunkel.

## Nicht-Ziele

- Keine Umwandlung von Dateien. welk. empfiehlt nur.
- Keine Validierung (z. B. ob ein PDF wirklich PDF/A ist) und keine Prüfung auf Beschädigung.
- Keine vollständige PRONOM-Abdeckung, keine Abfrage von PRONOM oder anderen Diensten zur Laufzeit.
- Kein Blick in Archive (ZIP, RAR) hinein, keine Rekursion in Container.
- Keine Bewertung von Speichermedien (CD, Festplatte), nur von Formaten.
- Kein Speichern der Ergebnisse im Browser über die Sitzung hinaus.

## Daten und Format

Zwei Formate, später in `SPEC.md` ausgearbeitet.

**Risikotabelle `welk-tabelle/1`** (eine Datei `tabelle.js`, klassisches Script, weil `fetch` und ES-Module unter `file://` nicht laufen; in Node per `module.exports` lesbar):

- `version`: `"welk-tabelle/1"`, `stand`: ISO-Datum der Kuratierung
- `formate`: Liste mit je
  - `id` (z. B. `jpeg`, `doc-binaer`, `realmedia`), `name`, `endungen` (`["jpg","jpeg"]`)
  - `signaturen`: Liste von `{ offset, hex }`, alle müssen passen (z. B. `{0,"FFD8FF"}`); optional `ext_pflicht: true`, wenn die Signatur mehrdeutig ist und erst die Endung entscheidet (OLE2 für DOC, XLS, PPT, WPS; ZIP für DOCX, XLSX, PPTX, PAGES; TIFF für CR2, NEF)
  - `kriterien`: `offen`, `norm`, `verbreitung`, `vielfalt`, je als Spanne `[a, b]` mit 0 gut, 1 mittel, 2 schlecht
  - `grund` (ein Satz), `ziel` (Migrationsempfehlung), `quellen` (PRONOM-PUID wie `fmt/43` und Titel öffentlicher Empfehlungen, keine Abfrage)
- Rund 35 Formate: Bild (JPEG, PNG, GIF, TIFF, WebP, HEIC, BMP, PSD, CR2, NEF), Dokument (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ODT, ODS, RTF, WordPerfect, WPS, Pages, Text UTF-8, HTML), Audio (MP3, WAV, FLAC, OGG, WMA, MIDI), Video (MP4/M4A/MOV über `ftyp`-Marke, AVI, MKV, WMV, RealMedia, FLV, SWF), Archiv (ZIP, RAR, 7z).
- ODF wird über den unkomprimierten `mimetype`-Eintrag ab Byte 30 erkannt, MP4-Familie über die Marke an Byte 8 bis 11, RIFF über die Kennung an Byte 8.
- Text: gültiges UTF-8 ohne NUL-Byte in den ersten 512 Byte, sonst nicht Text.

**Bericht `welk-bericht/1`** (JSON, Download): `version`, `tabelle_stand`, `erstellt`, `dateien`: Liste mit `pfad` (relativ zum gewählten Ordner), `groesse`, `format`, `risiko` `[min,max]`, `ampel`, `hinweis`; dazu `summe` wie unten. CSV mit denselben Spalten, Semikolon, UTF-8.

Versionierung: Änderungen an Feldern erhöhen die Zahl hinter dem Schrägstrich. Neue Formate oder geänderte Bewertungen ändern nur `stand`.

## Rechenlogik

Reine Funktionen in `welk.js`:

- `erkenne(kopf: Uint8Array, name: string) -> { id, hinweis }`: prüft Signaturen in Tabellenreihenfolge (spezifische vor allgemeinen), bei `ext_pflicht` zusätzlich die Endung. Passt keine Signatur, aber die Endung, gilt das Format mit Hinweis `nur endung`. Passt nichts: `unbekannt`. Widerspricht die Endung der Signatur: Hinweis `endung passt nicht`.
- `risiko(kriterien) -> [min, max]`: `min = rund(10 · Σa / 8)`, `max = rund(10 · Σb / 8)`, `rund` = auf ganze Zahl, .5 aufrunden. `unbekannt` hat fest `[2, 10]`.
- `ampel([min, max])`: grün wenn `max ≤ 3`, rot wenn `min ≥ 6`, sonst gelb.
- `summe(liste)`: Dateien und Bytes je Ampel; gefährdet sicher = Anzahl mit `min ≥ 6`, gefährdet höchstens = Anzahl mit `max ≥ 6`; Anteil als Spanne in ganzen Prozent (abgerundet bzw. aufgerundet).

Testvektoren:

1. `FF D8 FF E0 …`, `urlaub.jpg` → `jpeg`. Kriterien a = (0,0,0,0), b = (0,0,0,1) → `[0, rund(1,25)] = [0, 1]` → grün.
2. `D0 CF 11 E0 A1 B1 1A E1 …`, `brief.doc` → `doc-binaer`. a = (1,2,1,0) Σ4, b = (1,2,2,1) Σ6 → `[5, rund(7,5)] = [5, 8]` → gelb, Ziel „PDF/A zum Aufheben, ODT oder DOCX zum Weiterbearbeiten“.
3. `2E 52 4D 46 …`, `film.rm` → `realmedia`. a = (2,2,2,1) Σ7, b = (2,2,2,2) Σ8 → `[rund(8,75), 10] = [9, 10]` → rot.
4. `89 50 4E 47 0D 0A 1A 0A …`, `foto.jpg` → `png`, Hinweis `endung passt nicht`.
5. Ordner aus 1, 2, 3 und einer Datei `notiz.xyz` mit `00 01 02 03` (unbekannt, `[2,10]`): grün 1, gelb 2, rot 1; gefährdet sicher 1, höchstens 3 → **25 % bis 75 %**.

## Demoseite

`index.html`, ohne Server lauffähig, Handy zuerst, Designsystem des Hauses.

- **Start:** `welk.` mit Einzeiler, großer Knopf „ordner wählen“, Drop-Fläche, Knopf „beispiel laden“. Satz: „deine dateien bleiben auf dem gerät. gelesen werden nur die ersten 512 byte.“
- **Prüfen:** Fortschritt in `--mono` (`1 204 / 3 880 dateien`), abbrechbar. Lesen mit begrenzter Parallelität, damit auch 10 000 Dateien auf dem Handy gehen.
- **Übersicht:** drei Ampel-Kacheln mit Dateien und Bytes, darunter die Spanne „gefährdet: 25 % bis 75 % der dateien“. Darunter Formatgruppen, rot zuerst: Name, Anzahl, Spanne, Grund, Ziel. Aufklappen zeigt die Dateipfade. Hinweise (Endung passt nicht, nur Endung) gesammelt.
- **Tabelle:** alle Formate mit Kriterien, Spanne, Quellen und `stand`. Kurz erklärt, wie gerechnet wird und was Vermutung ist.
- **Export:** Knöpfe „bericht als json“ und „als csv“. Beispieldaten tragen die Marke `Beispiel` und lassen sich mit „beispiel entfernen“ löschen.

Der Beispielordner ist im Code erzeugt (kleine Byte-Folgen mit erfundenen Namen), keine echten Dateien.

## Testplan

- `node --test`: alle Testvektoren oben, dazu je Format der Tabelle eine Mindest-Signatur aus `testvektoren/` (kleine Hex-Dateien, selbst erzeugt), Mehrdeutigkeiten (OLE2 mit `.xls`, ZIP mit `.pptx`, ZIP mit ODF-`mimetype`, TIFF mit `.nef`), leere Datei, Datei kürzer als die Signatur.
- Tabellenprüfung: jedes Format hat `stand`, mindestens eine Quelle, Kriterien im Bereich 0 bis 2 mit `a ≤ b`, eindeutige `id`.
- `summe`: Rundung der Prozent-Spanne, leerer Ordner (keine Division durch null, Anzeige „keine dateien“).
- Browsertest bei 390 px und 1280 px, hell und dunkel: Beispiel laden, Übersicht, Export.
- Offline-Test: nach erstem Laden ohne Netz neu laden, Prüfen funktioniert.
- Keine externen Requests: Netzwerkprotokoll der Demoseite muss leer sein bis auf eigene Dateien.

## Risiken

- **Bewertung ist Meinung.** Die Kriterien sind kuratiert, Fachleute würden manche anders setzen. Gegenmittel: Spannen, offene Kriterien, Quellen und `stand` sichtbar.
- **Grobe Erkennung.** 512 Byte und rund 35 Signaturen verwechseln Unterformate (z. B. PDF und PDF/A, verschiedene RAW-Varianten). Wird so benannt.
- **Falsche Sicherheit.** Grün heißt nicht „für immer lesbar“, nur geringes Formatrisiko. Steht auf der Übersicht.
- **Browsergrenzen.** `webkitdirectory` fehlt in manchen mobilen Browsern; dann Mehrfachauswahl von Dateien als Ausweichweg. Sehr große Ordner können langsam sein.
- **Veralterung der Tabelle selbst.** Ohne Pflege wird der `stand` alt. Er wird prominent angezeigt.

## Offene Fragen

- Ob Format-Veralterung für Alltagsformate in 10 bis 20 Jahren real eintritt, ist nicht belegt. welk. bewertet Wahrscheinlichkeiten, nicht Gewissheiten.
- Gewichtung der vier Kriterien: gleich gewichtet ist eine Setzung. Ob `vielfalt` stärker zählen sollte, bleibt offen.
- Schwelle 6 für „gefährdet“ und die Ampelgrenzen 3 und 6 sind gewählt, nicht hergeleitet.
- Wie gut HEIC und Kamera-RAW in zehn Jahren lesbar sind, ist umstritten; deshalb dort breite Spannen.
