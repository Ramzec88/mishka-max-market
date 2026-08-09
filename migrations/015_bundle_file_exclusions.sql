-- Per-bundle file exclusions: lets a bundle include a child product while withholding
-- specific files of that product from *this bundle specifically* (the child product
-- itself, bought standalone, still includes all of its files).
--
-- Shape: { [childProductId]: string[] of excluded storage_paths }. Lives on the bundle
-- product row (not a separate table) since it's always read/written together with that
-- one bundle's composition.
alter table products
  add column if not exists bundle_file_exclusions jsonb not null default '{}'::jsonb;
