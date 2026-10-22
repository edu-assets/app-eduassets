# User Manual — eduAssets

> **Scope:** this manual describes the interface and workflows confirmed in the current eduAssets code. Use the UI names shown below; this document contains no credentials, records, or other real data.

## 1. Overview

eduAssets manages school-equipment inventory and loans. The interface covers **New loan**, **Returns**, **Dashboard**, **Control**, **Records**, **Export**, **Settings**, **Security**, and **My Profile**.

The current data model tracks quantities by **category/model**. It does not provide per-serial-number tracking; the **Number** field in Control is an operator-supplied identifier for an issue record.

## 2. Access levels and security boundaries

| Role | Operational capabilities | Restricted actions |
| --- | --- | --- |
| **Guest** | View anonymized stock, categories, loan summaries and issue summaries; use searches/exports derived from those views. | Cannot create, update, resolve, return, or delete records. Requester/responsible identities, notes and issue details are omitted/masked. Responsible-party listing, **Records**, **Security** and **My Profile** require authentication. |
| **Editor** | Sign in, register loans, edit items in open loans, confirm returns, create/edit/resolve **Control** records, and change the account's own password. | Cannot use **Records**, provision/revoke RFID, or delete issues. |
| **Administrator** | Everything an Editor can do, plus **Records**, user and RFID-card management, **Save Settings**, and deleting **Control** records. | Still subject to stock, format, and required-field validation. |

> **Important:** menus, indicators, and UI guards improve usability, but **they are not the security control**. The backend is the security boundary: it requires authentication/JWTs and enforces permissions on its routes. Do not treat a hidden button as proof of authorization.

### Log in and Guest Mode

1. Click **Log in** on the home screen or in the sidebar footer.
2. In the **Administrator Login** modal, fill in **E-mail / Login** and **Password**.
3. Click **Sign in**. After sign-in, the user menu shows the account name and role.
4. To finish, open the user menu and click **Log out**. The interface returns to **Guest Mode**.
5. **Contact the administrator** does not recover a password; it is the guidance shown when an account has no available password-recovery path.

**Administrator** sessions expire after 30 minutes of inactivity and return to the login modal. The current code does not apply that limit to **Editor** sessions. Backend activity state is process-local and assumes a single instance; horizontal scaling requires shared state.

### RFID (optional)

RFID is an alternative login path, not a system requirement or a replacement for password login.

1. An **Administrator** opens **Records → System Users** and selects **Link card** next to the account.
2. In the **RFID Card** modal, use **Generate token and link card**. The token is shown only once; copy it if needed.
3. With the bridge and reader ready, follow the README procedure to write the card. The UI may show **Recording mode active** and ask you to hold the card near the reader for the next 30 seconds.
4. Once linked, the modal shows **Card linked**. **Generate new token** replaces the current token; **Revoke card** invalidates that card for automatic login.
5. For browser-side tap login, the installation must also enable the RFID listener. While in Guest Mode, tap the card; the browser validates the token and reloads the linked account session.

The flow works only when configuration, networking, the local bridge, dependencies, and compatible hardware are correct. The backend requires loopback communication for `/auth/rfid` and `/ws/rfid`; a Raspberry Pi on the same LAN is not automatically sufficient. If it fails, use **Log in** with **E-mail / Login** and **Password**.

## 3. Home

On **Home**, use the shortcuts **New loan**, **Returns**, **Dashboard**, and **Control**. **Get started** opens the **Register Loan** panel. The page also offers **View documentation**.

## 4. Register Loan

The sidebar item is **New loan** and the panel title is **Register Loan**. It requires an **Editor** or **Administrator** session.

1. Under **Loan Details**, fill in **Requester** and select the **Responsible** person.
2. Check **Date and Time**. It is filled automatically; click it to choose a different pickup date when needed.
3. Under **Loan Items**, choose **Equipment**, enter **Qty.**, and click **Add**. Repeat for each model; items appear under **Added items**.
4. Optionally fill in **Note**.
5. Click **Register Loan**.

