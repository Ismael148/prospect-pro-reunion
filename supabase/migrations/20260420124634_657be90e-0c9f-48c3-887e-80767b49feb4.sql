UPDATE storage.buckets 
SET file_size_limit = 83886080  -- 80 MB
WHERE id = 'email-assets';