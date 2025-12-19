const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function onRequestGet({ env }) {
  try {
    // 只顯示已答對的人（first_correct_at != NULL），依最早答對時間排序
    const { results } = await env.DB.prepare(`
      SELECT
        student_id AS studentId,
        name,
        datetime(first_correct_at, 'unixepoch', '+8 hours') AS time
      FROM players
      WHERE first_correct_at IS NOT NULL
      ORDER BY first_correct_at ASC
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
