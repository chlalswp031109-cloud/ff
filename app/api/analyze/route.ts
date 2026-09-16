import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ANALYZE_PROMPT = `첨부한 이미지 속 의류 아이템 한 가지를 분석해줘.
여러 아이템이 보이면 가장 크고 중심이 되는 것 하나만 분석해.
반드시 아래 JSON 형식으로만 답하고, 그 외의 설명이나 문장, 코드블록 표시는 절대 포함하지 마.

{
  "category": "대분류 (예: 아우터/상의/하의/원피스/신발/가방)",
  "subcategory": "구체적 종류 (예: 크롭 가디건)",
  "colors": ["주요 색상 최대 3개"],
  "pattern": "패턴 (예: 무지, 스트라이프, 체크)",
  "material_guess": "소재 추정",
  "style_tags": ["스타일 태그 3~5개"],
  "fit_silhouette": "핏/실루엣 한 줄 설명",
  "notable_details": ["눈에 띄는 디테일 1~3개"],
  "season": "적합 계절",
  "search_keywords": ["쇼핑 검색에 쓸 키워드 3~6개, 구체적인 상품명 형태로"]
}

이미지에 옷이 명확히 보이지 않으면 모든 문자열 필드에 "확인 어려움"을 넣어.`;

function isSupportedImage(type: string) {
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type);
}

const GEMINI_MODEL = "gemini-2.5-flash";

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "서버에 GEMINI_API_KEY가 설정되어 있지 않아요." },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "이미지 파일이 필요해요." }, { status: 400 });
  }
  if (!isSupportedImage(file.type)) {
    return NextResponse.json(
      { error: "JPG, PNG, WEBP, GIF 형식의 이미지만 업로드할 수 있어요." },
      { status: 400 }
    );
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "이미지 용량은 10MB 이하여야 해요." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  let geminiRes: Response;
  try {
    geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          input: [
            { type: "text", text: ANALYZE_PROMPT },
            { type: "image", data: base64, mime_type: file.type },
          ],
        }),
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Gemini API 호출 중 네트워크 오류가 발생했어요." },
      { status: 502 }
    );
  }

  if (!geminiRes.ok) {
    const detail = await geminiRes.text().catch(() => "");
    return NextResponse.json(
      { error: `이미지 분석에 실패했어요. (${geminiRes.status})`, detail },
      { status: 502 }
    );
  }

  const data = await geminiRes.json();
  const steps: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> =
    Array.isArray(data?.steps) ? data.steps : [];
  const modelStep = steps.find((s) => s.type === "model_output");
  const text: string | undefined = modelStep?.content?.find(
    (c) => typeof c.text === "string"
  )?.text;

  if (!text) {
    return NextResponse.json(
      { error: "분석 결과를 받지 못했어요.", detail: data },
      { status: 502 }
    );
  }

  let analysis: unknown;
  try {
    const jsonStr = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    analysis = JSON.parse(jsonStr);
  } catch {
    return NextResponse.json(
      { error: "분석 결과를 해석하지 못했어요.", raw: text },
      { status: 502 }
    );
  }

  return NextResponse.json({ analysis });
}

