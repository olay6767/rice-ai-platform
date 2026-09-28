-- The 202609210001 import function supersedes the earlier argument order.
-- Drop the obsolete overload so PostgREST exposes one unambiguous RPC.
drop function if exists public.agricultural_dataset_import(
  uuid, text, jsonb, bigint, text, text, jsonb
);
