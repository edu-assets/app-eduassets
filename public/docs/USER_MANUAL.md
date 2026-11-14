# User Manual — eduAssets

## 1. Overview

eduAssets manages school-equipment inventory and loans. The interface covers **New loan**, **Returns**, **Dashboard**, **Control**, **Records**, **Export**, **Settings**, **Security**, and **My Profile**.

The current data model tracks quantities by **category/model**. It does not provide per-serial-number tracking; the **Number** field in Control is an operator-supplied identifier for an issue record.

## 2. Access levels and security boundaries

| Role | Operational capabilities | Restricted actions |
| --- | --- | --- |
| **Guest** | View anonymized stock, categories, loan summaries and issue summaries; use searches/exports derived from those views. | Cannot create, update, resolve, return, or delete records. Requester/responsible identities, notes and issue details are omitted/masked. Responsible-party listing, **Records**, **Security** and **My Profile** require authentication. |
| **Editor** | Sign in, register loans, edit items in open loans, confirm returns, create/edit/resolve **Control** records, and change the account's own password. | Cannot use **Records**, provision/revoke RFID, or delete issues. |
| **Administrator** | Everything an Editor can do, plus **Records**, user and RFID-card management, and deleting **Control** records. | Still subject to stock, format, and required-field validation. |

> **Important:** menus, indicators, and UI guards improve usability, but **they are not the security control**. The backend is the security boundary: it requires authentication/JWTs and enforces permissions on its routes. Do not treat a hidden button as proof of authorization.

### Log in and Guest Mode

1. On the entry screen, enter **E-mail / Login** and **Password**; for limited read-only access, choose **Continue as guest**.
2. Click **Sign in**. After sign-in, the user menu shows the account name and role. In Guest Mode, a **Guest mode — read-only** banner with a **Sign in** button stays at the top (you can dismiss it for the session); unavailable actions are announced as such, with the hint "Sign in to save changes."
3. To end the session, open the user menu and click **Log out**. The system requests revocation from the backend, removes this device's notification subscription (if any) and returns to the login screen.

**Privacy and cookies:** the entry screen links to the **Terms of Use** and the **Privacy Policy**, which explains which data eduAssets processes, who it is shared with, how long it is kept and how to exercise your rights. On the first visit, a notice asks whether you accept **statistics cookies** (Google Analytics); choose **Accept** or **Decline**. Without consent, nothing from Google is loaded and the system works normally. To change your choice, open the Privacy Policy and click **Cookie preferences**.

**Password recovery:** if you forgot your password and your login is an email address, click **Forgot my password** on the entry screen, enter the email and select **Send link**. For security, the same message is shown whether or not the account exists. The email comes from `nao-responda@eduassets.tech` with the subject **Reset your eduAssets password** (check the spam folder if it does not arrive within a few minutes) and contains a **Set a new password** button, the full link and the request details; the link is valid for 30 minutes and a single use, and only the most recent request is valid. On the screen opened by the link, fill in **New password** and **Confirm new password** (12+ characters with uppercase, lowercase, number and symbol) and click **Save new password**: every open session of the account is ended and you sign in with the new password. If you did not request the reset, ignore the email: your current password keeps working. If the link is not shown on the entry screen (installation without email configured) or your login is not an email address, ask an **Administrator** to reset it in **Records → System Users** (section 8).

The browser uses cookie-only sessions with an `HttpOnly` cookie and a JWT lifetime of up to 8 hours; page JavaScript cannot read that cookie. On production HTTPS, the cookie is also `Secure`. If the API cannot confirm cookie support, login fails closed without a Bearer fallback or a JWT written to `localStorage`. **Administrator** sessions expire after 30 minutes of inactivity; 2 minutes before, a warning with a countdown offers **Stay signed in** or **Sign out now**. Activity in one tab counts for all open tabs. After expiry you return to the login screen and, after signing in again, to the panel you were on. **Editor** sessions do not expire by default; Editors can turn on an optional limit in **Settings → Session** (section 10). Backend activity state is process-local and assumes a single instance; horizontal scaling requires shared state.

**Panel addresses:** each panel has its own address (for example, `#app/devolucoes` or `#app/dashboard/historico`). Reloading keeps the panel open, the browser back and forward buttons work and the tab title shows the current panel. Administrator-only panels (such as **Records**) redirect users without access. After an explicit **Sign out**, the next user starts at **Home** and other tabs are signed out too.

