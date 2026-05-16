let _dcid = null;
const KEY = 'linengrass_dcid';

export function initDcid() {
  if (_dcid !== null) return _dcid;
  const fromStorage = window.localStorage.getItem(KEY);
  _dcid = fromStorage ? Number(fromStorage) : null;
  return _dcid;
}

export function getDcid() {
  return _dcid ?? initDcid();
}

export function setDcid(next) {
  _dcid = next == null ? null : Number(next);
  if (next == null) {
    window.localStorage.removeItem(KEY);
  } else {
    window.localStorage.setItem(KEY, String(_dcid));
  }
  return _dcid;
}
