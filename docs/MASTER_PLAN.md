# SpeakFlow AI - Kế hoạch sản phẩm và kỹ thuật

## 1. Mục tiêu

Xây dựng web app cá nhân giúp luyện tiếng Anh hằng ngày trong 30 ngày, chạy tốt trên Vercel, dễ phát triển bằng từng task nhỏ với Codex, và có thể mở rộng từ app cá nhân thành sản phẩm nhiều người dùng.

App tập trung vào 5 kết quả chính:

1. Người học biết hôm nay cần học gì.
2. Người học luyện viết, nói, hội thoại và được AI sửa lỗi ngay.
3. Người học thấy tiến độ học, streak, điểm mạnh, điểm yếu.
4. Nội dung học cá nhân hóa theo công việc, trình độ và lịch sử lỗi.
5. Codebase đủ rõ module để thêm agent mới mà không đập vỡ phần cũ.

Tên làm việc: **SpeakFlow AI**.

## 2. Giả định và ràng buộc

- Người phát triển ban đầu: 1 người, cần ưu tiên tốc độ và dễ bảo trì.
- Quy mô ban đầu: cá nhân hoặc nhóm nhỏ dưới 1.000 người dùng.
- Thời gian MVP: 14 ngày.
- Hosting: Vercel.
- Database/Auth: Supabase.
- AI provider: DeepSeek API.
- Kiến trúc: modular monolith trong Next.js, không tách microservice sớm.
- Ngôn ngữ giao diện: có thể dùng tiếng Việt cho giải thích, tiếng Anh cho bài học.

## 3. Phạm vi theo phiên bản

### MVP bắt buộc

1. Dashboard
2. Daily Lesson
3. Correction Agent
4. Conversation Agent
5. Progress Tracking

### Sau MVP

1. Vocabulary Agent
2. Grammar Agent
3. Reflex Training
4. Assessment Agent
5. Daily auto lesson
6. Voice input
7. Text-to-speech
8. Reminder
9. Spaced repetition cho từ vựng

### Không làm trong MVP

- Microservices.
- Admin dashboard phức tạp.
- Payment/subscription.
- Realtime nhiều người cùng học.
- Mobile app native.
- Fine-tuning model.

## 4. Tech stack chuẩn

- **Framework**: Next.js App Router, TypeScript.
- **UI**: Tailwind CSS, component nội bộ đơn giản.
- **Database**: Supabase Postgres.
- **Auth**: Supabase Auth.
- **Data access**: Supabase server/client helpers và SQL migrations.
- **Validation**: Zod cho form input và AI output.
- **AI**: DeepSeek API gọi từ server-only route handlers hoặc server actions.
- **Charts**: Recharts hoặc lightweight chart library sau khi có dữ liệu thật.
- **Deploy**: Vercel preview + production.

Lý do không dùng Prisma ở MVP: Supabase Auth, RLS và SQL migrations đủ tốt cho app này; thêm Prisma quá sớm làm tăng cấu hình và dễ lệch với RLS. Có thể cân nhắc Prisma/Drizzle khi query phức tạp hơn hoặc cần layer domain riêng mạnh hơn.

## 5. Kiến trúc tổng thể

Ứng dụng là modular monolith:

- Next.js chịu trách nhiệm UI, routing, API boundary và server rendering.
- Supabase lưu user data, progress, lessons, vocabulary, corrections.
- DeepSeek chỉ được gọi ở server; client không bao giờ giữ API key.
- Mỗi tính năng là một module độc lập: UI, server action/API, schema, prompt, types.
- Shared layer chỉ chứa thứ thật sự dùng chung: auth, db client, AI gateway, validation, UI primitives.

Luồng cơ bản:

```txt
User action
  -> Page/Client component
  -> Server action or /api route
  -> Zod validate input
  -> Auth check
  -> AI gateway if needed
  -> Zod validate AI output
  -> Save Supabase
  -> Return typed result
  -> UI updates progress
```

## 6. Cấu trúc thư mục đề xuất

