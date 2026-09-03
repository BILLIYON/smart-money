import { Pool } from "pg";
import { parseFinancialEmailData } from "../src/lib/gmail-parser";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

async function main() {
  console.log("[reparse_gmail_entries] Starting audit and correction of Gmail databank entries...");

  try {
    const { rows } = await pool.query(
      `SELECT id, user_id, entry_type, amount, description, metadata FROM databank_entries WHERE source = 'gmail' OR gmail_message_id IS NOT NULL;`
    );

    console.log(`[reparse_gmail_entries] Found ${rows.length} Gmail entries in database.`);

    let updatedCount = 0;

    for (const row of rows) {
      const meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata || {});
      const subject = meta.email_subject || meta.subject || row.description || "";
      const from = meta.email_from || meta.from || "";
      const body = meta.email_body || meta.body_snippet || "";

      const textToAnalyze = `${subject} ${body}`.trim();
      if (!textToAnalyze) continue;

      const reparsed = parseFinancialEmailData(body, subject, from);
      if (reparsed) {
        let needsUpdate = false;
        let newEntryType = row.entry_type;
        let newAmount = row.amount;
        let newCategory = reparsed.category;

        // Correct entry_type if inverted
        if (reparsed.entry_type !== row.entry_type) {
          console.log(`[reparse_gmail_entries] Correcting entry_type for ID ${row.id}: ${row.entry_type} -> ${reparsed.entry_type} ("${subject.slice(0, 60)}")`);
          newEntryType = reparsed.entry_type;
          needsUpdate = true;
        }

        // Correct amount if 0 or dramatically misparsed (reparsed amount is in Naira, DB is in cents/kobo)
        const reparsedKobo = Math.round(reparsed.amount * 100);
        if (row.amount === 0 && reparsedKobo > 0) {
          console.log(`[reparse_gmail_entries] Correcting amount for ID ${row.id}: ${row.amount} -> ${reparsedKobo}`);
          newAmount = reparsedKobo;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await pool.query(
            `UPDATE databank_entries SET entry_type = $1, amount = $2, category = $3 WHERE id = $4;`,
            [newEntryType, newAmount, newCategory, row.id]
          );
          updatedCount++;
        }
      }
    }

    console.log(`[reparse_gmail_entries] Audit complete. Updated ${updatedCount} entry records.`);
  } catch (err) {
    console.error("[reparse_gmail_entries] Script error:", err);
  } finally {
    await pool.end();
  }
}

main();
