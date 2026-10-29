// Baut testvektoren.json aus ausdrücklich hingeschriebenen Bytes, bewusst nicht aus der Tabelle.
// Aufruf: node werkzeuge/testvektoren-erzeugen.js
const fs = require('fs');
const path = require('path');
const ziel = path.join(__dirname, '..', 'testvektoren.json');
const a = (s) => Buffer.from(s, 'utf8').toString('hex').toUpperCase();
const z = (n) => '00'.repeat(n);
const ODF = (typ) => '504B0304' + z(26) + a('mimetype') + a('application/vnd.oasis.opendocument.' + typ);
const OLE2 = 'D0CF11E0A1B11AE1' + z(8);
const ASF = '3026B2758E66CF11A6D900AA0062CE6C';

const e = (name, kopf, id, hinweis = null, extra = {}) => Object.assign({ name, kopf, id, hinweis }, extra);

const erkennung = [
  // Testvektoren aus dem Scope
  e('urlaub.jpg', 'FFD8FFE000104A464946', 'jpeg', null, { risiko: [0, 1], ampel: 'gruen', notiz: 'Scope 1' }),
  e('brief.doc', OLE2, 'doc-binaer', null, { risiko: [5, 8], ampel: 'gelb', notiz: 'Scope 2' }),
  e('film.rm', '2E524D4600000012', 'realmedia', null, { risiko: [9, 10], ampel: 'rot', notiz: 'Scope 3' }),
  e('foto.jpg', '89504E470D0A1A0A0000000D49484452', 'png', 'endung passt nicht', { notiz: 'Scope 4' }),
  e('notiz.xyz', '00010203', 'unbekannt', null, { risiko: [2, 10], ampel: 'gelb', notiz: 'Scope 5' }),

  // je Format eine Mindest-Signatur
  e('bild.png', '89504E470D0A1A0A0000000D49484452', 'png'),
  e('foto.cr2','49492A00100000004352020000000000', 'cr2'),
  e('foto.nef', '4D4D002A00000008', 'nef'),
  e('foto.nrw', '49492A0008000000', 'nef'),
  e('scan.tif', '49492A0008000000', 'tiff'),
  e('scan.tiff', '4D4D002A00000008', 'tiff'),
  e('brief.odt', ODF('text'), 'odt'),
  e('kasse.ods', ODF('spreadsheet'), 'ods'),
  e('vortrag.odp', ODF('presentation'), 'odp'),
  e('brief.docx', '504B030414000600', 'docx'),
  e('kasse.xlsx', '504B030414000600', 'xlsx'),
  e('vortrag.pptx', '504B030414000600', 'pptx', null, { notiz: 'ZIP mit .pptx' }),
  e('notiz.pages', '504B030414000000', 'pages'),
  e('archiv.zip', '504B030414000000', 'zip'),
  e('leer.zip', '504B0506' + z(18), 'zip'),
  e('brief.zip', ODF('text'), 'odt', 'endung passt nicht', { notiz: 'ZIP mit ODF-mimetype, aber .zip' }),
  e('kasse.xls', OLE2, 'xls-binaer', null, { notiz: 'OLE2 mit .xls' }),
  e('vortrag.ppt', OLE2, 'ppt-binaer'),
  e('rezepte.wps', OLE2, 'wps'),
  e('daten.bin', OLE2, 'ole2'),
  e('bild.heic', '00000018' + a('ftyp') + a('heic') + '00000000', 'heic'),
  e('bild.heif', '00000018' + a('ftyp') + a('mif1') + '00000000', 'heic'),
  e('clip.mov', '00000014' + a('ftyp') + a('qt  ') + '00000000', 'mov'),
  e('lied.m4a', '00000020' + a('ftyp') + a('M4A ') + '00000000', 'm4a'),
  e('video.mp4', '00000020' + a('ftyp') + a('isom') + '00000200', 'mp4'),
  e('bild.webp', a('RIFF') + '24000000' + a('WEBP'), 'webp'),
  e('ton.wav', a('RIFF') + '24000000' + a('WAVE'), 'wav'),
  e('film.avi', a('RIFF') + '24000000' + a('AVI '), 'avi'),
  e('lied.wma', ASF, 'wma'),
  e('film.wmv', ASF, 'wmv'),
  e('film.asf', ASF, 'wmv'),
  e('bild.gif', a('GIF89a') + '01000100', 'gif'),
  e('alt.gif', a('GIF87a') + '01000100', 'gif'),
  e('bild.bmp', a('BM') + '3A000000', 'bmp'),
  e('ebenen.psd', a('8BPS') + '0001', 'psd'),
  e('rechnung.pdf', a('%PDF-1.7'), 'pdf'),
  e('brief.rtf', a('{\\rtf1\\ansi'), 'rtf'),
  e('brief.wpd', 'FF575043', 'wordperfect'),
  e('lied.mp3', a('ID3') + '0400', 'mp3'),
  e('roh.mp3', 'FFFB9064', 'mp3'),
  e('lied.flac', a('fLaC') + '00000022', 'flac'),
  e('lied.ogg', a('OggS') + '0002', 'ogg'),
  e('lied.mid', a('MThd') + '00000006', 'midi'),
  e('film.mkv', '1A45DFA3', 'mkv'),
  e('clip.webm', '1A45DFA3', 'mkv'),
  e('clip.flv', a('FLV') + '01', 'flv'),
  e('spiel.swf', a('CWS') + '0A', 'swf'),
  e('archiv.rar', a('Rar!') + '1A0700', 'rar'),
  e('archiv.7z', '377ABCAF271C0004', '7z'),
  e('seite.html', a('<!DOCTYPE html>\n<html lang="de">'), 'html'),
  e('notiz.txt', a('Hallo Welt\n'), 'text-utf8'),
  e('gruesse.md', a('Grüße aus dem Beispiel\n'), 'text-utf8'),

  // Mehrdeutigkeiten und Randfälle
  e('URLAUB.JPG', 'FFD8FFE1', 'jpeg', null, { notiz: 'Endung groß' }),
  e('bild.xyz', 'FFD8FFE1', 'jpeg', null, { notiz: 'unbekannte Endung, kein Hinweis' }),
  e('brief.doc', a('{\\rtf1'), 'rtf', 'endung passt nicht', { notiz: 'RTF unter .doc' }),
  e('bm.txt', a('BM ist kein Bild'), 'text-utf8', null, { notiz: 'BMP braucht die Endung' }),
  e('README', a('Hallo'), 'text-utf8', null, { notiz: 'ohne Endung' }),
  e('seite.txt', a('<html>'), 'text-utf8', null, { notiz: 'HTML braucht die Endung' }),
  e('latin1.txt', '4772FC65', 'text-utf8', 'nur endung', { notiz: 'kein gültiges UTF-8' }),
  e('nul.txt', '41004200', 'text-utf8', 'nur endung', { notiz: 'NUL-Byte' }),
  e('lang.txt', '61'.repeat(511) + 'C3', 'text-utf8', null, { notiz: 'Zeichen am Fensterende angeschnitten' }),
  e('kurz.txt', '61C3', 'text-utf8', 'nur endung', { notiz: 'angeschnitten, Datei endet' }),
  e('ueberlang.txt', 'C0AF', 'text-utf8', 'nur endung', { notiz: 'überlange Form' }),
  e('ersatz.txt', 'EDA080', 'text-utf8', 'nur endung', { notiz: 'Ersatzzeichen' }),
  e('leer.jpg', '', 'jpeg', 'nur endung', { notiz: 'leere Datei' }),
  e('leer.xyz', '', 'unbekannt', null, { notiz: 'leere Datei, Endung nicht in der Tabelle' }),
  e('kurz.png', '89504E', 'png', 'nur endung', { notiz: 'kürzer als die Signatur' }),
  e('kurz.odt', '504B0304' + z(26) + a('mimetype'), 'zip', 'endung passt nicht', { notiz: 'ODF abgeschnitten, nur der ZIP-Kopf passt' }),
  e('daten.dat', '504B030414000000', 'zip', null, { notiz: 'ZIP, Endung unbekannt' }),
  e('foto.png', '49492A00100000004352020000000000', 'cr2', 'endung passt nicht')
];