```txt
app/
  (app)/
    dashboard/
    daily/
    conversation/
    correction/
    vocabulary/
    grammar/
    reflex/
    assessment/
    progress/
  api/
    ai/
      daily-lesson/
      conversation/
      correction/
      vocabulary/
      grammar/
      reflex/
      assessment/
components/
  layout/
  ui/
  feature/
features/
  daily/
    actions.ts
    components/
    schemas.ts
    types.ts
  conversation/
  correction/
  vocabulary/
  grammar/
  reflex/
  assessment/
  progress/
lib/
  ai/
    agents.ts
    gateway.ts
    prompts/
    schemas.ts
  auth/
  supabase/
  validation/
supabase/
  migrations/
types/
docs/
```

Nguyên tắc: page trong `app/` chỉ orchestration; logic thật nằm trong `features/` và `lib/`.

## 7. Route và màn hình

### `/dashboard`

Hiển thị:

- Current day trong kế hoạch 30 ngày.
- Streak.
- Tổng phút học.
- Điểm vocabulary, conversation, grammar.
- Nhiệm vụ hôm nay.
- Nút Start Today Lesson.
- Shortcut tới Correction và Conversation.

Tiêu chí hoàn thành:

- Có dữ liệu thật từ Supabase hoặc fallback empty state.
- Không hard-code progress chính.
- Responsive tốt trên mobile.

### `/daily`

Daily lesson 20-30 phút gồm:

1. 5-10 từ vựng.
2. 3-5 mẫu câu.
3. 5 câu hỏi luyện nói.
4. 1 bài viết ngắn.
5. AI correction.
6. Tổng kết cuối buổi.

Tiêu chí hoàn thành:

- Generate bài học hôm nay.
- Lưu lesson vào Supabase.
- Không tạo trùng lesson cùng user/day nếu đã có.
- Mark complete và cập nhật progress.

### `/conversation`

AI đóng vai người bản xứ:

1. AI hỏi một câu ngắn.
2. User trả lời.
3. AI sửa lỗi nếu có.
4. AI gợi ý câu tự nhiên hơn.
5. AI hỏi câu tiếp theo.

Có mode Easy, Normal, Hard, Stop & Summary.

Tiêu chí hoàn thành:

- Lưu session và messages.
- AI response trả về JSON ổn định.
- Stop & Summary tạo summary, lỗi phổ biến, câu nên ôn.

### `/correction`

User nhập đoạn tiếng Anh, AI trả về:

- Original.
- Mistakes.
- Correct version.
- Natural version.
- Giải thích tiếng Việt.

Tiêu chí hoàn thành:

- Validate input length.
- Lưu correction history.
- Hiển thị lịch sử gần nhất.
- Không mất dữ liệu khi API lỗi.

### `/progress`

Hiển thị:

- Streak.
- Completed lessons.
- Vocabulary learned.
- Correction count.
- Conversation count.
- Average score.
- Weekly progress chart.

Tiêu chí hoàn thành:

- Dữ liệu lấy từ bảng progress/session thật.
- Empty state rõ ràng khi chưa học.
- Có insight ngắn từ Progress Coach Agent ở bản sau MVP.

## 8. Data model đề xuất

Supabase Auth đã có `auth.users`, nên app dùng `profiles` thay vì tự tạo bảng `users` rời.

### `profiles`

```txt
id uuid primary key references auth.users(id)
email text
display_name text
native_language text default 'vi'
target_level text
job_role text
created_at timestamptz
updated_at timestamptz
```

### `learning_plans`

```txt
id uuid primary key
user_id uuid references profiles(id)
duration_days int default 30
start_date date
target_level text
focus_areas text[]
created_at timestamptz
updated_at timestamptz
```

### `daily_lessons`

```txt
id uuid primary key
user_id uuid references profiles(id)
plan_id uuid references learning_plans(id)
day_number int
title text
level text
content_json jsonb
generated_by text
created_at timestamptz
unique(user_id, plan_id, day_number)
```

### `lesson_attempts`

```txt
id uuid primary key
user_id uuid references profiles(id)
lesson_id uuid references daily_lessons(id)
status text -- started, completed
score int
minutes_spent int
writing_answer text
ai_feedback_json jsonb
started_at timestamptz
completed_at timestamptz
created_at timestamptz
```

### `practice_sessions`

```txt
id uuid primary key
user_id uuid references profiles(id)
type text -- conversation, reflex, grammar, assessment
difficulty text
status text -- active, completed
summary_json jsonb
score int
minutes_spent int
created_at timestamptz
updated_at timestamptz
```

