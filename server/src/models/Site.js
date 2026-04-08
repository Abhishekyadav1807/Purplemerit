const mongoose = require('mongoose');

const SiteSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    hostname: { type: String, required: true },
    title: String,
    description: String,
    status: {
      type: String,
      enum: ['queued', 'processing', 'ready', 'error'],
      default: 'queued'
    },
    extractionNotes: [String],
    screenshotUrl: String,
    rawHtmlSnapshot: String,
    extractedTokens: { type: mongoose.Schema.Types.Mixed, default: {} },
    currentTokens: { type: mongoose.Schema.Types.Mixed, default: {} },
    lockedTokens: { type: [String], default: [] },
    scrapeMeta: {
      colorsDetected: Number,
      fontsDetected: Number,
      spacingSignals: Number,
      durationMs: Number,
      mode: String
    },
    lastError: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Site', SiteSchema);
