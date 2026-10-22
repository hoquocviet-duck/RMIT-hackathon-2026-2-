// script.js - MedTide Vault Application Logic

// Dữ liệu mẫu ban đầu
let state = {
    isLoggedIn: false,
    activeRole: "patient", // patient, doctor, auditor
    doctorAccessGranted: true,
    records: [
        {
            id: "REC-001",
            patientName: "Nguyen Van A",
            patientId: "PAT-8821",
            doctorName: "Dr. Tran Minh (Cardiology)",
            date: "2026-10-20",
            diagnosis: "Mild Hypertension (Stage 1) - Blood pressure 138/88 mmHg",
            prescription: "Amlodipine 5mg once daily, low-sodium diet",
            encryptedHash: "0x9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a"
        },
        {
            id: "REC-002",
            patientName: "Nguyen Van A",
            patientId: "PAT-8821",
            doctorName: "Dr. Sarah Jenkins (General)",
            date: "2026-10-12",
            diagnosis: "Seasonal Allergic Rhinitis",
            prescription: "Cetirizine 10mg as needed",
            encryptedHash: "0x4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c"
        }
    ],
    auditLogs: [
        {
            id: "LOG-101",
            timestamp: "2026-10-22 09:45:12",
            actor: "patient:nguyen_van_a",
            action: "Authenticated via TideCloak Decentralized IAM",
            status: "AUTHORIZED"
        },
        {
            id: "LOG-102",
            timestamp: "2026-10-22 09:46:05",
            actor: "doctor:dr_tran_minh",
            action: "Requested decryption key for Patient PAT-8821",
            status: "AUTHORIZED"
        }
    ]
};

// Khởi tạo các sự kiện khi DOM load xong
document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    renderApp();
});

function setupEventListeners() {
    // Đăng nhập
    document.getElementById("login-btn").addEventListener("click", () => {
        state.isLoggedIn = true;
        addLog("user:session", "SSO Login verified by TideCloak Realm [" + document.getElementById("realm-name").value + "]", "AUTHORIZED");
        renderApp();
    });

    // Đăng xuất
    document.getElementById("logout-btn").addEventListener("click", () => {
        state.isLoggedIn = false;
        renderApp();
    });

    // Chuyển đổi Role
    document.querySelectorAll(".role-switch-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const role = e.target.getAttribute("data-role");
            state.activeRole = role;
            addLog("role:" + role, "Switched active TideCloak token view to [" + role.toUpperCase() + "]", "AUTHORIZED");
            
            // Cập nhật giao diện nút active
            document.querySelectorAll(".role-switch-btn").forEach(b => {
                b.className = "role-switch-btn px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition text-slate-400 hover:text-white";
            });
            e.target.className = "role-switch-btn px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition bg-teal-500 text-slate-950";
            
            renderApp();
        });
    });

    // Cấp / Thu hồi quyền Bác sĩ
    document.getElementById("toggle-consent-btn").addEventListener("click", () => {
        state.doctorAccessGranted = !state.doctorAccessGranted;
        addLog(
            "patient:nguyen_van_a",
            state.doctorAccessGranted 
                ? "Granted TideCloak Decryption Role to [doctor:dr_tran_minh]" 
                : "Revoked TideCloak Decryption Role from [doctor:dr_tran_minh]",
            "AUTHORIZED"
        );
        renderApp();
    });

    // Thêm bệnh án mới (Bác sĩ)
    document.getElementById("medical-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const diagnosis = document.getElementById("input-diagnosis").value;
        const prescription = document.getElementById("input-prescription").value;

        if (!diagnosis || !prescription) return;

        const newRec = {
            id: "REC-00" + (state.records.length + 1),
            patientName: "Nguyen Van A",
            patientId: "PAT-8821",
            doctorName: "Dr. Tran Minh (Cardiology)",
            date: new Date().toISOString().split("T")[0],
            diagnosis: diagnosis,
            prescription: prescription,
            encryptedHash: "0x" + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join("")
        };

        state.records.unshift(newRec);
        document.getElementById("input-diagnosis").value = "";
        document.getElementById("input-prescription").value = "";

        addLog("doctor:dr_tran_minh", "Signed & Encrypted new record " + newRec.id + " via TideCloak", "AUTHORIZED");
        renderApp();
    });

    // Modal JWT Token
    document.getElementById("inspect-jwt-btn").addEventListener("click", () => {
        const mockJWT = {
            iss: document.getElementById("server-url").value + "/realms/" + document.getElementById("realm-name").value,
            sub: "tide-uid-9982-uuid",
            resource_access: {
                "medtide-client": {
                    roles: [state.activeRole, "tidecloak_verified"]
                }
            },
            tide_encryption_key_id: "key-secp256k1-0xf89a",
            patient_consent_active: state.doctorAccessGranted,
            exp: Math.floor(Date.now() / 1000) + 3600
        };
        document.getElementById("jwt-content").textContent = JSON.stringify(mockJWT, null, 2);
        document.getElementById("jwt-modal").classList.remove("hidden");
    });

    document.getElementById("close-jwt-modal").addEventListener("click", () => {
        document.getElementById("jwt-modal").classList.add("hidden");
    });
}

