# SpeakFlow AI - Speaking Coach Revamp Plan

## 1. Kết luận ngắn

Không quá khó để build nếu siết scope đúng. Khó nhất không phải UI hay API, mà là biến app từ nhiều tab rời thành một vòng luyện nói có mục tiêu, phản hồi, retry và review.

Chiến lược chuẩn cho giai đoạn tiếp theo:

1. Chọn **Workplace Speaking Coach** làm lõi sản phẩm.
2. Làm **7-day mission path** thật chắc trước khi mở rộng lên 30 ngày.
3. Ưu tiên **Speaking Studio text-mode** trước, gồm Prepare, Drill, Roleplay, Feedback, Retry, Review.
4. Đưa **Review system** lên sớm để lỗi, chunks và từ vựng quay lại.
5. Thêm **Voice MVP** sau khi text-mode ổn, chưa cần pronunciation scoring phức tạp.
6. Giữ IELTS như một mode sau, không trộn vào lõi ban đầu.

## 2. Vấn đề hiện tại của app

App hiện có các tính năng tốt cho MVP:

- Daily lesson
- Correction
- Conversation
- Vocabulary
- Grammar
- Reflex
- Assessment
- Progress
- Status

Nhưng trải nghiệm học vẫn mơ hồ vì:

- Chưa có lộ trình học nói rõ ràng.
- Chưa có khái niệm mission hôm nay.
- Daily lesson còn thiên về sinh bài học, chưa phải mission engine.
- Các tab chưa nối thành một vòng luyện nói.
- Conversation là text chat, chưa có retry bắt buộc sau feedback.
- Progress đo hoạt động, chưa đo năng lực nói.
- Grammar và Vocabulary vẫn là tab độc lập, chưa gắn vào lỗi và tình huống nói thật.

## 3. Product positioning

### Chọn hiện tại

**Workplace Speaking Coach for Vietnamese learners**

Người học dùng app để nói tiếng Anh tốt hơn trong bối cảnh công việc:

- giới thiệu bản thân và công việc;
- nói việc đang làm;
- hỏi lại khi chưa hiểu;
- giải thích vấn đề;
- báo cáo tiến độ;
- đưa ý kiến;
- xử lý small talk;
- luyện phản xạ hội thoại.

### Không làm ngay

IELTS Speaking mode chưa làm trong revamp đầu tiên. Sau khi lõi Speaking Studio ổn, có thể thêm IELTS mode theo Part 1, Part 2, Part 3.

## 4. Nguyên tắc học Speaking của app

Mỗi buổi học phải đi qua một vòng rõ:

```txt
Mission
  -> Prepare
  -> Chunk Drill
  -> Roleplay
  -> Feedback
  -> Retry
  -> Save to Review
```

Trong đó:

- **Mission**: hôm nay người học cần nói được điều gì.
- **Prepare**: đọc mẫu, hiểu tình huống, học chunks và từ vựng.
- **Chunk Drill**: luyện mẫu câu có kiểm soát.
- **Roleplay**: AI đóng vai trong tình huống thật.
- **Feedback**: chấm theo rubric thực dụng.
- **Retry**: người học nói lại câu hoặc nhiệm vụ sau khi được sửa.
- **Review**: lưu lỗi, chunks, vocabulary và câu trả lời tốt để ôn lại.

## 5. Rubric Speaking

Rubric không chỉ trả điểm. Mỗi tiêu chí phải có bằng chứng và hành động sửa.

Các tiêu chí text-mode:

- **Task completion**: trả lời đúng nhiệm vụ chưa.
- **Fluency**: câu có liền mạch, có biết nối ý không.
- **Accuracy**: lỗi ngữ pháp, collocation, cấu trúc.
- **Vocabulary**: có dùng đúng từ/chunk mục tiêu không.
- **Interaction**: có biết hỏi lại, xác nhận, kéo dài hội thoại không.

Sau Voice MVP thêm:

- **Pronunciation readiness**: transcript có dễ hiểu không.
- **Speech confidence**: độ dài câu trả lời, retry, mức hoàn thành.

Feedback chuẩn:

```txt
Score:
- Task completion: 4/5
- Fluency: 3/5
- Accuracy: 3/5
- Vocabulary: 3/5
- Interaction: 2/5

Main issue:
You answered the question, but you did not extend the conversation.

Better answer:
...

Retry task:
Answer the same question again using:
- I'm responsible for...
- The main challenge is...
```

## 6. 7-Day Mission Path đầu tiên

Đây là curriculum tối thiểu để app hết mơ hồ.

| Day | Mission | Speaking Goal | Core Chunks | Roleplay |
|---|---|---|---|---|
| 1 | Introduce yourself | Nói bạn là ai và làm gì | I'm responsible for..., I mainly work on... | Meet a new teammate |
| 2 | Describe your job | Mô tả công việc rõ hơn | My role involves..., I usually... | Explain your job to a non-technical colleague |
| 3 | Talk about routine | Kể routine công việc | Every day I..., I usually start by... | Small talk about your workday |
| 4 | Ask for clarification | Hỏi lại khi chưa hiểu | Could you clarify..., Do you mean...? | Receive unclear requirements |
| 5 | Explain a problem | Nói blocker hoặc vấn đề | The main issue is..., I'm blocked by... | Daily standup blocker |
| 6 | Give an opinion | Nêu ý kiến ngắn | I think we should..., In my opinion... | Discuss a product decision |
| 7 | Review and mini assessment | Tổng hợp, nói dài hơn | This week I learned..., I still need to improve... | Weekly review with coach |

