// functions/api/leaderboard.js
export async function onRequestGet(context) {
  try {
    const { env } = context;

    // ✅ 排名規則：
    // 1) 正確提交數量（flagCount）越多越前
    // 2) 同數量時，最早正確提交時間（firstTime）越早越前
    //
    // submissions 表需至少包含：student_id, name, is_correct, created_at
    const sql = `
      SELECT
        student_id AS studentId,
        MAX(name)  AS name,
        COUNT(*)   AS flagCount,
        datetime(MIN(created_at), 'unixepoch', '+8 hours') AS firstTime,
        MIN(created_at) AS firstTimeUnix
      FROM submissions
      WHERE is_correct = 1
      GROUP BY student_id
      ORDER BY flagCount DESC, firstTimeUnix ASC
      LIMIT 100
    `;

    const result = await env.DB.prepare(sql).all();
    const data = (result.results || []).map((r) => ({
      studentId: r.studentId,
      name: r.name,
      flagCount: Number(r.flagCount || 0),
      firstTime: r.firstTime, // e.g. '2025-12-18 21:06:21' (Taipei)
    }));

    return json({ ok: true, data });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
