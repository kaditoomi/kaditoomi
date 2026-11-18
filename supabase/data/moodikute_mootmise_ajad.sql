-- =====================================================================
-- Mõõdikute mõõtmise ajad (vajab migratsiooni 0003).
-- HARNO ja KiVa tulemused saabuvad juunis → mõõtmise kuu 6 kõigil.
-- Esimese mõõtmise tähtaeg arengukava järgi neil, kellel algtase puudub.
-- =====================================================================

begin;

update indicators set measurement_month = 6 where active;

update indicators i set first_measurement_due = v.due::date
from (values
  ('TN1.4', '2027-11-30'), ('TN1.7', '2027-11-30'), ('TN2.2', '2027-11-30'), ('TN2.3', '2027-11-30'),
  ('TN3.6', '2027-11-30'), ('TN3.7', '2027-11-30'), ('P1.1',  '2027-11-30'),
  ('TN2.5', '2027-05-31'),
  ('TN1.6', '2028-06-30'),
  ('P1.3',  '2029-06-30'),
  ('P2.3',  '2027-12-31'), ('P3.2', '2027-12-31')
) as v(code, due)
where i.code = v.code;

-- Ülejäänud algtasemeta mõõdikud: esimene mõõtmine 2027/28 lõpuks
update indicators set first_measurement_due = '2028-06-30'
where active and baseline_value is null and first_measurement_due is null;

select code, measurement_month, first_measurement_due, baseline_value
from indicators where active order by code;

commit;
