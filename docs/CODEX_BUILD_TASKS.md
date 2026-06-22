# SpeakFlow AI - Chuỗi task để Codex code từng phần

Tài liệu này dùng để giao việc theo từng lát nhỏ. Mỗi task nên được chạy riêng, kiểm tra xong mới qua task tiếp theo.

## Nguyên tắc giao task

- Một task chỉ chạm vào một nhóm tính năng chính.
- Luôn yêu cầu TypeScript strict, responsive UI, loading/error states.
- Luôn yêu cầu auth check với dữ liệu user.
- Luôn validate AI output bằng schema trước khi save DB.
- Không thêm dependency lớn nếu chưa cần.
- Sau mỗi task, chạy build/lint nếu project đã có script.

## Task 01 - Init project và app shell

### Mục tiêu

Khởi tạo Next.js App Router app với TypeScript, Tailwind, layout chính và route rỗng cho các tính năng.

### Prompt

```txt
Create a Next.js App Router project for SpeakFlow AI using TypeScript and Tailwind CSS. Build an authenticated app shell with sidebar/top navigation and routes for /dashboard, /daily, /conversation, /correction, /vocabulary, /grammar, /reflex, /assessment, and /progress. Keep pages simple but polished, responsive, and ready for real data. Do not build a marketing landing page.
```

### Done

- App chạy local.
- Các route chính tồn tại.
- Layout dùng được trên desktop và mobile.
- Không có logic AI/DB giả phức tạp.

## Task 02 - Supabase auth và database migrations

### Mục tiêu

Tạo Supabase client, auth flow và migration schema nền.

### Prompt

```txt
Add Supabase Auth and database support. Create SQL migrations for profiles, learning_plans, daily_lessons, lesson_attempts, practice_sessions, conversation_messages, vocabulary_items, corrections, assessments, and ai_requests. Enable RLS on user data tables and add policies so each authenticated user can only access their own rows. Add typed Supabase helpers for server and client usage.
```

### Done

- Login/logout hoạt động.
- Migration chạy được.
- RLS bật cho bảng user data.
- `profiles.id` liên kết `auth.users(id)`.

## Task 03 - Shared UI states

### Mục tiêu

Tạo các component nền dùng lại.

### Prompt

```txt
Create reusable UI components for buttons, text inputs, textareas, cards for repeated items, tabs, segmented controls, stat blocks, empty states, loading states, and error messages. Use Tailwind CSS and keep components small, accessible, and consistent with a focused productivity app.
```

### Done

- Form và button có trạng thái disabled/loading.
- Empty/error state dùng lại được.
- Không lồng card trong card.

## Task 04 - AI gateway và response contracts

### Mục tiêu

Tạo lớp gọi DeepSeek an toàn, validate output và chuẩn hóa response.

### Prompt

```txt
Create a server-only AI gateway for DeepSeek. Add typed functions for calling agents with JSON output, Zod validation, error normalization, latency measurement, and ai_requests logging. Add shared ApiResponse<T> type and never expose the DeepSeek API key to client components.
```

### Done

- AI key chỉ dùng server-side.
- Có Zod schema cho output.
- API lỗi trả message an toàn.
- Có logging vào `ai_requests`.

## Task 05 - Dashboard MVP

### Mục tiêu

Hiển thị tiến độ và hành động học hôm nay.

### Prompt

```txt
Build the /dashboard page using real Supabase data. Show current learning day, streak, total minutes, vocabulary score, conversation score, grammar score, today's tasks, and clear actions for Start Today Lesson, Correction, and Conversation. Include empty states for new users.
```

### Done

- Dashboard không hard-code số liệu chính.
- New user thấy hướng dẫn hành động đầu tiên.
- Mobile layout rõ ràng.

## Task 06 - Daily Lesson

### Mục tiêu

Generate, lưu và hoàn thành bài học hằng ngày.

### Prompt

```txt
Build the /daily page. It should generate today's English lesson with vocabulary, sentence patterns, speaking questions, a short writing task, correction feedback, and a final summary. Save generated lessons to Supabase, reuse an existing lesson for the same user/plan/day, and create lesson_attempts when the user starts or completes the lesson.
```

### Done

- Không tạo trùng lesson cùng ngày.
- Mark complete cập nhật attempt.
- Có loading/error/success states.

## Task 07 - Correction Agent

### Mục tiêu

Sửa đoạn tiếng Anh và lưu lịch sử.

### Prompt

