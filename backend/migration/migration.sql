-- Add to_linkedin_connect_on column to the leads table
-- Date: Jan 10, 2024

DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'to_linkedin_connect_on'
    )
    THEN
        -- If the column does not exist, add it
        EXECUTE 'ALTER TABLE leads ADD COLUMN to_linkedin_connect_on DATE';
    END IF;
END $$;


-- Add lowercase_for_template column to the industries table
-- Add id_industry column to the leads table
-- Add id_step column to the leads table
-- Add apollo_person_id column to the leads table
-- Add has_failed_on_step column to the leads table
-- Add failed_reason column to the leads table
-- Date: Jan 27, 2024

DO $$
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'industries' AND column_name = 'lowercase_for_template'
    )
    THEN
        -- If the column does not exist, add it
        EXECUTE 'ALTER TABLE industries ADD COLUMN lowercase_for_template VARCHAR';
    END IF;

    -- Check if the column exists
    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'id_industry'
    ) THEN
        EXECUTE 'ALTER TABLE leads ADD COLUMN id_industry INTEGER';
        EXECUTE 'ALTER TABLE leads ADD CONSTRAINT fk_industries FOREIGN KEY (id_industry) REFERENCES industries(id)';
    END IF;

    -- Check if the column exists
    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'id_step'
    ) THEN
        EXECUTE 'ALTER TABLE leads ADD COLUMN id_step INTEGER';
        EXECUTE 'ALTER TABLE leads ADD CONSTRAINT fk_steps FOREIGN KEY (id_step) REFERENCES steps(id)';
    END IF;

    -- Check if the column exists
    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'apollo_person_id'
    ) THEN
        EXECUTE 'ALTER TABLE leads ADD COLUMN apollo_person_id VARCHAR';
        EXECUTE 'ALTER TABLE leads ADD CONSTRAINT unique_apollo_person_id UNIQUE (apollo_person_id)';
    END IF;

    -- Check if the column exists
    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'has_failed_on_step'
    )
    THEN
        -- If the column does not exist, add it
        EXECUTE 'ALTER TABLE leads ADD COLUMN has_failed_on_step BOOLEAN DEFAULT FALSE';
    END IF;

    -- Check if the column exists
    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'failed_reason'
    )
    THEN
        -- If the column does not exist, add it
        EXECUTE 'ALTER TABLE leads ADD COLUMN failed_reason VARCHAR';
    END IF;
END $$;


-- Add attempt table foreign key columns to the leads table
-- Date: Jan 27, 2024
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'id_apollo_lead_fetch_attempt'
    ) THEN
        EXECUTE 'ALTER TABLE leads ADD COLUMN id_apollo_lead_fetch_attempt INTEGER';
        EXECUTE 'ALTER TABLE leads ADD CONSTRAINT fk_apollo_lead_fetch_attempts FOREIGN KEY (id_apollo_lead_fetch_attempt) REFERENCES apollo_lead_fetch_attempts(id)';
    END IF;

    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'id_apollo_email_fetch_attempt'
    ) THEN
        EXECUTE 'ALTER TABLE leads ADD COLUMN id_apollo_email_fetch_attempt INTEGER';
        EXECUTE 'ALTER TABLE leads ADD CONSTRAINT fk_apollo_email_fetch_attempts FOREIGN KEY (id_apollo_email_fetch_attempt) REFERENCES apollo_email_fetch_attempts(id)';
    END IF;

    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'id_neverbounce_validation_attempt'
    ) THEN
        EXECUTE 'ALTER TABLE leads ADD COLUMN id_neverbounce_validation_attempt INTEGER';
        EXECUTE 'ALTER TABLE leads ADD CONSTRAINT fk_neverbounce_validation_attempts FOREIGN KEY (id_neverbounce_validation_attempt) REFERENCES neverbounce_validation_attempts(id)';
    END IF;

    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'id_scrubby_validation_attempt'
    ) THEN
        EXECUTE 'ALTER TABLE leads ADD COLUMN id_scrubby_validation_attempt INTEGER';
        EXECUTE 'ALTER TABLE leads ADD CONSTRAINT fk_scrubby_validation_attempts FOREIGN KEY (id_scrubby_validation_attempt) REFERENCES scrubby_validation_attempts(id)';
    END IF;

    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'id_instantly_push_attempt'
    ) THEN
        EXECUTE 'ALTER TABLE leads ADD COLUMN id_instantly_push_attempt INTEGER';
        EXECUTE 'ALTER TABLE leads ADD CONSTRAINT fk_instantly_push_attempts FOREIGN KEY (id_instantly_push_attempt) REFERENCES instantly_push_attempts(id)';
    END IF;
END $$;


-- Add apollo_organization_id to the companies table
-- Add primary_domain to the companies table
-- Date: Jan 27, 2024
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'companies' AND column_name = 'apollo_organization_id'
    ) THEN
        EXECUTE 'ALTER TABLE companies ADD COLUMN apollo_organization_id VARCHAR';
        EXECUTE 'ALTER TABLE companies ADD CONSTRAINT unique_apollo_organization_id UNIQUE (apollo_organization_id)';
    END IF;

    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'companies' AND column_name = 'primary_domain'
    ) THEN
        EXECUTE 'ALTER TABLE companies ADD COLUMN primary_domain VARCHAR';
    END IF;
END $$;


-- Add id_failed_reason foreign key columns to the leads table
-- Date: Jan 31, 2024
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'id_failed_reason'
    ) THEN
        EXECUTE 'ALTER TABLE leads ADD COLUMN id_failed_reason INTEGER';
        EXECUTE 'ALTER TABLE leads ADD CONSTRAINT fk_failed_reasons FOREIGN KEY (id_failed_reason) REFERENCES failed_reasons(id)';
    END IF;
END $$;


-- Add is_saved column to the leads table
-- Date: Feb 1, 2024
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'is_saved'
    )
    THEN
        -- If the column does not exist, add it
        EXECUTE 'ALTER TABLE leads ADD COLUMN is_saved BOOLEAN DEFAULT FALSE';
    END IF;
END $$;


-- Add id_demo_design_picture foreign key columns to the leads table
-- Date: Feb 8, 2024
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'id_demo_design_picture'
    ) THEN
        EXECUTE 'ALTER TABLE leads ADD COLUMN id_demo_design_picture INTEGER';
        EXECUTE 'ALTER TABLE leads ADD CONSTRAINT fk_files FOREIGN KEY (id_demo_design_picture) REFERENCES files(id)';
    END IF;
END $$;


-- Add notes columns to the leads table
-- Date: Feb 26, 2024
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT
        FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'notes'
    ) THEN
        EXECUTE 'ALTER TABLE leads ADD COLUMN notes VARCHAR';
    END IF;
END $$;