**Security note:** **Log out** asks the server to revoke the account's session version and remove the cookie. A successful password change also revokes earlier sessions while keeping this browser signed in with a renewed session. If the API is unavailable during logout, the browser records the logout as pending: the session is not restored when the app is reopened, and server-side revocation is retried automatically when connectivity returns or the next time the app opens. Use trusted devices and contact the installation administrator if you suspect the account was exposed. The current browser app has no Bearer fallback.

### RFID (optional)

RFID is an alternative login path, not a system requirement or a replacement for password login.

1. An **Administrator** opens **Records → System Users** and selects **Link card** next to the account.
2. On the **RFID Card** screen (opened inside the **Records** window itself, with **Back**), use **Generate token and link card**. The backend sends the credential to the bridge for writing and returns confirmation only; the API response does not expose the RFID token.
3. With the bridge and reader ready, follow the README procedure and tap the card within the next 30 seconds to write it.
4. Once linked, the screen shows **Card linked**. **Generate new token** replaces the current token; **Revoke card** invalidates that card for automatic login.
5. For browser-side tap login, the installation must also enable the RFID listener. While in Guest Mode, tap the card; the bridge sends a one-time code that the browser exchanges for an `HttpOnly` session cookie, without receiving a raw JWT.

The flow works only when configuration, networking, the local bridge, dependencies, and compatible hardware are correct. The backend requires loopback communication for `/auth/rfid` and `/ws/rfid`; a Raspberry Pi on the same LAN is not automatically sufficient. If it fails, use **Log in** with **E-mail / Login** and **Password**.

## 3. Home

On **Home**, use the shortcuts **New loan**, **Returns**, **Dashboard**, and **Control**. **Get started** opens the **Register Loan** panel. The page also offers **View documentation**.

**Automatic updates:** the screen refreshes itself every 30 seconds while it is open, as soon as you return to the app or tab and, for administrators, immediately when a notification arrives. There is no need to reload the page.

## 4. Register Loan

The sidebar item is **New loan** and the panel title is **Register Loan**. It requires an **Editor** or **Administrator** session; guests see the notice "Sign in to save changes." before the form.

1. Under **Loan Details**, fill in **Requester** (for signed-in users the field suggests names already used) and select the **Responsible** person.
2. Check **Date and Time**. It is filled automatically; click it to choose a different pickup date when needed.
3. Under **Loan Items**, choose **Equipment**, enter **Qty.**, and click **Add**. Repeat for each model; items appear under **Added items** as compact chips with the equipment icon and only the model name on one line (the category appears on hover and for screen readers).
4. Optionally fill in **Note**.
5. Click **Register Loan**.

In the **Equipment** list each model shows "(N available)" and unavailable models are disabled; **Qty.** is limited to what is available, with an inline error. **Note** has a character counter (0/250).

At least one item is required. Both the UI and backend validate available quantity in a transaction; if stock is insufficient, the loan is not created. When successful, available quantity is reduced.

While **Date and Time** is untouched, the field follows the server clock and the record uses the server time at the moment of saving. If you change the field, your chosen time is kept. Dates more than 5 minutes in the future are not accepted.

## 5. Returns

1. Open **Returns**. The list shows loans whose status is open.
2. Click a row/card to open **Loan Details**. Review **Responsible**, **Requester**, items, and any note.
3. To correct items before returning, use **Edit items**. Select **Equipment**, enter **Quantity**, click **Add**, remove items when necessary, and finish with **Save Changes**. Use **Cancel** to abandon the edit. At least one item must remain.
4. Click **Return** in the list or **Confirm Return** in the detail panel.
5. Review the **Confirm Return** modal and click **Confirm Return**; **Cancel** closes it without completing the return.

Each loan card has a **Details** button (also keyboard accessible). Signed-in users see in **Details** who registered and who returned the loan. Use the search box (requester, responsible, equipment and who registered it) and the sort control, two buttons **Oldest first** / **Newest first**, to find a loan. On mobile, the search field ("Search requester, equipment…") takes the full width. With no results the screen says "No results for x" and offers **Clear search** or **Clear filters**.

Items become available again after confirmation. **Return Date and Time** is filled automatically and can be edited; on confirmation the UI sends the selected offset-aware ISO timestamp, which the backend validates and persists. Older clients that omit the field continue to use server-current time.

If **Return Date and Time** is untouched, the record uses the server time at the moment of confirmation. A return cannot be earlier than the loan's checkout, and dates more than 5 minutes in the future are not accepted.

## 6. Dashboard

The **Dashboard** shows **Total equipment**, **Available**, **On Loan**, **Maintenance**, and **Broken** summary cards, without percentage text. On phones the cards are narrower: **Total** sits on its own row and the others in a 2×2 grid.

