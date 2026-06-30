# SpeakFlow AI - Experience Polish Strategy

## 1. Mục tiêu

Biến SpeakFlow AI từ một app học có đủ chức năng thành một trải nghiệm học tiếng Anh có cảm giác chuyên nghiệp, có nhịp, có phản hồi tức thì và có sức hút khi dùng hằng ngày.

Nguyên tắc quan trọng: thêm cảm giác, không thêm sự lộn xộn. Mọi hiệu ứng, màu sắc, âm thanh và icon phải phục vụ việc học rõ hơn.

## 2. Định hướng trải nghiệm

SpeakFlow AI nên có cảm giác như một personal speaking cockpit: tập trung, thông minh, nhẹ nhưng sống động.

Không đi theo hướng game màu mè. Không đi theo hướng dashboard doanh nghiệp khô cứng. Hướng đúng là premium learning tool: sáng, rõ, nhanh, có phản hồi nhỏ đúng lúc.

## 3. Design System

### Màu sắc

Giữ brand green làm trục chính, nhưng phân vai semantic rõ:

- Brand green: hành động chính, mission active, completion.
- Blue: listening, conversation, speech/audio.
- Violet: insight, AI coach, adaptive recommendation.
- Amber: review due, attention, next scheduled work.
- Coral: lỗi cần sửa, retry focus, blockers.
- Neutral: nền, panel, line, text, muted text.

Chiến thuật:

- Đưa màu, shadow, radius, spacing và duration vào token semantic trong `globals.css`.
- Mỗi màn hình chỉ dùng 1 màu chính và 1 màu phụ, tránh palette một nốt.
- Gradient chỉ dùng cho primary action, active state hoặc completion moment.
- Màu phải biểu thị trạng thái học, không chỉ để trang trí.

### Icon và component

Dùng Lucide cho icon hành động quen thuộc. Button quan trọng nên có icon + text; icon-only phải có tooltip/label. Badge/chip dùng cho trạng thái, không thay bằng paragraph dài.

Shared primitives cần giữ nhất quán:

- `Badge`, `Tooltip`, `IconButton`, `ProgressRing`, `Stepper`, `Skeleton`, `Toast`.
- `Button`, `LinkButton`, `Panel`, `StatBlock`, `FieldLabel`, form controls.
- `SoundToggle` trong AppShell.

Radius mặc định giữ 8px hoặc thấp hơn để app gọn, không tròn quá mức.

## 4. Motion System

Motion phải có cấp độ rõ:

- Micro: 120-180ms cho button press, toggle, icon response.
- Component: 220-360ms cho panel, card, chip, tooltip, toast.
- Learning event: 420-700ms cho score reveal, mission step advance, completion.
- Page reveal: 480-700ms, stagger nhẹ, tôn trọng `prefers-reduced-motion`.

Chiến thuật:

- Dùng `MotionProvider` với data attributes: `score`, `step`, `message`, `toast`, `completion`.
- Không animate nội dung SSR ban đầu trước hydration; chỉ animate route transition và node mới sau khi trang đã ổn định.
- Speaking Studio animate theo flow học: step active, roleplay message, feedback score, retry delta.
- Review dùng card leave animation và toast sau rating.
- Progress animate bar/ring theo dữ liệu thật, không animate vô nghĩa khi không có data.

## 5. Sound System

Âm thanh phải nhẹ, opt-in hoặc có toggle rõ, không autoplay âm thanh dài.

Cue nên rất ngắn:

- Start recording: soft click.
- Stop recording/transcript ready: soft chime.
- Send answer: subtle send tick.
- Feedback ready: warm chime.
- Retry improved: brighter success cue.
- Review rating saved: tiny card tick.
- Mission complete: short completion flourish.
- Error: low muted tap, không gây khó chịu.

Chiến thuật:

- Dùng Web Audio API trong `src/lib/sound.ts`, không thêm dependency/audio asset khi chưa cần.
- Lưu preference `speakflow:sound-enabled`; không phát khi tab hidden hoặc user tắt sound.
- Giữ volume nhỏ, cue ngắn, dùng cho trạng thái học thật.

## 6. Tactics Theo Tính Năng

### Dashboard

Mục tiêu: mở app là biết hôm nay cần làm gì và muốn bấm tiếp.

