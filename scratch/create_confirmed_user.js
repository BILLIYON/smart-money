const { createClient } = require("@supabase/supabase-js");

const url = "https://gmbwrhdoyoinkmtrtbnr.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c";

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = "adeolujohn495@gmail.com";
  const password = "Password123!";
  
  console.log(`Checking if user ${email} exists...`);
  const { data, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }
  const users = data.users;
  
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    console.log(`User exists with ID: ${existingUser.id}. Updating password and confirming email...`);
    const { data: updateData, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: password,
      email_confirm: true
    });
    if (error) {
      console.error("Error updating user password:", error);
    } else {
      console.log("Password updated successfully!");
    }
  } else {
    console.log(`User does not exist. Creating user...`);
    const { data: createData, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Adeolu John" }
    });
    if (error) {
      console.error("Error creating user:", error);
    } else {
      console.log(`User created successfully with ID: ${createData.user.id}`);
    }
  }
}

main();
