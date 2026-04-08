const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail || payload.message || 'Request failed.');
  }

  return payload;
}

export function fetchSites() {
  return request('/sites');
}

export function scrapeSite(url) {
  return request('/sites/scrape', {
    method: 'POST',
    body: JSON.stringify({ url })
  });
}

export function fetchSite(siteId) {
  return request(`/sites/${siteId}`);
}

export function updateToken(siteId, path, value) {
  return request(`/sites/${siteId}/tokens`, {
    method: 'PATCH',
    body: JSON.stringify({ path, value })
  });
}

export function toggleLock(siteId, path) {
  return request(`/sites/${siteId}/lock`, {
    method: 'POST',
    body: JSON.stringify({ path })
  });
}
