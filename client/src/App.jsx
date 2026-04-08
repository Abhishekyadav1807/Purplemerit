import { useEffect, useMemo, useState } from 'react';
import { fetchSite, fetchSites, scrapeSite, toggleLock, updateToken } from './api';

const SAMPLE_URLS = ['https://stripe.com', 'https://www.apple.com', 'https://linear.app'];

function cssVarsFromTokens(tokens) {
  if (!tokens) return {};

  return {
    '--color-primary': tokens.colors.primary,
    '--color-secondary': tokens.colors.secondary,
    '--color-accent': tokens.colors.accent,
    '--color-surface': tokens.colors.surface,
    '--color-canvas': tokens.colors.canvas,
    '--color-text': tokens.colors.text,
    '--color-muted': tokens.colors.muted,
    '--color-border': tokens.colors.border,
    '--color-error': tokens.colors.error,
    '--font-heading': tokens.typography.headingFont,
    '--font-body': tokens.typography.bodyFont,
    '--font-mono': tokens.typography.monoFont,
    '--type-display': `${tokens.typography.scale.display}px`,
    '--type-h1': `${tokens.typography.scale.h1}px`,
    '--type-h2': `${tokens.typography.scale.h2}px`,
    '--type-h3': `${tokens.typography.scale.h3}px`,
    '--type-body': `${tokens.typography.scale.body}px`,
    '--type-caption': `${tokens.typography.scale.caption}px`,
    '--leading-normal': tokens.typography.lineHeights.normal,
    '--space-xs': `${tokens.spacing.scale.xs}px`,
    '--space-sm': `${tokens.spacing.scale.sm}px`,
    '--space-md': `${tokens.spacing.scale.md}px`,
    '--space-lg': `${tokens.spacing.scale.lg}px`,
    '--space-xl': `${tokens.spacing.scale.xl}px`,
    '--radius-sm': `${tokens.radii.sm}px`,
    '--radius-md': `${tokens.radii.md}px`,
    '--radius-lg': `${tokens.radii.lg}px`,
    '--shadow-soft': tokens.shadows.soft
  };
}

function SiteCard({ site, active, onSelect }) {
  return (
    <button className={`site-card ${active ? 'active' : ''}`} onClick={() => onSelect(site._id)}>
      <div className="site-card__top">
        <span>{site.title || site.hostname}</span>
        <span className={`status-pill status-pill--${site.status}`}>{site.status}</span>
      </div>
      <p>{site.url}</p>
      <small>{site.scrapeMeta?.mode === 'fallback' ? 'heuristic extraction' : 'live extraction'}</small>
    </button>
  );
}

function LoadingPanel() {
  return (
    <div className="loading-panel">
      <div className="loading-grid">
        <div className="skeleton skeleton--xl" />
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line short" />
      </div>
      <div className="dom-visualizer">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} style={{ animationDelay: `${index * 80}ms` }} />
        ))}
      </div>
      <p>Parsing structure, collecting palettes, and estimating spacing rhythm...</p>
    </div>
  );
}