- In **Stock**, review totals by category; the **Out of stock** badge appears when no unit is available and **Low stock** when 10% or less of the total (at least 1 unit) is available. Click a row for the category's read-only details.
- In **History**, review loan dates, items, and status. Guest Mode masks/unavailable requester/responsible identities and notes; authenticated users see fields permitted by their authorization. Signed-in users also see authorship (who registered and who returned); Guests never receive this data. Stock details show who created and changed the equipment. On phones the History cards have a clearer hierarchy (title, status and details separated, like the **Stock** cards). On first load the Dashboard shows loading skeletons and "—" counters; if loading fails, an in-panel error with **Try again** appears. Click **Details** when available.
- Use **Search by information...**. In **Stock**, it searches the category; in **History**, it searches number, requester, and responsible party.
- **History filters:** History loads 50 loans at a time; use **Load more** and follow **Showing N loans** (guests too). The status chips (**All**, **Open**, **Returned**) and period chips (**Today**, **7 days**, **This month**, **All time**) combine with search, which for signed-in users runs on the server over the whole history. **Clear filters** returns to the full view.
- In **Stock**, **Export** immediately downloads a CSV of the current stock. In **History**, **Export** takes you to the **Export** panel for more options.

Displayed stock is derived from open loans and maintenance/broken issues. Check **Control** before interpreting a count affected by an issue.

## 7. Control

**Control** separates records into **Observation**, **Maintenance**, **Broken**, and **Resolved** tabs. Summary cards show open records. The record cards separate title, status and details, like the **Stock** cards. Signed-in users see who created, changed and resolved each record. **Learn more** opens this manual. If loading fails, the panel shows an error with **Try again**.

### Create or edit a record

1. Click **New** and choose **Observation**, **Maintenance**, or **Broken**.
2. In the form, select **Category** and **Model**, enter **Number**, choose the **Issue**, and optionally fill in **Description**; an empty description is stored as “—”. Available issue choices include **Screen**, **Audio**, **Battery**, **Cable**, **Touchscreen**, **Keyboard**, **Button**, **Casing**, and **Other**.
3. Click **Save**. For an existing row, select it, click **Edit**, change the fields, and save. Required fields show the error inline, and save, resolve and delete ignore double clicks.

The **Control** tabs and menus work with the keyboard: arrows and Home/End to navigate and Esc to close.

**Observation** is a note and does not change stock. **Maintenance** removes the affected quantity from available stock until resolution. **Broken** also removes it from available stock and increments the broken count.

### Resolve and delete

1. Select an issue in **Maintenance** or **Broken** and click **Resolve**.
2. Fill in **Measures taken** and click **Confirm resolution**. The record moves to **Resolved** and the quantity becomes available again; for **Broken**, the broken count is adjusted as well.
3. To permanently remove an issue, select it, click **Delete**, and confirm. This is irreversible and restricted to **Administrator**.

Creating, editing, and resolving require authentication (**Editor** or **Administrator**). The backend enforces these rules too; the UI must not be used as a security mechanism.

## 8. Records (Administrator)

**Records** is administrative. Open a card, fill in the fields, and click **Save**. The **Records** window has a single scroll (full-screen on phones) and never opens another modal on top of it. **Edit**, **Adjust total**, **Rename**, **Reset password** and **RFID Card** open an edit view inside the same window, with **Back**, a title and the record name; **Cancel** and **Save** stay fixed at the bottom (above the phone keyboard). **Back**, **Cancel**, Esc or saving return to the list, keeping the search and scroll position. **Registered** lists the data loaded from the API; the **System Users** list does not scroll sideways on phones.

- **Equipment:** **Category**, **Model**, and **Quantity**. **Adjust total** changes a model's total quantity and cannot go below the items in use.
- **Responsible Parties:** **Name** and **Role**. They can be edited, deactivated and reactivated; inactive responsible parties do not appear in the **Register Loan** form, but older loans stay in the history.
- **System Users:** **Name**, **Email / Login** (must be an email), **Password**, and **Access level** (**Administrator** or **Editor**). Name, access level and login can be edited, and the user can be deactivated or reactivated (with confirmation); deactivated users show an **Inactive** badge, and logins that are not valid emails show a warning. You cannot deactivate or demote your own account, nor remove the last active administrator. Password recovery only works if the login's mailbox really exists.
- **Equipment Categories:** **Category Name**; an existing category can be renamed (the name cannot duplicate another).

On a user row, **Link card** opens the **RFID Card** edit view. After linking, use **Generate new token** (replaces the current one), **Copy token** when available, or **Revoke card**. Treat the token as sensitive; do not publish it or include it in reports.

