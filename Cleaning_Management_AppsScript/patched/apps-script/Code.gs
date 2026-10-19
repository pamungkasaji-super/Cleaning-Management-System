/**
 * Cleaning Management System - Backend Apps Script
 * Penyimpanan data: Google Spreadsheet (4 sheet) + foto di Google Drive.
 *
 * Cara pakai: tempel file ini ke Extensions > Apps Script pada spreadsheet
 * "Database Cleaning Management", isi GOOGLE_CLIENT_ID & ADMIN_EMAILS, jalankan setup() sekali,
 * lalu Deploy > New deployment > Web app.
 */

// ====================== KONFIGURASI ======================
const CONFIG = {
  // Client ID OAuth dari Google Cloud Console (Credentials > OAuth client ID > Web application).
  // Nilai yang sama dipasang di .env frontend sebagai VITE_GOOGLE_CLIENT_ID.
  GOOGLE_CLIENT_ID: 'GANTI_DENGAN_CLIENT_ID.apps.googleusercontent.com',

  // Email admin awal. setup() mendaftarkannya otomatis ke sheet "Pengguna" sebagai admin.
  ADMIN_EMAILS: ['emailkamu@gmail.com'],

  SESSION_DAYS: 7, // lama sesi login sebelum harus masuk lagi

  // Folder Drive untuk foto. Diisi ID folder yang sudah kamu pakai di prototype.
  // Kosongkan ('') jika ingin dibuatkan otomatis oleh setup().
  FOLDER_BEFORE_ID: '17hYRKXzGyGKj00geW94sbdg2SJBs--Rp',
  FOLDER_AFTER_ID: '1sOdXFNS6pVqhYzKZNmjqT_7loNHtwCVo',

  // true  = file foto dibuat "siapa saja dengan link bisa melihat" supaya tampil di aplikasi.
  // false = foto privat (tidak akan tampil di <img> aplikasi).
  PUBLIC_PHOTOS: true,

  MAX_UPLOAD_BYTES: 8 * 1024 * 1024, // batas ukuran foto setelah decode
};

// Skema kolom per sheet. Urutan kolom di sheet mengikuti header baris 1 (bukan urutan ini),
// jadi kamu boleh menambah kolom manual di sheet.
// Tipe: s = teks, n = angka, b = boolean, j = JSON (array/objek)
const META = { id: 's', created_date: 's', updated_date: 's', created_by_id: 's', is_sample: 'b' };

const SCHEMA = {
  Pengguna: {
    fields: { email: 's', nama: 's', role: 's', petugas_kode: 's', aktif: 'b' },
    defaults: { role: 'user', aktif: true },
  },
  Petugas: {
    fields: { kode: 's', nama: 's', username: 's', role: 's', aktif: 'b', has_special_task: 'b' },
    defaults: { role: 'OB', aktif: true, has_special_task: false },
  },
  ShiftLog: {
    fields: {
      shift_id: 's', tanggal: 's', petugas_kode: 's', petugas_nama: 's', shift: 'n',
      shift_label: 's', login: 's', logout: 's', total_task: 'n', done_task: 'n', status: 's',
    },
    defaults: { status: 'OPEN' },
  },
  ShiftSchedule: {
    fields: {
      shift: 'n', start_window: 's', end_window: 's', judul: 's', fokus_area: 's', prinsip: 's',
      detail: 'j', catatan_khusus: 's', urutan: 'n', is_break: 'b', is_special: 'b',
      is_periodic: 'b', petugas_kode: 's', aktif: 'b',
    },
    defaults: { is_break: false, is_special: false, is_periodic: false, aktif: true },
  },
  Transaksi: {
    fields: {
      transaction_id: 's', tanggal: 's', petugas_kode: 's', petugas_nama: 's', shift: 'n',
      shift_label: 's', schedule_id: 's', judul: 's', start_window: 's', end_window: 's',
      status: 's', hasil_checklist: 'j', foto_before: 'j', foto_after: 'j', catatan: 's',
      jam_mulai: 's', jam_selesai: 's',
    },
    defaults: { status: 'BELUM' },
  },
};

