-- Payment checkout currently runs through YooKassa in RUB.
-- Deactivate legacy catalog rows in another currency instead of exposing
-- products that can be displayed but can never be purchased.
update catalog_items
set active=false
where upper(coalesce(currency,'RUB')) <> 'RUB'
  and active=true;
