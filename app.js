/* Academic Risk Dashboard — provisional in-browser ONNX demo (no build step).
 *
 * Design: small focused classes (OOP where it helps, plain functions otherwise).
 *  - AppConfig      : model registry, bands, contract constants (single source of truth).
 *  - StatusLog      : user-visible status / error reporting (aria-live panel).
 *  - CsvParser      : dependency-free CSV parsing (quotes, commas, CRLF).
 *  - FeatureMapper  : real-schema header mapping -> 8 model features; tolerant aliases.
 *  - RiskBands      : P(at-risk) -> Low / Medium / High.
 *  - SignalNotes    : heuristic per-row notes, ALWAYS labeled association-only.
 *  - OnnxRunner     : lazy onnxruntime-web sessions (CPU/WASM only), batched inference.
 *  - Charts         : plain-canvas band bar + probability histogram (no dependency).
 *  - ReportExporter : print-friendly page + CSV / JSON downloads, stamped PROVISIONAL.
 *  - DashboardApp   : orchestration + DOM rendering. No data leaves the browser.
 */
(function () {
  "use strict";

  /* ================= AppConfig ================= */
  var AppConfig = {
    ortCdn: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.min.js",
    wasmPaths: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
    models: [
      { id: "decision_tree", file: "./models/decision_tree.onnx", label: "Decision Tree", short: "DT" },
      { id: "random_forest", file: "./models/random_forest.onnx", label: "Random Forest", short: "RF" },
      { id: "logistic_regression", file: "./models/logistic_regression.onnx", label: "Log. Regression", short: "LR" },
      { id: "naive_bayes", file: "./models/naive_bayes.onnx", label: "Naive Bayes", short: "NB" }
    ],
    // Session I/O names (must match onnx_inputs.json session_input_order + outputs).
    inputNames: [
      "GWA", "Number_of_Failed_Courses", "Number_of_Dropped_Courses",
      "Total_Units_Taken", "Year_Level", "Course_Program_Enrolled",
      "Enrollment_History", "Previous_Academic_Standing"
    ],
    outputLabel: "label",
    outputProba: "probabilities",
    atRiskClass: 1,
    bands: [
      { name: "Low", min: 0.0, max: 0.39, css: "band-low" },
      { name: "Medium", min: 0.40, max: 0.69, css: "band-medium" },
      { name: "High", min: 0.70, max: 1.0, css: "band-high" }
    ],
    // In-graph fill reference (from onnx_inputs.json; display only — the graph does the fill).
    imputeReference: {
      numericMedian: { gwa: 1.75, failed: 0, dropped: 0, units: 25, year: 2 },
      categoricalMode: { program: "BS CRIM", enrollHist: "Enrollment #2", prevStanding: "Good Standing" }
    },
    maxRows: 5000,
    provisionalStamp: "PROVISIONAL — DEMO ONLY (not study-validated; supportive use only, never punitive)"
  };

  /* ================= StatusLog ================= */
  function StatusLog(el) { this.el = el; this.first = true; }
  StatusLog.prototype._add = function (cls, html) {
    if (this.first) { this.el.innerHTML = ""; this.first = false; }
    var p = document.createElement("p");
    p.className = cls;
    p.innerHTML = html;
    this.el.appendChild(p);
    this.el.scrollTop = this.el.scrollHeight;
  };
  StatusLog.prototype.info = function (m) { this._add("status-ok", m); };
  StatusLog.prototype.warn = function (m) { this._add("status-warn", "Warning: " + m); };
  StatusLog.prototype.error = function (m) { this._add("status-err", "Error: " + m); };
  StatusLog.prototype.note = function (m) { this._add("", m); };

  /* ================= CsvParser ================= */
  var CsvParser = {
    parse: function (text) {
      var rows = [];
      var row = [];
      var field = "";
      var inQuotes = false;
      var i, c, n = text.length;
      // Strip BOM.
      if (n > 0 && text.charCodeAt(0) === 0xfeff) text = text.slice(1), n = text.length;
      for (i = 0; i < n; i++) {
        c = text[i];
        if (inQuotes) {
          if (c === '"') {
            if (text[i + 1] === '"') { field += '"'; i++; } // escaped quote
            else inQuotes = false;
          } else field += c;
        } else if (c === '"') inQuotes = true;
        else if (c === ",") { row.push(field); field = ""; }
        else if (c === "\r" || c === "\n") {
          if (c === "\r" && text[i + 1] === "\n") i++;
          row.push(field); field = "";
          if (row.length > 1 || row[0].trim() !== "") rows.push(row);
          row = [];
        } else field += c;
      }
      row.push(field);
      if (row.length > 1 || row[0].trim() !== "") rows.push(row);
      if (rows.length === 0) return { headers: [], records: [] };
      var headers = rows[0].map(function (h) { return h.trim(); });
      // Drop fully-empty trailing rows.
      var records = rows.slice(1).filter(function (r) {
        return r.some(function (v) { return String(v).trim() !== ""; });
      });
      return { headers: headers, records: records };
    }
  };

  /* ================= FeatureMapper ================= */
  var FeatureMapper = {
    // Canonical feature keys used by the app (order matches contract feature_order).
    FEATURES: ["gwa", "failed", "dropped", "units", "year", "program", "enrollHist", "prevStanding"],
    NUMERIC_KEYS: ["gwa", "failed", "dropped", "units", "year"],

    ALIASES: {
      gwa: ["gwa", "grade weighted average", "general weighted average", "weighted average"],
      failed: ["number of failed courses", "no of failed courses", "num of failed courses",
        "failed courses", "num failed", "number of failed subjects", "failed subjects"],
      dropped: ["number of dropped courses", "no of dropped courses", "dropped courses", "num dropped"],
      units: ["total units taken", "total units", "units taken", "units", "total unit"],
      year: ["year level", "year", "yr level", "yr", "level"],
      program: ["course program enrolled", "course enrolled", "program enrolled",
        "program", "course", "degree program", "degree", "course program"],
      enrollHist: ["enrollment history", "enrolment history", "enrollment no", "enrollment count",
        "enrollment number", "enrolment no"],
      prevStanding: ["previous academic standing", "academic standing", "previous standing",
        "prior standing", "prior academic standing", "standing"],
      displayId: ["student id", "studentid", "id", "student no", "student number", "student code"]
    },

    normalize: function (s) {
      return String(s == null ? "" : s).toLowerCase()
        .replace(/[_\/\\]+/g, " ").replace(/\s+/g, " ").trim();
    },

    mapHeaders: function (headers) {
      var norm = headers.map(FeatureMapper.normalize);
      var mapping = {}; // featureKey -> column index
      var usedCols = {};
      Object.keys(FeatureMapper.ALIASES).forEach(function (key) {
        var aliases = FeatureMapper.ALIASES[key];
        for (var c = 0; c < norm.length; c++) {
          if (usedCols[key + ":" + c]) continue;
          if (aliases.indexOf(norm[c]) !== -1 && mapping[key] === undefined) {
            mapping[key] = c;
            break;
          }
        }
      });
      return mapping;
    },

    parseNumeric: function (raw) {
      var s = String(raw == null ? "" : raw).trim();
      if (s === "" || s.toLowerCase() === "nan" || s.toLowerCase() === "na" || s === "-") return NaN;
      var v = Number(s.replace(/,/g, ""));
      return isFinite(v) ? v : NaN;
    },

    parseYearLevel: function (raw) {
      var s = String(raw == null ? "" : raw).trim();
      if (s === "") return NaN;
      var m = s.match(/\d+/);
      if (m) return Number(m[0]);
      return FeatureMapper.parseNumeric(s);
    },

    parseCategorical: function (raw) {
      var s = String(raw == null ? "" : raw).trim();
      return s; // "" = absent -> in-graph most-frequent fill
    },

    toModelRows: function (headers, records, mapping) {
      var rows = [];
      var missingNumeric = 0, missingCat = 0, badNumeric = 0;
      records.forEach(function (rec, r) {
        function cell(key) {
          var ci = mapping[key];
          if (ci === undefined || ci >= rec.length) return "";
          return rec[ci];
        }
        var gwaRaw = cell("gwa"), failRaw = cell("failed"), dropRaw = cell("dropped"),
          unitsRaw = cell("units"), yearRaw = cell("year");
        var gwa = FeatureMapper.parseNumeric(gwaRaw);
        var failed = FeatureMapper.parseNumeric(failRaw);
        var dropped = FeatureMapper.parseNumeric(dropRaw);
        var units = FeatureMapper.parseNumeric(unitsRaw);
        var year = FeatureMapper.parseYearLevel(yearRaw);
        [gwaRaw, failRaw, dropRaw, unitsRaw, yearRaw].forEach(function (raw, k) {
          var s = String(raw == null ? "" : raw).trim();
          var vals = [gwa, failed, dropped, units, year];
          if (s === "") missingNumeric++;
          else if (isNaN(vals[k])) badNumeric++;
        });
        var program = FeatureMapper.parseCategorical(cell("program"));
        var enrollHist = FeatureMapper.parseCategorical(cell("enrollHist"));
        var prevStanding = FeatureMapper.parseCategorical(cell("prevStanding"));
        [program, enrollHist, prevStanding].forEach(function (v) { if (v === "") missingCat++; });

        var idCell = mapping.displayId !== undefined && mapping.displayId < rec.length
          ? String(rec[mapping.displayId]).trim() : "";
        rows.push({
          index: r,
          displayId: idCell || ("Row " + (r + 1)),
          synthetic: false,
          gwa: gwa, failed: failed, dropped: dropped, units: units, year: year,
          program: program, enrollHist: enrollHist, prevStanding: prevStanding
        });
      });
      return { rows: rows, missingNumeric: missingNumeric, missingCat: missingCat, badNumeric: badNumeric };
    }
  };

  /* ================= RiskBands ================= */
  var RiskBands = {
    bandOf: function (p) {
      var bands = AppConfig.bands;
      for (var i = 0; i < bands.length; i++) {
        if (p <= bands[i].max + 1e-12) return bands[i];
      }
      return bands[bands.length - 1];
    },
    fmtProba: function (p) { return (Math.round(p * 10000) / 10000).toFixed(4); }
  };

  /* ================= SignalNotes ================= */
  var SignalNotes = {
    // Heuristic associations only — never presented as model explanations.
    forRow: function (row) {
      var notes = [];
      function num(v) { return typeof v === "number" && isFinite(v) ? v : null; }
      var gwa = num(row.gwa), failed = num(row.failed), dropped = num(row.dropped),
        units = num(row.units), year = num(row.year);
      if (gwa !== null && gwa >= 2.5) notes.push("Elevated GWA (" + gwa + ") — higher GWA values co-occur with at-risk outputs in this demo.");
      if (gwa !== null && gwa < 1.75) notes.push("GWA below the in-graph median reference (1.75) — co-occurs with not-at-risk outputs in this demo.");
      if (failed !== null && failed > 0) notes.push(failed + " failed course(s) recorded.");
      if (dropped !== null && dropped > 0) notes.push(dropped + " dropped course(s) recorded.");
      if (row.prevStanding && /fail/i.test(row.prevStanding)) notes.push("Previous standing mentions failed courses.");
      if (row.prevStanding && /drop/i.test(row.prevStanding)) notes.push("Previous standing mentions dropped courses.");
      if (row.prevStanding && /new|no previous/i.test(row.prevStanding)) notes.push("No previous record — less history available.");
      if (units !== null && units < 18) notes.push("Low unit load (" + units + ").");
      if (year !== null && year >= 4) notes.push("Upper year level (" + year + ").");
      var missing = [row.gwa, row.failed, row.dropped, row.units, row.year].filter(function (v) {
        return !(typeof v === "number" && isFinite(v));
      }).length + [row.program, row.enrollHist, row.prevStanding].filter(function (v) { return !v; }).length;
      if (missing > 0) notes.push(missing + " field(s) missing — filled in-graph (numeric medians / most-frequent categories); treat with extra caution.");
      if (notes.length === 0) notes.push("No strong heuristic signals in this row.");
      return notes;
    }
  };

  /* ================= OnnxRunner ================= */
  function OnnxRunner(status) {
    this.status = status;
    this.sessions = {};   // modelId -> ort.InferenceSession
    this.loadFailed = {}; // modelId -> message
    this.loading = {};    // modelId -> Promise
    this.ortReady = null;
  }

  OnnxRunner.prototype.ensureOrt = function () {
    var self = this;
    if (this.ortReady) return this.ortReady;
    this.ortReady = new Promise(function (resolve, reject) {
      if (typeof ort === "undefined") {
        reject(new Error("onnxruntime-web failed to load from CDN (" + AppConfig.ortCdn + "). Check network access, then reload."));
        return;
      }
      try {
        ort.env.wasm.wasmPaths = AppConfig.wasmPaths;
        ort.env.wasm.numThreads = 1;
      } catch (e) { /* non-fatal: defaults apply */ }
      resolve(true);
    });
    return this.ortReady;
  };

  OnnxRunner.prototype.setBadge = function (modelId, cls, text) {
    var el = document.querySelector('[data-model-badge="' + modelId + '"]');
    if (!el) return;
    el.classList.remove("ok", "fail", "busy");
    if (cls) el.classList.add(cls);
    el.textContent = text;
  };

  OnnxRunner.prototype.ensureModel = function (modelId) {
    var self = this;
    if (this.sessions[modelId]) return Promise.resolve(this.sessions[modelId]);
    if (this.loadFailed[modelId]) return Promise.reject(new Error(this.loadFailed[modelId]));
    if (this.loading[modelId]) return this.loading[modelId];
    var meta = AppConfig.models.filter(function (m) { return m.id === modelId; })[0];
    this.setBadge(modelId, "busy", meta.label + " — loading…");
    this.loading[modelId] = this.ensureOrt().then(function () {
      return ort.InferenceSession.create(meta.file, { executionProviders: ["wasm"] });
    }).then(function (session) {
      self.sessions[modelId] = session;
      self.setBadge(modelId, "ok", meta.label + " — loaded (CPU) ✓ provisional");
      return session;
    }).catch(function (err) {
      var msg = (err && err.message) ? err.message : String(err);
      // file:// fetch failures are the common cause in Chrome — give actionable guidance.
      if (/fetch|failed to fetch|network|404|not found/i.test(msg)) {
        msg += " — If you opened index.html via file:// in Chrome, local model fetch is blocked. " +
          "Use Firefox, or serve the folder (python -m http.server), or launch Chrome with " +
          "--allow-file-access-from-files. Models live in ./models/.";
      }
      self.loadFailed[modelId] = meta.label + ": " + msg;
      self.setBadge(modelId, "fail", meta.label + " — failed ✗");
      throw new Error(self.loadFailed[modelId]);
    });
    return this.loading[modelId];
  };

  OnnxRunner.prototype.buildFeeds = function (rows) {
    var n = rows.length;
    function numCol(fn) {
      var a = new Float32Array(n);
      for (var i = 0; i < n; i++) a[i] = rows[i][fn]; // NaN preserved -> in-graph median impute
      return new ort.Tensor("float32", a, [n, 1]);
    }
    function strCol(fn) {
      var a = new Array(n);
      for (var i = 0; i < n; i++) a[i] = rows[i][fn] || ""; // "" -> in-graph most-frequent fill
      return new ort.Tensor("string", a, [n, 1]);
    }
    var feeds = {};
    feeds[AppConfig.inputNames[0]] = numCol("gwa");
    feeds[AppConfig.inputNames[1]] = numCol("failed");
    feeds[AppConfig.inputNames[2]] = numCol("dropped");
    feeds[AppConfig.inputNames[3]] = numCol("units");
    feeds[AppConfig.inputNames[4]] = numCol("year");
    feeds[AppConfig.inputNames[5]] = strCol("program");
    feeds[AppConfig.inputNames[6]] = strCol("enrollHist");
    feeds[AppConfig.inputNames[7]] = strCol("prevStanding");
    return feeds;
  };

  OnnxRunner.prototype.parseOutputs = function (results, n) {
    var rawLabel = results[AppConfig.outputLabel];
    var rawProba = results[AppConfig.outputProba];
    if (!rawLabel || !rawProba) throw new Error("Unexpected model outputs (expected 'label' + 'probabilities').");
    var labels = Array.prototype.slice.call(rawLabel.data).map(function (v) { return Number(v); });
    var proba = [];
    var data = rawProba.data;
    if (data && data.length === n * 2) {
      for (var i = 0; i < n; i++) proba.push([Number(data[i * 2]), Number(data[i * 2 + 1])]);
    } else if (Array.isArray(data) || (data && data.length === n)) {
      // ZipMap sequence-of-maps fallback: [{0:..,1:..}, ...]
      for (var j = 0; j < n; j++) {
        var m = data[j];
        proba.push([Number(m[0] !== undefined ? m[0] : m["0"]), Number(m[1] !== undefined ? m[1] : m["1"])]);
      }
    } else {
      throw new Error("Unrecognized 'probabilities' shape (length " + (data && data.length) + " for N=" + n + ").");
    }
    return { labels: labels, proba: proba };
  };

  OnnxRunner.prototype.predict = function (modelId, rows) {
    var self = this;
    return this.ensureModel(modelId).then(function (session) {
      var feeds = self.buildFeeds(rows);
      return session.run(feeds);
    }).then(function (results) {
      return self.parseOutputs(results, rows.length);
    }).catch(function (err) {
      var msg = (err && err.message) ? err.message : String(err);
      if (/webgl/i.test(msg)) {
        throw new Error(modelId + ": WebGL backend failure — this demo is CPU/WASM-only by design; no WebGL fallback is used. " + msg);
      }
      throw err instanceof Error ? err : new Error(modelId + ": " + msg);
    });
  };

  /* ================= Charts ================= */
  var Charts = {
    setupHiDpi: function (canvas) {
      var dpr = window.devicePixelRatio || 1;
      var w = canvas.width, h = canvas.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.aspectRatio = w + " / " + h;
      var ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      return { ctx: ctx, w: w, h: h };
    },
    empty: function (canvas, message) {
      var s = Charts.setupHiDpi(canvas);
      s.ctx.clearRect(0, 0, s.w, s.h);
      s.ctx.fillStyle = "#6b7d90";
      s.ctx.font = "14px Segoe UI, system-ui, sans-serif";
      s.ctx.textAlign = "center";
      s.ctx.fillText(message, s.w / 2, s.h / 2);
    },
    bandBar: function (canvas, dist, modelLabel) {
      var s = Charts.setupHiDpi(canvas);
      var ctx = s.ctx, W = s.w, H = s.h;
      ctx.clearRect(0, 0, W, H);
      var padL = 44, padB = 48, padT = 30, padR = 16;
      var max = Math.max(1, dist.Low, dist.Medium, dist.High);
      var cats = [
        { k: "Low", c: "#2f7a48" }, { k: "Medium", c: "#b97a1a" }, { k: "High", c: "#a83232" }
      ];
      var slot = (W - padL - padR) / cats.length;
      ctx.fillStyle = "#43566b"; ctx.font = "12px Segoe UI, system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Band counts — " + modelLabel + " (provisional)", W / 2, 16);
      cats.forEach(function (cat, i) {
        var v = dist[cat.k];
        var bh = (H - padT - padB) * (v / max);
        var x = padL + i * slot + slot * 0.2, bw = slot * 0.6, y = H - padB - bh;
        ctx.fillStyle = cat.c;
        ctx.fillRect(x, y, bw, bh);
        ctx.fillStyle = "#1e2a36"; ctx.font = "bold 13px Segoe UI, system-ui, sans-serif";
        ctx.fillText(String(v), x + bw / 2, y - 6);
        ctx.fillStyle = "#43566b"; ctx.font = "12px Segoe UI, system-ui, sans-serif";
        ctx.fillText(cat.k, x + bw / 2, H - padB + 18);
      });
      // y gridlines
      ctx.strokeStyle = "#d9e0e8"; ctx.fillStyle = "#6b7d90"; ctx.textAlign = "right"; ctx.font = "11px Segoe UI, sans-serif";
      for (var g = 0; g <= 4; g++) {
        var gv = Math.round(max * g / 4), gy = H - padB - (H - padT - padB) * (g / 4);
        ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke();
        ctx.fillText(String(gv), padL - 6, gy + 4);
      }
    },
    histogram: function (canvas, probas, modelLabel) {
      var s = Charts.setupHiDpi(canvas);
      var ctx = s.ctx, W = s.w, H = s.h;
      ctx.clearRect(0, 0, W, H);
      var padL = 44, padB = 48, padT = 30, padR = 16;
      var bins = new Array(10).fill(0);
      probas.forEach(function (p) {
        var b = Math.min(9, Math.floor(p * 10));
        bins[b]++;
      });
      var max = Math.max(1);
      for (var i = 0; i < 10; i++) max = Math.max(max, bins[i]);
      ctx.fillStyle = "#43566b"; ctx.font = "12px Segoe UI, system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("P(at-risk) histogram — " + modelLabel + " (provisional)", W / 2, 16);
      var slot = (W - padL - padR) / 10;
      for (var k = 0; k < 10; k++) {
        var bh = (H - padT - padB) * (bins[k] / max);
        var x = padL + k * slot + 2, bw = slot - 4, y = H - padB - bh;
        ctx.fillStyle = "#1f3a5f";
        ctx.fillRect(x, y, bw, bh);
        ctx.fillStyle = "#1e2a36"; ctx.font = "bold 11px Segoe UI, sans-serif";
        if (bins[k] > 0) ctx.fillText(String(bins[k]), x + bw / 2, y - 5);
        ctx.fillStyle = "#43566b"; ctx.font = "10px Segoe UI, sans-serif";
        ctx.fillText((k / 10).toFixed(1) + "–" + ((k + 1) / 10).toFixed(1), x + bw / 2, H - padB + 14);
      }
      ctx.strokeStyle = "#d9e0e8"; ctx.fillStyle = "#6b7d90"; ctx.textAlign = "right"; ctx.font = "11px Segoe UI, sans-serif";
      for (var g = 0; g <= 4; g++) {
        var gv = Math.round(max * g / 4), gy = H - padB - (H - padT - padB) * (g / 4);
        ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke();
        ctx.fillText(String(gv), padL - 6, gy + 4);
      }
    }
  };

  /* ================= ReportExporter ================= */
  var ReportExporter = {
    stampLines: function () {
      return {
        stamp: AppConfig.provisionalStamp,
        bands: "Low 0-0.39 / Medium 0.40-0.69 / High 0.70-1.00 (on P(at-risk), class 1 = provisional at-risk)",
        generatedAt: new Date().toISOString()
      };
    },
    csvCell: function (v) {
      var s = (v === null || v === undefined) ? "" : String(v);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    },
    numCell: function (v) {
      return (typeof v === "number" && isFinite(v)) ? String(Math.round(v * 10000) / 10000) : "";
    },
    buildCsv: function (state) {
      var head = ["row", "display_id", "synthetic", "GWA", "Number_of_Failed_Courses",
        "Number_of_Dropped_Courses", "Total_Units_Taken", "Year_Level",
        "Course_Program_Enrolled", "Enrollment_History", "Previous_Academic_Standing"];
      state.activeModels.forEach(function (m) {
        head.push(m.id + "_label", m.id + "_proba_at_risk", m.id + "_band");
      });
      head.push("provisional_note");
      var lines = ["# " + AppConfig.provisionalStamp, head.map(ReportExporter.csvCell).join(",")];
      state.rows.forEach(function (row, i) {
        var cells = [i + 1, row.displayId, row.synthetic ? "SYNTHETIC" : "",
          ReportExporter.numCell(row.gwa), ReportExporter.numCell(row.failed),
          ReportExporter.numCell(row.dropped), ReportExporter.numCell(row.units),
          ReportExporter.numCell(row.year), row.program, row.enrollHist, row.prevStanding];
        state.activeModels.forEach(function (m) {
          var r = state.results[m.id] ? state.results[m.id][i] : null;
          cells.push(r ? r.label : "", r ? RiskBands.fmtProba(r.proba) : "", r ? r.band.name : "");
        });
        cells.push("provisional demo output");
        lines.push(cells.map(ReportExporter.csvCell).join(","));
      });
      return lines.join("\r\n") + "\r\n";
    },
    buildJson: function (state) {
      var meta = ReportExporter.stampLines();
      return JSON.stringify({
        status: "PROVISIONAL",
        provisional_note: meta.stamp,
        demo: true,
        supportive_use_only: true,
        generated_at: meta.generatedAt,
        bands: meta.bands,
        contract: {
          inputs: "8 in order: 5 float32 [N,1] + 3 string [N,1]",
          outputs: "label [N] (classes [0,1], 1 = provisional at-risk), probabilities [N,2]",
          missing: "numerics NaN (median-imputed in-graph), categoricals '' (most-frequent fill in-graph)"
        },
        models: state.activeModels.map(function (m) { return { id: m.id, file: m.file }; }),
        summary: state.summary,
        rows: state.rows.map(function (row, i) {
          var perModel = {};
          state.activeModels.forEach(function (m) {
            var r = state.results[m.id] ? state.results[m.id][i] : null;
            perModel[m.id] = r ? { label: r.label, proba_at_risk: r.proba, band: r.band.name } : null;
          });
          return {
            display_id: row.displayId, synthetic: row.synthetic,
            features: {
              GWA: isFinite(row.gwa) ? row.gwa : null,
              Number_of_Failed_Courses: isFinite(row.failed) ? row.failed : null,
              Number_of_Dropped_Courses: isFinite(row.dropped) ? row.dropped : null,
              Total_Units_Taken: isFinite(row.units) ? row.units : null,
              Year_Level: isFinite(row.year) ? row.year : null,
              Course_Program_Enrolled: row.program || null,
              Enrollment_History: row.enrollHist || null,
              Previous_Academic_Standing: row.prevStanding || null
            },
            signals_association_only: SignalNotes.forRow(row),
            provisional: perModel
          };
        })
      }, null, 2);
    },
    download: function (filename, content, mime) {
      var blob = new Blob([content], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    }
  };

  /* ================= DashboardApp ================= */
  var SAMPLE_HEADERS = ["Student ID", "Academic Year", "Semester", "Final Grades", "GWA",
    "Number of Failed Courses", "Number of Dropped Courses", "Course/Program Enrolled",
    "Year Level", "Enrollment History", "Total Units Taken", "Previous Academic Standing"];

  // Verified locally with onnxruntime (CPU): DT/LR/NB + RF predictions below are sane.
  var SAMPLE_ROWS = [
    { id: "SYN-DEMO-01", synth: true, gwa: 1.50, failed: 0, dropped: 0, units: 24, year: 2, program: "BSCS", enrollHist: "Enrollment #2", prevStanding: "Good Standing" },
    { id: "SYN-DEMO-02", synth: true, gwa: 2.75, failed: 3, dropped: 1, units: 21, year: 3, program: "BS CRIM", enrollHist: "Enrollment #5", prevStanding: "With Failed Courses" },
    { id: "SYN-DEMO-03", synth: true, gwa: NaN, failed: 0, dropped: 0, units: 25, year: 1, program: "", enrollHist: "", prevStanding: "" }
  ];

  function DashboardApp() {
    this.status = new StatusLog(document.getElementById("status-log"));
    this.runner = new OnnxRunner(this.status);
    this.rows = [];            // model rows
    this.results = {};         // modelId -> [{label, proba, band}]
    this.summary = null;
    this.activeModels = [];
    this.selectedRow = -1;
  }

  DashboardApp.prototype.selectedModelId = function () {
    var el = document.querySelector('input[name="model"]:checked');
    return el ? el.value : "compare-all";
  };

  DashboardApp.prototype.resolveActiveModels = function () {
    var sel = this.selectedModelId();
    if (sel === "compare-all") return AppConfig.models.slice();
    return AppConfig.models.filter(function (m) { return m.id === sel; });
  };

  DashboardApp.prototype.init = function () {
    var self = this;
    document.getElementById("btn-sample").addEventListener("click", function () { self.loadSampleRows(); });
    document.getElementById("btn-sample-csv").addEventListener("click", function () { self.downloadSampleCsv(); });
    document.getElementById("btn-clear").addEventListener("click", function () { self.clearAll(); });
    document.getElementById("csv-file").addEventListener("change", function (e) { self.handleFile(e); });
    document.getElementById("btn-run").addEventListener("click", function () { self.run(); });
    document.getElementById("btn-print").addEventListener("click", function () { window.print(); });
    document.getElementById("btn-csv").addEventListener("click", function () { self.exportCsv(); });
    document.getElementById("btn-json").addEventListener("click", function () { self.exportJson(); });
    document.querySelectorAll('input[name="model"]').forEach(function (r) {
      r.addEventListener("change", function () { self.redrawCharts(); });
    });
    Charts.empty(document.getElementById("chart-bands"), "No results yet — run predictions.");
    Charts.empty(document.getElementById("chart-hist"), "No results yet — run predictions.");
    if (typeof ort === "undefined") {
      this.status.error("onnxruntime-web CDN did not load (<code>" + AppConfig.ortCdn + "</code>). " +
        "Predictions are unavailable until the CDN is reachable. CSV import and sample rows still work for inspection.");
    } else {
      this.status.note("onnxruntime-web detected. Sessions load lazily on Run (CPU/WASM only — WebGL is intentionally never used).");
    }
  };

  /* ----- data intake ----- */
  DashboardApp.prototype.loadSampleRows = function () {
    this.rows = SAMPLE_ROWS.map(function (s, i) {
      return {
        index: i, displayId: s.id, synthetic: true,
        gwa: s.gwa, failed: s.failed, dropped: s.dropped, units: s.units, year: s.year,
        program: s.program, enrollHist: s.enrollHist, prevStanding: s.prevStanding
      };
    });
    this.results = {}; this.summary = null; this.selectedRow = -1;
    this.status.info("Loaded <strong>3 synthetic demo rows</strong> (labeled SYNTHETIC — not real records). " +
      "Row 3 has missing GWA/categoricals to demo in-graph imputation (NaN / \"\"). Press Run.");
    this.renderResultsShell();
  };

  DashboardApp.prototype.sampleCsvText = function () {
    function f(v) { return (typeof v === "number" && !isFinite(v)) ? "" : v; }
    var lines = [SAMPLE_HEADERS.map(ReportExporter.csvCell).join(",")];
    var meta = [["2024-2025", "1st Semester", ""], ["2024-2025", "2nd Semester", ""], ["2024-2025", "1st Semester", ""]];
    SAMPLE_ROWS.forEach(function (s, i) {
      lines.push([s.id, meta[i][0], meta[i][1], meta[i][2], f(s.gwa), s.failed, s.dropped,
        s.program, s.year, s.enrollHist, s.units, s.prevStanding].map(ReportExporter.csvCell).join(","));
    });
    return lines.join("\r\n") + "\r\n";
  };

  DashboardApp.prototype.downloadSampleCsv = function () {
    ReportExporter.download("provisional_sample_rows_SYNTHETIC.csv", this.sampleCsvText(), "text/csv");
    this.status.note("Downloaded the 3-row <strong>SYNTHETIC</strong> sample CSV (same rows as the built-in loader).");
  };

  DashboardApp.prototype.clearAll = function () {
    this.rows = []; this.results = {}; this.summary = null; this.selectedRow = -1;
    document.getElementById("csv-file").value = "";
    this.renderResultsShell();
    document.getElementById("summary-cards").innerHTML =
      '<p class="placeholder">No results yet — run predictions to populate this section.</p>';
    document.getElementById("summary-table").hidden = true;
    Charts.empty(document.getElementById("chart-bands"), "No results yet — run predictions.");
    Charts.empty(document.getElementById("chart-hist"), "No results yet — run predictions.");
    this.status.note("Cleared all rows and results.");
  };

  DashboardApp.prototype.handleFile = function (e) {
    var self = this;
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try { self.ingestCsv(String(reader.result || ""), file.name); }
      catch (err) { self.status.error("Could not parse CSV: " + err.message); }
    };
    reader.onerror = function () { self.status.error("Could not read file <code>" + file.name + "</code>."); };
    reader.readAsText(file);
  };

  DashboardApp.prototype.ingestCsv = function (text, name) {
    var parsed = CsvParser.parse(text);
    if (parsed.headers.length === 0 || parsed.records.length === 0) {
      this.status.error("Bad CSV (<code>" + name + "</code>): no header row or no data rows found. " +
        "Expected real-schema headers such as GWA, Number of Failed Courses, …, Previous Academic Standing.");
      return;
    }
    var mapping = FeatureMapper.mapHeaders(parsed.headers);
    var missing = FeatureMapper.FEATURES.filter(function (k) { return mapping[k] === undefined; });
    if (missing.length === FeatureMapper.FEATURES.length) {
      this.status.error("Bad CSV (<code>" + name + "</code>): none of the 8 model-feature headers were recognized. " +
        "Got: <code>" + parsed.headers.join(" | ") + "</code>. See “Show accepted headers”.");
      return;
    }
    if (missing.length > 0) {
      this.status.warn("CSV <code>" + name + "</code>: unmapped feature column(s) [" + missing.join(", ") +
        "] — those inputs will be missing for every row (in-graph imputation applies).");
    }
    var ignored = parsed.headers.filter(function (h) {
      var n = FeatureMapper.normalize(h);
      return FeatureMapper.FEATURES.every(function (k) { return mapping[k] === undefined || parsed.headers[mapping[k]] !== h; }) &&
        ["student id", "academic year", "semester", "final grades"].indexOf(n) === -1 &&
        /outcome|status|label|at.risk|remark|final/i.test(h);
    });
    var converted = FeatureMapper.toModelRows(parsed.headers, parsed.records, mapping);
    if (converted.rows.length > AppConfig.maxRows) {
      this.status.warn("CSV has " + converted.rows.length + " rows; truncating to " + AppConfig.maxRows + " for this demo.");
      converted.rows = converted.rows.slice(0, AppConfig.maxRows);
    }
    this.rows = converted.rows;
    this.results = {}; this.summary = null; this.selectedRow = -1;
    this.status.info("Imported <strong>" + this.rows.length + " row(s)</strong> from <code>" + name + "</code>. " +
      "Mapped " + (FeatureMapper.FEATURES.length - missing.length) + "/8 features; " +
      "ignored ID/outcome/status columns (Student ID kept as display label only). " +
      "Missing numerics: " + converted.missingNumeric + " cell(s) → NaN; " +
      "missing categoricals: " + converted.missingCat + " cell(s) → \"\"; " +
      "non-numeric in numeric columns: " + converted.badNumeric + " cell(s) → NaN. Press Run.");
    if (ignored.length > 0) this.status.note("Ignored non-feature column(s): <code>" + ignored.join(" | ") + "</code> (never fed to models).");
    this.renderResultsShell();
  };

  /* ----- inference ----- */
  DashboardApp.prototype.run = function () {
    var self = this;
    if (this.rows.length === 0) {
      this.status.error("Nothing to run: load the synthetic demo rows or import a CSV first.");
      return;
    }
    if (typeof ort === "undefined") {
      this.status.error("Cannot run: onnxruntime-web failed to load from CDN. Check network access and reload the page.");
      return;
    }
    var models = this.resolveActiveModels();
    this.activeModels = models;
    var btn = document.getElementById("btn-run");
    btn.disabled = true;
    this.status.note("Running provisional inference on <strong>" + this.rows.length + " row(s)</strong> × " +
      models.length + " model(s), CPU/WASM backend, locally in this browser…");
    var chain = Promise.resolve();
    models.forEach(function (m) {
      chain = chain.then(function () {
        self.status.note("Loading <code>" + m.file + "</code> …");
        return self.runner.predict(m.id, self.rows).then(function (out) {
          var packed = out.labels.map(function (label, i) {
            return { label: label, proba: out.proba[i][AppConfig.atRiskClass], band: RiskBands.bandOf(out.proba[i][AppConfig.atRiskClass]) };
          });
          self.results[m.id] = packed;
          self.status.info("<strong>" + m.label + "</strong>: " + packed.length + " provisional prediction(s) done.");
          self.renderResultsShell();
        });
      });
    });
    chain.then(function () {
      self.buildSummary();
      self.renderSummary();
      self.renderResultsShell();
      self.redrawCharts();
      self.status.info("Done. All results above are <strong>PROVISIONAL — DEMO ONLY</strong> (descriptive, not validated).");
    }).catch(function (err) {
      self.status.error((err && err.message) ? err.message : String(err));
      self.renderResultsShell();
    }).then(function () { btn.disabled = false; });
  };

  DashboardApp.prototype.buildSummary = function () {
    var self = this;
    this.summary = this.activeModels.map(function (m) {
      var res = self.results[m.id] || [];
      var dist = { Low: 0, Medium: 0, High: 0 };
      var atRisk = 0, sum = 0;
      res.forEach(function (r) {
        if (r.label === 1) atRisk++;
        sum += r.proba;
        dist[r.band.name]++;
      });
      return {
        model: m.label, id: m.id, n: res.length, atRisk: atRisk,
        rate: res.length ? atRisk / res.length : 0,
        meanProba: res.length ? sum / res.length : 0,
        dist: dist
      };
    });
  };

  /* ----- rendering ----- */
  DashboardApp.prototype.fmtCell = function (v) {
    return (typeof v === "number" && isFinite(v)) ? String(Math.round(v * 10000) / 10000) : '<span class="hint">missing</span>';
  };

  DashboardApp.prototype.bandPill = function (band) {
    return '<span class="band ' + band.css + '">' + band.name + '</span>';
  };

  DashboardApp.prototype.renderResultsShell = function () {
    var table = document.getElementById("results-table");
    var headRow = document.getElementById("results-head-row");
    var body = document.getElementById("results-body");
    var empty = document.getElementById("results-empty");
    var models = this.activeModels.length ? this.activeModels :
      (this.selectedModelId() === "compare-all" ? AppConfig.models :
        AppConfig.models.filter(function (m) { return m.id === document.querySelector('input[name="model"]:checked').value; }));
    var anyResults = models.some(function (m) { return this.results[m.id]; }, this);
    if (this.rows.length === 0) {
      table.hidden = true; empty.hidden = false;
      empty.textContent = "No predictions yet.";
      this.renderDrilldown();
      return;
    }
    table.hidden = false; empty.hidden = true;
    var html = "<th scope='col'>#</th><th scope='col'>ID</th><th scope='col'>Synthetic?</th>";
    if (models.length === 1) {
      html += "<th scope='col'>" + models[0].label + " label†</th>" +
        "<th scope='col'>P(at-risk)†</th><th scope='col'>Band†</th>";
    } else {
      models.forEach(function (m) { html += "<th scope='col'>" + m.label + "†</th>"; });
    }
    headRow.innerHTML = html;
    var self = this;
    body.innerHTML = this.rows.map(function (row, i) {
      var cells = "<td class='num'>" + (i + 1) + "</td><td>" + escapeHtml(row.displayId) + "</td>" +
        "<td>" + (row.synthetic ? '<span class="tag">SYNTHETIC</span>' : "—") + "</td>";
      if (models.length === 1) {
        var r = self.results[models[0].id] ? self.results[models[0].id][i] : null;
        cells += r
          ? "<td class='num'>" + r.label + "</td><td class='num'>" + RiskBands.fmtProba(r.proba) + "</td><td>" + self.bandPill(r.band) + "</td>"
          : "<td colspan='3' class='hint'>not run</td>";
      } else {
        models.forEach(function (m) {
          var rr = self.results[m.id] ? self.results[m.id][i] : null;
          cells += rr
            ? "<td class='num'>" + rr.label + " · " + RiskBands.fmtProba(rr.proba) + " " + self.bandPill(rr.band) + "</td>"
            : "<td class='hint'>not run</td>";
        });
      }
      var sel = self.selectedRow === i ? " class='row-selected'" : "";
      return "<tr data-row-idx='" + i + "'" + sel + ">" + cells + "</tr>";
    }).join("");
    body.querySelectorAll("tr[data-row-idx]").forEach(function (tr) {
      tr.addEventListener("click", function () {
        self.selectedRow = Number(tr.getAttribute("data-row-idx"));
        body.querySelectorAll("tr").forEach(function (x) { x.classList.remove("row-selected"); });
        tr.classList.add("row-selected");
        self.renderDrilldown();
      });
    });
    this.renderDrilldown();
  };

  DashboardApp.prototype.renderDrilldown = function () {
    var box = document.getElementById("drilldown");
    if (this.selectedRow < 0 || this.selectedRow >= this.rows.length) { box.hidden = true; box.innerHTML = ""; return; }
    var row = this.rows[this.selectedRow];
    var self = this;
    var perModel = this.activeModels.length ? this.activeModels : AppConfig.models;
    var lis = perModel.map(function (m) {
      var r = self.results[m.id] ? self.results[m.id][self.selectedRow] : null;
      return "<li>" + m.label + ": " + (r
        ? "label <strong>" + r.label + "</strong>, P(at-risk) <strong>" + RiskBands.fmtProba(r.proba) + "</strong> " + self.bandPill(r.band)
        : "<span class='hint'>not run</span>") + "</li>";
    }).join("");
    var notes = SignalNotes.forRow(row).map(function (n) { return "<li>" + escapeHtml(n) + "</li>"; }).join("");
    box.innerHTML =
      "<h3>Row drilldown — " + escapeHtml(row.displayId) + " (provisional)</h3>" +
      "<dl>" +
      "<dt>GWA</dt><dd>" + this.fmtCell(row.gwa) + "</dd>" +
      "<dt>Failed</dt><dd>" + this.fmtCell(row.failed) + "</dd>" +
      "<dt>Dropped</dt><dd>" + this.fmtCell(row.dropped) + "</dd>" +
      "<dt>Total units</dt><dd>" + this.fmtCell(row.units) + "</dd>" +
      "<dt>Year level</dt><dd>" + this.fmtCell(row.year) + "</dd>" +
      "<dt>Program</dt><dd>" + (row.program ? escapeHtml(row.program) : '<span class="hint">missing → in-graph fill</span>') + "</dd>" +
      "<dt>Enrollment history</dt><dd>" + (row.enrollHist ? escapeHtml(row.enrollHist) : '<span class="hint">missing → in-graph fill</span>') + "</dd>" +
      "<dt>Prev. standing</dt><dd>" + (row.prevStanding ? escapeHtml(row.prevStanding) : '<span class="hint">missing → in-graph fill</span>') + "</dd>" +
      "</dl>" +
      "<p><strong>Provisional outputs (class 1 = at-risk):</strong></p><ul>" + lis + "</ul>" +
      "<div class='signal-note'><strong>Top signals — association only, NOT model explanations:</strong>" +
      "<ul>" + notes + "</ul></div>";
    box.hidden = false;
  };

  DashboardApp.prototype.renderSummary = function () {
    var wrap = document.getElementById("summary-cards");
    var table = document.getElementById("summary-table");
    var tbody = table.querySelector("tbody");
    if (!this.summary || !this.summary.length) return;
    wrap.innerHTML = this.summary.map(function (s) {
      return "<div class='summary-chip'><strong>" + s.n + "</strong><span>" + s.model +
        " rows (provisional)</span></div>" +
        "<div class='summary-chip'><strong>" + s.atRisk + " (" + (Math.round(s.rate * 1000) / 10) + "%)</strong><span>" +
        s.model + " predicted at-risk</span></div>";
    }).join("");
    tbody.innerHTML = this.summary.map(function (s) {
      return "<tr><td>" + s.model + "†</td><td class='num'>" + s.n + "</td>" +
        "<td class='num'>" + s.atRisk + "</td><td class='num'>" + (Math.round(s.rate * 10000) / 100).toFixed(2) + "%</td>" +
        "<td class='num'>" + RiskBands.fmtProba(s.meanProba) + "</td>" +
        "<td class='num'>" + s.dist.Low + "</td><td class='num'>" + s.dist.Medium + "</td>" +
        "<td class='num'>" + s.dist.High + "</td></tr>";
    }).join("");
    table.hidden = false;
  };

  DashboardApp.prototype.chartModel = function () {
    var sel = this.selectedModelId();
    if (sel !== "compare-all") return AppConfig.models.filter(function (m) { return m.id === sel; })[0];
    var pref = ["random_forest", "decision_tree", "logistic_regression", "naive_bayes"];
    for (var i = 0; i < pref.length; i++) {
      if (this.results[pref[i]]) return AppConfig.models.filter(function (m) { return m.id === pref[i]; })[0];
    }
    return AppConfig.models[0];
  };

  DashboardApp.prototype.redrawCharts = function () {
    var bandC = document.getElementById("chart-bands");
    var histC = document.getElementById("chart-hist");
    var m = this.chartModel();
    var res = this.results[m.id];
    if (!res || !res.length) {
      Charts.empty(bandC, "No results yet — run predictions.");
      Charts.empty(histC, "No results yet — run predictions.");
      return;
    }
    var dist = { Low: 0, Medium: 0, High: 0 };
    var probas = res.map(function (r) { dist[r.band.name]++; return r.proba; });
    Charts.bandBar(bandC, dist, m.label);
    Charts.histogram(histC, probas, m.label);
  };

  /* ----- export ----- */
  DashboardApp.prototype.exportCsv = function () {
    if (!this.rows.length || !this.activeModels.length || !this.summary) {
      this.status.error("Nothing to export: run predictions first.");
      return;
    }
    var state = { rows: this.rows, results: this.results, activeModels: this.activeModels, summary: this.summary };
    ReportExporter.download("provisional_report_" + stamp() + ".csv", ReportExporter.buildCsv(state), "text/csv");
    this.status.info("Downloaded provisional predictions CSV (stamped PROVISIONAL — DEMO ONLY).");
  };

  DashboardApp.prototype.exportJson = function () {
    if (!this.rows.length || !this.activeModels.length || !this.summary) {
      this.status.error("Nothing to export: run predictions first.");
      return;
    }
    var state = { rows: this.rows, results: this.results, activeModels: this.activeModels, summary: this.summary };
    ReportExporter.download("provisional_report_" + stamp() + ".json", ReportExporter.buildJson(state), "application/json");
    this.status.info("Downloaded provisional report JSON (stamped PROVISIONAL — DEMO ONLY).");
  };

  /* ----- helpers ----- */
  function stamp() {
    var d = new Date();
    function p(x) { return (x < 10 ? "0" : "") + x; }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes());
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var app = new DashboardApp();
    app.init();
  });
})();
