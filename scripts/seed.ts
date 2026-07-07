/**
 * Seeds Firestore with the prototype's mock posts (BlogApp.dc.html `posts()`), so the app has
 * real content to render. Run with: npm run seed
 *
 * Requires FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY
 * in .env.local (a service account key — see SETUP.md for how to generate one).
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

type Category = "daily" | "info" | "art" | "quote";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "Missing FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY in .env.local.\n" +
      "Generate a service account key from Firebase Console -> Project Settings -> Service Accounts, see SETUP.md."
  );
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}
const db = getFirestore();

const AUTHOR = {
  uid: "seed-author-eden",
  displayName: "이든",
  email: "eden@nanuda.blog",
  photoURL: null as string | null,
};

interface SeedPost {
  id: string;
  category: Category;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  date: string; // "YYYY.MM.DD" or "YYYY"
  read?: string;
  tags: string[];
  ratio?: string;
}

const POSTS: SeedPost[] = [
  {
    id: "d1",
    category: "daily",
    title: "새벽 네 시의 부엌",
    subtitle: "",
    excerpt: "아무도 깨지 않은 시간, 물 끓는 소리만 남는다.",
    content:
      "아무도 깨지 않은 시간, 물 끓는 소리만 남는다.\n\n창밖은 아직 파랗고, 물 끓는 소리만이 부엌을 채운다. 하루 중 유일하게 아무에게도 속하지 않은 시간. 나는 이 고요를 오래 기억하고 싶어 사진 한 장과 몇 줄의 문장을 남긴다.\n\n별것 아닌 순간들이 모여 결국 한 사람의 결을 만든다고 믿는다.",
    date: "2026.06.28",
    read: "4분",
    tags: ["일상", "사진", "아침"],
  },
  {
    id: "d2",
    category: "daily",
    title: "서촌, 느린 골목",
    subtitle: "",
    excerpt: "담벼락에 걸린 오후의 그림자를 따라 걸었다.",
    content:
      "담벼락에 걸린 오후의 그림자를 따라 걸었다.\n\n느리게 걷는 것만으로 하루가 길어지는 기분이 든다. 서촌의 골목은 언제나 그 자리에서 같은 속도로 기다려준다.",
    date: "2026.06.14",
    read: "6분",
    tags: ["일상", "서울", "산책"],
  },
  {
    id: "d3",
    category: "daily",
    title: "비 오는 날의 목록",
    subtitle: "",
    excerpt: "창을 두드리는 소리와 함께 적어 내려간 것들.",
    content:
      "창을 두드리는 소리와 함께 적어 내려간 것들.\n\n- 우산 없이 나선 산책\n- 미뤄둔 책의 다음 장\n- 따뜻한 차 한 잔\n\n비 오는 날에만 할 수 있는 일들이 있다.",
    date: "2026.05.30",
    read: "3분",
    tags: ["일상", "기록"],
  },
  {
    id: "i1",
    category: "info",
    title: "STM32로 만든 미니 오실로스코프",
    subtitle: "ADC 샘플링부터 회로 설계, 화면 렌더링까지",
    excerpt: "ADC 샘플링부터 회로 설계, 화면 렌더링까지의 기록.",
    content:
      "신호를 눈으로 보려면 먼저 시간축 위의 전압을 일정 간격으로 표본화해야 합니다. 샘플링 주파수가 신호 대역폭의 두 배를 넘어야 원형을 복원할 수 있습니다.\n\n" +
      "```\n// 12-bit ADC, 1 MSPS\nuint16_t read_adc(void) {\n  while (!(ADC1->SR & ADC_SR_EOC));\n  return ADC1->DR;\n}\n```\n\n" +
      "## 회로 설계\n\n입력단에 op-amp 버퍼를 두어 임피던스를 낮추고, RC 필터로 에일리어싱을 억제했습니다.\n\n" +
      "## 수식으로 검증하기\n\n나이퀴스트 조건은 다음과 같이 정리됩니다.\n\n$$\nf_s \\geq 2 f_{max}\n$$",
    date: "2026.06.22",
    read: "12분",
    tags: ["임베디드", "STM32", "회로"],
  },
  {
    id: "i2",
    category: "info",
    title: "React 렌더링, 어디서 새는가",
    subtitle: "",
    excerpt: "불필요한 리렌더의 원인을 프로파일러로 추적했다.",
    content:
      "불필요한 리렌더의 원인을 프로파일러로 추적했다.\n\n## 문제 상황\n\n리스트 아이템 하나를 갱신했는데 전체 리스트가 다시 그려지는 현상을 발견했다.\n\n## 원인과 해결\n\n부모 컴포넌트에서 매 렌더마다 새 배열/객체를 생성해 자식에게 넘기고 있었다. `useMemo`와 `React.memo`로 참조를 안정화해 해결했다.",
    date: "2026.06.03",
    read: "9분",
    tags: ["React", "프론트엔드", "성능"],
  },
  {
    id: "i3",
    category: "info",
    title: "푸리에 변환을 손으로 따라가기",
    subtitle: "",
    excerpt: "신호를 주파수로 분해하는 과정을 수식과 함께 정리.",
    content:
      "신호를 주파수로 분해하는 과정을 수식과 함께 정리한다.\n\n## 정의\n\n연속 시간 신호의 푸리에 변환은 다음과 같이 정의된다.\n\n$$\nX(f) = \\int_{-\\infty}^{\\infty} x(t) e^{-j2\\pi ft} dt\n$$\n\n## 직관\n\n임의의 신호를 서로 다른 주파수의 사인파들의 합으로 바라보는 관점이다.",
    date: "2026.05.19",
    read: "15분",
    tags: ["수학", "DSP", "수식"],
  },
  {
    id: "a1",
    category: "art",
    title: "Untitled #12",
    subtitle: "",
    excerpt: "Acrylic on canvas, 2026",
    content: "Acrylic on canvas, 2026",
    date: "2026",
    tags: ["회화", "추상"],
    ratio: "3/4",
  },
  {
    id: "a2",
    category: "art",
    title: "빛의 기록 — I",
    subtitle: "",
    excerpt: "Gelatin silver print, 2025",
    content: "Gelatin silver print, 2025",
    date: "2025",
    tags: ["사진", "흑백"],
    ratio: "1/1",
  },
  {
    id: "a3",
    category: "art",
    title: "여백 연습",
    subtitle: "",
    excerpt: "Ink on paper, 2026",
    content: "Ink on paper, 2026",
    date: "2026",
    tags: ["드로잉", "미니멀"],
    ratio: "4/5",
  },
  {
    id: "a4",
    category: "art",
    title: "구조 #3",
    subtitle: "",
    excerpt: "Mixed media, 2026",
    content: "Mixed media, 2026",
    date: "2026",
    tags: ["설치", "추상"],
    ratio: "3/2",
  },
  {
    id: "q1",
    category: "quote",
    title: "완벽함은 더 보탤 것이 없을 때가 아니라, 더 뺄 것이 없을 때 완성된다.",
    subtitle: "",
    excerpt: "생텍쥐페리",
    content: "생텍쥐페리",
    date: "2026.06.25",
    tags: ["글귀", "미니멀"],
  },
  {
    id: "q2",
    category: "quote",
    title: "우리가 반복하는 것이 곧 우리 자신이다.",
    subtitle: "",
    excerpt: "아리스토텔레스",
    content: "아리스토텔레스",
    date: "2026.06.10",
    tags: ["글귀", "습관"],
  },
  {
    id: "q3",
    category: "quote",
    title: "천천히 서두르라.",
    subtitle: "",
    excerpt: "아우구스투스",
    content: "아우구스투스",
    date: "2026.05.28",
    tags: ["글귀"],
  },
  {
    id: "q4",
    category: "quote",
    title: "남과 비교하는 순간, 오늘의 나는 초라해진다.",
    subtitle: "",
    excerpt: "스스로에게",
    content: "스스로에게",
    date: "2026.05.12",
    tags: ["글귀", "오늘"],
  },
];

function parseDate(d: string): Date {
  if (/^\d{4}$/.test(d)) return new Date(Number(d), 0, 1);
  const [y, m, day] = d.split(".").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

function computeReadTime(markdown: string): string {
  const chars = markdown.replace(/\s/g, "").length;
  const minutes = Math.max(1, Math.round(chars / 500));
  return `${minutes}분`;
}

async function upsertAuthor() {
  await db.collection("users").doc(AUTHOR.uid).set(
    {
      displayName: AUTHOR.displayName,
      email: AUTHOR.email,
      photoURL: AUTHOR.photoURL,
      createdAt: Timestamp.now(),
    },
    { merge: true }
  );
}

async function seed() {
  await upsertAuthor();

  const batch = db.batch();
  for (const post of POSTS) {
    const ref = db.collection("posts").doc(post.id);
    const publishedAt = Timestamp.fromDate(parseDate(post.date));
    batch.set(ref, {
      title: post.title,
      subtitle: post.subtitle,
      content: post.content,
      excerpt: post.excerpt,
      category: post.category,
      tags: post.tags,
      authorId: AUTHOR.uid,
      authorName: AUTHOR.displayName,
      coverImageURL: null,
      status: "published",
      publishedAt,
      updatedAt: publishedAt,
      readTime: post.read || computeReadTime(post.content),
      ...(post.ratio ? { ratio: post.ratio } : {}),
    });
  }
  await batch.commit();
  console.log(`Seeded ${POSTS.length} posts + 1 author (${AUTHOR.uid}).`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
