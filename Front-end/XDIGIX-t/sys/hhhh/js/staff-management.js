// Staff Management Module
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, query, where, Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC-ls1TrvSkrw71KqmB_kHYgPoj0H550a8",
    authDomain: "madas-store.firebaseapp.com",
    projectId: "madas-store",
    storageBucket: "madas-store.firebasestorage.app",
    messagingSenderId: "527071300010",
    appId: "1:527071300010:web:7470e2204065b4590583d3",
    measurementId: "G-NQVR1F4N3Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables
let currentUser = null;
let currentBusinessId = null;
let currentBusinessData = null;
let currentUserRole = null;
let staffMembers = [];

// Initialize
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/login";
        return;
    }

    currentUser = user;
    
    try {
        console.log('🔐 User authenticated:', user.email);

        // TENANT ISOLATION: Detect Business Context
        const businessesQuery = query(collection(db, "businesses"), where("owner.userId", "==", user.uid));
        const businessSnapshot = await getDocs(businessesQuery);

        if (!businessSnapshot.empty) {
            const businessDoc = businessSnapshot.docs[0];
            currentBusinessId = businessDoc.id;
            currentBusinessData = businessDoc.data();
            currentUserRole = 'owner';
            
            console.log('✅ Business Owner:', currentBusinessData.businessName);
        } else {
            // Check if user is staff
            const allBusinesses = await getDocs(collection(db, "businesses"));
            let foundBusiness = false;
            
            for (const businessDoc of allBusinesses.docs) {
                const businessId = businessDoc.id;
                const staffRef = doc(db, 'businesses', businessId, 'staff', user.uid);
                const staffDoc = await getDoc(staffRef);
                
                if (staffDoc.exists()) {
                    const staffData = staffDoc.data();
                    currentBusinessId = businessId;
                    currentBusinessData = businessDoc.data();
                    currentUserRole = staffData.role;
                    
                    // Check if user has staff management permission
                    if (!staffData.permissions?.staff && staffData.role !== 'admin') {
                        alert('You do not have permission to access staff management');
                        window.location.href = "/dashboard";
                        return;
                    }
                    
                    foundBusiness = true;
                    break;
                }
            }
            
            if (!foundBusiness) {
                console.warn("❌ User not associated with any business");
                window.location.href = "/dashboard/no-access.html";
                return;
            }
        }

        // Update UI
        updateHeader();
        await loadStaff();

    } catch (error) {
        console.error("Auth initialization failed:", error);
        window.location.href = "/login";
    }
});

// Update header with user and business info
function updateHeader() {
    const businessName = currentBusinessData?.businessName || "MADAS";
    document.getElementById('business-subtitle').textContent = `Manage ${businessName} team members`;
    
    document.getElementById('user-name').textContent = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    document.getElementById('user-email').textContent = currentUser.email || '';
    document.getElementById('user-initial').textContent = (currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase();
    
    // Update role badge
    const roleBadge = document.getElementById('role-badge');
    roleBadge.textContent = currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1);
    
    if (currentUserRole === 'owner') {
        roleBadge.className = 'px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium';
    } else if (currentUserRole === 'admin') {
        roleBadge.className = 'px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium';
    } else {
        roleBadge.className = 'px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium';
    }
}

// Load staff members
async function loadStaff() {
    try {
        staffMembers = [];
        
        // Add owner to the list
        if (currentBusinessData?.owner) {
            staffMembers.push({
                id: currentBusinessData.owner.userId,
                email: currentBusinessData.owner.email,
                name: currentBusinessData.owner.name || 'Business Owner',
                role: 'owner',
                status: 'active',
                permissions: { all: true },
                joinedAt: currentBusinessData.createdAt,
                isOwner: true
            });
        }
        
        // Load staff from subcollection
        const staffRef = collection(db, 'businesses', currentBusinessId, 'staff');
        const staffSnapshot = await getDocs(staffRef);
        
        staffSnapshot.forEach((doc) => {
            staffMembers.push({
                id: doc.id,
                ...doc.data(),
                isOwner: false
            });
        });
        
        console.log(`✅ Loaded ${staffMembers.length} staff members`);
        
        updateStats();
        renderStaff();
        
    } catch (error) {
        console.error('Error loading staff:', error);
        alert('Failed to load staff members');
    }
}

