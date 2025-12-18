export async function onRequest(context) {
    const { request } = context;

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await request.json();
        const { name, studentId, flag } = body;

        if (!name || !studentId || !flag) {
            return new Response(JSON.stringify({ ok: false, message: '所有欄位皆為必填' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (name.length > 50 || studentId.length > 20 || flag.length > 100) {
            return new Response(JSON.stringify({ ok: false, message: '欄位長度超過限制' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 假回應，未來可接資料庫驗證
        return new Response(JSON.stringify({ ok: true, message: '提交成功' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ ok: false, message: '無效的 JSON 格式' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}