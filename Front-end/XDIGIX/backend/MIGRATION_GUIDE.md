# XDIGIX Migration Guide: digix-admin Control Center

## Architecture

**digix-admin** is the central control hub for:
- Dashboard (SaaS tenant system)
- Financial dashboard
- Fulfillment system (you, staff, shipping company)
- Shipping system (coming)

**Access flow:**
- digix-admin: Only you and your staff (super admins: `role=admin`, `clientId=null`)
- Dashboard/Finance/Fulfillment: Users created and linked via digix-admin (`clientId` set)

No one can access dashboard/fulfillment without being created and linked in digix-admin.

## Recommended Migration Flow

### 1. Create Clients (Businesses) in digix-admin
1. Go to **Clients** in digix-admin
2. Click **Add Client**
3. Enter client name, owner email, password
4. Set system access: Dashboard, Finance, Fulfillment, Shipping (coming)
5. Repeat for each business (Addict, AirPremium, Madas, undo, etc.)

### 2. Create Users & Link to Businesses
1. Go to **Client Users** in digix-admin
2. Click **Add User**
3. Enter name, email, password
4. Select business and role (admin/staff/client)
5. Repeat for each user

### 3. Run Setup Scripts
```bash
cd backend
npm run init:db            # Initialize indexes
npm run add:super-admin    # Add super admin
npm run link:users         # Link users by owner email to clients
```

**Note:** Firebase migration scripts have been removed. XDIGIX uses MongoDB only.

## Client Model (MongoDB)

- `brandName`, `owner`, `contact`, `subscriptionPlan`
- `systemAccess`: `{ dashboard, finance, fulfillment, shipping }`
- `features`: `{ fulfillment: true }` for fulfillment enabled
- `suspensionReason`: optional

## User Model

- `role`: `admin` | `staff` | `client`
- `clientId`: MongoDB Client `_id` (null = super admin, digix-admin only)
- Super admins: `role=admin`, `clientId=null`
- Tenant users: `clientId` set

## Coming Updates

- **Fulfillment** and **Shipping** systems will respect `systemAccess` and `features`
- Extensible for new roles (shipping_company, fulfillment_staff, etc.)
