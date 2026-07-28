import type { PackageUpgradeRequest } from '../types';

export const PACKAGE_UPGRADE_REQUESTS_STORAGE_KEY = 'salonsys_package_upgrade_requests';

export const loadPackageUpgradeRequests = (): PackageUpgradeRequest[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(PACKAGE_UPGRADE_REQUESTS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const savePackageUpgradeRequests = (requests: PackageUpgradeRequest[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PACKAGE_UPGRADE_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // The hosted API remains authoritative when browser storage is unavailable.
  }
};

export const fetchPackageUpgradeRequests = async (): Promise<PackageUpgradeRequest[] | null> => {
  try {
    const response = await fetch('/api/package-upgrade-requests', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    });
    if (!response.ok) return null;
    const payload = await response.json() as { requests?: PackageUpgradeRequest[] };
    return Array.isArray(payload.requests) ? payload.requests : [];
  } catch {
    return null;
  }
};

export const persistPackageUpgradeRequest = async (request: PackageUpgradeRequest) => {
  try {
    const response = await fetch('/api/package-upgrade-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(request)
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const persistPackageUpgradeReview = async (request: PackageUpgradeRequest) => {
  try {
    const response = await fetch(`/api/package-upgrade-requests/${encodeURIComponent(request.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        status: request.status,
        effectiveDate: request.effectiveDate,
        reviewedAt: request.reviewedAt,
        reviewedBy: request.reviewedBy,
        reviewNote: request.reviewNote,
        invoiceId: request.invoiceId
      })
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const deletePackageUpgradeRequest = async (requestId: string) => {
  try {
    await fetch(`/api/package-upgrade-requests/${encodeURIComponent(requestId)}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
  } catch {
    // Local cleanup remains available when the hosted API cannot be reached.
  }
};
