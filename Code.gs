/**
 * Backend de "Entrenamientos de Fútbol" sobre Google Sheets.
 * Pegar en la planilla: Extensiones > Apps Script. Ejecutar setup() una vez
 * e implementar como "Aplicación web" (ver README).
 */

// PIN del entrenador: quien lo tenga puede cargar y editar. Cambialo.
const PIN = "1234";

const TABS = {
  Config:     ["clave", "valor"],
  Jugadores:  ["id", "nombre", "posicion"],
  Ejercicios: ["id", "nombre", "categoria", "duracion", "nivel", "descripcion"],
  Sesiones:   ["id", "fecha", "hora", "titulo", "tipo", "jugadores", "registrada", "notas"],
  Plan:       ["sesion_id", "orden", "ejercicio_id", "ejercicio", "minutos"],
  Registros:  ["sesion_id", "fecha", "jugador_id", "jugador", "presente", "rpe", "valoracion", "nota"]
};

/** Ejecutar una vez: crea las pestañas con sus encabezados. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(TABS).forEach(function (name) {
    const h = TABS[name];
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange("A:Z").setNumberFormat("@"); // todo como texto: evita que Sheets convierta fechas/horas
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight("bold").setBackground("#e9f5ee");
    sh.setFrozenRows(1);
  });
  ["Hoja 1", "Sheet1", "Hoja1"].forEach(function (n) {
    const s = ss.getSheetByName(n);
    if (s && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  const c = readConfig_();
  if (!c.version) writeConfig_({ dias: "2,4", duracion: "90", hora: "19:00", version: "0" });
}

/* ------------------ API ------------------ */

function doGet() {
  return json_({ ok: true, state: readState_() });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "bad_request" }); }
  if (String(body.pin) !== PIN) return json_({ ok: false, error: "pin" });
  if (body.action === "check") return json_({ ok: true });
  if (body.action !== "save" || !body.state) return json_({ ok: false, error: "bad_request" });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cur = Number(readConfig_().version || 0);
    if (Number(body.base) !== cur) return json_({ ok: false, error: "conflict", state: readState_() });
    writeState_(body.state, cur + 1);
    return json_({ ok: true, version: cur + 1 });
  } finally {
    lock.releaseLock();
  }
}

/* ------------------ lectura ------------------ */

function readState_() {
  const c = readConfig_();
  const tz = Session.getScriptTimeZone();
  const players = rows_("Jugadores").filter(r => r.nombre).map(r => ({
    id: r.id || newId_(), name: r.nombre, pos: r.posicion || "MED"
  }));
  const exercises = rows_("Ejercicios").filter(r => r.nombre).map(r => ({
    id: r.id || newId_(), name: r.nombre, cat: r.categoria || "Técnica",
    dur: Number(r.duracion) || 10, level: r.nivel || "Todos", desc: r.descripcion || ""
  }));
  const plan = rows_("Plan"), regs = rows_("Registros");
  const sessions = rows_("Sesiones").filter(r => r.id && r.fecha).map(r => {
    const items = plan.filter(p => p.sesion_id === r.id)
      .sort((a, b) => Number(a.orden) - Number(b.orden))
      .map(p => ({ exId: p.ejercicio_id, min: Number(p.minutos) || 0 }));
    const logs = {};
    regs.filter(g => g.sesion_id === r.id).forEach(g => {
      logs[g.jugador_id] = { att: yes_(g.presente), rpe: Number(g.rpe) || 0, score: Number(g.valoracion) || 0, note: g.nota || "" };
    });
    return {
      id: r.id, date: fmtDate_(r.fecha, tz), time: fmtTime_(r.hora, tz), title: r.titulo || "",
      type: r.tipo === "individual" ? "individual" : "grupal",
      playerIds: String(r.jugadores || "").split(",").map(s => s.trim()).filter(Boolean),
      items: items, done: yes_(r.registrada), notes: r.notas || "", logs: logs
    };
  });
  return {
    version: Number(c.version || 0),
    config: {
      days: String(c.dias || "2,4").split(",").map(Number).filter(n => !isNaN(n)),
      dur: Number(c.duracion) || 90,
      time: fmtTime_(c.hora || "19:00", tz)
    },
    players: players, exercises: exercises, sessions: sessions
  };
}

/* ------------------ escritura ------------------ */

function writeState_(s, version) {
  const exName = {}, plName = {};
  (s.exercises || []).forEach(e => exName[e.id] = e.name);
  (s.players || []).forEach(p => plName[p.id] = p.name);
  const yn = b => (b ? "sí" : "no");

  writeConfig_({
    dias: (s.config.days || []).join(","), duracion: String(s.config.dur), hora: s.config.time, version: String(version)
  });
  write_("Jugadores", (s.players || []).map(p => [p.id, p.name, p.pos]));
  write_("Ejercicios", (s.exercises || []).map(e => [e.id, e.name, e.cat, String(e.dur), e.level || "", e.desc || ""]));
  const ses = (s.sessions || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  write_("Sesiones", ses.map(x => [x.id, x.date, x.time || "", x.title || "", x.type, (x.playerIds || []).join(","), yn(x.done), x.notes || ""]));
  const plan = [], regs = [];
  ses.forEach(x => {
    (x.items || []).forEach((it, i) => plan.push([x.id, String(i + 1), it.exId, exName[it.exId] || "(eliminado)", String(it.min)]));
    if (x.done) Object.keys(x.logs || {}).forEach(pid => {
      const l = x.logs[pid];
      regs.push([x.id, x.date, pid, plName[pid] || "", yn(l.att), String(l.rpe || ""), String(l.score || ""), l.note || ""]);
    });
  });
  write_("Plan", plan);
  write_("Registros", regs);
}

/* ------------------ helpers ------------------ */

function sheet_(name) {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || (setup(), ss.getSheetByName(name));
}

function rows_(name) {
  const sh = sheet_(name);
  const v = sh.getDataRange().getValues();
  const h = TABS[name];
  return v.slice(1).map(row => {
    const o = {};
    h.forEach((k, i) => o[k] = row[i] instanceof Date ? row[i] : String(row[i] == null ? "" : row[i]).trim());
    return o;
  });
}

function write_(name, data) {
  const sh = sheet_(name), w = TABS[name].length;
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, w).clearContent();
  if (data.length) sh.getRange(2, 1, data.length, w).setNumberFormat("@").setValues(data);
}

function readConfig_() {
  const o = {};
  rows_("Config").forEach(r => { if (r.clave) o[r.clave] = r.valor; });
  return o;
}

function writeConfig_(obj) {
  const cur = readConfig_();
  Object.keys(obj).forEach(k => cur[k] = obj[k]);
  write_("Config", Object.keys(cur).map(k => [k, String(cur[k])]));
}

function yes_(v) { return /^(s|si|sí|true|1|x|yes)$/i.test(String(v).trim()); }
function newId_() { return Utilities.getUuid().slice(0, 8); }
function fmtDate_(v, tz) { return v instanceof Date ? Utilities.formatDate(v, tz, "yyyy-MM-dd") : String(v); }
function fmtTime_(v, tz) { return v instanceof Date ? Utilities.formatDate(v, tz, "HH:mm") : String(v); }

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
