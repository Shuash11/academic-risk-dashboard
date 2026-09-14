import * as ort from 'onnxruntime-web'
import { AppConfig } from '../config.js'

// Configure ORT exactly as original app.js: wasm only, single thread, pinned CDN paths (here via npm, wasm files resolved automatically).
// Keep behavior: lazy sessions, badges via callbacks, file:// guidance, WebGL guard.

export class OnnxRunner {
  constructor({ onBadge, onStatus } = {}) {
    this.sessions = {}
    this.loadFailed = {}
    this.loading = {}
    this.ortReady = null
    this.onBadge = onBadge || (() => {})
    this.onStatus = onStatus || (() => {})
    this._configureOrt()
  }

  _configureOrt() {
    try {
      if (ort?.env?.wasm) {
        // Mirror original: pinned CDN 1.22.0, WASM only, single thread.
        // Keep wasmPaths on CDN so build doesn't need to ship/hashed wasm; models stay local.
        ort.env.wasm.wasmPaths = AppConfig.wasmPaths
        ort.env.wasm.numThreads = 1
      }
    } catch {
      // non-fatal
    }
  }

  ensureOrt() {
    if (this.ortReady) return this.ortReady
    this.ortReady = new Promise((resolve, reject) => {
      if (!ort || !ort.InferenceSession) {
        reject(new Error('onnxruntime-web failed to load (' + AppConfig.ortCdn + '). Check network access, then reload.'))
        return
      }
      resolve(true)
    })
    return this.ortReady
  }

  setBadge(modelId, cls, text) {
    this.onBadge(modelId, cls, text)
  }

  ensureModel(modelId) {
    if (this.sessions[modelId]) return Promise.resolve(this.sessions[modelId])
    if (this.loadFailed[modelId]) return Promise.reject(new Error(this.loadFailed[modelId]))
    if (this.loading[modelId]) return this.loading[modelId]
    const meta = AppConfig.models.find((m) => m.id === modelId)
    if (!meta) return Promise.reject(new Error('Unknown model ' + modelId))
    this.setBadge(modelId, 'busy', meta.label + ' — loading…')
    this.loading[modelId] = this.ensureOrt()
      .then(() => ort.InferenceSession.create(meta.file, { executionProviders: ['wasm'] }))
      .then((session) => {
        this.sessions[modelId] = session
        this.setBadge(modelId, 'ok', meta.label + ' — loaded (CPU)')
        return session
      })
      .catch((err) => {
        let msg = err && err.message ? err.message : String(err)
        if (/fetch|failed to fetch|network|404|not found/i.test(msg)) {
          msg +=
            ' — If you opened index.html via file:// in Chrome, local model fetch is blocked. Use Firefox, or serve the folder (python -m http.server), or launch Chrome with --allow-file-access-from-files. Models live in ./models/.'
        }
        this.loadFailed[modelId] = meta.label + ': ' + msg
        this.setBadge(modelId, 'fail', meta.label + ' — failed ✗')
        throw new Error(this.loadFailed[modelId])
      })
    return this.loading[modelId]
  }

  buildFeeds(rows) {
    const n = rows.length
    function numCol(fn) {
      const a = new Float32Array(n)
      for (let i = 0; i < n; i++) a[i] = rows[i][fn]
      return new ort.Tensor('float32', a, [n, 1])
    }
    function strCol(fn) {
      const a = new Array(n)
      for (let i = 0; i < n; i++) a[i] = rows[i][fn] || ''
      return new ort.Tensor('string', a, [n, 1])
    }
    const feeds = {}
    feeds[AppConfig.inputNames[0]] = numCol('gwa')
    feeds[AppConfig.inputNames[1]] = numCol('failed')
    feeds[AppConfig.inputNames[2]] = numCol('dropped')
    feeds[AppConfig.inputNames[3]] = numCol('units')
    feeds[AppConfig.inputNames[4]] = numCol('year')
    feeds[AppConfig.inputNames[5]] = strCol('program')
    feeds[AppConfig.inputNames[6]] = strCol('enrollHist')
    feeds[AppConfig.inputNames[7]] = strCol('prevStanding')
    return feeds
  }

  parseOutputs(results, n) {
    const rawLabel = results[AppConfig.outputLabel]
    const rawProba = results[AppConfig.outputProba]
    if (!rawLabel || !rawProba) throw new Error("Unexpected model outputs (expected 'label' + 'probabilities').")
    const labels = Array.prototype.slice.call(rawLabel.data).map((v) => Number(v))
    const proba = []
    const data = rawProba.data
    if (data && data.length === n * 2) {
      for (let i = 0; i < n; i++) proba.push([Number(data[i * 2]), Number(data[i * 2 + 1])])
    } else if (Array.isArray(data) || (data && data.length === n)) {
      for (let j = 0; j < n; j++) {
        const m = data[j]
        proba.push([Number(m[0] !== undefined ? m[0] : m['0']), Number(m[1] !== undefined ? m[1] : m['1'])])
      }
    } else {
      throw new Error("Unrecognized 'probabilities' shape (length " + (data && data.length) + ' for N=' + n + ').')
    }
    return { labels, proba }
  }

  predict(modelId, rows) {
    return this.ensureModel(modelId)
      .then((session) => {
        const feeds = this.buildFeeds(rows)
        return session.run(feeds)
      })
      .then((results) => this.parseOutputs(results, rows.length))
      .catch((err) => {
        const msg = err && err.message ? err.message : String(err)
        if (/webgl/i.test(msg)) {
          throw new Error(modelId + ': WebGL backend failure — this app is CPU/WASM-only by design; no WebGL fallback is used. ' + msg)
        }
        throw err instanceof Error ? err : new Error(modelId + ': ' + msg)
      })
  }
}
