/**
 * MANNAR GREEN RIDE - SUPABASE CLIENT CONFIGURATION
 * Project: szzhzpjfmyeulxjhbbov
 */

const SUPABASE_CONFIG = {
  url: "https://szzhzpjfmyeulxjhbbov.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6emh6cGpmbXlldWx4amhiYm92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzI4NDksImV4cCI6MjEwMzg0ODg0OX0.Xo3-i1H_rbX0DYhtw5C5-i4kQYsB1mXHYJzckhOYu1g",
  mediaBucket: "website-media"
};

let _supabaseInstance = null;

function getSupabaseClient() {
  if (!_supabaseInstance) {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      _supabaseInstance = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    } else {
      console.error("Supabase SDK not loaded yet.");
    }
  }
  return _supabaseInstance;
}

window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.getSupabaseClient = getSupabaseClient;
