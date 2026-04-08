const axios = require('axios');
const cheerio = require('cheerio');
const css = require('css');
const Vibrant = require('node-vibrant/node');
const tinycolor = require('tinycolor2');
const {
  defaultTokens,
  normalizeColorArray,
  pickAccessibleForeground
} = require('../utils/tokens');

const COLOR_REGEX = /#(?:[0-9a-fA-F]{3,8})\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g;
const PX_REGEX = /(-?\d+(?:\.\d+)?)px/g;

function normalizeUrl(value) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return new URL(withProtocol).toString();
}

async function fetchText(url, timeout = 12000) {
  const response = await axios.get(url, {
    timeout,
    responseType: 'text',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    }
  });

  return response.data;
}

function collectInlineStyles($) {
  const blocks = [];

  $('style').each((_, element) => {
    blocks.push($(element).html() || '');
  });

  $('[style]').each((_, element) => {
    blocks.push($(element).attr('style') || '');
  });

  return blocks;
}

async function collectExternalCss($, baseUrl) {
  const hrefs = [];

  $('link[rel="stylesheet"]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;
    try {
      hrefs.push(new URL(href, baseUrl).toString());
    } catch (error) {
      return null;
    }
  });

  const uniqueHrefs = [...new Set(hrefs)].slice(0, 6);
  const styles = await Promise.all(
    uniqueHrefs.map(async (href) => {
      try {
        return await fetchText(href, 8000);
      } catch (error) {
        return '';
      }
    })
  );

  return styles;
}

function extractCssDeclarations(cssText) {
  try {
    const ast = css.parse(cssText);
    const declarations = [];

    (ast.stylesheet?.rules || []).forEach((rule) => {
      (rule.declarations || []).forEach((declaration) => {
        if (declaration.property && declaration.value) {
          declarations.push({
            property: declaration.property,
            value: declaration.value
          });
        }
      });
    });

    return declarations;
  } catch (error) {
    return [];
  }
}

function countFrequency(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(frequencies, count) {
  return Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([value]) => value);
}

