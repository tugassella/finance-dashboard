"use client";

import Image from "next/image";
import { useState, CSSProperties } from "react";

const THEME = {
  primary: "#006837",
  primaryHover: "#00552d",
  primarySoft: "#edf7f1",
  background: "#f6fbf8",
  white: "#ffffff",

  border: "#dbe4dc",
  borderFocus: "#006837",

  text: "#1e293b",
  textSoft: "#64748b",

  danger: "#dc2626",
  dangerSoft: "#fef2f2",

  shadow: "0 10px 30px rgba(0,0,0,0.06)"
};

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");

  const handleLogin = async () => {
  setError("");

  if (!username || !password) {
    setError("Username dan password wajib diisi");
    return;
  }

  // USER TERDAFTAR
  const allowedUsers = [
    {
      username: "admin",
      password: "admin123"
    },
    {
      username: "finance",
      password: "finance123"
    },
    {
      username: "direktur",
      password: "direktur123"
    },
    {
      username: "pengurus",
      password: "pengurus123"
    }

  ];

  // CEK USER
  const userMatch = allowedUsers.find(
    (user) =>
      user.username === username &&
      user.password === password
  );

  if (!userMatch) {
    setError("Username atau password salah");
    return;
  }

  setLoading(true);

  setTimeout(() => {
    setLoading(false);

    // SIMPAN SESSION LOGIN
    localStorage.setItem("isLoggedIn", "true");

    // OPTIONAL: SIMPAN USERNAME
    localStorage.setItem("username", username);

    // REDIRECT
    window.location.href = "/";
  }, 1200);
};

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "13px 14px",
    borderRadius: "12px",
    border: `1px solid ${THEME.border}`,
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "0.2s",
    color: THEME.text,
    background: "#fff"
  };

  const allowedUsers = [
  {
    username: "admin",
    password: "admin123"
  },
  {
    username: "finance",
    password: "finance123"
  },
  {
    username: "direktur",
    password: "direktur123"
  },
  {
    username: "pengurus",
    password: "pengurus123"
  }

];

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .login-card {
            padding: 24px !important;
            border-radius: 18px !important;
          }

          .login-title {
            font-size: 24px !important;
          }
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: `
            radial-gradient(circle at top left, #edf7f1 0%, #f6fbf8 45%),
            radial-gradient(circle at bottom right, #e5f5eb 0%, #f6fbf8 40%)
          `,
          padding: "20px",
          fontFamily:
            "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
        }}
      >
        <div
          className="login-card"
          style={{
            width: "100%",
            maxWidth: "400px",
            background: THEME.white,
            borderRadius: "24px",
            padding: "36px",
            border: `1px solid ${THEME.border}`,
            boxShadow: THEME.shadow
          }}
        >
          {/* LOGO */}
          <div
            style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "20px"
            }}
            >
            <Image
                src="/Main Logo Title Great Edunesia.png"
                alt="GENESIS Logo"
                width={90}
                height={90}
                style={{
                objectFit: "contain"
                }}
            />
            </div>

          {/* HEADER */}
          <div
            style={{
              marginBottom: "30px",
              textAlign: "center"
            }}
          >
            <h1
              className="login-title"
              style={{
                margin: 0,
                fontSize: "30px",
                color: THEME.primary,
                fontWeight: 700,
                letterSpacing: "-0.5px"
              }}
            >
              GENESIS
            </h1>

            <p
              style={{
                marginTop: "10px",
                fontSize: "13px",
                color: THEME.textSoft,
                lineHeight: 1.6
              }}
            >
              Great Edunesia Executive Strategic Insight System
            </p>
          </div>

          {/* USERNAME */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#334155"
              }}
            >
              Username
            </label>

            <input
              type="text"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.border = `1px solid ${THEME.borderFocus}`;
                e.currentTarget.style.boxShadow =
                  "0 0 0 4px rgba(0,104,55,0.08)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = `1px solid ${THEME.border}`;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* PASSWORD */}
          <div style={{ marginBottom: "14px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#334155"
              }}
            >
              Password
            </label>

            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLogin();
                  }
                }}
                style={{
                  ...inputStyle,
                  paddingRight: "70px"
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = `1px solid ${THEME.borderFocus}`;
                  e.currentTarget.style.boxShadow =
                    "0 0 0 4px rgba(0,104,55,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = `1px solid ${THEME.border}`;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: THEME.primary,
                  fontWeight: 700
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* FORGOT */}
          <div
            style={{
              textAlign: "right",
              marginBottom: "22px"
            }}
          >
            <button
              style={{
                border: "none",
                background: "transparent",
                fontSize: "12px",
                color: THEME.primary,
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Lupa Password?
            </button>
          </div>

          {/* ERROR */}
          {error && (
            <div
              style={{
                marginBottom: "16px",
                padding: "11px 13px",
                borderRadius: "12px",
                background: THEME.dangerSoft,
                color: THEME.danger,
                fontSize: "12px",
                fontWeight: 500,
                border: "1px solid #fecaca"
              }}
            >
              {error}
            </div>
          )}

          {/* BUTTON */}
          <button
            onClick={handleLogin}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = THEME.primaryHover;
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = THEME.primary;
              }
            }}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: loading ? "#94a3b8" : THEME.primary,
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "0.2s",
              boxShadow: "0 6px 16px rgba(0,104,55,0.18)"
            }}
          >
            {loading ? "Memproses..." : "Login"}
          </button>

          {/* FOOTER */}
          <div
            style={{
              marginTop: "24px",
              paddingTop: "18px",
              borderTop: "1px solid #eef2f7",
              textAlign: "center"
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                color: THEME.textSoft
              }}
            >
              © 2026 Great Edunesia
            </p>
          </div>
        </div>
      </div>
    </>
  );
}