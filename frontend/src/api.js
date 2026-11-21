const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export async function fetchMetrics() {
  const res = await fetch(`${API_BASE}/metrics/`);
  if (!res.ok) throw new Error('Failed to load impact metrics');
  return res.json();
}

export async function fetchBatches() {
  const res = await fetch(`${API_BASE}/batches/`);
  if (!res.ok) throw new Error('Failed to load waste batches');
  return res.json();
}

export async function createBatch(payload) {
  const res = await fetch(`${API_BASE}/batches/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

export async function claimBatch(batchId, claimedBy) {
  const res = await fetch(`${API_BASE}/batches/${batchId}/claim/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claimed_by: claimedBy }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to claim batch');
  }
  return data;
}

export async function scanWasteImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_BASE}/scan/`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'AI Vision scan failed');
  }
  return data;
}

export async function fetchForecast(businessType = 'SUPERMARKET', days = 7) {
  const res = await fetch(
    `${API_BASE}/forecast/?business_type=${encodeURIComponent(businessType)}&days=${days}`
  );
  if (!res.ok) throw new Error('Failed to load surplus forecast');
  return res.json();
}
