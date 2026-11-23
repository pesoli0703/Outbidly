-- Global Business Directory Migration
-- Adds international business directory separate from competition rankings

-- 1. Create global_industries table for directory categories
CREATE TABLE IF NOT EXISTS global_industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create global_companies table for international businesses
CREATE TABLE IF NOT EXISTS global_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  industry_id UUID REFERENCES global_industries(id),
  country TEXT NOT NULL,
  city TEXT,
  website TEXT,
  logo_url TEXT,
  profile_status TEXT NOT NULL DEFAULT 'unclaimed' CHECK (profile_status IN ('unclaimed', 'claimed', 'verified')),
  founded_year INTEGER,
  employee_count TEXT,
  revenue_range TEXT,
  headquarters TEXT,
  social_media JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create company_claims table for claim requests
CREATE TABLE IF NOT EXISTS company_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES global_companies(id) ON DELETE CASCADE,
  claimant_name TEXT NOT NULL,
  claimant_email TEXT NOT NULL,
  claimant_position TEXT NOT NULL,
  company_website TEXT,
  verification_notes TEXT,
  verification_documents TEXT[], -- Array of storage paths
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_global_companies_slug ON global_companies(slug);
CREATE INDEX IF NOT EXISTS idx_global_companies_industry ON global_companies(industry_id);
CREATE INDEX IF NOT EXISTS idx_global_companies_country ON global_companies(country);
CREATE INDEX IF NOT EXISTS idx_global_companies_status ON global_companies(profile_status);
CREATE INDEX IF NOT EXISTS idx_global_companies_featured ON global_companies(is_featured);
CREATE INDEX IF NOT EXISTS idx_company_claims_status ON company_claims(status);
CREATE INDEX IF NOT EXISTS idx_company_claims_company ON company_claims(company_id);

-- 5. Create function to get public global companies (excludes non-verified sensitive data)
CREATE OR REPLACE FUNCTION public_global_companies()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  industry_name TEXT,
  country TEXT,
  city TEXT,
  website TEXT,
  logo_url TEXT,
  profile_status TEXT,
  founded_year INTEGER,
  headquarters TEXT,
  tags TEXT[],
  is_featured BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gc.id,
    gc.name,
    gc.slug,
    gc.description,
    gi.name AS industry_name,
    gc.country,
    gc.city,
    gc.website,
    gc.logo_url,
    gc.profile_status,
    gc.founded_year,
    gc.headquarters,
    gc.tags,
    gc.is_featured
  FROM global_companies gc
  LEFT JOIN global_industries gi ON gc.industry_id = gi.id
  WHERE gc.profile_status IN ('unclaimed', 'verified')
  ORDER BY gc.is_featured DESC, gc.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to search global companies
CREATE OR REPLACE FUNCTION search_global_companies(
  p_search TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  industry_name TEXT,
  country TEXT,
  city TEXT,
  website TEXT,
  logo_url TEXT,
  profile_status TEXT,
  founded_year INTEGER,
  headquarters TEXT,
  tags TEXT[],
  is_featured BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gc.id,
    gc.name,
    gc.slug,
    gc.description,
    gi.name AS industry_name,
    gc.country,
    gc.city,
    gc.website,
    gc.logo_url,
    gc.profile_status,
    gc.founded_year,
    gc.headquarters,
    gc.tags,
    gc.is_featured
  FROM global_companies gc
  LEFT JOIN global_industries gi ON gc.industry_id = gi.id
  WHERE 
    (p_search IS NULL OR p_search = '' OR 
     gc.name ILIKE '%' || p_search || '%' OR 
     gc.description ILIKE '%' || p_search || '%' OR
     gc.tags @> ARRAY[p_search])
    AND (p_industry IS NULL OR p_industry = '' OR gi.name = p_industry)
    AND (p_country IS NULL OR p_country = '' OR gc.country = p_country)
    AND (p_status IS NULL OR p_status = '' OR gc.profile_status = p_status)
  ORDER BY gc.is_featured DESC, gc.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to submit company claim
CREATE OR REPLACE FUNCTION submit_company_claim(
  p_company_id UUID,
  p_claimant_name TEXT,
  p_claimant_email TEXT,
  p_claimant_position TEXT,
  p_company_website TEXT,
  p_verification_notes TEXT
)
RETURNS UUID AS $$
DECLARE
  v_claim_id UUID;
BEGIN
  -- Check if company exists
  IF NOT EXISTS (SELECT 1 FROM global_companies WHERE id = p_company_id) THEN
    RAISE EXCEPTION 'Company not found';
  END IF;
  
  -- Check if there's already a pending claim for this company
  IF EXISTS (
    SELECT 1 FROM company_claims 
    WHERE company_id = p_company_id 
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A claim for this company is already pending';
  END IF;
  
  -- Insert the claim
  INSERT INTO company_claims (
    company_id,
    claimant_name,
    claimant_email,
    claimant_position,
    company_website,
    verification_notes
  ) VALUES (
    p_company_id,
    p_claimant_name,
    p_claimant_email,
    p_claimant_position,
    p_company_website,
    p_verification_notes
  )
  RETURNING id INTO v_claim_id;
  
  -- Update company status to 'claimed'
  UPDATE global_companies
  SET profile_status = 'claimed', updated_at = NOW()
  WHERE id = p_company_id;
  
  RETURN v_claim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function for admin to review claims
CREATE OR REPLACE FUNCTION review_company_claim(
  p_claim_id UUID,
  p_status TEXT,
  p_review_notes TEXT,
  p_reviewer_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Validate status
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved or rejected';
  END IF;
  
  -- Update claim
  UPDATE company_claims
  SET 
    status = p_status,
    reviewed_by = p_reviewer_id,
    reviewed_at = NOW(),
    review_notes = p_review_notes
  WHERE id = p_claim_id;
  
  -- If approved, update company status to 'verified'
  IF p_status = 'approved' THEN
    UPDATE global_companies
    SET profile_status = 'verified', updated_at = NOW()
    WHERE id = (SELECT company_id FROM company_claims WHERE id = p_claim_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Enable RLS (Row Level Security)
ALTER TABLE global_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_claims ENABLE ROW LEVEL SECURITY;

-- 10. Create policies for global_industries
CREATE POLICY "Public can view active industries"
  ON global_industries FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage industries"
  ON global_industries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 11. Create policies for global_companies
CREATE POLICY "Public can view companies"
  ON global_companies FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage companies"
  ON global_companies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 12. Create policies for company_claims
CREATE POLICY "Users can view their own claims"
  ON company_claims FOR SELECT
  USING (claimant_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can create claims"
  ON company_claims FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all claims"
  ON company_claims FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