### `conversation_messages`

```txt
id uuid primary key
session_id uuid references practice_sessions(id)
user_id uuid references profiles(id)
role text -- user, assistant, system
content text
feedback_json jsonb
created_at timestamptz
```

### `vocabulary_items`

```txt
id uuid primary key
user_id uuid references profiles(id)
word text
meaning_vi text
example text
topic text
job_context text
ease_factor numeric default 2.5
review_count int default 0
next_review_at timestamptz
created_at timestamptz
updated_at timestamptz
```

### `corrections`

```txt
id uuid primary key
user_id uuid references profiles(id)
original_text text
corrected_text text
natural_text text
mistakes_json jsonb
explanation_vi text
created_at timestamptz
```

### `assessments`

```txt
id uuid primary key
user_id uuid references profiles(id)
level text
score_json jsonb
strengths text[]
weaknesses text[]
next_plan_json jsonb
created_at timestamptz
```

### `ai_requests`

```txt
id uuid primary key
user_id uuid references profiles(id)
agent_type text
model text
input_hash text
status text -- success, failed
latency_ms int
tokens_input int
tokens_output int
error_message text
created_at timestamptz
```

## 9. RLS và bảo mật

Mỗi bảng user data cần policy:

- User chỉ đọc dòng có `user_id = auth.uid()`.
- User chỉ insert/update/delete dòng của chính mình.
- `profiles.id = auth.uid()`.
- API key DeepSeek chỉ nằm trong server environment.
- Không log full nội dung nhạy cảm nếu sau này có dữ liệu riêng tư.
- Giới hạn độ dài input cho correction/conversation để kiểm soát chi phí.
- Ghi `ai_requests` để theo dõi lỗi và chi phí.

## 10. AI agents

Tất cả agent đi qua `lib/ai/gateway.ts`, dùng schema validate output.

### Agents MVP

- `DailyLessonAgent`: tạo bài học theo ngày, level, job role, lỗi gần đây.
- `CorrectionAgent`: sửa lỗi, viết lại tự nhiên, giải thích tiếng Việt.
- `ConversationAgent`: hỏi tiếp, sửa câu trả lời, giữ context ngắn.
- `ProgressCoachAgent`: tổng kết tiến độ và gợi ý nhiệm vụ tiếp theo.

### Agents sau MVP

- `VocabularyAgent`
- `GrammarAgent`
- `ReflexAgent`
- `AssessmentAgent`

### Contract output mẫu

```ts
type CorrectionResult = {
  original: string;
  corrected: string;
  natural: string;
  mistakes: Array<{
    text: string;
    issue: string;
    fix: string;
    explanationVi: string;
  }>;
  score: number;
};
```

Nguyên tắc prompt:

- System prompt ngắn, rõ vai trò.
- User prompt chứa context tối thiểu.
- Output phải là JSON theo schema.
- Không để UI parse markdown từ AI cho dữ liệu quan trọng.
- Nếu AI output invalid, trả lỗi thân thiện và không ghi bản ghi sai vào DB.

## 11. API boundary

MVP có thể dùng route handlers để dễ debug:

```txt
POST /api/ai/daily-lesson
POST /api/ai/correction
POST /api/ai/conversation
POST /api/progress/complete-lesson
```

Sau khi ổn định, có thể chuyển một số flow sang server actions nếu tiện hơn cho form UX.

Chuẩn response:

```ts
type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
```

## 12. UI/UX direction

- Đây là app học hằng ngày, không phải landing page.
- Màn đầu tiên sau login là dashboard có hành động rõ.
- Giao diện nên gọn, nhiều khoảng thở, ưu tiên tiến độ và next action.
- Không nhồi quá nhiều card lồng nhau.
- Mỗi task học có trạng thái: idle, loading, success, error.
- Mobile phải dùng tốt vì luyện tiếng Anh thường diễn ra nhanh trong ngày.

## 13. Roadmap 14 ngày

### Ngày 1-2: Foundation

- Init Next.js, TypeScript, Tailwind.
- Layout app shell.
- Supabase Auth.
- Supabase migrations đầu tiên.
- Env setup và README.

Done khi:

- Login/logout chạy.
- Route app chính tồn tại.
- DB migration chạy được.

### Ngày 3-4: Dashboard + Daily Lesson

