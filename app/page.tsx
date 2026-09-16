"use client";

import { useRef, useState } from "react";

interface Analysis {
  category?: string;
  subcategory?: string;
  colors?: string[];
  pattern?: string;
  material_guess?: string;
  style_tags?: string[];
  fit_silhouette?: string;
  notable_details?: string[];
  season?: string;
  search_keywords?: string[];
}

interface TierItem {
  title: string;
  price: number;
  mall: string;
  image: string;
  link: string;
}

interface Tier {
  tier: string;
  price_range: string;
  items: TierItem[];
}

const TIER_COLORS: Record<string, string> = {
  "데일리 절약템": "var(--sage)",
  "무난한 데일리템": "var(--tag-string)",
  "오래 입을 기본템": "var(--mustard)",
  "특별한 날 스페셜템": "var(--tag-string-deep)",
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPreviewUrl(null);
    setFileName("");
    setStatus(null);
    setAnalysis(null);
    setTiers(null);
    setQuery("");
  }

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      setStatus({ text: "이미지 파일(JPG·PNG·WEBP·GIF)만 업로드할 수 있어요.", error: true });
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
    setAnalysis(null);
    setTiers(null);
    setStatus({ text: "사진 속 옷을 분석하고 있어요…" });

    try {
      const formData = new FormData();
      formData.append("image", file);
      const analyzeRes = await fetch("/api/analyze", { method: "POST", body: formData });
      const analyzeData = await analyzeRes.json();

      if (!analyzeRes.ok) {
        setStatus({ text: analyzeData.error || "분석 중 문제가 생겼어요.", error: true });
        return;
      }

      const a: Analysis = analyzeData.analysis;
      setAnalysis(a);

      if (String(a.category || "").includes("확인 어려움")) {
        setStatus({ text: "" });
        return;
      }

      setStatus({ text: "가격대별 실제 상품을 찾고 있어요…" });

      const searchRes = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          keywords: a.search_keywords || [],
          subcategory: a.subcategory,
        }),
      });
      const searchData = await searchRes.json();

      if (!searchRes.ok) {
        setStatus({ text: searchData.error || "상품 검색 중 문제가 생겼어요.", error: true });
        return;
      }

      setQuery(searchData.query || "");
      setTiers(searchData.tiers || []);
      setStatus(null);
    } catch {
      setStatus({ text: "네트워크 오류가 발생했어요. 다시 시도해주세요.", error: true });
    }
  }

  return (
    <div className="wrap">
      <div className="hero">
        <h1>Find Fashion</h1>
        <p>Find your own style</p>
      </div>

      <div className="tag-upload">
        <div className="tag-string" />
        <div
          className={`tag-body${dragOver ? " dragover" : ""}`}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          <div className="tag-hole" />
          <span className="upload-icon">🏷️</span>
          <div className="upload-title">옷 사진을 여기에 끌어다 놓으세요</div>
          <div className="upload-sub">또는 탭해서 사진 선택 (JPG · PNG · WEBP)</div>
          <span className="upload-btn">사진 선택하기</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>
      </div>

      {previewUrl && (
        <div className="preview-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="업로드한 옷 사진 미리보기" className="preview-thumb" />
          <div className="preview-info">
            <div className="preview-name">{fileName}</div>
          </div>
          <button type="button" className="reset-btn" onClick={reset}>
            다시 선택
          </button>
        </div>
      )}

      {status && status.text && (
        <div className={`status${status.error ? " error" : ""}`}>
          {!status.error && <span className="spinner" />}
          {status.text}
        </div>
      )}

      {analysis && !String(analysis.category || "").includes("확인 어려움") && (
        <div className="analysis">
          <h2>{analysis.subcategory || analysis.category}</h2>
          <div className="sub">
            {analysis.category}
            {analysis.season ? ` · ${analysis.season}` : ""}
          </div>
          <dl className="spec-grid">
            <div className="spec-row">
              <dt>색상</dt>
              <dd>{(analysis.colors || []).join(", ") || "-"}</dd>
            </div>
            <div className="spec-row">
              <dt>패턴</dt>
              <dd>{analysis.pattern || "-"}</dd>
            </div>
            <div className="spec-row">
              <dt>소재 추정</dt>
              <dd>{analysis.material_guess || "-"}</dd>
            </div>
            <div className="spec-row">
              <dt>핏 / 실루엣</dt>
              <dd>{analysis.fit_silhouette || "-"}</dd>
            </div>
            <div className="spec-row full">
              <dt>스타일</dt>
              <div className="chip-row">
                {(analysis.style_tags || []).map((t) => (
                  <span className="chip" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </dl>
        </div>
      )}

      {analysis && String(analysis.category || "").includes("확인 어려움") && (
        <div className="analysis">
          <h2>사진 속 옷을 알아보기 어려워요</h2>
          <p className="sub">옷이 화면 중앙에 크고 또렷하게 나오도록 다시 찍어서 올려주세요.</p>
        </div>
      )}

      {query && <div className="query-note">&quot;{query}&quot; 로 네이버 쇼핑에서 검색한 실제 상품이에요.</div>}

      {tiers && (
        <div className="tiers">
          {tiers.map((t) => (
            <div className="tier" key={t.tier}>
              <div className="tier-head" style={{ ["--tier-color" as string]: TIER_COLORS[t.tier] }}>
                <h3>{t.tier}</h3>
                <span className="tier-price">{t.price_range}</span>
              </div>
              {t.items.length ? (
                <div className="tier-items">
                  {t.items.map((it) => (
                    <a
                      className="item-card"
                      href={it.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      key={it.link}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.image} alt={it.title} loading="lazy" />
                      <div className="item-body">
                        <div className="item-name">{it.title}</div>
                        <div className="item-price">{it.price.toLocaleString("ko-KR")}원</div>
                        <div className="item-mall">{it.mall}</div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="empty-note">이 가격대의 상품을 찾지 못했어요.</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="footer-note">
        상품 정보는 네이버 쇼핑 검색 결과 기준이며, 실제 재고·가격은 판매처에서 다시 확인해주세요.
      </div>
    </div>
  );
}
