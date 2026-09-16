import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TIER_NAMES = [
  "데일리 절약템",
  "무난한 데일리템",
  "오래 입을 기본템",
  "특별한 날 스페셜템",
];

interface NaverItem {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
}

function stripTags(s: string) {
  return s.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

function bucketize(items: NaverItem[]) {
  const valid = items
    .filter((i) => Number(i.lprice) > 0)
    .sort((a, b) => Number(a.lprice) - Number(b.lprice));

  if (!valid.length) return [];

  const n = valid.length;
  const size = Math.ceil(n / 4);
  const tiers: {
    tier: string;
    price_range: string;
    items: {
      title: string;
      price: number;
      mall: string;
      image: string;
      link: string;
    }[];
  }[] = [];

  for (let i = 0; i < 4; i++) {
    const slice = valid.slice(i * size, i * size + size);
    if (!slice.length) continue;
    const prices = slice.map((s) => Number(s.lprice));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    tiers.push({
      tier: TIER_NAMES[i],
      price_range:
        min === max
          ? `${min.toLocaleString("ko-KR")}원`
          : `${min.toLocaleString("ko-KR")}~${max.toLocaleString("ko-KR")}원`,
      items: slice.slice(0, 4).map((s) => ({
        title: stripTags(s.title),
        price: Number(s.lprice),
        mall: s.mallName,
        image: s.image,
        link: s.link,
      })),
    });
  }

  return tiers;
}

export async function POST(req: Request) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "서버에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET이 설정되어 있지 않아요." },
      { status: 500 }
    );
  }

  let body: { keywords?: unknown; subcategory?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const keywords = Array.isArray(body.keywords)
    ? body.keywords.filter((k): k is string => typeof k === "string")
    : [];
  const subcategory = typeof body.subcategory === "string" ? body.subcategory : "";

  const query = [subcategory, ...keywords].filter(Boolean).slice(0, 4).join(" ").trim();
  if (!query) {
    return NextResponse.json({ error: "검색어가 없어요." }, { status: 400 });
  }

  const url =
    "https://openapi.naver.com/v1/search/shop.json?" +
    new URLSearchParams({ query, display: "100", sort: "sim" }).toString();

  let naverRes: Response;
  try {
    naverRes = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "네이버 쇼핑 API 호출 중 네트워크 오류가 발생했어요." },
      { status: 502 }
    );
  }

  if (!naverRes.ok) {
    const detail = await naverRes.text().catch(() => "");
    return NextResponse.json(
      { error: `상품 검색에 실패했어요. (${naverRes.status})`, detail },
      { status: 502 }
    );
  }

  const data = await naverRes.json();
  const items: NaverItem[] = Array.isArray(data.items) ? data.items : [];

  return NextResponse.json({ query, tiers: bucketize(items) });
}