The **Reset password** button (padlock icon) next to each user opens the edit view to set a temporary password. Fill in **New password** and **Confirm new password**: at least 12 characters with an uppercase letter, a lowercase letter, a number and a symbol are required (72 bytes maximum). On confirmation, all of the user's open sessions are ended and the action is recorded in the audit log as `PASSWORD_RESET`. Hand over the temporary password through a secure channel and ask the user to change it in **Security**. For your own account, use **Security** (the button shows a notice instead of opening the edit view).

**Records** lists have search and, for signed-in users, show who created each record. The current UI is designed to list/view, create and, for users and equipment totals, adjust the records shown. Do not assume that an edit or delete action available in another panel exists for every record type.

## 9. Export

Open **Export** and choose one of the cards:

| UI data type | Confirmed workflow |
| --- | --- |
| **Loans and returns** | Set **Start date** and **End date**; the current month is selected by default. The period filters records by the loan checkout date, and the export includes every loan in the period, even if there are more than 50. |
| **Equipment** | The report reflects the current inventory. Use **Select all** or choose equipment individually; at least one must be selected. |

Then:

1. Under **Export format**, choose **CSV**, **Excel**, or **PDF**.
2. Optionally add a note in **Note**; it appears in the report.
3. Review **Export summary** and click **Export Data**.

When signed in, exports include **Registered by** and **Returned by** (loans) and **Created by** (occurrences).

Confirmed formats are `.csv`, `.xlsx` (Excel), and `.pdf`. CSV and Excel contain the main table and, when applicable, issue sections; PDF produces the equivalent report. If no record matches the filters, the application refuses the export instead of creating an empty file.

## 10. Settings

In **Settings**:

- **Appearance → Theme:** choose **Light**, **Dark**, or **System**.
- **Language:** choose **Português** or **English**; the interface switches immediately.
- **Notifications:** per-device activation, with switches for loans, returns and issues (see the subsection below).

Theme and language apply immediately and are saved as preferences in this browser; there is no save button.

### Session (Editors)

In **Settings → Session**, an Editor can turn on **Sign out after inactivity** and choose the idle time (15, 30 or 60 minutes). It is off by default, applies to this browser only and, before signing out, a warning lets you **Stay signed in**. For Administrators the 30-minute limit always applies.

### Push notifications for administrators

Administrators receive a system notification, on the computer or the phone, whenever another user registers a **loan**, a **return** or an **issue**. The notification arrives even with the app closed or the phone locked. It is sent only to active **Administrator** accounts that enabled the feature on that device; **Editor** accounts never receive it, and the user who registered the operation does not get their own alert.

To enable it:

1. Click **Turn on notifications** in the banner at the top of the app or, in **Settings**, on the **Notifications** card, **Turn on notifications on this device**. The banner appears for administrators without notifications on this device; **Not now** hides it for 7 days on that device.
2. When the browser asks, click **Allow**.
3. Click **Send test notification** to confirm that it arrives.
4. Use the switches for **loans**, **returns** and **issues** to choose what reaches this device. They apply immediately.

To turn it off on this device, click **Turn off on this device**.

- **Android:** Chrome works directly.
- **iPhone and iPad:** require iOS 16.4 or later and the app installed on the home screen. In Safari, tap **Share → Add to Home Screen**, open the app from its icon, sign in as an administrator and then enable notifications.
- **Permission prompt does not appear:** click the icon next to the site address (crossed-out bell, padlock or site settings) › **Notifications** › **Allow**. The app finishes the activation by itself, provided you asked for it in this session or the banner is showing. If you allow the permission after the prompt disappeared, the activation finishes on its own and the banner goes away.
- **Activation error messages:** only one activation runs at a time (also across tabs and the installed app) and a transient failure is retried once automatically. If the message says the browser's notification service did not respond, check your connection and try again in a moment. If it says the browser rejected the server's notification key, try again and, if it persists, tell the administrator of the installation. If the permission prompt was closed without an answer, tap **Turn on notifications** and choose **Allow**. Subscriptions created with an old server key are replaced automatically.
- **Blocked by the browser:** in the same place, change it to **Allow** and reload the page.
- **Brave:** turn on **Use Google services for push messaging** in `brave://settings/privacy`.
- **Only appears inside the app:** the notification is a system notification and appears even with the eduAssets tab in the background, another program in front, or the tab closed (browser open). If it only appears inside the app, check the operating system: on Windows, **Settings › System › Notifications** (notifications on, the browser allowed and **Do not disturb** off); on macOS, **System Settings › Notifications › the browser**.

