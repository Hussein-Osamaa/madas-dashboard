import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
  authDomain: "madas-store.firebaseapp.com",
  projectId: "madas-store",
  storageBucket: "madas-store.firebasestorage.app",
  messagingSenderId: "527071300010",
  appId: "1:527071300010:web:7470e2204065b4590583d3"
};

let app;
try {
  app = getApp();
} catch (error) {
  app = initializeApp(firebaseConfig);
}

const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  workspaceId: null,
  orgId: "default",
  token: null,
  accounts: []
};

let listenersRegistered = false;

const elements = {
  tableBody: document.getElementById("accountsTableBody"),
  typeFilter: document.getElementById("accountTypeFilter"),
  statusFilter: document.getElementById("accountStatusFilter"),
  refreshBtn: document.getElementById("refreshAccountsBtn"),
  openDrawerBtn: document.getElementById("openCreateDrawerBtn"),
  form: document.getElementById("accountForm"),
  title: document.getElementById("formTitle"),
  resetBtn: document.getElementById("resetFormBtn"),
  deactivateSection: document.getElementById("deactivateSection"),
  deactivateBtn: document.getElementById("deactivateAccountBtn"),
  toastContainer: document.getElementById("toastContainer"),
  parentSelect: document.getElementById("parentAccountId")
};

const formFields = {
  accountId: document.getElementById("accountId"),
  code: document.getElementById("accountCode"),
  name: document.getElementById("accountName"),
  type: document.getElementById("accountType"),
  subtype: document.getElementById("accountSubtype"),
  parent: document.getElementById("parentAccountId"),
  currency: document.getElementById("accountCurrency"),
  notes: document.getElementById("accountNotes")
};

function showToast(message, variant = "success") {
  if (!elements.toastContainer) {
    return;
  }

  const toast = document.createElement("div");
  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm ${
    variant === "success"
      ? "bg-white border-emerald-100 text-emerald-700"
      : "bg-white border-rose-100 text-rose-600"
  }`;

  toast.innerHTML = `
    <span class="material-icons text-base ${
      variant === "success" ? "text-emerald-500" : "text-rose-500"
    }">${variant === "success" ? "check_circle" : "error_outline"}</span>
    <span>${message}</span>
  `;

  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}

async function resolveWorkspaceContext(user) {
  // Try owner lookup first
  const ownerQuery = query(
    collection(db, "businesses"),
    where("owner.userId", "==", user.uid)
  );
  const ownerSnapshot = await getDocs(ownerQuery);

  if (!ownerSnapshot.empty) {
    const docSnapshot = ownerSnapshot.docs[0];
    return docSnapshot.id;
  }

  // Iterate businesses to find staff membership
  const businessesSnapshot = await getDocs(collection(db, "businesses"));

  for (const businessDoc of businessesSnapshot.docs) {
    const staffRef = doc(db, "businesses", businessDoc.id, "staff", user.uid);
    const staffDoc = await getDoc(staffRef);
    if (staffDoc.exists()) {
      return businessDoc.id;
    }
  }

  return null;
}

function renderAccounts() {
  if (!elements.tableBody) return;

  if (!state.accounts.length) {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-6 text-center text-slate-400">
          No accounts found. Create one to get started.
        </td>
      </tr>
    `;
    return;
  }

  elements.tableBody.innerHTML = state.accounts
    .map((account) => {
      const badgeClass =
        account.accountType === "asset"
          ? "bg-emerald-50 text-emerald-700"
          : account.accountType === "liability"
          ? "bg-red-50 text-red-700"
          : account.accountType === "equity"
          ? "bg-purple-50 text-purple-700"
          : account.accountType === "revenue"
          ? "bg-indigo-50 text-indigo-700"
          : "bg-amber-50 text-amber-700";

      const statusBadge = account.isActive !== false
        ? '<span class="badge bg-emerald-50 text-emerald-600">Active</span>'
        : '<span class="badge bg-slate-100 text-slate-500">Inactive</span>';

      return `
        <tr class="hover:bg-slate-50 transition">
          <td class="px-4 py-3 font-mono text-slate-500">${account.accountCode}</td>
          <td class="px-4 py-3">
            <div class="flex flex-col">
              <span class="font-medium text-slate-900">${account.accountName}</span>
              ${
                account.accountSubtype
                  ? `<span class="text-xs text-slate-400">${account.accountSubtype}</span>`
                  : ""
              }
            </div>
          </td>
          <td class="px-4 py-3">
            <span class="badge ${badgeClass}">${account.accountType}</span>
          </td>
          <td class="px-4 py-3 text-slate-700 font-medium">
            ${account.currency || "USD"} ${Number(account.balance || 0).toLocaleString()}
          </td>
          <td class="px-4 py-3">${statusBadge}</td>
          <td class="px-4 py-3 text-right">
            <button data-account="${account.id}" class="editAccountBtn inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition">
              <span class="material-icons text-base">edit</span> Edit
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll(".editAccountBtn").forEach((button) => {
    button.addEventListener("click", (event) => {
      const accountId = event.currentTarget.getAttribute("data-account");
      const account = state.accounts.find((item) => item.id === accountId);
      if (account) {
        populateForm(account);
      }
    });
  });
}

function populateParentOptions() {
  if (!elements.parentSelect) return;

  elements.parentSelect.innerHTML = '<option value="">No parent</option>';
  state.accounts
    .filter((account) => account.isActive !== false)
    .forEach((account) => {
      const option = document.createElement("option");
      option.value = account.id;
      option.textContent = `${account.accountCode} • ${account.accountName}`;
      elements.parentSelect.appendChild(option);
    });
}

function populateForm(account) {
  formFields.accountId.value = account.id;
  formFields.code.value = account.accountCode || "";
  formFields.name.value = account.accountName || "";
  formFields.type.value = account.accountType || "";
  formFields.subtype.value = account.accountSubtype || "";
  formFields.parent.value = account.parentAccountId || "";
  formFields.currency.value = account.currency || "USD";
  formFields.notes.value = account.metadata?.notes || "";

  elements.title.textContent = "Update Account";
  elements.deactivateSection.classList.remove("hidden");
}

function resetForm() {
  elements.form.reset();
  formFields.accountId.value = "";
  formFields.currency.value = "USD";
  elements.title.textContent = "Create Account";
  elements.deactivateSection.classList.add("hidden");
}

async function fetchAccounts() {
  if (!state.workspaceId || !state.token) return;

  try {
    const typeFilter = elements.typeFilter.value || "";
    const statusValue = elements.statusFilter.value;
    const statusFilter = statusValue === "all" ? "" : statusValue;

    const params = new URLSearchParams();
    if (typeFilter) params.append("type", typeFilter);
    if (statusFilter) params.append("status", statusFilter);

    const response = await fetch(
      `/api/${state.workspaceId}/${state.orgId}/finance/accounts?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${state.token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to load accounts");
    }

    const data = await response.json();
    state.accounts = data.accounts || [];
    populateParentOptions();
    renderAccounts();
  } catch (error) {
    console.error("fetchAccounts error:", error);
    showToast(error.message || "Failed to load accounts", "error");
  }
}

