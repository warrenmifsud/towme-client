-- Helper Function: parse_driver_date
-- Robustly converts text to date, supporting ISO (YYYY-MM-DD) and UK/EU (DD/MM/YYYY).
-- Returns NULL on failure instead of erroring.

CREATE OR REPLACE FUNCTION parse_driver_date(val text) RETURNS date AS $$
BEGIN
    IF val IS NULL OR val = '' THEN 
        RETURN NULL; 
    END IF;

    -- Try ISO Format (YYYY-MM-DD)
    -- Simple check: 4 digits, hyphen, etc.
    IF val ~ '^\d{4}-\d{2}-\d{2}$' THEN 
        BEGIN
            RETURN val::date; 
        EXCEPTION WHEN OTHERS THEN 
            RETURN NULL; -- Invalid Day/Month values
        END;
    END IF;

    -- Try UK/EU Format (DD/MM/YYYY)
    IF val ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN 
        BEGIN
            RETURN to_date(val, 'DD/MM/YYYY'); 
        EXCEPTION WHEN OTHERS THEN 
            RETURN NULL; 
        END;
    END IF;

    RETURN NULL; -- Unknown format
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant Access
GRANT EXECUTE ON FUNCTION parse_driver_date(text) TO public;
GRANT EXECUTE ON FUNCTION parse_driver_date(text) TO anon;
GRANT EXECUTE ON FUNCTION parse_driver_date(text) TO authenticated;
