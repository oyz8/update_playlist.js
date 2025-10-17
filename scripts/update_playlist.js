// scripts/update_playlist.js
import fs from "fs";
import fetch from "node-fetch";

const API_BASE = "https://music-api.gdstudio.xyz/api.php";
const PLAYLIST_PATH = "./playlist.json";
const OUTPUT_PATH = "./playlist.json";
const MAX_PER_MINUTE = 60; // 防止触发限制
const DELAY = 60000 / MAX_PER_MINUTE; // 每次请求间隔

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("📀 正在读取 playlist.json...");
  const playlist = JSON.parse(fs.readFileSync(PLAYLIST_PATH, "utf-8"));
  const updated = [];

  for (const [index, song] of playlist.entries()) {
    const { title, source = "netease", id } = song;
    const name = title.split(" - ")[0].trim();

    const url = `${API_BASE}?types=search&source=${source}&name=${encodeURIComponent(name)}&count=20&pages=1`;
    console.log(`🎧 [${index + 1}/${playlist.length}] 搜索 ${name} (${source})...`);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`请求失败 ${res.status}`);
      const list = await res.json();

      const match = list.find((s) => Number(s.id) === Number(id)) || list[0];
      if (!match) {
        console.warn(`⚠️ 未找到 ${name}`);
        updated.push({
          id,
          name,
          album: "未找到匹配",
          pic: "",
          lrc: id,
          source,
        });
      } else {
        updated.push({
          id: match.id,
          name: match.name,
          album: match.artist?.join(", ") || match.album || "未知",
          pic: match.pic_id || "",
          url: match.url_id || match.id,
          lrc: match.lyric_id || match.id,
          source: match.source || source,
        });
        console.log(`✅ 匹配成功: ${match.name}`);
      }
    } catch (err) {
      console.error(`❌ ${name} 处理失败:`, err.message);
      updated.push({ id, name, album: "错误", pic: "", url: id, lrc: id, source });
    }

    await sleep(DELAY); // 控制频率，避免超速
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(updated, null, 2));
  console.log(`✅ 全部完成！共更新 ${updated.length} 首歌`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
