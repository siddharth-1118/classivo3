// @ts-nocheck
import * as cheerio from "cheerio";
import type { ProfileData } from "../../../../src/lib/types/portal";
import { ProfileDataSchema } from "../../../../src/lib/schemas/portal-schemas";
import {
  normalizeWs,
  parseNum,
  parseDateDMYorMDY,
  buildKvMapFromTables,
  lookupKv,
  saveDebugSnapshot,
  selectText,
} from "./parser-utils";

export const PROFILE_SELECTORS = {
  studentName: ["student name", "name", "full name", "candidate name", "name of student"],
  registerNo: ["register no", "registration no", "reg no", "registration number", "roll no", "registration"],
  studentId: ["student id", "id", "enrollment no", "enrollment number", "student id no"],
  emailId: ["email", "email id", "e-mail", "mail id"],
  alternateEmail: ["alternate email", "secondary email", "email 2", "parent email"],
  mobile: ["mobile", "mobile no", "phone", "mobile number", "contact no", "cell"],
  alternateMobile: ["alternate mobile", "secondary mobile", "mobile 2", "parent mobile", "phone 2"],
  institution: ["institution", "college", "university", "school", "institute name"],
  program: ["program", "course", "degree", "programme", "course name"],
  semester: ["semester", "sem", "current semester"],
  batch: ["batch", "batch year", "admission batch"],
  section: ["section", "class section"],
  roomNo: ["room no", "room number", "hostel room"],
  enrollmentDate: ["date of joining", "admission date", "enrollment date", "joining date"],
  currentSemCourseEnrollmentDate: [
    "course enrollment date",
    "semester enrollment date",
    "current sem enrollment date",
    "registered on",
  ],
  facultyAdvisor: ["faculty advisor", "class advisor", "mentor", "class tutor"],
  academicAdvisor: ["academic advisor", "program advisor", "hod", "head of department"],
  currentStatus: ["status", "current status", "student status"],
  dateOfBirth: ["dob", "date of birth", "birth date"],
  gender: ["gender", "sex"],
  bloodGroup: ["blood group", "bg", "blood"],
  nationality: ["nationality", "country of origin"],
  specialization: ["specialization", "spec"],
  department: ["department", "dept"],
  academicYear: ["academic year", "year"],
  rollNumber: ["roll number", "roll no"],
  scheme: ["scheme", "regulation", "scheme/regulation"],
  admissionMode: ["admission mode", "mode of admission", "entry mode"],
  admissionDate: ["admission date", "date of admission"],
  fatherName: ["father name", "father's name", "father"],
  motherName: ["mother name", "mother's name", "mother"],
  guardianName: ["guardian name", "guardian's name", "guardian"],
  fatherContact: ["father contact", "father phone", "father mobile"],
  motherContact: ["mother contact", "mother phone", "mother mobile"],
  guardianContact: ["guardian contact", "guardian phone", "guardian mobile"],
  addressLine1: ["address", "address line 1", "door no", "street", "line 1"],
  addressLine2: ["address line 2", "line 2", "locality"],
  city: ["city", "town"],
  state: ["state", "province"],
  pincode: ["pincode", "pin code", "zip", "zip code", "postal code"],
  country: ["country"],
} as const;

