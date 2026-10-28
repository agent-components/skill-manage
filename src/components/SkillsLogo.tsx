type SkillsLogoProps = {
  size?: number;
  className?: string;
};

/** 技能管理品牌标记：四格模块 */
export function SkillsLogo({ size = 28, className }: SkillsLogoProps) {
  const radius = Math.round(size * 0.25);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden
      className={className}
      style={{ display: "block", borderRadius: radius }}
    >
      <rect width="32" height="32" rx="8" fill="#1677FF" />
      <rect x="6" y="6" width="8.5" height="8.5" rx="2" fill="#fff" />
      <rect x="17.5" y="6" width="8.5" height="8.5" rx="2" fill="#fff" />
      <rect x="6" y="17.5" width="8.5" height="8.5" rx="2" fill="#fff" />
      <rect
        x="17.5"
        y="17.5"
        width="8.5"
        height="8.5"
        rx="2"
        fill="#fff"
        fillOpacity="0.55"
      />
    </svg>
  );
}
