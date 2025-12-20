const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

function isWhitelistEnabled(env) {
  const v = env.WHITELIST_ENABLED;
  if (v === undefined || v === null) return true;
  const s = String(v).trim().toLowerCase();
  return !(s === "0" || s === "false" || s === "off" || s === "no");
}

function isValidStudentId(studentId) {
  return /^C\d{9}$/.test(String(studentId || "").trim());
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "無效的 JSON" }, 400);
  }

  const studentId = String(body?.studentId || "").trim();
  if (!studentId) return json({ ok: false, message: "請輸入學號" }, 400);
  if (!isValidStudentId(studentId)) {
    return json({ ok: false, message: "學號格式不正確（需為 C 加上 9 碼數字，例如 C111151112）" }, 400);
  }

  // 依 submit.js 同規則：預設啟用白名單
  if (isWhitelistEnabled(env)) {
    const allowed = await env.DB.prepare(
      `SELECT 1 FROM allowed_students WHERE student_id = ?`
    )
      .bind(studentId)
      .first();

    if (!allowed) return json({ ok: false, message: "學號不在修課名單內" }, 403);
  }

  const { results } = await env.DB.prepare(
    `SELECT flag_index
     FROM submissions
     WHERE student_id = ? AND is_correct = 1
     GROUP BY flag_index
     ORDER BY flag_index ASC;`
  )
    .bind(studentId)
    .all();

  const solvedFlags = Array.isArray(results)
    ? results
        .map((r) => Number(r.flag_index))
        .filter((n) => Number.isFinite(n) && n >= 1)
    : [];

  const solvedCount = solvedFlags.length;

  return json({
    ok: true,
    data: {
      studentId,
      solvedFlags,
      solvedCount,
      unlocked: {
        chapter2: solvedCount >= 1,
        chapter3: solvedCount >= 2,
        epilogue: solvedCount >= 3,
      },
    },
  });
}

export async function onRequest({ request }) {
  if (request.method === "POST") return; // 交給 onRequestPost
  return json({ ok: false, message: "Method not allowed" }, 405);
}