// ====================== SETUP (jalankan sekali) ======================
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (name) {
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    const cols = Object.keys(Object.assign({}, SCHEMA[name].fields, META));
    const lastCol = sheet.getLastColumn();
    const existing = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
    // tambahkan kolom yang belum ada, tanpa menghapus kolom yang sudah ada
    cols.forEach(function (c) {
      if (existing.indexOf(c) === -1) {
        existing.push(c);
        sheet.getRange(1, existing.length).setValue(c);
      }
    });
    sheet.getRange(1, 1, 1, existing.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    // semua kolom berformat teks agar "07:00" dan "2026-10-06" tidak diubah Sheets
    sheet.getRange(1, 1, sheet.getMaxRows(), existing.length).setNumberFormat('@');
  });

  const props = PropertiesService.getScriptProperties();
  if (!CONFIG.FOLDER_BEFORE_ID) {
    props.setProperty('FOLDER_BEFORE_ID', DriveApp.createFolder('Cleaning - Foto Before').getId());
  }
  if (!CONFIG.FOLDER_AFTER_ID) {
    props.setProperty('FOLDER_AFTER_ID', DriveApp.createFolder('Cleaning - Foto After').getId());
  }
  // Admin awal + kunci penandatangan sesi
  getSecret_();
  CONFIG.ADMIN_EMAILS.forEach(function (email) {
    const e = String(email).trim().toLowerCase();
    if (e && !findUserByEmail_(e)) createRow_('Pengguna', { email: e, role: 'admin' });
  });
  // Memicu dialog izin Drive + Spreadsheet + akses URL eksternal
  UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=test', { muteHttpExceptions: true });
  getFolder_('before');
  getFolder_('after');
  Logger.log('Setup selesai. Spreadsheet: ' + ss.getUrl());
}

// ====================== ENTRY POINT WEB APP ======================
function doGet() {
  return json_({ ok: true, service: 'cleaning-management-api' });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.action === 'login') {
      return json_({ ok: true, data: withLock_(function () { return login_(req.idToken); }) });
    }

    const user = authenticate_(req.token);
    const write = ['create', 'update', 'delete', 'upload', 'updateMe'].indexOf(req.action) !== -1;
    const run = function () { return route_(req, user); };
    return json_({ ok: true, data: write ? withLock_(run) : run() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err), code: (err && err.code) || 'ERROR' });
  }
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function fail_(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

// Entitas yang hanya boleh diubah admin
const ADMIN_WRITE = ['Petugas', 'ShiftSchedule'];

function route_(req, user) {
  if (req.action === 'me') return publicUser_(user);
  if (req.action === 'updateMe') return updateMe_(user, req.data || {});
  if (req.action === 'upload') return uploadPhoto_(req.data || {});

  if (req.entity === 'Pengguna') throw fail_('FORBIDDEN', 'Data pengguna hanya dikelola lewat Spreadsheet');
  const isWrite = ['create', 'update', 'delete'].indexOf(req.action) !== -1;
  if (isWrite && user.role !== 'admin' && (req.action === 'delete' || ADMIN_WRITE.indexOf(req.entity) !== -1)) {
    throw fail_('FORBIDDEN', 'Aksi ini hanya untuk admin');
  }

  switch (req.action) {
    case 'list':   return listRows_(req.entity, null, req.sort, req.limit);
    case 'filter': return listRows_(req.entity, req.query || {}, req.sort, req.limit);
    case 'get':    return getRow_(req.entity, req.id);
    case 'create': return createRow_(req.entity, req.data || {});
    case 'update': return updateRow_(req.entity, req.id, req.data || {});
    case 'delete': return deleteRow_(req.entity, req.id);
    default: throw fail_('ERROR', 'Aksi tidak dikenal: ' + req.action);
  }
}

// ====================== LOGIN GOOGLE & SESI ======================
function b64_(x) { return Utilities.base64EncodeWebSafe(x).replace(/=+$/, ''); }

function getSecret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('SESSION_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SESSION_SECRET', secret);
  }
  return secret;
}

