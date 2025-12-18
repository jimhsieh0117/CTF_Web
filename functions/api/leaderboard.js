export async function onRequest(context) {
    // 假資料
    const fakeLeaderboard = [
        { name: 'Alice', studentId: 'S12345', time: '2025-12-18 10:00' },
        { name: 'Bob', studentId: 'S23456', time: '2025-12-18 10:05' },
        { name: 'Charlie', studentId: 'S34567', time: '2025-12-18 10:10' },
        { name: 'David', studentId: 'S45678', time: '2025-12-18 10:15' },
        { name: 'Eve', studentId: 'S56789', time: '2025-12-18 10:20' }
    ];

    return new Response(JSON.stringify({ ok: true, data: fakeLeaderboard }), {
        headers: { 'Content-Type': 'application/json' },
    });
}