import { getDiceBearUrl, type AvatarShape } from "../lib/avatarOptions";

type AvatarInput = AvatarShape | { style?: string; seed?: string; hairStyle?: string };

export function AvatarPreview({ avatar }: { avatar: AvatarInput }) {
  const style = avatar.style ?? "lorelei";
  const seed = avatar.seed ?? (("hairStyle" in avatar && avatar.hairStyle) ? "legacy" : "default");
  const src = getDiceBearUrl(style, seed);

  return (
    <div className="flex justify-center">
      <img
        src={src}
        alt="Your avatar"
        className="w-32 h-32 rounded-2xl border-2 border-ink shadow-comic-sm object-cover bg-slate-100"
      />
    </div>
  );
}
