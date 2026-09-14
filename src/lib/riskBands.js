import { AppConfig } from '../config.js'

export const RiskBands = {
  bandOf(p) {
    const bands = AppConfig.bands
    for (let i = 0; i < bands.length; i++) {
      if (p <= bands[i].max + 1e-12) return bands[i]
    }
    return bands[bands.length - 1]
  },
  fmtProba(p) {
    return (Math.round(p * 10000) / 10000).toFixed(4)
  },
}
