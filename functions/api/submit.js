const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

// 固定窗限速：每分鐘 N 次（key 可以用 ip 或 studentId）
async function hitRateLimit(env, key, limitPerMin) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / 60) * 60;

  await env.DB.prepare(`
    INSERT INTO rate_limits(key, window_start, count)
    VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET
      window_start = excluded.window_start,
      count = CASE
        WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1
        ELSE 1
      END;
  `).bind(key, windowStart).run();

  const row = await env.DB.prepare(`SELECT window_start, count FROM rate_limits WHERE key = ?`)
    .bind(key)
    .first();

  if (row && row.window_start === windowStart && row.count > limitPerMin) {
    return { ok: false, message: `請勿刷太快（每分鐘最多 ${limitPerMin} 次）` };
  }
  return { ok: true };
}

export async function onRequestPost({ request, env }) {
  try {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    const body = await request.json();
    const name = String(body.name || "").trim();
    const studentId = String(body.studentId || "").trim();
    const flags = [
      String(body.flag1 || "").trim(),
      String(body.flag2 || "").trim(),
      String(body.flag3 || "").trim(),
    ];

    // 基本檢查
    if (!name || !studentId || flags.some((flag) => !flag)) {
      return json({ ok: false, message: "請填寫所有欄位" }, 400);
    }
    if (name.length > 50) return json({ ok: false, message: "姓名過長" }, 400);
    if (studentId.length > 30) return json({ ok: false, message: "學號格式不正確" }, 400);
    if (flags.some((flag) => flag.length > 200)) {
      return json({ ok: false, message: "Flag 過長" }, 400);
    }

    // C-1 白名單：學號必須存在 allowed_students
    const allowed = await env.DB.prepare(`SELECT 1 FROM allowed_students WHERE student_id = ?`)
      .bind(studentId)
      .first();
    if (!allowed) return json({ ok: false, message: "學號不在修課名單內" }, 403);

    // C-2 限速（你可調整）
    const limit = Number(env.RATE_LIMIT_PER_MIN || 5);
    const rl1 = await hitRateLimit(env, `ip:${ip}`, limit);
    if (!rl1.ok) return json({ ok: false, message: rl1.message }, 429);
    const rl2 = await hitRateLimit(env, `sid:${studentId}`, limit);
    if (!rl2.ok) return json({ ok: false, message: rl2.message }, 429);

    // 驗證 Flags
    const demoFlags = [
      String(env.FLAG1 || "FLAG{DEMO_FLAG1}"),
      String(env.FLAG2 || "FLAG{DEMO_FLAG2}"),
      String(env.FLAG3 || "FLAG{DEMO_FLAG3}"),
    ];
    const correctFlags = flags.map((flag, index) => flag === demoFlags[index]);

    const now = Math.floor(Date.now() / 1000);

    // 1) 寫入 submissions（不要存 flag 本文，避免洩漏）
    await env.DB.prepare(`
      INSERT INTO submissions(student_id, name, is_correct, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(studentId, name, correctFlags.every(Boolean) ? 1 : 0, now).run();

    // 2) 更新 players（attempts + last_attempt；第一次答對才寫 first_correct_at）
    const firstCorrectAt = correctFlags.every(Boolean) ? now : null;

    await env.DB.prepare(`
      INSERT INTO players(student_id, name, attempts, last_attempt_at, first_correct_at)
      VALUES (?, ?, 1, ?, ?)
      ON CONFLICT(student_id) DO UPDATE SET
        name = excluded.name,
        attempts = players.attempts + 1,
        last_attempt_at = excluded.last_attempt_at,
        first_correct_at = COALESCE(players.first_correct_at, excluded.first_correct_at);
    `).bind(studentId, name, now, firstCorrectAt).run();

    return json({
      ok: correctFlags.every(Boolean),
      message: correctFlags.every(Boolean)
        ? "✅ 恭喜！所有 Flags 正確"
        : "❌ Flags 錯誤",
    });
  } catch (e) {
    return json({ ok: false, message: "無效的 JSON 或伺服器錯誤" }, 400);
  }
}

// 其他 method 擋掉
export async function onRequest({ request }) {
  if (request.method === "POST") return; // 交給 onRequestPost
  return json({ ok: false, message: "Method not allowed" }, 405);
}
