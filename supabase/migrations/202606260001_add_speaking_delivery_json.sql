alter table public.speaking_attempts
  add column if not exists delivery_json jsonb;

create index if not exists speaking_attempts_delivery_input_mode_idx
  on public.speaking_attempts ((delivery_json ->> 'inputMode'));
