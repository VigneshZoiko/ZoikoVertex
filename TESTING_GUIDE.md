# ZoikoVertex — Tester QA Guide

**Version:** June 2026  
**Prepared by:** ZoikoVertex Engineering  
**Scope:** Pre-launch QA — features ready for testing

---

## Quick Start

| Item | Detail |
|---|---|
| **App URL** | `https://app.zoikovertex.com` (or local: `http://localhost:3000`) |
| **Bug Reports** | Share issues via the agreed channel with screenshot + steps to reproduce |
| **Test Env** | Staging — safe to create/delete anything |

---

## Test Accounts

Request credentials from the team. You will need one account per role listed below.

| Role | What it can access |
|---|---|
| `SUPERADMIN` | Full platform-owner panel, all workspaces |
| `WORKSPACE_OWNER` | All features within one workspace |
| `ADMIN` | Team, settings, governance, integrations |
| `GOVERNANCE_ADMIN` | Rules, validation desk, review queue, QA |
| `REVIEWER` | Review queue only |
| `VALIDATOR` | Validation desk + review queue |
| `APPROVER` | Approval rules + review queue |
| `CREATOR` | Library upload, campaigns |
| `PUBLISHER` | Publish, inbox, campaigns |
| `DEVELOPER` | API & webhooks, integrations |

---

## 1. Login Flow

**URL:** `/login` or `/signin`

### 1.1 Email + Password Login
| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/login` | Login page loads cleanly |
| 2 | Enter valid email + password → Submit | Redirects to `/dashboard` |
| 3 | Enter wrong password → Submit | Shows "Invalid credentials" error, stays on login |
| 4 | Leave email blank → Submit | Shows validation error on email field |
| 5 | Enter unregistered email → Submit | Shows appropriate error |

### 1.2 Forgot Password
| Step | Action | Expected Result |
|---|---|---|
| 1 | Click "Forgot password?" | Goes to reset password page |
| 2 | Enter valid email → Submit | Shows "Check your email" confirmation |
| 3 | Open reset link from email | Opens password reset form |
| 4 | Set new password → Submit | Password updated, redirected to login |

### 1.3 Session Persistence
| Step | Action | Expected Result |
|---|---|---|
| 1 | Login successfully | Dashboard loads |
| 2 | Close and reopen tab | Still logged in, no re-auth required |
| 3 | Click logout | Redirected to login, session cleared |

---

## 2. Signup Flow

**URL:** `/signup`

### 2.1 New Account Registration
| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/signup` | Signup form loads |
| 2 | Fill name, email, password → Submit | Verification email sent or direct login |
| 3 | Try to sign up with an already-used email | Shows "Email already registered" error |
| 4 | Try weak password (e.g. `123`) | Shows password strength error |
| 5 | Leave required fields blank → Submit | Inline validation errors shown |

### 2.2 Post-Signup Onboarding
| Step | Action | Expected Result |
|---|---|---|
| 1 | Complete signup | Redirected to onboarding or dashboard |
| 2 | Workspace is created automatically | Workspace name visible in header/sidebar |

---

## 3. SSO / OAuth Flow

**Available on both `/signin` and `/signup`**  
**Providers: Google, Microsoft (Azure)**

### 3.1 Google OAuth
| Step | Action | Expected Result |
|---|---|---|
| 1 | Click "Continue with Google" on login or signup | Google OAuth popup/redirect opens |
| 2 | Select a Google account | Redirects back to app |
| 3 | First-time OAuth user | Account created, lands on dashboard or onboarding |
| 4 | Returning OAuth user | Logs in directly, lands on dashboard |
| 5 | Close OAuth popup / cancel | Returns to login page, no error state |

### 3.2 Microsoft (Azure) OAuth
| Step | Action | Expected Result |
|---|---|---|
| 1 | Click "Continue with Microsoft" | Microsoft login page opens |
| 2 | Log in with Microsoft account | Redirected back, logged in |
| 3 | Cancel Microsoft login | Returns to login page cleanly |

### 3.3 OAuth Edge Cases
| Step | Action | Expected Result |
|---|---|---|
| 1 | Use same email via Google that was registered by email/password | Should merge or show clear message |
| 2 | Revoke app permissions from Google, then try OAuth again | Re-prompts for permissions |

