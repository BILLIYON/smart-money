# Walkthrough of AI-powered Gmail Search Query Translation

We have successfully implemented dynamic, AI-powered query translation for custom sync presets. This resolves issues where conversational user inputs (e.g. `do not include paystack or any other transaction except from opay...`) failed to parse under simple string-based regex rules and returned 0 matching results:

## Changes Implemented

1. **AI Query Translator**:
   - Exported `askAIWithEngine` from [ai.ts](file:///c:/Users/USER/smart-money/src/lib/ai.ts) to make it accessible to external scripts.
   - Built a dynamic `translateNaturalLanguageQuery` helper function in [gmail.ts](file:///c:/Users/USER/smart-money/src/lib/gmail.ts) that uses the user's selected LLM engine to parse any conversational/natural language preset instructions and output:
     - `gmail_query`: A Gmail API-compatible search query string (e.g. `opay -paystack`).
     - `filter_rules`: Comma-separated rule configurations (e.g. `include:opay,exclude:paystack`).

2. **Gmail Sync Integration**:
   - Integrated the dynamic translation inside `syncGmailForUser` in [gmail.ts](file:///c:/Users/USER/smart-money/src/lib/gmail.ts) so that user-written natural language preset rules are translated on-the-fly when triggering Gmail synchronization.

3. **Type-Safe Verification & Live Deployment**:
   - Successfully verified and compiled the code, and deployed the live changes to production at https://smartmoney.technology.
