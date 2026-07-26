-- ============================================================
-- ANITA e-commerce schema — 010: rate limiting
-- ============================================================
--
-- A single fixed-window counter table backs every rate-limited endpoint
-- (checkout session creation, newsletter signup, and any future one).
-- Fixed windows (not a sliding log) are intentionally the simplest thing
-- that works here: at boutique traffic volumes the boundary edge-case
-- (a burst spanning two windows briefly allowing ~2x the limit) is not
-- worth the added complexity of a sliding-window log.
--
-- Never queried directly by anon/authenticated — only through
-- check_rate_limit(), a SECURITY DEFINER function callable from Edge
-- Functions via RPC. RLS is enabled with no policies at all, so even a
-- stolen anon/authenticated JWT gets zero access to it directly.

create table if not exists public.rate_limit_counters (
  bucket text not null,
  identifier text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (bucket, identifier, window_start)
);

alter table public.rate_limit_counters enable row level security;

-- Atomically records one hit for (bucket, identifier) and reports whether
-- the caller is still within p_max_count for the current p_window_seconds
-- window. The insert-or-increment is a single statement, so two
-- near-simultaneous calls for the same identifier can't both slip through
-- via a check-then-write race.
create or replace function public.check_rate_limit(
  p_bucket text,
  p_identifier text,
  p_max_count int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_counters (bucket, identifier, window_start, count)
  values (p_bucket, p_identifier, v_window_start, 1)
  on conflict (bucket, identifier, window_start)
    do update set count = rate_limit_counters.count + 1
  returning count into v_count;

  -- Opportunistic cleanup — cheap thanks to the primary key's leading
  -- columns, and keeps the table from growing unbounded without a cron job.
  delete from public.rate_limit_counters
  where window_start < now() - interval '1 day';

  return v_count <= p_max_count;
end;
$$;
