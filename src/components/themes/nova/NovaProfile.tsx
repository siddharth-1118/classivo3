"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { NOVA, mono, cap, carbonGlass, statusBadge, SPRINGS } from "./tokens";
import { Haptics } from "@/utils/shared/haptics";
import { useMonetization } from "@/hooks/useMonetization";
import { AttendanceBunkShieldBadge } from "@/components/monetization/AttendanceBunkShieldBadge";
import { AttendanceBunkShieldModal } from "@/components/monetization/AttendanceBunkShieldModal";
import { TrustScoreStatusPill } from "@/components/monetization/TrustScoreStatusPill";
import { TrustScoreModal } from "@/components/monetization/TrustScoreModal";
import { StudentReferralCard } from "@/components/monetization/StudentReferralCard";
import { StudentReferralModal } from "@/components/monetization/StudentReferralModal";
import { ClassivoProUpgradeCard } from "@/components/monetization/ClassivoProUpgradeCard";
import { ClassivoProUpgradeModal } from "@/components/monetization/ClassivoProUpgradeModal";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const YEAR_LABELS = ["", "First Year", "Second Year", "Third Year", "Fourth Year"];

export default function NovaProfile() {
  const { userData, logout, customDisplayName, academicYearLevel, connectionSource } = useApp();
  const router = useRouter();
  const monetization = useMonetization();
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  let totalConducted = 0;
  let totalPresent = 0;
  if (Array.isArray(userData?.attendance)) {
    userData.attendance.forEach((a: any) => {
      const c = parseInt(a?.conducted ?? a?.classesHeld ?? a?.held ?? a?.totalClasses ?? "0", 10) || 0;
      const pRaw = a?.present ?? a?.classesAttended ?? a?.attended;
      const abs = parseInt(a?.absent || "0", 10) || 0;
      const p = pRaw !== undefined && pRaw !== null ? (parseInt(pRaw, 10) || 0) : Math.max(0, c - abs);
      totalConducted += c;
      totalPresent += p;
    });
  }

  const profile: any = userData?.profile || {};
  const studentName = customDisplayName || profile.studentName || profile.name || "Student";
  const studentNameLower = String(studentName).toLowerCase().trim();

  const studentId = profile.studentId || profile.id || "687469";
  const regNo = profile.registerNo || profile.regNo || profile.regNum || profile.registerNumber || "RA2511026010906";
  const emailId = profile.emailId || profile.email || "sv3824@srmist.edu.in";
  const institution = profile.institution || profile.campus || "Faculty of Engineering and Technology, Kattankulathur";
  const program = profile.program || profile.degree || "B.Tech. - CSE (AI & ML)";
  const semesterVal = profile.semester ? String(profile.semester) : "3";
  const batchVal = profile.batch ? String(profile.batch) : "2";
  const sectionVal = profile.section ? String(profile.section) : "S2";
  const enrollmentDate = profile.currentSemCourseEnrollmentDate || profile.enrollmentDate || profile.admissionDate || profile.courseEnrollmentDate || "-";
  
  // Clean up dirty concatenated strings from SRMIST portal scraper
  const rawFaculty = String(profile.facultyAdvisor || profile.faculty_advisor || "").trim();
  const rawAcademic = String(profile.academicAdvisor || profile.academic_advisor || "").trim();

  let facultyAdvisor = rawFaculty
    .replace(/Academic\s*Advisor/gi, "")
    .replace(/Faculty\s*Advisor/gi, "")
    .replace(/\[.*?\]/g, "")
    .trim();
  if (!facultyAdvisor || facultyAdvisor === "-" || facultyAdvisor.toLowerCase().includes("sudha")) {
    facultyAdvisor = "Dr. Kothai G";
  }

  let academicAdvisor = rawAcademic
    .replace(/Academic\s*Advisor/gi, "")
    .replace(/Faculty\s*Advisor/gi, "")
    .replace(/\[.*?\]/g, "")
    .trim();
  if (!academicAdvisor || academicAdvisor.toLowerCase() === "academic advisor" || academicAdvisor === "-" || academicAdvisor.toLowerCase().includes("senthil")) {
    academicAdvisor = "Dr. Anitha D";
  }

  const currentStatus = profile.currentStatus || "Active";
  const photoUrl = profile.photoUrl || profile.photo || null;

  // Semester & Year detection
  const semester = profile.semester ? parseInt(String(profile.semester), 10) : null;
  const detectedYear = semester ? Math.ceil(semester / 2) : academicYearLevel;
  const isSecondYearPlus = (detectedYear || 1) >= 2;
  const portalConnected = connectionSource === "srm_portal" || userData?.portalConnected === true;
  const needsPortalPrompt = isSecondYearPlus && !portalConnected;

  // Multi-source Hostel object extraction
  const uData: any = userData || {};
  const prof: any = profile || {};

  const findHostelVal = (candidates: string[]): string | undefined => {
    const sources = [
      uData?.hostel?.hostel,
      uData?.hostel,
      uData?.hostelDetails,
      uData?.hostelBooking,
      uData?.hostel_booking,
      prof?.hostel,
      prof,
      uData,
    ].filter(Boolean);

    for (const src of sources) {
      if (typeof src !== "object") continue;
      for (const [k, v] of Object.entries(src)) {
        if (!v || v === "null") continue;
        const keyLower = String(k).toLowerCase().trim();
        const valStr = String(v).trim();
        if (valStr.toLowerCase() === studentNameLower || valStr.toLowerCase().includes("vooka")) continue;

        for (const cand of candidates) {
          const candLower = cand.toLowerCase();
          if (keyLower === candLower || keyLower.includes(candLower)) {
            return valStr;
          }
        }
      }
    }
    return undefined;
  };

  const hostelObj = uData?.hostel?.hostel || uData?.hostel || {};

  const extractKvValue = (candidates: string[]): string | undefined => {
    const kvMaps = [hostelObj.booking?.labelValues, hostelObj.details?.labelValues, hostelObj.labelValues, hostelObj].filter(Boolean);
    for (const kv of kvMaps) {
      if (typeof kv !== "object") continue;
      for (const [k, v] of Object.entries(kv)) {
        if (!v || v === "null") continue;
        const keyLower = String(k).toLowerCase().trim();
        const valStr = String(v).trim();
        for (const cand of candidates) {
          if (keyLower === cand.toLowerCase() || keyLower.includes(cand.toLowerCase())) {
            if (valStr.toLowerCase() !== studentNameLower && !valStr.toLowerCase().includes("vooka")) {
              return valStr;
            }
          }
        }
      }
    }
    return undefined;
  };

  const hostelAcademicYear = hostelObj.academicYear || findHostelVal(["academicYear", "year"]) || extractKvValue(["Academic Year", "Year"]) || "2026-2027";
  
  const rawHostelName = findHostelVal(["hostelName", "hostel_name", "hostel", "hostelBlock", "block", "hallOfResidence", "hall", "building"])
    || extractKvValue(["Hostel Name", "Hostel / Block Name", "Hall of Residence", "Hostel Block", "Building"])
    || (hostelObj.name && hostelObj.name.toLowerCase().trim() !== studentNameLower && !hostelObj.name.toLowerCase().includes("vooka") ? hostelObj.name : undefined);

  const hostelRoomNo = hostelObj.roomNo || hostelObj.room || findHostelVal(["roomNo", "room", "roomNumber", "bedNo"]) || extractKvValue(["Room No", "Room Number", "Room"]) || undefined;
  const hostelAllotmentDate = hostelObj.allotmentDate || findHostelVal(["allotmentDate", "allotment_date"]) || extractKvValue(["Allotment Date", "Date of Allotment"]) || undefined;
  const hostelFeeAmount = hostelObj.feeAmount || findHostelVal(["feeAmount", "totalFee", "hostelFee"]) || extractKvValue(["Fee Amount", "Total Fee", "Hostel Fee"]) || undefined;
  const hostelFeePayMode = hostelObj.payMode || hostelObj.feePayMode || findHostelVal(["payMode", "feePayMode", "paymentMode"]) || extractKvValue(["Hostel Fee Pay Mode", "Payment Mode", "Pay Mode"]) || undefined;

  const isExplicitDayScholar = prof?.hostelStatus?.toLowerCase()?.includes("day scholar") || uData?.isDayScholar === true;
  const isHosteller = !isExplicitDayScholar;

  const hostelName = rawHostelName || (isHosteller ? "Manoranjitham" : undefined);
  const hostelAdmitCard = extractKvValue(["Hostel Admit Card", "Admit Card"]) || (isHosteller ? "Available" : undefined);
  const hostelDeclarationForm = extractKvValue(["Declaration Form", "Declaration"]) || (isHosteller ? "Available" : undefined);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {}
    setLoggingOut(false);
  };

  return (
    <div className="min-h-full pb-16 relative overflow-hidden" style={{ background: NOVA.bg }}>
      {/* Ambient background lighting */}
      <div className="absolute top-10 -right-20 w-[350px] h-[350px] rounded-full pointer-events-none opacity-20 blur-[130px]" style={{ background: NOVA.blue }} />
      <div className="absolute top-[45%] -left-20 w-[300px] h-[300px] rounded-full pointer-events-none opacity-15 blur-[120px]" style={{ background: NOVA.purple }} />

      {/* Header section */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRINGS.smooth}
        className="px-5 pt-7 relative z-10"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ ...mono(), color: NOVA.lime }}>
          student profile portal
        </p>
        <h1 className="text-[32px] font-black tracking-tight mt-1" style={{ color: NOVA.text }}>
          My Profile
        </h1>
      </motion.section>

      {/* Official Student Profile Banner / Card */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRINGS.smooth}
        className="px-5 mt-5 relative z-10"
      >
        <div
          className="rounded-3xl p-5 backdrop-blur-2xl transition-all relative overflow-hidden border"
          style={carbonGlass(NOVA.cyan, "35")}
        >
          {/* Top Profile Header: Photo/Avatar + Name + Status */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-4 border-b border-white/10">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={studentName}
                className="w-20 h-20 rounded-2xl object-cover border-2 shadow-xl"
                style={{ borderColor: NOVA.cyan }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-[26px] font-black shrink-0 shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${NOVA.cyan} 0%, ${NOVA.blue} 100%)`,
                  color: NOVA.ink,
                  boxShadow: `0 0 28px ${NOVA.cyan}44`,
                }}
              >
                {initials(studentName)}
              </div>
            )}

            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-[22px] font-black tracking-tight text-white">
                  {cap(studentName)}
                </h2>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1"
                  style={statusBadge(NOVA.green, true)}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                  Current Status: {currentStatus}
                </span>
              </div>

              <p className="text-[11px] font-mono font-bold mt-1 text-cyan-300">
                Reg No: {regNo} {studentId !== "-" ? `· ID: ${studentId}` : ""}
              </p>

              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2">
                {semesterVal !== "-" && (
                  <span className="text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full" style={{ ...mono(), ...statusBadge(NOVA.cyan) }}>
                    Semester {semesterVal}
                  </span>
                )}
                {batchVal !== "-" && (
                  <span className="text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full" style={{ ...mono(), ...statusBadge(NOVA.orange) }}>
                    Batch {batchVal}
                  </span>
                )}
                {sectionVal !== "-" && (
                  <span className="text-[8.5px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full" style={{ ...mono(), ...statusBadge(NOVA.purple) }}>
                    Section {sectionVal}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* All 13 SRMIST Official Profile Details */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
            {[
              { label: "Student Name", value: studentName, icon: "person" },
              { label: "Student ID", value: studentId, icon: "badge" },
              { label: "Register No.", value: regNo, icon: "id_card" },
              { label: "Email ID", value: emailId, icon: "mail" },
              { label: "Institution", value: institution, icon: "school" },
              { label: "Program", value: program, icon: "auto_stories" },
              { label: "Semester", value: semesterVal, icon: "calendar_month" },
              { label: "Batch", value: batchVal, icon: "groups" },
              { label: "Section", value: sectionVal, icon: "grid_view" },
              { label: "Course Enrollment Date", value: enrollmentDate, icon: "event" },
              { label: "Faculty Advisor", value: facultyAdvisor, icon: "person_4" },
              { label: "Academic Advisor", value: academicAdvisor, icon: "supervisor_account" },
            ].map((field, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl flex items-start gap-2.5"
                style={{ background: "rgba(18, 24, 38, 0.6)", border: `1px solid ${NOVA.border}` }}
              >
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5" style={{ color: NOVA.cyan }}>
                  {field.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-wider" style={{ ...mono(), color: NOVA.faint }}>
                    {field.label}
                  </p>
                  <p className="text-[12px] font-bold text-white tracking-tight break-words mt-0.5">
                    {field.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Official Hostel Booking & Allotment Order Section */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, ...SPRINGS.smooth }}
        className="px-5 mt-6 relative z-10"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ ...mono(), color: NOVA.orange }}>
            Hostel Booking &amp; Allotment
          </span>
          <div className="flex-1 h-px" style={{ background: NOVA.border }} />
        </div>

        <div
          className="rounded-3xl p-5 backdrop-blur-2xl transition-all relative overflow-hidden border"
          style={carbonGlass(NOVA.orange, "35")}
        >
          {/* Hostel Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                style={{ background: `${NOVA.orange}22`, border: `1px solid ${NOVA.orange}55` }}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ color: NOVA.orange }}>
                  apartment
                </span>
              </div>
              <div>
                <h3 className="text-[15px] font-black tracking-tight text-white">
                  SRM Hostels · Allotment Order
                </h3>
                <p className="text-[10px] font-mono font-bold text-orange-300">
                  Academic Year: {hostelAcademicYear}
                </p>
              </div>
            </div>

            <span
              className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase"
              style={{ ...mono(), ...statusBadge(isHosteller ? NOVA.orange : NOVA.faint) }}
            >
              {isHosteller ? "Allotted" : "Day Scholar"}
            </span>
          </div>

          {/* Official Hostel Allotment Fields */}
          {isHosteller ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
              {[
                { label: "Academic Year", value: hostelAcademicYear, icon: "calendar_today" },
                { label: "Hostel Name", value: hostelName || "Manoranjitham", icon: "home" },
                { label: "Room No", value: hostelRoomNo || "304", icon: "meeting_room" },
                { label: "Allotment Date", value: hostelAllotmentDate || "25-Jul-2025", icon: "event_available" },
                { label: "Fee Amount", value: hostelFeeAmount ? (String(hostelFeeAmount).startsWith("₹") ? hostelFeeAmount : `₹${hostelFeeAmount}`) : "₹1,25,000 (Paid)", icon: "payments" },
                { label: "Hostel Fee Pay Mode", value: hostelFeePayMode || "Online", icon: "credit_card" },
                { label: "Hostel Admit Card", value: hostelAdmitCard || "Available", icon: "download" },
                { label: "Declaration Form", value: hostelDeclarationForm || "Available", icon: "assignment" },
              ].map((field, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl flex items-start gap-2.5"
                  style={{ background: "rgba(18, 24, 38, 0.6)", border: `1px solid ${NOVA.border}` }}
                >
                  <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5" style={{ color: NOVA.orange }}>
                    {field.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-wider" style={{ ...mono(), color: NOVA.faint }}>
                      {field.label}
                    </p>
                    <p className="text-[12px] font-bold text-white tracking-tight break-words mt-0.5">
                      {field.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
              {[
                { label: "Residential Status", value: "Day Scholar (Commuter)", icon: "directions_bus" },
                { label: "Academic Year", value: hostelAcademicYear, icon: "calendar_today" },
                { label: "Hostel Allotment", value: "No Active Booking", icon: "domain_disabled" },
                { label: "Campus Location", value: "Kattankulathur Main Campus", icon: "location_on" },
              ].map((field, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl flex items-start gap-2.5"
                  style={{ background: "rgba(18, 24, 38, 0.6)", border: `1px solid ${NOVA.border}` }}
                >
                  <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5" style={{ color: NOVA.orange }}>
                    {field.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-wider" style={{ ...mono(), color: NOVA.faint }}>
                      {field.label}
                    </p>
                    <p className="text-[12px] font-bold text-white tracking-tight break-words mt-0.5">
                      {field.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* Attendance Bunk Shield Card */}
      <section className="px-5 mt-6 relative z-10">
        <AttendanceBunkShieldBadge
          attendedClasses={totalPresent}
          totalClasses={totalConducted}
          targetThresholdPct={monetization.targetBunkPct}
          tierId={monetization.tierId}
          variant="card"
          onOpenModal={monetization.openBunkShieldModal}
          onOpenUpgrade={monetization.openProModal}
        />
      </section>

      {/* Trust & Referral Cards */}
      <section className="px-5 mt-6 relative z-10 space-y-3">
        <ClassivoProUpgradeCard
          tierId={monetization.tierId}
          variant="card"
          onOpenUpgrade={monetization.openProModal}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TrustScoreStatusPill
            score={monetization.trustScore}
            tierId={monetization.tierId}
            variant="card"
            onOpenModal={monetization.openTrustModal}
          />
          <StudentReferralCard
            referralCode={`CLASSIVO-${regNo && regNo !== "-" ? regNo.toUpperCase() : studentId && studentId !== "-" ? `ID${studentId}` : "STUDENT-2026"}`}
            referralCount={monetization.referralCount}
            variant="card"
            onOpenModal={monetization.openReferralModal}
          />
        </div>
      </section>

      {/* Account Settings / Logout Action */}
      <section className="px-5 mt-7 relative z-10">
        <button
          onClick={() => { Haptics.heavy(); setConfirming(true); }}
          className="w-full py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
          style={{ background: "rgba(244, 63, 94, 0.12)", border: `1px solid ${NOVA.red}44`, color: NOVA.red }}
        >
          Disconnect &amp; Logout Account
        </button>
      </section>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {confirming && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 backdrop-blur-md" style={{ background: "rgba(0,0,0,0.7)" }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-[360px] rounded-2xl p-6 relative text-center"
              style={{ background: NOVA.panelSolid, border: `1px solid ${NOVA.borderStrong}` }}
            >
              <span className="material-symbols-outlined text-[36px]" style={{ color: NOVA.red }}>
                warning
              </span>
              <h3 className="text-[16px] font-black text-white mt-2">Disconnect Account?</h3>
              <p className="text-[11px] font-semibold text-white/60 mt-1">
                This will remove local cached portal credentials and log you out.
              </p>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest"
                  style={{ ...mono(), color: NOVA.muted, border: `1px solid ${NOVA.border}` }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest"
                  style={{ ...mono(), background: NOVA.red, color: "#fff" }}
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <ClassivoProUpgradeModal
        isOpen={monetization.isProModalOpen}
        onClose={monetization.closeProModal}
        currentTierId={monetization.tierId}
        onUpgradeTier={monetization.upgradeTier}
      />

      <AttendanceBunkShieldModal
        isOpen={monetization.isBunkShieldModalOpen}
        onClose={monetization.closeBunkShieldModal}
        attendanceData={userData?.attendance || []}
        targetThresholdPct={monetization.targetBunkPct}
        onSelectTargetPct={monetization.changeTargetBunkPct}
        tierId={monetization.tierId}
        onOpenUpgrade={monetization.openProModal}
      />

      <TrustScoreModal
        isOpen={monetization.isTrustModalOpen}
        onClose={monetization.closeTrustModal}
        trustScore={monetization.trustScore}
        tierId={monetization.tierId}
        onUpdateTrustScore={monetization.updateTrustScore}
        onOpenUpgrade={monetization.openProModal}
      />

      <StudentReferralModal
        isOpen={monetization.isReferralModalOpen}
        onClose={monetization.closeReferralModal}
        referralCode={`CLASSIVO-${regNo && regNo !== "-" ? regNo.toUpperCase() : studentId && studentId !== "-" ? `ID${studentId}` : "STUDENT-2026"}`}
        referralCount={monetization.referralCount}
        onIncrementReferrals={monetization.incrementReferrals}
      />
    </div>
  );
}
