const delay = (ms = 300) => new Promise(r => setTimeout(r, ms))

// ─── Patients ───────────────────────────────────────────────────────────────

export const MOCK_PATIENTS = [
  {
    id: 1,
    name: 'Sarah Johnson',
    age: 34,
    gender: 'female',
    height_cm: 165,
    weight_kg: 62,
    notes: 'Post-operative rehabilitation — rotator cuff repair (left shoulder). 3 months post-op.',
    created_at: '2026-01-15T09:00:00',
  },
  {
    id: 2,
    name: 'Marcus Chen',
    age: 28,
    gender: 'male',
    height_cm: 178,
    weight_kg: 75,
    notes: 'Adolescent scoliosis monitoring — mild lumbar curvature. Monthly assessment program.',
    created_at: '2026-02-01T10:30:00',
  },
  {
    id: 3,
    name: 'Elena Rodriguez',
    age: 45,
    gender: 'female',
    height_cm: 162,
    weight_kg: 68,
    notes: 'Chronic lower back pain — postural correction program. Physiotherapy referral active.',
    created_at: '2026-02-20T14:00:00',
  },
  {
    id: 4,
    name: 'David Park',
    age: 52,
    gender: 'male',
    height_cm: 175,
    weight_kg: 82,
    notes: 'Post hip-replacement recovery — gait and posture restoration protocol.',
    created_at: '2026-03-01T11:00:00',
  },
]

// ─── Sessions ────────────────────────────────────────────────────────────────

export const MOCK_SESSIONS = {
  1: [
    {
      id: 1,
      patient_id: 1,
      measurements: {
        height_cm: 165.0,
        shoulder_width_cm: 36.2,
        arm_length_left_cm: 54.8,
        arm_length_right_cm: 57.3,
        torso_length_cm: 51.2,
        inseam_estimate_cm: 74.5,
        left_shoulder_height_cm: 140.2,
        right_shoulder_height_cm: 136.8,
        posture_angle_deg: -4.7,
        symmetry_score: 95.6,
      },
      posture_alerts: ['Shoulder drop detected: 4.7° tilt'],
      session_date: '2026-01-20T10:15:00',
      notes: 'Initial assessment post-surgery',
    },
    {
      id: 2,
      patient_id: 1,
      measurements: {
        height_cm: 165.0,
        shoulder_width_cm: 36.8,
        arm_length_left_cm: 55.9,
        arm_length_right_cm: 57.6,
        torso_length_cm: 51.7,
        inseam_estimate_cm: 74.8,
        left_shoulder_height_cm: 141.0,
        right_shoulder_height_cm: 137.9,
        posture_angle_deg: -3.1,
        symmetry_score: 97.1,
      },
      posture_alerts: [],
      session_date: '2026-02-15T10:00:00',
      notes: '4-week follow-up — noticeable improvement in shoulder alignment',
    },
    {
      id: 3,
      patient_id: 1,
      measurements: {
        height_cm: 165.0,
        shoulder_width_cm: 37.1,
        arm_length_left_cm: 56.8,
        arm_length_right_cm: 57.9,
        torso_length_cm: 52.0,
        inseam_estimate_cm: 75.1,
        left_shoulder_height_cm: 141.5,
        right_shoulder_height_cm: 138.4,
        posture_angle_deg: -1.8,
        symmetry_score: 98.1,
      },
      posture_alerts: [],
      session_date: '2026-03-10T09:30:00',
      notes: '8-week follow-up — near-complete symmetry restoration',
    },
  ],
  2: [
    {
      id: 4,
      patient_id: 2,
      measurements: {
        height_cm: 178.0,
        shoulder_width_cm: 44.5,
        arm_length_left_cm: 60.2,
        arm_length_right_cm: 60.8,
        torso_length_cm: 55.3,
        inseam_estimate_cm: 82.1,
        left_shoulder_height_cm: 152.3,
        right_shoulder_height_cm: 149.7,
        posture_angle_deg: -6.2,
        symmetry_score: 99.0,
      },
      posture_alerts: ['Shoulder drop detected: 6.2° tilt'],
      session_date: '2026-02-05T14:00:00',
      notes: 'Baseline scoliosis assessment',
    },
    {
      id: 5,
      patient_id: 2,
      measurements: {
        height_cm: 178.0,
        shoulder_width_cm: 44.8,
        arm_length_left_cm: 60.4,
        arm_length_right_cm: 60.6,
        torso_length_cm: 55.5,
        inseam_estimate_cm: 82.3,
        left_shoulder_height_cm: 152.8,
        right_shoulder_height_cm: 150.6,
        posture_angle_deg: -4.5,
        symmetry_score: 99.7,
      },
      posture_alerts: [],
      session_date: '2026-03-05T13:45:00',
      notes: 'Monthly follow-up — measurable posture improvement',
    },
  ],
  3: [
    {
      id: 6,
      patient_id: 3,
      measurements: {
        height_cm: 162.0,
        shoulder_width_cm: 37.8,
        arm_length_left_cm: 55.1,
        arm_length_right_cm: 56.9,
        torso_length_cm: 50.8,
        inseam_estimate_cm: 73.2,
        left_shoulder_height_cm: 137.2,
        right_shoulder_height_cm: 133.1,
        posture_angle_deg: -7.8,
        symmetry_score: 96.8,
      },
      posture_alerts: [
        'Shoulder drop detected: 7.8° tilt',
        'Asymmetry detected: symmetry score 96.8%',
      ],
      session_date: '2026-02-22T11:00:00',
      notes: 'Initial chronic lower back pain assessment',
    },
  ],
  4: [
    {
      id: 7,
      patient_id: 4,
      measurements: {
        height_cm: 175.0,
        shoulder_width_cm: 44.0,
        arm_length_left_cm: 59.8,
        arm_length_right_cm: 60.1,
        torso_length_cm: 54.5,
        inseam_estimate_cm: 80.3,
        left_shoulder_height_cm: 149.5,
        right_shoulder_height_cm: 146.2,
        posture_angle_deg: -3.9,
        symmetry_score: 99.5,
      },
      posture_alerts: [],
      session_date: '2026-03-05T09:00:00',
      notes: '2-week post hip-replacement assessment',
    },
  ],
}