async function upsertAccount(event) {
  event.preventDefault();
  if (!state.workspaceId || !state.token) return;

  const accountId = formFields.accountId.value;
  const payload = {
    accountCode: formFields.code.value.trim(),
    accountName: formFields.name.value.trim(),
    accountType: formFields.type.value,
    accountSubtype: formFields.subtype.value.trim() || null,
    parentAccountId: formFields.parent.value || null,
    currency: formFields.currency.value.trim() || "USD",
    notes: formFields.notes.value.trim()
  };

  const endpoint = `/api/${state.workspaceId}/${state.orgId}/finance/accounts${
    accountId ? `/${accountId}` : ""
  }`;

  try {
    const response = await fetch(endpoint, {
      method: accountId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Unable to save account");
    }

    await fetchAccounts();
    showToast(accountId ? "Account updated" : "Account created");
    resetForm();
  } catch (error) {
    console.error("upsertAccount error:", error);
    showToast(error.message || "Unable to save account", "error");
  }
}

async function deactivateAccount() {
  const accountId = formFields.accountId.value;
  if (!accountId || !state.workspaceId || !state.token) return;

  if (!confirm("Deactivate this account? Transactions will remain intact.")) {
    return;
  }

  try {
    const response = await fetch(
      `/api/${state.workspaceId}/${state.orgId}/finance/accounts/${accountId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${state.token}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Unable to deactivate account");
    }

    await fetchAccounts();
    showToast("Account deactivated");
    resetForm();
  } catch (error) {
    console.error("deactivateAccount error:", error);
    showToast(error.message || "Unable to deactivate account", "error");
  }
}

function registerEventListeners() {
  if (listenersRegistered) {
    return;
  }

  if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener("click", fetchAccounts);
  }

  if (elements.openDrawerBtn) {
    elements.openDrawerBtn.addEventListener("click", () => {
      resetForm();
      formFields.code.focus();
    });
  }

  if (elements.form) {
    elements.form.addEventListener("submit", upsertAccount);
  }

  if (elements.resetBtn) {
    elements.resetBtn.addEventListener("click", (event) => {
      event.preventDefault();
      resetForm();
    });
  }

  if (elements.deactivateBtn) {
    elements.deactivateBtn.addEventListener("click", deactivateAccount);
  }

  if (elements.typeFilter) {
    elements.typeFilter.addEventListener("change", fetchAccounts);
  }

  if (elements.statusFilter) {
    elements.statusFilter.addEventListener("change", fetchAccounts);
  }

  listenersRegistered = true;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showToast("Authentication required. Redirecting...", "error");
    setTimeout(() => {
      window.location.href = "/login";
    }, 1200);
    return;
  }

  try {
    state.token = await user.getIdToken();
    const workspaceId = await resolveWorkspaceContext(user);

    if (!workspaceId) {
      showToast("No workspace found for this account.", "error");
      return;
    }

    state.workspaceId = workspaceId;
    registerEventListeners();
    await fetchAccounts();
  } catch (error) {
    console.error("Initialization error:", error);
    showToast(error.message || "Failed to initialize finance module", "error");
  }
});


