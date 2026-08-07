export const CLINIC = {
  name: "NH Gyne Clinic",
  urduName: "این ایچ گائنی کلینک",
  address: "138-2, Block 2, Sector B2, Township, Lahore 54770",
  phoneDisplay: "0344 4406456",
  phoneE164: "+923444406456",
  whatsappNumber: "923444406456",
  timezone: "Asia/Karachi",
  timezoneLabel: "Pakistan Standard Time (PKT)",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=NH%20Gyne%20Clinic%20138-2%20Block%202%20Sector%20B2%20Township%20Lahore",
} as const;

export const DOCTORS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "umar-farooq-shahzada",
    initials: "UF",
    name: "Dr. Umar Farooq Shahzada",
    title: "Consultant Anesthetist & Pain Specialist",
    credentials: "MBBS, MCPS, PMP, PMDC",
    shortTitle: "Pain & Anesthesia",
    bio: "Safe anesthesia care and evidence-based treatment for acute and chronic pain, delivered with calm, careful attention.",
    services: ["Pain management", "Anesthesia consultation", "Chronic pain care"],
    tone: "sage",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "sofia-bano",
    initials: "SB",
    name: "Dr. Sofia Bano",
    title: "Gynecologist & Obstetrician",
    credentials: "MBBS, MS (trained) Gynae & Obs, RMP, PMDC",
    shortTitle: "Women's Health",
    bio: "Thoughtful women's healthcare at every stage, from routine gynecology and prenatal support to postnatal wellness and family planning.",
    services: ["Gynecology", "Pregnancy care", "Family planning"],
    tone: "rose",
  },
] as const;

export type Doctor = (typeof DOCTORS)[number];

export const WEEKLY_HOURS = [
  { day: "Monday", hours: "5:00 PM – 10:00 PM" },
  { day: "Tuesday", hours: "5:00 PM – 10:30 PM" },
  { day: "Wednesday", hours: "5:00 PM – 10:00 PM" },
  { day: "Thursday", hours: "5:00 PM – 10:00 PM" },
  { day: "Friday", hours: "5:00 PM – 10:00 PM" },
  { day: "Saturday", hours: "5:00 PM – 10:00 PM" },
  { day: "Sunday", hours: "Closed" },
] as const;

export function getDoctor(doctorId: string) {
  return DOCTORS.find((doctor) => doctor.id === doctorId);
}

export function getPakistanDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.now() + offsetDays * 86_400_000));

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatClinicDate(date: string, style: "short" | "long" = "long") {
  const parsed = new Date(`${date}T12:00:00+05:00`);
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: CLINIC.timezone,
    weekday: style === "long" ? "long" : "short",
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  }).format(parsed);
}

export function formatClinicTime(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function getWhatsAppUrl(message?: string) {
  const base = `https://wa.me/${CLINIC.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
