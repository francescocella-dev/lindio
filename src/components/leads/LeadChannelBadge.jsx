const CHANNEL_CONFIG = {
  WhatsApp: {
    label: "WhatsApp",
    short: "WA",
    className: "channel-whatsapp",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12.03 3.2a8.72 8.72 0 0 0-7.46 13.24l-.92 3.37 3.45-.9a8.72 8.72 0 1 0 4.93-15.7Zm0 1.64a7.08 7.08 0 0 1 0 14.16 7 7 0 0 1-3.6-1l-.25-.15-2.05.54.55-2-.16-.26a7.08 7.08 0 0 1 5.51-11.29Zm-3.1 3.62c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.67 2.67 4.12 3.64 2.04.8 2.46.64 2.9.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.18-.71-.63-1.2-1.42-1.34-1.66-.14-.24-.02-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.42h-.46Z" />
      </svg>
    )
  },
  Telefono: {
    label: "Telefono",
    short: "Tel",
    className: "channel-phone",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.6 10.8c1.4 2.75 3.85 5 6.6 6.6l2.2-2.2c.28-.28.68-.36 1.04-.24 1.14.38 2.36.58 3.56.58.56 0 1 .44 1 1V20c0 .56-.44 1-1 1C10.6 21 3 13.4 3 4c0-.56.44-1 1-1h3.48c.56 0 1 .44 1 1 0 1.22.2 2.42.58 3.56.12.36.04.76-.24 1.04l-2.22 2.2Z" />
      </svg>
    )
  },
  Email: {
    label: "Email",
    short: "Mail",
    className: "channel-email",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16c.56 0 1 .44 1 1v12c0 .56-.44 1-1 1H4c-.56 0-1-.44-1-1V6c0-.56.44-1 1-1Zm8 7.4L5 8v9h14V8l-7 4.4Zm0-2.25L18.2 6.5H5.8L12 10.15Z" />
      </svg>
    )
  },
  Instagram: {
    label: "Instagram",
    short: "IG",
    className: "channel-instagram",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H8Zm4 3.5A3.5 3.5 0 1 1 12 15a3.5 3.5 0 0 1 0-7Zm0 2A1.5 1.5 0 1 0 12 13a1.5 1.5 0 0 0 0-3Zm4.75-2.75a.85.85 0 1 1-.85.85.85.85 0 0 1 .85-.85Z" />
      </svg>
    )
  },
  Facebook: {
    label: "Facebook",
    short: "FB",
    className: "channel-facebook",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 8.2V6.7c0-.72.28-1.1 1.2-1.1H17V3.15A22 22 0 0 0 14.75 3C12.5 3 11 4.38 11 6.9v1.3H8.5V11H11v10h3V11h2.5l.4-2.8H14Z" />
      </svg>
    )
  },
  "Sito/Form": {
    label: "Sito/Form",
    short: "Web",
    className: "channel-web",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm6.65 9h-3.08a15.44 15.44 0 0 0-1.05-5.02A8.04 8.04 0 0 1 18.65 11ZM12 4.04c.64.9 1.34 2.92 1.52 6.96h-3.04C10.66 6.96 11.36 4.94 12 4.04ZM4.06 13h3.08c.13 1.9.5 3.6 1.05 5.02A8.04 8.04 0 0 1 4.06 13Zm3.08-2H4.06a8.04 8.04 0 0 1 4.13-5.02A15.44 15.44 0 0 0 7.14 11ZM12 19.96c-.64-.9-1.34-2.92-1.52-6.96h3.04c-.18 4.04-.88 6.06-1.52 6.96Zm2.52-1.94c.55-1.42.92-3.12 1.05-5.02h3.08a8.04 8.04 0 0 1-4.13 5.02Z" />
      </svg>
    )
  },
  Altro: {
    label: "Altro",
    short: "Altro",
    className: "channel-other",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 10a2 2 0 1 1 .01 0H6Zm6 0a2 2 0 1 1 .01 0H12Zm6 0a2 2 0 1 1 .01 0H18ZM5 15h14v2H5v-2Z" />
      </svg>
    )
  }
};

function getChannelConfig(channel) {
  return CHANNEL_CONFIG[channel] || {
    ...CHANNEL_CONFIG.Altro,
    label: channel || "Altro"
  };
}

export default function LeadChannelBadge({ channel, variant = "badge" }) {
  const config = getChannelConfig(channel);

  if (variant === "icon") {
    return (
      <span
        className={`channel-icon-badge ${config.className}`}
        aria-label={`Canale: ${config.label}`}
        title={config.label}
      >
        {config.icon}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <span className={`channel-badge channel-badge-compact ${config.className}`}>
        <span className="channel-icon">{config.icon}</span>
        <strong>{config.short}</strong>
      </span>
    );
  }

  return (
    <span className={`channel-badge ${config.className}`}>
      <span className="channel-icon">{config.icon}</span>
      <strong>{config.label}</strong>
    </span>
  );
}