# User Manual — eduAssets

## 1. Introduction

eduAssets is a loan and inventory management system for school equipment (notebooks, tablets, headphones, chargers, etc). This manual describes how to use each panel in day-to-day operation.

The system has three access levels:

- **Guest** — anyone who opens the system without logging in. Can view everything, but cannot create, edit, or delete anything.
- **Editor** — authenticated user. Can register loans, process returns, and create/edit Control records.
- **Administrator** — full access, including Registrations, record deletion, and RFID card management.

---

## 2. Home

Landing screen with shortcuts to the most common actions (New Loan, Returns, Dashboard, Control) and the Login button.

## 3. New Loan

1. Fill in the **Requester** (the student or person picking up the equipment).
2. Select the **Responsible party** (authorized teacher/staff member).
3. Adjust the **Date and Time** if needed (auto-filled with the current moment).
4. Select the **Equipment** and **Quantity**, then click **Add** — repeat for each item.
5. Add an **Observation**, if you want.
6. Click **Register Loan**.

> Requires login (Editor or Administrator). The system blocks registration if there isn't enough available stock.

## 4. Returns

- The list shows all currently open loans.
- Click a card to view its details in the side panel (responsible party, student, items, observation).
- The detail panel lets you **edit the loan's items** (add/remove/change quantity) before returning it.
- Click **Return** (on the card or in the panel) to open the confirmation, adjust the return date/time, and confirm.

## 5. Dashboard

- **Summary cards**: total equipment, available, on loan, under maintenance, and broken.
- **Stock tab**: list by category with total, available, and broken counts. Click a row to see the category's detailed summary.
- **History tab**: every loan ever registered, with status (Open/Returned). Click "Details" to see the full item list.
- Use the search field to filter by category, requester, responsible party, or number.
- **Export** generates a CSV of the current stock (or takes you to the Export panel when viewing History).

## 6. Control

Used to record equipment occurrences:

- **Observation** — a general note, doesn't affect stock.
- **Maintenance** — removes the item from available stock until resolved.
- **Broken** — removes the item from available stock and adds it to the broken count.
- **Resolved** — history of maintenance/broken records already resolved, with the measures taken.

To resolve an open record, select it and click **Resolve**, describing the applied solution — the item automatically becomes available again.

> Creating/editing is allowed for Editors and Administrators. Deleting is restricted to Administrators.

## 7. Registrations (Administrator only)

Manage the system's base data:

- **Equipment** — category, model, and total quantity.
- **Responsible parties** — teachers/staff authorized to pick up equipment.
- **Users** — system access accounts (name, login, password, access level), including RFID card linking.
- **Categories** — grouping for equipment.

### RFID Card (Users)

Click "Link card" next to a user to generate a unique token. Write the token to the physical card using `provision_card.py` (see the Hardware section of the README). The card can be regenerated or revoked at any time.

## 8. Export

Choose between exporting **Loans and returns** (by date range) or **Equipment** (current inventory state, with individual item selection). Available formats: CSV, Excel, and PDF. You can add a note that appears in the generated report.

## 9. Settings

- **Appearance** — switch between Light, Dark, or System theme (follows the OS automatically).
- **Notifications** — alert preferences (interface ready; saving restricted to Administrators).

## 10. Security

Any authenticated user can change their own password by providing the current password and a new one (minimum 8 characters).

## 11. My Profile

Read-only summary of the logged-in account: name, email/login, and access level.

## 12. Login and Guest Mode

- Click **Login** in the sidebar or on the home screen.
- **Administrator** sessions expire automatically after 30 minutes of inactivity.
- **Editor** sessions have no such limit.
- If an RFID card is linked, tapping it on the reader (Raspberry Pi/Arduino) logs the user in automatically, without a password.

## 13. Frequently Asked Questions

**I can't edit anything, even while logged in.**
Check your access level under "My Profile" — some actions (Registrations, deletion, settings) are Administrator-only.

**The system refuses the loan even though the equipment shows up in the registry.**
The available quantity may be at zero (items on loan or under maintenance). Check the Dashboard for the current stock levels.
