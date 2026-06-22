do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

create index if not exists daily_lessons_plan_id_idx on public.daily_lessons(plan_id);
create index if not exists lesson_attempts_lesson_id_idx on public.lesson_attempts(lesson_id);
create index if not exists conversation_messages_user_id_idx on public.conversation_messages(user_id);
