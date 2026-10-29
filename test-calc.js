// Tests für welk. Aufruf: node test-calc.js (oder node --test)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const welk = require('./welk.js');
const tabelle = require('./tabelle.js');
const vektoren = JSON.parse(fs.readFileSync(path.join(__dirname, 'testvektoren.json'), 'utf8'));
const hex = welk.hexZuBytes;

test('Scope 1: urlaub.jpg ist JPEG, [0, 1], grün', () => {
  const e = welk.pruefe(hex('FFD8FFE000104A464946'), 'urlaub.jpg', 2400000, 'urlaub.jpg');
  assert.equal(e.format, 'jpeg');
  assert.equal(e.hinweis, null);
  assert.deepEqual(e.risiko, [0, 1]);
  assert.equal(e.ampel, 'gruen');
});

test('Scope 2: brief.doc ist doc-binaer, [5, 8], gelb, Ziel stimmt', () => {
  const e = welk.pruefe(hex('D0CF11E0A1B11AE1'), 'brief.doc');
  assert.equal(e.format, 'doc-binaer');
  assert.deepEqual(e.risiko, [5, 8]);
  assert.equal(e.ampel, 'gelb');
  assert.equal(welk.formatVon('doc-binaer').ziel, 'PDF/A zum Aufheben, ODT oder DOCX zum Weiterbearbeiten');
});

test('Scope 3: film.rm ist RealMedia, [9, 10], rot', () => {
  const e = welk.pruefe(hex('2E524D46'), 'film.rm');
  assert.equal(e.format, 'realmedia');
  assert.deepEqual(e.risiko, [9, 10]);
  assert.equal(e.ampel, 'rot');
});

test('Scope 4: foto.jpg mit PNG-Inhalt', () => {
  assert.deepEqual(welk.erkenne(hex('89504E470D0A1A0A'), 'foto.jpg'), { id: 'png', hinweis: 'endung passt nicht' });
});

test('Scope 5: Ordner ergibt 25 % bis 75 %', () => {
  const liste = [
    welk.pruefe(hex('FFD8FFE0'), 'urlaub.jpg', 2400000),
    welk.pruefe(hex('D0CF11E0A1B11AE1'), 'brief.doc', 48000),
    welk.pruefe(hex('2E524D46'), 'film.rm', 9000000),
    welk.pruefe(hex('00010203'), 'notiz.xyz', 4)
  ];
  assert.equal(liste[3].format, 'unbekannt');
  assert.deepEqual(liste[3].risiko, [2, 10]);
  const s = welk.summe(liste);
  assert.equal(s.gruen.dateien, 1);
  assert.equal(s.gelb.dateien, 2);
  assert.equal(s.rot.dateien, 1);
  assert.equal(s.gefaehrdet_sicher, 1);
  assert.equal(s.gefaehrdet_hoechstens, 3);
  assert.deepEqual(s.anteil, [25, 75]);
});

test('Testvektoren: Erkennung', () => {
  for (const v of vektoren.erkennung) {
    const e = welk.erkenne(hex(v.kopf), v.name);
    assert.deepEqual(e, { id: v.id, hinweis: v.hinweis }, v.name + ' (' + (v.notiz || '') + ')');
    if (v.risiko) {
      const f = welk.formatVon(v.id);
      const r = welk.risiko(f ? f.kriterien : null);
      assert.deepEqual(r, v.risiko, v.name);
      assert.equal(welk.ampel(r), v.ampel, v.name);
    }
  }
});

test('Testvektoren: jedes Format der Tabelle hat eine saubere Mindest-Signatur', () => {
  for (const f of tabelle.formate) {
    const treffer = vektoren.erkennung.filter((v) => v.id === f.id && v.hinweis === null);
    assert.ok(treffer.length > 0, 'kein Vektor für ' + f.id);
  }
});

test('Testvektoren: Risiko und Ampel', () => {
  for (const v of vektoren.risiko) {
    const r = welk.risiko(v.kriterien);
    assert.deepEqual(r, v.risiko, v.notiz);
    assert.equal(welk.ampel(r), v.ampel, v.notiz);
  }
});

test('Testvektoren: Summe', () => {
  for (const v of vektoren.summe) {
    assert.deepEqual(welk.summe(v.dateien), v.erwartet, v.notiz);
  }
});

test('rund: .5 wird aufgerundet', () => {
  assert.equal(welk.rund(1.25), 1);
  assert.equal(welk.rund(2.5), 3);
  assert.equal(welk.rund(7.5), 8);
  assert.equal(welk.rund(8.75), 9);
  for (let s = 0; s <= 8; s++) {
    const k = { offen: [0, 0], norm: [0, 0], verbreitung: [0, 0], vielfalt: [0, 0] };
    let rest = s;
    for (const name of welk.KRITERIEN) { const x = Math.min(2, rest); k[name] = [x, x]; rest -= x; }
    assert.deepEqual(welk.risiko(k), [welk.rund(10 * s / 8), welk.rund(10 * s / 8)], 'S=' + s);
  }
});

