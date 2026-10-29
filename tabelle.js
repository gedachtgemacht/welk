/*
 * welk. Risikotabelle, Format welk-tabelle/1
 *
 * Klassisches Script: im Browser setzt es globalThis.WELK_TABELLE,
 * in Node ist es per require('./tabelle.js') lesbar.
 *
 * Reihenfolge ist Prüfreihenfolge: spezifische Signaturen vor allgemeinen.
 * Kriterien je als Spanne [a, b]: 0 gut, 1 mittel, 2 schlecht.
 *   offen        Spezifikation frei zugänglich und vollständig?
 *   norm         Gibt es eine Norm (ISO, IETF, W3C) oder nur eine Herstellerbeschreibung?
 *   verbreitung  Wie verbreitet ist das Format heute?
 *   vielfalt     Lesen es mehrere unabhängige freie Programme?
 * Die Bewertung ist eine kuratierte Einschätzung, keine Messung.
 */
(function (wurzel) {
  var LOC = 'Library of Congress: Sustainability of Digital Formats';
  var LOC_RFS = 'Library of Congress: Recommended Formats Statement';

  var ZIP = '504B0304';
  var OLE2 = 'D0CF11E0A1B11AE1';
  var TIFF = '49492A00|4D4D002A';
  var RIFF = '52494646';
  var ASF = '3026B2758E66CF11A6D900AA0062CE6C';
  var FTYP = '66747970';
  // "mimetype" ab Byte 30, danach der Wert, unkomprimiert am Anfang jeder ODF-Datei
  var ODF = '6D696D65747970656170706C69636174696F6E2F766E642E6F617369732E6F70656E646F63756D656E742E';

  function k(o, n, v, f) { return { offen: o, norm: n, verbreitung: v, vielfalt: f }; }

  var tabelle = {
    version: 'welk-tabelle/1',
    stand: '2026-10-29',
    formate: [
      // TIFF-Familie: Kamera-RAW vor allgemeinem TIFF
      {
        id: 'cr2', name: 'Canon RAW (CR2)', art: 'bild', endungen: ['cr2'],
        signaturen: [{ offset: 0, hex: '49492A00' }, { offset: 8, hex: '435202' }],
        kriterien: k([1, 2], [2, 2], [1, 2], [0, 1]),
        grund: 'Herstellerformat ohne offene Spezifikation, Nachfolger CR3 hat es schon abgelöst.',
        ziel: 'DNG zum Aufheben der Rohdaten, dazu JPEG oder TIFF als fertiges Bild',
        quellen: ['fmt/592', LOC]
      },
      {
        id: 'nef', name: 'Nikon RAW (NEF)', art: 'bild', endungen: ['nef', 'nrw'],
        signaturen: [{ offset: 0, hex: TIFF }], ext_pflicht: true,
        kriterien: k([1, 2], [2, 2], [1, 2], [0, 1]),
        grund: 'Herstellerformat ohne offene Spezifikation, Varianten je Kameramodell.',
        ziel: 'DNG zum Aufheben der Rohdaten, dazu JPEG oder TIFF als fertiges Bild',
        quellen: ['fmt/202', LOC]
      },
      {
        id: 'tiff', name: 'TIFF', art: 'bild', endungen: ['tif', 'tiff'],
        signaturen: [{ offset: 0, hex: TIFF }],
        kriterien: k([0, 0], [0, 1], [0, 1], [0, 0]),
        grund: 'Offen beschrieben und in Archiven bewährt, nur exotische Kompressionen machen Ärger.',
        ziel: 'behalten, unkomprimiert oder mit LZW',
        quellen: ['fmt/353', LOC_RFS]
      },

      // ZIP-Familie: ODF über den mimetype-Eintrag, dann Office per Endung, dann ZIP allgemein
      {
        id: 'odt', name: 'OpenDocument Text (ODT)', art: 'dokument', endungen: ['odt', 'ott'],
        signaturen: [{ offset: 0, hex: ZIP }, { offset: 30, hex: ODF + '74657874' }],
        kriterien: k([0, 0], [0, 0], [1, 1], [0, 1]),
        grund: 'Offene ISO-Norm, mehrere freie Programme lesen es.',
        ziel: 'behalten, zum Aufheben zusätzlich PDF/A',
        quellen: ['fmt/291', 'ISO/IEC 26300', LOC_RFS]
      },
      {
        id: 'ods', name: 'OpenDocument Tabelle (ODS)', art: 'dokument', endungen: ['ods', 'ots'],
        signaturen: [{ offset: 0, hex: ZIP }, { offset: 30, hex: ODF + '7370726561647368656574' }],
        kriterien: k([0, 0], [0, 0], [1, 1], [0, 1]),
        grund: 'Offene ISO-Norm, mehrere freie Programme lesen es.',
        ziel: 'behalten, Daten zusätzlich als CSV',
        quellen: ['ISO/IEC 26300', LOC_RFS]
      },
      {
        id: 'odp', name: 'OpenDocument Präsentation (ODP)', art: 'dokument', endungen: ['odp', 'otp'],
        signaturen: [{ offset: 0, hex: ZIP }, { offset: 30, hex: ODF + '70726573656E746174696F6E' }],
        kriterien: k([0, 0], [0, 0], [1, 1], [0, 1]),
        grund: 'Offene ISO-Norm, aber Präsentationen sehen in jedem Programm etwas anders aus.',
        ziel: 'behalten, zum Aufheben zusätzlich PDF/A',
        quellen: ['ISO/IEC 26300', LOC_RFS]
      },
      {
        id: 'docx', name: 'Word (DOCX)', art: 'dokument', endungen: ['docx', 'docm', 'dotx'],
        signaturen: [{ offset: 0, hex: ZIP }], ext_pflicht: true,
        kriterien: k([0, 1], [0, 0], [0, 0], [0, 1]),
        grund: 'ISO-Norm und sehr verbreitet, aber Word schreibt Erweiterungen, die andere nur teilweise kennen.',
        ziel: 'behalten, zum Aufheben zusätzlich PDF/A',
        quellen: ['fmt/412', 'ISO/IEC 29500', LOC_RFS]
      },
      {
        id: 'xlsx', name: 'Excel (XLSX)', art: 'dokument', endungen: ['xlsx', 'xlsm', 'xltx'],
        signaturen: [{ offset: 0, hex: ZIP }], ext_pflicht: true,
        kriterien: k([0, 1], [0, 0], [0, 0], [0, 1]),
        grund: 'ISO-Norm und sehr verbreitet, Formeln und Makros sind nicht überall gleich.',
        ziel: 'behalten, Daten zusätzlich als CSV',
        quellen: ['fmt/214', 'ISO/IEC 29500', LOC_RFS]
      },
      {
        id: 'pptx', name: 'PowerPoint (PPTX)', art: 'dokument', endungen: ['pptx', 'ppsx', 'potx'],
        signaturen: [{ offset: 0, hex: ZIP }], ext_pflicht: true,
        kriterien: k([0, 1], [0, 0], [0, 0], [0, 1]),
        grund: 'ISO-Norm und sehr verbreitet, Layout weicht in anderen Programmen ab.',
        ziel: 'behalten, zum Aufheben zusätzlich PDF/A',
        quellen: ['fmt/215', 'ISO/IEC 29500', LOC_RFS]
      },
      {
        id: 'pages', name: 'Apple Pages', art: 'dokument', endungen: ['pages'],
        signaturen: [{ offset: 0, hex: ZIP }], ext_pflicht: true,
        kriterien: k([2, 2], [2, 2], [1, 2], [1, 2]),
        grund: 'Undokumentiertes Herstellerformat, das sich mit fast jeder Version ändert.',
        ziel: 'PDF/A zum Aufheben, DOCX oder ODT zum Weiterbearbeiten',
        quellen: [LOC]
      },
      {
        id: 'zip', name: 'ZIP-Archiv', art: 'archiv', endungen: ['zip'],
        signaturen: [{ offset: 0, hex: '504B0304|504B0506|504B0708' }],
        kriterien: k([0, 0], [0, 1], [0, 0], [0, 0]),
        grund: 'Der Container selbst ist robust. Was darin liegt, prüft welk. nicht.',
        ziel: 'behalten, Inhalt einzeln prüfen',
        quellen: ['x-fmt/263', 'ISO/IEC 21320-1', LOC_RFS]
      },

      // OLE2-Familie: alte Office- und Works-Dateien, nur per Endung unterscheidbar
      {
        id: 'doc-binaer', name: 'Word 97 bis 2003 (DOC)', art: 'dokument', endungen: ['doc', 'dot'],
        signaturen: [{ offset: 0, hex: OLE2 }], ext_pflicht: true,
        kriterien: k([1, 1], [2, 2], [1, 2], [0, 1]),
        grund: 'Binäres Herstellerformat, nur nachträglich beschrieben, wird nicht mehr weiterentwickelt.',
        ziel: 'PDF/A zum Aufheben, ODT oder DOCX zum Weiterbearbeiten',
        quellen: ['fmt/40', LOC]
      },
      {
        id: 'xls-binaer', name: 'Excel 97 bis 2003 (XLS)', art: 'dokument', endungen: ['xls', 'xlt'],
        signaturen: [{ offset: 0, hex: OLE2 }], ext_pflicht: true,
        kriterien: k([1, 1], [2, 2], [1, 2], [0, 1]),
        grund: 'Binäres Herstellerformat, nur nachträglich beschrieben, wird nicht mehr weiterentwickelt.',
        ziel: 'XLSX oder ODS, Daten zusätzlich als CSV',
        quellen: ['fmt/61', LOC]
      },
      {
        id: 'ppt-binaer', name: 'PowerPoint 97 bis 2003 (PPT)', art: 'dokument', endungen: ['ppt', 'pps', 'pot'],
        signaturen: [{ offset: 0, hex: OLE2 }], ext_pflicht: true,
        kriterien: k([1, 1], [2, 2], [1, 2], [0, 1]),
        grund: 'Binäres Herstellerformat, nur nachträglich beschrieben, wird nicht mehr weiterentwickelt.',
        ziel: 'PDF/A zum Aufheben, PPTX oder ODP zum Weiterbearbeiten',
        quellen: ['fmt/126', LOC]
      },
      {
        id: 'wps', name: 'Microsoft Works Text (WPS)', art: 'dokument', endungen: ['wps'],
        signaturen: [{ offset: 0, hex: OLE2 }], ext_pflicht: true,
        kriterien: k([2, 2], [2, 2], [2, 2], [1, 2]),
        grund: 'Works gibt es seit Jahren nicht mehr, nur wenige Programme lesen es noch.',
        ziel: 'jetzt umwandeln: PDF/A zum Aufheben, ODT oder DOCX zum Weiterbearbeiten',
        quellen: [LOC]
      },
      {
        id: 'ole2', name: 'OLE2-Verbunddatei (unklar)', art: 'dokument', endungen: [],
        signaturen: [{ offset: 0, hex: OLE2 }],
        kriterien: k([1, 2], [2, 2], [1, 2], [1, 2]),
        grund: 'Alter Microsoft-Container, ohne passende Endung ist unklar, welches Programm ihn schrieb.',
        ziel: 'Herkunft klären, dann ins passende offene Format umwandeln',
        quellen: ['fmt/111', LOC]
      },

      // ISO-Mediendatei mit ftyp: HEIC, MOV, M4A vor MP4 allgemein
      {
        id: 'heic', name: 'HEIC/HEIF', art: 'bild', endungen: ['heic', 'heif', 'hif'],
        signaturen: [{ offset: 4, hex: FTYP }, { offset: 8, hex: '68656963|68656978|68657663|68657678|6D696631|6D736631' }],
        kriterien: k([1, 2], [0, 0], [1, 1], [1, 2]),
        grund: 'ISO-Norm, aber der Bildcodec HEVC ist patentbelastet und wird nicht überall frei gelesen.',
        ziel: 'JPEG zum Weitergeben, PNG oder TIFF für verlustfreies Aufheben',
        quellen: ['ISO/IEC 23008-12', LOC]
      },
      {
        id: 'mov', name: 'QuickTime (MOV)', art: 'video', endungen: ['mov', 'qt'],
        signaturen: [{ offset: 4, hex: FTYP }, { offset: 8, hex: '71742020' }],
        kriterien: k([1, 1], [1, 1], [0, 1], [0, 1]),
        grund: 'Apple-Format mit öffentlicher Beschreibung, Vorbild für MP4, Codecs darin wechseln.',
        ziel: 'MP4 mit H.264 und AAC',
        quellen: ['x-fmt/384', LOC]
      },
      {
        id: 'm4a', name: 'AAC-Audio (M4A)', art: 'audio', endungen: ['m4a', 'm4b'],
        signaturen: [{ offset: 4, hex: FTYP }, { offset: 8, hex: '4D344120|4D344220' }],
        kriterien: k([1, 1], [0, 0], [0, 0], [0, 0]),
        grund: 'ISO-Norm und weit verbreitet, Spezifikation aber kostenpflichtig.',
        ziel: 'behalten, für Archivkopien zusätzlich FLAC',
        quellen: ['ISO/IEC 14496-3', LOC]
      },
      {
        id: 'mp4', name: 'MP4 (ISO-Mediendatei)', art: 'video', endungen: ['mp4', 'm4v', '3gp'],
        signaturen: [{ offset: 4, hex: FTYP }],
        kriterien: k([0, 1], [0, 0], [0, 0], [0, 1]),
        grund: 'ISO-Norm und überall abspielbar, die Codecs darin sind teils patentbelastet.',
        ziel: 'behalten',
        quellen: ['fmt/199', 'ISO/IEC 14496-14', LOC_RFS]
      },

      // RIFF-Familie, Kennung an Byte 8
      {
        id: 'webp', name: 'WebP', art: 'bild', endungen: ['webp'],
        signaturen: [{ offset: 0, hex: RIFF }, { offset: 8, hex: '57454250' }],
        kriterien: k([0, 0], [0, 1], [0, 1], [1, 1]),
        grund: 'Offen und frei, aber fast alle Programme nutzen dieselbe Bibliothek.',
        ziel: 'behalten, für Archivkopien PNG oder JPEG',
        quellen: ['fmt/566', 'RFC 9649', LOC]
      },
      {
        id: 'wav', name: 'WAV', art: 'audio', endungen: ['wav', 'wave'],
        signaturen: [{ offset: 0, hex: RIFF }, { offset: 8, hex: '57415645' }],
        kriterien: k([0, 0], [1, 1], [0, 0], [0, 0]),
        grund: 'Einfacher, gut beschriebener Aufbau, liest praktisch jedes Programm.',
        ziel: 'behalten, platzsparend als FLAC',
        quellen: ['fmt/141', LOC_RFS]
      },
      {
        id: 'avi', name: 'AVI', art: 'video', endungen: ['avi'],
        signaturen: [{ offset: 0, hex: RIFF }, { offset: 8, hex: '41564920' }],
        kriterien: k([1, 1], [2, 2], [0, 1], [0, 2]),
        grund: 'Alter Microsoft-Container, die Codecs darin sind oft exotisch und vergessen.',
        ziel: 'MP4 mit H.264 oder MKV',
        quellen: ['fmt/5', LOC]
      },

      // ASF-Familie: WMA per Endung, sonst WMV
      {
        id: 'wma', name: 'Windows Media Audio (WMA)', art: 'audio', endungen: ['wma'],
        signaturen: [{ offset: 0, hex: ASF }], ext_pflicht: true,
        kriterien: k([1, 2], [2, 2], [1, 2], [0, 1]),
        grund: 'Herstellerformat, das kaum noch genutzt wird, freie Decoder sind nachgebaut.',
        ziel: 'FLAC zum Aufheben, MP3 oder M4A zum Hören',
        quellen: ['fmt/132', LOC]
      },
      {
        id: 'wmv', name: 'Windows Media Video (WMV, ASF)', art: 'video', endungen: ['wmv', 'asf'],
        signaturen: [{ offset: 0, hex: ASF }],
        kriterien: k([1, 2], [2, 2], [1, 2], [0, 1]),
        grund: 'Herstellerformat, das kaum noch genutzt wird, freie Decoder sind nachgebaut.',
        ziel: 'MP4 mit H.264 und AAC',
        quellen: ['fmt/133', LOC]
      },

      // Eindeutige Signaturen
      {
        id: 'jpeg', name: 'JPEG', art: 'bild', endungen: ['jpg', 'jpeg', 'jpe', 'jfif'],
        signaturen: [{ offset: 0, hex: 'FFD8FF' }],
        kriterien: k([0, 0], [0, 0], [0, 0], [0, 1]),
        grund: 'ISO-Norm, überall lesbar, unzählige unabhängige Decoder.',
        ziel: 'behalten',
        quellen: ['fmt/43', 'fmt/44', 'ISO/IEC 10918-1', LOC_RFS]
      },
      {
        id: 'png', name: 'PNG', art: 'bild', endungen: ['png'],
        signaturen: [{ offset: 0, hex: '89504E470D0A1A0A' }],
        kriterien: k([0, 0], [0, 0], [0, 0], [0, 0]),
        grund: 'Offene ISO- und W3C-Norm, verlustfrei, überall lesbar.',
        ziel: 'behalten',
        quellen: ['fmt/11', 'fmt/12', 'fmt/13', 'ISO/IEC 15948', LOC_RFS]
      },
      {
        id: 'gif', name: 'GIF', art: 'bild', endungen: ['gif'],
        signaturen: [{ offset: 0, hex: '474946383761|474946383961' }],
        kriterien: k([0, 0], [1, 1], [0, 1], [0, 0]),
        grund: 'Alt, einfach und offen beschrieben, nur 256 Farben.',
        ziel: 'behalten, Fotos besser als PNG',
        quellen: ['fmt/3', 'fmt/4', LOC]
      },
      {
        id: 'bmp', name: 'BMP', art: 'bild', endungen: ['bmp', 'dib'],
        signaturen: [{ offset: 0, hex: '424D' }], ext_pflicht: true,
        kriterien: k([0, 1], [1, 1], [0, 0], [0, 0]),
        grund: 'Einfacher, gut bekannter Aufbau, aber keine Norm und viel Platzbedarf.',
        ziel: 'PNG',
        quellen: ['fmt/116', LOC]
      },
      {
        id: 'psd', name: 'Photoshop (PSD)', art: 'bild', endungen: ['psd', 'psb'],
        signaturen: [{ offset: 0, hex: '38425053' }],
        kriterien: k([1, 1], [2, 2], [0, 1], [1, 2]),
        grund: 'Herstellerformat, andere Programme lesen Ebenen und Effekte nur teilweise.',
        ziel: 'TIFF mit Ebenen oder PNG als fertiges Bild, PSD daneben behalten',
        quellen: ['x-fmt/92', LOC]
      },
      {
        id: 'pdf', name: 'PDF', art: 'dokument', endungen: ['pdf'],
        signaturen: [{ offset: 0, hex: '25504446' }],
        kriterien: k([0, 0], [0, 0], [0, 0], [0, 1]),
        grund: 'ISO-Norm, überall lesbar. Ob es PDF/A ist, prüft welk. nicht.',
        ziel: 'behalten, für Langzeit PDF/A',
        quellen: ['fmt/14', 'fmt/276', 'ISO 32000', LOC_RFS]
      },
      {
        id: 'rtf', name: 'Rich Text (RTF)', art: 'dokument', endungen: ['rtf'],
        signaturen: [{ offset: 0, hex: '7B5C727466' }],
        kriterien: k([0, 0], [1, 2], [0, 1], [0, 0]),
        grund: 'Lesbarer Text mit offener Beschreibung, wird aber seit 2008 nicht mehr gepflegt.',
        ziel: 'behalten, zusätzlich PDF/A oder ODT',
        quellen: [LOC]
      },
      {
        id: 'wordperfect', name: 'WordPerfect', art: 'dokument', endungen: ['wpd', 'wp', 'wp5', 'wp6'],
        signaturen: [{ offset: 0, hex: 'FF575043' }],
        kriterien: k([1, 1], [2, 2], [2, 2], [1, 2]),
        grund: 'Kaum noch genutzt, nur wenige Programme lesen es zuverlässig.',
        ziel: 'jetzt umwandeln: PDF/A zum Aufheben, ODT oder DOCX zum Weiterbearbeiten',
        quellen: [LOC]
      },
      {
        id: 'mp3', name: 'MP3', art: 'audio', endungen: ['mp3'],
        signaturen: [{ offset: 0, hex: '494433|FFFB|FFF3|FFF2|FFFA' }],
        kriterien: k([0, 0], [0, 0], [0, 0], [0, 0]),
        grund: 'ISO-Norm, Patente abgelaufen, überall abspielbar.',
        ziel: 'behalten',
        quellen: ['fmt/134', 'ISO/IEC 11172-3', LOC_RFS]
      },
      {
        id: 'flac', name: 'FLAC', art: 'audio', endungen: ['flac'],
        signaturen: [{ offset: 0, hex: '664C6143' }],
        kriterien: k([0, 0], [0, 0], [0, 1], [0, 0]),
        grund: 'Offen, verlustfrei, als RFC genormt, mehrere freie Decoder.',
        ziel: 'behalten',
        quellen: ['fmt/279', 'RFC 9639', LOC_RFS]
      },
      {
        id: 'ogg', name: 'Ogg (Vorbis, Opus)', art: 'audio', endungen: ['ogg', 'oga', 'opus'],
        signaturen: [{ offset: 0, hex: '4F676753' }],
        kriterien: k([0, 0], [0, 0], [0, 1], [0, 0]),
        grund: 'Offen und frei, als RFC beschrieben, etwas weniger verbreitet als MP3.',
        ziel: 'behalten',
        quellen: ['fmt/203', 'RFC 3533', LOC]
      },
      {
        id: 'midi', name: 'MIDI', art: 'audio', endungen: ['mid', 'midi', 'kar'],
        signaturen: [{ offset: 0, hex: '4D546864' }],
        kriterien: k([0, 0], [1, 1], [1, 1], [0, 0]),
        grund: 'Offen beschrieben und einfach, der Klang hängt aber vom Abspielgerät ab.',
        ziel: 'behalten, zusätzlich eine Aufnahme als FLAC',
        quellen: ['x-fmt/230', LOC]
      },
      {
        id: 'mkv', name: 'Matroska (MKV, WebM)', art: 'video', endungen: ['mkv', 'mka', 'webm'],
        signaturen: [{ offset: 0, hex: '1A45DFA3' }],
        kriterien: k([0, 0], [0, 1], [1, 1], [0, 0]),
        grund: 'Offener Container, seit 2024 als RFC beschrieben, viele freie Abspieler.',
        ziel: 'behalten',
        quellen: ['fmt/569', 'RFC 9559', LOC]
      },
      {
        id: 'realmedia', name: 'RealMedia', art: 'video', endungen: ['rm', 'rmvb'],
        signaturen: [{ offset: 0, hex: '2E524D46' }],
        kriterien: k([2, 2], [2, 2], [2, 2], [1, 2]),
        grund: 'Herstellerformat der frühen Streaming-Zeit, Player gibt es kaum noch.',
        ziel: 'jetzt umwandeln: MP4 mit H.264 und AAC',
        quellen: [LOC]
      },
      {
        id: 'flv', name: 'Flash Video (FLV)', art: 'video', endungen: ['flv'],
        signaturen: [{ offset: 0, hex: '464C56' }],
        kriterien: k([1, 1], [2, 2], [2, 2], [0, 1]),
        grund: 'Flash ist seit 2020 abgeschaltet, Abspieler gibt es nur noch als Nachbau.',
        ziel: 'MP4 mit H.264 und AAC',
        quellen: [LOC]
      },
      {
        id: 'swf', name: 'Flash (SWF)', art: 'video', endungen: ['swf'],
        signaturen: [{ offset: 0, hex: '465753|435753|5A5753' }],
        kriterien: k([1, 1], [2, 2], [2, 2], [1, 2]),
        grund: 'Flash ist seit 2020 abgeschaltet, Inhalte laufen nur noch in Nachbauten.',
        ziel: 'jetzt sichern: als Video aufnehmen oder Inhalte einzeln exportieren',
        quellen: [LOC]
      },
      {
        id: 'rar', name: 'RAR-Archiv', art: 'archiv', endungen: ['rar'],
        signaturen: [{ offset: 0, hex: '526172211A07' }],
        kriterien: k([1, 1], [2, 2], [0, 1], [1, 1]),
        grund: 'Herstellerformat, Entpacken geht frei, Packen nur mit dem Originalprogramm.',
        ziel: 'ZIP oder 7z',
        quellen: ['x-fmt/264', LOC]
      },
      {
        id: '7z', name: '7z-Archiv', art: 'archiv', endungen: ['7z'],
        signaturen: [{ offset: 0, hex: '377ABCAF271C' }],
        kriterien: k([0, 0], [2, 2], [1, 1], [0, 1]),
        grund: 'Offen und frei, aber ohne Norm und mit wenigen unabhängigen Umsetzungen.',
        ziel: 'behalten oder ZIP',
        quellen: ['fmt/484', LOC]
      },

      // Text zuletzt: gültiges UTF-8 ohne NUL in den ersten 512 Byte
      {
        id: 'html', name: 'HTML', art: 'dokument', endungen: ['html', 'htm', 'xhtml'],
        text: true, ext_pflicht: true,
        kriterien: k([0, 0], [0, 0], [0, 0], [0, 1]),
        grund: 'Offene W3C-Norm, lesbar mit jedem Editor. Eingebundene Bilder und Skripte prüft welk. nicht.',
        ziel: 'behalten, zusätzlich PDF/A für die Optik',
        quellen: ['fmt/96', 'WHATWG HTML Living Standard', LOC]
      },
      {
        id: 'text-utf8', name: 'Text (UTF-8)', art: 'dokument',
        endungen: ['txt', 'text', 'md', 'csv', 'tsv', 'log', 'json', 'xml', 'ini'],
        text: true,
        kriterien: k([0, 0], [0, 0], [0, 0], [0, 0]),
        grund: 'Klartext ist das haltbarste Format, das es gibt.',
        ziel: 'behalten',
        quellen: ['x-fmt/111', 'RFC 3629', LOC_RFS]
      }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = tabelle;
  else wurzel.WELK_TABELLE = tabelle;
})(typeof globalThis !== 'undefined' ? globalThis : this);
