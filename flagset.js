// ===== 小工具：安全抓 JSON（就算 API 回傳不是 JSON 也能顯示錯） =====
async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { ok: false, message: text || "Non-JSON response" }; }
  if (!res.ok) {
    // 讓錯誤也用同一套格式
    throw Object.assign(new Error(data.message || `HTTP ${res.status}`), { data, status: res.status });
  }
  return data;
}

// ===== 星星 =====
function buildStars() {
  const host = document.getElementById("starHost");
  if (!host) return;

  const n = 80;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const s = document.createElement("div");
    s.className = "star" + (i % 11 === 0 ? " s3" : (i % 7 === 0 ? " s2" : ""));
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.animationDelay = `${-(Math.random() * 5).toFixed(2)}s`;
    frag.appendChild(s);
  }
  host.appendChild(frag);
}

// ===== Waves parallax（可有可無） =====
function bindWaves() {
  const layers = document.querySelectorAll(".wave-layer");
  if (!layers.length) return;

  let x = 0;
  function tick() {
    x += 0.6;
    layers.forEach(layer => {
      const speed = Number(layer.dataset.speed || 50);
      layer.style.transform = `translate3d(${-(x * (100 / speed))}px,0,0)`;
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ===== Modal =====
function bindModal() {
  document.querySelectorAll("[data-modal-trigger]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-modal-trigger");
      const modal = document.getElementById(id);
      if (modal) modal.style.display = "flex";
    });
  });

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    const closeBtn = overlay.querySelector(".modal-close-btn");
    closeBtn?.addEventListener("click", () => overlay.style.display = "none");

    overlay.addEventListener("click", (e) => {
      if (overlay.dataset.modalBackgroundClick === "true" && e.target === overlay) {
        overlay.style.display = "none";
      }
    });
  });
}

// ===== UI：訊息 =====
function showMessage(ok, msg) {
  const box = document.getElementById("message");
  if (!box) return;
  box.innerHTML = `<div class="msg ${ok ? "ok" : "err"}">${msg}</div>`;
}

// ===== 解析 leaderboard：容錯（ok/data vs success/leaderboard） =====
function normalizeLeaderboard(payload) {
  if (!payload) return [];
  // 常見格式 1：{ ok:true, data:[...] }
  if (Array.isArray(payload.data)) return payload.data;
  // 常見格式 2：{ success:true, leaderboard:[...] }
  if (Array.isArray(payload.leaderboard)) return payload.leaderboard;
  // 其他：直接是 array
  if (Array.isArray(payload)) return payload;
  return [];
}

// ===== 渲染排行榜（跟老師風格像） =====
function renderRankList(list, targetOl) {
  if (!targetOl) return;
  targetOl.innerHTML = "";

  const max = Math.max(...list.map(x => Number(x.count ?? x.submissions ?? x.score ?? 0)), 1);

  list.forEach((row, idx) => {
    const studentId = row.studentId ?? row.no ?? row.id ?? "";
    const name = row.name ?? row.studentName ?? "Unknown";
    const count = Number(row.count ?? row.submissions ?? row.score ?? 0);

    const li = document.createElement("li");
    const topClass = idx === 0 ? " top1" : (idx === 1 ? " top2" : (idx === 2 ? " top3" : ""));
    li.className = `rank-item${topClass}`;

    const pct = Math.round((count / max) * 100);

    li.innerHTML = `
      <div class="rank-num">${idx + 1}</div>
      <div class="rank-main">
        <div class="rank-line">
          <span class="rank-name">${escapeHtml(name)}</span>
          <span class="rank-chips">
            <span class="chip submissions"><i class="bi bi-flag-fill"></i> ${count}</span>
            ${studentId ? `<span class="rank-id">${escapeHtml(studentId)}</span>` : ``}
          </span>
        </div>
        <div class="rank-bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>
    `;
    targetOl.appendChild(li);
  });
}

// ===== HTML escape =====
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}

// ===== API：載入排行榜 =====
async function loadLeaderboard() {
  // 你的 functions 若是 /api/leaderboard 就維持這樣
  const payload = await fetchJson("/api/leaderboard", { method: "GET" });
  const list = normalizeLeaderboard(payload);

  renderRankList(list, document.getElementById("rankList"));
  renderRankList(list, document.getElementById("rankListModal"));
}

// ===== API：上繳 =====
async function submitFlag(studentId, flag) {
  const payload = await fetchJson("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, flag })
  });

  // 容錯取訊息
  const ok = payload.ok ?? payload.success ?? false;
  const msg = payload.message ?? (ok ? "提交成功" : "提交失敗");
  return { ok, msg };
}

// ===== 查詢（如果你有 /api/search） =====
async function searchById(studentId) {
  // 兩種常見 query 參數都試（studentId / no）
  try {
    return await fetchJson(`/api/search?studentId=${encodeURIComponent(studentId)}`, { method: "GET" });
  } catch {
    return await fetchJson(`/api/search?no=${encodeURIComponent(studentId)}`, { method: "GET" });
  }
}

function bindForms() {
  // submit
  document.getElementById("submitForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentId = document.getElementById("studentId").value.trim();
    const flag = document.getElementById("flag").value.trim();

    try {
      const { ok, msg } = await submitFlag(studentId, flag);
      showMessage(ok, msg);
      if (ok) {
        document.getElementById("flag").value = "";
        await loadLeaderboard();
      }
    } catch (err) {
      showMessage(false, err?.data?.message || err.message || "提交失敗");
    }
  });

  // refresh
  document.getElementById("btnRefresh")?.addEventListener("click", async () => {
    try {
      await loadLeaderboard();
      showMessage(true, "已更新榜單");
    } catch (err) {
      showMessage(false, err?.data?.message || err.message || "更新失敗");
    }
  });

  // search
  document.getElementById("searchForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const no = document.getElementById("searchNo").value.trim();
    const out = document.getElementById("searchResult");
    out.textContent = "查詢中…";

    try {
      const payload = await searchById(no);
      const ok = payload.ok ?? payload.success ?? false;

      if (!ok) {
        out.textContent = payload.message || "查無資料";
        return;
      }

      const rows = payload.data || payload.rows || [];
      if (!rows.length) {
        out.textContent = "查無資料";
        return;
      }

      // 你之前貼的格式：{studentId,name,time}
      const r0 = rows[0];
      const sid = r0.studentId ?? no;
      const name = r0.name ?? "Unknown";
      const time = r0.time ?? "";
      out.textContent = `學號：${sid}｜姓名：${name}${time ? `｜最新提交：${time}` : ""}`;

    } catch (err) {
      out.textContent = "未提供查詢 API /api/search 或發生錯誤";
    }
  });
}

(async function init(){
  buildStars();
  bindWaves();
  bindModal();

  bindForms();
  try { await loadLeaderboard(); } catch (e) { /* 初次載入失敗就算了 */ }
})();
