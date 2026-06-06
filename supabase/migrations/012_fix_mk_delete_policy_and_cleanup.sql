-- ============================================================
-- SIRA-SYS · Migration 012 · Fix MK Delete Policy & Cleanup Data
-- ============================================================
-- Problem: Multiple overlapping RLS policies on mata_kuliah table
-- cause silent delete failures for Kaprodi users. The FOR ALL
-- policy from migration 010 conflicts with individual SELECT/INSERT
-- policies from migration 007/011.
--
-- Solution: Drop ALL existing policies on mata_kuliah, then create
-- clean, non-overlapping policies with explicit DELETE support.
-- Also clean up orphan MK data for DKV prodi.
-- ============================================================

-- ── Step 1: Drop ALL existing policies on mata_kuliah ──────────
DROP POLICY IF EXISTS "read_own_prodi_mk"       ON public.mata_kuliah;
DROP POLICY IF EXISTS "kaprodi_manage_mk"        ON public.mata_kuliah;
DROP POLICY IF EXISTS "kaprodi_admin_modify_mk"  ON public.mata_kuliah;
DROP POLICY IF EXISTS "authenticated_select_mk"  ON public.mata_kuliah;
DROP POLICY IF EXISTS "authenticated_insert_mk"  ON public.mata_kuliah;
DROP POLICY IF EXISTS "authenticated_update_mk"  ON public.mata_kuliah;
DROP POLICY IF EXISTS "public_read_mata_kuliah"  ON public.mata_kuliah;

-- ── Step 2: Create clean, non-overlapping policies ─────────────

-- SELECT: Semua orang (termasuk anonymous/public) bisa membaca MK
CREATE POLICY "mk_select_public" ON public.mata_kuliah
  FOR SELECT USING (true);

-- INSERT: Semua user terautentikasi bisa insert MK baru
CREATE POLICY "mk_insert_authenticated" ON public.mata_kuliah
  FOR INSERT TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: Semua user terautentikasi bisa update MK
CREATE POLICY "mk_update_authenticated" ON public.mata_kuliah
  FOR UPDATE TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- DELETE: Hanya Kaprodi (untuk prodi sendiri) dan Admin yang bisa hapus MK
CREATE POLICY "mk_delete_kaprodi_admin" ON public.mata_kuliah
  FOR DELETE TO authenticated
  USING (
    my_role() = 'admin' 
    OR (my_role() = 'kaprodi' AND prodi_id = my_prodi_id())
  );

-- ── Step 3: Cleanup orphan MK data for DKV prodi ──────────────
-- Keep only: DKV62111, 111111, DKV61102, 222
-- Delete others that are not linked to any RPS

DELETE FROM public.mata_kuliah 
WHERE prodi_id = '5c1cde68-568f-404b-bee6-06f0a9458804'
  AND id NOT IN (
    '1a7f2527-1538-488e-99b5-2cea27048510',  -- DKV62111 - Augmented Reality
    'd32fb97c-66cc-4094-b520-191598e69a52',  -- 111111 - Manajemen Data Center
    '28a9d9e5-32b8-49b2-9a09-a12af549d8f4',  -- DKV61102 - Nirmana 1
    'fa5de039-cf64-4701-8c56-ad34245bad6e'   -- 222 - Bahasa Indonesia
  );