---

## 4. Media Vault (Asset Library)

**URL:** `/library`  
**Roles:** CREATOR, CAMPAIGN_MANAGER, ADMIN, WORKSPACE_OWNER

### 4.1 Asset Upload — Drag & Drop
| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/library` | Media vault loads with grid of assets |
| 2 | Drag an image (JPG/PNG) onto the upload zone | Upload progress shown, asset appears in grid |
| 3 | Drag a video (MP4) onto the upload zone | Video uploads, thumbnail generated |
| 4 | Drag a PDF or document | Uploads, shows document icon |
| 5 | Drop multiple files at once | All files upload in parallel |
| 6 | Drop a very large file (>50MB) | Shows size limit error or progress clearly |

### 4.2 Asset Checks & Validation
| Step | Action | Expected Result |
|---|---|---|
| 1 | Upload an image with a logo | Asset appears in library |
| 2 | Click on an asset | Detail view opens — shows file name, size, type, upload date |
| 3 | Upload a file type that isn't allowed (e.g. .exe) | Rejected with clear error |
| 4 | Upload duplicate file | Either shows warning or deduplicates |

### 4.3 Asset Management
| Step | Action | Expected Result |
|---|---|---|
| 1 | Search for an asset by name | Filtered results show |
| 2 | Filter by file type (image/video) | Only matching assets shown |
| 3 | Delete an asset | Asset removed from grid, confirmation shown |
| 4 | Select multiple assets | Bulk selection works |

---

## 5. Approval Rules

**URL:** `/governance/rules`  
**Roles:** GOVERNANCE_ADMIN, ADMIN, WORKSPACE_OWNER, APPROVER

### 5.1 Creating a Rule
| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/governance/rules` | Rules list loads |
| 2 | Click "New Rule" | Create rule form/panel opens |
| 3 | Fill in rule name, description, risk level, keywords | Form accepts input |
| 4 | Submit | Rule appears in the rules list |
| 5 | Create rule with no name | Validation error shown |

### 5.2 Managing Rules
| Step | Action | Expected Result |
|---|---|---|
| 1 | Click on an existing rule | Rule detail/edit panel opens |
| 2 | Edit rule name → Save | Change reflected immediately in the list |
| 3 | Delete a rule → Confirm | Rule removed from list, does NOT come back on page reload |
| 4 | Delete a rule → Cancel the confirm dialog | Rule is NOT deleted |
| 5 | Reload the page after deletion | Deleted rule stays gone |

### 5.3 Rule Status
| Step | Action | Expected Result |
|---|---|---|
| 1 | Create a rule | Starts in DRAFT status |
| 2 | Submit for review | Status changes to IN_REVIEW |
| 3 | Publish a rule | Status changes to ACTIVE |
| 4 | Deactivate an active rule | Status changes to INACTIVE |

---

## 6. Validation Desk

**URL:** `/validation`  
**Roles:** VALIDATOR, GOVERNANCE_ADMIN, APPROVER, ADMIN, WORKSPACE_OWNER

