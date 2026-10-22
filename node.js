// Ví dụ API Endpoint: /api/medical-records (Node.js / Express)
const express = require('express');
const router = express.Router();

// Mock database lưu trạng thái consent của bệnh nhân
let patientConsentDB = {
    "PAT-8821": {
        "doctor:dr_tran_minh": true // Bác sĩ Trần Minh đang được cấp quyền
    }
};

// Middleware kiểm tra JWT & Role từ TideCloak
function verifyTideCloakToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Missing or invalid TideCloak JWT token" });
    }
    
    // Trong thực tế, bạn dùng thư viện `jsonwebtoken` để verify với Public Key của TideCloak
    // req.user = decodedToken;
    next();
}

// 1. API Lấy danh sách bệnh án (Có kiểm tra chính sách TideCloak)
router.get('/records/:patientId', verifyTideCloakToken, (req, res) => {
    const { patientId } = req.params;
    const userRole = req.headers['x-user-role']; // 'patient', 'doctor', hoặc 'auditor'
    const doctorId = req.headers['x-doctor-id'];

    // Kiểm tra chính sách bảo mật (Policy Enforcement Point)
    if (userRole === 'doctor') {
        const hasConsent = patientConsentDB[patientId]?.[doctorId];
        if (!hasConsent) {
            return res.status(403).json({
                error: "Access Denied by TideCloak Policy",
                message: "Patient has revoked decryption keys for this doctor."
            });
        }
    }

    if (userRole === 'auditor') {
        // Auditor chỉ được xem log, không được đọc plaintext bệnh án
        return res.status(403).json({
            error: "Zero-Knowledge Policy Enforced",
            message: "Auditors cannot inspect medical plaintext. Use /api/audit-logs instead."
        });
    }

    // Trả về dữ liệu (Nếu là Patient hoặc Doctor có quyền)
    res.json({
        success: true,
        data: [
            {
                id: "REC-001",
                diagnosis: "Mild Hypertension (Stage 1)",
                prescription: "Amlodipine 5mg once daily",
                encryptedHash: "0x9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a"
            }
        ]
    });
});

// 2. API Cấp / Thu hồi quyền (Patient gọi để đổi consent)
router.post('/consent/toggle', verifyTideCloakToken, (req, res) => {
    const { patientId, doctorId, grant } = req.body; // grant: true/false
    
    if (!patientConsentDB[patientId]) {
        patientConsentDB[patientId] = {};
    }
    
    patientConsentDB[patientId][doctorId] = grant;

    res.json({
        success: true,
        message: `Successfully updated TideCloak decryption consent to: ${grant}`
    });
});

module.exports = router;