```txt
Build the /correction page and CorrectionAgent. The user enters English text. The AI returns original text, mistake list, corrected version, natural version, Vietnamese explanations, and a score as structured JSON. Validate input length, validate AI output with Zod, save correction history to Supabase, and show recent corrections.
```

### Done

- AI output không parse từ markdown.
- Lưu `corrections`.
- Lịch sử hiển thị được.
- API lỗi không làm mất input của user.

## Task 08 - Conversation Agent

### Mục tiêu

Chat luyện hội thoại theo lượt, có sửa lỗi và summary.

### Prompt

```txt
Build the /conversation page and ConversationAgent. The AI acts as a native English speaker and asks one short question at a time. After the user answers, the AI corrects mistakes, suggests a natural version, and asks the next question. Add Easy, Normal, Hard, and Stop & Summary controls. Save sessions and messages to Supabase.
```

### Done

- Có `practice_sessions` type conversation.
- Có `conversation_messages`.
- Stop & Summary lưu summary.
- Difficulty ảnh hưởng câu hỏi.

## Task 09 - Progress Tracking

### Mục tiêu

Tổng hợp dữ liệu học thật.

### Prompt

```txt
Build the /progress page using Supabase data. Show streak, completed lessons, vocabulary learned, correction count, conversation count, average score, and a weekly progress chart. Add clear empty states and keep aggregation logic server-side.
```

### Done

- Progress phản ánh lesson_attempts, corrections, sessions.
- Có chart tuần.
- Không crash khi chưa có dữ liệu.

## Task 10 - Vocabulary Agent

### Mục tiêu

Tạo từ vựng theo công việc/lĩnh vực và lưu ôn tập.

### Prompt

```txt
Build the /vocabulary page and VocabularyAgent. The user enters a job role or topic. The AI returns practical vocabulary items with word, Vietnamese meaning, example sentence, topic, and usage note. Let the user save items to Supabase and review saved vocabulary.
```

### Done

- Lưu `vocabulary_items`.
- Có topic/job context.
- Có review count hoặc next review placeholder.

## Task 11 - Grammar Agent

### Mục tiêu

Học ngữ pháp qua ví dụ đời sống và công việc.

### Prompt

```txt
Build the /grammar page and GrammarAgent. Let the user choose a grammar topic such as present simple, past simple, present perfect, modal verbs, conditionals, comparatives, prepositions, or articles. The AI returns a simple Vietnamese explanation, daily-life examples, work examples, a short exercise, and answers as structured JSON.
```

### Done

- Topic selector rõ ràng.
- Output có explanation, examples, exercise, answers.
- Có lưu session nếu user làm bài.

## Task 12 - Reflex Training

### Mục tiêu

Luyện phản xạ nhanh với 20 câu ngắn.

### Prompt

```txt
Build the /reflex page and ReflexAgent. Generate 20 short English questions. For each user answer, return correction and a natural answer. Track progress through the 20-question session and save the final summary to Supabase.
```

### Done

- Session có số câu đã trả lời.
- Mỗi câu có correction/natural answer.
- Summary lưu cuối buổi.

## Task 13 - Assessment Agent

### Mục tiêu

Đánh giá trình độ A1-B2 và tạo plan 7 ngày.

### Prompt

```txt
Build the /assessment page and AssessmentAgent. Test the user with 5 vocabulary questions, 5 grammar questions, 5 communication questions, and 1 short writing task. Return level A1/A2/B1/B2, strengths, weaknesses, scores, and a 7-day plan as structured JSON. Save assessment results to Supabase.
```

### Done

- Lưu `assessments`.
- Có level và plan 7 ngày.
- Có điểm theo nhóm kỹ năng.

## Task 14 - QA, deploy và vận hành

### Mục tiêu

Đóng gói MVP để deploy.

### Prompt

```txt
Prepare SpeakFlow AI for production deployment on Vercel. Add required environment variable documentation, run build/lint, fix production errors, verify Supabase Auth callbacks, verify all MVP routes, and add a short operations checklist for common issues.
```

### Done

- Production build pass.
- Vercel env vars được ghi rõ.
- Auth callback đúng.
- Full MVP smoke test pass.

## Checklist smoke test MVP

- User đăng ký hoặc đăng nhập được.
- Dashboard hiển thị empty state cho user mới.
- Generate daily lesson thành công.
- Complete lesson cập nhật progress.
- Correction Agent sửa và lưu lịch sử.
- Conversation Agent tạo session, chat, summary.
- Progress page hiển thị dữ liệu vừa tạo.
- Logout/login lại vẫn thấy dữ liệu cũ.
