"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalAuthenticatedSessionSchema = exports.CachedDataSchema = exports.PortalLoginSessionSchema = exports.ProfileDataSchema = exports.AcademicInfoSchema = exports.ParentDetailsSchema = exports.AddressSchema = exports.DashboardDataSchema = exports.DashboardNoticeSchema = exports.HostelRoomDetailsSchema = exports.UpcomingExamSchema = exports.ExamTimetableDataSchema = exports.ExamEntrySchema = exports.HostelDataSchema = exports.HostelBookingSchema = exports.HostelPaymentSchema = exports.HostelAllotmentSchema = exports.HostelInfoSchema = exports.GradesDataSchema = exports.SemesterEntrySchema = exports.GradesSummarySchema = exports.GradeRowSchema = void 0;
exports.safeParseGradeRow = safeParseGradeRow;
exports.safeParseGradesData = safeParseGradesData;
exports.safeParseHostelInfo = safeParseHostelInfo;
exports.safeParseHostelAllotment = safeParseHostelAllotment;
exports.safeParseHostelPayment = safeParseHostelPayment;
exports.safeParseHostelBooking = safeParseHostelBooking;
exports.safeParseHostelData = safeParseHostelData;
exports.safeParseExamEntry = safeParseExamEntry;
exports.safeParseExamTimetableData = safeParseExamTimetableData;
exports.safeParseDashboardData = safeParseDashboardData;
exports.safeParseProfileData = safeParseProfileData;
exports.safeParsePortalLoginSession = safeParsePortalLoginSession;
exports.safeParsePortalAuthenticatedSession = safeParsePortalAuthenticatedSession;
const zod_1 = require("zod");
exports.GradeRowSchema = zod_1.z.object({
    semester: zod_1.z.number().int().min(1).max(12),
    examMonthYear: zod_1.z.string(),
    code: zod_1.z.string(),
    title: zod_1.z.string(),
    credit: zod_1.z.number().min(0),
    grade: zod_1.z.string(),
});
exports.GradesSummarySchema = zod_1.z.object({
    cgpa: zod_1.z.number().min(0).max(10),
    creditsRegistered: zod_1.z.number().min(0),
    creditsEarned: zod_1.z.number().min(0),
    creditsRequired: zod_1.z.number().min(0),
});
exports.SemesterEntrySchema = zod_1.z.object({
    semester: zod_1.z.number().int().min(1).max(12),
    sgpa: zod_1.z.number().min(0).max(10),
    academicYear: zod_1.z.string(),
    totalCredits: zod_1.z.number().min(0),
    earnedCredits: zod_1.z.number().min(0),
});
exports.GradesDataSchema = zod_1.z.object({
    sourceTimestamp: zod_1.z.string().datetime(),
    grades: zod_1.z.array(exports.GradeRowSchema),
    summary: exports.GradesSummarySchema,
    semesters: zod_1.z.array(exports.SemesterEntrySchema),
});
exports.HostelInfoSchema = zod_1.z.object({
    academicYear: zod_1.z.string(),
    hostelName: zod_1.z.string(),
    roomNo: zod_1.z.string(),
    allotmentDate: zod_1.z.string(),
    feeAmount: zod_1.z.number().min(0),
    payMode: zod_1.z.string(),
    admitCardAvailable: zod_1.z.boolean(),
    declarationFormAvailable: zod_1.z.boolean(),
});
exports.HostelAllotmentSchema = zod_1.z.object({
    academicYear: zod_1.z.string(),
    hostelName: zod_1.z.string(),
    roomNo: zod_1.z.string(),
    block: zod_1.z.string().optional(),
    floor: zod_1.z.string().optional(),
    bedNo: zod_1.z.string().optional(),
    allotmentDate: zod_1.z.string(),
    roomType: zod_1.z.string().optional(),
    messPreference: zod_1.z.string().optional(),
    status: zod_1.z.string(),
    bookingStage: zod_1.z.string().optional(),
});
exports.HostelPaymentSchema = zod_1.z.object({
    academicYear: zod_1.z.string(),
    feeAmount: zod_1.z.number().min(0),
    feeDescription: zod_1.z.string(),
    payMode: zod_1.z.string(),
    transactionId: zod_1.z.string().optional(),
    paymentDate: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().optional(),
    status: zod_1.z.enum(["Paid", "Unpaid", "Partial"]),
    receiptNumber: zod_1.z.string().optional(),
});
exports.HostelBookingSchema = zod_1.z.object({
    academicYear: zod_1.z.string(),
    applicationDate: zod_1.z.string().optional(),
    preferredHostel: zod_1.z.string().optional(),
    preferredRoomType: zod_1.z.string().optional(),
    status: zod_1.z.string(),
    bookingStage: zod_1.z.string().optional(),
    allotment: exports.HostelAllotmentSchema.optional(),
});
exports.HostelDataSchema = zod_1.z.object({
    sourceTimestamp: zod_1.z.string().datetime(),
    hostel: exports.HostelInfoSchema,
    booking: exports.HostelBookingSchema.optional(),
    payments: zod_1.z.array(exports.HostelPaymentSchema),
    allotments: zod_1.z.array(exports.HostelAllotmentSchema),
    admitCardAvailable: zod_1.z.boolean(),
    declarationFormAvailable: zod_1.z.boolean(),
});
exports.ExamEntrySchema = zod_1.z.object({
    examTitle: zod_1.z.string().optional(),
    program: zod_1.z.string().optional(),
    semester: zod_1.z.number().int().min(1).max(12),
    courseCode: zod_1.z.string(),
    courseName: zod_1.z.string(),
    examDate: zod_1.z.string(),
    session: zod_1.z.string(),
    venue: zod_1.z.string(),
    seatNumber: zod_1.z.string().optional(),
    time: zod_1.z.string().optional(),
    remarks: zod_1.z.string().optional(),
    examType: zod_1.z.string().optional(),
});
exports.ExamTimetableDataSchema = zod_1.z.object({
    sourceTimestamp: zod_1.z.string().datetime(),
    lastUpdated: zod_1.z.string(),
    academicYear: zod_1.z.string(),
    semester: zod_1.z.number().int().min(1).max(12),
    examinationName: zod_1.z.string(),
    program: zod_1.z.string().optional(),
    timetable: zod_1.z.array(exports.ExamEntrySchema),
    instructions: zod_1.z.array(zod_1.z.string()),
});
exports.UpcomingExamSchema = exports.ExamEntrySchema.extend({
    daysUntil: zod_1.z.number().int().min(0),
});
exports.HostelRoomDetailsSchema = zod_1.z.object({
    hostelName: zod_1.z.string().optional(),
    roomNo: zod_1.z.string().optional(),
    block: zod_1.z.string().optional(),
    floor: zod_1.z.string().optional(),
    bedNo: zod_1.z.string().optional(),
});
exports.DashboardNoticeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    date: zod_1.z.string(),
    category: zod_1.z.string().optional(),
    content: zod_1.z.string().optional(),
});
exports.DashboardDataSchema = zod_1.z.object({
    sourceTimestamp: zod_1.z.string().datetime(),
    lastSynced: zod_1.z.string(),
    studentName: zod_1.z.string(),
    studentId: zod_1.z.string(),
    registerNumber: zod_1.z.string(),
    email: zod_1.z.string().email(),
    institution: zod_1.z.string(),
    program: zod_1.z.string(),
    semester: zod_1.z.number().int().min(1).max(12),
    batch: zod_1.z.string(),
    section: zod_1.z.string(),
    roomNo: zod_1.z.string().optional(),
    facultyAdvisor: zod_1.z.string().optional(),
    academicAdvisor: zod_1.z.string().optional(),
    currentStatus: zod_1.z.string(),
    cgpa: zod_1.z.number().min(0).max(10),
    latestSgpa: zod_1.z.number().min(0).max(10).optional(),
    creditsEarned: zod_1.z.number().min(0),
    creditsRegistered: zod_1.z.number().min(0),
    hostelStatus: zod_1.z.string().optional(),
    hostelRoomDetails: exports.HostelRoomDetailsSchema.optional(),
    upcomingExams: zod_1.z.array(exports.UpcomingExamSchema),
    notices: zod_1.z.array(exports.DashboardNoticeSchema),
});
exports.AddressSchema = zod_1.z.object({
    line1: zod_1.z.string().optional(),
    line2: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    pincode: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
});
exports.ParentDetailsSchema = zod_1.z.object({
    fatherName: zod_1.z.string().optional(),
    motherName: zod_1.z.string().optional(),
    guardianName: zod_1.z.string().optional(),
    fatherContact: zod_1.z.string().optional(),
    motherContact: zod_1.z.string().optional(),
    guardianContact: zod_1.z.string().optional(),
});
exports.AcademicInfoSchema = zod_1.z.object({
    specialization: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    academicYear: zod_1.z.string().optional(),
    rollNumber: zod_1.z.string().optional(),
    scheme: zod_1.z.string().optional(),
    admissionMode: zod_1.z.string().optional(),
    admissionDate: zod_1.z.string().optional(),
});
exports.ProfileDataSchema = zod_1.z.object({
    sourceTimestamp: zod_1.z.string().datetime(),
    studentName: zod_1.z.string(),
    studentId: zod_1.z.string(),
    registerNo: zod_1.z.string(),
    emailId: zod_1.z.string().email(),
    alternateEmail: zod_1.z.string().email().optional(),
    mobile: zod_1.z.string().optional(),
    alternateMobile: zod_1.z.string().optional(),
    institution: zod_1.z.string(),
    program: zod_1.z.string(),
    semester: zod_1.z.number().int().min(1).max(12),
    batch: zod_1.z.string(),
    section: zod_1.z.string(),
    roomNo: zod_1.z.string().optional(),
    enrollmentDate: zod_1.z.string().optional(),
    currentSemCourseEnrollmentDate: zod_1.z.string().optional(),
    facultyAdvisor: zod_1.z.string().optional(),
    academicAdvisor: zod_1.z.string().optional(),
    currentStatus: zod_1.z.string(),
    dateOfBirth: zod_1.z.string().optional(),
    gender: zod_1.z.string().optional(),
    bloodGroup: zod_1.z.string().optional(),
    nationality: zod_1.z.string().optional(),
    photoUrl: zod_1.z.string().optional(),
    address: exports.AddressSchema.optional(),
    parentDetails: exports.ParentDetailsSchema.optional(),
    academicInfo: exports.AcademicInfoSchema.optional(),
});
exports.PortalLoginSessionSchema = zod_1.z.object({
    sessionToken: zod_1.z.string(),
    cookies: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    createdAt: zod_1.z.number().int().min(0),
    hiddenFields: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    captchaAnswer: zod_1.z.string().optional(),
    _cookieJarSer: zod_1.z.unknown().optional(),
    netId: zod_1.z.string().optional(),
    domainFieldName: zod_1.z.string().optional(),
    captchaFieldName: zod_1.z.string().optional(),
    randomDelimiter: zod_1.z.string().optional(),
});
exports.CachedDataSchema = zod_1.z.object({
    dashboard: exports.DashboardDataSchema.optional(),
    profile: exports.ProfileDataSchema.optional(),
    grades: exports.GradesDataSchema.optional(),
    hostel: exports.HostelDataSchema.optional(),
    exams: exports.ExamTimetableDataSchema.optional(),
    cachedAt: zod_1.z.number().int().min(0).optional(),
});
exports.PortalAuthenticatedSessionSchema = zod_1.z.object({
    loginSession: exports.PortalLoginSessionSchema,
    netId: zod_1.z.string(),
    name: zod_1.z.string(),
    regNo: zod_1.z.string(),
    authenticatedAt: zod_1.z.number().int().min(0),
    expiresAt: zod_1.z.number().int().min(0),
    consentGrantedAt: zod_1.z.number().int().min(0).optional(),
    cachedData: exports.CachedDataSchema.optional(),
});
function safeParseGradeRow(data) {
    const result = exports.GradeRowSchema.safeParse(data);
    if (result.success)
        return result.data;
    return {
        semester: 1,
        examMonthYear: "",
        code: "",
        title: "",
        credit: 0,
        grade: "",
    };
}
function safeParseGradesData(data) {
    const result = exports.GradesDataSchema.safeParse(data);
    if (result.success)
        return result.data;
    const now = new Date().toISOString();
    return {
        sourceTimestamp: now,
        grades: [],
        summary: {
            cgpa: 0,
            creditsRegistered: 0,
            creditsEarned: 0,
            creditsRequired: 0,
        },
        semesters: [],
    };
}
function safeParseHostelInfo(data) {
    const result = exports.HostelInfoSchema.safeParse(data);
    if (result.success)
        return result.data;
    return {
        academicYear: "",
        hostelName: "",
        roomNo: "",
        allotmentDate: "",
        feeAmount: 0,
        payMode: "",
        admitCardAvailable: false,
        declarationFormAvailable: false,
    };
}
function safeParseHostelAllotment(data) {
    const result = exports.HostelAllotmentSchema.safeParse(data);
    if (result.success)
        return result.data;
    return {
        academicYear: "",
        hostelName: "",
        roomNo: "",
        allotmentDate: "",
        status: "",
    };
}
function safeParseHostelPayment(data) {
    const result = exports.HostelPaymentSchema.safeParse(data);
    if (result.success)
        return result.data;
    return {
        academicYear: "",
        feeAmount: 0,
        feeDescription: "",
        payMode: "",
        status: "Unpaid",
    };
}
function safeParseHostelBooking(data) {
    const result = exports.HostelBookingSchema.safeParse(data);
    if (result.success)
        return result.data;
    return undefined;
}
function safeParseHostelData(data) {
    const result = exports.HostelDataSchema.safeParse(data);
    if (result.success)
        return result.data;
    const now = new Date().toISOString();
    return {
        sourceTimestamp: now,
        hostel: safeParseHostelInfo({}),
        payments: [],
        allotments: [],
        admitCardAvailable: false,
        declarationFormAvailable: false,
    };
}
function safeParseExamEntry(data) {
    const result = exports.ExamEntrySchema.safeParse(data);
    if (result.success)
        return result.data;
    return {
        semester: 1,
        courseCode: "",
        courseName: "",
        examDate: "",
        session: "",
        venue: "",
    };
}
function safeParseExamTimetableData(data) {
    const result = exports.ExamTimetableDataSchema.safeParse(data);
    if (result.success)
        return result.data;
    const now = new Date().toISOString();
    return {
        sourceTimestamp: now,
        lastUpdated: now,
        academicYear: "",
        semester: 1,
        examinationName: "",
        timetable: [],
        instructions: [],
    };
}
function safeParseDashboardData(data) {
    const result = exports.DashboardDataSchema.safeParse(data);
    if (result.success)
        return result.data;
    const now = new Date().toISOString();
    return {
        sourceTimestamp: now,
        lastSynced: now,
        studentName: "",
        studentId: "",
        registerNumber: "",
        email: "",
        institution: "",
        program: "",
        semester: 1,
        batch: "",
        section: "",
        currentStatus: "",
        cgpa: 0,
        creditsEarned: 0,
        creditsRegistered: 0,
        upcomingExams: [],
        notices: [],
    };
}
function safeParseProfileData(data) {
    const result = exports.ProfileDataSchema.safeParse(data);
    if (result.success)
        return result.data;
    const now = new Date().toISOString();
    return {
        sourceTimestamp: now,
        studentName: "",
        studentId: "",
        registerNo: "",
        emailId: "",
        institution: "",
        program: "",
        semester: 1,
        batch: "",
        section: "",
        currentStatus: "",
    };
}
function safeParsePortalLoginSession(data) {
    const result = exports.PortalLoginSessionSchema.safeParse(data);
    if (result.success)
        return result.data;
    return {
        sessionToken: "",
        cookies: {},
        createdAt: Date.now(),
    };
}
function safeParsePortalAuthenticatedSession(data) {
    const result = exports.PortalAuthenticatedSessionSchema.safeParse(data);
    if (result.success)
        return result.data;
    return null;
}