At least one item is required. Both the UI and backend validate available quantity in a transaction; if stock is insufficient, the loan is not created. When successful, available quantity is reduced.

## 5. Returns

1. Open **Returns**. The list shows loans whose status is open.
2. Click a row/card to open **Loan Details**. Review **Responsible**, **Requester**, items, and any note.
3. To correct items before returning, use **Edit items**. Select **Equipment**, enter **Quantity**, click **Add**, remove items when necessary, and finish with **Save Changes**. Use **Cancel** to abandon the edit. At least one item must remain.
4. Click **Return** in the list or **Confirm Return** in the detail panel.
5. Review the **Confirm Return** modal and click **Confirm Return**; **Cancel** closes it without completing the return.

Items become available again after confirmation. **Return Date and Time** is filled automatically and can be edited; on confirmation the UI sends the selected offset-aware ISO timestamp, which the backend validates and persists. Older clients that omit the field continue to use server-current time.

## 6. Dashboard

The **Dashboard** shows **Total equipment**, **Available**, **On Loan**, **Maintenance**, and **Broken** summary cards.

- In **Stock**, review totals by category. Click a row for the category's read-only details.
- In **History**, review loan dates, items, and status. Guest Mode masks/unavailable requester/responsible identities and notes; authenticated users see fields permitted by their authorization. Click **Details** when available.
- Use **Search by information...**. In **Stock**, it searches the category; in **History**, it searches number, requester, and responsible party.
- In **Stock**, **Export** immediately downloads a CSV of the current stock. In **History**, **Export** takes you to the **Export** panel for more options.

Displayed stock is derived from open loans and maintenance/broken issues. Check **Control** before interpreting a count affected by an issue.

## 7. Control

**Control** separates records into **Observation**, **Maintenance**, **Broken**, and **Resolved** tabs. Summary cards show open records.

### Create or edit a record

1. Click **New** and choose **Observation**, **Maintenance**, or **Broken**.
2. In the form, select **Category** and **Model**, enter **Number**, choose the **Issue**, and fill in **Description**. Available issue choices include **Screen**, **Audio**, **Battery**, **Cable**, **Touchscreen**, **Keyboard**, **Button**, **Casing**, and **Other**.
3. Click **Save**. For an existing row, select it, click **Edit**, change the fields, and save.

**Observation** is a note and does not change stock. **Maintenance** removes the affected quantity from available stock until resolution. **Broken** also removes it from available stock and increments the broken count.

### Resolve and delete

1. Select an issue in **Maintenance** or **Broken** and click **Resolve**.
2. Fill in **Measures taken** and click **Confirm resolution**. The record moves to **Resolved** and the quantity becomes available again; for **Broken**, the broken count is adjusted as well.
3. To permanently remove an issue, select it, click **Delete**, and confirm. This is irreversible and restricted to **Administrator**.

Creating, editing, and resolving require authentication (**Editor** or **Administrator**). The backend enforces these rules too; the UI must not be used as a security mechanism.

## 8. Records (Administrator)

**Records** is administrative. Open a card, fill in the fields, and click **Save**; **Cancel** closes the modal. **Registered** lists the data loaded from the API.

- **Equipment:** **Category**, **Model**, and **Quantity**.
- **Responsible Parties:** **Name** and **Role**.
- **System Users:** **Name**, **Email / Login**, **Password**, and **Access level** (**Administrator** or **Editor**).
- **Equipment Categories:** **Category Name**.

On a user row, **Link card** opens **RFID Card**. After linking, use **Generate new token** (replaces the current one), **Copy token** when available, or **Revoke card**. Treat the token as sensitive; do not publish it or include it in reports.

The current **Records** UI is designed to list/view and create the records shown. Do not assume that an edit or delete action available in another panel exists for every record type.

## 9. Export

Open **Export** and choose one of the cards:

