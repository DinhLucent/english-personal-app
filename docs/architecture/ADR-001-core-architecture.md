# ADR-001: Kiến trúc lõi cho SpeakFlow AI

## Status

Accepted

## Context

SpeakFlow AI là app cá nhân luyện tiếng Anh trong 30 ngày, cần chạy trên Vercel, phát triển nhanh bằng từng task nhỏ, nhưng vẫn đủ nền để mở rộng thành app nhiều người dùng. Người phát triển ban đầu là solo developer, nên ưu tiên đơn giản, rõ module, dễ deploy và dễ debug.

## Decision

Chọn kiến trúc:

- Next.js App Router + TypeScript làm web framework chính.
- Modular monolith, chia theo feature thay vì microservices.
- Supabase Auth + Supabase Postgres + RLS cho user data.
- Supabase SQL migrations và Supabase client trong MVP, chưa dùng Prisma.
- DeepSeek API được gọi qua server-only AI gateway.
- Zod validate input từ user và output từ AI.
- Deploy bằng Vercel.

## Options Considered

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Next.js modular monolith + Supabase | Nhanh, ít hạ tầng, hợp Vercel, dễ code từng phần | Cần kỷ luật module để không rối | Chọn |
| Next.js + Prisma + Postgres riêng | Type-safe query tốt, portable | Thêm cấu hình, RLS/Auth Supabase phức tạp hơn ở MVP | Chưa chọn |
| Backend riêng NestJS/FastAPI | Boundary backend rõ, dễ test service lớn | Quá nặng cho app cá nhân MVP | Chưa chọn |
| Microservices | Mở rộng độc lập | Over-engineering, tốn vận hành, không phù hợp solo dev | Loại |

## Rationale

1. App hiện tại cần tốc độ triển khai và vòng lặp build-test-deploy ngắn.
2. Các module AI có thể tách rõ trong cùng monolith mà chưa cần service riêng.
3. Supabase giải quyết nhanh Auth, Postgres, RLS và dashboard database.
4. Server-only AI gateway giữ API key an toàn và cho phép đổi provider sau này.
5. Zod là lớp bảo vệ quan trọng vì AI output không nên được tin tuyệt đối.

## Trade-offs

- Chấp nhận phụ thuộc Supabase trong giai đoạn đầu để giảm hạ tầng.
- Chấp nhận không có repository pattern đầy đủ ở MVP; chỉ thêm abstraction khi query/domain phức tạp.
- Chấp nhận JSONB cho nội dung lesson/AI linh hoạt, nhưng các chỉ số cần thống kê vẫn phải có cột riêng.
- Chấp nhận route handlers/server actions trong cùng app thay vì backend riêng.

## Consequences

### Positive

- MVP có thể hoàn thành nhanh.
- Dễ deploy preview và production trên Vercel.
- Dễ thêm agent mới bằng feature folder, prompt, schema và API route.
- Dữ liệu user an toàn hơn nhờ RLS từ đầu.

### Negative

- Nếu code không giữ module boundary, `lib/` và `features/` có thể phình to.
- Nếu query thống kê tăng mạnh, Supabase client trực tiếp có thể kém sạch.
- Nếu nhiều AI provider hoặc workflow dài xuất hiện, gateway cần được nâng cấp.

### Mitigation

- Giữ page mỏng, logic nằm trong `features/` và `lib/`.
- Mọi AI agent phải có schema output riêng.
- Ghi `ai_requests` để theo dõi lỗi/chi phí.
- Chỉ thêm repository/service layer khi có ít nhất 2 feature cùng cần logic data phức tạp.

## Revisit Trigger

Xem lại quyết định này khi có một trong các dấu hiệu:

- Hơn 1.000 active users.
- Query progress/reporting bắt đầu phức tạp hoặc chậm.
- Cần billing/quota/team workspace.
- Cần workflow AI nền dài hoặc background jobs.
- Cần hỗ trợ nhiều AI providers với routing/quota/fallback nghiêm túc.
