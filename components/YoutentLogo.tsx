import Image from "next/image";
import Link from "next/link";

type Props = {
  className?: string;
  priority?: boolean;
  href?: string;
  size?: "sm" | "md" | "lg";
  lightWordmark?: boolean;
};

const sizes = {
  sm: { box: "h-8 w-8", text: "text-[17px]" },
  md: { box: "h-10 w-10", text: "text-[21px]" },
  lg: { box: "h-14 w-14", text: "text-[28px]" },
};

export default function YoutentLogo({
  className = "",
  priority = false,
  href,
  size = "md",
  lightWordmark = false,
}: Props) {
  const s = sizes[size];

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`youtent-logo-glossy relative shrink-0 ${s.box}`}
        aria-hidden="true"
      >
        <Image
          src="/youtent-logo-3d.svg"
          alt=""
          fill
          priority={priority}
          sizes="56px"
          className="youtent-logo-glossy-image"
        />
        <span className="youtent-logo-gloss-sweep" />
      </span>

      {href && (
        <span
          className={`font-black tracking-[-0.045em] ${s.text} ${
            lightWordmark ? "text-white" : "text-slate-950"
          }`}
        >
          YOUTENT<span className={lightWordmark ? "text-blue-200" : "text-blue-600"}>.</span>
        </span>
      )}
    </span>
  );

  return href ? (
    <Link href={href} aria-label="YOUTENT">
      {content}
    </Link>
  ) : (
    content
  );
}