| UI data type | Confirmed workflow |
| --- | --- |
| **Loans and returns** | Set **Start date** and **End date**; the current month is selected by default. The period filters records by the loan creation date. |
| **Equipment** | The report reflects the current inventory. Use **Select all** or choose equipment individually; at least one must be selected. |

Then:

1. Under **Export format**, choose **CSV**, **Excel**, or **PDF**.
2. Optionally add a note in **Note**; it appears in the report.
3. Review **Export summary** and click **Export Data**.

Confirmed formats are `.csv`, `.xlsx` (Excel), and `.pdf`. CSV and Excel contain the main table and, when applicable, issue sections; PDF produces the equivalent report. If no record matches the filters, the application refuses the export instead of creating an empty file.

## 10. Settings

In **Settings**:

- **Appearance → Theme:** choose **Light**, **Dark**, or **System**.
- **Language:** choose **Português** or **English**; the interface switches immediately.
- **Notifications:** switch **Loan alerts** and **Return alerts** between **Enabled** and **Disabled**.
- Click **Save Settings** when the UI offers it. Saving is restricted to **Administrator**.

Theme and language are browser preferences. The notification interface is present, but the inspected code exposes no backend route for persisting alerts; do not treat the visual switch state as proof that a notification was delivered.

## 11. Account Security

Open **Security** from the user menu and click **Change password**. Fill in **Current password**, **New password**, and **Confirm new password**; the new password must contain at least 8 characters and the confirmation must match. Click **Update password** or **Cancel**.

Changing a password is available only to the authenticated account and requires the current password. **Password recovery is not implemented**; if the password is lost, use **Contact the administrator**.

## 12. My Profile

From the user menu, open **My profile**. The **My Profile** panel is read-only and shows **Full name**, **Email** (the account login), and **Access level**. Use **Log out** to end the session.

## 13. Data and installation reference

The current schema relates:

- **Category** and **Equipment** (model, total, available, and broken quantities);
- **Responsible Party**;
- **User**, with **Administrator** or **Editor** access and an optional RFID token;
- **Loan** and its items, with open/returned status;
- **Issue**, with observation/maintenance/broken type and open/resolved status.

Anyone preparing an installation should follow the README and provide local values in `.env`: PostgreSQL in `DATABASE_URL`, `DIRECT_URL` when needed, a strong `JWT_SECRET` (at least 32 characters), `CORS_ORIGIN` outside local mode, and `VITE_API_BASE_URL` for a build that does not use the Vite proxy. Never put real passwords, tokens, or secrets in this manual or in the repository.

## 14. Confirmed limitations

- **Return date:** the selected offset-aware timestamp is persisted; older clients may omit it and use server time. Changing the field does not rewrite existing historical records.
- **RFID:** optional and dependent on configuration (`RFID_BRIDGE_ENABLED`/`VITE_RFID_BRIDGE_ENABLED`), network/loopback reachability, bridge, dependencies, and compatible hardware. The same LAN alone does not guarantee operation.
- **Deployment:** a real deployment, public domain, proxy, hosted database, or backup policy was not validated by this work. The README describes local development and technical preparation.
- **Password:** there is no password recovery; only the authenticated change in **Security** is available.
- **UI security:** guestGate, permissions, and `data-requires-*` attributes guide the interface. Effective authorization is enforced by backend routes/controllers.
- **Inventory granularity:** the system tracks quantities by model/category, not individual serial numbers.
- **Data:** this manual contains no real data; use only accounts, people, equipment, and tokens authorized by your installation.

## 15. Quick troubleshooting

**I cannot create, edit, or return anything.** Check the role under **My Profile**, confirm that the session is still active, and try again. **Guest Mode** is read-only.

**The loan is rejected.** Check **Available** on the **Dashboard**; items already on loan or in **Maintenance** cannot be checked out. Confirm that at least one item is in the form.

**The RFID card does not work.** Check both flags, the shared secret, bridge process, loopback connection, reader, and card link. Use password login while troubleshooting.

**The export is not generated.** Review the type, period, selected equipment, and format. The application does not create a file when no record matches the filters.