// Handrechnung: rund(10·S/8) für S = 0 bis 8
const S = { 0: 0, 1: 1, 2: 3, 3: 4, 4: 5, 5: 6, 6: 8, 7: 9, 8: 10 };
const risiko = [
  { kriterien: { offen: [0, 0], norm: [0, 0], verbreitung: [0, 0], vielfalt: [0, 1] }, risiko: [0, 1], ampel: 'gruen', notiz: 'Scope 1: 10·1/8 = 1,25' },
  { kriterien: { offen: [1, 1], norm: [2, 2], verbreitung: [1, 2], vielfalt: [0, 1] }, risiko: [5, 8], ampel: 'gelb', notiz: 'Scope 2: 10·6/8 = 7,5' },
  { kriterien: { offen: [2, 2], norm: [2, 2], verbreitung: [2, 2], vielfalt: [1, 2] }, risiko: [9, 10], ampel: 'rot', notiz: 'Scope 3: 10·7/8 = 8,75' },
  { kriterien: { offen: [0, 0], norm: [0, 0], verbreitung: [0, 1], vielfalt: [0, 1] }, risiko: [0, 3], ampel: 'gruen', notiz: '10·2/8 = 2,5 wird 3' },
  { kriterien: { offen: [0, 1], norm: [0, 1], verbreitung: [0, 1], vielfalt: [0, 0] }, risiko: [0, 4], ampel: 'gelb', notiz: '10·3/8 = 3,75 wird 4' },
  { kriterien: { offen: [1, 1], norm: [1, 1], verbreitung: [1, 1], vielfalt: [1, 2] }, risiko: [5, 6], ampel: 'gelb', notiz: '10·5/8 = 6,25 wird 6' },
  { kriterien: { offen: [1, 2], norm: [1, 2], verbreitung: [1, 2], vielfalt: [2, 2] }, risiko: [6, 10], ampel: 'rot', notiz: 'min 6 ist rot' },
  { kriterien: null, risiko: [2, 10], ampel: 'gelb', notiz: 'unbekannt' }
];
for (const r of risiko) {
  if (!r.kriterien) continue;
  const sa = Object.values(r.kriterien).reduce((s, x) => s + x[0], 0);
  const sb = Object.values(r.kriterien).reduce((s, x) => s + x[1], 0);
  if (S[sa] !== r.risiko[0] || S[sb] !== r.risiko[1]) throw new Error('Handrechnung falsch: ' + r.notiz);
}

