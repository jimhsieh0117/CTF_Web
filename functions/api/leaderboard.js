const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function onRequestGet({ env }) {
  try {
    // 顯示已答對的人，包含繳交數量，依繳交數量排序，若相同則依最早答對時間排序
    const { results } = await env.DB.prepare(`
      SELECT
        student_id AS studentId,
        name,
        COUNT(*) AS submissionCount,
        datetime(first_correct_at, 'unixepoch', '+8 hours') AS time
      FROM submissions
      JOIN players ON submissions.student_id = players.student_id
      WHERE first_correct_at IS NOT NULL
      GROUP BY submissions.student_id, players.name, players.first_correct_at
      ORDER BY submissionCount DESC, first_correct_at ASC
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
