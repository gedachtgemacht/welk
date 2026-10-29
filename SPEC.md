# welk. Spezifikation

Version dieses Dokuments: welk-tabelle/1 und welk-bericht/1.

welk. bewertet Dateien danach, wie riskant ihr **Format** für die Lesbarkeit in zehn bis zwanzig Jahren ist. Es liest pro Datei nur die ersten 512 Byte, erkennt das Format an Signaturen und Endung und rechnet aus vier kuratierten Kriterien eine Risikospanne von 0 bis 10 und eine Ampel. Diese Spezifikation reicht, um welk. in einer anderen Sprache nachzubauen. Die Referenzimplementierung ist `welk.js` (JavaScript, läuft in Browser und Node, keine Abhängigkeiten), die Daten stehen in `tabelle.js`, die Testvektoren in `testvektoren.json`.

Schlüsselwörter MUSS, SOLL und KANN sind wie in RFC 2119 gemeint.

## 1. Begriffe

- **Kopf**: die ersten `min(512, Dateigröße)` Byte einer Datei. Eine Implementierung MUSS mit genau diesem Fenster arbeiten. Ist ein Kopf länger, wird er auf 512 Byte gekürzt.
- **Endung**: der Teil des Dateinamens nach dem letzten Punkt, in Kleinbuchstaben, ohne Punkt. Maßgeblich ist nur der letzte Pfadteil (Trenner `/` oder `\`). Steht der Punkt an erster Stelle (`.profil`) oder fehlt er (`README`), ist die Endung leer.
- **Format-ID**: Kleinbuchstaben, Ziffern und Bindestrich, beginnend mit Buchstabe oder Ziffer. `unbekannt` ist reserviert.

## 2. Risikotabelle `welk-tabelle/1`

Ein JSON-kompatibles Objekt. Die Referenz liefert es als klassisches Script `tabelle.js` aus, weil `fetch` und ES-Module unter `file://` nicht laufen. Im Browser setzt das Script `globalThis.WELK_TABELLE`, in Node ist es per `require` lesbar.

| Feld | Typ | Bedeutung |
|---|---|---|
| `version` | Text | genau `"welk-tabelle/1"` |
| `stand` | Text | ISO-Datum `JJJJ-MM-TT` der letzten Kuratierung |
| `formate` | Liste | Formate in **Prüfreihenfolge** |

Jedes Format:

| Feld | Pflicht | Typ | Bedeutung |
|---|---|---|---|
| `id` | ja | Text | eindeutige Format-ID |
| `name` | ja | Text | Anzeigename |
| `art` | ja | Text | `bild`, `dokument`, `audio`, `video` oder `archiv`, nur für die Anzeige |
| `endungen` | ja | Liste von Text | Endungen klein, ohne Punkt, KANN leer sein. Jede Endung DARF in der ganzen Tabelle nur einmal vorkommen. |
| `signaturen` | ja, außer bei `text` | Liste von `{ offset, hex }` | alle müssen passen |
| `text` | nein | `true` | Format wird über die Textprüfung (Abschnitt 3.2) statt über Signaturen erkannt |
| `ext_pflicht` | nein | `true` | Signatur ist mehrdeutig, das Format gilt nur, wenn zusätzlich die Endung in `endungen` steht |
| `kriterien` | ja | Objekt | `offen`, `norm`, `verbreitung`, `vielfalt`, je `[a, b]` |
| `grund` | ja | Text | ein Satz, warum das Format so bewertet ist |
| `ziel` | ja | Text | Migrationsempfehlung |
| `quellen` | ja | Liste von Text, mindestens ein Eintrag | PRONOM-PUIDs (`fmt/43`), Normen, Titel öffentlicher Empfehlungen |

### 2.1 Signaturen

- `offset`: ganze Zahl ab 0, Position im Kopf.
- `hex`: eine oder mehrere **Alternativen**, getrennt durch `|`. Jede Alternative ist eine gerade Anzahl Hex-Ziffern (groß oder klein), `??` steht für ein beliebiges Byte. Beispiel: `{ "offset": 0, "hex": "49492A00|4D4D002A" }` für TIFF in beiden Bytefolgen.
- Eine Signatur passt, wenn mindestens eine Alternative ab `offset` vollständig im Kopf liegt und Byte für Byte übereinstimmt. Reicht der Kopf nicht so weit, passt die Alternative nicht.
- Ein Format passt per Signatur, wenn **alle** seine Signaturen passen.
- Keine Signatur DARF über Byte 512 hinausreichen.

### 2.2 Kriterien

Jedes Kriterium ist eine Spanne `[a, b]` mit `a, b ∈ {0, 1, 2}` und `a ≤ b`. 0 heißt gut, 1 mittel, 2 schlecht.

| Kriterium | Frage |
|---|---|
| `offen` | Ist die Spezifikation frei zugänglich und vollständig? |
| `norm` | Gibt es eine Norm (ISO, IETF, W3C) oder nur eine Herstellerbeschreibung? |
| `verbreitung` | Wie verbreitet ist das Format heute? |
| `vielfalt` | Lesen es mehrere unabhängige freie Programme? |

Die Werte sind eine kuratierte Einschätzung, keine Messung.

### 2.3 Formprüfung

Eine gültige Tabelle erfüllt: `version` stimmt, `stand` ist ein ISO-Datum, jede `id` ist gültig und eindeutig, jede Endung kommt höchstens einmal vor, jedes Nicht-Text-Format hat mindestens eine Signatur mit gültigem Hex, alle Kriterien liegen in 0 bis 2 mit `a ≤ b`, `grund`, `ziel` und mindestens eine Quelle sind vorhanden, `ext_pflicht` kommt nur mit nicht leeren `endungen` vor. Die Referenz prüft das mit `pruefeTabelle`.

## 3. Erkennung

`erkenne(kopf, name) -> { id, hinweis }`

`hinweis` ist `null`, `"nur endung"` oder `"endung passt nicht"`.

### 3.1 Ablauf

1. Kopf auf 512 Byte kürzen, Endung `e` aus `name` bestimmen.
2. Formate **in Tabellenreihenfolge** durchgehen. Ein Format passt, wenn
   - es `text: true` hat und der Kopf Text ist (3.2), sonst wenn alle Signaturen passen, **und**
   - es kein `ext_pflicht` hat oder `e` in seinen `endungen` steht.
   Das erste passende Format ist der Treffer.
3. `F_e` ist das Format, in dessen `endungen` `e` steht (oder keins).
4. Gibt es einen Treffer `F`:
   - Ist `F_e` vorhanden und von `F` verschieden: `{ id: F.id, hinweis: "endung passt nicht" }`.
   - Sonst: `{ id: F.id, hinweis: null }`. Eine Endung, die in der Tabelle gar nicht vorkommt, löst also keinen Hinweis aus.
5. Kein Treffer, aber `F_e` vorhanden: `{ id: F_e.id, hinweis: "nur endung" }`.
6. Sonst `{ id: "unbekannt", hinweis: null }`.

Die Reihenfolge der Tabelle setzt spezifische Signaturen vor allgemeine: Kamera-RAW vor TIFF, ODF (über den `mimetype`-Eintrag ab Byte 30) vor den Office-Formaten mit `ext_pflicht` vor ZIP, die OLE2-Formate mit `ext_pflicht` vor dem allgemeinen Eintrag `ole2`, HEIC, MOV und M4A (Marke an Byte 8 bis 11) vor MP4, WMA vor WMV, Text zuletzt.

### 3.2 Textprüfung

Der Kopf ist Text, wenn er mindestens ein Byte hat, kein Byte `00` enthält und gültiges UTF-8 nach RFC 3629 ist: keine überlangen Formen, keine Ersatzzeichen (U+D800 bis U+DFFF), nichts über U+10FFFF. Eine **angeschnittene** Folge ganz am Ende ist nur dann gültig, wenn der Kopf volle 512 Byte lang ist (die Datei geht also weiter) und die vorhandenen Bytes ein gültiger Anfang sind. Eine BOM (`EF BB BF`) ist erlaubt. UTF-16 gilt nicht als Text.

### 3.3 Leere und kurze Dateien

Eine leere Datei passt auf keine Signatur und ist kein Text. Sie bekommt das Format ihrer Endung mit `nur endung`, sonst `unbekannt`. Eine Datei kürzer als eine Signatur passt auf diese Signatur nicht.

## 4. Risiko und Ampel

`risiko(kriterien) -> [min, max]`

```
Σa = offen.a + norm.a + verbreitung.a + vielfalt.a      (0 bis 8)
Σb = offen.b + norm.b + verbreitung.b + vielfalt.b
min = rund(10 · Σa / 8)
max = rund(10 · Σb / 8)
rund(x) = ⌊x + 0,5⌋   (auf ganze Zahl, .5 wird aufgerundet)
```

Ganzzahlig ohne Gleitkomma: `rund(10·S/8) = ⌊(10·S + 4) / 8⌋`. Wertetabelle:

| S | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| rund(10·S/8) | 0 | 1 | 3 | 4 | 5 | 6 | 8 | 9 | 10 |

`unbekannt` hat fest `[2, 10]`.

`ampel([min, max])`: `gruen`, wenn `max ≤ 3`; sonst `rot`, wenn `min ≥ 6`; sonst `gelb`. Die Werte sind ASCII (`gruen`), die Anzeige darf „grün“ schreiben.

## 5. Summe

`summe(liste)` über Einträge mit `groesse` (Byte) und `risiko`:

| Feld | Bedeutung |
|---|---|
| `dateien`, `bytes` | gesamt |
| `gruen`, `gelb`, `rot` | je `{ dateien, bytes }` |
| `gefaehrdet_sicher` | Anzahl mit `min ≥ 6` |
| `gefaehrdet_hoechstens` | Anzahl mit `max ≥ 6` |
| `anteil` | `[⌊100 · sicher / dateien⌋, ⌈100 · hoechstens / dateien⌉]` in ganzen Prozent, `null` bei null Dateien |

Bei null Dateien wird nicht geteilt, die Anzeige sagt „keine dateien“.

## 6. Bericht `welk-bericht/1`

JSON, UTF-8:

```json
{
  "version": "welk-bericht/1",
  "tabelle_stand": "2026-10-29",
  "erstellt": "2026-10-29T12:00:00.000Z",
  "dateien": [
    { "pfad": "fotos/urlaub.jpg", "groesse": 2400000, "format": "jpeg",
      "risiko": [0, 1], "ampel": "gruen", "hinweis": null }
  ],
  "summe": { "dateien": 1, "bytes": 2400000, "...": "wie Abschnitt 5" }
}
```

- `pfad`: relativ zum gewählten Ordner, Trenner `/`. Der Name des gewählten Ordners selbst wird weggelassen.
- `hinweis`: wie bei der Erkennung, zusätzlich `"nicht lesbar"`, wenn die Datei nicht gelesen werden konnte (sie wird dann wie eine leere Datei erkannt).
- `erstellt`: ISO-Zeitpunkt in UTC.

### 6.1 CSV

Dieselben Daten als CSV: UTF-8 mit BOM, Trenner Semikolon, Zeilenende CRLF, Kopfzeile

```
pfad;groesse;format;risiko_min;risiko_max;ampel;hinweis
```

Zellen mit `;`, `"` oder Zeilenumbruch stehen in Anführungszeichen, `"` wird verdoppelt. Beginnt eine Zelle mit `=`, `+`, `-`, `@`, Tab oder CR, wird ein `'` vorangestellt, damit Tabellenprogramme sie nicht als Formel ausführen. `hinweis` ist leer, wenn es keinen gibt. Die Summe steht nicht in der CSV.

## 7. Versionierung

- Änderungen an Feldern oder an ihrer Bedeutung erhöhen die Zahl hinter dem Schrägstrich (`welk-tabelle/2`, `welk-bericht/2`).
- Neue Formate, geänderte Signaturen oder geänderte Bewertungen ändern nur `stand`.
- Ein Leser MUSS eine unbekannte Version ablehnen und SOLL unbekannte zusätzliche Felder ignorieren.

## 8. Testvektoren

`testvektoren.json` (`welk-testvektoren/1`) enthält:

- `erkennung`: `{ name, kopf, id, hinweis }`, `kopf` als Hex, die Datei ist genau so lang. Für jedes Format der Tabelle gibt es mindestens einen Fall ohne Hinweis, dazu Mehrdeutigkeiten (OLE2 mit `.xls`, ZIP mit `.pptx`, ZIP mit ODF-`mimetype`, TIFF mit `.nef`) und Randfälle (leere Datei, kürzer als die Signatur, angeschnittenes UTF-8, NUL, überlange Formen). Einige Fälle tragen zusätzlich `risiko` und `ampel`.
- `risiko`: `{ kriterien, risiko, ampel }`, `kriterien: null` steht für `unbekannt`.
- `summe`: `{ dateien, erwartet }`.

Die fünf Handrechnungen aus dem Entwurf:

1. `FF D8 FF E0 …`, `urlaub.jpg` → `jpeg`, a = (0,0,0,0), b = (0,0,0,1) → `[0, rund(1,25)] = [0, 1]` → grün.
2. `D0 CF 11 E0 A1 B1 1A E1 …`, `brief.doc` → `doc-binaer`, Σa = 4, Σb = 6 → `[5, rund(7,5)] = [5, 8]` → gelb.
3. `2E 52 4D 46 …`, `film.rm` → `realmedia`, Σa = 7, Σb = 8 → `[rund(8,75), 10] = [9, 10]` → rot.
4. `89 50 4E 47 0D 0A 1A 0A …`, `foto.jpg` → `png`, Hinweis `endung passt nicht`.
5. Ordner aus 1, 2, 3 und `notiz.xyz` mit `00 01 02 03` (`unbekannt`, `[2, 10]`): grün 1, gelb 2, rot 1, gefährdet sicher 1, höchstens 3 → 25 % bis 75 %.

Die Datei wird von `werkzeuge/testvektoren-erzeugen.js` aus ausdrücklich hingeschriebenen Bytes erzeugt, nicht aus der Tabelle. `node test-calc.js` prüft die Referenz dagegen.

## 9. Fehlerfälle

| Fall | Verhalten |
|---|---|
| Datei leer | Format der Endung mit `nur endung`, sonst `unbekannt` |
| Datei nicht lesbar | wie leer, Hinweis `nicht lesbar` |
| Kopf länger als 512 Byte | wird gekürzt |
| Tabelle mit Formfehler | Implementierung SOLL sie ablehnen |
| Hex in der Tabelle ungültig | Formfehler |

## 10. Bewusst offen

- **Gewichtung.** Die vier Kriterien zählen gleich. Ob `vielfalt` mehr zählen sollte, ist offen.
- **Grenzen.** Ampelgrenzen 3 und 6 und die Schwelle 6 für „gefährdet“ sind gesetzt, nicht hergeleitet.
- **Erkennungstiefe.** Unterformate (PDF und PDF/A, RAW-Varianten, Codecs in Containern) werden nicht unterschieden. Inhalte von ZIP und anderen Containern werden nicht geprüft. Ältere MOV-Dateien ohne `ftyp` und UTF-16-Text werden nur über die Endung erkannt.
- **Quellen.** PRONOM-PUIDs sind nach bestem Wissen zugeordnet und werden zur Laufzeit nicht abgefragt. Wer welk. in einem Archiv nutzt, SOLL sie gegen PRONOM prüfen. Wo die Zuordnung unsicher war, steht keine PUID, sondern nur eine öffentliche Empfehlung.
- **Prognose.** Ob Alltagsformate in zehn bis zwanzig Jahren wirklich unlesbar werden, ist nicht belegt. welk. bewertet Wahrscheinlichkeiten, keine Gewissheiten.