- Mission cockpit: progress ring Day X/30, next action, estimated minutes.
- Timeline ngắn cho các bước Speaking Studio.
- Coach signal chỉ nêu một insight quan trọng nhất.
- Weekly minutes chart có empty state thông minh hơn.
- Completion streak tinh tế, không quá gamey.

### Speaking Studio

Mục tiêu: flow luyện nói có nhịp rõ và phản hồi đáng tin.

- Stepper active theo trạng thái Prepare, Drill, Roleplay, Feedback, Retry, Review.
- Roleplay message phân vai rõ, scroll giữ cuối đoạn chat.
- Voice recorder có trạng thái idle, listening, transcript ready, unsupported.
- Feedback score reveal theo rubric, tone theo mức điểm.
- Better answer có Listen/Stop rõ.
- Retry result hiển thị delta, điều còn thiếu, next action.
- Completion moment có confetti tiết chế, sound cue và next review link.

### Review

Mục tiêu: ôn lại nhanh, ít ma sát.

- Review card có priority tone theo source type.
- Rating action có leave animation và toast Next review.
- Empty state thành clear queue moment, gợi ý mở Speaking.
- Keyboard shortcut 1/2/3 chỉ thêm sau khi UI rating đã ổn.

### Progress

Mục tiêu: tiến bộ nhìn được bằng năng lực, không chỉ số lượng.

- Rubric skill bars có tone low/caution/strong.
- Recent trend có sparkline hoặc compact timeline không thêm dependency.
- Coach signal ưu tiên một hành động tiếp theo.
- Adaptive recommendation có lý do ngắn và CTA rõ.

### Daily, Vocabulary, Grammar, Correction, Conversation, Reflex, Assessment

Mục tiêu: các tool phụ vẫn polish nhất quán.

- Dùng cùng header/action/status pattern.
- Loading skeleton thay vì spinner đơn lẻ ở vùng lớn.
- Success/error state có toast + cue nhẹ.
- Empty state luôn có next action.

## 7. Goal Loop Cadence

Mỗi vòng Goal nên đi theo nhịp:

1. Chọn một EP task hoặc một nhóm màn hình nhỏ.
2. Đọc current state, tránh refactor ngoài phạm vi.
3. Implement bằng design tokens/primitives hiện có.
4. Kiểm tra visual desktop + mobile nếu thay UI.
5. Chạy `npm.cmd run lint`; chạy `npm.cmd run build` khi chạm shared component hoặc nhiều route.
6. Chạy `npm.cmd run visual:qa` khi cần quét desktop/mobile/reduced-motion cho toàn app.
7. Chạy `npm.cmd run accessibility:smoke` khi sửa focus, ARIA, form label hoặc keyboard flow.
8. Chạy `npm.cmd run interaction:qa` khi sửa journey nhiều bước, disabled state, shortcut hoặc focus sau action.
9. Cập nhật checklist và đề xuất vòng tiếp theo.

## 8. Backlog GOAL - Experience Polish

