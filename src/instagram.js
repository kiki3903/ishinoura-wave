const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
const INSTAGRAM_ACCOUNT_ID   = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "";

export async function postToInstagram(videoUrl, caption) {
  console.log("  Instagram: メディアコンテナ作成中...");
  const containerRes = await fetch(
    `https://graph.facebook.com/v20.0/${INSTAGRAM_ACCOUNT_ID}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption,
        share_to_feed: true,
        access_token: INSTAGRAM_ACCESS_TOKEN,
      }),
    }
  );
  const container = await containerRes.json();
  if (!container.id) throw new Error(`コンテナ作成失敗: ${JSON.stringify(container)}`);
  console.log(`  Container ID: ${container.id}`);

  console.log("  動画処理中...");
  let status = "IN_PROGRESS";
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const statusRes = await fetch(
      `https://graph.facebook.com/v20.0/${container.id}?fields=status_co
