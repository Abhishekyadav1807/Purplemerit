const tinycolor = require('tinycolor2');

function defaultTokens() {
  return {
    colors: {
      primary: '#1f6feb',
      secondary: '#0f172a',
      accent: '#f97316',
      surface: '#ffffff',
      canvas: '#f8fafc',
      text: '#0f172a',
      muted: '#64748b',
      border: '#dbe3ef',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626'
    },
    typography: {
      headingFont: 'Georgia, serif',
      bodyFont: 'Inter, ui-sans-serif, system-ui, sans-serif',
      monoFont: '"JetBrains Mono", ui-monospace, monospace',
      scale: {
        display: 56,
        h1: 42,
        h2: 32,
        h3: 24,
        body: 16,
        small: 14,
        caption: 12
      },
      weights: {
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      },
      lineHeights: {
        tight: 1.1,
        normal: 1.5,
        relaxed: 1.75
      },
      letterSpacing: {
        tight: -0.03,
        normal: 0,
        wide: 0.04
      }
    },
    spacing: {
      base: 4,
      scale: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        '2xl': 48
      }
    },
    radii: {
      sm: 8,
      md: 16,
      lg: 24
    },
    shadows: {
      soft: '0 12px 30px rgba(15, 23, 42, 0.08)',
      strong: '0 18px 60px rgba(15, 23, 42, 0.14)'
    }
  };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getByPath(object, path) {
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), object);
}

function setByPath(object, path, value) {
  const parts = path.split('.');
  let current = object;

  while (parts.length > 1) {
    const key = parts.shift();
    if (current[key] === undefined) {
      current[key] = {};
    }
    current = current[key];
  }

  current[parts[0]] = value;
  return object;
}

function walkLeaves(object, prefix, callback) {
  Object.entries(object || {}).forEach(([key, value]) => {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      walkLeaves(value, nextPath, callback);
    } else {
      callback(nextPath, value);
    }
  });
}

function mergeRespectingLocks(existingTokens, incomingTokens, lockedPaths) {
  const merged = deepClone(existingTokens || defaultTokens());

  walkLeaves(incomingTokens, '', (path, value) => {
    if (!lockedPaths.includes(path)) {
      setByPath(merged, path, value);
    }
  });

  return merged;
}

function normalizeColorArray(colors) {
  const unique = [];

  colors.forEach((color) => {
    if (!tinycolor(color).isValid()) return;
    const hex = tinycolor(color).toHexString();
    if (!unique.includes(hex)) {
      unique.push(hex);
    }
  });

  return unique;
}

function pickAccessibleForeground(background) {
  return tinycolor.readability(background, '#0f172a') >= 5 ? '#0f172a' : '#ffffff';
}

module.exports = {
  defaultTokens,
  deepClone,
  getByPath,
  setByPath,
  walkLeaves,
  mergeRespectingLocks,
  normalizeColorArray,
  pickAccessibleForeground
};
