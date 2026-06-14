"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { EncryptionUtils } from "@/utils/shared/Encryption";
import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import LoadingPage from "./LoadingPage";

interface LoginPageProps {
  onLogin: (data: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const { performLogin } = useApp();
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [captchaInput, setCaptchaInput] = useState<string>("");
  const [captchaImage, setCaptchaImage] = useState<string | null>(null);
  const [cdigest, setCdigest] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const formatUsername = (val: string) => {
    const cleanVal = val.trim();
    return cleanVal.includes("@") ? cleanVal : `${cleanVal}@srmist.edu.in`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setError("");
    const fullUsername = formatUsername(username);

    // --- Admin Override ---
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_KEY || "srmnest-admin-2024";
    if (fullUsername === "admin@srmist.edu.in" && password === adminPassword) {
      setLoading(true);
      setTimeout(() => {
        onLogin({
          isAdmin: true,
          profile: { name: "Administrator" },
          attendance: [],
          marks: [],
          schedule: {}
        });
      }, 1000);
      return;
    }
    // -----------------------

    const isOnboarded = localStorage.getItem("ratiod_onboarded") === "true";

    try {
      EncryptionUtils.cleanOldKeys();
      const savedCookies = EncryptionUtils.loadDecrypted("academia_cookies");
      const creds = {
        username: fullUsername,
        password: password,
        cookies: savedCookies,
        captcha: captchaInput || undefined,
        cdigest: cdigest || undefined,
      };

      if (!isOnboarded) {
        setIsExiting(true);
        performLogin(creds).catch(() => {});
        setTimeout(() => {
          router.push("/onboarding");
        }, 300);
      } else {
        setLoading(true);
        try {
          const data = await performLogin(creds);
          onLogin(data);
        } catch (err: any) {
          if (err?.type === "CAPTCHA_REQUIRED") {
            setCaptchaImage(err.image);
            setCdigest(err.cdigest);
            setError(err.message || "Please enter the CAPTCHA.");
            setCaptchaInput("");
          } else {
            setCaptchaImage(null);
            setCdigest(null);
            setError(err.message || "auth failed");
          }
          setLoading(false);
        }
      }
    } catch (err: any) {
      if (err?.type === "CAPTCHA_REQUIRED") {
        setCaptchaImage(err.image);
        setCdigest(err.cdigest);
        setError(err.message || "Please enter the CAPTCHA.");
        setCaptchaInput("");
      } else {
        setCaptchaImage(null);
        setCdigest(null);
        setError(err.message || "auth failed");
      }
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    },
    exit: {
      x: "-100%",
      opacity: 0,
      transition: {
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1] as any
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1] as any
      }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <>
      <AnimatePresence>
        {loading && <LoadingPage />}
      </AnimatePresence>

      <style jsx global>{`
        .glass-panel {
          backdrop-filter: blur(16px);
          background: rgba(23, 27, 40, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .neon-glow-cyan {
          box-shadow: 0 0 20px rgba(110, 231, 247, 0.15);
        }
        .glow-sphere {
          filter: blur(100px);
          position: absolute;
          z-index: -1;
          border-radius: 50%;
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 20px); }
        }
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>

      <motion.div 
        initial="hidden"
        animate={isExiting ? "exit" : "visible"}
        exit="exit"
        variants={containerVariants}
        className="min-h-screen w-full flex items-center justify-center p-5 relative overflow-hidden font-body-lg"
        style={{
          backgroundColor: '#050814',
          background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(110, 231, 247, 0.03) 0%, #050814 60%)`
        }}
      >
        {/* Ambient Background Decorations */}
        <div className="glow-sphere bg-primary-container/20 w-[400px] h-[400px] top-[-100px] right-[-100px] animate-float"></div>
        <div className="glow-sphere bg-secondary-container/20 w-[500px] h-[500px] bottom-[-150px] left-[-150px] animate-float" style={{ animationDelay: "-2s" }}></div>

        <main className="w-full max-w-[440px] relative z-10">
          {/* Branding Header */}
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-8">
            <h1 className="font-display-lg text-[48px] font-black bg-gradient-to-r from-[#E2C974] to-[#a78bfa] text-transparent bg-clip-text lowercase tracking-tighter leading-none">
              classivo
            </h1>
            <p className="font-body-sm text-[14px] text-on-surface-variant/60 mt-2 tracking-wide">
              authorized student gateway
            </p>
          </motion.div>

