
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://tzjmevlxpjuhhqnbahqg.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6am1ldmx4cGp1aGhxbmJhaHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTcwNDIsImV4cCI6MjA4MDU5MzA0Mn0.CkPTmFXLpfL0BRG4QJqIyA7ORvq1MWv5qpVB-hPLnKw';

export const supabase = createClient(supabaseUrl, supabaseKey);