### 6.1 Viewing Items
| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/validation` | Validation queue loads with pending items |
| 2 | Click an item | Detail panel opens on the right |
| 3 | Scroll through item details | Content, metadata, and checks visible |

### 6.2 Running Checks
| Step | Action | Expected Result |
|---|---|---|
| 1 | Click "Run Automated Checks" on an item | Check runs, results appear below |
| 2 | Check passes | Green status shown |
| 3 | Check fails (keyword match, policy breach) | Red flag with reason shown |

### 6.3 Approve / Reject
| Step | Action | Expected Result |
|---|---|---|
| 1 | Review an item → Click "Approve" | Item moves out of validation queue |
| 2 | Review an item → Click "Reject" with reason | Item marked rejected, reason saved |
| 3 | Approve an item | Status updates in real time |

---

## 7. Review Queue

**URL:** `/review-queue`  
**Roles:** REVIEWER, VALIDATOR, APPROVER, GOVERNANCE_ADMIN, ADMIN, WORKSPACE_OWNER

### 7.1 Tabs
| Tab | Purpose |
|---|---|
| **Needs Review** | Shared pool of items waiting to be claimed |
| **Resolve** | Items you have claimed — your active work |
| **Resolved** | Completed items |

### 7.2 Claiming and Resolving
| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to "Needs Review" tab | Items listed with submitter name (not UUID) |
| 2 | Click an item | Detail opens — shows content and media |
| 3 | Claim an item | Moves to "Resolve" tab |
| 4 | On "Resolve" tab — Approve / Reject | Item moves to "Resolved" |
| 5 | Go to "Resolved" tab | Completed items shown with outcome |

### 7.3 Media Preview
| Step | Action | Expected Result |
|---|---|---|
| 1 | Open an item with an image | Image renders in the right panel |
| 2 | Open an item with a video | Video player shown |
| 3 | Open an item with no media | Text content shown, no broken image |
| 4 | Instagram post item | Two-pane layout: info on left, media on right (black bg) |

---

## 8. Roles & Users Access

**URL:** `/access/roles` (roles) and `/team` (team members)  
**Roles:** ADMIN, WORKSPACE_OWNER, SUPERADMIN

### 8.1 Inviting Users
| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/team` | Team member list loads |
| 2 | Invite a new user by email with a role | Invite sent, user appears as pending |
| 3 | Invite with an invalid email | Validation error shown |
| 4 | Invite a user who is already a member | Shows duplicate warning |

### 8.2 Role Assignment & Access Control
| Step | Action | Expected Result |
|---|---|---|
| 1 | Assign a user the `REVIEWER` role | They can access `/review-queue` but not `/admin` |
| 2 | Assign a user the `VALIDATOR` role | They can access `/validation` and `/review-queue` |
| 3 | Assign a user the `CREATOR` role | They can access `/library` but not governance pages |
| 4 | Assign a user the `DEVELOPER` role | They can access `/integrations/api` |
| 5 | Log in as each role | Sidebar shows only permitted sections |
| 6 | Try to navigate directly to a restricted URL | Redirected or shown "Access Denied" |

### 8.3 Role Management
| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/access/roles` | Roles list loads |
| 2 | View permissions for a role | Permissions listed clearly |
| 3 | Change a user's role | Updated immediately, sidebar adjusts on next login |
| 4 | Remove a user from the workspace | User loses access |

---

## 9. Platform Owner Panel (SUPERADMIN)

**URL:** `/platform-login`  
**Role:** SUPERADMIN only


### 9.1 Global Analytics
| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/superadmin/analytics` | Platform-wide stats load (workspaces, users, activity) |
| 2 | Check metrics are populated | Numbers shown, not blank/zero |

### 9.2 Support Queue
| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/superadmin/tickets` | Support ticket list loads |
| 2 | Click a ticket | Ticket detail opens |
| 3 | Resolve a ticket | Ticket status updates |

---

## 10. API & Webhooks

**URL:** `/integrations/api`  
**Roles:** ADMIN, WORKSPACE_OWNER, DEVELOPER

### 10.1 API Keys
| Step | Action | Expected Result |
|---|---|---|
| 1 | Go to `/integrations/api` | API keys section loads |
| 2 | Generate a new API key | Key shown once — copy it |
| 3 | Copy the key and make a test API call | Returns valid response with auth |
| 4 | Regenerate / revoke a key | Old key no longer works |
| 5 | Log in as REVIEWER (no API access) | `/integrations/api` not visible or accessible |

### 10.2 Webhooks
| Step | Action | Expected Result |
|---|---|---|
| 1 | Add a webhook URL | Saved to list |
| 2 | Select events to subscribe (e.g. `content.approved`) | Events shown in config |
| 3 | Trigger the subscribed event in the app | Webhook fires to the URL |
| 4 | Delete a webhook | Removed from list |
| 5 | Add an invalid URL (no https) | Validation error or warning shown |

---

## General Checks (All Features)

Run these across every section above:

- [ ] Page loads without console errors
- [ ] No broken layouts on 1280px wide screen
- [ ] Buttons are not double-clickable (disabled after first click)
- [ ] All delete/destructive actions require a confirmation dialog
- [ ] Success and error toast messages appear and disappear cleanly
- [ ] Navigating away and back retains correct state
- [ ] Sidebar shows only sections the current role is permitted to see

---

