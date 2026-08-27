import { avatarGradient } from "@/lib/format";

interface Props {
  src: string | null | undefined;
  seed: number | string;
  label: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-sm",
};

/** Foto de perfil si hay `src`, si no cae al gradiente + inicial (comportamiento previo). */
export function Avatar({ src, seed, label, size = "md" }: Props) {
  const sizeClass = SIZE_CLASSES[size];

  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className={`flex-shrink-0 rounded-full object-cover ${sizeClass}`}
      />
    );
  }

  return (
    <div className={`flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ${avatarGradient(seed)} ${sizeClass}`}>
      {label.charAt(0).toUpperCase()}
    </div>
  );
}
