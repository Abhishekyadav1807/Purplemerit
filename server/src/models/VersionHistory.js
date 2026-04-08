const mongoose = require('mongoose');

const VersionHistorySchema = new mongoose.Schema(
  {
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
      required: true
    },
    version: { type: Number, required: true },
    source: {
      type: String,
      enum: ['scrape', 'edit', 'rescrape'],
      required: true
    },
    changedPaths: [String],
    beforeState: { type: mongoose.Schema.Types.Mixed, default: {} },
    afterState: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.model('VersionHistory', VersionHistorySchema);