function PreviewGrid({ tokens }) {
  return (
    <section className="panel preview-grid" style={cssVarsFromTokens(tokens)}>
      <div className="preview-grid__header">
        <div>
          <p className="eyebrow">Live UI Kit</p>
          <h2>Component playground</h2>
        </div>
        <div className="swatches">
          {Object.entries(tokens.colors).slice(0, 6).map(([name, value]) => (
            <div key={name} className="swatch">
              <span style={{ background: value }} />
              <label>{name}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="preview-grid__layout">
        <div className="preview-card">
          <h3>Buttons</h3>
          <div className="button-row">
            <button className="btn btn--primary">Primary action</button>
            <button className="btn btn--secondary">Secondary</button>
            <button className="btn btn--ghost">Ghost</button>
          </div>
        </div>

        <div className="preview-card">
          <h3>Inputs</h3>
          <div className="field-stack">
            <input className="input" placeholder="Default input" />
            <input className="input input--focus" value="Focused state" readOnly />
            <input className="input input--error" value="Error state" readOnly />
          </div>
        </div>

        <div className="preview-card preview-card--wide">
          <h3>Cards</h3>
          <div className="cards-row">
            <article className="kit-card">
              <p className="eyebrow">Insight</p>
              <h4>Tokens feel brand-accurate and editable.</h4>
              <p>Design decisions propagate through CSS variables instantly.</p>
            </article>
            <article className="kit-card elevated">
              <p className="eyebrow">Versioned</p>
              <h4>Lock what matters.</h4>
              <p>Preserve overrides while re-scraping for new sources.</p>
            </article>
          </div>
        </div>

        <div className="preview-card preview-card--wide">
          <h3>Type scale</h3>
          <div className="type-specimens">
            <div className="display">Display specimen</div>
            <div className="h1">Heading one</div>
            <div className="h2">Heading two</div>
            <div className="h3">Heading three</div>
            <div className="body">Body copy optimized for interface readability.</div>
            <div className="caption">Caption / helper text</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TokenCard({ children, locked, label, onLock }) {
  return (
    <div className={`token-card ${locked ? 'locked' : ''}`}>
      <div className="token-card__header">
        <strong>{label}</strong>
        <button className={`lock-btn ${locked ? 'locked' : ''}`} onClick={onLock}>
          {locked ? 'Locked' : 'Lock'}
        </button>
      </div>
      {children}
    </div>
  );
}

function ExportPanel({ tokens }) {
  const cssOutput = useMemo(() => {
    if (!tokens) return '';

    return Object.entries(cssVarsFromTokens(tokens))
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');
  }, [tokens]);

  const jsonOutput = useMemo(() => JSON.stringify(tokens, null, 2), [tokens]);

  return (
    <section className="panel export-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Export</p>
          <h2>Production-ready tokens</h2>
        </div>
      </div>
      <div className="export-grid">
        <div>
          <h3>CSS Variables</h3>
          <pre>{`:root {\n${cssOutput}\n}`}</pre>
        </div>
        <div>
          <h3>JSON</h3>
          <pre>{jsonOutput}</pre>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [url, setUrl] = useState('');
  const [sites, setSites] = useState([]);
  const [activeSiteId, setActiveSiteId] = useState(null);
  const [activeSite, setActiveSite] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [savingPath, setSavingPath] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSites() {
      try {
        const data = await fetchSites();
        setSites(data.sites);
        if (data.sites[0]) {
          setActiveSiteId(data.sites[0]._id);
        }
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadSites();
  }, []);

  useEffect(() => {
    if (!activeSiteId) return;

    async function loadSite() {
      const data = await fetchSite(activeSiteId);
      setActiveSite(data.site);
      setVersions(data.versions);
    }

    loadSite().catch((requestError) => setError(requestError.message));
  }, [activeSiteId]);

  async function handleScrape(submittedUrl) {
    setScraping(true);
    setError('');

    try {
      const data = await scrapeSite(submittedUrl);
      setActiveSite(data.site);
      setActiveSiteId(data.site._id);
      const allSites = await fetchSites();
      setSites(allSites.sites);
      const detail = await fetchSite(data.site._id);
      setVersions(detail.versions);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setScraping(false);
    }
  }

  async function handleTokenChange(path, nextValue) {
    if (!activeSite) return;

    const previous = JSON.parse(JSON.stringify(activeSite));
    const nextSite = JSON.parse(JSON.stringify(activeSite));
    const segments = path.split('.');
    let cursor = nextSite.currentTokens;

    while (segments.length > 1) {
      cursor = cursor[segments.shift()];
    }
    cursor[segments[0]] = nextValue;

    setActiveSite(nextSite);
    setSavingPath(path);

    try {
      const data = await updateToken(activeSite._id, path, nextValue);
      setActiveSite(data.site);
      const detail = await fetchSite(activeSite._id);
      setVersions(detail.versions);
    } catch (requestError) {
      setActiveSite(previous);
      setError(requestError.message);
    } finally {
      setSavingPath('');
    }
  }

  async function handleToggleLock(path) {
    if (!activeSite) return;
    try {
      const data = await toggleLock(activeSite._id, path);
      setActiveSite(data.site);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">Purple Merit Assessment</p>
          <h1>StyleSync</h1>
          <p>Turn any URL into a living design system with editable tokens, protected overrides, and a brand-aware UI kit.</p>
        </div>

        <form
          className="ingest-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleScrape(url);
          }}
        >
          <label htmlFor="url-input">Website URL</label>
          <input
            id="url-input"
            type="text"
            placeholder="https://example.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <button className="hero-btn" type="submit" disabled={!url || scraping}>
            {scraping ? 'Analyzing...' : 'Extract Style Guide'}
          </button>
          <div className="sample-links">
            {SAMPLE_URLS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setUrl(sample);
                  handleScrape(sample);
                }}
              >
                {sample.replace('https://', '')}
              </button>
            ))}
          </div>
        </form>

        <div className="sidebar-section">
          <div className="section-heading">
            <h2>Recent analyses</h2>
            <span>{sites.length}</span>
          </div>
          <div className="site-list">
            {sites.map((site) => (
              <SiteCard key={site._id} site={site} active={site._id === activeSiteId} onSelect={setActiveSiteId} />
            ))}
          </div>
        </div>
      </aside>

      <main className="workspace">
        {error ? (
          <div className="error-banner">
            <strong>Scan issue</strong>
            <span>{error}</span>
          </div>
        ) : null}

        {loading || scraping ? (
          <LoadingPanel />
        ) : !activeSite ? (
          <section className="empty-state panel">
            <p className="eyebrow">No style guide yet</p>
            <h2>Paste a URL to generate your first dashboard.</h2>
            <p>If the target blocks scraping, StyleSync falls back to heuristic extraction so you can still keep designing.</p>
          </section>
        ) : (
          <>
            <section className="hero panel">
              <div>
                <p className="eyebrow">Analyzed Site</p>
                <h2>{activeSite.title}</h2>
                <p>{activeSite.description}</p>
              </div>
              <div className="hero-meta">
                <div>
                  <label>Source</label>
                  <span>{activeSite.url}</span>
                </div>
                <div>
                  <label>Detection</label>
                  <span>{activeSite.scrapeMeta?.mode || 'live'} mode</span>
                </div>
                <div>
                  <label>Latency</label>
                  <span>{activeSite.scrapeMeta?.durationMs || 0} ms</span>
                </div>
              </div>
            </section>

            <div className="dashboard-grid">
              <section className="panel">
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">Editor</p>
                    <h2>Design tokens</h2>
                  </div>
                  {savingPath ? <span className="saving-pill">Saving {savingPath}</span> : null}
                </div>

                <div className="editor-stack">
                  <div className="token-section">
                    <div className="token-section__title">
                      <h3>Color palette</h3>
                      <p>Direct edits propagate to the preview grid instantly.</p>
                    </div>
                    <div className="token-grid">
                      {Object.entries(activeSite.currentTokens.colors).map(([field, value]) => {
                        const path = `colors.${field}`;
                        return (
                          <TokenCard
                            key={path}
                            label={field}
                            locked={activeSite.lockedTokens.includes(path)}
                            onLock={() => handleToggleLock(path)}
                          >
                            <div className="color-field">
                              <input type="color" value={value} onChange={(event) => handleTokenChange(path, event.target.value)} />
                              <input type="text" value={value} onChange={(event) => handleTokenChange(path, event.target.value)} />
                            </div>
                          </TokenCard>
                        );
                      })}
                    </div>
                  </div>

                  <div className="token-section">
                    <div className="token-section__title">
                      <h3>Typography inspector</h3>
                      <p>Adjust families while preserving the extracted hierarchy.</p>
                    </div>
                    <div className="token-grid token-grid--two">
                      {['headingFont', 'bodyFont'].map((field) => {
                        const path = `typography.${field}`;
                        return (
                          <TokenCard
                            key={path}
                            label={field}
                            locked={activeSite.lockedTokens.includes(path)}
                            onLock={() => handleToggleLock(path)}
                          >
                            <input
                              className="token-input"
                              type="text"
                              value={activeSite.currentTokens.typography[field]}
                              onChange={(event) => handleTokenChange(path, event.target.value)}
                            />
                          </TokenCard>
                        );
                      })}
                    </div>
                    <div className="token-grid token-grid--two">
                      {['display', 'h1', 'h2', 'h3', 'body', 'caption'].map((field) => {
                        const path = `typography.scale.${field}`;
                        return (
                          <TokenCard
                            key={path}
                            label={field}
                            locked={activeSite.lockedTokens.includes(path)}
                            onLock={() => handleToggleLock(path)}
                          >
                            <div className="range-field">
                              <input
                                type="range"
                                min="10"
                                max="84"
                                step="1"
                                value={activeSite.currentTokens.typography.scale[field]}
                                onChange={(event) => handleTokenChange(path, Number(event.target.value))}
                              />
                              <span>{activeSite.currentTokens.typography.scale[field]}</span>
                            </div>
                          </TokenCard>
                        );
                      })}
                    </div>
                  </div>

                  <div className="token-section">
                    <div className="token-section__title">
                      <h3>Spacing rhythm</h3>
                      <p>Drag to tune the system scale and feel the preview adapt.</p>
                    </div>
                    <div className="token-grid token-grid--two">
                      {Object.entries(activeSite.currentTokens.spacing.scale).map(([field, value]) => {
                        const path = `spacing.scale.${field}`;
                        return (
                          <TokenCard
                            key={path}
                            label={field}
                            locked={activeSite.lockedTokens.includes(path)}
                            onLock={() => handleToggleLock(path)}
                          >
                            <div className="range-field">
                              <input
                                type="range"
                                min="0"
                                max="96"
                                step="1"
                                value={value}
                                onChange={(event) => handleTokenChange(path, Number(event.target.value))}
                              />
                              <span>{value}</span>
                            </div>
                          </TokenCard>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel versions-panel">
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">Time machine</p>
                    <h2>Version history</h2>
                  </div>
                </div>
                <div className="version-list">
                  {versions.map((version) => (
                    <article key={version._id} className="version-card">
                      <div className="version-card__top">
                        <strong>v{version.version}</strong>
                        <span>{version.source}</span>
                      </div>
                      <p>{version.changedPaths.join(', ')}</p>
                      <small>{new Date(version.createdAt).toLocaleString()}</small>
                    </article>
                  ))}
                </div>

                <div className="notes-card">
                  <h3>Extraction notes</h3>
                  {(activeSite.extractionNotes || []).length ? (
                    activeSite.extractionNotes.map((note) => <p key={note}>{note}</p>)
                  ) : (
                    <p>Signals were captured successfully with no fallback warnings.</p>
                  )}
                </div>
              </section>
            </div>

            <PreviewGrid tokens={activeSite.currentTokens} />
            <ExportPanel tokens={activeSite.currentTokens} />
          </>
        )}
      </main>
    </div>
  );
}
