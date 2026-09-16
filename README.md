# Find Fashion

옷 사진을 업로드하면 Google Gemini가 스타일을 분석하고, 네이버 쇼핑 검색 API로
실제 상품을 찾아 가격대별(데일리 절약템 / 무난한 데일리템 / 오래 입을 기본템 /
특별한 날 스페셜템)로 보여주는 웹앱입니다.

- 이미지 분석: Google Gemini API (`gemini-2.5-flash`, **무료 티어 / 카드 등록 불필요**)
- 상품 검색: 네이버 쇼핑 검색 API (실제 판매 상품, 실제 가격, 실제 구매 링크, 무료)
- 프레임워크: Next.js 14 (App Router) + TypeScript

두 API 모두 무료 티어만으로 충분히 동작하므로, 과제/포트폴리오 용도로 쓸 때
비용 걱정 없이 그대로 배포할 수 있습니다. (단, 무료 티어는 분당·일일 요청 수
제한이 있으니 아주 많은 트래픽이 몰리는 서비스로는 별도 유료 전환이 필요해요.)

## 1. API 키 발급

### Google Gemini API 키 (무료)
1. https://aistudio.google.com/apikey 접속 (구글 계정으로 로그인)
2. "Create API key" 클릭 → 새 프로젝트 또는 기존 프로젝트 선택
3. `AIza`로 시작하는 키를 복사 (신용카드 등록 없이 바로 발급됩니다)

### 네이버 쇼핑 검색 API 키
1. https://developers.naver.com/apps/#/register 접속
2. 애플리케이션 등록 → 사용 API에서 "검색" 체크
3. 등록 후 발급되는 Client ID / Client Secret 확인
   (별도 심사 없이 즉시 발급되며, 무료 티어는 하루 25,000회 호출 제공)

## 2. 로컬에서 실행하기

```bash
npm install
cp .env.example .env.local
```

`.env.local` 파일을 열어 아래 값을 채워주세요.

```
GEMINI_API_KEY=AIza여기에-키-입력
NAVER_CLIENT_ID=여기에-Client-ID-입력
NAVER_CLIENT_SECRET=여기에-Client-Secret-입력
```

그다음 개발 서버 실행:

```bash
npm run dev
```

http://localhost:3000 접속해서 확인합니다.

## 3. GitHub에 올리기

```bash
git init
git add .
git commit -m "Find Fashion: 옷 사진 기반 가격대별 상품 추천"
```

GitHub에서 새 저장소를 만든 뒤 (Private/Public 무관):

```bash
git remote add origin https://github.com/사용자명/저장소명.git
git branch -M main
git push -u origin main
```

`.env.local`은 `.gitignore`에 포함되어 있어 자동으로 제외되니,
API 키가 실수로 커밋되는 걱정은 하지 않아도 됩니다.

## 4. Vercel로 배포하기

1. https://vercel.com 접속 후 GitHub 계정으로 로그인
2. "Add New" → "Project" → 방금 만든 GitHub 저장소 선택 → Import
3. **Environment Variables**에 아래 3개를 반드시 추가:
   - `GEMINI_API_KEY`
   - `NAVER_CLIENT_ID`
   - `NAVER_CLIENT_SECRET`
4. Deploy 클릭

배포가 끝나면 `https://저장소명.vercel.app` 같은 주소로 바로 접속할 수 있습니다.
이후 GitHub에 `git push`할 때마다 Vercel이 자동으로 재배포합니다.

## 폴더 구조

```
app/
  layout.tsx          레이아웃, 폰트, 메타데이터
  page.tsx            업로드 UI + 결과 화면 (클라이언트 컴포넌트)
  globals.css         전역 스타일
  api/
    analyze/route.ts  이미지 → Gemini Vision 분석 (실제 API 호출, 무료 티어)
    search/route.ts   분석 키워드 → 네이버 쇼핑 검색 (실제 API 호출)
```

## 참고 / 한계

- 네이버 쇼핑 API 특성상 결제/재고 실시간 확인은 되지 않습니다. 가격·판매 여부는
  구매 링크를 눌러 판매처에서 최종 확인해야 합니다.
- 가격대 4구간은 검색된 상품들의 가격을 정렬해 4등분한 결과이며, 카테고리마다
  실제 가격 폭이 다르므로 구간 경계는 검색할 때마다 달라질 수 있습니다.
- 이미지 분석에 실패하거나("확인 어려움") 검색 결과가 없을 경우 화면에 안내
  문구가 표시됩니다.
