/*
 * welk. Kern: reine Funktionen für Erkennung, Risiko, Ampel und Summe.
 * Läuft im Browser (nach tabelle.js als klassisches Script, setzt globalThis.welk)
 * und in Node (require('./welk.js')). Keine Abhängigkeiten.
 * Spezifikation: SPEC.md
 */
(function (wurzel) {
  'use strict';

  var KOPF = 512;
  var UNBEKANNT = 'unbekannt';
  var RISIKO_UNBEKANNT = [2, 10];
  var HINWEIS_NUR_ENDUNG = 'nur endung';
  var HINWEIS_ENDUNG_FALSCH = 'endung passt nicht';

  var standardTabelle = (typeof module !== 'undefined' && module.exports)
    ? require('./tabelle.js')
    : wurzel.WELK_TABELLE;

  /* Dateiendung klein, ohne Punkt. "a/b.tar.GZ" -> "gz", ".profil" -> "", "README" -> "" */
  function endung(name) {
    var s = String(name || '');
    var schnitt = Math.max(s.lastIndexOf('/'), s.lastIndexOf('\\'));
    var basis = s.slice(schnitt + 1);
    var punkt = basis.lastIndexOf('.');
    if (punkt <= 0) return '';
    return basis.slice(punkt + 1).toLowerCase();
  }

  /* "FFD8FF" -> [255,216,255]; "??" steht für ein beliebiges Byte (-1) */
  function hexZuMuster(hex) {
    var h = String(hex).replace(/\s+/g, '');
    if (h.length === 0 || h.length % 2) throw new Error('hex ungültig: ' + hex);
    var out = [];
    for (var i = 0; i < h.length; i += 2) {
      var paar = h.slice(i, i + 2);
      if (paar === '??') { out.push(-1); continue; }
      if (!/^[0-9a-fA-F]{2}$/.test(paar)) throw new Error('hex ungültig: ' + hex);
      out.push(parseInt(paar, 16));
    }
    return out;
  }

  /* Hex-Text ohne Platzhalter zu Uint8Array, für Tests und Beispieldaten */
  function hexZuBytes(hex) {
    if (!hex) return new Uint8Array(0);
    return Uint8Array.from(hexZuMuster(hex).map(function (b) { return b < 0 ? 0 : b; }));
  }

  var zwischenspeicher = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /* Signaturen eines Formats in Muster übersetzen: [[{offset, alternativen:[[bytes]]}]] */
  function muster(format) {
    if (zwischenspeicher && zwischenspeicher.has(format)) return zwischenspeicher.get(format);
    var m = (format.signaturen || []).map(function (s) {
      return {
        offset: s.offset,
        alternativen: String(s.hex).split('|').map(hexZuMuster)
      };
    });
    if (zwischenspeicher) zwischenspeicher.set(format, m);
    return m;
  }

  function passtBytes(kopf, offset, bytes) {
    if (offset + bytes.length > kopf.length) return false;
    for (var i = 0; i < bytes.length; i++) {
      if (bytes[i] >= 0 && kopf[offset + i] !== bytes[i]) return false;
    }
    return true;
  }

  /* Alle Signaturen müssen passen, innerhalb einer Signatur genügt eine Alternative */
  function signaturPasst(kopf, format) {
    var m = muster(format);
    if (m.length === 0) return false;
    for (var i = 0; i < m.length; i++) {
      var ok = false;
      for (var j = 0; j < m[i].alternativen.length && !ok; j++) {
        ok = passtBytes(kopf, m[i].offset, m[i].alternativen[j]);
      }
      if (!ok) return false;
    }
    return true;
  }

  /*
   * Gültiges UTF-8 ohne NUL. Mindestens ein Byte.
   * Eine angeschnittene Sequenz ganz am Ende zählt nur als gültig,
   * wenn das Fenster voll ist (kopf.length >= 512), die Datei also weitergeht.
   */
  function istText(kopf) {
    var n = kopf.length;
    if (n === 0) return false;
    var i = 0;
    while (i < n) {
      var b = kopf[i];
      if (b === 0) return false;
      if (b < 0x80) { i++; continue; }
      var laenge, min;
      if (b >= 0xC2 && b <= 0xDF) { laenge = 2; min = 0x80; }
      else if (b >= 0xE0 && b <= 0xEF) { laenge = 3; min = 0x800; }
      else if (b >= 0xF0 && b <= 0xF4) { laenge = 4; min = 0x10000; }
      else return false;
      var cp = b & (laenge === 2 ? 0x1F : laenge === 3 ? 0x0F : 0x07);
      for (var k = 1; k < laenge; k++) {
        if (i + k >= n) return n >= KOPF; // angeschnitten am Fensterende
        var f = kopf[i + k];
        if ((f & 0xC0) !== 0x80) return false;
        cp = (cp << 6) | (f & 0x3F);
        // frühe Prüfung auf überlange Form und Ersatzzeichen, damit auch angeschnittene Folgen streng sind
        if (k === 1) {
          if (b === 0xE0 && f < 0xA0) return false;
          if (b === 0xED && f > 0x9F) return false;
          if (b === 0xF0 && f < 0x90) return false;
          if (b === 0xF4 && f > 0x8F) return false;
        }
      }
      if (cp < min || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) return false;
      i += laenge;
    }
    return true;
  }

  function formatVon(id, tabelle) {
    var t = tabelle || standardTabelle;
    for (var i = 0; i < t.formate.length; i++) if (t.formate[i].id === id) return t.formate[i];
    return null;
  }

  function formatZurEndung(ext, tabelle) {
    if (!ext) return null;
    for (var i = 0; i < tabelle.formate.length; i++) {
      if (tabelle.formate[i].endungen.indexOf(ext) >= 0) return tabelle.formate[i];
    }
    return null;
  }

  /*
   * erkenne(kopf, name) -> { id, hinweis }
   * hinweis: null | 'nur endung' | 'endung passt nicht'
   */
  function erkenne(kopf, name, tabelle) {
    var t = tabelle || standardTabelle;
    var k = kopf instanceof Uint8Array ? kopf : new Uint8Array(kopf || 0);
    if (k.length > KOPF) k = k.subarray(0, KOPF);
    var ext = endung(name);
    var text = null;
    var treffer = null;

    for (var i = 0; i < t.formate.length && !treffer; i++) {
      var f = t.formate[i];
      var ok;
      if (f.text) {
        if (text === null) text = istText(k);
        ok = text;
      } else {
        ok = signaturPasst(k, f);
      }
      if (ok && f.ext_pflicht && f.endungen.indexOf(ext) < 0) ok = false;
      if (ok) treffer = f;
    }

    var perEndung = formatZurEndung(ext, t);
    if (treffer) {
      var hinweis = null;
      if (perEndung && perEndung !== treffer) hinweis = HINWEIS_ENDUNG_FALSCH;
      return { id: treffer.id, hinweis: hinweis };
    }
    if (perEndung) return { id: perEndung.id, hinweis: HINWEIS_NUR_ENDUNG };
    return { id: UNBEKANNT, hinweis: null };
  }

  /* Auf ganze Zahl, .5 aufrunden. Für x = 10·S/8 ganzzahlig exakt: floor((10·S + 4) / 8) */
  function rund(x) { return Math.floor(x + 0.5); }

  var KRITERIEN = ['offen', 'norm', 'verbreitung', 'vielfalt'];

  /* risiko(kriterien) -> [min, max], ohne Kriterien (unbekannt) fest [2, 10] */
  function risiko(kriterien) {
    if (!kriterien) return RISIKO_UNBEKANNT.slice();
    var sa = 0, sb = 0;
    for (var i = 0; i < KRITERIEN.length; i++) {
      var s = kriterien[KRITERIEN[i]];
      sa += s[0]; sb += s[1];
    }
    return [Math.floor((10 * sa + 4) / 8), Math.floor((10 * sb + 4) / 8)];
  }

  /* ampel([min, max]) -> 'gruen' | 'gelb' | 'rot' */
  function ampel(r) {
    if (r[1] <= 3) return 'gruen';
    if (r[0] >= 6) return 'rot';
    return 'gelb';
  }

  /* Ein Berichtseintrag für eine Datei */
  function pruefe(kopf, name, groesse, pfad, tabelle) {
    var t = tabelle || standardTabelle;
    var e = erkenne(kopf, name, t);
    var f = formatVon(e.id, t);
    var r = risiko(f ? f.kriterien : null);
    return {
      pfad: pfad == null ? String(name) : String(pfad),
      groesse: groesse == null ? (kopf ? kopf.length : 0) : groesse,
      format: e.id,
      risiko: r,
      ampel: ampel(r),
      hinweis: e.hinweis
    };
  }

  /*
   * summe(liste) mit Einträgen { groesse, risiko }:
   * Dateien und Bytes je Ampel, gefährdet sicher (min >= 6), höchstens (max >= 6),
   * Anteil als Spanne in ganzen Prozent (abgerundet, aufgerundet), null bei leerer Liste.
   */
  function summe(liste) {
    var s = {
      dateien: 0, bytes: 0,
      gruen: { dateien: 0, bytes: 0 },
      gelb: { dateien: 0, bytes: 0 },
      rot: { dateien: 0, bytes: 0 },
      gefaehrdet_sicher: 0,
      gefaehrdet_hoechstens: 0,
      anteil: null
    };
    (liste || []).forEach(function (e) {
      var g = Number(e.groesse) || 0;
      var a = e.ampel || ampel(e.risiko);
      s.dateien++; s.bytes += g;
      s[a].dateien++; s[a].bytes += g;
      if (e.risiko[0] >= 6) s.gefaehrdet_sicher++;
      if (e.risiko[1] >= 6) s.gefaehrdet_hoechstens++;
    });
    if (s.dateien > 0) {
      s.anteil = [
        Math.floor(100 * s.gefaehrdet_sicher / s.dateien),
        Math.ceil(100 * s.gefaehrdet_hoechstens / s.dateien)
      ];
    }
    return s;
  }

  var AMPEL_RANG = { rot: 0, gelb: 1, gruen: 2 };

  /* Nach Format gruppieren, rot zuerst, dann höheres Maximum, dann mehr Dateien */
  function gruppen(liste, tabelle) {
    var t = tabelle || standardTabelle;
    var map = {};
    var out = [];
    (liste || []).forEach(function (e) {
      var g = map[e.format];
      if (!g) {
        var f = formatVon(e.format, t);
        g = map[e.format] = {
          id: e.format,
          name: f ? f.name : 'unbekannt',
          risiko: e.risiko,
          ampel: e.ampel,
          grund: f ? f.grund : 'Weder Signatur noch Endung passen zu einem Format der Tabelle.',
          ziel: f ? f.ziel : 'Herkunft klären, im Zweifel mit dem Originalprogramm öffnen und in ein offenes Format umwandeln',
          dateien: 0, bytes: 0, eintraege: []
        };
        out.push(g);
      }
      g.dateien++; g.bytes += Number(e.groesse) || 0;
      g.eintraege.push(e);
    });
    out.sort(function (a, b) {
      return (AMPEL_RANG[a.ampel] - AMPEL_RANG[b.ampel]) ||
        (b.risiko[1] - a.risiko[1]) || (b.risiko[0] - a.risiko[0]) ||
        (b.dateien - a.dateien) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
    return out;
  }

  /* Bericht welk-bericht/1 */
  function bericht(liste, tabelle, erstellt) {
    var t = tabelle || standardTabelle;
    return {
      version: 'welk-bericht/1',
      tabelle_stand: t.stand,
      erstellt: erstellt || new Date().toISOString(),
      dateien: (liste || []).map(function (e) {
        return {
          pfad: e.pfad, groesse: e.groesse, format: e.format,
          risiko: [e.risiko[0], e.risiko[1]], ampel: e.ampel, hinweis: e.hinweis || null
        };
      }),
      summe: summe(liste)
    };
  }

  var CSV_SPALTEN = ['pfad', 'groesse', 'format', 'risiko_min', 'risiko_max', 'ampel', 'hinweis'];

  function csvZelle(v) {
    var s = v == null ? '' : String(v);
    // Formel-Einschleusung in Tabellenprogrammen verhindern
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    if (/[;"\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  /* CSV: UTF-8 mit BOM, Semikolon, CRLF, Kopfzeile wie CSV_SPALTEN */
  function csv(b) {
    var zeilen = [CSV_SPALTEN.join(';')];
    b.dateien.forEach(function (d) {
      zeilen.push([d.pfad, d.groesse, d.format, d.risiko[0], d.risiko[1], d.ampel, d.hinweis]
        .map(csvZelle).join(';'));
    });
    return '﻿' + zeilen.join('\r\n') + '\r\n';
  }

  /* Tabelle auf Formfehler prüfen, gibt Liste von Fehlertexten zurück (leer = gut) */
  function pruefeTabelle(tabelle) {
    var t = tabelle || standardTabelle;
    var fehler = [];
    if (t.version !== 'welk-tabelle/1') fehler.push('version');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.stand || '')) fehler.push('stand');
    var ids = {}, exts = {};
    (t.formate || []).forEach(function (f, i) {
      var wo = f.id || ('#' + i);
      if (!/^[a-z0-9][a-z0-9-]*$/.test(f.id || '') || f.id === UNBEKANNT) fehler.push(wo + ': id');
      if (ids[f.id]) fehler.push(wo + ': id doppelt');
      ids[f.id] = true;
      if (!f.name) fehler.push(wo + ': name');
      if (!Array.isArray(f.endungen)) fehler.push(wo + ': endungen');
      (f.endungen || []).forEach(function (x) {
        if (x !== x.toLowerCase() || x.indexOf('.') >= 0) fehler.push(wo + ': endung ' + x);
        if (exts[x]) fehler.push(wo + ': endung ' + x + ' auch bei ' + exts[x]);
        exts[x] = f.id;
      });
      if (f.ext_pflicht && !(f.endungen || []).length) fehler.push(wo + ': ext_pflicht ohne endungen');
      if (!f.text) {
        if (!Array.isArray(f.signaturen) || !f.signaturen.length) fehler.push(wo + ': signaturen');
        else f.signaturen.forEach(function (s) {
          if (!(s.offset >= 0 && s.offset % 1 === 0)) fehler.push(wo + ': offset');
          try { String(s.hex).split('|').forEach(hexZuMuster); } catch (e) { fehler.push(wo + ': hex'); }
          String(s.hex).split('|').forEach(function (a) {
            if (s.offset + a.length / 2 > KOPF) fehler.push(wo + ': signatur jenseits von 512 byte');
          });
        });
      }
      KRITERIEN.forEach(function (k) {
        var s = f.kriterien && f.kriterien[k];
        if (!Array.isArray(s) || s.length !== 2 ||
          [0, 1, 2].indexOf(s[0]) < 0 || [0, 1, 2].indexOf(s[1]) < 0 || s[0] > s[1]) {
          fehler.push(wo + ': kriterium ' + k);
        }
      });
      if (!f.grund) fehler.push(wo + ': grund');
      if (!f.ziel) fehler.push(wo + ': ziel');
      if (!Array.isArray(f.quellen) || !f.quellen.length) fehler.push(wo + ': quellen');
    });
    return fehler;
  }

  var welk = {
    KOPF: KOPF,
    UNBEKANNT: UNBEKANNT,
    KRITERIEN: KRITERIEN,
    CSV_SPALTEN: CSV_SPALTEN,
    tabelle: standardTabelle,
    endung: endung,
    hexZuBytes: hexZuBytes,
    istText: istText,
    erkenne: erkenne,
    rund: rund,
    risiko: risiko,
    ampel: ampel,
    formatVon: formatVon,
    pruefe: pruefe,
    summe: summe,
    gruppen: gruppen,
    bericht: bericht,
    csv: csv,
    pruefeTabelle: pruefeTabelle
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = welk;
  else wurzel.welk = welk;
})(typeof globalThis !== 'undefined' ? globalThis : this);
