// TEMPORARY diagnostic function — zero imports. Reports runtime health only.
// Delete after the FUNCTION_INVOCATION_FAILED issue is diagnosed.
export default function handler(
  req: { method?: string },
  res: {
    status(code: number): { json(body: unknown): unknown }
    json(body: unknown): unknown
  }
): void {
  const env = Object.keys(process.env)
    .filter((k) => /FIREBASE|LICENSE|GITHUB|VERCEL|NODE/.test(k))
    .sort()
  res.status(200).json({
    ok: true,
    node: process.version,
    env,
    method: req.method ?? 'unknown'
  })
}
