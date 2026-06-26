const { supabase } = require("../config/db");

// Supabase table: custos_users
// Columns: id, name, email (unique), company, employee_id, session_id, created_at, updated_at

function checkSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase client is not initialized. Check SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY) environment variables."
    );
  }
}

const User = {
  async create(data) {
    checkSupabase();
    const { name, email, company, employeeId, sessionId = "" } = data;

    const { data: row, error } = await supabase
      .from("custos_users")
      .insert([
        {
          name,
          email: email.toLowerCase().trim(),
          company: company.trim(),
          employee_id: employeeId.trim(),
          session_id: sessionId.trim(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return row;
  },

  async findByEmail(email) {
    checkSupabase();

    const { data, error } = await supabase
      .from("custos_users")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data || null;
  },

  async updateSessionId(email, sessionId) {
    checkSupabase();

    const { data, error } = await supabase
      .from("custos_users")
      .update({ session_id: sessionId })
      .eq("email", email.toLowerCase().trim())
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async upsert(data) {
    checkSupabase();

    const { name, email, company, employeeId, sessionId = "" } = data;

    const { data: row, error } = await supabase
      .from("custos_users")
      .upsert(
        {
          name,
          email: email.toLowerCase().trim(),
          company: company.trim(),
          employee_id: employeeId.trim(),
          session_id: sessionId.trim(),
        },
        { onConflict: "email" }
      )
      .select()
      .single();

    if (error) throw error;
    return row;
  },

  async findAll() {
    checkSupabase();

    const { data, error } = await supabase
      .from("custos_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async deleteByEmail(email) {
    checkSupabase();

    const { error } = await supabase
      .from("custos_users")
      .delete()
      .eq("email", email.toLowerCase().trim());

    if (error) throw error;
    return true;
  },
};

module.exports = User;