export function parseProfile(html: string): ProfileData {
  const $ = cheerio.load(html);
  const now = new Date().toISOString();

  saveDebugSnapshot(html, "profile").catch(() => {});

  const kv = buildKvMapFromTables($);

  const lookup = (candidates: string[]): string => lookupKv(kv, candidates);

  const studentName = lookup(PROFILE_SELECTORS.studentName);
  const registerNo = lookup(PROFILE_SELECTORS.registerNo);
  const studentId = lookup(PROFILE_SELECTORS.studentId) || registerNo;
  const emailId = lookup(PROFILE_SELECTORS.emailId);
  const institution = lookup(PROFILE_SELECTORS.institution);
  const program = lookup(PROFILE_SELECTORS.program);
  const semesterRaw = lookup(PROFILE_SELECTORS.semester);
  const semester = Math.max(1, parseNum(semesterRaw, 1) | 0);
  const batch = lookup(PROFILE_SELECTORS.batch);
  const section = lookup(PROFILE_SELECTORS.section);
  const roomNoVal = lookup(PROFILE_SELECTORS.roomNo) || undefined;
  const enrollmentDateRaw = lookup(PROFILE_SELECTORS.enrollmentDate);
  const enrollmentDate = enrollmentDateRaw ? parseDateDMYorMDY(enrollmentDateRaw) || undefined : undefined;
  const currentSemCourseEnrollmentDateRaw = lookup(PROFILE_SELECTORS.currentSemCourseEnrollmentDate);
  const currentSemCourseEnrollmentDate = currentSemCourseEnrollmentDateRaw
    ? parseDateDMYorMDY(currentSemCourseEnrollmentDateRaw) || undefined
    : undefined;
  const facultyAdvisor = lookup(PROFILE_SELECTORS.facultyAdvisor) || undefined;
  const academicAdvisor = lookup(PROFILE_SELECTORS.academicAdvisor) || undefined;
  const currentStatus = lookup(PROFILE_SELECTORS.currentStatus) || "Active";
  const dateOfBirthRaw = lookup(PROFILE_SELECTORS.dateOfBirth);
  const dateOfBirth = dateOfBirthRaw ? parseDateDMYorMDY(dateOfBirthRaw) || undefined : undefined;
  const gender = lookup(PROFILE_SELECTORS.gender) || undefined;
  const bloodGroup = lookup(PROFILE_SELECTORS.bloodGroup) || undefined;
  const nationality = lookup(PROFILE_SELECTORS.nationality) || undefined;

  const mobile = lookup(PROFILE_SELECTORS.mobile) || undefined;
  const alternateEmail = lookup(PROFILE_SELECTORS.alternateEmail) || undefined;
  const alternateMobile = lookup(PROFILE_SELECTORS.alternateMobile) || undefined;

  const addrLine1 = lookup(PROFILE_SELECTORS.addressLine1);
  const addrLine2 = lookup(PROFILE_SELECTORS.addressLine2);
  const city = lookup(PROFILE_SELECTORS.city);
  const state = lookup(PROFILE_SELECTORS.state);
  const pincode = lookup(PROFILE_SELECTORS.pincode);
  const country = lookup(PROFILE_SELECTORS.country);

  const hasAddress = addrLine1 || city || state || pincode;
  const address = hasAddress
    ? {
        line1: addrLine1 || undefined,
        line2: addrLine2 || undefined,
        city: city || undefined,
        state: state || undefined,
        pincode: pincode || undefined,
        country: country || undefined,
      }
    : undefined;

  const fatherName = lookup(PROFILE_SELECTORS.fatherName);
  const motherName = lookup(PROFILE_SELECTORS.motherName);
  const guardianName = lookup(PROFILE_SELECTORS.guardianName);
  const fatherContact = lookup(PROFILE_SELECTORS.fatherContact);
  const motherContact = lookup(PROFILE_SELECTORS.motherContact);
  const guardianContact = lookup(PROFILE_SELECTORS.guardianContact);

  const hasParent = fatherName || motherName || guardianName;
  const parentDetails = hasParent
    ? {
        fatherName: fatherName || undefined,
        motherName: motherName || undefined,
        guardianName: guardianName || undefined,
        fatherContact: fatherContact || undefined,
        motherContact: motherContact || undefined,
        guardianContact: guardianContact || undefined,
      }
    : undefined;

  const specialization = lookup(PROFILE_SELECTORS.specialization);
  const department = lookup(PROFILE_SELECTORS.department);
  const academicYear = lookup(PROFILE_SELECTORS.academicYear);
  const rollNumber = lookup(PROFILE_SELECTORS.rollNumber);
  const scheme = lookup(PROFILE_SELECTORS.scheme);
  const admissionMode = lookup(PROFILE_SELECTORS.admissionMode);
  const admissionDateRaw = lookup(PROFILE_SELECTORS.admissionDate);
  const admissionDate = admissionDateRaw ? parseDateDMYorMDY(admissionDateRaw) || undefined : undefined;

  const hasAcademic = specialization || department || academicYear || rollNumber || scheme || admissionMode || admissionDate;
  const academicInfo = hasAcademic
    ? {
        specialization: specialization || undefined,
        department: department || undefined,
        academicYear: academicYear || undefined,
        rollNumber: rollNumber || undefined,
        scheme: scheme || undefined,
        admissionMode: admissionMode || undefined,
        admissionDate: admissionDate || undefined,
      }
    : undefined;

  let photoUrl: string | undefined;
  $("img").each((_, imgEl) => {
    if (photoUrl) return;
    const $img = $(imgEl);
    const src = $img.attr("src") || "";
    const id = ($img.attr("id") || "").toLowerCase();
    const cls = ($img.attr("class") || "").toLowerCase();
    const alt = ($img.attr("alt") || "").toLowerCase();
    if (
      src.toLowerCase().includes("photo") ||
      src.toLowerCase().includes("student") ||
      id.includes("photo") ||
      cls.includes("photo") ||
      alt.includes("photo") ||
      alt.includes("student")
    ) {
      photoUrl = src;
    }
  });

  const result: ProfileData = {
    sourceTimestamp: now,
    studentName,
    studentId: studentId || registerNo,
    registerNo,
    emailId,
    alternateEmail,
    mobile,
    alternateMobile,
    institution,
    program,
    semester,
    batch,
    section,
    roomNo: roomNoVal,
    enrollmentDate,
    currentSemCourseEnrollmentDate,
    facultyAdvisor,
    academicAdvisor,
    currentStatus,
    dateOfBirth,
    gender,
    bloodGroup,
    nationality,
    photoUrl,
    address,
    parentDetails,
    academicInfo,
  };

  const parsed = ProfileDataSchema.safeParse(result);
  if (parsed.success) {
    return parsed.data;
  }

  const relaxed: ProfileData = {
    sourceTimestamp: result.sourceTimestamp,
    studentName: result.studentName || "",
    studentId: result.studentId || "",
    registerNo: result.registerNo || "",
    emailId: result.emailId || "",
    alternateEmail: result.alternateEmail,
    mobile: result.mobile,
    alternateMobile: result.alternateMobile,
    institution: result.institution || "",
    program: result.program || "",
    semester: result.semester || 1,
    batch: result.batch || "",
    section: result.section || "",
    roomNo: result.roomNo,
    enrollmentDate: result.enrollmentDate,
    currentSemCourseEnrollmentDate: result.currentSemCourseEnrollmentDate,
    facultyAdvisor: result.facultyAdvisor,
    academicAdvisor: result.academicAdvisor,
    currentStatus: result.currentStatus || "",
    dateOfBirth: result.dateOfBirth,
    gender: result.gender,
    bloodGroup: result.bloodGroup,
    nationality: result.nationality,
    photoUrl: result.photoUrl,
    address: result.address,
    parentDetails: result.parentDetails,
    academicInfo: result.academicInfo,
  };
  return relaxed;
}