export const MOCK_SESSION_MAP = {}
Object.values(MOCK_SESSIONS).forEach(arr =>
  arr.forEach(s => { MOCK_SESSION_MAP[s.id] = s })
)

// ─── Reports ─────────────────────────────────────────────────────────────────

export const MOCK_REPORTS = {
  1: [
    {
      id: 1,
      session_id: 1,
      report_type: 'assessment',
      content: `CLINICAL BODY ASSESSMENT REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Patient: Sarah Johnson  |  Age: 34  |  Gender: Female
Session Date: January 20, 2026

SUMMARY OF FINDINGS
The patient presents with mild left-shoulder depression following rotator cuff repair surgery. Postural analysis reveals a 4.7° shoulder tilt with the left shoulder positioned approximately 3.4 cm lower than the right. Overall symmetry score of 95.6% indicates clinically acceptable bilateral balance, though monitoring is warranted.

POSTURAL ANALYSIS
• Shoulder alignment: Mild left depression noted (−4.7° tilt angle)
• Arm length discrepancy: 2.5 cm difference (L: 54.8 cm, R: 57.3 cm)
• Torso positioning: Within normal range for stated height (165 cm)
• Lower limb symmetry: Adequate bilateral balance detected

AREAS OF CONCERN
1. Left shoulder depression — likely compensatory posture post-surgical immobilization
2. Arm length asymmetry — indicative of reduced left shoulder elevation capacity
3. Continued monitoring recommended over 8-week recovery trajectory

RECOMMENDATIONS
• Continue prescribed physiotherapy exercises focusing on rotator cuff strengthening
• Patient education on postural correction during daily activities
• Re-assessment in 4 weeks to monitor recovery trajectory
• Consider occupational therapy referral if workplace ergonomics are contributory

---
⚠️ CLINICAL DISCLAIMER: This report is AI-generated for informational purposes only. It does not constitute medical advice, diagnosis, or treatment. Review by a qualified healthcare professional is required before any clinical decisions.`,
      created_at: '2026-01-20T11:00:00',
    },
  ],
  2: [],
  3: [
    {
      id: 2,
      session_id: 3,
      report_type: 'soap',
      content: `SOAP NOTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Patient: Sarah Johnson  |  Date: March 10, 2026  |  Session #3

SUBJECTIVE
Patient reports significant reduction in left shoulder pain (2/10 from 7/10 at baseline). Notes improved range of motion and ability to perform daily tasks without compensatory movement. Sleeping posture improved following physiotherapy guidance. Patient expresses readiness to transition to home exercise program.

OBJECTIVE
• Symmetry Score: 98.1% (baseline: 95.6% — improvement: +2.5%)
• Posture Angle: −1.8° (baseline: −4.7° — improvement: +2.9°)
• Arm Length Discrepancy: 1.1 cm (baseline: 2.5 cm — improvement: −1.4 cm)
• No posture alerts triggered at current session

ASSESSMENT
Excellent rehabilitation progress over 8-week period. Near-complete postural symmetry restoration has been achieved. Left shoulder depression has resolved substantially. Residual arm length discrepancy of 1.1 cm is likely attributable to measurement variability rather than structural difference.

PLAN
• Transition to home exercise program maintenance phase
• Monthly check-in assessments for 3 months
• Discharge from active physiotherapy if next assessment confirms continued improvement
• Counsel patient on long-term postural maintenance and ergonomic strategies

---
⚠️ CLINICAL DISCLAIMER: This SOAP note is AI-generated and for informational purposes only.`,
      created_at: '2026-03-10T10:00:00',
    },
  ],
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const MOCK_CHAT = {
  1: [
    {
      id: 1,
      role: 'user',
      content: "How has Sarah's symmetry score changed across her sessions?",
      created_at: '2026-03-10T12:00:00',
    },
    {
      id: 2,
      role: 'assistant',
      content: `Sarah's symmetry score has shown excellent and consistent improvement across her three sessions:

• Session 1 (Jan 20): 95.6% — post-surgical baseline
• Session 2 (Feb 15): 97.1% — 4-week follow-up (+1.5%)
• Session 3 (Mar 10): 98.1% — 8-week follow-up (+2.5% from baseline)

This represents a strong linear improvement trajectory, which is a positive indicator of successful rotator cuff rehabilitation. The posture angle has correspondingly improved from −4.7° to −1.8°, suggesting near-complete resolution of compensatory shoulder depression.

⚕️ Please confirm these findings with the treating physiotherapist before making clinical decisions.`,
      created_at: '2026-03-10T12:00:08',
    },
    {
      id: 3,
      role: 'user',
      content: 'Is she ready for discharge from active physiotherapy?',
      created_at: '2026-03-10T12:01:00',
    },
    {
      id: 4,
      role: 'assistant',
      content: `Based on the objective measurement data, Sarah's progress indicators are strongly positive:

✅ Symmetry score 98.1% (exceeds the 95% clinical threshold)
✅ Posture angle within 2° of neutral (−1.8°)
✅ No active posture alerts in most recent session
✅ Arm length discrepancy reduced from 2.5 cm to 1.1 cm
✅ Consistent improvement across all three sessions

From a body measurement perspective, the data supports consideration of transitioning to a home maintenance program. However, discharge decisions must integrate:
• Patient-reported outcome measures (pain, function, satisfaction)
• Manual clinical examination findings
• Functional movement assessment
• Treating clinician's overall judgement

⚕️ This AI assessment is informational only — discharge decisions must be made by the qualified treating clinician.`,
      created_at: '2026-03-10T12:01:12',
    },
  ],
  2: [],
  3: [],
  4: [],
}

// ─── Mock API ─────────────────────────────────────────────────────────────────

export const mockApi = {
  getPatients: () => delay().then(() => [...MOCK_PATIENTS]),

  getPatient: (id) => delay(200).then(() => {
    const p = MOCK_PATIENTS.find(p => p.id === Number(id))
    if (!p) throw new Error('Patient not found')
    return { ...p }
  }),

  createPatient: (data) => delay(450).then(() => ({
    ...data,
    id: Date.now(),
    created_at: new Date().toISOString(),
  })),

  updatePatient: (id, data) => delay(400).then(() => {
    const p = MOCK_PATIENTS.find(p => p.id === Number(id))
    if (!p) throw new Error('Patient not found')
    return { ...p, ...data }
  }),

  deletePatient: () => delay(300).then(() => ({ success: true })),

  getPatientSessions: (id) => delay(300).then(() => [
    ...(MOCK_SESSIONS[Number(id)] || []),
  ]),

  createSession: (data) => delay(500).then(() => ({
    ...data,
    id: Date.now(),
    session_date: new Date().toISOString(),
  })),

  getSession: (id) => delay(200).then(() => {
    const s = MOCK_SESSION_MAP[Number(id)]
    return s ? { ...s } : {
      id: Number(id),
      patient_id: 1,
      measurements: MOCK_SESSIONS[1][2].measurements,
      posture_alerts: [],
      session_date: new Date().toISOString(),
      notes: 'Demo session',
    }
  }),

  getSessionReports: (sessionId) => delay(300).then(() => [
    ...(MOCK_REPORTS[Number(sessionId)] || []),
  ]),

  createAssessmentReport: (sessionId) => delay(1600).then(() => ({
    id: Date.now(),
    session_id: Number(sessionId),
    report_type: 'assessment',
    content: MOCK_REPORTS[1][0].content,
    created_at: new Date().toISOString(),
  })),

  createProgressReport: (sessionId, prevId) => delay(1600).then(() => ({
    id: Date.now(),
    session_id: Number(sessionId),
    report_type: 'progress',
    content: `PROGRESS REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comparing Session #${prevId} → Session #${sessionId}

MEASUREMENT CHANGES
• Symmetry Score: 97.1% → 98.1% (+1.0%)
• Posture Angle: −3.1° → −1.8° (improved by 1.3°)
• Arm Length Discrepancy: 1.7 cm → 1.1 cm (reduced by 0.6 cm)
• Shoulder Width: 36.8 cm → 37.1 cm (+0.3 cm)

CLINICAL INTERPRETATION
Patient demonstrates consistent positive trajectory across all key body symmetry metrics. The reduction in posture angle and improvement in symmetry score indicate effective rehabilitation progress between sessions.

RECOMMENDATIONS
Continue current rehabilitation protocol. Patient is on track for projected recovery timeline.

---
⚠️ CLINICAL DISCLAIMER: AI-generated — for informational purposes only.`,
    created_at: new Date().toISOString(),
  })),

  createSoapReport: (sessionId) => delay(1600).then(() => ({
    id: Date.now(),
    session_id: Number(sessionId),
    report_type: 'soap',
    content: MOCK_REPORTS[3]?.[0]?.content || `SOAP NOTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUBJECTIVE
Patient reports improvement in pain levels and functional capacity since last assessment. Compliance with prescribed home exercise program confirmed.

OBJECTIVE
• Symmetry Score: 97.1% — within acceptable clinical range
• Posture Angle: −3.1° — mild tilt, improved from baseline
• No active posture alerts triggered

ASSESSMENT
Positive clinical trajectory observed across body measurement parameters. Patient responding well to current rehabilitation protocol.

PLAN
Continue current physiotherapy program. Re-assess in 4 weeks. Progress images to be reviewed by supervising clinician.

---
⚠️ CLINICAL DISCLAIMER: AI-generated — for informational purposes only.`,
    created_at: new Date().toISOString(),
  })),

  getChatHistory: (patientId) => delay(300).then(() => [
    ...(MOCK_CHAT[Number(patientId)] || []),
  ]),

  sendMessage: (patientId, content) => delay(1300).then(() => ({
    id: Date.now(),
    role: 'assistant',
    content: `Thank you for your question about this patient.

Based on the available measurement data and session history, the patient's body symmetry and postural metrics are within clinically monitored ranges. Key indicators such as the symmetry score and posture angle trend are being tracked across sessions to evaluate rehabilitation progress.

For specific clinical interpretation or treatment decisions, please review the detailed session reports and consult with the treating clinical team.

⚕️ This response is AI-generated and should not substitute clinical judgement or direct patient examination.`,
    created_at: new Date().toISOString(),
  })),
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

export function getMockStats() {
  const allSessions = Object.values(MOCK_SESSIONS).flat()
  const scores = allSessions
    .map(s => s.measurements?.symmetry_score)
    .filter(Boolean)
  const avgSymmetry = scores.length
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : 'N/A'
  const thisMonth = allSessions.filter(s =>
    new Date(s.session_date).getMonth() === 2 // March
  ).length
  return {
    totalPatients: MOCK_PATIENTS.length,
    totalSessions: allSessions.length,
    avgSymmetry: `${avgSymmetry}%`,
    thisMonth,
  }
}
