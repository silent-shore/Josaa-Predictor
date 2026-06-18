-- Fake local UI seed only. Do not use this as real JoSAA data.
insert into public.institutes (name, institute_type, state, city, official_code) values
  ('Demo Institute of Technology', 'NIT', 'Demo State', 'Demo City', 'DEMO-NIT'),
  ('Sample Indian Institute of Technology', 'IIT', 'Example State', 'Example City', 'DEMO-IIT')
on conflict (name, institute_type) do nothing;

insert into public.academic_programs (name, normalized_name, degree, duration_years) values
  ('Computer Science and Engineering (4 Years, Bachelor of Technology)', 'computer science and engineering', 'B.Tech', 4),
  ('Mechanical Engineering (4 Years, Bachelor of Technology)', 'mechanical engineering', 'B.Tech', 4)
on conflict (name) do nothing;

insert into public.josaa_cutoffs (
  year, round, institute_id, program_id, institute_name_raw, program_name_raw, quota, seat_type, gender,
  opening_rank_raw, closing_rank_raw, opening_rank_num, closing_rank_num, rank_list_type, source_url
)
select 2025, 1, i.id, p.id, i.name, p.name, 'AI', 'OPEN', 'Gender-Neutral', '1000', '5000', 1000, 5000, 'CRL', 'fake-local-seed'
from public.institutes i, public.academic_programs p
where i.name = 'Demo Institute of Technology' and p.normalized_name = 'computer science and engineering'
on conflict do nothing;

insert into public.josaa_cutoffs (
  year, round, institute_id, program_id, institute_name_raw, program_name_raw, quota, seat_type, gender,
  opening_rank_raw, closing_rank_raw, opening_rank_num, closing_rank_num, rank_list_type, source_url
)
select 2025, 1, i.id, p.id, i.name, p.name, 'AI', 'OPEN', 'Female-only', '3000', '8000', 3000, 8000, 'CRL', 'fake-local-seed'
from public.institutes i, public.academic_programs p
where i.name = 'Sample Indian Institute of Technology' and p.normalized_name = 'mechanical engineering'
on conflict do nothing;

insert into public.data_snapshots (year, round, total_rows, source_url, source_hash)
values (2025, 1, 2, 'fake-local-seed', 'demo')
on conflict do nothing;
