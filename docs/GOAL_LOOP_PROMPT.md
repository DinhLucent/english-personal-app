# GOAL Loop Prompt for SpeakFlow AI

Tài liệu này là prompt vận hành. Khi muốn Codex tiếp tục build hoặc polish dự án theo kế hoạch, mở một thread mới hoặc dùng thread hiện tại, rồi gửi prompt dưới đây. Sau đó mỗi lần muốn chạy tiếp, gửi đúng một chữ:

```txt
GOAL
```

## Prompt khởi động

```txt
Bạn là Codex trong repo SpeakFlow AI.

Mục tiêu dài hạn: hoàn thành SpeakFlow AI như một Workplace Speaking Coach chuyên nghiệp, cuốn hút, có nhịp học rõ, có animation/âm thanh/phản hồi tinh tế nhưng không rối.

Các tài liệu định hướng:

1. docs/SPEAKING_COACH_REVAMP_PLAN.md - lõi sản phẩm, mission path, Speaking Studio, review, progress, voice.
2. docs/EXPERIENCE_POLISH_STRATEGY.md - chiến lược polish giao diện, animation, sound, màu sắc, icon, learning moments.

Sản phẩm cần giữ lõi Workplace Speaking Coach cho người Việt học giao tiếp tiếng Anh. Sau khi backlog revamp speaking coach đã hoàn thành, ưu tiên backlog Experience Polish.

Khi tôi gửi "GOAL", hãy chạy một vòng làm việc tự động theo loop sau:

1. Đọc docs/SPEAKING_COACH_REVAMP_PLAN.md và docs/EXPERIENCE_POLISH_STRATEGY.md.
2. Kiểm tra repo hiện tại và git status.
3. Nếu `SPEAKING_COACH_REVAMP_PLAN.md` còn task chưa hoàn thành trong "Backlog implementation theo thứ tự Codex", làm task đầu tiên chưa xong ở đó.
4. Nếu revamp backlog đã hoàn thành, tìm task đầu tiên chưa hoàn thành trong "Backlog GOAL - Experience Polish".
5. Xác định scope nhỏ nhất để hoàn thành task đó.
6. Đọc các file liên quan trước khi sửa.
7. Implement task đó end-to-end.
8. Cập nhật checklist đúng tài liệu bằng cách đánh dấu task đã hoàn thành nếu thực sự xong.
9. Chạy kiểm tra phù hợp:
   - task chỉ sửa docs: không cần build;
   - task chạm code UI nhỏ: chạy npm run lint;
   - task chạm shared component, nhiều route, motion/sound system: chạy npm run lint và npm run build;
   - task chạm interaction lớn: chạy `npm.cmd run visual:qa` cho desktop/mobile/reduced-motion;
   - task chạm focus, ARIA, form label hoặc keyboard flow: chạy `npm.cmd run accessibility:smoke`;
   - task chạm journey nhiều bước, disabled state, shortcut, focus sau action hoặc learning event choreography: chạy `npm.cmd run interaction:qa`.
10. Nếu test/build lỗi, tự sửa trong cùng vòng GOAL cho đến khi pass hoặc có blocker thật.
11. Kết thúc bằng báo cáo ngắn:
    - task đã làm;
    - file đã sửa;
    - lệnh đã chạy;
    - task tiếp theo nên làm.

Quy tắc quan trọng:

- Không nhảy task nếu task trước chưa xong, trừ khi task trước bị blocker thật.
- Không build 30-day path trước khi 7-day mission path và Speaking Studio text-mode ổn.
- Không làm IELTS mode trong revamp đầu.
- Không làm voice trước khi Speaking Studio text-mode, persistence và review cơ bản ổn.
- Không thêm dependency lớn nếu chưa cần.
- Không thêm hiệu ứng chỉ để trang trí. Motion phải giúp người học hiểu trạng thái hoặc cảm thấy hành động vừa hoàn tất.
- Âm thanh phải có setting bật/tắt, không gây giật mình, không phụ thuộc asset bản quyền.
- Ưu tiên `animejs`, CSS, Web Audio API và `lucide-react` trước khi thêm thư viện mới.
- Không phá các flow hiện có như correction, conversation, vocabulary, grammar nếu chưa có lý do.
- Với dữ liệu user, luôn tôn trọng Supabase auth/RLS.
- Với AI output, luôn dùng Zod schema.
- Với UI, luôn có loading, error, empty và success state.
- Sau mỗi task, cập nhật docs để vòng GOAL sau biết tiếp tục từ đâu.

Nếu CodeGraph tools có sẵn, ưu tiên CodeGraph cho câu hỏi cấu trúc. Nếu CodeGraph không có hoặc chưa initialized, dùng rg và đọc file trực tiếp.

Hãy chờ tôi gửi "GOAL" rồi mới bắt đầu task đầu tiên.
```

## Prompt chạy tiếp

Sau prompt khởi động, dùng:

```txt
GOAL
```

Codex sẽ tự tìm task tiếp theo trong plan, implement, verify và cập nhật checklist.

## Cách dùng an toàn

- Mỗi vòng GOAL chỉ nên hoàn thành một task có scope rõ.
- Sau mỗi vòng, đọc final summary để biết repo đang ở đâu.
- Nếu task lớn quá, yêu cầu Codex split task thành subtask nhỏ hơn nhưng vẫn cập nhật plan.
- Nếu có migration DB, kiểm tra SQL trước khi apply lên Supabase thật.
- Nếu có voice/STT/TTS, yêu cầu Codex ghi rõ provider, env vars và fallback.
- Nếu QA script không tự bật được Next dev server trong sandbox, bật server cục bộ trước rồi chạy lại QA để script dùng server đang chạy.

## Lệnh kiểm tra thường dùng

```bash
npm run lint
npm run build
npm run check:speaking-curriculum
npm run smoke:local
npm run check:env
npm run check:supabase:schema
npm.cmd run visual:qa
npm.cmd run accessibility:smoke
npm.cmd run interaction:qa
```

`npm.cmd run visual:qa` mặc định chụp cả baseline route sweep và rich fixtures cho các màn hình có dữ liệu dày. Dùng `VISUAL_QA_RICH_FIXTURES=false` khi chỉ cần quét baseline nhanh.

## Stop conditions

Codex phải dừng và hỏi bạn nếu:

- Cần chọn provider voice/STT/TTS trả phí.
- Migration có nguy cơ phá dữ liệu thật.
- Cần secret/API key mới.
- Task yêu cầu thay đổi product positioning, ví dụ chuyển từ Workplace sang IELTS.
- Có conflict lớn với thay đổi ngoài phạm vi task.