Mở rộng lên 30 ngày sau khi 7 ngày đầu chạy tốt.

## 7. Data model cần bổ sung

Schema hiện tại đủ cho MVP cũ, nhưng thiếu xương sống curriculum và review.

### `missions`

Lưu mission theo ngày và cấp độ.

```txt
id uuid primary key
day_number int
week_number int
level text
track text -- workplace, ielts_later
title text
goal text
scenario text
estimated_minutes int
target_chunks jsonb
target_vocabulary jsonb
practice_questions jsonb
roleplay_prompt text
rubric_json jsonb
created_at timestamptz
updated_at timestamptz
```

### `mission_attempts`

Lưu tiến trình người học theo mission.

```txt
id uuid primary key
user_id uuid references profiles(id)
mission_id uuid references missions(id)
status text -- started, completed
current_step text -- prepare, drill, roleplay, feedback, retry, review
score_task int
score_fluency int
score_accuracy int
score_vocabulary int
score_interaction int
summary_json jsonb
started_at timestamptz
completed_at timestamptz
created_at timestamptz
updated_at timestamptz
```

### `speaking_attempts`

Lưu từng câu trả lời, kể cả text transcript sau này từ voice.

```txt
id uuid primary key
user_id uuid references profiles(id)
mission_id uuid references missions(id)
mission_attempt_id uuid references mission_attempts(id)
step text -- drill, roleplay, retry
prompt text
user_answer text
retry_of uuid null references speaking_attempts(id)
feedback_json jsonb
score_task int
score_fluency int
score_accuracy int
score_vocabulary int
score_interaction int
created_at timestamptz
```

### `review_items`

Lưu thứ cần ôn.

```txt
id uuid primary key
user_id uuid references profiles(id)
source_type text -- error, chunk, vocabulary, answer
source_id uuid null
mission_id uuid null references missions(id)
content text
meaning_vi text
example text
error_pattern text
correct_form text
next_review_at timestamptz
review_count int default 0
ease_factor numeric default 2.5
created_at timestamptz
updated_at timestamptz
```

## 8. Kiến trúc app sau revamp

### UI chính

- `/dashboard`: Today Mission, next action, skill snapshot.
- `/daily`: có thể đổi vai trò thành mission overview hoặc redirect sang Speaking Studio.
- `/speaking`: Speaking Studio.
- `/review`: ôn lỗi, chunks, vocabulary.
- `/progress`: skill progress theo rubric.
- Các tab cũ như grammar/vocabulary/correction vẫn giữ, nhưng hạ vai trò thành tools phụ.

### Backend chính

- `MissionEngine`: chọn mission hôm nay.
- `SpeakingCoachAgent`: feedback, retry task, better answer.
- `RoleplayAgent`: đóng vai hội thoại theo scenario.
- `ReviewAgent`: biến lỗi/chunks/vocab thành review items.
- `ProgressCoachAgent`: tổng hợp tiến bộ theo rubric.

### Nguyên tắc UI

Người học chỉ thấy một trải nghiệm thống nhất: **Today's Mission** hoặc **Speaking Studio**.

Backend có thể nhiều agent, nhưng UI không nên bắt người học chọn nhiều agent.

## 9. Sprint plan

### Sprint 1 - 7-Day Mission Path

Mục tiêu: app có curriculum thật, không còn mơ hồ.

Checklist:

- [x] Thêm data model `missions`.
- [x] Seed 7 missions đầu tiên.
- [x] Thêm helper lấy mission hôm nay.
- [x] Dashboard hiển thị Today Mission thay vì task rời.
- [x] Daily page dùng mission data hoặc dẫn sang Speaking Studio.
- [x] Thêm trạng thái new user rõ: bắt đầu Day 1.

Done khi:

- User mở dashboard biết hôm nay cần nói gì.
- Day 1 đến Day 7 có goal, chunks, vocabulary, questions, roleplay.
- Không còn cảm giác random lesson.

### Sprint 2 - Speaking Studio text-mode

Mục tiêu: nối các tính năng rời thành vòng học.

Checklist:

- [x] Tạo route `/speaking`.
- [x] Tạo UI stepper: Prepare, Drill, Roleplay, Feedback, Retry, Review.
- [x] Prepare hiển thị goal, scenario, chunks, vocabulary.
- [x] Drill cho user luyện 2-3 câu theo chunks.
- [x] Roleplay gọi AI theo mission scenario.
- [x] Feedback trả rubric, better answer và retry task.
- [x] Retry bắt người học trả lời lại.
- [x] Lưu `mission_attempts` và `speaking_attempts`.

