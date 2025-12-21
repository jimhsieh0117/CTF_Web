const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

function isValidStudentId(studentId) {
  return /^C\d{9}$/.test(String(studentId || "").trim());
}

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
    const studentId = String(body.studentId || "").trim();
    const flag = String(body.flag || "").trim();

    // 基本檢查
    if (!studentId || !flag) {
      return json({ ok: false, message: "請填寫所有欄位" }, 400);
    }
    if (!isValidStudentId(studentId)) {
      return json({ ok: false, message: "學號格式不正確（需為 C 加上 9 碼數字）" }, 400);
    }
    if (flag.length > 200) {
      return json({ ok: false, message: "Flag 過長" }, 400);
    }

    // 本專案不再收集姓名；為了維持既有 DB schema（submissions.name / players.name NOT NULL），
    // 會用 studentId 當作 name 欄位的值。
    const name = studentId;

    // ===== 白名單設定（測試開關） =====
    // 你要「開/關白名單限制」請改 Cloudflare Pages 專案的環境變數（Secrets）：WHITELIST_ENABLED
    // - 預設（未設定）：視為 true（啟用白名單）
    // - 設為 0 / false / off / no（不分大小寫）：關閉白名單（方便測試）
    // 設定方式（PowerShell）：
    //   wrangler pages secret put WHITELIST_ENABLED --project-name ctf-web
    //   然後輸入 0 或 1
    const whitelistEnabled = (() => {
      const v = env.WHITELIST_ENABLED;
      if (v === undefined || v === null) return true;
      const s = String(v).trim().toLowerCase();
      return !(s === "0" || s === "false" || s === "off" || s === "no");
    })();

    // C-1 白名單：學號必須存在 allowed_students
    // 你要「修改白名單名單」請改 D1 資料庫的 allowed_students 表（新增/刪除 student_id）
    // 例：
    //   wrangler d1 execute polyglot-ctf --remote --command "INSERT INTO allowed_students(student_id) VALUES ('C111151142');"
    //   wrangler d1 execute polyglot-ctf --remote --command "DELETE FROM allowed_students WHERE student_id='C111151142';"
    if (whitelistEnabled) {
      const allowed = await env.DB.prepare(`SELECT 1 FROM allowed_students WHERE student_id = ?`)
        .bind(studentId)
        .first();
      if (!allowed) return json({ ok: false, message: "學號不在修課名單內" }, 403);
    }

    // C-2 限速（你可調整）
    const limit = Number(env.RATE_LIMIT_PER_MIN || 5);
    const rl1 = await hitRateLimit(env, `ip:${ip}`, limit);
    if (!rl1.ok) return json({ ok: false, message: rl1.message }, 429);
    const rl2 = await hitRateLimit(env, `sid:${studentId}`, limit);
    if (!rl2.ok) return json({ ok: false, message: rl2.message }, 429);

    // 驗證 Flags
    const flags = [env.FLAG1, env.FLAG2, env.FLAG3].map((v) =>
      v === undefined || v === null ? "" : String(v)
    );
    if (flags.some((f) => !f)) {
      return json({ ok: false, message: "伺服器尚未設定 FLAG1/FLAG2/FLAG3" }, 500);
    }

    const flagIndex = flags.findIndex((f) => flag === f) + 1; // 1..3 or 0

    const now = Math.floor(Date.now() / 1000);

    // 1) 寫入 submissions（只記錄「答對」的旗子；不要存 flag 本文，避免洩漏）
    //    規則：每個 flag_index 每位學生只能成功繳交一次（由 DB UNIQUE(student_id, flag_index) 保證）
    let newlyAccepted = 0;
    if (flagIndex === 0) {
      // 不寫入 submissions（避免被刷爆），只記錄 attempts
    } else {
      const exists = await env.DB.prepare(
        `SELECT 1 FROM submissions WHERE student_id = ? AND flag_index = ? LIMIT 1`
      )
        .bind(studentId, flagIndex)
        .first();

      if (!exists) {
        try {
          await env.DB.prepare(`
            INSERT INTO submissions(student_id, name, flag_index, is_correct, created_at)
            VALUES (?, ?, ?, 1, ?)
          `)
            .bind(studentId, name, flagIndex, now)
            .run();
          newlyAccepted = 1;
        } catch {
          // 可能因 UNIQUE(student_id, flag_index) 競態而失敗，視為已繳交過
        }
      }
    }

    // 2) 更新 players（attempts + last_attempt；第一次答對任一旗才寫 first_correct_at）
    const firstCorrectAt = newlyAccepted > 0 ? now : null;

    await env.DB.prepare(`
      INSERT INTO players(student_id, name, attempts, last_attempt_at, first_correct_at)
      VALUES (?, ?, 1, ?, ?)
      ON CONFLICT(student_id) DO UPDATE SET
        name = excluded.name,
        attempts = players.attempts + 1,
        last_attempt_at = excluded.last_attempt_at,
        first_correct_at = COALESCE(players.first_correct_at, excluded.first_correct_at);
    `).bind(studentId, name, now, firstCorrectAt).run();

    if (flagIndex === 0) {
      return json({ ok: false, message: "❌ Flag 錯誤" });
    }

    if (newlyAccepted > 0) {
      return json({ ok: true, message: `✅ Flag 正確，已接受` });
    }
    return json({ ok: false, message: `⚠️ Flag 已繳交過` });
  } catch (e) {
    return json({ ok: false, message: "無效的 JSON 或伺服器錯誤" }, 400);
  }
}

// 其他 method 擋掉
export async function onRequest({ request }) {
  if (request.method === "POST") return; // 交給 onRequestPost
  return json({ ok: false, message: "Method not allowed" }, 405);
}
