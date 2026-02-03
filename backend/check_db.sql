-- Direct query to check what's in the database
SELECT 
    id,
    company_name,
    id_card_front_path,
    LENGTH(id_card_front_path) as path_length,
    updated_at
FROM driver_applications
WHERE company_name ILIKE '%mifsud%'
ORDER BY updated_at DESC NULLS LAST
LIMIT 1;
