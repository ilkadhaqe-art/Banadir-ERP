DO $restore$
DECLARE s text;
BEGIN
  SELECT content INTO s FROM net._http_response WHERE id = 2;
  IF s IS NULL OR length(s) < 1000 THEN
    RAISE EXCEPTION 'schema bundle not available';
  END IF;
  EXECUTE s;
END
$restore$;