const stores = new Map();

function store(name) {
  let box = stores.get(name);
  if (!box) {
    box = { values: new Map(), inflight: new Map() };
    stores.set(name, box);
  }
  return box;
}

export async function cached(name, key, ttlMs, fn) {
  const box = store(name);
  const now = Date.now();
  const hit = box.values.get(key);
  if (hit && hit.exp > now) return hit.value;

  const pending = box.inflight.get(key);
  if (pending) return pending;

  const run = Promise.resolve()
    .then(fn)
    .then((value) => {
      box.values.set(key, { value, exp: Date.now() + ttlMs });
      box.inflight.delete(key);
      return value;
    })
    .catch((error) => {
      box.inflight.delete(key);
      throw error;
    });

  box.inflight.set(key, run);
  return run;
}

export function invalidateCache(name) {
  const box = stores.get(name);
  if (!box) return;
  box.values.clear();
  box.inflight.clear();
}
