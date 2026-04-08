const express = require('express');
const {
  scrapeSite,
  listSites,
  getSite,
  updateToken,
  toggleLock,
  getVersions
} = require('../controllers/siteController');

const router = express.Router();

router.get('/sites', listSites);
router.post('/sites/scrape', scrapeSite);
router.get('/sites/:siteId', getSite);
router.patch('/sites/:siteId/tokens', updateToken);
router.post('/sites/:siteId/lock', toggleLock);
router.get('/sites/:siteId/versions', getVersions);

module.exports = router;
