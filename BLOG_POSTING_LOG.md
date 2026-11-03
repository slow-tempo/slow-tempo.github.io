# 블로그 글 작성 공용 기록 (Muse · Antigravity)

> 이 파일이 하나뿐인 공용 기록이다. Muse도 Antigravity도 블로그 글을 건드리기 전에
> 이 파일을 먼저 읽고, 글을 바꾸면 아래 "변경 기록"에 한 줄을 추가한다.
> 위치: 블로그 저장소 루트 (`slow-tempo-blog/BLOG_POSTING_LOG.md`).
> Astro는 `src/pages`만 페이지로 만들므로, 이 루트 파일은 사이트에 노출되지 않는다.
> 아직 커밋·푸시되지 않은 상태면 상대 에이전트는 못 보니까, 공유할 때는 꼭 푸시까지 한다.

## 0. 원칙 — 사용자가 직접 결정한 것

- **기준은 메인 페이지가 아니라 포스팅 글 페이지** (`src/pages/posts/[slug].astro` + `src/layouts/BaseLayout.astro` + `src/styles/global.css`)이다.
  메인 페이지(`src/pages/index.astro`)는 이 기록의 판단 기준이 아니다. 메인만 보고 포스팅을 고치지 않는다.
- **글 내용은 사용자가 직접 보고 결정한다.** 에이전트가 내용(설명, 순서, 결론)을
  마음대로 고쳐 쓰지 않는다. 내용 수정이 필요하면 먼저 사용자에게 확인한다.
- 에이전트가 마음대로 해도 되는 범위: 코드·스타일·링크·표기 같은 형식 일관성,
  단, 아래 "미결" 항목은 사용자 결정이 나기 전에는 건드리지 않는다.

## 1. 현재 글 목록 (2026-11-03 확인, dl `~/slow-tempo-blog` 기준)

| 파일 | 제목 (frontmatter) | 날짜 | 카테고리 | 태그 | 분량 |
| --- | --- | --- | --- | --- | --- |
| `src/content/posts/00_cmake_qt_ros2_learning_index.md` | CMake · Qt · ROS 2 학습 목차 | 2026-08-23 | CMake | CMake, Build | 133줄 |
| `src/content/posts/01_cmake_introduction.md` | CMake란 무엇인가? | 2026-08-24 | CMake | CMake, Build, Cpp | 172줄 |
| `src/content/posts/02_pure_cmake_library_package.md` | CMake로 Pure C++ Library 만들기 | 2026-08-25 | CMake | CMake, Build, Cpp | 251줄 |
| `src/content/posts/03_pure_qt_cmake_library.md` | Pure Qt Library를 CMake로 만들기 | 2026-08-26 | CMake | CMake, Build, Cpp, Qt | 244줄 |
| `src/content/posts/04_ros2_cmake_application.md` | CMake 4장 - ROS 2 C++ Application 만들기 | 2026-08-27 | CMake | CMake, Build, Cpp, ROS2 | 574줄 |
| `src/content/posts/05_ros2_cpp_application.md` | CMake 5장 - Pure C++ Library를 ROS 2 Application에 연결하기 | 2026-08-28 | CMake | CMake, Build, Cpp, ROS2 | 557줄 |
| `src/content/posts/06_ros2_qt_cpp Application.md` | CMake 6장 - ROS 2 Application에서 Pure CMake와 Qt 패키지 통합하기 | 2026-08-28 | CMake | CMake, Build, Cpp, ROS2, Qt | 1543줄 |

공통점 (새 글도 이 형태를 유지한다):
- frontmatter: `title / date / category / tags / summary` (스키마 `src/content.config.ts`와 동일).
- 본문 제목은 `##`부터 시작한다. `#` 제목은 쓰지 않는다 (글 제목은 `h1#post-title`이 따로 있다).
- 본문에 이미지·외부 링크가 없다. 수식(`$$`)도 아직 없다. 수식을 쓸 때만 KaTeX가 의미가 있다.
- 모든 글의 `category`가 `CMake` 하나다. 카테고리가 늘어나기 전에는 카테고리 뱃지가 사실상 장식이다.

## 2. 포스팅 페이지 기준 디자인 (지금 코드 기준)

- 본문 카드: 고정폭 `820px` + 목차 `280px` + 간격 `16px` (`[slug].astro`).
  화면 1200px 이상 = 목차 항상 펼침, 1100~1199px = 남는 폭만큼 목차 축소(최소 180px),
  1100px 미만 = 목차는 오른쪽 고정 2rem 손잡이 + 오버레이로만 연다.
- 본문 글꼴: `#articleContent`는 Pretendard, 제목 `#post-title`은 Pretendard ExtraBold.
  단, 아래 3번 문제 때문에 실제로는 일부가 Pretendard가 아닐 수 있다. 고치기 전에는
  "Pretendard로 보인다"고 단정하지 않는다.