function sign_(body) {
  return b64_(Utilities.computeHmacSha256Signature(body, getSecret_()));
}

function issueToken_(email) {
  const body = b64_(JSON.stringify({ e: email, exp: Date.now() + CONFIG.SESSION_DAYS * 86400000 }));
  return body + '.' + sign_(body);
}

function authenticate_(token) {
  const bad = fail_('UNAUTHORIZED', 'Sesi tidak valid atau sudah berakhir. Silakan masuk lagi.');
  if (!token || typeof token !== 'string' || token.split('.').length !== 2) throw bad;
  const parts = token.split('.');
  const expected = sign_(parts[0]);
  // pembandingan tanpa short-circuit
  let diff = expected.length ^ parts[1].length;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ (parts[1].charCodeAt(i) || 0);
  if (diff !== 0) throw bad;

  let payload;
  try {
    payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  } catch (e) { throw bad; }
  if (!payload || !payload.e || Number(payload.exp) < Date.now()) throw bad;

  const user = findUserByEmail_(payload.e, true);
  if (!user || !user.aktif) throw fail_('NOT_REGISTERED', 'Akun tidak lagi terdaftar atau dinonaktifkan.');
  return user;
}

// Cari pengguna by email. useCache=true dipakai di tiap request (cache 2 menit).
function findUserByEmail_(email, useCache) {
  email = String(email).trim().toLowerCase();
  const cache = CacheService.getScriptCache();
  if (useCache) {
    const hit = cache.get('user:' + email);
    if (hit) return JSON.parse(hit);
  }
  const user = readAll_('Pengguna').rows.filter(function (r) {
    return String(r.email).trim().toLowerCase() === email;
  })[0];
  if (user) {
    const clean = strip_(user);
    clean.email = email;
    if (useCache) cache.put('user:' + email, JSON.stringify(clean), 120);
    return clean;
  }
  return null;
}

function publicUser_(u, extra) {
  return {
    email: u.email, nama: u.nama || (extra && extra.name) || '', role: u.role || 'user',
    petugas_kode: u.petugas_kode || '', picture: (extra && extra.picture) || '',
  };
}

function login_(idToken) {
  if (!CONFIG.GOOGLE_CLIENT_ID || CONFIG.GOOGLE_CLIENT_ID.indexOf('GANTI') === 0) {
    throw fail_('CONFIG', 'GOOGLE_CLIENT_ID belum diisi di Code.gs');
  }
  if (!idToken) throw fail_('UNAUTHORIZED', 'Token Google kosong');

  // Verifikasi tanda tangan & masa berlaku token langsung ke Google
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw fail_('UNAUTHORIZED', 'Token Google tidak valid');
  const p = JSON.parse(res.getContentText());
  if (p.aud !== CONFIG.GOOGLE_CLIENT_ID) throw fail_('UNAUTHORIZED', 'Token bukan untuk aplikasi ini');
  if (['accounts.google.com', 'https://accounts.google.com'].indexOf(p.iss) === -1) throw fail_('UNAUTHORIZED', 'Penerbit token tidak dikenal');
  if (String(p.email_verified) !== 'true') throw fail_('UNAUTHORIZED', 'Email Google belum terverifikasi');
  if (Number(p.exp) * 1000 < Date.now()) throw fail_('UNAUTHORIZED', 'Token Google kedaluwarsa');

  const email = String(p.email).trim().toLowerCase();
  let user = findUserByEmail_(email, false);
  const isBootstrapAdmin = CONFIG.ADMIN_EMAILS.some(function (a) { return String(a).trim().toLowerCase() === email; });
  if (!user && isBootstrapAdmin) {
    user = createRow_('Pengguna', { email: email, nama: p.name || '', role: 'admin' });
  }
  if (!user || !user.aktif) {
    throw fail_('NOT_REGISTERED', 'Email ' + email + ' belum terdaftar. Hubungi admin untuk didaftarkan.');
  }
  CacheService.getScriptCache().remove('user:' + email);
  return { token: issueToken_(email), user: publicUser_(user, p) };
}

