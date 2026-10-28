import type {ReactNode} from "react";

type IconProps = {
  className?: string;
};

function Svg({className = "h-5 w-5", children}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconSparkles({className}: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/>
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>
    </Svg>
  );
}

export function IconSend({className}: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 19V5"/>
      <path d="M5 12l7-7 7 7"/>
    </Svg>
  );
}

export function IconChat({className}: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>
    </Svg>
  );
}

export function IconCalendar({className}: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M8 3v4M16 3v4M3 10h18"/>
    </Svg>
  );
}

export function IconClock({className}: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 2"/>
    </Svg>
  );
}

export function IconArrowRight({className}: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 12h14"/>
      <path d="M13 6l6 6-6 6"/>
    </Svg>
  );
}

export function IconThermometer({className}: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>
    </Svg>
  );
}

export function IconUsers({className}: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="3"/>
      <path d="M3 20a6 6 0 0 1 12 0"/>
      <path d="M16 5a3 3 0 0 1 0 6"/>
      <path d="M21 20a6 6 0 0 0-4-5.6"/>
    </Svg>
  );
}

export function IconSearch({className}: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="7"/>
      <path d="M20 20l-3.5-3.5"/>
    </Svg>
  );
}

export function IconPlus({className}: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 5v14M5 12h14"/>
    </Svg>
  );
}

export function IconPencil({className}: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 20h4L19 9l-4-4L4 16v4z"/>
      <path d="M13.5 6.5l4 4"/>
    </Svg>
  );
}

export function IconTrash({className}: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M6 7l1 13h10l1-13"/>
      <path d="M9 7V4h6v3"/>
    </Svg>
  );
}

export function IconDashboard({className}: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="3" width="8" height="10" rx="1.5"/>
      <rect x="13" y="3" width="8" height="6" rx="1.5"/>
      <rect x="13" y="11" width="8" height="10" rx="1.5"/>
      <rect x="3" y="15" width="8" height="6" rx="1.5"/>
    </Svg>
  );
}

function IconDesk({className}: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="4" width="18" height="12" rx="2"/>
      <path d="M8 20h8M12 16v4"/>
    </Svg>
  );
}

function IconHeadset({className}: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4l-2-2.5h-2L9 17H5a2 2 0 0 1-2-2V9z"/>
    </Svg>
  );
}

export function IconGrid({className}: IconProps) {
  return (
    <Svg className={className}>
      <rect x="4" y="4" width="7" height="7" rx="1.5"/>
      <rect x="13" y="4" width="7" height="7" rx="1.5"/>
      <rect x="4" y="13" width="7" height="7" rx="1.5"/>
      <rect x="13" y="13" width="7" height="7" rx="1.5"/>
    </Svg>
  );
}

// Väljer ikon utifrån resurstypens namn, så att nya typer får en neutral ikon
export function ResourceTypeIcon({name, className}: IconProps & { name: string }) {
  const type = name.toLowerCase();

  if (type.includes("möte") || type.includes("rum")) return <IconUsers className={className}/>;
  if (type.includes("skrivbord") || type.includes("desk")) return <IconDesk className={className}/>;
  if (type.includes("vr") || type.includes("headset")) return <IconHeadset className={className}/>;

  return <IconGrid className={className}/>;
}
