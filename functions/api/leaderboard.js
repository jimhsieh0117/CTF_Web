// functions/api/leaderboard.js
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function onRequestGet({ env }) {
  try {
    // 顯示已答對的人，依繳交數量排序，若相同則依最早提交時間排序
    const { results } = await env.DB.prepare(`
      SELECT
        s.student_id AS studentId,
        COUNT(*) AS flagCount,
        datetime(MIN(s.created_at), 'unixepoch', '+8 hours') AS firstTime,
        -- compatibility aliases
        COUNT(*) AS submissionCount,
        datetime(MIN(s.created_at), 'unixepoch', '+8 hours') AS firstSubmissionTime
      FROM submissions s
      WHERE s.is_correct = 1
      GROUP BY s.student_id
      ORDER BY submissionCount DESC, MIN(s.created_at) ASC
      LIMIT 50;
    `).all();

    return json({ ok: true, data: results });
  } catch (e) {
    return json({ ok: false, message: "leaderboard 查詢失敗" }, 500);
  }
}

// 其他 method 一律擋掉
export async function onRequest({ request }) {
  if (request.method === "GET") return; // 交給 onRequestGet
  return json({ ok: false, message: "Method not allowed" }, 405);
}
