import CryptoJS from "crypto-js";

const getDeviceKey = () => {
  if (typeof window === "undefined") return "fallback";
  let key = localStorage.getItem("classivo_internal_dk");
  if (!key) {
    key = Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    localStorage.setItem("classivo_internal_dk", key);
  }
  return key;
};

const SECRET_KEY = getDeviceKey();

export const EncryptionUtils = {
  saveEncrypted: (key: string, data: any) => {
    try {
      const ciphertext = CryptoJS.AES.encrypt(
        JSON.stringify(data),
        SECRET_KEY
      ).toString();
      localStorage.setItem(key, ciphertext);
    } catch {
      console.error("Encryption failed");
    }
  },

  loadDecrypted: (key: string) => {
    try {
      const ciphertext = localStorage.getItem(key);
      if (!ciphertext) return null;
      const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      return decryptedData ? JSON.parse(decryptedData) : null;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  },

  cleanOldKeys: () => {
    const validKeys = [
      "classivo_internal_dk",
      "classivo_app_version",
      "academia_cookies",
      "classivo_credentials",
      "classivo_data",
      "classivo_custom_name",
      "classivo_theme",
      "classivo_private_notes",
      "classivo_custom_classes",
      "classivo_onboarded",
      "classivo_update_history",
      "classivo_seen_version",
      "classivo_profile_seed",
      "classivo_bypass_pwa",
      "classivo_setup_bypassed",
    ];

    Object.keys(localStorage).forEach((key) => {
      if (!validKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    });
  },

  flushAllStorage: async () => {
    const onboarded = localStorage.getItem("classivo_onboarded");
    
    localStorage.clear();
    sessionStorage.clear();
    
    if (onboarded) {
      localStorage.setItem("classivo_onboarded", onboarded);
    }
    
    document.cookie = "classivo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (err) {
        console.error("Cache cleanup failed", err);
      }
    }
  },

  setSessionCookie: () => {
    document.cookie = "classivo_session=active; path=/; max-age=2592000; SameSite=Lax";
  },
};