- 목차(Index): 글 제목 + `h2/h3`만 나열, `h3`은 10px 들여쓰기. 현재 글은 `h2/h3`만 쓰므로 이 규칙에 맞는다.
- 헤더에 보이는 것: 카테고리 뱃지 + 날짜 + 제목. `tags`와 `summary`는 포스팅 페이지에
  표시되지 않는다 (메인에서만 쓰인다). 포스팅에서 태그를 보여주고 싶으면 별도 결정이 필요하다.

## 3. 일관성 문제 목록 (2026-11-03 코드 대조 결과 — 아직 고치지 않음)

고침 여부는 사용자 결정 뒤에 한다. 번호는 이 기록에서 그대로 쓴다.

1. **플로팅 버튼 스타일 없음 (포스팅 페이지에서 실제로 깨짐).**
   `BaseLayout.astro`의 맨 위 / 맨 아래 / 공유 버튼은 `floating-actions` / `floating-action`
   클래스만 있고, `global.css`나 어느 `<style>`에도 정의가 없다. 그래서 화면에
   고정되지 않고 본문 아래 일반 흐름으로 쌓인다. 고치려면 위치·크기·배경을 새로 정의해야 한다.
2. **BaseLayout의 패널 스크립트가 포스팅에서 동작하지 않음.**
   `BaseLayout` 스크립트는 `[data-responsive-panel] / [data-panel-handle] / [data-panel-icon]`을
   찾는데, 포스팅 목차는 `id="tocSidebar" / "tocHandle"`이라서 매칭이 안 된다.
   포스팅 목차는 `[slug].astro` 안의 별도 스크립트(약 2,400줄)가 담당한다.
   두 패널 로직이 중복으로 존재하고, 공용 쪽은 포스팅에서 죽은 코드다.
3. **글꼴이 세 갈래로 갈림.**
   - `global.css`: Pretendard 로컬 폰트(`public/fonts/`)를 지정.
   - `BaseLayout`: Google Fonts Inter + Noto Sans KR을 불러오지만, Tailwind 기본
     `font-sans`에는 이 폰트가 연결돼 있지 않아 실제로는 안 쓰이고 로딩만 된다.
   - `#post-title`은 `global.css`에서 `2rem` 고정이라, `[slug].astro`의
     `text-xl sm:text-3xl`은 ID 선택자에 밀려 반응형으로 안 바뀐다.
     본문 `p/li`도 `#articleContent` 규칙이 `text-sm sm:text-base`를 이긴다.
   - `@font-face`의 `format("ttf")`는 표준 형식이 아니다 (`"truetype"`이 맞다).
     Pretendard는 Regular/Bold/ExtraBold만 정의돼 있고, Light/Medium/SemiBold/Black
     파일은 `public/fonts/`에 있는데 로딩 정의가 없다.
4. **댓글 섹션이 껍데기뿐.**
   `[slug].astro` `#comments`에 "GitHub 계정으로 댓글을 남길 수 있습니다"라는
   문구만 있고, utterances/giscus 같은 실제 댓글 연동이 없다. 없는 기능을 있는 것처럼 보인다.
5. **헤더 About 링크가 404.**
   `BaseLayout` 내비게이션에 `/about`이 있지만 `src/pages/about.astro`가 없다.
   모든 포스팅 헤더에서 깨진 링크가 보인다.
6. **시리즈인데 앞·뒤 글 이동이 없음.**
   `[slug].astro`는 `tags / summary / 이전 글 / 다음 글`을 전혀 쓰지 않는다.
   각 글 끝의 "다음 글에서는…" 문장은 링크가 없어서 독자가 직접 찾아야 한다.
   목차 글(00번)도 각 항목에 글 링크가 없다.
7. **제목 번호 체계가 중간부터 바뀜.**
   01~03번은 "CMake N장"이 없고, 04번부터 "CMake 4장 - …" 형태다.
   00번은 목차인데 제목에 번호가 없고, 05번과 06번 날짜가 같은 2026-08-28이다.
   내용 결정은 사용자 몫이라, 제목을 고칠지는 사용자가 정한다.
8. **06번 파일명에 공백.**
   `06_ros2_qt_cpp Application.md` — 나머지 파일은 밑줄만 쓴다.
   빌드 확인(2026-11-03): Astro가 공백을 하이픈으로 바꿔 slug는 `06_ros2_qt_cpp-application`이 된다.
   `%20`은 아니다. 그래도 파일명 자체는 나머지 패턴과 어긋나고, 파일명을 바꾸면 slug가 바뀌어
   기존 링크가 깨질 수 있으니 바꾸기 전에 사용자 확인이 필요하다.