**Content:** the title is **Novo empréstimo**, **Devolução registrada** or **Nova ocorrência** (Portuguese in this version). Loan and return notifications show the requester, the equipment and who registered the operation, for example: *João Silva · Notebook Dell ×2, Projetor Epson ×1 · por Ana Souza*. Issue notifications show the equipment, the type (**Observação**, **Manutenção** or **Quebrado**) and who registered it. Equipment appears as "Category Model", up to three items and then "e mais N" ("and N more"). A notification never shows notes, descriptions, problem text, measures taken or patrimony numbers, and one issue request produces a single notification even when it has several patrimony numbers. The notification can appear on the lock screen. Tapping a loan or return notification opens the **Dashboard** on the **History** tab; tapping an issue notification opens the **Control** panel.

**Sound and alerts:** the system notification uses the device's default sound and vibration, because browsers do not allow a custom sound. With the app open and visible, it also shows a highlighted toast and plays its own short sound, which can be turned off with the **Sound inside the app** switch. On desktop the notification stays until dismissed; on Android it vibrates.

**Subscriptions:** clicking **Log out** removes that device's subscription, so a shared computer stops receiving alerts; expiry by inactivity does not remove it. Changing the password, or having it reset by an administrator, removes all of the account's subscriptions: enable notifications again afterwards.

## 11. Account Security

Open **Security** from the user menu and click **Change password**. Fill in **Current password**, **New password**, and **Confirm new password**; the new password must contain at least 12 characters with an uppercase letter, a lowercase letter, a number and a symbol (maximum 72 bytes), must differ from the current password, and the confirmation must match. Password fields have a button to show or hide the text and a checklist that ticks off the requirements as you type (the same applies when resetting a password, recovering access and creating users); the form also submits with Enter. Click **Update password** or **Cancel**. **Last change** shows the date of the last password change (**No record** if none).

Changing a password is available only to the authenticated account and requires the current password. If the password is lost, use **Forgot my password** on the entry screen (section 2) or **Contact the administrator**: an administrator can reset it in **Records → System Users** (section 8).

**On-screen notifications:** app notifications are announced to screen readers, have a close button, pause briefly on hover and sit at the bottom center on mobile. All of them close on their own, including errors (after 8 seconds). Identical messages are not stacked (a repeated one refreshes the one already shown) and at most 3 are visible at once.

## 12. My Profile

From the user menu, open **My profile**. The **My Profile** panel is read-only and shows **Full name**, **Email** (the account login), and **Access level**. Use **Log out** to end the session. The panel subtitle is neutral for Editors. In Guest Mode, blocked actions show "Sign in to record changes."

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
- **Deployment:** the official instance runs at `app.eduassets.tech` with the API at `api.eduassets.tech` (dated records in the [Hosting Guide](Hosting.md)). Daily encrypted backups with retention, external monitoring and a restore drill are described in the same guide; the operator records when each item is enabled on the VM.
- **Password:** each user changes their own in **Security** and can recover it by email through **Forgot my password** (when the installation has email configured); administrators can also reset passwords in **Records → System Users**.
- **UI security:** guestGate, permissions, and `data-requires-*` attributes guide the interface. Effective authorization is enforced by backend routes/controllers.
- **Push notifications:** the text is shown in Portuguese in this version, and the sound is the device default because browsers do not allow a custom sound.
- **Inventory granularity:** the system tracks quantities by model/category, not individual serial numbers.
- **Data:** this manual contains no real data; use only accounts, people, equipment, and tokens authorized by your installation.

## 15. Quick troubleshooting

**I cannot create, edit, or return anything.** Check the role under **My Profile**, confirm that the session is still active, and try again. **Guest Mode** is read-only.

**The loan is rejected.** Check **Available** on the **Dashboard**; items already on loan or in **Maintenance** cannot be checked out. Confirm that at least one item is in the form.

**The RFID card does not work.** Check both flags, the shared secret, bridge process, loopback connection, reader, and card link. Use password login while troubleshooting.

**The export is not generated.** Review the type, period, selected equipment, and format. The application does not create a file when no record matches the filters.

**I do not receive push notifications.** Confirm that your account is an **Administrator** and that notifications are enabled on this device under **Settings → Notifications**; use **Send test notification**. On iPhone or iPad, the app must be installed on the home screen (iOS 16.4 or later). If the browser blocked the prompt, allow notifications in the site settings and reload the page. If a message says the browser's notification service did not respond or that the browser rejected the server key, try again in a moment; if the **server key** message persists, contact the administrator of the installation.