const leer = { dateien: 0, bytes: 0 };
const summe = [
  {
    notiz: 'Scope 5: Ordner aus 1, 2, 3 und notiz.xyz',
    dateien: [
      { groesse: 2400000, risiko: [0, 1] },
      { groesse: 48000, risiko: [5, 8] },
      { groesse: 9000000, risiko: [9, 10] },
      { groesse: 4, risiko: [2, 10] }
    ],
    erwartet: {
      dateien: 4, bytes: 11448004,
      gruen: { dateien: 1, bytes: 2400000 }, gelb: { dateien: 2, bytes: 48004 }, rot: { dateien: 1, bytes: 9000000 },
      gefaehrdet_sicher: 1, gefaehrdet_hoechstens: 3, anteil: [25, 75]
    }
  },
  {
    notiz: 'leerer Ordner, keine Division durch null',
    dateien: [],
    erwartet: {
      dateien: 0, bytes: 0, gruen: leer, gelb: leer, rot: leer,
      gefaehrdet_sicher: 0, gefaehrdet_hoechstens: 0, anteil: null
    }
  },
  {
    notiz: 'Drittel: 33,3 abgerundet, 66,7 aufgerundet',
    dateien: [{ groesse: 1, risiko: [9, 10] }, { groesse: 1, risiko: [5, 8] }, { groesse: 1, risiko: [0, 0] }],
    erwartet: {
      dateien: 3, bytes: 3,
      gruen: { dateien: 1, bytes: 1 }, gelb: { dateien: 1, bytes: 1 }, rot: { dateien: 1, bytes: 1 },
      gefaehrdet_sicher: 1, gefaehrdet_hoechstens: 2, anteil: [33, 67]
    }
  },
  {
    notiz: 'Siebtel: 14,29 ergibt 14 bis 15',
    dateien: [{ groesse: 10, risiko: [8, 9] }].concat(Array.from({ length: 6 }, () => ({ groesse: 5, risiko: [0, 1] }))),
    erwartet: {
      dateien: 7, bytes: 40,
      gruen: { dateien: 6, bytes: 30 }, gelb: leer, rot: { dateien: 1, bytes: 10 },
      gefaehrdet_sicher: 1, gefaehrdet_hoechstens: 1, anteil: [14, 15]
    }
  },
  {
    notiz: 'max genau 6 zählt als höchstens gefährdet, min 5 nicht als sicher',
    dateien: [{ groesse: 0, risiko: [5, 6] }],
    erwartet: {
      dateien: 1, bytes: 0, gruen: leer, gelb: { dateien: 1, bytes: 0 }, rot: leer,
      gefaehrdet_sicher: 0, gefaehrdet_hoechstens: 1, anteil: [0, 100]
    }
  }
];

const out = {
  version: 'welk-testvektoren/1',
  beschreibung: 'Testvektoren für welk-tabelle/1 und welk-bericht/1. kopf: die ersten Bytes der Datei als Hex, die Datei ist genau so lang.',
  erkennung, risiko, summe
};
fs.writeFileSync(ziel, JSON.stringify(out, null, 1) + '\n');
console.log(erkennung.length + ' Erkennungsfälle geschrieben');
