import {
  HAIR_STYLES,
  HAIR_COLORS,
  EYES_OPTIONS,
  SKIN_TONES,
  ACCESSORIES,
  type AvatarShape,
} from "../lib/avatarOptions";

function getHex(id: string, list: readonly { id: string; hex?: string }[]): string {
  const found = list.find((x) => x.id === id);
  return (found as { hex?: string })?.hex ?? "#6b7280";
}

export function AvatarPreview({ avatar }: { avatar: AvatarShape }) {
  const skinHex = getHex(avatar.skinTone, SKIN_TONES);
  const hairHex = getHex(avatar.hairColor, HAIR_COLORS);

  const eyeStyle = EYES_OPTIONS.find((e) => e.id === avatar.eyes)?.id ?? "default";
  const showGlasses = avatar.accessory === "glasses";
  const hairStyle = avatar.hairStyle || "short";

  return (
    <svg
      viewBox="0 0 120 140"
      className="w-32 h-36 mx-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hair (behind face for most styles) */}
      {hairStyle === "short" && (
        <path
          d="M60 28 C35 32 22 55 25 75 C28 95 45 98 60 98 C75 98 92 95 95 75 C98 55 85 32 60 28Z"
          fill={hairHex}
          stroke="#111827"
          strokeWidth="1.5"
        />
      )}
      {hairStyle === "long" && (
        <>
          <path
            d="M60 26 C30 30 18 58 20 82 L20 128 L100 128 L100 82 C102 58 90 30 60 26Z"
            fill={hairHex}
            stroke="#111827"
            strokeWidth="1.5"
          />
        </>
      )}
      {hairStyle === "curly" && (
        <path
          d="M60 30 Q40 45 38 70 Q50 65 60 68 Q70 65 82 70 Q80 45 60 30 Q55 50 60 68 Q65 50 60 30Z"
          fill={hairHex}
          stroke="#111827"
          strokeWidth="1.2"
        />
      )}
      {hairStyle === "ponytail" && (
        <>
          <path
            d="M60 26 C32 30 24 55 28 78 L28 125 L92 125 L92 78 C96 55 88 30 60 26Z"
            fill={hairHex}
            stroke="#111827"
            strokeWidth="1.5"
          />
          <ellipse cx="60" cy="78" rx="12" ry="14" fill={hairHex} stroke="#111827" strokeWidth="1.2" />
        </>
      )}
      {hairStyle === "bun" && (
        <path
          d="M60 24 C38 28 28 52 32 72 Q60 68 88 72 Q92 52 82 24 Q60 20 60 24Z M60 38 A14 14 0 1 1 60 66 A14 14 0 1 1 60 38Z"
          fill={hairHex}
          stroke="#111827"
          strokeWidth="1.5"
        />
      )}
      {hairStyle === "bob" && (
        <path
          d="M60 30 C38 34 26 58 30 82 L30 95 L90 95 L90 82 C94 58 82 34 60 30Z"
          fill={hairHex}
          stroke="#111827"
          strokeWidth="1.5"
        />
      )}

      {/* Face */}
      <circle
        cx="60"
        cy="72"
        r="38"
        fill={skinHex}
        stroke="#111827"
        strokeWidth="2"
      />

      {/* Eyes */}
      {eyeStyle === "default" && (
        <>
          <circle cx="45" cy="68" r="4" fill="#111827" />
          <circle cx="75" cy="68" r="4" fill="#111827" />
        </>
      )}
      {eyeStyle === "wide" && (
        <>
          <ellipse cx="45" cy="68" rx="5" ry="4" fill="#111827" />
          <ellipse cx="75" cy="68" rx="5" ry="4" fill="#111827" />
        </>
      )}
      {eyeStyle === "narrow" && (
        <>
          <path d="M42 68 L48 68" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M72 68 L78 68" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
      {eyeStyle === "smile" && (
        <>
          <path d="M43 66 Q45 70 47 66" stroke="#111827" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M73 66 Q75 70 77 66" stroke="#111827" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* Mouth (simple) */}
      <path d="M50 88 Q60 94 70 88" stroke="#111827" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Glasses */}
      {showGlasses && (
        <>
          <circle cx="45" cy="68" r="10" fill="none" stroke="#111827" strokeWidth="2" />
          <circle cx="75" cy="68" r="10" fill="none" stroke="#111827" strokeWidth="2" />
          <path d="M55 68 L65 68" stroke="#111827" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