- [x] Task EP01: Audit UI tokens và gom màu/spacing/shadow/motion duration vào semantic tokens trong `globals.css`.
- [x] Task EP02: Thêm shared primitives `Badge`, `Tooltip`, `IconButton`, `ProgressRing`, `Stepper`, `Skeleton`, `Toast`.
- [x] Task EP03: Thêm sound system bằng Web Audio API, sound preference, và `SoundToggle` trong AppShell.
- [x] Task EP04: Mở rộng `MotionProvider` cho score, step, message, toast, completion event.
- [x] Task EP05: Polish AppShell/Nav: active state, status panel gọn hơn, mobile nav ít chiếm chỗ hơn, tooltip cho collapsed nav.
- [x] Task EP06: Chuyển Dashboard thành mission cockpit với progress ring, next action và timeline bước học.
- [x] Task EP07: Polish Speaking Studio stepper, roleplay chat, voice recorder state và feedback score reveal.
- [x] Task EP08: Thêm retry improvement moment và mission completion moment có confetti/sound tiết chế.
- [x] Task EP09: Polish Review bằng card leave animation, source tone, rating feedback và clear queue state.
- [x] Task EP10: Polish Progress bằng rubric tone, trend visualization, adaptive coach callout.
- [x] Task EP11: Chuẩn hóa loading/empty/success/error states cho Daily, Vocabulary, Grammar, Correction, Conversation, Reflex, Assessment.
- [x] Task EP12: Visual QA bằng Playwright screenshot desktop/mobile, kiểm tra reduced motion, no overlap, build/lint.
- [x] Task EP13: Accessibility và keyboard polish cho focus states, aria-live feedback, tab order, labels, và các thao tác học chính.
- [x] Task EP14: Interaction QA cho các journey nhiều bước trong Speaking, Review, Conversation và Reflex, gồm trạng thái disabled, shortcut an toàn, focus sau action, và feedback sau khi hoàn tất.
- [x] Task EP15: Choreography polish cho motion/sound cues ở các hành động Start, Send, Feedback, Retry, Complete để app có nhịp phản hồi cuốn hút hơn nhưng vẫn tiết chế.
- [x] Task EP16: Mobile density và scan rhythm audit cho Speaking, Progress, Review và các tool phụ để giảm cảm giác nặng khi nội dung dài, giữ layout chuyên nghiệp trên viewport nhỏ.
- [x] Task EP17: Data-rich visual QA fixtures cho Speaking, Progress, Review và các tool phụ để kiểm tra mobile/desktop khi có nhiều nội dung thật, không chỉ empty state.
- [x] Task EP18: Generated-output rich fixtures cho Daily, Vocabulary, Grammar, Correction và Assessment để kiểm tra các trạng thái AI trả kết quả dài, danh sách nhiều mục, lỗi/success, và CTA kế tiếp.
- [x] Task EP19: Generated-output UI polish dựa trên rich screenshots cho Daily, Vocabulary, Grammar, Correction và Assessment: mật độ mobile, hierarchy kết quả, card danh sách dài, success/error CTA và nhịp scan.
- [x] Task EP20: Generated-output action affordances cho Daily, Vocabulary, Grammar, Correction và Assessment: copy/use/practice CTA gọn, feedback cue nhẹ, và next learning action rõ mà không làm rối card.
- [ ] Task EP21: Generated-output action feedback polish: kiểm tra microcopy sau copy/use, trạng thái Copied/error, focus sau action, mobile density của action rows, và thêm regression coverage cho các action có giá trị cao nhất.

## 9. Quality Gates

Mỗi vòng Goal phải giữ các tiêu chí:

- Không thêm dependency lớn nếu `animejs`, CSS, Web Audio API và Lucide đủ dùng.
- Không dùng animation loop vô hạn trừ trạng thái đang nghe/đang tải thật sự.
- Không phát âm thanh nếu user tắt sound hoặc trình duyệt không hỗ trợ.
- Không làm chữ tràn trong button/card/mobile.
- Không lồng card trong card nếu không cần.
- Không biến app thành landing page hoặc game trang trí.
- Nếu sửa code UI: chạy `npm.cmd run lint`.
- Nếu chạm nhiều route/shared component: chạy `npm.cmd run build`.
- Nếu sửa interaction lớn: kiểm tra desktop và mobile bằng Playwright screenshot. Với màn hình thường rơi vào empty state, thêm hoặc chạy fixture mock dữ liệu để kiểm tra trạng thái có nội dung dày.
- Với visual QA toàn app: chạy `npm.cmd run visual:qa`; script sẽ tự bật dev server cục bộ nếu chưa có server, và mặc định chụp thêm rich fixtures. Đặt `VISUAL_QA_RICH_FIXTURES=false` nếu chỉ muốn baseline route sweep.
- Với focus, form label, ARIA hoặc keyboard interaction: chạy `npm.cmd run accessibility:smoke`; script sẽ tự bật dev server cục bộ nếu chưa có server.
- Với journey nhiều bước, disabled state, shortcut, focus sau action hoặc learning event choreography: chạy `npm.cmd run interaction:qa`; script mock API, ghi nhận `speakflow:learning-event`, và tự dùng dev server đang chạy nếu có.

## 10. Stop Conditions

Codex phải hỏi trước khi:

- Thêm thư viện animation/chart/audio lớn.
- Dùng âm thanh asset có bản quyền hoặc cần tải từ ngoài.
- Đổi brand/product positioning.
- Làm theme quá khác hướng hiện tại.
- Xóa hoặc thay đổi flow học đã hoạt động.
