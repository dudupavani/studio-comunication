-- Ensure storage bucket used by community publications uploads exists.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('posts', 'posts', false, 10485760)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;