function updateMe_(user, data) {
  const all = readAll_('Pengguna');
  const found = all.rows.filter(function (r) { return String(r.email).trim().toLowerCase() === user.email; })[0];
  if (!found) throw fail_('NOT_REGISTERED', 'Akun tidak ditemukan');
  const patch = {};
  if (data.petugas_kode !== undefined) patch.petugas_kode = String(data.petugas_kode);
  if (!found.id) patch.id = Utilities.getUuid().replace(/-/g, '').slice(0, 24);
  const rec = writeRow_(all, found, patch, typesOf_('Pengguna'), true);
  CacheService.getScriptCache().remove('user:' + user.email);
  return publicUser_(rec);
}

// ====================== LOGIKA CRUD ======================
function sheetOf_(entity) {
  if (!SCHEMA[entity]) throw new Error('Entitas tidak dikenal: ' + entity);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(entity);
  if (!sheet) throw new Error('Sheet "' + entity + '" tidak ada. Jalankan setup().');
  return sheet;
}

function typesOf_(entity) {
  return Object.assign({}, SCHEMA[entity].fields, META);
}

// Membaca seluruh sheet -> { headers, rows: [{...obj, __row}] }
function readAll_(entity) {
  const sheet = sheetOf_(entity);
  const types = typesOf_(entity);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return { sheet: sheet, headers: [], rows: [] };
  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(String);
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (r.every(function (v) { return v === '' || v === null; })) continue;
    const obj = { __row: i + 1 };
    headers.forEach(function (h, c) {
      if (h) obj[h] = decode_(r[c], types[h] || 's', h);
    });
    rows.push(obj);
  }
  return { sheet: sheet, headers: headers, rows: rows };
}

function listRows_(entity, query, sort, limit) {
  let rows = readAll_(entity).rows;
  if (query) {
    rows = rows.filter(function (r) {
      return Object.keys(query).every(function (k) { return looseEq_(r[k], query[k]); });
    });
  }
  if (sort) {
    const desc = sort.charAt(0) === '-';
    const f = desc ? sort.slice(1) : sort;
    rows.sort(function (a, b) {
      const x = a[f], y = b[f];
      const cmp = (typeof x === 'number' && typeof y === 'number')
        ? x - y : String(x == null ? '' : x).localeCompare(String(y == null ? '' : y));
      return desc ? -cmp : cmp;
    });
  }
  if (limit) rows = rows.slice(0, Number(limit));
  return rows.map(strip_);
}

function getRow_(entity, id) {
  const found = readAll_(entity).rows.filter(function (r) { return r.id === id; })[0];
  if (!found) throw new Error(entity + ' dengan id ' + id + ' tidak ditemukan');
  return strip_(found);
}

function createRow_(entity, data) {
  const all = readAll_(entity);
  const types = typesOf_(entity);
  const now = new Date().toISOString();
  const rec = Object.assign({}, SCHEMA[entity].defaults, data, {
    id: Utilities.getUuid().replace(/-/g, '').slice(0, 24),
    created_date: now,
    updated_date: now,
    is_sample: false,
  });
  const out = all.headers.map(function (h) { return encode_(rec[h], types[h] || 's'); });
  const rowIdx = Math.max(all.sheet.getLastRow(), 1) + 1;
  all.sheet.getRange(rowIdx, 1, 1, out.length).setNumberFormat('@').setValues([out]);
  return strip_(Object.assign({ __row: rowIdx }, rec));
}