Done khi:

- User hoàn thành một mission end-to-end bằng text.
- Feedback luôn có next action.
- Retry được lưu và so sánh với answer đầu.

### Sprint 3 - Review + Adaptive Progress

Mục tiêu: app bắt đầu giống coach.

Checklist:

- [x] Thêm `review_items`.
- [x] Feedback có thể tạo review items từ lỗi, chunks, vocabulary.
- [x] Tạo route `/review`.
- [x] Review item có trạng thái due, reviewed, next review.
- [x] Progress hiển thị rubric trend: task, fluency, accuracy, vocabulary, interaction.
- [x] Mission hôm sau có thể ưu tiên skill yếu nhất.

Done khi:

- Lỗi cũ quay lại để ôn.
- Progress không chỉ là minutes/count.
- App gợi ý vì sao mission tiếp theo phù hợp.

### Sprint 4 - Voice MVP

Mục tiêu: app bắt đầu là Speaking Coach đúng nghĩa.

Checklist:

- [x] Thêm record button cho Speaking Studio.
- [x] Speech-to-text tạo transcript.
- [x] Cho user chỉnh transcript trước khi gửi nếu cần.
- [x] Text-to-speech đọc sample answer hoặc better answer.
- [x] Lưu transcript trong speaking attempts; chưa cần lưu file audio.
- [x] Retry bằng voice.

Done khi:

- User có thể nghe mẫu, nói, nhận transcript, nhận feedback và nói lại.
- Chưa cần pronunciation scoring nâng cao.

### Sprint 5 - 30-Day Expansion

Mục tiêu: mở rộng curriculum sau khi vòng học ổn.

Checklist:

- [x] Mở rộng missions từ 7 lên 30 ngày.
- [x] Chia 4 tuần: survival, interaction, workplace, confident speaking.
- [x] Thêm review day mỗi tuần.
- [x] Thêm mini assessment cuối tuần.
- [x] Giữ optional IELTS mode ngoài revamp đầu theo scope đã chọn.

Done khi:

- Lộ trình 30 ngày có logic từ dễ đến khó.
- Mỗi tuần có mục tiêu rõ.
- User thấy mình đang ở đâu trong hành trình.

## 10. Backlog implementation theo thứ tự Codex

Các task này dùng cho GOAL loop.

- [x] Task 01: Add mission domain types and static 7-day mission seed.
- [x] Task 02: Add Supabase migration for missions, mission_attempts, speaking_attempts, review_items.
- [x] Task 03: Add mission data helpers and current mission resolver.
- [x] Task 04: Update dashboard to show Today's Mission and current speaking path.
- [x] Task 05: Add `/speaking` route with static mission-driven stepper UI.
- [x] Task 06: Add Speaking Coach schemas and prompts for feedback, retry and roleplay.
- [x] Task 07: Wire Speaking Studio roleplay and feedback API.
- [x] Task 08: Persist mission attempts and speaking attempts.
- [x] Task 09: Generate review items from feedback.
- [x] Task 10: Add `/review` page for due review items.
- [x] Task 11: Upgrade progress page to rubric-based skill progress.
- [x] Task 12: Add adaptive next-mission recommendation based on weak skill.
- [x] Task 13: Add voice MVP record/transcript flow.
- [x] Task 14: Add text-to-speech for better answers.
- [x] Task 15: Expand curriculum from 7 to 30 missions.
- [x] Task 16: QA, smoke tests, docs update.

## 11. Quality gates

Mỗi task phải đạt:

- TypeScript không lỗi.
- `npm run lint` pass nếu task chạm code.
- `npm run build` pass sau các task lớn.
- API validate input bằng Zod.
- AI output validate bằng Zod.
- Dữ liệu user có auth/RLS phù hợp.
- UI có loading, error, empty, success state.
- Không làm thêm scope ngoài task đang chọn.

## 12. Rủi ro và cách giảm

| Rủi ro | Cách giảm |
|---|---|
| Scope quá lớn | Làm 7 ngày trước, chưa làm 30 ngày ngay |
| AI feedback chung chung | Schema bắt buộc score, evidence, better answer, retry task |
| App vẫn mơ hồ | Dashboard luôn hiển thị mission, next step và lý do |
| Data model lệch với schema cũ | Thêm bảng mới, không phá bảng cũ trước |
| Voice phức tạp | Voice MVP chỉ cần record, transcript, TTS, retry |
| Review bị bỏ quên | Đưa review_items vào Sprint 3, không để cuối dự án |

## 13. Definition of done cho revamp

Revamp được xem là thành công khi:

- User mới mở app biết hôm nay cần học gì.
- User hoàn thành được ít nhất 7 mission theo thứ tự.
- Mỗi mission có Prepare, Drill, Roleplay, Feedback, Retry, Review.
- Lỗi và chunks được lưu để ôn lại.
- Progress thể hiện năng lực nói, không chỉ số phút học.
- App có voice MVP đủ để luyện nói thật.
- 30-day path có thể mở rộng từ 7-day path mà không phải viết lại kiến trúc.
