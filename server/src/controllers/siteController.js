const Site = require('../models/Site');
const VersionHistory = require('../models/VersionHistory');
const { analyzeSite } = require('../services/scrapeService');
const {
  defaultTokens,
  deepClone,
  getByPath,
  setByPath,
  mergeRespectingLocks
} = require('../utils/tokens');

async function createVersion(siteId, source, beforeState, afterState, changedPaths) {
  const latest = await VersionHistory.findOne({ site: siteId }).sort({ version: -1 });
  const version = latest ? latest.version + 1 : 1;

  return VersionHistory.create({
    site: siteId,
    version,
    source,
    changedPaths,
    beforeState,
    afterState
  });
}

async function scrapeSite(req, res) {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ message: 'A URL is required.' });
  }

  let site = null;

  try {
    const analysis = await analyzeSite(url);
    site = await Site.findOne({ url: analysis.url });
    const beforeState = site?.currentTokens || defaultTokens();
    const isNewSite = !site;

    if (!site) {
      site = new Site({
        url: analysis.url,
        hostname: analysis.hostname
      });
    }

    site.title = analysis.title;
    site.description = analysis.description;
    site.status = 'ready';
    site.extractionNotes = analysis.extractionNotes;
    site.rawHtmlSnapshot = analysis.rawHtmlSnapshot;
    site.extractedTokens = analysis.tokens;
    site.currentTokens =
      site.currentTokens && Object.keys(site.currentTokens).length
        ? mergeRespectingLocks(site.currentTokens, analysis.tokens, site.lockedTokens)
        : analysis.tokens;
    site.scrapeMeta = analysis.scrapeMeta;
    site.lastError = '';

    await site.save();
    await createVersion(
      site._id,
      isNewSite ? 'scrape' : 'rescrape',
      beforeState,
      site.currentTokens,
      ['colors', 'typography', 'spacing']
    );

    return res.json({ site });
  } catch (error) {
    if (site) {
      site.status = 'error';
      site.lastError = error.message;
      await site.save();
    }

    return res.status(500).json({
      message: 'Unable to analyze that website right now.',
      detail: error.message
    });
  }
}

async function listSites(req, res) {
  const sites = await Site.find().sort({ updatedAt: -1 }).limit(12);
  res.json({ sites });
}

async function getSite(req, res) {
  const site = await Site.findById(req.params.siteId);
  if (!site) {
    return res.status(404).json({ message: 'Site not found.' });
  }

  const versions = await VersionHistory.find({ site: site._id }).sort({ version: -1 }).limit(20);
  return res.json({ site, versions });
}

async function updateToken(req, res) {
  const { path, value } = req.body;
  const site = await Site.findById(req.params.siteId);

  if (!site) {
    return res.status(404).json({ message: 'Site not found.' });
  }

  if (!path) {
    return res.status(400).json({ message: 'Token path is required.' });
  }

  const beforeState = deepClone(site.currentTokens || defaultTokens());
  const previousValue = getByPath(site.currentTokens, path);
  setByPath(site.currentTokens, path, value);
  site.markModified('currentTokens');
  await site.save();

  await createVersion(site._id, 'edit', beforeState, site.currentTokens, [path]);
  return res.json({ site, changed: { path, previousValue, nextValue: value } });
}

async function toggleLock(req, res) {
  const { path } = req.body;
  const site = await Site.findById(req.params.siteId);

  if (!site) {
    return res.status(404).json({ message: 'Site not found.' });
  }

  if (!path) {
    return res.status(400).json({ message: 'Token path is required.' });
  }

  const locked = site.lockedTokens.includes(path);
  site.lockedTokens = locked
    ? site.lockedTokens.filter((entry) => entry !== path)
    : [...site.lockedTokens, path];
  await site.save();

  return res.json({ site, locked: !locked });
}

async function getVersions(req, res) {
  const versions = await VersionHistory.find({ site: req.params.siteId }).sort({ version: -1 });
  res.json({ versions });
}

module.exports = {
  scrapeSite,
  listSites,
  getSite,
  updateToken,
  toggleLock,
  getVersions
};