function writeRow_(all, found, patch, types, keepDate) {
  const rec = Object.assign({}, found, patch);
  if (!keepDate) rec.updated_date = new Date().toISOString();
  const out = all.headers.map(function (h) { return encode_(rec[h], types[h] || 's'); });
  all.sheet.getRange(found.__row, 1, 1, out.length).setNumberFormat('@').setValues([out]);
  return strip_(rec);
}

function updateRow_(entity, id, data, keepDate) {
  const all = readAll_(entity);
  const found = all.rows.filter(function (r) { return r.id === id; })[0];
  if (!found) throw new Error(entity + ' dengan id ' + id + ' tidak ditemukan');
  return writeRow_(all, found, Object.assign({}, data, { id: id }), typesOf_(entity), keepDate);
}

function deleteRow_(entity, id) {
  const all = readAll_(entity);
  const found = all.rows.filter(function (r) { return r.id === id; })[0];
  if (!found) throw new Error(entity + ' dengan id ' + id + ' tidak ditemukan');
  all.sheet.deleteRow(found.__row);
  return { id: id, deleted: true };
}

function strip_(r) {
  const c = Object.assign({}, r);
  delete c.__row;
  return c;
}

// ====================== KONVERSI TIPE ======================
// Sheet menyimpan semuanya sebagai teks; di sini dikembalikan ke tipe aslinya.
function decode_(v, type, header) {
  if (v === '' || v === null || v === undefined) {
    if (type === 'j') return [];
    if (type === 'n') return null;
    if (type === 'b') return false;
    return '';
  }
  // Jika seseorang mengetik manual dan Sheets mengubahnya jadi Date/Time
  if (v instanceof Date) {
    const tz = Session.getScriptTimeZone();
    if (header === 'tanggal') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    if (/_window$/.test(header)) return Utilities.formatDate(v, tz, 'HH:mm');
    return v.toISOString();
  }
  switch (type) {
    case 'n': { const n = Number(v); return isNaN(n) ? null : n; }
    case 'b': return v === true || String(v).toLowerCase() === 'true';
    case 'j': {
      if (typeof v !== 'string') return v;
      try { return JSON.parse(v); } catch (e) { return []; }
    }
    default:  return String(v);
  }
}

function encode_(v, type) {
  if (v === undefined || v === null) return '';
  switch (type) {
    case 'j': return JSON.stringify(v);
    case 'b': return v ? 'true' : 'false';
    default:  return String(v);
  }
}

// Perbandingan longgar untuk filter: angka "1" == 1, boolean "true" == true.
function looseEq_(a, b) {
  if (typeof a === 'boolean' || typeof b === 'boolean') return String(a) === String(b);
  if (a === null || a === undefined) a = '';
  if (b === null || b === undefined) b = '';
  return String(a) === String(b);
}

// ====================== UPLOAD FOTO KE DRIVE ======================
function getFolder_(which) {
  const props = PropertiesService.getScriptProperties();
  const id = which === 'before'
    ? (CONFIG.FOLDER_BEFORE_ID || props.getProperty('FOLDER_BEFORE_ID'))
    : (CONFIG.FOLDER_AFTER_ID || props.getProperty('FOLDER_AFTER_ID'));
  if (!id) throw new Error('Folder Drive belum diatur. Jalankan setup().');
  return DriveApp.getFolderById(id);
}

