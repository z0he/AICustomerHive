import { pool } from "../server/db";

async function verifyTables() {
  console.log('Starting table verification...');
  
  try {
    // Connect to the database
    const client = await pool.connect();
    console.log('Connected to database successfully');
    
    try {
      // Check if marketing_forms table exists
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const tables = tablesResult.rows.map(row => row.table_name);
      console.log('Available tables:', tables);
      
      // Check specifically for our marketing tables
      const marketingTables = [
        'marketing_forms',
        'form_submissions',
        'web_visitors',
        'page_views',
        'tracking_installations'
      ];
      
      for (const table of marketingTables) {
        if (tables.includes(table)) {
          console.log(`✅ Table ${table} exists`);
        } else {
          console.log(`❌ Table ${table} does not exist`);
        }
      }
      
      // If marketing_forms table does not exist, create it
      if (!tables.includes('marketing_forms')) {
        console.log('Creating marketing_forms table manually...');
        
        await client.query(`
          CREATE TABLE marketing_forms (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            submit_button_text TEXT DEFAULT 'Submit',
            success_message TEXT DEFAULT 'Thank you for your submission!',
            redirect_url TEXT,
            form_fields JSONB NOT NULL,
            form_style JSONB,
            form_type TEXT DEFAULT 'inline',
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP,
            created_by INTEGER,
            folder TEXT DEFAULT 'Default',
            campaign_id INTEGER,
            tracking_enabled BOOLEAN DEFAULT true,
            captcha_enabled BOOLEAN DEFAULT false,
            custom_css TEXT,
            custom_js TEXT,
            embed_code TEXT,
            views INTEGER DEFAULT 0,
            submissions INTEGER DEFAULT 0,
            conversion_rate INTEGER DEFAULT 0
          );
        `);
        
        console.log('✅ marketing_forms table created manually');
      }
      
      // If form_submissions table does not exist, create it
      if (!tables.includes('form_submissions')) {
        console.log('Creating form_submissions table manually...');
        
        await client.query(`
          CREATE TABLE form_submissions (
            id SERIAL PRIMARY KEY,
            form_id INTEGER NOT NULL,
            data JSONB NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            submitted_at TIMESTAMP NOT NULL,
            contact_id INTEGER,
            page_url TEXT,
            referrer TEXT,
            form_source TEXT DEFAULT 'website',
            original_source TEXT,
            original_source_detail TEXT,
            device_type TEXT,
            geo_location JSONB,
            conversion_path JSONB,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            utm_term TEXT,
            utm_content TEXT
          );
        `);
        
        console.log('✅ form_submissions table created manually');
      }
      
      // If web_visitors table does not exist, create it
      if (!tables.includes('web_visitors')) {
        console.log('Creating web_visitors table manually...');
        
        await client.query(`
          CREATE TABLE web_visitors (
            id SERIAL PRIMARY KEY,
            visitor_id TEXT NOT NULL UNIQUE,
            first_visit_at TIMESTAMP NOT NULL,
            last_visit_at TIMESTAMP NOT NULL,
            total_visits INTEGER DEFAULT 1,
            total_pageviews INTEGER DEFAULT 1,
            contact_id INTEGER,
            ip_address TEXT,
            user_agent TEXT,
            device_type TEXT,
            browser TEXT,
            operating_system TEXT,
            country TEXT,
            region TEXT,
            city TEXT,
            first_referrer TEXT,
            latest_referrer TEXT,
            original_source TEXT,
            original_source_detail TEXT,
            last_campaign TEXT,
            converted_at TIMESTAMP,
            conversion_source TEXT
          );
        `);
        
        console.log('✅ web_visitors table created manually');
      }
      
      // If page_views table does not exist, create it
      if (!tables.includes('page_views')) {
        console.log('Creating page_views table manually...');
        
        await client.query(`
          CREATE TABLE page_views (
            id SERIAL PRIMARY KEY,
            visitor_id TEXT NOT NULL,
            page_url TEXT NOT NULL,
            timestamp TIMESTAMP NOT NULL,
            time_on_page INTEGER,
            referrer TEXT,
            ip_address TEXT,
            user_agent TEXT,
            country TEXT,
            device_type TEXT,
            contact_id INTEGER,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            utm_term TEXT,
            utm_content TEXT,
            entry_page BOOLEAN DEFAULT false,
            exit_page BOOLEAN DEFAULT false
          );
        `);
        
        console.log('✅ page_views table created manually');
      }
      
      // If tracking_installations table does not exist, create it
      if (!tables.includes('tracking_installations')) {
        console.log('Creating tracking_installations table manually...');
        
        await client.query(`
          CREATE TABLE tracking_installations (
            id SERIAL PRIMARY KEY,
            website_url TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            notes TEXT,
            installation_date TIMESTAMP NOT NULL,
            tracking_code TEXT NOT NULL,
            last_ping_at TIMESTAMP,
            settings JSONB,
            owner INTEGER
          );
        `);
        
        console.log('✅ tracking_installations table created manually');
      }
      
      console.log('Verification complete!');
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Error verifying tables:', error);
  }
}

verifyTables()
  .then(() => {
    console.log('Table verification script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Table verification script failed:', error);
    process.exit(1);
  });