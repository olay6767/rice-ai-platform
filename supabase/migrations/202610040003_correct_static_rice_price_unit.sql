-- The legacy dashboard CSV stores prices per 100 kg. The initial governed
-- dataset import mislabeled those unchanged numeric values as prices per ton.
update public.rice_price_series as price
set unit = 'บาท/100 กก.',
    updated_at = now()
from public.agricultural_dataset_versions as version
where price.version_id = version.id
  and version.dataset_type = 'rice_price'
  and version.version_key = 'static-rice-price-2026'
  and price.unit = 'บาท/ตัน';
