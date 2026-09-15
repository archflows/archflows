export function ok(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function created(res, data) {
  return ok(res, data, 201);
}