function parseFontFamilies(fontValues) {
  const candidates = [];

  fontValues.forEach((value) => {
    value
      .split(',')
      .map((part) => part.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
      .forEach((font) => {
        if (!/inherit|initial|system-ui/i.test(font)) {
          candidates.push(font);
        }
      });
  });

  return topEntries(countFrequency(candidates), 3);
}

function parsePxValues(values, fallback) {
  const pxValues = [];

  values.forEach((value) => {
    const matches = value.matchAll(PX_REGEX);
    for (const match of matches) {
      pxValues.push(Number(match[1]));
    }
  });

  if (!pxValues.length) return fallback;
  pxValues.sort((a, b) => a - b);
  return pxValues;
}

async function extractImagePalette(imageUrls) {
  for (const imageUrl of imageUrls.slice(0, 4)) {
    try {
      const palette = await Vibrant.from(imageUrl).getPalette();
      const colors = Object.values(palette)
        .filter(Boolean)
        .map((swatch) => swatch.hex);

      if (colors.length) {
        return colors;
      }
    } catch (error) {
      continue;
    }
  }

  return [];
}

function buildTokenSet({
  dominantColors,
  imageColors,
  fonts,
  fontSizes,
  fontWeights,
  lineHeights,
  spacingValues
}) {
  const tokens = defaultTokens();
  const palette = normalizeColorArray([...dominantColors, ...imageColors]);
  const sortedFontSizes = [...fontSizes].sort((a, b) => b - a);
  const sortedSpacing = [...spacingValues].sort((a, b) => a - b);

  if (palette[0]) tokens.colors.primary = palette[0];
  if (palette[1]) tokens.colors.secondary = palette[1];
  if (palette[2]) tokens.colors.accent = palette[2];

  const darkest = palette.find((color) => tinycolor(color).getBrightness() < 80);
  const lightest = palette.find((color) => tinycolor(color).getBrightness() > 220);

  if (lightest) tokens.colors.canvas = tinycolor(lightest).desaturate(10).toHexString();
  if (darkest) tokens.colors.text = darkest;
  tokens.colors.surface = tinycolor(tokens.colors.canvas).brighten(2).toHexString();
  tokens.colors.muted = tinycolor(tokens.colors.text).lighten(30).toHexString();
  tokens.colors.border = tinycolor(tokens.colors.canvas).darken(8).toHexString();

  tokens.typography.headingFont = fonts[0] || tokens.typography.headingFont;
  tokens.typography.bodyFont = fonts[1] || fonts[0] || tokens.typography.bodyFont;

  if (sortedFontSizes[0]) tokens.typography.scale.display = Math.round(sortedFontSizes[0]);
  if (sortedFontSizes[1]) tokens.typography.scale.h1 = Math.round(sortedFontSizes[1]);
  if (sortedFontSizes[2]) tokens.typography.scale.h2 = Math.round(sortedFontSizes[2]);
  if (sortedFontSizes[3]) tokens.typography.scale.h3 = Math.round(sortedFontSizes[3]);
  if (sortedFontSizes[sortedFontSizes.length - 1]) {
    tokens.typography.scale.caption = Math.max(
      11,
      Math.round(sortedFontSizes[sortedFontSizes.length - 1])
    );
  }

  const regularWeight = fontWeights[0] || 400;
  const strongWeight = fontWeights[fontWeights.length - 1] || 700;
  tokens.typography.weights.regular = Number(regularWeight);
  tokens.typography.weights.bold = Number(strongWeight);
  tokens.typography.lineHeights.normal = Number(((lineHeights[0] || 1.5)).toFixed(2));

  const base = sortedSpacing.find((value) => value >= 4 && value <= 8) || 4;
  tokens.spacing.base = base;
  tokens.spacing.scale = {
    xs: base,
    sm: base * 2,
    md: base * 4,
    lg: base * 6,
    xl: base * 8,
    '2xl': base * 12
  };

  pickAccessibleForeground(tokens.colors.primary);
  return tokens;
}

async function analyzeSite(urlInput) {
  const startedAt = Date.now();
  const extractionNotes = [];
  const normalizedUrl = normalizeUrl(urlInput);
  let html = '';
  let mode = 'live';

  try {
    html = await fetchText(normalizedUrl);
  } catch (error) {
    mode = 'fallback';
    extractionNotes.push(
      'Live scraping was blocked or timed out. A heuristic extraction was generated from URL metadata.'
    );
    html = `<html><head><title>${new URL(normalizedUrl).hostname}</title></head><body></body></html>`;
  }

  const $ = cheerio.load(html);
  const title = $('title').text().trim() || new URL(normalizedUrl).hostname;
  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    'No description detected.';

  const inlineStyles = collectInlineStyles($);
  const externalStyles = mode === 'live' ? await collectExternalCss($, normalizedUrl) : [];
  const declarations = [...inlineStyles, ...externalStyles].flatMap(extractCssDeclarations);
  const allStyleValues = [
    ...inlineStyles,
    ...externalStyles,
    ...declarations.map((item) => item.value)
  ];

  const cssColors = normalizeColorArray(
    allStyleValues.flatMap((block) => (block.match(COLOR_REGEX) || []).map((entry) => entry.trim()))
  );

  const imageUrls = [];
  $('meta[property="og:image"]').each((_, element) => {
    const src = $(element).attr('content');
    if (src) imageUrls.push(new URL(src, normalizedUrl).toString());
  });

  $('img').each((_, element) => {
    const src = $(element).attr('src');
    if (!src) return;
    try {
      imageUrls.push(new URL(src, normalizedUrl).toString());
    } catch (error) {
      return null;
    }
  });

  const imageColors = mode === 'live' ? await extractImagePalette([...new Set(imageUrls)]) : [];
  if (!cssColors.length && !imageColors.length) {
    extractionNotes.push('No strong color signals were detected, so a balanced neutral palette was synthesized.');
  }

  const fontFamilies = parseFontFamilies(
    declarations
      .filter((item) => item.property === 'font-family')
      .map((item) => item.value)
  );

  const fontSizes = parsePxValues(
    declarations.filter((item) => item.property === 'font-size').map((item) => item.value),
    [56, 40, 28, 20, 16, 14, 12]
  );

  const fontWeights = topEntries(
    countFrequency(
      declarations
        .filter((item) => item.property === 'font-weight')
        .map((item) => Number(item.value))
        .filter(Boolean)
    ),
    4
  ).map(Number);

  const lineHeights = declarations
    .filter((item) => item.property === 'line-height')
    .map((item) => {
      const numeric = parseFloat(item.value);
      return Number.isFinite(numeric) ? numeric : null;
    })
    .filter(Boolean);

  const spacingValues = parsePxValues(
    declarations
      .filter((item) =>
        ['margin', 'margin-top', 'margin-bottom', 'padding', 'gap', 'row-gap', 'column-gap'].includes(item.property)
      )
      .map((item) => item.value),
    [4, 8, 16, 24, 32, 48]
  );

  const tokens = buildTokenSet({
    dominantColors: cssColors,
    imageColors,
    fonts: fontFamilies,
    fontSizes,
    fontWeights,
    lineHeights,
    spacingValues
  });

  return {
    url: normalizedUrl,
    hostname: new URL(normalizedUrl).hostname,
    title,
    description,
    extractionNotes,
    rawHtmlSnapshot: html.slice(0, 30000),
    tokens,
    scrapeMeta: {
      colorsDetected: cssColors.length + imageColors.length,
      fontsDetected: fontFamilies.length,
      spacingSignals: spacingValues.length,
      durationMs: Date.now() - startedAt,
      mode
    }
  };
}

module.exports = { analyzeSite };