test('ampel: Grenzen 3 und 6', () => {
  assert.equal(welk.ampel([0, 3]), 'gruen');
  assert.equal(welk.ampel([0, 4]), 'gelb');
  assert.equal(welk.ampel([5, 10]), 'gelb');
  assert.equal(welk.ampel([6, 6]), 'rot');
  assert.equal(welk.ampel([2, 10]), 'gelb');
});

test('Tabelle: Formprüfung ohne Fehler', () => {
  assert.deepEqual(welk.pruefeTabelle(tabelle), []);
  assert.equal(tabelle.version, 'welk-tabelle/1');
  assert.match(tabelle.stand, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(tabelle.formate.length >= 35, 'rund 35 Formate');
  const ids = new Set(tabelle.formate.map((f) => f.id));
  assert.equal(ids.size, tabelle.formate.length);
  for (const f of tabelle.formate) {
    assert.ok(f.quellen.length >= 1, f.id);
    for (const k of welk.KRITERIEN) {
      const [a, b] = f.kriterien[k];
      assert.ok(a >= 0 && b <= 2 && a <= b, f.id + ' ' + k);
    }
  }
});

test('Tabelle: Formprüfung findet Fehler', () => {
  const kaputt = JSON.parse(JSON.stringify(tabelle));
  kaputt.formate[0].kriterien.offen = [2, 1];
  kaputt.formate[1].id = kaputt.formate[0].id;
  kaputt.formate[2].quellen = [];
  kaputt.stand = '';
  const fehler = welk.pruefeTabelle(kaputt);
  assert.ok(fehler.includes('stand'));
  assert.ok(fehler.some((f) => f.includes('kriterium offen')));
  assert.ok(fehler.some((f) => f.includes('id doppelt')));
  assert.ok(fehler.some((f) => f.includes('quellen')));
});

test('endung', () => {
  assert.equal(welk.endung('ordner/Urlaub.JPG'), 'jpg');
  assert.equal(welk.endung('a.b/README'), '');
  assert.equal(welk.endung('.profil'), '');
  assert.equal(welk.endung('archiv.tar.gz'), 'gz');
});

test('Kopf länger als 512 Byte wird abgeschnitten', () => {
  const k = new Uint8Array(2000).fill(0x61);
  k[1000] = 0;
  assert.deepEqual(welk.erkenne(k, 'lang.txt'), { id: 'text-utf8', hinweis: null });
});

test('gruppen: rot zuerst, dann gelb, dann grün', () => {
  const liste = [
    welk.pruefe(hex('FFD8FF'), 'a.jpg', 10),
    welk.pruefe(hex('FFD8FF'), 'b.jpg', 20),
    welk.pruefe(hex('D0CF11E0A1B11AE1'), 'c.doc', 5),
    welk.pruefe(hex('2E524D46'), 'd.rm', 7)
  ];
  const g = welk.gruppen(liste);
  assert.deepEqual(g.map((x) => x.id), ['realmedia', 'doc-binaer', 'jpeg']);
  assert.equal(g[2].dateien, 2);
  assert.equal(g[2].bytes, 30);
});

test('Bericht welk-bericht/1 und CSV', () => {
  const liste = [
    welk.pruefe(hex('FFD8FF'), 'urlaub.jpg', 2400000, 'fotos/urlaub.jpg'),
    welk.pruefe(hex('89504E470D0A1A0A'), 'x.jpg', 12, 'fotos/x;"y".jpg'),
    welk.pruefe(hex('00'), '=summe.xyz', 1, '=summe.xyz')
  ];
  const b = welk.bericht(liste, tabelle, '2026-10-29T12:00:00.000Z');
  assert.equal(b.version, 'welk-bericht/1');
  assert.equal(b.tabelle_stand, tabelle.stand);
  assert.equal(b.erstellt, '2026-10-29T12:00:00.000Z');
  assert.deepEqual(Object.keys(b.dateien[0]), ['pfad', 'groesse', 'format', 'risiko', 'ampel', 'hinweis']);
  assert.equal(b.summe.dateien, 3);
  const c = welk.csv(b);
  const zeilen = c.replace(/^﻿/, '').split('\r\n');
  assert.ok(c.startsWith('﻿'));
  assert.equal(zeilen[0], 'pfad;groesse;format;risiko_min;risiko_max;ampel;hinweis');
  assert.equal(zeilen[1], 'fotos/urlaub.jpg;2400000;jpeg;0;1;gruen;');
  assert.equal(zeilen[2], '"fotos/x;""y"".jpg";12;png;0;0;gruen;endung passt nicht');
  assert.equal(zeilen[3], "'=summe.xyz;1;unbekannt;2;10;gelb;");
  assert.equal(zeilen[4], '');
});

test('Browser: welk.js und tabelle.js laufen ohne module', () => {
  const ctx = { Uint8Array, WeakMap, Math, String, Number, Array, JSON, Date, Error };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'tabelle.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'welk.js'), 'utf8'), ctx);
  assert.equal(ctx.WELK_TABELLE.version, 'welk-tabelle/1');
  const e = vm.runInContext("welk.erkenne(new Uint8Array([0x2E,0x52,0x4D,0x46]), 'film.rm')", ctx);
  assert.equal(e.id, 'realmedia');
});