9. **코드 펜스 언어 미지정이 뒤로 갈수록 많아짐.**
   언어 없는 펜스 수: 01번 12개, 02번 18개, 03번 19개, 04번 40개, 05번 43개, 06번 84개.
   `text / cmake / bash / cpp`가 섞여 있고, `prose`용 typography 플러그인은
   `package.json`에 없어서 표·인용·링크·목록 기호 같은 본문 요소 스타일도
   `global.css`에 정의된 것(h2~h4, p, li, strong, code/pre) 외에는 없다.
   04·06번에만 표가 있고 인용은 04·05번에만 있다.
10. **수식·목차 글과 실제 글의 대응이 1:1이 아님.**
    00번 목차의 2-2~2-8, 3-1~3-5 같은 소항목은 별도 글이 아니라 01~03번 안에
    녹아 있다. 목차를 글 목록으로 오해하면 안 된다. 이 대응을 바꿀지도 사용자 결정이다.
11. **KaTeX는 아직 미사용.**
    `astro.config.mjs`에 remark-math + rehype-katex가 있고 포스팅마다 KaTeX CSS를
    CDN에서 불러오지만, 7개 글 중 수식을 쓴 글은 0개다. 수식 없는 글에는 불필요한 로딩이다.

## 4. 새 글 작성 체크리스트 (두 에이전트 공통)

- [ ] frontmatter 5개 필드(`title/date/category/tags/summary`)를 스키마대로 채운다.
- [ ] 본문 제목은 `##`부터, 번호는 앞 글과 같은 체계로 (바뀌면 3번 문제 7과 함께 사용자에게 확인).
- [ ] 코드 펜스에는 언어를 지정한다 (`cmake / bash / cpp / text` 중 해당 언어, 빈 펜스 금지).
- [ ] 표·인용을 쓰면 3번 문제 9를 먼저 확인한다 (스타일 정의가 없는 요소다).
- [ ] 글 끝에 "다음 글"을 언급하면 링크도 같이 넣는다. 링크가 없으면 문장을 넣지 않는다.
- [ ] 파일명은 공백 없이, 기존 패턴(`NN_소문자_밑줄.md`)으로 한다.
- [ ] 글 내용을 바꾸는 게 아니라 형식을 고치는 경우에도, 아래 변경 기록에 남긴다.
- [ ] 배포는 기존 방식대로 `git_upload.sh`로 한다. 이 기록 파일 자체도 같은 방식으로 공유한다.

## 5. 변경 기록 (지우지 말고 아래에 추가한다)

- 2026-11-03, Muse: 포스팅 7개 + `[slug].astro` / `BaseLayout.astro` / `global.css` 대조해서
  이 기록 파일을 처음 만들었다. 코드 자체는 고치지 않았다. 3번 문제 1~11은 미결 상태다.
- 2026-11-03, Muse (사용자 확정: 깨진 3개 + 글꼴, 코드펜스·태그 표시는 보류):
  3번 문제 1·3·4·5를 고쳤다. 커밋·푸시는 아직 안 했다.
  - 문제 1 (플로팅): `global.css`에 `.floating-actions` / `.floating-action` 정의 추가
    (우하단 고정, 2.5rem 버튼, 라이트/다크 색상, z-index 40 — 목차 오버레이 z-55 아래).
  - 문제 3 (글꼴): 본문 Pretendard + 수식 Latin Modern Math로 확정.
    `BaseLayout`에서 Google Fonts Inter/Noto 로딩 제거, body `font-sans` 제거
    (이제 `global.css`의 Pretendard 규칙이 헤더·푸터까지 먹는다),
    `@font-face format("ttf")` → `"truetype"` 3곳 수정,
    `#post-title`의 `2rem` 고정과 본문 `p/li`의 `1rem` 고정 제거
    (제목은 `text-xl sm:text-3xl`, 본문은 `text-sm sm:text-base`가 반응형으로 동작, 줄간격 1.8 유지).
  - 문제 4 (댓글): "GitHub 계정으로 댓글을 남길 수 있습니다" → "댓글 기능은 준비 중입니다"로 교체.
    실제 댓글 연동은 아직 없다.
  - 문제 5 (About): `/about` 페이지가 없어서 헤더 About 링크를 제거했다. About 페이지 자체를
    새로 만드는 것은 내용 결정이라 하지 않았다.
  - 검증: dl에서 `npm run build` 성공 (8페이지), dist에서 googleapis 0건·`/about` 0건·
    준비 중 문구 7개 글 전부·플로팅 CSS 번들 포함·font format truetype 3 + opentype 1 확인.
    원본은 git HEAD에 남아 있어 백업 파일은 별도로 두지 않았다.
  - 보류 (아직 안 고침): 문제 2 (BaseLayout 패널 죽은 코드), 6 (앞·뒤 글 이동), 7 (제목 번호),
    8 (06번 파일명 공백), 9 (코드펜스 언어), 10 (목차 대응), 11 (KaTeX 미사용),
    그리고 코드펜스·태그 표시 범위 자체도 사용자 재확인 대기.