// Update stats
function updateStats() {
    const total = staffMembers.length;
    const active = staffMembers.filter(s => s.status === 'active').length;
    const pending = staffMembers.filter(s => s.status === 'pending').length;
    const admins = staffMembers.filter(s => s.role === 'owner' || s.role === 'admin').length;
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-admins').textContent = admins;
}

// Render staff table
function renderStaff() {
    const tbody = document.getElementById('staff-tbody');
    const searchTerm = document.getElementById('search-staff')?.value.toLowerCase() || '';
    const filterRole = document.getElementById('filter-role')?.value || '';
    const filterStatus = document.getElementById('filter-status')?.value || '';
    
    let filtered = staffMembers;
    
    // Apply filters
    if (searchTerm) {
        filtered = filtered.filter(s => 
            s.name?.toLowerCase().includes(searchTerm) ||
            s.email?.toLowerCase().includes(searchTerm)
        );
    }
    if (filterRole) {
        filtered = filtered.filter(s => s.role === filterRole);
    }
    if (filterStatus) {
        filtered = filtered.filter(s => s.status === filterStatus);
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <div class="flex flex-col items-center">
                        <span class="material-icons text-6xl text-gray-300 mb-4">people</span>
                        <p class="text-lg">No staff members found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.map(staff => {
        const date = staff.joinedAt?.toDate?.() || new Date();
        const dateStr = date.toLocaleDateString();
        
        const permissionCount = staff.permissions ? Object.keys(staff.permissions).filter(k => staff.permissions[k]).length : 0;
        
        const statusClass = staff.status === 'active' ? 'status-active' : 
                          staff.status === 'pending' ? 'status-trial' : 'status-suspended';
        
        const roleClass = staff.role === 'owner' ? 'plan-enterprise' :
                         staff.role === 'admin' ? 'plan-professional' : 'plan-basic';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                ${(staff.name || staff.email || 'U').charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${staff.name || 'Unnamed'}</div>
                            <div class="text-sm text-gray-500">${staff.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="plan-badge ${roleClass}">
                        ${staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${staff.permissions?.all ? 'All Access' : `${permissionCount} permissions`}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="status-badge ${statusClass}">
                        ${staff.status.charAt(0).toUpperCase() + staff.status.slice(1)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${dateStr}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    ${staff.isOwner ? 
                        '<span class="text-gray-400 text-xs">Owner</span>' :
                        `
                        <button class="action-btn text-blue-600 hover:bg-blue-50" onclick="editStaff('${staff.id}')" title="Edit">
                            <span class="material-icons text-sm">edit</span>
                        </button>
                        <button class="action-btn text-orange-600 hover:bg-orange-50" onclick="suspendStaff('${staff.id}')" title="Suspend">
                            <span class="material-icons text-sm">pause_circle</span>
                        </button>
                        <button class="action-btn text-red-600 hover:bg-red-50" onclick="deleteStaff('${staff.id}')" title="Delete">
                            <span class="material-icons text-sm">delete</span>
                        </button>
                        `
                    }
                </td>
            </tr>
        `;
    }).join('');
}

// Modal functions
window.openModal = (modalId) => {
    document.getElementById(modalId).classList.add('active');
};

window.closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('active');
    document.getElementById('staff-form').reset();
    document.getElementById('staff-id').value = '';
};

// Add Staff button
document.getElementById('add-staff-btn')?.addEventListener('click', () => {
    document.getElementById('staff-form').reset();
    document.getElementById('staff-id').value = '';
    document.getElementById('staff-modal-title').textContent = 'Add Staff Member';
    document.getElementById('submit-btn-text').textContent = 'Send Invitation';
    openModal('staff-modal');
});

// Staff form submission
document.getElementById('staff-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const staffId = document.getElementById('staff-id').value;
    const email = document.getElementById('staff-email').value;
    const name = document.getElementById('staff-name').value;
    const role = document.getElementById('staff-role').value;
    
    // Get selected permissions
    const permissions = {};
    document.querySelectorAll('input[name="permission"]:checked').forEach(checkbox => {
        permissions[checkbox.value] = true;
    });
    
    const staffData = {
        email: email,
        name: name,
        role: role,
        status: 'pending',
        permissions: permissions,
        joinedAt: Timestamp.now(),
        invitedBy: currentUser.uid
    };
    
    try {
        if (staffId) {
            // Update existing staff
            const staffRef = doc(db, 'businesses', currentBusinessId, 'staff', staffId);
            await updateDoc(staffRef, {
                name: name,
                role: role,
                permissions: permissions,
                updatedAt: Timestamp.now()
            });
            alert('✅ Staff member updated successfully!');
        } else {
            // Add new staff
            // Use email as document ID for easy lookup
            const staffRef = doc(db, 'businesses', currentBusinessId, 'staff', email.replace(/[@.]/g, '_'));
            await setDoc(staffRef, staffData);
            
            // Send invitation email
            try {
                const invitationResponse = await fetch('/api/send-invitation', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        toEmail: email,
                        staffName: name,
                        businessName: currentBusinessData?.businessName || 'Your Business',
                        role: role,
                        inviterName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Your Team',
                        businessId: currentBusinessId
                    })
                });
                
                const emailResult = await invitationResponse.json();
                
                if (emailResult.success) {
                    alert(`✅ Staff member added and invitation email sent to ${email}!`);
                } else {
                    alert(`✅ Staff member added, but email failed to send: ${emailResult.message}\n\nPlease share the login link manually.`);
                }
            } catch (emailError) {
                console.error('Email sending error:', emailError);
                alert(`✅ Staff member added, but email failed to send.\n\nPlease share the login link manually: ${window.location.origin}/login`);
            }
        }
        
        closeModal('staff-modal');
        await loadStaff();
        
    } catch (error) {
        console.error('Error saving staff:', error);
        alert('❌ Failed to save staff member. Please try again.');
    }
});

// Edit staff
window.editStaff = (staffId) => {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff || staff.isOwner) return;
    
    document.getElementById('staff-id').value = staffId;
    document.getElementById('staff-email').value = staff.email;
    document.getElementById('staff-email').disabled = true; // Can't change email
    document.getElementById('staff-name').value = staff.name || '';
    document.getElementById('staff-role').value = staff.role;
    
    // Set permissions
    document.querySelectorAll('input[name="permission"]').forEach(checkbox => {
        checkbox.checked = staff.permissions?.[checkbox.value] || false;
    });
    
    document.getElementById('staff-modal-title').textContent = 'Edit Staff Member';
    document.getElementById('submit-btn-text').textContent = 'Update Staff';
    openModal('staff-modal');
};

// Suspend staff
window.suspendStaff = async (staffId) => {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff || staff.isOwner) return;
    
    const action = staff.status === 'suspended' ? 'activate' : 'suspend';
    
    if (!confirm(`Are you sure you want to ${action} this staff member?`)) return;
    
    try {
        const staffRef = doc(db, 'businesses', currentBusinessId, 'staff', staffId);
        await updateDoc(staffRef, {
            status: staff.status === 'suspended' ? 'active' : 'suspended',
            updatedAt: Timestamp.now()
        });
        
        alert(`✅ Staff member ${action}d successfully!`);
        await loadStaff();
        
    } catch (error) {
        console.error('Error suspending staff:', error);
        alert('❌ Failed to update staff status');
    }
};

// Delete staff
window.deleteStaff = async (staffId) => {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff || staff.isOwner) return;
    
    if (!confirm(`Are you sure you want to delete ${staff.name || staff.email}? This action cannot be undone.`)) return;
    
    try {
        const staffRef = doc(db, 'businesses', currentBusinessId, 'staff', staffId);
        await deleteDoc(staffRef);
        
        alert('✅ Staff member deleted successfully!');
        await loadStaff();
        
    } catch (error) {
        console.error('Error deleting staff:', error);
        alert('❌ Failed to delete staff member');
    }
};

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = "/login";
});

// Search and filter handlers
document.getElementById('search-staff')?.addEventListener('input', renderStaff);
document.getElementById('filter-role')?.addEventListener('change', renderStaff);
document.getElementById('filter-status')?.addEventListener('change', renderStaff);

console.log('✅ Staff Management Module Loaded');