function uploadPhoto_(d) {
  if (['before', 'after'].indexOf(d.folder) === -1) throw new Error('Folder harus "before" atau "after"');
  if (!d.base64) throw new Error('Data foto kosong');
  const mime = /^image\//.test(d.mimeType || '') ? d.mimeType : 'image/jpeg';
  const bytes = Utilities.base64Decode(d.base64);
  if (bytes.length > CONFIG.MAX_UPLOAD_BYTES) throw new Error('Ukuran foto terlalu besar');

  const safeName = String(d.filename || ('foto-' + d.folder + '.jpg')).replace(/[\\/:*?"<>|]/g, '_');
  const name = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '_' + safeName;
  const file = getFolder_(d.folder).createFile(Utilities.newBlob(bytes, mime, name));
  if (CONFIG.PUBLIC_PHOTOS) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    file_id: file.getId(),
    file_url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200',
    drive_link: file.getUrl(),
  };
}

// ====================== UTIL ======================
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


// ====================== MIGRASI FOTO LAMA (Base44 -> Drive) ======================
// Jalankan dari editor Apps Script, BUKAN dari aplikasi.
// 1) previewOldPhotos()  : hanya menghitung, tidak mengubah apa pun.
// 2) migrateOldPhotos()  : mengunduh tiap foto lama, menyimpannya ke folder Before/After,
//                          lalu mengganti URL di kolom foto_before / foto_after.
// Aman dijalankan berulang: foto yang sudah di Drive dilewati, URL yang gagal diunduh dibiarkan
// apa adanya. Berhenti otomatis sebelum batas waktu 6 menit; jalankan lagi bila masih ada sisa.

function isOldPhotoUrl_(u) {
  return typeof u === 'string' && /^https?:\/\//.test(u) && u.indexOf('drive.google.com') === -1;
}

function previewOldPhotos() {
  const rows = readAll_('Transaksi').rows;
  let rowsAffected = 0, photos = 0;
  rows.forEach(function (r) {
    const n = (r.foto_before || []).concat(r.foto_after || []).filter(isOldPhotoUrl_).length;
    if (n) { rowsAffected++; photos += n; }
  });
  Logger.log('Baris Transaksi terdampak: ' + rowsAffected + ' | Foto yang perlu dipindah: ' + photos);
}

function copyPhotoToDrive_(url, which) {
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() !== 200) throw new Error('HTTP ' + res.getResponseCode());
  const blob = res.getBlob();
  const mime = blob.getContentType() || 'image/jpeg';
  if (!/^image\//.test(mime)) throw new Error('Bukan gambar (' + mime + ')');
  const base = decodeURIComponent(url.split('?')[0].split('/').pop() || 'foto.jpg').replace(/[\\/:*?"<>|]/g, '_');
  blob.setName('migrasi_' + base);
  const file = getFolder_(which).createFile(blob);
  if (CONFIG.PUBLIC_PHOTOS) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200';
}

function migrateOldPhotos() {
  const started = Date.now();
  const BUDGET_MS = 4.5 * 60 * 1000;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rows = readAll_('Transaksi').rows;
    const done = {};
    let migrated = 0, failed = 0, remaining = 0, stopped = false;

    rows.forEach(function (row) {
      const patch = {};
      let changed = false;
      [['foto_before', 'before'], ['foto_after', 'after']].forEach(function (pair) {
        const field = pair[0], which = pair[1];
        patch[field] = (row[field] || []).map(function (u) {
          if (!isOldPhotoUrl_(u)) return u;
          if (stopped || Date.now() - started > BUDGET_MS) { stopped = true; remaining++; return u; }
          const key = which + '|' + u;
          if (done[key]) { changed = true; return done[key]; }
          try {
            done[key] = copyPhotoToDrive_(u, which);
            migrated++; changed = true;
            return done[key];
          } catch (e) {
            failed++;
            Logger.log('GAGAL [' + row.id + '] ' + u + ' -> ' + e.message);
            return u;
          }
        });
      });
      if (changed) updateRow_('Transaksi', row.id, patch, true);
    });

    Logger.log('Selesai. Dipindah: ' + migrated + ' | Gagal: ' + failed + ' | Belum diproses: ' + remaining +
      (stopped ? ' (waktu habis, jalankan migrateOldPhotos lagi)' : ''));
  } finally {
    lock.releaseLock();
  }
}
