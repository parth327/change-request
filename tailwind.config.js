/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs", "./public/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        bg: "#F6F5F1",
        surface: "#FFFFFF",
        ink: "#1B2430",
        "ink-muted": "#626B78",
        line: "#DAD5CA",
        accent: "#C1631A",
        "accent-ink": "#7A3E0F",
        "accent-soft": "#F3E3D3",
        success: "#206B45",
        "success-bg": "#E6F1EA",
        danger: "#9C2B2B",
        "danger-bg": "#FBEAEA",
        pending: "#56606D",
        "pending-bg": "#ECEAE4"
      },
      fontFamily: {
        sans: ["'Public Sans'", "system-ui", "sans-serif"]
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "4px",
        md: "6px",
        lg: "12px",
        xl: "18px"
      },
      boxShadow: {
        card: "0 1px 2px rgba(27,36,48,0.05), 0 4px 18px -6px rgba(27,36,48,0.10)",
        "card-hover": "0 2px 6px rgba(27,36,48,0.06), 0 16px 32px -8px rgba(27,36,48,0.16)",
        glow: "0 10px 28px -8px rgba(193,99,26,0.5)",
        header: "0 1px 0 rgba(0,0,0,0.35), 0 8px 24px -12px rgba(0,0,0,0.5)"
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #171F29 0%, #232E3C 55%, #2E3B4C 100%)",
        "accent-gradient": "linear-gradient(135deg, #C1631A 0%, #DE8339 100%)",
        "accent-gradient-hover": "linear-gradient(135deg, #A9550F 0%, #C1631A 100%)",
        "hero-glow": "radial-gradient(60% 100% at 85% 0%, rgba(193,99,26,0.16) 0%, rgba(193,99,26,0) 60%)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.16,1,0.3,1) both"
      }
    }
  },
  plugins: []
};