          {/* Login Form Container */}
          <motion.div variants={itemVariants} className="glass-panel p-8 rounded-xl neon-glow-cyan">
            <form onSubmit={handleSubmit} className="space-y-6" id="loginForm">
              
              {/* NetID Input */}
              <div className="space-y-2 group">
                <label className="font-label-caps text-[12px] font-bold text-primary-container/80 block uppercase tracking-wider">
                  username
                </label>
                <div className="relative flex items-center">
                  <input 
                    className="w-full bg-transparent border-0 border-b border-outline-variant/40 py-3 pr-28 text-on-surface focus:ring-0 focus:border-primary-container transition-all placeholder:text-outline/40 font-body-lg text-[16px] outline-none" 
                    placeholder="NetID" 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  {!username.includes("@") && (
                    <span className="absolute right-0 text-on-surface-variant/40 font-body-sm text-[14px] pointer-events-none pr-1 select-none">
                      @srmist.edu.in
                    </span>
                  )}
                </div>
              </div>

              {/* Passkey Input */}
              <div className="space-y-2 group">
                <label className="font-label-caps text-[12px] font-bold text-primary-container/80 block uppercase tracking-wider">
                  passkey
                </label>
                <div className="relative flex items-center">
                  <input 
                    className="w-full bg-transparent border-0 border-b border-outline-variant/40 py-3 pr-10 text-on-surface focus:ring-0 focus:border-primary-container transition-all placeholder:text-outline/40 font-body-lg text-[16px] outline-none" 
                    id="passwordField" 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    className="absolute right-0 text-on-surface-variant/60 hover:text-primary-container transition-colors" 
                    onClick={() => setShowPassword(!showPassword)} 
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Captcha Section */}
              <AnimatePresence>
                {captchaImage && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <label className="font-label-caps text-[12px] font-bold text-primary-container/80 block uppercase tracking-wider">
                      verification
                    </label>
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <input 
                          className="w-full bg-transparent border-0 border-b border-outline-variant/40 py-3 text-on-surface focus:ring-0 focus:border-primary-container transition-all placeholder:text-outline/40 font-body-lg text-[16px] outline-none" 
                          placeholder="Captcha" 
                          type="text"
                          value={captchaInput}
                          onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                        />
                      </div>
                      <div className="w-28 h-12 glass-panel rounded-lg overflow-hidden relative group cursor-pointer">
                        <img 
                          alt="captcha" 
                          className="w-full h-full object-cover opacity-80" 
                          src={captchaImage} 
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-error font-bold text-xs uppercase flex items-center gap-2 bg-error/10 p-4 rounded-xl border border-error/20"
                  >
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <div className="pt-4">
                <button 
                  className="w-full group relative p-[1px] rounded-lg bg-gradient-to-r from-primary-container to-secondary transition-transform active:scale-95 duration-200" 
                  type="submit"
                  disabled={loading}
                >
                  <div className="flex items-center justify-center gap-2 bg-background/90 rounded-[7px] py-4 px-6 hover:bg-transparent transition-colors group">
                    <span className="font-label-caps text-[12px] uppercase text-primary-container group-hover:text-background font-bold transition-colors">
                      {loading ? "wait..." : "signin"}
                    </span>
                    {loading ? (
                      <Loader2 className="animate-spin text-primary-container group-hover:text-background" size={16} />
                    ) : (
                      <span className="material-symbols-outlined text-[16px] text-primary-container group-hover:text-background transition-colors">
                        arrow_forward
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Footer Links */}
              <div className="flex justify-between items-center pt-2">
                <a className="font-label-caps text-[12px] font-bold text-on-surface-variant hover:text-primary-container transition-colors uppercase tracking-wider" href="#">forgot password?</a>
                <a className="font-label-caps text-[12px] font-bold text-on-surface-variant hover:text-primary-container transition-colors uppercase tracking-wider" href="#">help desk</a>
              </div>
            </form>
          </motion.div>

          {/* Additional Info */}
          <p className="mt-8 text-center font-body-sm text-[14px] text-on-surface-variant/40 leading-relaxed">
            © 2026 srm institute of science and technology. 
            <br/>all rights reserved. internal access only.
          </p>
        </main>
      </motion.div>
    </>
  );
};

export default LoginPage;