- Dashboard lấy dữ liệu thật.
- Generate daily lesson.
- Lưu lesson và complete attempt.

Done khi:

- User tạo được lesson ngày 1.
- Hoàn thành lesson cập nhật progress.

### Ngày 5-6: Correction + AI gateway

- Tạo gateway DeepSeek.
- Tạo Correction Agent với Zod output.
- Lưu correction history.

Done khi:

- User sửa được đoạn tiếng Anh.
- Lỗi API hiển thị an toàn.

### Ngày 7-8: Conversation

- Tạo session.
- Chat theo lượt.
- Easy/Normal/Hard.
- Stop & Summary.

Done khi:

- Session được lưu đầy đủ.
- Summary dùng lại được cho progress.

### Ngày 9-10: Progress

- Tổng hợp lessons, corrections, conversations.
- Weekly chart.
- Streak logic.

Done khi:

- Progress phản ánh dữ liệu thật.
- Empty state rõ khi chưa học.

### Ngày 11: Vocabulary

- Generate từ theo job role/topic.
- Save vocabulary item.
- Review count cơ bản.

Done khi:

- Lưu được từ và xem lại danh sách.

### Ngày 12: Grammar + Reflex

- Grammar topic explanation.
- Reflex 20 câu ngắn.

Done khi:

- Cả hai flow tạo session và lưu kết quả.

### Ngày 13: Assessment + polish

- Assessment A1-B2.
- Loading/error states.
- Mobile responsive pass.

Done khi:

- Assessment trả level và plan 7 ngày.

### Ngày 14: Deploy + QA

- Deploy Vercel.
- Test full flow.
- Fix bugs.
- Viết checklist vận hành.

Done khi:

- Production URL chạy.
- Không lỗi auth/env/AI key.

## 14. Thứ tự task Codex nên code

1. Init project và app shell.
2. Supabase auth + migrations.
3. Shared UI primitives.
4. Dashboard empty state.
5. AI gateway + response wrapper.
6. Daily Lesson generate/save/complete.
7. Correction Agent.
8. Conversation Agent.
9. Progress aggregation.
10. Vocabulary Agent.
11. Grammar Agent.
12. Reflex Agent.
13. Assessment Agent.
14. QA, deploy, docs.

Mỗi task nên có yêu cầu:

- Files expected.
- Route affected.
- Data contract.
- Error states.
- Manual test steps.
- Không sửa ngoài phạm vi task.

## 15. Tiêu chí chất lượng

- TypeScript strict pass.
- Không có secret trong client bundle.
- Mỗi API có auth check.
- Mỗi AI output được validate.
- RLS bật cho bảng user data.
- Mỗi flow chính có empty/loading/error/success state.
- Build production chạy trước khi deploy.
- Có ít nhất smoke test thủ công cho MVP.

## 16. Điểm mở rộng sau này

- Thêm provider AI khác bằng cách đổi `lib/ai/gateway.ts`, không sửa UI.
- Thêm agent mới bằng feature folder + prompt + schema + route.
- Thêm nhiều user nhờ Supabase Auth/RLS đã có từ đầu.
- Thêm spaced repetition bằng `next_review_at` trong vocabulary.
- Thêm voice bằng Web Speech API hoặc dịch vụ STT/TTS mà không đổi schema core.
- Thêm payment bằng cách gắn plan/quota vào `profiles` hoặc bảng `subscriptions`.

## 17. Rủi ro chính và cách giảm

- **AI trả sai format**: dùng structured output và Zod validate.
- **Chi phí API tăng**: giới hạn input, ghi log `ai_requests`, cache daily lesson theo user/day.
- **Schema quá JSONB khó query**: dữ liệu cần thống kê phải có cột riêng; JSONB chỉ giữ nội dung linh hoạt.
- **Code rối khi thêm agent**: mỗi agent có schema, prompt, action riêng trong feature module.
- **RLS khó debug**: viết policy đơn giản, test bằng user thật sớm.

## 18. Kết luận kiến trúc

Hướng chuẩn cho app này là Next.js modular monolith + Supabase + server-only AI gateway. Cách này đủ nhanh để làm MVP trong 14 ngày, đủ rõ để Codex code từng phần, và đủ mở để thêm agent, voice, reminder hoặc SaaS features sau này mà không cần viết lại từ đầu.