function addLog(actor, action, status) {
    const newLog = {
        id: "LOG-" + Math.floor(100 + Math.random() * 900),
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
        actor: actor,
        action: action,
        status: status
    };
    state.auditLogs.unshift(newLog);
}

function renderApp() {
    const loginScreen = document.getElementById("login-screen");
    const dashboardScreen = document.getElementById("dashboard-screen");

    if (!state.isLoggedIn) {
        loginScreen.classList.remove("hidden");
        dashboardScreen.classList.add("hidden");
        return;
    }

    loginScreen.classList.add("hidden");
    dashboardScreen.classList.remove("hidden");

    // Cập nhật thông tin Realm badge
    document.getElementById("realm-badge").textContent = "TideCloak Realm: " + document.getElementById("realm-name").value;
    document.getElementById("jwt-role-text").textContent = state.activeRole;

    // Consent status text & button
    const consentText = document.getElementById("consent-status-text");
    const toggleConsentBtn = document.getElementById("toggle-consent-btn");
    const patientConsentContainer = document.getElementById("patient-consent-container");

    if (state.doctorAccessGranted) {
        consentText.textContent = "GRANTED";
        consentText.className = "text-emerald-400 font-semibold";
        toggleConsentBtn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i> Revoke Doctor Access';
        toggleConsentBtn.className = "px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer";
    } else {
        consentText.textContent = "REVOKED";
        consentText.className = "text-rose-400 font-semibold";
        toggleConsentBtn.innerHTML = '<i data-lucide="user-check" class="w-4 h-4"></i> Grant Doctor Access';
        toggleConsentBtn.className = "px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer";
    }

    // Hiển thị/ẩn các thành phần theo Role
    const doctorFormContainer = document.getElementById("doctor-form-container");
    const doctorLockedMsg = document.getElementById("doctor-locked-msg");

    if (state.activeRole === "doctor") {
        doctorFormContainer.classList.remove("hidden");
        patientConsentContainer.classList.add("hidden");
        if (!state.doctorAccessGranted) {
            doctorLockedMsg.classList.remove("hidden");
        } else {
            doctorLockedMsg.classList.add("hidden");
        }
    } else if (state.activeRole === "patient") {
        doctorFormContainer.classList.add("hidden");
        patientConsentContainer.classList.remove("hidden");
    } else {
        // Auditor view
        doctorFormContainer.classList.add("hidden");
        patientConsentContainer.classList.add("hidden");
    }

    // Render danh sách bệnh án
    const recordsListEl = document.getElementById("records-list");
    recordsListEl.innerHTML = "";

    state.records.forEach(rec => {
        const canDecrypt = state.activeRole === "patient" || (state.activeRole === "doctor" && state.doctorAccessGranted);

        const card = document.createElement("div");
        card.className = "bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3";
        
        let contentHtml = "";
        if (canDecrypt) {
            contentHtml = `
                <div class="space-y-2 text-sm">
                    <p><span class="text-slate-400">Diagnosis: </span><span class="font-medium text-white">${rec.diagnosis}</span></p>
                    <p><span class="text-slate-400">Prescription: </span><span class="text-teal-300">${rec.prescription}</span></p>
                </div>
            `;
        } else {
            contentHtml = `
                <div class="bg-slate-950 border border-slate-800/80 rounded-xl p-3 font-mono text-xs text-slate-500 space-y-1">
                    <p class="text-rose-400 font-sans font-medium">
                        [ACCESS DENIED BY TIDECLOAK POLICY] — Missing Decryption Key for Role: ${state.activeRole.toUpperCase()}
                    </p>
                    <p class="text-slate-500">Ciphertext: ${rec.encryptedHash}</p>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                    <span class="text-xs font-mono text-teal-400">${rec.id}</span>
                    <h3 class="font-bold text-sm text-white">${rec.doctorName}</h3>
                </div>
                <div class="text-right">
                    <span class="text-xs text-slate-400 block">${rec.date}</span>
                    <span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${canDecrypt ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
                        <i data-lucide="${canDecrypt ? 'unlock' : 'lock'}" class="w-3 h-3"></i>
                        ${canDecrypt ? 'Decrypted by TideCloak' : 'Ciphertext Locked'}
                    </span>
                </div>
            </div>
            ${contentHtml}
        `;
        recordsListEl.appendChild(card);
    });

    // Render Audit Logs
    const auditContainer = document.getElementById("audit-logs-container");
    auditContainer.innerHTML = "";

    state.auditLogs.forEach(log => {
        const logItem = document.createElement("div");
        logItem.className = "bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1";
        logItem.innerHTML = `
            <div class="flex items-center justify-between text-slate-400">
                <span class="font-mono text-[10px]">${log.timestamp}</span>
                <span class="text-emerald-400 font-semibold flex items-center gap-1 text-[10px]">
                    <i data-lucide="check-circle-2" class="w-3 h-3"></i> ${log.status}
                </span>
            </div>
            <p class="font-mono text-teal-400 text-[11px]">${log.actor}</p>
            <p class="text-slate-300">${log.action}</p>
        `;
        auditContainer.appendChild(logItem);
    });

    // Render lại icon cho các phần tử mới được sinh ra bằng JS
    lucide.createIcons();
}