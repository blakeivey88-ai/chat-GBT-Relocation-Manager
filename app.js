document.documentElement.classList.add("js-ready");

function cleanString(value, max = 120) {
  return String(value || "")
    .trim()
    .slice(0, max);
}
function cleanNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

const loadSeed = [
  {
    from: "Atlanta, GA",
    to: "Nashville, TN",
    rate: 685,
    mi: 250,
    pick: "Tomorrow 8am",
    wt: "3,200 lbs",
    eq: "26 ft Box",
    kind: "box",
    quick: true,
    lift: true,
    ramp: false,
    broker: "Blue Ridge Logistics",
    trust: 96,
    pay: "A",
    insurance: "Verified",
    tags: ["Verified broker", "Liftgate", "Quick-pay"],
  },
  {
    from: "Atlanta, GA",
    to: "Charlotte, NC",
    rate: 540,
    mi: 240,
    pick: "Today 2pm",
    wt: "1,800 lbs",
    eq: "16 ft Box w/ ramp",
    kind: "box",
    quick: false,
    lift: false,
    ramp: true,
    broker: "Peachtree Freight",
    trust: 91,
    pay: "B+",
    insurance: "Verified",
    tags: ["No-touch", "Ramp OK", "Dock both ends"],
  },
  {
    from: "Marietta, GA",
    to: "Birmingham, AL",
    rate: 430,
    mi: 170,
    pick: "Tomorrow 6am",
    wt: "2,400 lbs",
    eq: "26 ft Box w/ liftgate",
    kind: "box",
    quick: true,
    lift: true,
    ramp: false,
    broker: "Verified Moves Co.",
    trust: 89,
    pay: "A-",
    insurance: "Verified",
    tags: ["Quick-pay", "Liftgate", "Driver assist"],
  },
  {
    from: "Dalton, GA",
    to: "Knoxville, TN",
    rate: 610,
    mi: 120,
    pick: "Today 4pm",
    wt: "9,500 lbs",
    eq: "Truck + trailer / hotshot",
    kind: "trucktrailer",
    quick: true,
    lift: false,
    ramp: true,
    broker: "Appalachian Freight",
    trust: 94,
    pay: "A",
    insurance: "Verified",
    tags: ["Truck + trailer", "Machinery", "Forklift required"],
  },
  {
    from: "Macon, GA",
    to: "Savannah, GA",
    rate: 1250,
    mi: 170,
    pick: "Tomorrow 7am",
    wt: "22,000 lbs",
    eq: "Lowboy trailer",
    kind: "lowboy",
    quick: false,
    lift: false,
    broker: "Coastal Heavy Haul",
    trust: 97,
    tags: ["Oversize", "Permits set"],
  },
  {
    from: "Atlanta, GA",
    to: "Memphis, TN",
    rate: 1080,
    mi: 380,
    pick: "Tomorrow 10am",
    wt: "38,000 lbs",
    eq: "Dry Van 53 ft",
    kind: "dryvan",
    quick: true,
    lift: false,
    broker: "MidSouth Brokerage",
    trust: 88,
    tags: ["Quick-pay", "Drop trailer"],
  },
  {
    from: "Forest Park, GA",
    to: "Orlando, FL",
    rate: 1420,
    mi: 440,
    pick: "Fri 6am",
    wt: "41,000 lbs",
    eq: "Reefer",
    kind: "reefer",
    quick: true,
    lift: false,
    broker: "Cold Chain South",
    trust: 92,
    tags: ["Temp -10F", "Quick-pay"],
  },
  {
    from: "Cartersville, GA",
    to: "Mobile, AL",
    rate: 980,
    mi: 330,
    pick: "Today 3pm",
    wt: "44,000 lbs",
    eq: "53 ft flatbed",
    kind: "flatbed",
    quick: false,
    lift: false,
    broker: "Steel Lane Direct",
    trust: 85,
    tags: ["Tarps", "Chains"],
  },
  {
    from: "Atlanta, GA",
    to: "Dallas, TX",
    rate: 1650,
    mi: 780,
    pick: "Fri 8am",
    wt: "Preloaded trailer",
    eq: "Power Only",
    kind: "poweronly",
    quick: false,
    lift: false,
    broker: "Lone Star Drop",
    trust: 90,
    tags: ["Drop & hook"],
  },
  {
    from: "Chattanooga, TN",
    to: "Indianapolis, IN",
    rate: 1900,
    mi: 420,
    pick: "Mon 9am",
    wt: "42,000 lbs",
    eq: "53 ft Dry Van w/ liftgate",
    kind: "dryvanlift",
    quick: true,
    lift: true,
    ramp: false,
    broker: "Midwest Retail Freight",
    trust: 93,
    pay: "A-",
    insurance: "Verified",
    tags: ["53 ft", "Liftgate trailer", "Quick-pay"],
  },
  {
    from: "Birmingham, AL",
    to: "Houston, TX",
    rate: 2400,
    mi: 660,
    pick: "Tue 7am",
    wt: "39,000 lbs",
    eq: "53 ft Conestoga",
    kind: "conestoga",
    quick: false,
    lift: false,
    ramp: false,
    broker: "Covered Deck Logistics",
    trust: 90,
    pay: "B+",
    insurance: "Verified",
    tags: ["Conestoga", "No tarp", "Steel"],
  },
  {
    from: "Savannah, GA",
    to: "Charlotte, NC",
    rate: 3100,
    mi: 260,
    pick: "Wed 6am",
    wt: "62,000 lbs",
    eq: "Lowboy / RGN",
    kind: "lowboy",
    quick: true,
    lift: false,
    ramp: false,
    broker: "Heavy Haul Direct",
    trust: 95,
    pay: "A",
    insurance: "Verified",
    tags: ["Lowboy", "Oversize", "Permits"],
  },
  {
    from: "Jacksonville, FL",
    to: "Raleigh, NC",
    rate: 2100,
    mi: 430,
    pick: "Thu 8am",
    wt: "44,000 lbs",
    eq: "Step Deck",
    kind: "stepdeck",
    quick: false,
    lift: false,
    ramp: false,
    broker: "Southeast Deck Freight",
    trust: 87,
    pay: "B",
    insurance: "Verified",
    tags: ["Step deck", "Chains", "Appointment"],
  },
  {
    from: "Miami, FL",
    to: "Dallas, TX",
    rate: 1850,
    mi: 1350,
    pick: "This week",
    wt: "3 vehicles",
    eq: "Car carrier / auto transport",
    kind: "carcarrier",
    quick: false,
    lift: false,
    ramp: false,
    broker: "Interstate Auto Transport",
    trust: 90,
    pay: "A-",
    insurance: "Verified",
    tags: ["Car carrier", "Auto transport", "Multi-vehicle"],
    autoMode: "Fleet / dealership transport",
  },
];
let loadCatalog = loadSeed.map((load, index) =>
  normalizeLoadRecord(load, index),
);
let loadCatalogLoaded = false;
let loadCatalogPromise = null;
function normalizeLoadRecord(load = {}, index = 0) {
  const from = String(load.from || load.origin || "").trim();
  const to = String(load.to || load.destination || "").trim();
  const pick = String(load.pick || load.pickup || load.pickupAt || "").trim();
  const slugSource = [from, to, pick, index]
    .filter(Boolean)
    .join("-")
    .toLowerCase();
  const id =
    String(load.id || load.loadId || slugSource)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || `load-${index}`;
  return {
    id,
    from,
    to,
    rate: Number(load.rate || 0) || 0,
    mi: Number(load.mi || 0) || 0,
    pick,
    pickupAt: String(load.pickupAt || "").trim(),
    deliveryAt: String(load.deliveryAt || "").trim(),
    wt: String(load.wt || load.weight || "").trim(),
    eq: String(load.eq || load.equipment || "").trim(),
    kind: String(load.kind || "")
      .trim()
      .toLowerCase(),
    quick: Boolean(load.quick),
    lift: Boolean(load.lift),
    ramp: Boolean(load.ramp),
    broker: String(load.broker || "").trim(),
    trust: Number(load.trust || 0) || 0,
    pay: String(load.pay || "").trim(),
    insurance: String(load.insurance || "").trim(),
    status: String(load.status || "open")
      .trim()
      .toLowerCase(),
    createdAt: String(load.createdAt || "").trim(),
    tags: Array.isArray(load.tags) ? load.tags.slice(0, 12) : [],
    autoMode: String(load.autoMode || "").trim(),
  };
}
function loadCatalogItems() {
  return loadCatalog.map((item, index) => normalizeLoadRecord(item, index));
}
async function loadLoadCatalog(force = false) {
  if (loadCatalogLoaded && !force) return loadCatalog;
  if (loadCatalogPromise && !force) return loadCatalogPromise;
  loadCatalogPromise = (async () => {
    try {
      const data = await apiRequest("/api/loads", { method: "GET" });
      if (data?.ok && Array.isArray(data.loads)) {
        loadCatalog = data.loads.map((item, index) =>
          normalizeLoadRecord(item, index),
        );
        loadCatalogLoaded = true;
        return loadCatalog;
      }
    } catch {}
    loadCatalog = loadSeed.map((item, index) =>
      normalizeLoadRecord(item, index),
    );
    loadCatalogLoaded = true;
    return loadCatalog;
  })().finally(() => {
    loadCatalogPromise = null;
  });
  return loadCatalogPromise;
}
let trustedPartners = [
  {
    id: "partner-road-rescue",
    name: "Road Rescue Mobile Mechanics",
    category: "Mobile mechanics",
    city: "Atlanta, GA",
    serviceArea: "Atlanta metro · I-75 · I-20",
    hours: "24/7",
    contact: "404-555-0101",
    website: "",
    verificationStatus: "Approved by admin",
    approved: true,
    reviews: 18,
    recommendation:
      "Roadside tire changes, jump starts, and quick diagnostics.",
    services: "mobile repairs, tire changes, diagnostics",
    reported: false,
  },
  {
    id: "partner-parking-yard",
    name: "24/7 Truck Parking South",
    category: "Truck parking",
    city: "Macon, GA",
    serviceArea: "Central Georgia · overnight parking",
    hours: "Daily 24/7",
    contact: "478-555-0188",
    website: "",
    verificationStatus: "Pending review",
    approved: false,
    reviews: 6,
    recommendation:
      "Secure overnight truck parking with easy interstate access.",
    services: "secure parking, overnight storage, gate access",
    reported: false,
  },
  {
    id: "partner-tire-pro",
    name: "Tire Pro Heavy Duty",
    category: "Tire services",
    city: "Charlotte, NC",
    serviceArea: "Carolinas · roadside service",
    hours: "Mon-Sat 6am-10pm",
    contact: "704-555-0144",
    website: "",
    verificationStatus: "Approved by admin",
    approved: true,
    reviews: 22,
    recommendation: "Fast steer, trailer, and super-single tire replacement.",
    services: "tires, road service, alignments",
    reported: false,
  },
  {
    id: "partner-safe-hotel",
    name: "Driver Safe Stay",
    category: "Hotels",
    city: "Nashville, TN",
    serviceArea: "Downtown Nashville · I-40 corridor",
    hours: "24h front desk",
    contact: "615-555-0170",
    website: "",
    verificationStatus: "Verified business",
    approved: true,
    reviews: 34,
    recommendation: "Driver-friendly parking, late check-in, and breakfast.",
    services: "hotels, parking, late check-in",
    reported: false,
  },
  {
    id: "partner-freight-law",
    name: "Freight & Compliance Legal",
    category: "Legal and compliance services",
    city: "Birmingham, AL",
    serviceArea: "Southeast remote consults",
    hours: "Mon-Fri 8am-5pm",
    contact: "205-555-0123",
    website: "",
    verificationStatus: "Pending review",
    approved: false,
    reviews: 9,
    recommendation:
      "Authority, claim, and compliance questions for small carriers.",
    services: "compliance, contracts, disputes",
    reported: false,
  },
  {
    id: "partner-warehouse-hub",
    name: "Metro Load Crossdock",
    category: "Warehouses",
    city: "Savannah, GA",
    serviceArea: "Port area · crossdock and staging",
    hours: "Mon-Sat 5am-9pm",
    contact: "912-555-0166",
    website: "",
    verificationStatus: "Approved by admin",
    approved: true,
    reviews: 12,
    recommendation: "Crossdock, short-term storage, and last-mile staging.",
    services: "warehouse, crossdock, staging",
    reported: false,
  },
  {
    id: "partner-insurance-link",
    name: "Coverage Link Insurance",
    category: "Insurance services",
    city: "Dallas, TX",
    serviceArea: "Texas statewide",
    hours: "Mon-Fri 8:30am-6pm",
    contact: "214-555-0190",
    website: "",
    verificationStatus: "Pending review",
    approved: false,
    reviews: 15,
    recommendation:
      "Cargo, liability, and certificate support for small fleets.",
    services: "insurance, certificates, claims",
    reported: false,
  },
  {
    id: "partner-tow-master",
    name: "Tow Master Express",
    category: "Towing",
    city: "Jacksonville, FL",
    serviceArea: "North Florida · roadside recovery",
    hours: "24/7",
    contact: "904-555-0130",
    website: "",
    verificationStatus: "Approved by admin",
    approved: true,
    reviews: 27,
    recommendation: "Heavy-duty towing and recovery for breakdowns.",
    services: "towing, recovery, roadside",
    reported: false,
  },
];
const tiers = [
  {
    badge: "✓",
    name: "New & Verified",
    score: "0–249",
    milestone: "Identity established",
    benefit:
      "Profile is verified, but performance history is still developing.",
  },
  {
    badge: "↗",
    name: "Proven",
    score: "250–499",
    milestone: "Consistent basics",
    benefit:
      "Completed work, dependable communication, and a growing verified record.",
  },
  {
    badge: "★",
    name: "Trusted",
    score: "500–699",
    milestone: "Reliable partner",
    benefit: "Strong reliability and safety signals across meaningful history.",
  },
  {
    badge: "◆",
    name: "Preferred",
    score: "700–849",
    milestone: "High confidence",
    benefit:
      "Priority visibility earned through sustained verified performance.",
  },
  {
    badge: "🦅",
    name: "Elite",
    score: "850–1000",
    milestone: "Top performer",
    benefit:
      "Exceptional long-term record with strict volume and safety requirements.",
  },
];
const roadmap = [
  [
    "Coming Soon",
    "AI Dispatch Assistant",
    "Help assign, route, and follow up on freight and relocation work.",
    "Coming Soon",
  ],
  [
    "Coming Soon",
    "Driver Community",
    "Give drivers a place to share tips, updates, and support.",
    "Coming Soon",
  ],
  [
    "Coming Soon",
    "Lane Alerts",
    "Surface the lanes, equipment, and rates that match how you run.",
    "Coming Soon",
  ],
  [
    "Coming Soon",
    "Trusted Partner Network",
    "Bring verified services like parking, towing, warehousing, and repairs into the platform.",
    "Coming Soon",
  ],
  [
    "Coming Soon",
    "Mobile App",
    "Move from the web app into a mobile experience built for drivers on the road.",
    "Coming Soon",
  ],
  [
    "Coming Soon",
    "Customer Relocation Portal",
    "Give customers a smoother way to plan residential and commercial moves.",
    "Coming Soon",
  ],
];
const verificationItems = [
  [
    "Carrier authority",
    "DOT/MC, company name, operating status, dispatch phone/email, and identity match.",
  ],
  [
    "Truck profile",
    "Box truck, 53 ft dry van/reefer, liftgate trailer, flatbed, step deck, conestoga, lowboy/RGN, power-only, truck+trailer; photos required.",
  ],
  [
    "Equipment flags",
    "Liftgate, ramp, pallet jack, straps, load bars, tarps, chains, dock-high compatibility.",
  ],
  [
    "Insurance file",
    "Cargo/liability certificate, expiration date, coverage amount, document review status.",
  ],
  [
    "Broker trust",
    "Business identity, payment grade, dispute history, quick-pay status, and rehire feedback.",
  ],
  [
    "Lane fit",
    "Saved lanes, home base radius, net per mile target, no-touch preference, and alert frequency.",
  ],
  [
    "Auto transport",
    "Car carrier / auto transport for dealership moves, auction runs, and personal vehicle shipments.",
  ],
];
const brokerTrust = [
  {
    name: "Blue Ridge Logistics",
    score: 96,
    pay: "A",
    quick: "24h quick-pay",
    risk: "Low",
    notes: "Verified identity, no open disputes, insurance docs current.",
  },
  {
    name: "Peachtree Freight",
    score: 91,
    pay: "B+",
    quick: "Standard pay",
    risk: "Low",
    notes: "Good response history, slower payment average.",
  },
  {
    name: "Verified Moves Co.",
    score: 89,
    pay: "A-",
    quick: "24h quick-pay",
    risk: "Medium-low",
    notes: "Strong payment history, newer broker account.",
  },
  {
    name: "Steel Lane Direct",
    score: 85,
    pay: "B",
    quick: "No quick-pay",
    risk: "Medium",
    notes: "Requires document review before booking heavy freight.",
  },
];
const directRequests = [
  {
    id: "req-furniture-atl-greenville",
    customer: "Furniture store",
    from: "Atlanta, GA",
    to: "Greenville, SC",
    equipment: "26 ft box truck w/ liftgate",
    budget: "$725",
    when: "Tomorrow afternoon",
    details:
      "12 boxed couches, no dock at delivery, customer requests blanket wrap.",
  },
  {
    id: "req-construction-bhm-mobile",
    customer: "Construction supplier",
    from: "Birmingham, AL",
    to: "Mobile, AL",
    equipment: "Flatbed or step deck",
    budget: "Best offer",
    when: "This week",
    details: "Steel bundles, forklift at pickup, crane unload at site.",
  },
  {
    id: "req-machine-savannah-raleigh",
    customer: "Machine shop",
    from: "Savannah, GA",
    to: "Raleigh, NC",
    equipment: "Lowboy / RGN",
    budget: "$3,200 target",
    when: "Next Tuesday",
    details: "Oversize equipment, permits likely needed, photos available.",
  },
  {
    id: "req-auto-personal-atl-philly",
    customer: "Family move",
    from: "Atlanta, GA",
    to: "Philadelphia, PA",
    equipment: "Car carrier / auto transport",
    budget: "Best offer",
    when: "Within 2 weeks",
    details: "One personal SUV, running condition, door-to-door preferred.",
    transportMode: "Personal vehicle shipping",
  },
  {
    id: "req-auto-fleet-miami-houston",
    customer: "Dealership group",
    from: "Miami, FL",
    to: "Houston, TX",
    equipment: "Car carrier / auto transport",
    budget: "Best offer",
    when: "Next week",
    details:
      "8 units total, mixed sedans and SUVs, auction pickup with staging area.",
    transportMode: "Fleet / dealership transport",
  },
];
const trustScale = [
  [
    "900–1000",
    "Legend",
    "Only sustained verified performance reaches this band.",
  ],
  ["800–899", "Elite", "High trust with strong verified load history."],
  ["650–799", "Preferred", "Reliable, growing history, good partner feedback."],
  [
    "450–649",
    "Building",
    "Active account with enough data to rank but still earning trust.",
  ],
  [
    "0–449",
    "New / unproven",
    "Limited history; not eligible for top local placement.",
  ],
];
const trustRewardRoadmap = [
  {
    score: 250,
    label: "Verified basics",
    detail: "Unlocked after identity + verified activity.",
  },
  {
    score: 350,
    label: "Higher placement in search results",
    detail: "Better visibility in local and equipment matching.",
  },
  {
    score: 450,
    label: "Early access to matching loads",
    detail: "See good-fit loads sooner.",
  },
  {
    score: 550,
    label: "Preferred-carrier status",
    detail: "Shown as a trusted operator to partners.",
  },
  {
    score: 650,
    label: "Lower platform fees",
    detail: "Eligible for better fee treatment when offered.",
  },
  {
    score: 700,
    label: "Fuel discounts",
    detail: "Eligible for partner fuel offers when available.",
  },
  {
    score: 750,
    label: "Maintenance discounts",
    detail: "Eligible for partner maintenance offers when available.",
  },
  {
    score: 800,
    label: "Faster-payment options",
    detail: "Priority access to quicker payment choices.",
  },
  {
    score: 850,
    label: "Exclusive customer invitations",
    detail: "Receive invite-only load and customer opportunities.",
  },
  {
    score: 900,
    label: "Featured-profile opportunities",
    detail: "Can appear in highlighted placements.",
  },
  {
    score: 950,
    loads: 25,
    label: "Monthly achievement recognition",
    detail: "Shown in monthly recognition when earned.",
  },
  {
    score: 900,
    loads: 25,
    label: "Legend placement",
    detail: "Only sustained operators can rank at the very top.",
  },
];
const trustLeaderboardRules = [
  "Top local placement requires at least 25 verified loads and 60 active days.",
  "Elite / Legend placement also needs a low cancellation rate and verified feedback.",
  "One completed load can start a reputation profile, but it cannot outrank a real history.",
];
function clamp(value, min = 0, max = 100) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
function scoreFromRate(value, fallback = 50) {
  const n = Number(value);
  return Number.isFinite(n) ? clamp(n) : fallback;
}
function logConfidence(value, divisor, cap = 1) {
  return Math.min(
    cap,
    Math.log10((Number(value) || 0) + 1) / Math.log10(divisor),
  );
}
function trustValueScore(
  value,
  { good = 95, bad = 25, invert = false, fallback = 50 } = {},
) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const pct = clamp(n, 0, 100);
  const normalized = invert ? 100 - pct : pct;
  return clamp(normalized);
}
function trustMetricScore(
  value,
  { target = 90, spread = 30, fallback = 50, invert = false } = {},
) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const diff = invert ? Math.max(0, n - target) : Math.abs(n - target);
  return clamp(100 - Math.min(100, diff * (100 / spread)));
}
function trustCategoryScoreFromStats(stats, category) {
  switch (category) {
    case "reliability": {
      const verifiedLoads = stats.verifiedLoads;
      const onTimePickup = stats.onTimePickupPct;
      const onTimeDelivery = stats.onTimeDeliveryPct;
      const acceptance = stats.loadAcceptancePct;
      const cancellation = stats.cancellationRatePct;
      const noShow = stats.noShowRatePct;
      const streak = stats.completionStreak;
      const delayFairness = stats.delayResponsibilityPct;
      const volume = Math.min(100, 28 + Math.log10(verifiedLoads + 1) * 28);
      const punctuality =
        onTimePickup * 0.34 +
        onTimeDelivery * 0.34 +
        acceptance * 0.12 +
        (100 - cancellation) * 0.12 +
        (100 - noShow) * 0.04 +
        Math.min(100, 45 + streak * 4) * 0.04;
      return clamp(punctuality * 0.82 + delayFairness * 0.18 + volume * 0.18);
    }
    case "professionalism": {
      return clamp(
        stats.responseSpeedPct * 0.24 +
          stats.instructionsPct * 0.16 +
          stats.conductPct * 0.16 +
          stats.cleanlinessPct * 0.1 +
          stats.securementPct * 0.16 +
          stats.statusUpdatePct * 0.1 +
          stats.paperworkPct * 0.08,
      );
    }
    case "safety": {
      const base =
        stats.damageFreePct * 0.22 +
        stats.safetyIncidentPct * 0.1 +
        stats.inspectionPct * 0.16 +
        stats.podAccuracyPct * 0.18 +
        stats.tempCompliancePct * 0.16 +
        stats.securementCompliancePct * 0.18;
      return clamp(base);
    }
    case "experience": {
      const loads = stats.verifiedLoads;
      const miles = stats.verifiedMiles;
      const days = stats.activeDays;
      const repeat = stats.repeatCustomers;
      const equipment = stats.equipmentSpecificLoads;
      const freight = stats.freightTypesCompleted;
      const loadScore = clamp(
        (Math.log10(loads + 1) / Math.log10(500 + 1)) * 100,
      );
      const mileScore = clamp(
        (Math.log10(miles + 1) / Math.log10(500000 + 1)) * 100,
      );
      const dayScore = clamp(
        (Math.log10(days + 1) / Math.log10(3650 + 1)) * 100,
      );
      const repeatScore = clamp(repeat * 12);
      const specialtyScore = clamp(((equipment + freight) / 8) * 100);
      return clamp(
        loadScore * 0.32 +
          mileScore * 0.18 +
          dayScore * 0.18 +
          repeatScore * 0.12 +
          specialtyScore * 0.2,
      );
    }
    case "feedback": {
      const reviewVolume = stats.feedbackCount;
      const avg = stats.feedbackAverage;
      const sourceBreadth = stats.feedbackSources;
      const complaintRate = stats.complaintRatePct;
      const reviewConfidence = clamp(
        38 +
          Math.log10(reviewVolume + 1) * 24 +
          Math.min(100, sourceBreadth * 12),
      );
      const sentiment = clamp(avg * 20);
      return clamp(
        sentiment * 0.55 +
          reviewConfidence * 0.35 +
          (100 - complaintRate) * 0.1,
      );
    }
    default:
      return 0;
  }
}
function trustProfileStats(profile = getProfile()) {
  const now = Date.now();
  const createdAt =
    Date.parse(profile.createdAt || profile.emailVerifiedAt || "") || now;
  const activeDays = Math.max(1, Math.floor((now - createdAt) / 86400000));
  const recentLoads = Array.isArray(profile.recentLoads)
    ? profile.recentLoads
    : [];
  const recentRequests = Array.isArray(profile.recentRequests)
    ? profile.recentRequests
    : [];
  const laneAlerts = Array.isArray(profile.laneAlerts)
    ? profile.laneAlerts
    : [];
  const completedTrips = Array.isArray(profile.plannedTrips)
    ? profile.plannedTrips
    : [];
  const tags = Array.isArray(profile.tags) ? profile.tags : [];
  const verifiedLoads = cleanNumber(
    profile.verifiedLoadsCompleted ||
      profile.completedLoads ||
      profile.verifiedLoadCount ||
      completedTrips.length ||
      recentLoads.length,
  );
  const verifiedMiles = cleanNumber(
    profile.verifiedMiles ||
      profile.totalVerifiedMiles ||
      profile.milesVerified ||
      profile.milesCompleted ||
      0,
  );
  const onTimePickupPct = scoreFromRate(
    profile.onTimePickupPct ||
      profile.onTimePickupRate ||
      profile.pickupOnTimePct,
    verifiedLoads ? 88 + Math.min(8, verifiedLoads / 12) : 70,
  );
  const onTimeDeliveryPct = scoreFromRate(
    profile.onTimeDeliveryPct ||
      profile.onTimeDeliveryRate ||
      profile.deliveryOnTimePct,
    verifiedLoads ? 87 + Math.min(9, verifiedLoads / 10) : 68,
  );
  const loadAcceptancePct = scoreFromRate(
    profile.loadAcceptancePct ||
      profile.loadAcceptanceRate ||
      profile.acceptancePct,
    verifiedLoads ? 64 + Math.min(22, verifiedLoads * 1.1) : 58,
  );
  const cancellationRatePct = scoreFromRate(
    profile.cancellationRatePct ||
      profile.cancellationRate ||
      profile.cancelRate ||
      0,
    verifiedLoads ? Math.max(2, 14 - Math.min(10, verifiedLoads / 2)) : 16,
  );
  const noShowRatePct = scoreFromRate(
    profile.noShowRatePct || profile.noShowRate || 0,
    verifiedLoads ? Math.max(1, 8 - Math.min(6, verifiedLoads / 5)) : 7,
  );
  const completionStreak = cleanNumber(
    profile.completionStreak ||
      profile.loadCompletionStreak ||
      profile.successStreak ||
      recentLoads.length,
  );
  const delayResponsibilityPct = scoreFromRate(
    profile.delayResponsibilityPct ||
      profile.excusedDelayPct ||
      profile.delayAttributionScore ||
      profile.externalDelayPct ||
      profile.delayFairnessPct ||
      profile.documentedDelayPct ||
      100,
    92,
  );
  const responseSpeedPct = scoreFromRate(
    profile.responseSpeedPct ||
      profile.responsePct ||
      profile.responseTimeScore,
    verifiedLoads ? 70 + Math.min(20, verifiedLoads) : 60,
  );
  const instructionsPct = scoreFromRate(
    profile.instructionsPct ||
      profile.instructionsFollowPct ||
      profile.instructionsScore,
    88,
  );
  const conductPct = scoreFromRate(
    profile.conductPct || profile.professionalismPct || profile.conductScore,
    90,
  );
  const cleanlinessPct = scoreFromRate(
    profile.cleanlinessPct ||
      profile.equipmentCleanlinessPct ||
      profile.cleanlinessScore,
    profile.type && /flatbed|step deck|lowboy|rgn|conestoga/i.test(profile.type)
      ? 85
      : 90,
  );
  const securementPct = scoreFromRate(
    profile.securementPct || profile.securementScore,
    profile.type && /flatbed|step deck|lowboy|rgn|conestoga/i.test(profile.type)
      ? 88
      : 92,
  );
  const statusUpdatePct = scoreFromRate(
    profile.statusUpdatePct || profile.statusScore || profile.communicationPct,
    88,
  );
  const paperworkPct = scoreFromRate(
    profile.paperworkPct || profile.paperworkScore || profile.documentPct,
    90,
  );
  const damageFreePct = scoreFromRate(
    profile.damageFreePct || profile.claimFreePct || profile.freightDamagePct,
    96,
  );
  const safetyIncidentPct = scoreFromRate(
    profile.safetyIncidentPct || profile.safetyRate || profile.incidentScore,
    98,
  );
  const inspectionPct = scoreFromRate(
    profile.inspectionPct ||
      profile.inspectionPassPct ||
      profile.inspectionScore,
    profile.createdAt ? 88 : 80,
  );
  const podAccuracyPct = scoreFromRate(
    profile.podAccuracyPct || profile.podScore || profile.deliveryProofPct,
    91,
  );
  const reefer =
    Boolean(profile.equipmentType && /reefer/i.test(profile.equipmentType)) ||
    Boolean(profile.type && /reefer/i.test(profile.type));
  const tempCompliancePct = scoreFromRate(
    profile.tempCompliancePct ||
      profile.temperatureCompliancePct ||
      profile.reeferCompliancePct,
    reefer ? 94 : 100,
  );
  const securementCompliancePct = scoreFromRate(
    profile.securementCompliancePct ||
      profile.securementCompliance ||
      securementPct,
    securementPct,
  );
  const repeatCustomers = cleanNumber(
    profile.repeatCustomers ||
      profile.repeatCustomerCount ||
      profile.rehireCustomers ||
      0,
  );
  const equipmentSpecificLoads = cleanNumber(
    profile.equipmentSpecificLoads ||
      profile.equipmentLoads ||
      profile.specialtyLoads ||
      0,
  );
  const freightTypesCompleted = cleanNumber(
    profile.freightTypesCompleted ||
      profile.freightTypes ||
      profile.freightCategoriesCompleted ||
      0,
  );
  const feedbackCount = cleanNumber(
    profile.feedbackCount ||
      profile.reviewsCount ||
      profile.partnerReviewsCount ||
      0,
  );
  const feedbackAverage =
    Number(
      profile.feedbackAverage ||
        profile.reviewAverage ||
        profile.partnerAverage ||
        0,
    ) || 0;
  const feedbackSources = cleanNumber(
    profile.feedbackSources ||
      profile.reviewSources ||
      profile.partnerFeedbackSources ||
      0,
  );
  const complaintRatePct = scoreFromRate(
    profile.complaintRatePct ||
      profile.complaintRate ||
      profile.disputeRate ||
      0,
    feedbackCount ? Math.max(4, 14 - Math.min(10, feedbackCount)) : 12,
  );
  const stats = {
    verifiedLoads,
    verifiedMiles,
    activeDays,
    onTimePickupPct,
    onTimeDeliveryPct,
    loadAcceptancePct,
    cancellationRatePct,
    noShowRatePct,
    completionStreak,
    delayResponsibilityPct,
    responseSpeedPct,
    instructionsPct,
    conductPct,
    cleanlinessPct,
    securementPct,
    statusUpdatePct,
    paperworkPct,
    damageFreePct,
    safetyIncidentPct,
    inspectionPct,
    podAccuracyPct,
    tempCompliancePct,
    securementCompliancePct,
    repeatCustomers,
    equipmentSpecificLoads,
    freightTypesCompleted,
    feedbackCount,
    feedbackAverage,
    feedbackSources,
    complaintRatePct,
    tags,
  };
  const reliability = trustCategoryScoreFromStats(stats, "reliability");
  const professionalism = trustCategoryScoreFromStats(stats, "professionalism");
  const safety = trustCategoryScoreFromStats(stats, "safety");
  const experience = trustCategoryScoreFromStats(stats, "experience");
  const feedback = trustCategoryScoreFromStats(stats, "feedback");
  const weighted =
    reliability * 0.4 +
    professionalism * 0.2 +
    safety * 0.2 +
    experience * 0.1 +
    feedback * 0.1;
  const historyConfidence = clamp(
    0.28 +
      Math.min(0.42, Math.log10(verifiedLoads + 1) / 2.2) +
      Math.min(0.12, Math.log10(activeDays + 1) / 3.1) +
      Math.min(0.08, Math.log10((verifiedMiles || 0) + 1) / 4.5),
  );
  const maturityPenalty =
    verifiedLoads < 25
      ? Math.min(
          180,
          (25 - verifiedLoads) * 7 + (25 - Math.min(25, activeDays)) * 2,
        )
      : 0;
  const score = clamp(
    Math.round(weighted * 10 * historyConfidence - maturityPenalty),
    0,
    1000,
  );
  return {
    score,
    confidence: historyConfidence,
    stats,
    breakdown: {
      Reliability: Math.round(reliability),
      Professionalism: Math.round(professionalism),
      Safety: Math.round(safety),
      Experience: Math.round(experience),
      Feedback: Math.round(feedback),
    },
    eligibleForTopRank: verifiedLoads >= 25 && activeDays >= 60 && score >= 650,
    verifiedLoads,
    activeDays,
  };
}
function trustBand(score) {
  const n = clamp(score, 0, 1000);
  if (n >= 850) return "Elite";
  if (n >= 700) return "Preferred";
  if (n >= 500) return "Trusted";
  if (n >= 250) return "Proven";
  return "New & Verified";
}
function trustRewardsForProfile(
  profile = getProfile(),
  summary = americanTruckersTrustScore(profile),
) {
  const score = summary.score;
  const stats = summary.stats || trustProfileStats(profile);
  return trustRewardRoadmap.map((item) => {
    const unlocked =
      score >= item.score &&
      (!item.loads || stats.verifiedLoads >= item.loads) &&
      (!item.days || stats.activeDays >= item.days);
    return {
      threshold: item.loads
        ? `${item.score}+ / ${item.loads}+ loads`
        : `${item.score}+`,
      label: item.label,
      detail: item.detail,
      unlocked,
    };
  });
}
function trustRankNotes(summary = americanTruckersTrustScore()) {
  return summary.eligibleForTopRank
    ? "Eligible for top local placement."
    : "Needs more verified loads and active history before top placement.";
}
function americanTruckersTrustScore(profile = getProfile()) {
  return trustProfileStats(profile);
}
function verifiedTransactions() {
  return readJSON(storageKeys.verifiedTransactions, []);
}
function saveVerifiedTransactions(transactions) {
  writeJSON(storageKeys.verifiedTransactions, transactions.slice(0, 60));
  scheduleAccountSync();
}
function trustConfidenceLabel(loads = 0) {
  const n = cleanNumber(loads);
  if (n < 10) return "New and Verified";
  if (n < 25) return "Developing Reputation";
  if (n < 100) return "Established";
  if (n < 500) return "Experienced";
  if (n < 1000) return "Proven Professional";
  return "Elite Professional";
}
function trustConfidenceMultiplier(loads = 0) {
  const n = cleanNumber(loads);
  if (n < 10) return 0;
  if (n < 25) return 0.25;
  if (n < 100) return 0.45;
  if (n < 500) return 0.65;
  if (n < 1000) return 0.85;
  return 1;
}
function confidenceAdjustedRating(score = 0, loads = 0) {
  const base = clamp(score, 0, 100);
  const weight = trustConfidenceMultiplier(loads);
  return Math.round(base * weight);
}
function confidenceAdjustedTrustScore(score = 0, loads = 0) {
  const n = cleanNumber(loads);
  if (n < 10) return null;
  return confidenceAdjustedRating(score, loads);
}
function reviewTransactionLabel(tx = {}) {
  const party = escapeHtml(
    tx.counterpartyName ||
      tx.reviewedName ||
      tx.customerName ||
      tx.brokerName ||
      tx.facilityName ||
      "Verified transaction",
  );
  const route = escapeHtml(
    tx.title ||
      tx.route ||
      [tx.origin, tx.destination].filter(Boolean).join(" → ") ||
      "Completed load",
  );
  const type = escapeHtml(tx.reviewTargetType || tx.kind || "review");
  return `${party} · ${route} · ${type}`;
}
function reviewTransactionKey(tx = {}) {
  return [
    tx.id || "",
    tx.completedAt || "",
    tx.counterpartyName ||
      tx.customerName ||
      tx.brokerName ||
      tx.facilityName ||
      "",
    tx.reviewTargetType || tx.kind || "",
  ].join("|");
}
function reviewAlreadySubmitted(profile, tx) {
  const reviewerId = String(profile.userId || profile.email || "").trim();
  const key = reviewTransactionKey(tx);
  return trustEntries().some(
    (entry) =>
      String(entry.reviewerUserId || "").trim() === reviewerId &&
      String(entry.reviewTransactionKey || "").trim() === key,
  );
}
function eligibleReviewTransactions(profile = getProfile()) {
  const reviewerId = String(profile.userId || profile.email || "").trim();
  const completed = verifiedTransactions().filter(
    (tx) =>
      tx &&
      tx.completedAt &&
      tx.verified &&
      tx.counterpartyName &&
      tx.reviewTargetType,
  );
  return completed.filter(
    (tx) =>
      String(tx.reviewerUserId || "").trim() === reviewerId &&
      !reviewAlreadySubmitted(profile, tx),
  );
}
function deriveReviewSubject(tx = {}, targetType = "shipper") {
  const mode = String(targetType || "shipper").toLowerCase();
  if (mode.includes("pickup"))
    return (
      tx.pickupFacility ||
      tx.origin ||
      tx.title ||
      tx.counterpartyName ||
      "Pickup facility"
    );
  if (mode.includes("delivery"))
    return (
      tx.deliveryFacility ||
      tx.destination ||
      tx.title ||
      tx.counterpartyName ||
      "Delivery facility"
    );
  return (
    tx.counterpartyName ||
    tx.reviewedName ||
    tx.customerName ||
    tx.brokerName ||
    tx.facilityName ||
    "Verified transaction"
  );
}
function renderReviewTargets() {
  const select = $("#reviewTransaction");
  const targetType = $("#reviewTargetType");
  const notice = $("#reviewTransactionNotice");
  const subject = $("#ratingName");
  const profile = getProfile();
  if (!select || !subject) return;
  const txs = eligibleReviewTransactions(profile);
  select.innerHTML = txs.length
    ? [
        '<option value="">Select a verified completed transaction</option>',
        ...txs.map(
          (tx) =>
            `<option value="${escapeHtml(reviewTransactionKey(tx))}">${reviewTransactionLabel(tx)}</option>`,
        ),
      ].join("")
    : '<option value="">No verified completed transactions yet</option>';
  select.disabled = !txs.length;
  select.setAttribute("aria-disabled", String(!txs.length));
  if (notice)
    notice.textContent = txs.length
      ? "Reviews unlock only after a completed, verified transaction and are limited to one per transaction."
      : "Finish a verified load before leaving shipper/facility feedback.";
  const updateSubject = () => {
    const currentTx =
      txs.find((tx) => reviewTransactionKey(tx) === select.value) ||
      txs[0] ||
      null;
    const currentTarget = targetType?.value || "shipper";
    subject.value = currentTx
      ? deriveReviewSubject(currentTx, currentTarget)
      : "Select a verified completed transaction";
  };
  select.onchange = () => {
    renderReviewQuestions();
    updateSubject();
  };
  if (targetType)
    targetType.onchange = () => {
      renderReviewQuestions();
      updateSubject();
    };
  if (!select.value && txs[0]) select.value = reviewTransactionKey(txs[0]);
  renderReviewQuestions();
  updateSubject();
}
function renderTrustSummary() {
  const box = $("#trustSummary");
  if (!box) return;
  const profile = getProfile();
  const summary = americanTruckersTrustScore(profile);
  const rewards = trustRewardsForProfile(profile, summary);
  const verifiedLoads = summary.verifiedLoads || 0;
  const publicScore = confidenceAdjustedTrustScore(
    summary.score,
    verifiedLoads,
  );
  const confidenceLabel = trustConfidenceLabel(verifiedLoads);
  const scoreMarkup =
    publicScore === null
      ? `<strong class="score lock">Locked</strong><span>Public score unlocks at 10 verified loads</span>`
      : `<strong class="score">${publicScore}</strong><span>/ 1000 public score</span>`;
  box.innerHTML = `<div class="card-inset trust-summary"><div class="section-head"><h3>American Truckers Trust Score</h3><span class="tag">${confidenceLabel}</span></div><div class="scorecard trust-scorecard"><div>${scoreMarkup}</div><div class="score-bars">${Object.entries(
    summary.breakdown,
  )
    .map(
      ([label, value]) =>
        `<label title="${escapeHtml(label)}"><span>${label}</span><span style="width:${value}%"></span></label>`,
    )
    .join(
      "",
    )}</div></div><p class="muted">Based on verified loads, reliability, professionalism, safety, experience, and verified partner feedback. The public score is confidence-adjusted and stays hidden until 10 verified loads. Local top ranks require at least 25 verified loads and 60 active days. ${promotionDisclosure(profile)}</p><div class="trust-rules">${trustLeaderboardRules.map((rule) => `<div class="tag">${escapeHtml(rule)}</div>`).join("")}</div><div class="trust-rewards">${rewards.map((item) => `<div class="reward ${item.unlocked ? "unlocked" : ""}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.threshold)}</span><small>${escapeHtml(item.detail)}</small></div>`).join("")}</div><p class="muted">${trustRankNotes(summary)}</p></div>`;
}

const reviewQuestionCatalog = {
  customer: [
    {
      key: "arrival",
      label: "Did they arrive on time?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "A little late" },
        { value: 1, label: "Very late / no-show" },
      ],
    },
    {
      key: "communication",
      label: "Did they communicate clearly?",
      options: [
        { value: 5, label: "Very clear" },
        { value: 3, label: "Mostly clear" },
        { value: 1, label: "Not clear" },
      ],
    },
    {
      key: "instructions",
      label: "Did they follow instructions?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "equipment",
      label: "Was the equipment appropriate and professional?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "condition",
      label: "Was the freight delivered in acceptable condition?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Minor issue" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "rehire",
      label: "Would you hire them again?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Maybe" },
        { value: 1, label: "No" },
      ],
    },
  ],
  driver: [
    {
      key: "loadInfo",
      label: "Was the load information accurate?",
      options: [
        { value: 5, label: "Accurate" },
        { value: 3, label: "Mostly accurate" },
        { value: 1, label: "Misleading" },
      ],
    },
    {
      key: "rateHonored",
      label: "Was the agreed rate honored?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Partly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "paymentOnTime",
      label: "Was payment made on time?",
      options: [
        { value: 5, label: "On time" },
        { value: 3, label: "Slight delay" },
        { value: 1, label: "Late / not paid" },
      ],
    },
    {
      key: "loadTime",
      label: "How long did loading take?",
      options: [
        { value: 5, label: "Fast" },
        { value: 3, label: "Normal" },
        { value: 1, label: "Slow" },
      ],
    },
    {
      key: "unloadTime",
      label: "How long did unloading take?",
      options: [
        { value: 5, label: "Fast" },
        { value: 3, label: "Normal" },
        { value: 1, label: "Slow" },
      ],
    },
    {
      key: "detention",
      label: "Was detention paid when applicable?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Not applicable / unclear" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "access",
      label: "Was the facility easy to access?",
      options: [
        { value: 5, label: "Easy" },
        { value: 3, label: "Manageable" },
        { value: 1, label: "Difficult" },
      ],
    },
    {
      key: "parking",
      label: "Was parking available?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Limited" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "restrooms",
      label: "Were restrooms available?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Limited / unclear" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "staff",
      label: "Were staff professional?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "rehire",
      label: "Would you work with them again?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Maybe" },
        { value: 1, label: "No" },
      ],
    },
  ],
};

const trustBadgeCatalog = [
  {
    key: "first-10-loads",
    label: "First 10 Loads",
    detail: "Complete 10 verified loads.",
    evaluate: ({ stats }) => ({
      unlocked: stats.verifiedLoads >= 10,
      progress: badgeCountProgress(stats.verifiedLoads, 10, "verified loads"),
    }),
  },
  {
    key: "verified-25-loads",
    label: "25 Verified Loads",
    detail: "Complete 25 verified loads.",
    evaluate: ({ stats }) => ({
      unlocked: stats.verifiedLoads >= 25,
      progress: badgeCountProgress(stats.verifiedLoads, 25, "verified loads"),
    }),
  },
  {
    key: "verified-100-loads",
    label: "100 Verified Loads",
    detail: "Complete 100 verified loads.",
    evaluate: ({ stats }) => ({
      unlocked: stats.verifiedLoads >= 100,
      progress: badgeCountProgress(stats.verifiedLoads, 100, "verified loads"),
    }),
  },
  {
    key: "verified-500-loads",
    label: "500 Verified Loads",
    detail: "Complete 500 verified loads.",
    evaluate: ({ stats }) => ({
      unlocked: stats.verifiedLoads >= 500,
      progress: badgeCountProgress(stats.verifiedLoads, 500, "verified loads"),
    }),
  },
  {
    key: "verified-1000-loads",
    label: "1,000 Verified Loads",
    detail: "Complete 1,000 verified loads.",
    evaluate: ({ stats }) => ({
      unlocked: stats.verifiedLoads >= 1000,
      progress: badgeCountProgress(stats.verifiedLoads, 1000, "verified loads"),
    }),
  },
  {
    key: "on-time-25",
    label: "25 Consecutive On-Time Deliveries",
    detail: "Keep a 25-load on-time streak.",
    evaluate: ({ profile, stats }) => {
      const streak = cleanNumber(
        profile.onTimeDeliveryStreak ||
          profile.consecutiveOnTimeDeliveries ||
          stats.completionStreak ||
          0,
      );
      return {
        unlocked: streak >= 25,
        progress: badgeCountProgress(streak, 25, "on-time deliveries"),
      };
    },
  },
  {
    key: "on-time-100",
    label: "100 Consecutive On-Time Deliveries",
    detail: "Keep a 100-load on-time streak.",
    evaluate: ({ profile, stats }) => {
      const streak = cleanNumber(
        profile.onTimeDeliveryStreak ||
          profile.consecutiveOnTimeDeliveries ||
          stats.completionStreak ||
          0,
      );
      return {
        unlocked: streak >= 100,
        progress: badgeCountProgress(streak, 100, "on-time deliveries"),
      };
    },
  },
  {
    key: "claim-free-100",
    label: "100 Claim-Free Loads",
    detail: "Complete 100 claim-free loads.",
    evaluate: ({ profile, stats }) => {
      const claimFree = Math.round(
        cleanNumber(
          profile.claimFreeLoads ||
            profile.damageFreeLoads ||
            stats.verifiedLoads * (stats.damageFreePct / 100) ||
            0,
        ),
      );
      return {
        unlocked: claimFree >= 100,
        progress: badgeCountProgress(claimFree, 100, "claim-free loads"),
      };
    },
  },
  {
    key: "claim-free-500",
    label: "500 Claim-Free Loads",
    detail: "Complete 500 claim-free loads.",
    evaluate: ({ profile, stats }) => {
      const claimFree = Math.round(
        cleanNumber(
          profile.claimFreeLoads ||
            profile.damageFreeLoads ||
            stats.verifiedLoads * (stats.damageFreePct / 100) ||
            0,
        ),
      );
      return {
        unlocked: claimFree >= 500,
        progress: badgeCountProgress(claimFree, 500, "claim-free loads"),
      };
    },
  },
  {
    key: "excellent-communicator",
    label: "Excellent Communicator",
    detail: "Strong communication and status updates.",
    evaluate: ({ stats }) => {
      const comm = Math.round(
        (stats.responseSpeedPct +
          stats.statusUpdatePct +
          stats.instructionsPct) /
          3,
      );
      return {
        unlocked: comm >= 90 && stats.feedbackCount >= 10,
        progress: badgePercentProgress(comm, 90, "communication score"),
      };
    },
  },
  {
    key: "repeat-customer-favorite",
    label: "Repeat Customer Favorite",
    detail: "Earn repeat business and high feedback.",
    evaluate: ({ stats }) => {
      const repeat = cleanNumber(stats.repeatCustomers || 0);
      return {
        unlocked: repeat >= 10,
        progress: badgeCountProgress(repeat, 10, "repeat customers"),
      };
    },
  },
  {
    key: "flatbed-specialist",
    label: "Flatbed Specialist",
    detail: "Verified flatbed history.",
    evaluate: ({ profile, stats }) => {
      const ok =
        /flatbed/i.test(
          String(
            profile.primaryEquipment ||
              profile.equipmentType ||
              profile.type ||
              "",
          ),
        ) ||
        rankingEquipmentTypes(profile).some((item) => /flatbed/i.test(item));
      return {
        unlocked: ok && stats.verifiedLoads >= 25,
        progress: badgeCountProgress(stats.verifiedLoads, 25, "verified loads"),
      };
    },
  },
  {
    key: "reefer-specialist",
    label: "Reefer Specialist",
    detail: "Verified reefer history.",
    evaluate: ({ profile, stats }) => {
      const ok =
        /reefer/i.test(
          String(
            profile.primaryEquipment ||
              profile.equipmentType ||
              profile.type ||
              "",
          ),
        ) ||
        rankingEquipmentTypes(profile).some((item) => /reefer/i.test(item));
      return {
        unlocked: ok && stats.verifiedLoads >= 25,
        progress: badgeCountProgress(stats.verifiedLoads, 25, "verified loads"),
      };
    },
  },
  {
    key: "hotshot-professional",
    label: "Hot Shot Professional",
    detail: "Verified hot-shot history.",
    evaluate: ({ profile, stats }) => {
      const ok =
        /hot ?shot/i.test(
          String(
            profile.primaryEquipment ||
              profile.equipmentType ||
              profile.type ||
              "",
          ),
        ) ||
        rankingEquipmentTypes(profile).some((item) => /hot shot/i.test(item));
      return {
        unlocked: ok && stats.verifiedLoads >= 25,
        progress: badgeCountProgress(stats.verifiedLoads, 25, "verified loads"),
      };
    },
  },
  {
    key: "conestoga-specialist",
    label: "Conestoga Specialist",
    detail: "Verified conestoga history.",
    evaluate: ({ profile, stats }) => {
      const ok =
        /conestoga/i.test(
          String(
            profile.primaryEquipment ||
              profile.equipmentType ||
              profile.type ||
              "",
          ),
        ) ||
        rankingEquipmentTypes(profile).some((item) => /conestoga/i.test(item));
      return {
        unlocked: ok && stats.verifiedLoads >= 25,
        progress: badgeCountProgress(stats.verifiedLoads, 25, "verified loads"),
      };
    },
  },
  {
    key: "heavy-haul-specialist",
    label: "Heavy-Haul Specialist",
    detail: "Verified lowboy, RGN, or oversized work.",
    evaluate: ({ profile, stats }) => {
      const text = String(
        profile.primaryEquipment || profile.equipmentType || profile.type || "",
      );
      const ok =
        /lowboy|rgn|oversize|oversized|heavy haul|specialized/i.test(text) ||
        rankingEquipmentTypes(profile).some((item) =>
          /lowboy|rgn|oversized|heavy haul|specialized/i.test(item),
        );
      return {
        unlocked: ok && stats.verifiedLoads >= 25,
        progress: badgeCountProgress(stats.verifiedLoads, 25, "verified loads"),
      };
    },
  },
  {
    key: "verified-insurance",
    label: "Verified Insurance",
    detail: "Insurance verification is complete.",
    evaluate: ({ profile }) => {
      const ok = /verified|approved|complete/i.test(
        String(profile.insuranceVerification || profile.insuranceStatus || ""),
      );
      return {
        unlocked: ok,
        progress: ok ? "Verified" : "Insurance verification needed",
      };
    },
  },
  {
    key: "verified-authority",
    label: "Verified Authority",
    detail: "Authority verification is complete.",
    evaluate: ({ profile }) => {
      const ok = /verified|approved|complete/i.test(
        String(
          profile.authorityVerification ||
            profile.authorityStatus ||
            profile.dotMcStatus ||
            "",
        ),
      );
      return {
        unlocked: ok,
        progress: ok ? "Verified" : "Authority verification needed",
      };
    },
  },
  {
    key: "fast-paperwork",
    label: "Fast Paperwork",
    detail: "Paperwork stays quick and accurate.",
    evaluate: ({ stats }) => {
      const paperwork = Math.round(stats.paperworkPct || 0);
      return {
        unlocked: paperwork >= 90 && stats.verifiedLoads >= 25,
        progress: badgePercentProgress(paperwork, 90, "paperwork score"),
      };
    },
  },
  {
    key: "detention-friendly-shipper",
    label: "Detention-Friendly Shipper",
    detail: "Detention is paid when it should be.",
    evaluate: ({ profile }) => {
      const detention = cleanNumber(
        profile.detentionPaidPct ||
          profile.detentionFriendlyPct ||
          profile.detentionPaymentPct ||
          0,
      );
      return {
        unlocked: detention >= 90,
        progress: badgePercentProgress(detention, 90, "detention paid"),
      };
    },
  },
  {
    key: "fast-loading-facility",
    label: "Fast-Loading Facility",
    detail: "Loading time stays efficient.",
    evaluate: ({ profile }) => {
      const loading = cleanNumber(
        profile.loadingSpeedPct || profile.fastLoadingPct || 0,
      );
      const minutes = cleanNumber(profile.loadingTimeAvgMinutes || 0);
      const value = loading || Math.max(0, 100 - Math.min(100, minutes * 3));
      return {
        unlocked: value >= 90,
        progress: badgePercentProgress(value, 90, "loading speed"),
      };
    },
  },
  {
    key: "driver-recommended",
    label: "Driver Recommended",
    detail: "Drivers keep recommending this partner.",
    evaluate: ({ stats }) => {
      const avg = cleanNumber(stats.feedbackAverage * 20 || 0);
      return {
        unlocked: avg >= 94 && stats.feedbackCount >= 10,
        progress: badgePercentProgress(avg, 94, "recommendation score"),
      };
    },
  },
  {
    key: "top-10-area",
    label: "Top 10% in Area",
    detail: "Rank within the top 10% locally.",
    evaluate: ({ bestLocal }) => {
      const percent = bestLocal ? bestLocal.percent : 100;
      const scope = bestLocal?.scope?.scopeLabel || "local area";
      return {
        unlocked: percent <= 10,
        progress: bestLocal
          ? `${scope} · #${bestLocal.scope.rank} of ${bestLocal.scope.total}`
          : "No local rank yet",
      };
    },
  },
  {
    key: "top-5-area",
    label: "Top 5% in Area",
    detail: "Rank within the top 5% locally.",
    evaluate: ({ bestLocal }) => {
      const percent = bestLocal ? bestLocal.percent : 100;
      const scope = bestLocal?.scope?.scopeLabel || "local area";
      return {
        unlocked: percent <= 5,
        progress: bestLocal
          ? `${scope} · #${bestLocal.scope.rank} of ${bestLocal.scope.total}`
          : "No local rank yet",
      };
    },
  },
  {
    key: "top-1-area",
    label: "Top 1% in Area",
    detail: "Rank within the top 1% locally.",
    evaluate: ({ bestLocal }) => {
      const percent = bestLocal ? bestLocal.percent : 100;
      const scope = bestLocal?.scope?.scopeLabel || "local area";
      return {
        unlocked: percent <= 1,
        progress: bestLocal
          ? `${scope} · #${bestLocal.scope.rank} of ${bestLocal.scope.total}`
          : "No local rank yet",
      };
    },
  },
];

function reviewQuestionMode(profile = getProfile(), targetType = "shipper") {
  return reviewTargetRole(
    targetType || profile.type || profile.role || "driver",
  );
}
function reviewQuestionSet(profile = getProfile(), targetType = "shipper") {
  const mode = reviewQuestionMode(profile, targetType);
  return roleReviewQuestionCatalog[mode] || roleReviewQuestionCatalog.driver;
}
function renderReviewQuestions() {
  const box = $("#reviewQuestions");
  if (!box) return;
  const profile = getProfile();
  const targetType = $("#reviewTargetType")?.value || "shipper";
  const mode = reviewQuestionMode(profile, targetType);
  const questions =
    roleReviewQuestionCatalog[mode] || roleReviewQuestionCatalog.driver;
  const title = roleScorecardCatalog[mode]?.label || "Role scorecard";
  box.innerHTML = `<div class="review-question-head"><strong>${escapeHtml(title)}</strong><p class="muted">Answer these structured questions first. Comments are optional and moderated.</p></div><div class="review-question-list">${questions.map((q) => `<label class="review-question"><span>${escapeHtml(q.label)}</span><select data-review-question="${q.key}" required><option value="">Choose one</option>${q.options.map((o) => `<option value="${o.value}">${escapeHtml(o.label)}</option>`).join("")}</select></label>`).join("")}</div>`;
}
function reviewQuestionValues(form, profile = getProfile()) {
  const targetType = $("#reviewTargetType")?.value || "shipper";
  const questions = reviewQuestionSet(profile, targetType);
  return questions.map((q) => {
    const select = form.querySelector(`[data-review-question="${q.key}"]`);
    const value = Number(select?.value || 0);
    return {
      key: q.key,
      label: q.label,
      value,
      valueLabel: select?.selectedOptions?.[0]?.textContent?.trim() || "",
    };
  });
}
function reviewCommentViolation(comment = "") {
  const text = String(comment || "").trim();
  if (!text) return "";
  const lowered = text.toLowerCase();
  if (
    /[\w.+-]+@[\w.-]+\.\w+/.test(text) ||
    /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text) ||
    /\b\d{3}-\d{2}-\d{4}\b/.test(text) ||
    /\b\d{1,5}\s+[a-z0-9.'-]+\s+(?:st|street|ave|avenue|rd|road|blvd|lane|ln|dr|drive|way|court|ct)\b/i.test(
      text,
    )
  )
    return "Comments cannot include private contact or address details.";
  if (/\b(kill|hurt|beat|shoot|stab|burn|threaten|attack)\w*\b/i.test(text))
    return "Comments cannot include threats.";
  if (
    /\b(racist|sexist|homophob|transphob|bigot|nazi|slave)\b/i.test(lowered) ||
    /(black|white|asian|hispanic|latino|muslim|jew|christian|immigrant|gay|trans).{0,40}\b(hate|trash|inferior|dirty|criminal)\b/i.test(
      lowered,
    )
  )
    return "Comments cannot include discrimination.";
  if (
    /\b(fuck|shit|bitch|asshole|bastard|motherfucker|cunt|dick|prick|pussy)\b/i.test(
      lowered,
    ) &&
    /\b(you|your|he|she|they|them|that driver|that broker|this person|this customer|this facility)\b/i.test(
      lowered,
    )
  )
    return "Comments cannot include profanity directed at a person.";
  if (
    /\b(you|your|he|she|they|them|that driver|that broker|this person|this customer|this facility)\b.{0,30}\b(idiot|stupid|dumb|lazy|trash|worthless|loser|scammer|clown|moron)\b/i.test(
      lowered,
    )
  )
    return "Comments cannot include unrelated personal attacks.";
  return "";
}
function reviewQuestionSummary(answers = []) {
  return answers.map((item) => `${item.label}: ${item.valueLabel}`).join(" · ");
}
function badgeCountProgress(current, target, unit) {
  const value = Math.max(0, Math.min(target, cleanNumber(current)));
  return `${value}/${target} ${unit}`;
}
function badgePercentProgress(current, target, unit) {
  const value = Math.max(0, Math.min(100, cleanNumber(current)));
  return `${Math.round(value)}% / ${target}% ${unit}`;
}
function badgeBestLocalScope(board) {
  const scopes = Array.isArray(board?.scopes) ? board.scopes : [];
  return scopes.reduce((best, scope) => {
    const percent = scope?.total
      ? ((scope.rank || 0) / (scope.total || 1)) * 100
      : 100;
    const record = { scope, percent };
    if (!best || percent < best.percent) return record;
    return best;
  }, null);
}
function trustBadgesForProfile(
  profile = getProfile(),
  summary = americanTruckersTrustScore(profile),
  board = rankingBoard(profile),
) {
  const stats = summary.stats || {};
  const bestLocal = badgeBestLocalScope(board);
  return trustBadgeCatalog.map((badge) => {
    const result =
      badge.evaluate({ profile, summary, stats, board, bestLocal }) || {};
    return {
      key: badge.key,
      label: badge.label,
      detail: badge.detail,
      progress: result.progress || "",
      unlocked: Boolean(result.unlocked),
    };
  });
}
function trustBadgesMarkup(
  profile = getProfile(),
  summary = americanTruckersTrustScore(profile),
  board = rankingBoard(profile),
) {
  const badges = trustBadgesForProfile(profile, summary, board);
  const unlocked = badges.filter((item) => item.unlocked).length;
  return `<div class="trust-badges"><div class="section-head"><h4>Badges and achievements</h4><span class="tag">${unlocked}/${badges.length} unlocked</span></div><div class="trust-rewards">${badges.map((item) => `<div class="reward ${item.unlocked ? "unlocked" : "locked"}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.progress)}</span><small>${escapeHtml(item.detail)}</small></div>`).join("")}</div></div>`;
}
function renderTrustBadges() {
  const profile = getProfile();
  const summary = americanTruckersTrustScore(profile);
  const board = rankingBoard(profile);
  const html = trustBadgesMarkup(profile, summary, board);
  ["#trustSummary", "#profilePublicCard"].forEach((sel) => {
    const box = $(sel);
    if (!box) return;
    const existing = box.querySelector(".trust-badges");
    if (existing) existing.remove();
    box.insertAdjacentHTML("beforeend", html);
  });
}

function buildVerifiedReviewEntry(profile, form) {
  const verified = eligibleReviewTransactions(profile);
  const field = (name) => form.querySelector(`#${name}`);
  const txKey = String(field("reviewTransaction")?.value || "").trim();
  const targetType = String(
    field("reviewTargetType")?.value || "shipper",
  ).trim();
  const tx =
    verified.find((item) => reviewTransactionKey(item) === txKey) ||
    verified[0];
  if (!tx)
    return {
      error: "Finish a verified load before reviewing shippers or facilities.",
    };
  const subject = deriveReviewSubject(tx, targetType);
  const mode = reviewQuestionMode(profile, targetType);
  const questions = reviewQuestionSet(profile, targetType);
  const answers = questions.map((q) => {
    const select = form.querySelector(`[data-review-question="${q.key}"]`);
    const value = Number(select?.value || 0);
    return {
      key: q.key,
      label: q.label,
      value,
      valueLabel: select?.selectedOptions?.[0]?.textContent?.trim() || "",
    };
  });
  if (answers.some((item) => !item.value))
    return {
      error:
        "Please answer every structured review question before submitting.",
    };
  const comment = String(field("ratingDisputeNotes")?.value || "").trim();
  const commentIssue = reviewCommentViolation(comment);
  if (comment && commentIssue) return { error: commentIssue };
  const flags = Array.from(
    form.querySelectorAll('fieldset input[type="checkbox"]'),
  )
    .map((box) => (box.checked ? box.parentElement.textContent.trim() : null))
    .filter(Boolean);
  const reviewerId = String(profile.userId || profile.email || "").trim();
  const reviewKey = reviewTransactionKey(tx) + "|" + targetType + "|" + mode;
  if (
    trustEntries().some(
      (entry) =>
        String(entry.reviewerUserId || "").trim() === reviewerId &&
        String(entry.reviewTransactionKey || "").trim() === reviewKey,
    )
  ) {
    return { error: "That transaction was already reviewed." };
  }
  const reviewScores = answers.map((item) => item.value);
  const reviewerVerifiedLoads = cleanNumber(
    profile.verifiedLoadsCompleted ||
      profile.completedLoads ||
      profile.verifiedLoadCount ||
      readJSON(storageKeys.plannedTrips, []).length ||
      readJSON(storageKeys.recentLoads, []).length,
  );
  const baseScore = trustScoreFromEntry({
    questionScores: reviewScores,
    flags,
    paymentStatus:
      mode === "driver"
        ? answers.find((q) => q.key === "paymentOnTime")?.valueLabel ||
          answers.find((q) => q.key === "rateHonored")?.valueLabel ||
          ""
        : "",
    quickPay:
      mode === "driver"
        ? answers.find((q) => q.key === "detention")?.valueLabel || ""
        : "",
    comment,
  });
  const publicScore = confidenceAdjustedTrustScore(
    baseScore,
    reviewerVerifiedLoads,
  );
  return {
    entry: {
      id: crypto.randomUUID(),
      name: subject,
      kind: targetType.includes("facility")
        ? "Facility"
        : String(field("ratingTarget")?.value || "Customer").trim(),
      reviewMode: mode,
      reviewQuestions: questions.map((q) => q.label),
      reviewQuestionValues: answers,
      reviewQuestionSummary: reviewQuestionSummary(answers),
      questionScores: reviewScores,
      accuracy: String(reviewScores[0] || ""),
      readiness: String(reviewScores[1] || ""),
      communication: String(reviewScores[2] || ""),
      paymentTrust: String(reviewScores[3] || ""),
      paymentStatus:
        mode === "driver"
          ? answers.find((q) => q.key === "paymentOnTime")?.valueLabel ||
            answers.find((q) => q.key === "rateHonored")?.valueLabel ||
            "Reviewed"
          : "Reviewed",
      quickPay:
        mode === "driver"
          ? answers.find((q) => q.key === "detention")?.valueLabel ||
            "No quick-pay"
          : "No quick-pay",
      flags,
      notes: comment,
      score: baseScore,
      publicScore,
      confidenceLabel: trustConfidenceLabel(reviewerVerifiedLoads),
      confidenceWeight: trustConfidenceMultiplier(reviewerVerifiedLoads),
      reviewTransactionId: tx.id,
      reviewTransactionKey: reviewKey,
      reviewTransactionType: targetType,
      reviewTransactionLabel: reviewTransactionLabel(tx),
      verifiedCompletedAt: tx.completedAt,
      reviewerUserId: reviewerId,
      reviewerVerifiedLoads,
      createdAt: new Date().toISOString(),
    },
  };
}

function promotionDisclosure(profile = getProfile()) {
  return String(
    profile.promotionLabel || profile.sponsoredLabel || profile.sponsored || "",
  ).trim()
    ? `Sponsored promotion is labeled Sponsored and never changes Trust Score.`
    : "Sponsored promotion is available separately and never changes Trust Score.";
}
function trustDisputes() {
  return readJSON(storageKeys.trustDisputes, []);
}
function saveTrustDisputes(disputes) {
  writeJSON(storageKeys.trustDisputes, disputes.slice(0, 24));
  scheduleAccountSync();
}
function trustAuditTrail() {
  return readJSON(storageKeys.trustAudit, []);
}
function saveTrustAuditTrail(entries) {
  writeJSON(storageKeys.trustAudit, entries.slice(0, 120));
  scheduleAccountSync();
}
function trustFingerprint(profile = getProfile()) {
  const bits = [
    navigator.userAgent,
    navigator.platform,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    profile.email || "",
    profile.company || "",
    profile.mc_dot || "",
    profile.paymentMethod || "",
    profile.phone || "",
  ];
  return btoa(bits.join("|")).replace(/=+$/, "").slice(0, 48);
}
function fraudSignalMatches(profile = getProfile(), peers = leaderboardPeers) {
  const signals = [];
  const mine = {
    email: normalizeRankingText(profile.email),
    company: normalizeRankingText(profile.company),
    mc_dot: normalizeRankingText(profile.mc_dot),
    paymentMethod: normalizeRankingText(profile.paymentMethod),
    fingerprint: trustFingerprint(profile),
  };
  const peerList = Array.isArray(peers) ? peers : [];
  for (const peer of peerList) {
    if (!peer || peer.userId === profile.userId) continue;
    const peerSig = {
      email: normalizeRankingText(peer.email),
      company: normalizeRankingText(peer.company),
      mc_dot: normalizeRankingText(peer.mc_dot),
      paymentMethod: normalizeRankingText(peer.paymentMethod),
      fingerprint: normalizeRankingText(
        peer.deviceFingerprint || peer.clientFingerprint || "",
      ),
    };
    if (mine.email && mine.email === peerSig.email)
      signals.push("Shared email pattern detected");
    if (mine.company && mine.company === peerSig.company)
      signals.push("Shared company pattern detected");
    if (mine.mc_dot && mine.mc_dot === peerSig.mc_dot)
      signals.push("Shared MC/DOT pattern detected");
    if (mine.paymentMethod && mine.paymentMethod === peerSig.paymentMethod)
      signals.push("Shared payment-method pattern detected");
    if (
      mine.fingerprint &&
      peerSig.fingerprint &&
      mine.fingerprint === peerSig.fingerprint
    )
      signals.push("Shared device fingerprint pattern detected");
  }
  return [...new Set(signals)].slice(0, 8);
}
function fraudRiskSummary(profile = getProfile(), peers = leaderboardPeers) {
  const signals = fraudSignalMatches(profile, peers);
  return {
    signals,
    flagged: signals.length > 0,
    summary: signals.length
      ? "Potential duplicate-account or manipulation pattern detected."
      : "No obvious duplicate-account pattern detected.",
  };
}
function auditTrustScoreChange(profile, beforeScore, afterScore, reason = "") {
  const before = Number(beforeScore || 0);
  const after = Number(afterScore || 0);
  if (before === after) return;
  const trail = trustAuditTrail();
  trail.unshift({
    id: crypto.randomUUID(),
    userId: String(profile.userId || profile.email || "").trim(),
    name: profile.name || "Guest",
    before,
    after,
    delta: after - before,
    reason: cleanString(reason, 120),
    createdAt: new Date().toISOString(),
    fraudSignals: fraudSignalMatches(profile, leaderboardPeers),
  });
  saveTrustAuditTrail(trail);
}
function disputeEvidenceOptions() {
  return [
    "Rate confirmation",
    "Bill of lading",
    "Proof of delivery",
    "GPS timestamps",
    "Messages",
    "Photos",
    "Facility check-in records",
  ];
}
function disputeReasonOptions() {
  return [
    "False review",
    "Incorrect late-delivery penalty",
    "Cancellation caused by the other party",
    "Duplicate review",
    "Review unrelated to the load",
    "Harassment or retaliation",
    "Incorrect cargo-claim information",
  ];
}
function renderDisputeTargets() {
  const select = $("#disputeReviewId");
  if (!select) return;
  const entries = trustEntries();
  select.innerHTML = entries.length
    ? [
        '<option value="">Select a review to challenge</option>',
        ...entries.map(
          (entry) =>
            `<option value="${escapeHtml(entry.id || entry.reviewTransactionId || entry.reviewTransactionKey || "")}">${escapeHtml(entry.name || "Unknown")} · ${escapeHtml(entry.kind || "Review")} · ${escapeHtml(entry.reviewMode || "Review")}</option>`,
        ),
      ].join("")
    : '<option value="">No reviews available yet</option>';
  select.disabled = !entries.length;
  select.setAttribute("aria-disabled", String(!entries.length));
}
function renderDisputeList() {
  const box = $("#trustDisputes");
  if (!box) return;
  const items = trustDisputes();
  if (!items.length) {
    box.innerHTML =
      '<div class="empty-state"><h4>No disputes yet</h4><p>If a review is wrong, you can challenge it with supporting documents.</p></div>';
    return;
  }
  box.innerHTML = items
    .slice(0, 6)
    .map(
      (item) =>
        `<article class="mini-item"><strong>${escapeHtml(item.reviewLabel || "Dispute")} · ${escapeHtml(item.status || "Under Review")}</strong><span>${escapeHtml(item.reason || "No reason")} · ${escapeHtml((item.evidence || []).join(" · ") || "No evidence listed")}</span><small>${escapeHtml(item.notes || "No additional notes")}</small></article>`,
    )
    .join("");
}
function buildDisputeEntry(profile, form) {
  const reviewId = String(
    form.querySelector("#disputeReviewId")?.value || "",
  ).trim();
  const review = trustEntries().find(
    (entry) =>
      String(
        entry.id ||
          entry.reviewTransactionId ||
          entry.reviewTransactionKey ||
          "",
      ).trim() === reviewId,
  );
  if (!review) return { error: "Select a review to challenge." };
  const reason = String(
    form.querySelector("#disputeReason")?.value || "",
  ).trim();
  const notes = String(form.querySelector("#disputeNotes")?.value || "").trim();
  const evidence = Array.from(
    form.querySelectorAll("input[data-dispute-evidence]"),
  )
    .filter((box) => box.checked)
    .map((box) => box.parentElement.textContent.trim());
  if (!reason) return { error: "Choose a dispute reason." };
  if (!evidence.length)
    return { error: "Add at least one supporting document." };
  const rec = {
    id: crypto.randomUUID(),
    reviewId: review.id || reviewId,
    reviewLabel: review.name || review.kind || "Review",
    reason,
    evidence,
    notes,
    status: "Under Review",
    createdAt: new Date().toISOString(),
    userId: String(profile.userId || profile.email || "").trim(),
    userName: profile.name || "Guest",
  };
  review.disputeStatus = "Under Review";
  review.disputeReason = reason;
  review.disputeEvidence = evidence;
  review.disputeNotes = notes;
  review.disputeCreatedAt = rec.createdAt;
  review.disputeCreatedBy = rec.userId;
  const entries = trustEntries().map((item) =>
    item.id === review.id ? review : item,
  );
  writeJSON(storageKeys.customerRatings, entries);
  const disputes = trustDisputes();
  disputes.unshift(rec);
  saveTrustDisputes(disputes);
  return { entry: rec, review };
}

function ratingValue(value = "") {
  const n = Number(String(value).trim().split(" ")[0]);
  return Number.isFinite(n) ? n : 0;
}
function trustScoreFromEntry(entry) {
  const scores =
    Array.isArray(entry.questionScores) && entry.questionScores.length
      ? entry.questionScores
          .map((v) => ratingValue(v))
          .filter((n) => Number.isFinite(n) && n > 0)
      : [
          ratingValue(entry.accuracy),
          ratingValue(entry.readiness),
          ratingValue(entry.communication),
          ratingValue(entry.paymentTrust),
        ].filter((n) => Number.isFinite(n) && n > 0);
  const base = scores.length
    ? (scores.reduce((sum, n) => sum + n, 0) / scores.length) * 20
    : 0;
  const flagCount = Array.isArray(entry.flags) ? entry.flags.length : 0;
  const penalty =
    flagCount * 7 +
    (/disputed/i.test(entry.paymentStatus || "")
      ? 12
      : /late|partial/i.test(entry.paymentStatus || "")
        ? 6
        : 0);
  return Math.max(0, Math.min(100, Math.round(base - penalty)));
}
function trustEntries() {
  return readJSON(storageKeys.customerRatings, []);
}
function renderTrustNotes() {
  const box = $("#trustNotes");
  if (!box) return;
  const entries = trustEntries();
  if (!entries.length) {
    box.innerHTML =
      '<div class="empty-state"><h4>No trust notes yet</h4><p>Log structured review answers, scam flags, and optional comments after each job.</p></div>';
    return;
  }
  const disputes = trustDisputes();
  box.innerHTML = entries
    .slice(0, 6)
    .map((entry) => {
      const flags =
        Array.isArray(entry.flags) && entry.flags.length
          ? entry.flags.join(" · ")
          : "No scam flags";
      const summary =
        entry.reviewQuestionSummary || entry.notes || "No optional comment";
      const underReview =
        entry.disputeStatus === "Under Review" ||
        disputes.some(
          (d) => String(d.reviewId || "") === String(entry.id || ""),
        );
      return `<article class="mini-item"><strong>${escapeHtml(entry.name || "Unknown")} · ${escapeHtml(entry.kind || "Customer")}</strong><span>${escapeHtml(entry.reviewMode || "Review")} · Score ${entry.score}/100 · ${escapeHtml(entry.confidenceLabel || "")}${underReview ? " · Under Review" : ""}</span><small>${escapeHtml(summary)} · ${escapeHtml(flags)}</small></article>`;
    })
    .join("");
}

function normalizeRankingText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function parseRankPlace(value = "") {
  const text = String(value || "").trim();
  const match = text.match(/^([^,]+),\s*([A-Z]{2})$/i);
  if (match) return { city: match[1].trim(), state: match[2].toUpperCase() };
  return { city: "", state: "" };
}
function stateRegion(state = "") {
  const map = {
    AL: "South",
    AK: "West",
    AZ: "West",
    AR: "South",
    CA: "West",
    CO: "West",
    CT: "Northeast",
    DE: "Northeast",
    FL: "South",
    GA: "South",
    HI: "West",
    IA: "Midwest",
    ID: "West",
    IL: "Midwest",
    IN: "Midwest",
    KS: "Midwest",
    KY: "South",
    LA: "South",
    MA: "Northeast",
    MD: "Northeast",
    ME: "Northeast",
    MI: "Midwest",
    MN: "Midwest",
    MO: "Midwest",
    MS: "South",
    MT: "West",
    NC: "South",
    ND: "Midwest",
    NE: "Midwest",
    NH: "Northeast",
    NJ: "Northeast",
    NM: "West",
    NV: "West",
    NY: "Northeast",
    OH: "Midwest",
    OK: "South",
    OR: "West",
    PA: "Northeast",
    RI: "Northeast",
    SC: "South",
    SD: "Midwest",
    TN: "South",
    TX: "South",
    UT: "West",
    VA: "South",
    VT: "Northeast",
    WA: "West",
    WI: "Midwest",
    WV: "South",
    WY: "West",
    DC: "Northeast",
  };
  return map[String(state || "").toUpperCase()] || "";
}
function profileRankContext(profile = getProfile()) {
  const candidates = [
    profile.city,
    profile.homeCity,
    profile.baseCity,
    profile.metroArea,
    profile.serviceArea,
    profile.location,
    profile.note,
    Array.isArray(profile.laneAlerts) && profile.laneAlerts[0]?.origin,
    Array.isArray(profile.recentLoads) && profile.recentLoads[0]?.origin,
    Array.isArray(profile.plannedTrips) && profile.plannedTrips[0]?.origin,
  ].filter(Boolean);
  const parsed = parseRankPlace(candidates[0] || "");
  const city = String(profile.city || parsed.city || "").trim();
  const state = String(
    profile.state ||
      parsed.state ||
      parseRankState(String(profile.serviceArea || candidates[0] || "")) ||
      "",
  )
    .trim()
    .toUpperCase();
  const metroArea = String(
    profile.metroArea ||
      profile.serviceArea ||
      (city ? `${city} Area` : "") ||
      "",
  ).trim();
  const region = String(
    profile.region ||
      stateRegion(state) ||
      regionFromText(profile.serviceArea || metroArea || city) ||
      "",
  ).trim();
  const radiusRaw = Number(
    profile.operatingRadiusMiles ||
      profile.radiusMiles ||
      profile.serviceRadiusMiles ||
      extractRadius(profile.serviceArea || profile.note || "") ||
      0,
  );
  const operatingRadiusMiles =
    Number.isFinite(radiusRaw) && radiusRaw > 0 ? Math.round(radiusRaw) : 100;
  const serviceArea = String(
    profile.serviceArea ||
      [
        city && state ? `${city}, ${state}` : city || state || "",
        metroArea && metroArea !== city ? metroArea : "",
        `${operatingRadiusMiles} mile radius`,
      ]
        .filter(Boolean)
        .join(" · "),
  ).trim();
  return { city, metroArea, state, region, operatingRadiusMiles, serviceArea };
}
function parseRankState(text = "") {
  const match = String(text || "").match(
    /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY|DC)\b/i,
  );
  return match ? match[1].toUpperCase() : "";
}
function extractRadius(text = "") {
  const match = String(text || "").match(/(\d{2,4})\s*mile/i);
  return match ? Number(match[1]) : 0;
}
function rankingRoleLabel(profile = getProfile()) {
  const type = String(profile.role || profile.type || "").toLowerCase();
  if (/customer|shipper|pickup/.test(type)) return "Loader";
  if (/broker|fleet/.test(type)) return "Broker";
  if (/hotshot|hot shot/.test(type)) return "Hot Shot Operator";
  if (/reefer/.test(type)) return "Reefer Driver";
  if (/flatbed/.test(type)) return "Flatbed Carrier";
  if (/step deck/.test(type)) return "Step Deck Carrier";
  if (/lowboy|rgn/.test(type)) return "Lowboy Operator";
  if (/conestoga/.test(type)) return "Conestoga Carrier";
  if (/cargo van/.test(type)) return "Cargo Van Carrier";
  if (/box truck/.test(type)) return "Box Truck Carrier";
  if (/power[- ]?only/.test(type)) return "Power Only Operator";
  if (/car carrier|auto transport/.test(type)) return "Car Hauler";
  if (/tanker/.test(type)) return "Tanker Operator";
  if (/dump truck/.test(type)) return "Dump Truck Operator";
  return "Carrier";
}
function normalizeEquipmentLabel(value = "") {
  const text = String(value || "").toLowerCase();
  if (/dry van|van\b/.test(text)) return "Dry van";
  if (/reefer/.test(text)) return "Reefer";
  if (/flatbed/.test(text)) return "Flatbed";
  if (/step deck/.test(text)) return "Step deck";
  if (/lowboy/.test(text)) return "Lowboy";
  if (/rgn/.test(text)) return "RGN";
  if (/conestoga/.test(text)) return "Conestoga";
  if (/power[- ]?only/.test(text)) return "Power only";
  if (/hotshot|hot shot/.test(text)) return "Hot shot";
  if (/box truck|liftgate|ramp/.test(text)) return "Box truck";
  if (/cargo van/.test(text)) return "Cargo van";
  if (/bobtail/.test(text)) return "Bobtail";
  if (/car carrier|auto transport/.test(text)) return "Car hauler";
  if (/tanker/.test(text)) return "Tanker";
  if (/dump truck/.test(text)) return "Dump truck";
  if (/oversize|oversized|specialized|heavy haul/.test(text))
    return "Specialized and oversized freight";
  return "";
}
function rankingEquipmentTypes(profile = getProfile()) {
  const raw = [
    profile.equipmentTypes,
    profile.primaryEquipment,
    profile.equipmentType,
    profile.type,
    profile.role,
    Array.isArray(profile.laneAlerts) && profile.laneAlerts[0]?.equipment,
    Array.isArray(profile.recentLoads) && profile.recentLoads[0]?.equipment,
    Array.isArray(profile.plannedTrips) && profile.plannedTrips[0]?.equipment,
    Array.isArray(profile.recentRequests) &&
      profile.recentRequests[0]?.equipment,
  ]
    .flat(Infinity)
    .filter(Boolean);
  const out = [];
  raw.forEach((value) => {
    String(value)
      .split(/[,/|·]+/)
      .forEach((part) => {
        const label =
          normalizeEquipmentLabel(part) || normalizeEquipmentLabel(value);
        if (label && !out.includes(label)) out.push(label);
      });
  });
  return out.length ? out : [rankingRoleLabel(profile)];
}
function pluralizeRankRole(role = "") {
  if (!role) return "members";
  if (/[^s]$/.test(role)) return `${role}s`;
  return role;
}
function scopeLabelFor(scope, current) {
  if (scope === "city")
    return current.city ? `in ${current.city}` : "in this city";
  if (scope === "metro")
    return current.metroArea ? `in ${current.metroArea}` : "in this metro";
  if (scope === "state")
    return current.state ? `in ${current.state}` : "in this state";
  if (scope === "region")
    return current.region ? `in ${current.region}` : "in this region";
  return current.operatingRadiusMiles
    ? `within ${current.operatingRadiusMiles} miles`
    : "in your radius";
}
function sameRankScope(peer, current, scope) {
  const norm = (v) => normalizeRankingText(v);
  if (scope === "city")
    return (
      norm(peer.city || peer.metroArea || peer.serviceArea) ===
      norm(current.city || current.metroArea || current.serviceArea)
    );
  if (scope === "metro")
    return (
      norm(peer.metroArea || peer.serviceArea || peer.city) ===
      norm(current.metroArea || current.serviceArea || current.city)
    );
  if (scope === "state") return norm(peer.state) === norm(current.state);
  if (scope === "region")
    return (
      norm(peer.region || peer.serviceArea || peer.state) ===
      norm(current.region || current.serviceArea || current.state)
    );
  const peerRadius = Number(peer.operatingRadiusMiles || 0);
  const currentRadius = Number(current.operatingRadiusMiles || 0);
  return (
    Math.abs(peerRadius - currentRadius) <= 50 ||
    norm(peer.state) === norm(current.state)
  );
}
function rankLabelForPlacement(rank, total, role, equipment, scopeLabel) {
  const percent = total ? Math.round((rank / total) * 100) : 100;
  if (total < 2)
    return `Need more verified members ${scopeLabel} to rank locally.`;
  if (rank === 1) return `Number 1 ${equipment} ${role} ${scopeLabel}`;
  if (total >= 20 && percent <= 5)
    return `Top 5% of ${pluralizeRankRole(role)} ${scopeLabel}`;
  if (rank <= 3) return `Number ${rank} ${equipment} ${role} ${scopeLabel}`;
  if (percent <= 10)
    return `Top 10% of ${pluralizeRankRole(role)} ${scopeLabel}`;
  return `Rank #${rank} of ${total} ${pluralizeRankRole(role)} ${scopeLabel}`;
}
function rankingBoard(profile = getProfile()) {
  const summary = americanTruckersTrustScore(profile);
  const current = {
    userId: String(profile.userId || profile.email || "").trim(),
    name: profile.name || "You",
    score: summary.score || 0,
    verifiedLoads: summary.verifiedLoads || 0,
    activeDays: summary.activeDays || 0,
    roleLabel: rankingRoleLabel(profile),
    primaryEquipment: rankingEquipmentTypes(profile)[0] || "Carrier",
    ...profileRankContext(profile),
  };
  const peerList = Array.isArray(leaderboardPeers)
    ? leaderboardPeers.filter(
        (peer) => peer && peer.userId && peer.userId !== current.userId,
      )
    : [];
  const withCurrent = (pool) => {
    const merged = [...pool, current].sort((a, b) => {
      const bs = Number(b.score || 0) - Number(a.score || 0);
      if (bs) return bs;
      const bl = Number(b.verifiedLoads || 0) - Number(a.verifiedLoads || 0);
      if (bl) return bl;
      const bd = Number(b.activeDays || 0) - Number(a.activeDays || 0);
      if (bd) return bd;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    const idx = merged.findIndex((item) => item.userId === current.userId);
    return {
      rank: idx + 1,
      total: merged.length,
      peerCount: merged.length - 1,
      top: merged.slice(0, 5),
    };
  };
  const scopeRank = (scope) =>
    withCurrent(
      peerList.filter(
        (peer) =>
          normalizeRankingText(peer.roleLabel || peer.role || "") ===
            normalizeRankingText(current.roleLabel) &&
          normalizeRankingText(
            peer.primaryEquipment || peer.equipmentTypes?.[0] || "",
          ) === normalizeRankingText(current.primaryEquipment) &&
          sameRankScope(peer, current, scope),
      ),
    );
  const scopes = ["city", "metro", "state", "region", "radius"].map((scope) => {
    const result = scopeRank(scope);
    return {
      scope,
      scopeLabel: scopeLabelFor(scope, current),
      label: rankLabelForPlacement(
        result.rank,
        result.total,
        current.roleLabel,
        current.primaryEquipment,
        scopeLabelFor(scope, current),
      ),
      rank: result.rank,
      total: result.total,
      peerCount: result.peerCount,
      top: result.top,
    };
  });
  const equipmentRanks = rankingEquipmentTypes(profile)
    .slice(0, 6)
    .map((equipment) => {
      const equipmentPeers = peerList.filter(
        (peer) =>
          normalizeRankingText(peer.roleLabel || peer.role || "") ===
            normalizeRankingText(current.roleLabel) &&
          normalizeRankingText(
            peer.primaryEquipment || peer.equipmentTypes?.[0] || "",
          ) === normalizeRankingText(equipment),
      );
      const result = withCurrent(
        equipmentPeers.filter((peer) => sameRankScope(peer, current, "region")),
      );
      const scopeName = scopeLabelFor("region", current);
      return {
        equipment,
        label: rankLabelForPlacement(
          result.rank,
          result.total,
          current.roleLabel,
          equipment,
          scopeName,
        ),
        rank: result.rank,
        total: result.total,
        peerCount: result.peerCount,
      };
    });
  return {
    summary,
    current,
    scopes,
    equipmentRanks,
    location: current,
    scoreExplanation:
      "Trust Score is based on reliability (40%), professionalism (20%), freight safety (20%), experience (10%), and verified partner feedback (10%). History matters, so one good load does not buy a top rank.",
    reputationLevel: trustBand(summary.score),
    confidenceLabel: trustConfidenceLabel(summary.verifiedLoads || 0),
  };
}
function renderPublicProfileCard() {
  const box = $("#profilePublicCard");
  if (!box) return;
  const profile = getProfile();
  const summary = americanTruckersTrustScore(profile);
  const board = rankingBoard(profile);
  const stats = summary.stats || {};
  const score = summary.score || 0;
  const verifiedLoads = summary.verifiedLoads || 0;
  const verifiedMiles = stats.verifiedMiles || 0;
  const verifiedReviews = trustEntries()
    .filter(
      (entry) =>
        String(entry.reviewerUserId || "").trim() ===
          String(profile.userId || profile.email || "").trim() &&
        String(entry.reviewTransactionId || "").trim(),
    )
    .sort(
      (a, b) =>
        (Date.parse(b.createdAt || 0) || 0) -
        (Date.parse(a.createdAt || 0) || 0),
    );
  const repeatPct = Number(
    profile.repeatCustomerPct ||
      profile.repeatCustomersPct ||
      Math.min(100, Number(stats.repeatCustomers || 0) * 4) ||
      0,
  );
  const cancellationPct = Math.max(
    0,
    Math.min(
      100,
      Number(
        profile.cancellationPct ||
          profile.cancellationRatePct ||
          stats.cancellationRatePct ||
          0,
      ),
    ),
  );
  const claimFreePct = Math.max(
    0,
    Math.min(100, Number(profile.claimFreePct || stats.damageFreePct || 96)),
  );
  const bestStreak = Number(
    profile.bestSuccessfulLoadStreak ||
      profile.bestCompletionStreak ||
      Math.max(stats.completionStreak || 0, Math.round(verifiedLoads * 1.2)) ||
      0,
  );
  const memberSince = new Date(
    profile.memberSince ||
      profile.createdAt ||
      profile.emailVerifiedAt ||
      Date.now(),
  ).toLocaleDateString();
  const equipmentTags = rankingEquipmentTypes(profile)
    .map((item) => `<span class="tag">${escapeHtml(item)}</span>`)
    .join("");
  const badgeTags = board.current
    ? (Array.isArray(profile.badgesEarned) ? profile.badgesEarned : []).length
      ? profile.badgesEarned
          .map((item) => `<span class="tag good">${escapeHtml(item)}</span>`)
          .join("")
      : '<span class="tag">No badges yet</span>'
    : '<span class="tag">No badges yet</span>';
  const languageTags =
    profile.showLanguagesSpoken && profile.languagesSpokenLabel
      ? `<span class="profile-tag">Languages spoken: ${escapeHtml(profile.languagesSpokenLabel)}</span>`
      : "";
  const verificationTags = [
    profile.insuranceVerification ||
      profile.insuranceStatus ||
      board.current?.insuranceVerification ||
      "Insurance pending",
    profile.authorityVerification ||
      profile.dotMcStatus ||
      board.current?.authorityVerification ||
      "Authority pending",
  ]
    .map((item) => `<span class="tag">${escapeHtml(String(item))}</span>`)
    .join("");
  const scopeCards = board.scopes
    .map(
      (item) =>
        `<div class="reward ${item.rank === 1 ? "unlocked" : ""}"><strong>${escapeHtml(item.scope === "city" ? "City" : item.scope === "metro" ? "Metro area" : item.scope === "state" ? "State" : item.scope === "region" ? "Region" : "Operating radius")}</strong><span>${escapeHtml(item.label)}</span><small>${item.total > 1 ? `${item.rank} of ${item.total} matching members` : "Need more verified members to rank locally"}</small></div>`,
    )
    .join("");
  const equipmentCards = board.equipmentRanks
    .map(
      (item) =>
        `<div class="reward ${item.rank === 1 ? "unlocked" : ""}"><strong>${escapeHtml(item.equipment)}</strong><span>${escapeHtml(item.label)}</span><small>${item.total > 1 ? `${item.rank} of ${item.total} matching members` : "Need more verified members to rank this equipment"}</small></div>`,
    )
    .join("");
  const metricBars = [
    ["On-time pickup", stats.onTimePickupPct || 0],
    ["On-time delivery", stats.onTimeDeliveryPct || 0],
    ["Claim-free", claimFreePct],
    ["Cancellation", 100 - cancellationPct],
    ["Repeat-customer", repeatPct],
  ]
    .map(
      ([label, value]) =>
        `<label title="${escapeHtml(label)}"><span>${label}</span><span style="width:${Math.max(0, Math.min(100, Number(value) || 0))}%"></span></label>`,
    )
    .join("");
  const reviews = verifiedReviews.length
    ? verifiedReviews
        .slice(0, 4)
        .map(
          (entry) =>
            `<article class="mini-item"><strong>${escapeHtml(entry.name || "Verified review")} · ${escapeHtml(entry.kind || "Partner")}</strong><span>${entry.paymentStatus || "No payment note"} · ${entry.quickPay || "No quick-pay"} · ${trustConfidenceLabel(entry.reviewerVerifiedLoads || entry.verifiedLoads || 0)}</span><small>${escapeHtml(entry.notes || "No notes")}</small></article>`,
        )
        .join("")
    : '<div class="empty-state"><h4>No verified reviews yet</h4><p>Reviews will appear here after a completed verified transaction.</p></div>';
  box.innerHTML = `<div class="card-inset trust-summary"><div class="section-head"><h3>Public profile</h3><span class="tag">${escapeHtml(board.reputationLevel)}</span></div><div class="scorecard trust-scorecard"><div><strong class="score">${score}</strong><span>/ 1000 American Truckers Trust Score</span></div><div class="score-bars">${Object.entries(
    summary.breakdown,
  )
    .map(
      ([label, value]) =>
        `<label title="${escapeHtml(label)}"><span>${label}</span><span style="width:${value}%"></span></label>`,
    )
    .join(
      "",
    )}</div></div><div class="profile-tags">${[`Reputation: ${board.reputationLevel}`, `Verified loads: ${verifiedLoads}`, `Verified miles: ${Number(verifiedMiles || 0).toLocaleString()}`, `Member since: ${memberSince}`, `Service area: ${board.location.serviceArea || "Not set"}`].map((text) => `<span class="profile-tag">${escapeHtml(text)}</span>`).join("")}${languageTags}${equipmentTags}${verificationTags}${badgeTags}</div><div class="trust-rules">${scopeCards}</div><div class="trust-rewards">${equipmentCards}</div><div class="score-bars">${metricBars}</div><div class="mini-list"><h4>Recent verified reviews</h4>${reviews}</div><p class="muted">${board.scoreExplanation} ${promotionDisclosure(profile)}</p></div>`;
}

function performanceWindowStats(profile = getProfile()) {
  const cutoff = Date.now() - 90 * 86400000;
  const recentLoads = verifiedTransactions().filter(
    (tx) =>
      Date.parse(tx.completedAt || tx.createdAt || tx.savedAt || 0) >= cutoff,
  );
  const recentRatings = trustEntries().filter(
    (entry) => Date.parse(entry.createdAt || 0) >= cutoff,
  );
  const recentDisputes = trustDisputes().filter(
    (item) => Date.parse(item.createdAt || 0) >= cutoff,
  );
  return {
    recentLoads: recentLoads.length,
    lifetimeLoads: verifiedTransactions().length,
    recentRatings: recentRatings.length,
    lifetimeRatings: trustEntries().length,
    recentDisputes: recentDisputes.length,
    lifetimeDisputes: trustDisputes().length,
    recentAudit: trustAuditTrail().length,
    lifetimeAudit: trustAuditTrail().length,
    profile,
  };
}

function renderPerformanceWindowSummary() {
  const box = $("#performanceWindowSummary");
  if (!box) return;
  const stats = performanceWindowStats();
  box.innerHTML = `<div class="profile-tags"><span class="profile-tag">90-day loads: ${stats.recentLoads}</span><span class="profile-tag">Lifetime loads: ${stats.lifetimeLoads}</span><span class="profile-tag">90-day reviews: ${stats.recentRatings}</span><span class="profile-tag">Lifetime reviews: ${stats.lifetimeRatings}</span><span class="profile-tag">90-day disputes: ${stats.recentDisputes}</span><span class="profile-tag">Lifetime disputes: ${stats.lifetimeDisputes}</span></div>`;
}
function renderRewardsCenter() {
  const box = $("#rewardsCenter");
  if (!box) return;
  const profile = getProfile();
  const summary = americanTruckersTrustScore(profile);
  const rewards = trustRewardsForProfile(profile, summary);
  const unlocked = rewards.filter((item) => item.unlocked).length;
  box.innerHTML = `<div class="section-head"><h3>Rewards center</h3><span class="tag">${unlocked}/${rewards.length} unlocked</span></div><div class="profile-tags"><span class="profile-tag">Trust score: ${summary.score}</span><span class="profile-tag">Band: ${trustBand(summary.score)}</span><span class="profile-tag">Verified loads: ${summary.verifiedLoads || 0}</span><span class="profile-tag">Active days: ${summary.activeDays || 0}</span></div><div class="trust-rewards">${rewards.map((item) => `<div class="reward ${item.unlocked ? "unlocked" : "locked"}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.threshold)}</span><small>${escapeHtml(item.detail)}</small></div>`).join("")}</div><p class="muted">Rewards unlock from verified work, clean history, and steady performance. No single load dominates the ladder.</p>`;
}
function duplicateAccountSignals(peers = leaderboardPeers) {
  const groups = new Map();
  const add = (key, label, peer) => {
    const token = normalizeRankingText(key);
    if (!token) return;
    const list = groups.get(token) || [];
    list.push(peer);
    groups.set(token, list);
  };
  for (const peer of Array.isArray(peers) ? peers : []) {
    if (!peer) continue;
    add(peer.email, "Email", peer);
    add(peer.company, "Company", peer);
    add(peer.mc_dot, "MC/DOT", peer);
    add(peer.paymentMethod, "Payment", peer);
  }
  return Array.from(groups.entries())
    .filter(([, list]) => list.length > 1)
    .map(([token, list]) => ({
      token,
      count: list.length,
      people: list
        .map((item) => item.name || item.company || item.email || "Unknown")
        .slice(0, 5),
    }))
    .sort((a, b) => b.count - a.count);
}
function renderFraudDashboard() {
  const box = $("#adminFraudDashboard");
  if (!box) return;
  const profile = getProfile();
  const entries = trustEntries();
  const disputes = trustDisputes();
  const audit = trustAuditTrail();
  const suspicious = entries
    .filter(
      (entry) =>
        (Array.isArray(entry.flags) && entry.flags.length) ||
        String(entry.disputeStatus || "").toLowerCase() === "under review" ||
        /dispute|claim/i.test(String(entry.paymentStatus || entry.notes || "")),
    )
    .slice(0, 6);
  const duplicates = duplicateAccountSignals(leaderboardPeers).slice(0, 6);
  const scoreMoves = audit
    .filter((item) => Math.abs(Number(item.delta || 0)) >= 75)
    .slice(0, 6);
  const unresolved = disputes
    .filter(
      (item) => String(item.status || "").toLowerCase() === "under review",
    )
    .slice(0, 6);
  box.innerHTML = `<div class="section-head"><h3>Admin fraud dashboard</h3><span class="tag">${suspicious.length} suspicious reviews</span></div><div class="profile-tags"><span class="profile-tag">Duplicate signals: ${duplicates.length}</span><span class="profile-tag">Under review: ${unresolved.length}</span><span class="profile-tag">Large score moves: ${scoreMoves.length}</span><span class="profile-tag">Total audits: ${audit.length}</span></div><div class="fraud-grid"><article class="card fraud-panel"><h4>Suspicious reviews</h4>${suspicious.length ? suspicious.map((entry) => `<div class="mini-item"><strong>${escapeHtml(entry.name || "Unknown")} · ${escapeHtml(entry.kind || "Review")}</strong><span>${escapeHtml(entry.reviewMode || "Review")} · ${escapeHtml(entry.confidenceLabel || "")}</span><small>${escapeHtml(entry.notes || entry.reviewQuestionSummary || "No notes")} ${entry.disputeStatus ? "· Under review" : ""}</small></div>`).join("") : '<div class="empty-state"><h4>No suspicious reviews</h4><p>Flags and disputes will appear here.</p></div>'}</article><article class="card fraud-panel"><h4>Duplicate accounts</h4>${duplicates.length ? duplicates.map((item) => `<div class="mini-item"><strong>${escapeHtml(item.count + " matching profiles")}</strong><span>${escapeHtml(item.people.join(" · "))}</span><small>${escapeHtml(item.token)}</small></div>`).join("") : '<div class="empty-state"><h4>No duplicate patterns</h4><p>Email, company, MC/DOT, and payment patterns look clean right now.</p></div>'}</article><article class="card fraud-panel"><h4>Score manipulation / manual adjustments</h4>${scoreMoves.length ? scoreMoves.map((item) => `<div class="mini-item"><strong>${escapeHtml(item.name || "Adjustment")}</strong><span>${Number(item.delta || 0) >= 0 ? "+" : ""}${Number(item.delta || 0)} points · ${escapeHtml(item.reason || "No reason")}</span><small>${new Date(item.createdAt || Date.now()).toLocaleString()}</small></div>`).join("") : '<div class="empty-state"><h4>No large score jumps yet</h4><p>Manual adjustment history will show up here.</p></div>'}</article><article class="card fraud-panel"><h4>Claims and disputes</h4>${unresolved.length ? unresolved.map((item) => `<div class="mini-item"><strong>${escapeHtml(item.reviewLabel || item.reason || "Dispute")}</strong><span>${escapeHtml(item.status || "Under Review")}</span><small>${escapeHtml((item.evidence || []).join(" · ") || "No evidence listed")}</small></div>`).join("") : '<div class="empty-state"><h4>No unresolved disputes</h4><p>Claims and challenge records will appear here.</p></div>'}</article></div><p class="muted">Profile watched: ${escapeHtml(profile.name || "Guest")}. Manual adjustments stay audit logged and every score change should trace back to a verified event.</p>`;
}

function reviewTargetRole(targetType = "shipper") {
  const text = String(targetType || "").toLowerCase();
  if (text.includes("broker")) return "broker";
  if (text.includes("dispatcher")) return "dispatcher";
  if (text.includes("loader")) return "loader";
  if (text.includes("owner-operator")) return "owner-operator";
  if (text.includes("carrier")) return "carrier";
  if (text.includes("driver")) return "driver";
  if (text.includes("warehouse") || text.includes("facility"))
    return "facility";
  if (
    text.includes("customer") ||
    text.includes("shipper") ||
    text.includes("pickup")
  )
    return "shipper";
  return "driver";
}

const roleReviewQuestionCatalog = {
  driver: [
    {
      key: "onTime",
      label: "Did the driver arrive on time?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "A little late" },
        { value: 1, label: "Very late / no-show" },
      ],
    },
    {
      key: "communication",
      label: "Did the driver communicate clearly?",
      options: [
        { value: 5, label: "Very clear" },
        { value: 3, label: "Mostly clear" },
        { value: 1, label: "Not clear" },
      ],
    },
    {
      key: "equipment",
      label: "Was the equipment appropriate?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "paperwork",
      label: "Was the paperwork handled correctly?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "care",
      label: "Was the freight handled carefully?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Minor issue" },
        { value: 1, label: "Damage risk" },
      ],
    },
    {
      key: "rehire",
      label: "Would you work with them again?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Maybe" },
        { value: 1, label: "No" },
      ],
    },
  ],
  carrier: [
    {
      key: "coverage",
      label: "Was the load covered as promised?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "dispatch",
      label: "Did dispatch stay on top of updates?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "safety",
      label: "Was the freight moved safely?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Minor issue" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "paperwork",
      label: "Was paperwork accurate and fast?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "payment",
      label: "Did payment flow correctly?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Delayed" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "rehire",
      label: "Would you cover for them again?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Maybe" },
        { value: 1, label: "No" },
      ],
    },
  ],
  "owner-operator": [
    {
      key: "onTime",
      label: "Was the owner-operator on time?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Close" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "communication",
      label: "Did they communicate clearly?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "equipment",
      label: "Was the equipment matched correctly?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "care",
      label: "Was the freight protected well?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Some risk" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "claimFree",
      label: "Was the load claim-free?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Minor issue" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "rehire",
      label: "Would you hire them again?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Maybe" },
        { value: 1, label: "No" },
      ],
    },
  ],
  broker: [
    {
      key: "loadDetails",
      label: "Were load details accurate?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "rateTransparency",
      label: "Was rate transparency clear?",
      options: [
        { value: 5, label: "Clear" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "paymentHistory",
      label: "Did payment history match the promise?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Late" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "communication",
      label: "Did communication stay consistent?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "detention",
      label: "Was detention handled fairly?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "rateHonored",
      label: "Was the agreed rate honored?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Partly" },
        { value: 1, label: "No" },
      ],
    },
  ],
  shipper: [
    {
      key: "waitTime",
      label: "Was the wait time reasonable?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Long" },
        { value: 1, label: "Very long" },
      ],
    },
    {
      key: "driverTreatment",
      label: "Did they treat drivers well?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "parking",
      label: "Was parking adequate?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Limited" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "restrooms",
      label: "Were restrooms available?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Limited" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "appointment",
      label: "Were appointments accurate?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Some issues" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "detention",
      label: "Was detention handled fairly?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Delayed" },
        { value: 1, label: "No" },
      ],
    },
  ],
  customer: [
    {
      key: "waitTime",
      label: "Was the wait time reasonable?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Long" },
        { value: 1, label: "Very long" },
      ],
    },
    {
      key: "communication",
      label: "Did they communicate clearly?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "parking",
      label: "Was parking adequate?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Limited" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "restrooms",
      label: "Were restrooms available?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Limited" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "appointment",
      label: "Was the appointment accurate?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Some issues" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "detention",
      label: "Was detention handled fairly?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Delayed" },
        { value: 1, label: "No" },
      ],
    },
  ],
  dispatcher: [
    {
      key: "assignment",
      label: "Were assignments accurate?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "response",
      label: "Did dispatch respond quickly?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "communication",
      label: "Was communication clear?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "equipment",
      label: "Did they match equipment well?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "issueResolution",
      label: "Were issues resolved well?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Some issues" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "rehire",
      label: "Would you work with them again?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Maybe" },
        { value: 1, label: "No" },
      ],
    },
  ],
  loader: [
    {
      key: "loadingAccuracy",
      label: "Was loading accurate?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "cargoHandling",
      label: "Was cargo handled carefully?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Some risk" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "loadingTime",
      label: "Was loading time efficient?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Average" },
        { value: 1, label: "Slow" },
      ],
    },
    {
      key: "communication",
      label: "Was communication clear?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "securement",
      label: "Was securement cooperation good?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "damagePrevention",
      label: "Was damage prevented?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Some risk" },
        { value: 1, label: "No" },
      ],
    },
  ],
  facility: [
    {
      key: "dockFlow",
      label: "Was dock flow efficient?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Average" },
        { value: 1, label: "Slow" },
      ],
    },
    {
      key: "access",
      label: "Was facility access easy?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Moderate" },
        { value: 1, label: "Hard" },
      ],
    },
    {
      key: "waitTime",
      label: "Was wait time reasonable?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Long" },
        { value: 1, label: "Very long" },
      ],
    },
    {
      key: "treatment",
      label: "Were drivers treated well?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Mostly" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "parking",
      label: "Was parking adequate?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Limited" },
        { value: 1, label: "No" },
      ],
    },
    {
      key: "restrooms",
      label: "Were restrooms available?",
      options: [
        { value: 5, label: "Yes" },
        { value: 3, label: "Limited" },
        { value: 1, label: "No" },
      ],
    },
  ],
};

const roleScorecardCatalog = {
  driver: {
    label: "Drivers",
    summary: "Time, communication, equipment fit, care, and repeatability.",
    criteria: [
      "On-time pickup and delivery",
      "Clear communication and updates",
      "Correct equipment and paperwork",
      "Claim-free handling and damage prevention",
      "Repeat customer history",
    ],
  },
  carrier: {
    label: "Carriers",
    summary:
      "Coverage reliability, fleet coordination, safety, and honoring the deal.",
    criteria: [
      "Load coverage as promised",
      "Dispatch accuracy",
      "Payment history",
      "Safety and claim-free record",
      "Repeat-business history",
    ],
  },
  "owner-operator": {
    label: "Owner-operators",
    summary: "Independence, equipment match, freight care, and reliability.",
    criteria: [
      "On-time performance",
      "Communication quality",
      "Equipment fit",
      "Freight protection",
      "No-claim record",
    ],
  },
  broker: {
    label: "Brokers",
    summary:
      "Load accuracy, rate transparency, payment history, detention handling, and honoring the rate.",
    criteria: [
      "Accurate load details",
      "Rate transparency",
      "Payment history",
      "Communication",
      "Detention handling",
      "Agreed rate honored",
    ],
  },
  shipper: {
    label: "Shippers",
    summary:
      "Wait time, treatment of drivers, parking, restrooms, appointments, and detention.",
    criteria: [
      "Wait time",
      "Treatment of drivers",
      "Parking",
      "Restrooms",
      "Appointment accuracy",
      "Detention practices",
    ],
  },
  customer: {
    label: "Customers",
    summary:
      "Appointment accuracy, communication, access, and respect for drivers.",
    criteria: [
      "Wait time",
      "Communication",
      "Parking and access",
      "Restrooms",
      "Appointment accuracy",
      "Detention handling",
    ],
  },
  dispatcher: {
    label: "Dispatchers",
    summary:
      "Assignment accuracy, response speed, equipment matching, and issue resolution.",
    criteria: [
      "Assignment accuracy",
      "Response speed",
      "Communication",
      "Equipment matching",
      "Issue resolution",
      "Follow-through",
    ],
  },
  loader: {
    label: "Loaders",
    summary:
      "Loading accuracy, cargo handling, loading time, communication, securement, and damage prevention.",
    criteria: [
      "Loading accuracy",
      "Cargo handling",
      "Loading time",
      "Communication",
      "Securement cooperation",
      "Damage prevention",
    ],
  },
  facility: {
    label: "Warehouses and facilities",
    summary:
      "Dock flow, access, wait time, driver treatment, parking, restrooms, and appointment control.",
    criteria: [
      "Dock flow",
      "Access",
      "Wait time",
      "Driver treatment",
      "Parking",
      "Restrooms",
    ],
  },
};

function renderRoleScorecards() {
  const boxes = document.querySelectorAll("[data-role-scorecards]");
  if (!boxes.length) return;
  const active = reviewTargetRole(
    $("#reviewTargetType")?.value || getProfile().type || "driver",
  );
  const markup = Object.entries(roleScorecardCatalog)
    .map(
      ([key, item]) =>
        `<article class="mini-item ${key === active ? "active" : ""}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.summary)}</span><small>${escapeHtml(item.criteria.join(" · "))}</small></article>`,
    )
    .join("");
  boxes.forEach((box) => {
    box.innerHTML = markup;
  });
}

function leaderboardFilterState() {
  return {
    query: String($("#leaderboardSearch")?.value || "")
      .trim()
      .toLowerCase(),
    equipment: String($("#leaderboardEquipment")?.value || "")
      .trim()
      .toLowerCase(),
    role: String($("#leaderboardRole")?.value || "")
      .trim()
      .toLowerCase(),
    availability: String($("#leaderboardAvailability")?.value || "")
      .trim()
      .toLowerCase(),
    experience: String($("#leaderboardExperience")?.value || "")
      .trim()
      .toLowerCase(),
    sort: String($("#leaderboardSort")?.value || "balanced")
      .trim()
      .toLowerCase(),
  };
}

function leaderboardAvailabilityLabel(peer = {}) {
  if ((peer.verifiedLoads || 0) < 25) return "new";
  const recent = peer.performance90Days?.verifiedLoads || 0;
  if (recent >= 5) return "open";
  if (recent >= 1) return "limited";
  return peer.availabilityStatus || "open";
}

function leaderboardExperienceLabel(peer = {}) {
  const loads = Number(peer.verifiedLoads || 0);
  if (loads < 10) return "new";
  if (loads < 25) return "rising";
  if (loads < 100) return "experienced";
  return "elite";
}

function leaderboardApproxDistance(peer = {}, current = {}) {
  if (!peer || !current) return 9999;
  const cityMatch =
    normalizeRankingText(peer.city || peer.metroArea) ===
    normalizeRankingText(current.city || current.metroArea);
  if (cityMatch) return 0;
  const stateMatch =
    normalizeRankingText(peer.state) === normalizeRankingText(current.state);
  if (stateMatch) return 150;
  const regionMatch =
    normalizeRankingText(peer.region) === normalizeRankingText(current.region);
  if (regionMatch) return 500;
  return 1200;
}

function leaderboardBalancedScore(peer = {}, current = {}, filters = {}) {
  const trust = Number(peer.score || 0) / 10;
  const loads = Math.min(100, Math.log10((peer.verifiedLoads || 0) + 1) * 32);
  const onTime = Math.max(
    0,
    Math.min(
      100,
      ((peer.onTimePickupPct || 0) + (peer.onTimeDeliveryPct || 0)) / 2,
    ),
  );
  const claimFree = Math.max(0, Math.min(100, Number(peer.claimFreePct || 0)));
  const repeat = Math.max(
    0,
    Math.min(100, Number(peer.repeatCustomerPct || 0)),
  );
  const badges =
    (Array.isArray(peer.badgesEarned) ? peer.badgesEarned : []).length * 4;
  const equipment =
    filters.equipment &&
    normalizeRankingText((peer.equipmentTypes || []).join(" ")).includes(
      filters.equipment,
    )
      ? 18
      : 8;
  const distance = 120 - leaderboardApproxDistance(peer, current) / 20;
  const availability =
    leaderboardAvailabilityLabel(peer) ===
    (filters.availability || leaderboardAvailabilityLabel(peer))
      ? 16
      : leaderboardAvailabilityLabel(peer) === "new"
        ? 12
        : 8;
  const recent = Math.max(
    0,
    Math.min(
      100,
      (peer.performance90Days?.verifiedLoads || 0) * 8 +
        (peer.performance90Days?.reviewAverage || peer.reviewAverage || 0) * 10,
    ),
  );
  const fairness = (peer.verifiedLoads || 0) < 25 ? 15 : 0;
  return Math.round(
    trust * 0.28 +
      loads * 0.14 +
      onTime * 0.12 +
      claimFree * 0.08 +
      repeat * 0.08 +
      equipment * 0.12 +
      distance * 0.08 +
      availability * 0.05 +
      recent * 0.05 +
      badges * 0.03 +
      fairness,
  );
}

function renderLeaderboardBrowser() {
  const box = $("#leaderboardResults");
  const rising = $("#risingProfessionals");
  const statsBox = $("#leaderboardStats");
  if (!box && !rising && !statsBox) return;
  const profile = getProfile();
  const current = rankingBoard(profile).current;
  const filters = leaderboardFilterState();
  const peers = (
    Array.isArray(leaderboardPeers) ? leaderboardPeers : []
  ).filter((peer) => {
    if (!peer) return false;
    const text = [
      peer.name,
      peer.company,
      peer.city,
      peer.metroArea,
      peer.state,
      peer.region,
      (peer.equipmentTypes || []).join(" "),
      (peer.badgesEarned || []).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    if (filters.query && !text.includes(filters.query)) return false;
    if (
      filters.equipment &&
      !normalizeRankingText((peer.equipmentTypes || []).join(" ")).includes(
        filters.equipment,
      )
    )
      return false;
    if (
      filters.role &&
      normalizeRankingText(peer.roleLabel || peer.role || "") !==
        normalizeRankingText(filters.role)
    )
      return false;
    if (
      filters.availability &&
      leaderboardAvailabilityLabel(peer) !== filters.availability
    )
      return false;
    if (
      filters.experience &&
      leaderboardExperienceLabel(peer) !== filters.experience
    )
      return false;
    return true;
  });
  const sorted = [...peers].sort((a, b) => {
    const aDistance = leaderboardApproxDistance(a, current);
    const bDistance = leaderboardApproxDistance(b, current);
    switch (filters.sort) {
      case "trust":
        return (
          (b.score || 0) - (a.score || 0) ||
          (b.verifiedLoads || 0) - (a.verifiedLoads || 0)
        );
      case "loads":
        return (
          (b.verifiedLoads || 0) - (a.verifiedLoads || 0) ||
          (b.score || 0) - (a.score || 0)
        );
      case "on-time":
        return (
          ((b.onTimePickupPct || 0) + (b.onTimeDeliveryPct || 0)) / 2 -
            ((a.onTimePickupPct || 0) + (a.onTimeDeliveryPct || 0)) / 2 ||
          (b.score || 0) - (a.score || 0)
        );
      case "distance":
        return aDistance - bDistance || (b.score || 0) - (a.score || 0);
      case "equipment":
        return (
          String(a.primaryEquipment || "").length -
            String(b.primaryEquipment || "").length ||
          (b.score || 0) - (a.score || 0)
        );
      case "availability":
        return (
          (leaderboardAvailabilityLabel(b) === "open"
            ? 2
            : leaderboardAvailabilityLabel(b) === "limited"
              ? 1
              : 0) -
            (leaderboardAvailabilityLabel(a) === "open"
              ? 2
              : leaderboardAvailabilityLabel(a) === "limited"
                ? 1
                : 0) || (b.score || 0) - (a.score || 0)
        );
      case "claim-free":
        return (b.claimFreePct || 0) - (a.claimFreePct || 0);
      case "repeat":
        return (b.repeatCustomerPct || 0) - (a.repeatCustomerPct || 0);
      case "experience":
        return (
          (b.verifiedLoads || 0) - (a.verifiedLoads || 0) ||
          (b.reviewCount || 0) - (a.reviewCount || 0)
        );
      case "badges":
        return (
          (Array.isArray(b.badgesEarned) ? b.badgesEarned.length : 0) -
            (Array.isArray(a.badgesEarned) ? a.badgesEarned.length : 0) ||
          (b.score || 0) - (a.score || 0)
        );
      case "price":
        return (
          (Number(a.priceTarget || a.rateTarget || a.targetRate || 999999) ||
            999999) -
          (Number(b.priceTarget || b.rateTarget || b.targetRate || 999999) ||
            999999)
        );
      default:
        return (
          leaderboardBalancedScore(b, current, filters) -
          leaderboardBalancedScore(a, current, filters)
        );
    }
  });
  const risingList = sorted
    .filter(
      (peer) =>
        (peer.verifiedLoads || 0) < 25 &&
        leaderboardBalancedScore(peer, current, filters) >= 55,
    )
    .slice(0, 6);
  if (statsBox)
    statsBox.innerHTML =
      '<span class="profile-tag">Showing ' +
      sorted.length +
      ' profiles</span><span class="profile-tag">Balanced ranking</span><span class="profile-tag">Rising professionals: ' +
      risingList.length +
      "</span>";
  if (box)
    box.innerHTML = sorted
      .slice(0, 12)
      .map((peer) => {
        const badges = (
          Array.isArray(peer.badgesEarned) ? peer.badgesEarned : []
        )
          .slice(0, 4)
          .map((tag) => '<span class="tag good">' + escapeHtml(tag) + "</span>")
          .join("");
        return (
          '<article class="mini-item"><strong>' +
          escapeHtml(peer.name || "Unknown") +
          " · " +
          escapeHtml(peer.roleLabel || peer.role || "Carrier") +
          "</strong><span>Trust " +
          (peer.score || 0) +
          "/1000 · Loads " +
          (peer.verifiedLoads || 0) +
          " · 90d " +
          (peer.performance90Days?.verifiedLoads || 0) +
          " loads · " +
          leaderboardExperienceLabel(peer) +
          " · " +
          leaderboardAvailabilityLabel(peer) +
          "</span><small>" +
          escapeHtml(
            peer.city || peer.metroArea || peer.state || "Location not set",
          ) +
          " · " +
          escapeHtml(
            (peer.equipmentTypes || []).join(" · ") || "Equipment not set",
          ) +
          '</small><div class="chips">' +
          badges +
          "</div></article>"
        );
      })
      .join("");
  if (rising)
    rising.innerHTML =
      '<div class="section-head"><h4>Rising professionals</h4><span class="tag">Fair opportunity</span></div>' +
      (risingList.length
        ? risingList
            .map(
              (peer) =>
                '<article class="mini-item"><strong>' +
                escapeHtml(peer.name || "Unknown") +
                " · " +
                escapeHtml(peer.roleLabel || peer.role || "Carrier") +
                "</strong><span>Trust " +
                (peer.score || 0) +
                "/1000 · Loads " +
                (peer.verifiedLoads || 0) +
                " · " +
                leaderboardExperienceLabel(peer) +
                "</span><small>" +
                escapeHtml(
                  peer.city ||
                    peer.metroArea ||
                    peer.state ||
                    "Location not set",
                ) +
                " · " +
                escapeHtml(
                  (peer.equipmentTypes || []).join(" · ") ||
                    "Equipment not set",
                ) +
                "</small></article>",
            )
            .join("")
        : '<div class="empty-state"><h4>No rising professionals match yet</h4><p>Try widening your search to see newer verified users who are performing well.</p></div>');
  $$(
    "#leaderboardSearch,#leaderboardEquipment,#leaderboardRole,#leaderboardAvailability,#leaderboardExperience,#leaderboardSort",
  ).forEach((el) => {
    if (el && !el.__leaderboardBound) {
      el.__leaderboardBound = true;
      el.addEventListener("input", renderLeaderboardBrowser);
      el.addEventListener("change", renderLeaderboardBrowser);
    }
  });
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const storageKeys = {
  profile: "rm_profile",
  recentLoads: "rm_recent_loads",
  recentRequests: "rm_recent_requests",
  requestBids: "rm_request_bids",
  messages: "rm_messages",
  bulletinBoard: "rm_bulletin_board",
  plannedTrips: "rm_planned_trips",
  activePickups: "rm_active_pickups",
  verifiedTransactions: "rm_verified_transactions",
  laneAlerts: "laneAlerts",
  customerRatings: "rm_customer_ratings",
  trustDisputes: "rm_trust_disputes",
  trustAudit: "rm_trust_audit",
  notifications: "rm_notifications",
  carrierVerification: "rm_carrier_verification",
  partnerReports: "rm_partner_reports",
  favoriteLoads: "rm_favorite_loads",
  savedLoadSearches: "rm_saved_load_searches",
  checkoutPlan: "rm_checkout_plan",
  profileView: "rm_profile_view",
};
let accountSyncTimer = 0;
let accountBootstrapped = false;
let authCsrfToken = "";
let leaderboardPeers = [];
let leaderboardLoaded = false;
let carrierVerificationState = { query: "", selectedKey: "", loadId: "" };
function money(n) {
  return "$" + n.toLocaleString();
}
function rpm(l) {
  return l.rate / l.mi;
}
function autoTransportModeLabel(v = "") {
  return String(v || "").trim() || "Auto transport";
}
function parseMoney(value = "") {
  const n = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function parseWeight(value = "") {
  const n = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function normalizeStateToken(value = "") {
  const v = String(value || "")
    .trim()
    .toUpperCase();
  if (!v) return "";
  const stateMap = {
    AL: "AL",
    ALABAMA: "AL",
    AK: "AK",
    ALASKA: "AK",
    AZ: "AZ",
    ARIZONA: "AZ",
    AR: "AR",
    ARKANSAS: "AR",
    CA: "CA",
    CALIFORNIA: "CA",
    CO: "CO",
    COLORADO: "CO",
    CT: "CT",
    CONNECTICUT: "CT",
    DE: "DE",
    DELAWARE: "DE",
    DC: "DC",
    "DISTRICT OF COLUMBIA": "DC",
    FL: "FL",
    FLORIDA: "FL",
    GA: "GA",
    GEORGIA: "GA",
    HI: "HI",
    HAWAII: "HI",
    ID: "ID",
    IDAHO: "ID",
    IL: "IL",
    ILLINOIS: "IL",
    IN: "IN",
    INDIANA: "IN",
    IA: "IA",
    IOWA: "IA",
    KS: "KS",
    KANSAS: "KS",
    KY: "KY",
    KENTUCKY: "KY",
    LA: "LA",
    LOUISIANA: "LA",
    ME: "ME",
    MAINE: "ME",
    MD: "MD",
    MARYLAND: "MD",
    MA: "MA",
    MASSACHUSETTS: "MA",
    MI: "MI",
    MICHIGAN: "MI",
    MN: "MN",
    MINNESOTA: "MN",
    MS: "MS",
    MISSISSIPPI: "MS",
    MO: "MO",
    MISSOURI: "MO",
    MT: "MT",
    MONTANA: "MT",
    NE: "NE",
    NEBRASKA: "NE",
    NV: "NV",
    NEVADA: "NV",
    NH: "NH",
    "NEW HAMPSHIRE": "NH",
    NJ: "NJ",
    "NEW JERSEY": "NJ",
    NM: "NM",
    "NEW MEXICO": "NM",
    NY: "NY",
    "NEW YORK": "NY",
    NC: "NC",
    "NORTH CAROLINA": "NC",
    ND: "ND",
    "NORTH DAKOTA": "ND",
    OH: "OH",
    OHIO: "OH",
    OK: "OK",
    OKLAHOMA: "OK",
    OR: "OR",
    OREGON: "OR",
    PA: "PA",
    PENNSYLVANIA: "PA",
    RI: "RI",
    "RHODE ISLAND": "RI",
    SC: "SC",
    "SOUTH CAROLINA": "SC",
    SD: "SD",
    "SOUTH DAKOTA": "SD",
    TN: "TN",
    TENNESSEE: "TN",
    TX: "TX",
    TEXAS: "TX",
    UT: "UT",
    UTAH: "UT",
    VT: "VT",
    VERMONT: "VT",
    VA: "VA",
    VIRGINIA: "VA",
    WA: "WA",
    WASHINGTON: "WA",
    WV: "WV",
    "WEST VIRGINIA": "WV",
    WI: "WI",
    WISCONSIN: "WI",
    WY: "WY",
    WYOMING: "WY",
  };
  return stateMap[v] || "";
}
function inferStateFromLocation(location = "") {
  const raw = String(location || "").trim();
  if (!raw) return "";
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const state = normalizeStateToken(last);
    if (state) return state;
  }
  return normalizeStateToken(raw);
}
function suggestedDieselPriceForLocation(location = "") {
  const state = inferStateFromLocation(location);
  const prices = {
    CA: 5.19,
    WA: 5.05,
    OR: 4.93,
    NV: 4.78,
    AZ: 4.38,
    UT: 4.26,
    CO: 4.12,
    ID: 4.22,
    MT: 4.31,
    WY: 4.17,
    AK: 4.72,
    HI: 5.31,
    TX: 3.84,
    OK: 3.88,
    LA: 3.92,
    AR: 3.98,
    MS: 4.01,
    AL: 4.03,
    GA: 4.06,
    FL: 4.11,
    SC: 4.04,
    NC: 4.08,
    TN: 4.09,
    KY: 4.07,
    VA: 4.1,
    WV: 4.18,
    OH: 4.16,
    MI: 4.22,
    IN: 4.13,
    IL: 4.19,
    WI: 4.18,
    MN: 4.24,
    IA: 4.06,
    MO: 4.05,
    KS: 4.02,
    NE: 4.04,
    SD: 4.09,
    ND: 4.11,
    PA: 4.26,
    NY: 4.39,
    NJ: 4.35,
    CT: 4.31,
    RI: 4.29,
    MA: 4.33,
    VT: 4.24,
    NH: 4.18,
    ME: 4.27,
    MD: 4.19,
    DE: 4.14,
    DC: 4.21,
  };
  if (state && prices[state]) return prices[state];
  const lower = String(location || "").toLowerCase();
  if (
    /new york|newark|philly|philadelphia|pennsylvania|nj|connecticut|massachusetts|rhode island|maine|vermont|new hampshire/.test(
      lower,
    )
  )
    return 4.31;
  if (
    /california|los angeles|san diego|bay area|sacramento|fresno|oakland|san francisco/.test(
      lower,
    )
  )
    return 5.19;
  if (/texas|houston|dallas|austin|san antonio|fort worth/.test(lower))
    return 3.84;
  if (/florida|miami|orlando|tampa|jacksonville|fort lauderdale/.test(lower))
    return 4.11;
  if (/georgia|atlanta|savannah|macon/.test(lower)) return 4.06;
  if (/illinois|chicago/.test(lower)) return 4.19;
  if (/ohio|cleveland|columbus|cincinnati/.test(lower)) return 4.16;
  return 4.12;
}
function baseMpgForEquipment(equipment = "") {
  const text = String(equipment).toLowerCase();
  if (text.includes("cargo van")) return 18.5;
  if (text.includes("box truck with liftgate")) return 12.8;
  if (text.includes("box truck with ramp")) return 13.2;
  if (text.includes("box truck")) return 13.5;
  if (text.includes("truck + trailer") || text.includes("hotshot")) return 10.2;
  if (text.includes("car carrier") || text.includes("auto transport"))
    return 8.6;
  if (text.includes("reefer")) return 6.2;
  if (text.includes("flatbed")) return 6.7;
  if (text.includes("lowboy") || text.includes("rgn")) return 5.4;
  if (text.includes("conestoga")) return 6.0;
  if (text.includes("power only")) return 7.5;
  return 8.5;
}
function weightFactorForLoad(weight = 0) {
  if (weight <= 0) return 1;
  if (weight <= 2000) return 1.15;
  if (weight <= 5000) return 1.08;
  if (weight <= 10000) return 1;
  if (weight <= 20000) return 0.9;
  if (weight <= 40000) return 0.8;
  return 0.7;
}
function estimateMpg(equipment = "", weight = 0) {
  return Math.max(
    4,
    +(baseMpgForEquipment(equipment) * weightFactorForLoad(weight)).toFixed(1),
  );
}
function estimateFuelCostPerMile(equipment = "", weight = 0, dieselPrice = 0) {
  const mpg = estimateMpg(equipment, weight);
  return mpg > 0 ? +(dieselPrice / mpg).toFixed(2) : 0;
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => t.classList.remove("show"), 3300);
}
function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "") ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function getProfile() {
  return Object.assign(
    {
      userId: "",
      name: "Guest",
      company: "",
      email: "",
      type: "Customer / shipper (post loads, no claiming) - $9.99/mo",
      truckCount: 0,
      mc_dot: "",
      verification: "Not verified",
      emailVerifiedAt: "",
      subscriptionStatus: "unpaid",
      subscriptionAccess: "claim",
      subscriptionCurrentPeriodEnd: "",
      subscriptionGraceUntil: "",
      subscriptionCancelAtPeriodEnd: false,
      subscriptionTrialAllowed: false,
      accessRoute: "",
      dotMcStatus: "Pending",
      idCheckStatus: "Pending",
      insuranceStatus: "Pending",
      customerBrokerStatus: "Pending",
      adminApproval: "Pending",
      paymentStatus: "unpaid_waitlist",
      loadAccess: "claim",
      planLabel: "",
      tags: [],
      memberAccess: {
        authenticated: false,
        emailVerified: false,
        subscriptionStatus: "unpaid",
        entitled: false,
      },
      note: "Set up your account to keep your own loads, requests, and future trucking plans in one place.",
    },
    readJSON(storageKeys.profile, {}),
  );
}
function accountSnapshot() {
  const profile = getProfile();
  return {
    profile,
    recentLoads: readJSON(storageKeys.recentLoads, []),
    recentRequests: readJSON(storageKeys.recentRequests, []),
    requestBids: readJSON(storageKeys.requestBids, {}),
    messages: readJSON(storageKeys.messages, []),
    plannedTrips: readJSON(storageKeys.plannedTrips, []),
    activePickups: readJSON(storageKeys.activePickups, []),
    verifiedTransactions: readJSON(storageKeys.verifiedTransactions, []),
    laneAlerts: readJSON(storageKeys.laneAlerts, []),
    customerRatings: readJSON(storageKeys.customerRatings, []),
    trustDisputes: readJSON(storageKeys.trustDisputes, []),
    trustAudit: readJSON(storageKeys.trustAudit, []),
    notifications: readJSON(storageKeys.notifications, []),
    carrierVerification: readJSON(storageKeys.carrierVerification, {
      checklists: {},
      savedRecords: [],
      reports: [],
    }),
    checkoutPlan: readJSON(storageKeys.checkoutPlan, ""),
    profileView: readJSON(storageKeys.profileView, "driver"),
    tags: Array.isArray(profile.tags) ? profile.tags : [],
  };
}
function mergeAccountState(data) {
  if (!data) return;
  const profile = readJSON(storageKeys.profile, {});
  if (data.profile)
    writeJSON(
      storageKeys.profile,
      Object.assign(profile, data.profile, {
        tags: Array.isArray(data.tags)
          ? data.tags
          : Array.isArray(data.profile.tags)
            ? data.profile.tags
            : profile.tags || [],
        memberAccess: data.memberAccess || profile.memberAccess || null,
        subscriptionStatus:
          data.memberAccess?.subscriptionStatus ||
          data.profile.subscriptionStatus ||
          profile.subscriptionStatus ||
          profile.paymentStatus ||
          "unpaid",
        subscriptionAccess:
          data.profile.subscriptionAccess ||
          data.subscriptionAccess ||
          profile.subscriptionAccess ||
          profile.loadAccess ||
          "claim",
        subscriptionCurrentPeriodEnd:
          data.profile.subscriptionCurrentPeriodEnd ||
          data.subscriptionCurrentPeriodEnd ||
          profile.subscriptionCurrentPeriodEnd ||
          "",
        subscriptionGraceUntil:
          data.profile.subscriptionGraceUntil ||
          data.subscriptionGraceUntil ||
          profile.subscriptionGraceUntil ||
          "",
        subscriptionCancelAtPeriodEnd: Boolean(
          data.profile.subscriptionCancelAtPeriodEnd ??
          data.subscriptionCancelAtPeriodEnd ??
          profile.subscriptionCancelAtPeriodEnd,
        ),
        subscriptionTrialAllowed: Boolean(
          data.profile.subscriptionTrialAllowed ??
          data.subscriptionTrialAllowed ??
          profile.subscriptionTrialAllowed,
        ),
        accessRoute: data.accessRoute || profile.accessRoute || "",
        dashboardRoute:
          data.dashboardRoute ||
          data.memberAccess?.dashboardRoute ||
          profile.dashboardRoute ||
          "",
        billingAttention: Boolean(
          data.memberAccess?.billingAttention ||
          data.billingAttention ||
          profile.billingAttention ||
          false,
        ),
        profileComplete: Boolean(
          data.memberAccess?.profileComplete || data.profileComplete || false,
        ),
        emailVerifiedAt:
          data.profile.emailVerifiedAt ||
          data.emailVerifiedAt ||
          profile.emailVerifiedAt ||
          "",
        paymentStatus:
          data.paymentStatus ||
          data.profile.paymentStatus ||
          profile.paymentStatus ||
          "unpaid_waitlist",
        paidAt: data.profile?.paidAt || data.paidAt || profile.paidAt || "",
        planLabel:
          data.profile?.planLabel || data.planLabel || profile.planLabel || "",
        notificationPreferences:
          data.profile?.notificationPreferences ||
          data.notificationPreferences ||
          profile.notificationPreferences ||
          profile.communicationPrivacy?.notifications ||
          null,
      }),
    );
  if (Array.isArray(data.recentLoads))
    writeJSON(storageKeys.recentLoads, data.recentLoads);
  if (Array.isArray(data.recentRequests))
    writeJSON(storageKeys.recentRequests, data.recentRequests);
  if (data.requestBids && typeof data.requestBids === "object")
    writeJSON(storageKeys.requestBids, data.requestBids);
  if (Array.isArray(data.messages))
    writeJSON(storageKeys.messages, data.messages);
  if (Array.isArray(data.plannedTrips))
    writeJSON(storageKeys.plannedTrips, data.plannedTrips);
  if (Array.isArray(data.activePickups))
    writeJSON(storageKeys.activePickups, data.activePickups);
  if (Array.isArray(data.verifiedTransactions))
    writeJSON(storageKeys.verifiedTransactions, data.verifiedTransactions);
  if (Array.isArray(data.laneAlerts))
    writeJSON(storageKeys.laneAlerts, data.laneAlerts);
  if (Array.isArray(data.customerRatings))
    writeJSON(storageKeys.customerRatings, data.customerRatings);
  if (Array.isArray(data.trustDisputes))
    writeJSON(storageKeys.trustDisputes, data.trustDisputes);
  if (Array.isArray(data.trustAudit))
    writeJSON(storageKeys.trustAudit, data.trustAudit);
  if (Array.isArray(data.notifications))
    writeJSON(storageKeys.notifications, data.notifications);
  if (data.carrierVerification)
    writeJSON(storageKeys.carrierVerification, data.carrierVerification);
  if (data.checkoutPlan) writeJSON(storageKeys.checkoutPlan, data.checkoutPlan);
  if (data.profileView)
    writeJSON(storageKeys.profileView, normalizeWorkspace(data.profileView));
  if (Array.isArray(data.tags))
    writeJSON(
      storageKeys.profile,
      Object.assign(readJSON(storageKeys.profile, {}), {
        tags: data.tags.slice(),
      }),
    );
}
function scheduleAccountSync() {
  clearTimeout(accountSyncTimer);
  accountSyncTimer = setTimeout(() => {
    void syncAccountState();
  }, 250);
}
async function apiRequest(
  path,
  { method = "GET", body, expectJson = true } = {},
) {
  const verb = String(method || "GET").toUpperCase();
  const needsCsrf = body !== undefined || !["GET", "HEAD"].includes(verb);
  if (needsCsrf && !authCsrfToken) {
    try {
      const seed = await fetch("/api/account", {
        method: "GET",
        credentials: "include",
      });
      const seedData = await seed.json().catch(() => null);
      if (seedData?.csrfToken) authCsrfToken = String(seedData.csrfToken || "");
    } catch {}
  }
  const headers = {};
  if (body) headers["content-type"] = "application/json";
  if (needsCsrf && authCsrfToken) headers["x-csrf-token"] = authCsrfToken;
  const res = await fetch(path, {
    method: verb,
    credentials: "include",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!expectJson) return res;
  const data = await res.json().catch(() => null);
  if (data?.csrfToken) authCsrfToken = String(data.csrfToken || "");
  if (!res.ok) {
    const err = new Error(data?.error || "Request failed");
    err.data = data;
    throw err;
  }
  return data;
}
async function openBillingPortal() {
  const data = await apiRequest("/api/account", {
    method: "POST",
    body: { action: "billing-portal" },
  });
  if (data?.url) location.href = data.url;
  return data;
}
async function loadAccountState() {
  try {
    const data = await apiRequest("/api/account", { method: "GET" });
    if (data?.ok && data.profile) {
      mergeAccountState(data);
      accountBootstrapped = true;
      await loadLoadCatalog(true).catch(() => {});
      return data;
    }
  } catch {}
  accountBootstrapped = true;
  return null;
}
async function syncAccountState() {
  if (!accountBootstrapped) return;
  try {
    await apiRequest("/api/account", {
      method: "PUT",
      body: accountSnapshot(),
    });
  } catch {}
}
async function loadLeaderboardPeers() {
  try {
    const data = await apiRequest("/api/leaderboard");
    leaderboardPeers = Array.isArray(data?.profiles) ? data.profiles : [];
    leaderboardLoaded = true;
    renderLeaderboardBrowser();
    if (location.hash.slice(1) === "carrier-verification")
      renderCarrierVerification();
    return leaderboardPeers;
  } catch {
    leaderboardPeers = [];
    leaderboardLoaded = true;
    renderLeaderboardBrowser();
    if (location.hash.slice(1) === "carrier-verification")
      renderCarrierVerification();
    return [];
  }
}
async function registerAccount(profile, password = "") {
  const data = await apiRequest("/api/account", {
    method: "POST",
    body: {
      action: "register",
      profile,
      password,
      checkoutPlan: readJSON(storageKeys.checkoutPlan, "") || "",
      profileView: workspaceFromProfile(profile),
    },
  });
  mergeAccountState(data);
  await loadLoadCatalog(true).catch(() => {});
  return data;
}
async function loginAccount(email, secret) {
  const data = await apiRequest("/api/account", {
    method: "POST",
    body: { action: "login", email, password: secret, accessCode: secret },
  });
  mergeAccountState(data);
  await loadLoadCatalog(true).catch(() => {});
  return data;
}
async function logoutAccount() {
  try {
    await apiRequest("/api/account", { method: "DELETE" });
  } catch {}
  authCsrfToken = "";
  Object.values(storageKeys).forEach((key) => localStorage.removeItem(key));
  accountBootstrapped = false;
  loadCatalog = loadSeed.map((load, index) => normalizeLoadRecord(load, index));
  loadCatalogLoaded = false;
  loadCatalogPromise = null;
  writeJSON(storageKeys.profile, {});
  writeJSON(storageKeys.checkoutPlan, "");
  writeJSON(storageKeys.profileView, "driver");
  location.hash = "home";
  renderProfile();
  route("home");
  toast("Signed out.");
}
function profileRoleLabel(type = "") {
  const text = String(type || "").toLowerCase();
  if (/admin/.test(text)) return "Administrator";
  if (
    /service[- ]?provider|parking|tow|towing|repair|mechanic|warehouse|insurance|fuel|hotel/.test(
      text,
    )
  )
    return "Service Provider";
  if (/customer|shipper|pickup/.test(text)) return "Customer / Shipper";
  if (/broker/.test(text)) return "Broker";
  if (/owner[- ]?operator|self[- ]?insured|independent driver/.test(text))
    return "Owner-Operator";
  if (/trucking company|motor carrier|carrier|company|fleet/.test(text))
    return "Trucking Company";
  if (/truck driver|driver/.test(text)) return "Truck Driver";
  return "Truck Driver";
}
function profileTypeLabel(type = "") {
  const text = String(type || "").toLowerCase();
  if (/admin/.test(text)) return "Administrator";
  if (/customer|shipper|pickup/.test(text)) return "Customer / Shipper";
  if (/broker 1–3/.test(text)) return "Broker 1–3 trucks";
  if (/broker 4–7/.test(text)) return "Broker 4–7 trucks";
  if (/broker 7–12/.test(text)) return "Broker 7–12 trucks";
  if (/owner[- ]?operator|self[- ]?insured|independent driver/.test(text))
    return "Owner-Operator";
  if (/service[- ]?provider/.test(text)) return "Service Provider";
  if (/trucking company|motor carrier|carrier|company|fleet/.test(text))
    return "Trucking Company";
  return "Truck Driver";
}
function isAdministratorProfile(profile = getProfile()) {
  const role = profileRoleLabel(profile.role || profile.type || "");
  const typeText = String(profile.type || "").toLowerCase();
  const tags = Array.isArray(profile.tags) ? profile.tags : [];
  return (
    /administrator/.test(role.toLowerCase()) ||
    /admin/.test(typeText) ||
    tags.some((tag) => String(tag).toLowerCase() === "admin")
  );
}
function loadAccessFromType(type = "", paymentStatus = "") {
  const typeText = String(type || "").toLowerCase();
  const paymentText = String(paymentStatus || "").toLowerCase();
  if (
    /customer|shipper|pickup/.test(typeText) ||
    paymentText === "paid_shipper"
  )
    return "request_post";
  if (
    /driver|owner[- ]?operator|broker|fleet|carrier|company|motor carrier/.test(
      typeText,
    ) ||
    paymentText === "paid_driver" ||
    paymentText.startsWith("paid_fleet_")
  )
    return "claim_post";
  return "claim";
}
function isRequestOnlyAccount(profile = getProfile()) {
  const type = String(profile.type || "").toLowerCase();
  const payment = String(profile.paymentStatus || "").toLowerCase();
  const access = String(
    profile.loadAccess || profile.subscriptionAccess || "",
  ).toLowerCase();
  return (
    /customer|shipper|pickup/.test(type) ||
    payment === "paid_shipper" ||
    access === "request" ||
    access === "request_post"
  );
}
function hasProfileIdentity(profile = getProfile()) {
  return Boolean(String(profile.userId || profile.email || "").trim());
}
function isPaidProfile(profile = getProfile()) {
  const status = String(
    profile.subscriptionStatus || profile.paymentStatus || "",
  ).toLowerCase();
  return (
    Boolean(profile.memberAccess?.entitled || profile.emailVerifiedAt) &&
    (status === "active" ||
      status === "trialing" ||
      String(profile.paymentStatus || "")
        .toLowerCase()
        .startsWith("paid"))
  );
}
function isProfileCompleteState(profile = getProfile()) {
  if (typeof profile.memberAccess?.profileComplete === "boolean")
    return profile.memberAccess.profileComplete;
  if (typeof profile.profileComplete === "boolean")
    return profile.profileComplete;
  const name = String(profile.name || "").trim();
  const type = String(profile.type || "").trim();
  const company = String(profile.company || "").trim();
  if (!name || !type) return false;
  return (
    !/customer|shipper|broker|fleet|carrier|company|service provider|moving company/i.test(
      type,
    ) || Boolean(company)
  );
}
function serviceAccessState(profile = getProfile(), service = "post") {
  const hasIdentity = hasProfileIdentity(profile);
  const verified = Boolean(
    String(
      profile.emailVerifiedAt || profile.memberAccess?.emailVerifiedAt || "",
    ).trim() || profile.memberAccess?.emailVerified,
  );
  const paid = isPaidProfile(profile);
  if (!hasIdentity)
    return {
      allowed: false,
      route: "signup",
      message: "Create an account or sign in first.",
    };
  if (!verified)
    return {
      allowed: false,
      route: "verify",
      message: "Verify your email before using member features.",
    };
  if (!isProfileCompleteState(profile))
    return {
      allowed: false,
      route: "signup",
      message: "Complete your profile before using member features.",
    };
  if (!paid) {
    const status = String(
      profile.subscriptionStatus || profile.paymentStatus || "",
    ).toLowerCase();
    if (
      billingAttentionProfile(profile) &&
      !["unpaid", "unpaid_waitlist"].includes(status)
    )
      return {
        allowed: false,
        route: "billing",
        message:
          "Your subscription needs attention. Update billing to continue using paid features.",
      };
    return {
      allowed: false,
      route: "pricing",
      message: "Complete checkout to unlock this service.",
    };
  }
  if (service === "post" && !canPostLoads(profile))
    return {
      allowed: false,
      route: "pricing",
      message: "Your plan does not include load posting.",
    };
  if (service === "loads" && isRequestOnlyAccount(profile))
    return {
      allowed: false,
      route: "post",
      message:
        "The $9.99 shipper plan can post loads but cannot view or claim the carrier load board.",
    };
  return { allowed: true, route: "", message: "" };
}
function billingAttentionProfile(profile = getProfile()) {
  const status = String(
    profile.subscriptionStatus || profile.paymentStatus || "",
  ).toLowerCase();
  return [
    "past_due",
    "incomplete",
    "incomplete_expired",
    "unpaid",
    "paused",
  ].includes(status);
}
function canPostBulletin(profile = getProfile()) {
  return hasProfileIdentity(profile) && isPaidProfile(profile);
}
function updateAccessChrome(profile = getProfile()) {
  const canMember =
    hasProfileIdentity(profile) &&
    isPaidProfile(profile) &&
    isProfileCompleteState(profile) &&
    Boolean(
      String(
        profile.emailVerifiedAt || profile.memberAccess?.emailVerifiedAt || "",
      ).trim() || profile.memberAccess?.emailVerified,
    );
  const shipperOnly = isRequestOnlyAccount(profile);
  const memberRoutes = new Set([
    "loads",
    "post",
    "requests",
    "bulletin",
    "bulletin-form",
    "ai-agents",
    "communication",
    "carrier-verification",
    "hardships",
    "trust",
    "ratings",
    "alerts",
    "dashboard",
    "profile",
    "roadmap",
    "tiers",
    "rewards",
    "fraud",
    "trusted-partners",
    "request-form",
  ]);
  const carrierOnlyRoutes = new Set(["loads", "requests", "alerts"]);
  document.documentElement.classList.toggle("access-pending", !canMember);
  $$("[data-route]").forEach((el) => {
    const route = el.dataset.route;
    if (!memberRoutes.has(route)) return;
    const allowed = canMember && !(shipperOnly && carrierOnlyRoutes.has(route));
    el.hidden = !allowed;
    el.style.display = allowed ? "" : "";
  });
}
function truckCountFromProfile(profile = getProfile()) {
  const explicit = Number(profile.truckCount || profile.truck_count || 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit);
  const type = String(profile.type || "").toLowerCase();
  if (/1[-–]3/.test(type)) return 3;
  if (/4[-–]7/.test(type)) return 7;
  if (/7[-–]12/.test(type)) return 12;
  return 0;
}
function pickupLimit(profile = getProfile()) {
  const access = String(profile.loadAccess || "").toLowerCase();
  const type = String(profile.type || "").toLowerCase();
  const payment = String(profile.paymentStatus || "").toLowerCase();
  if (
    access === "request" ||
    access === "request_post" ||
    /customer|pickup/.test(type) ||
    payment === "paid_shipper"
  )
    return 0;
  if (
    /independent driver|owner-operator/.test(type) ||
    payment === "paid_driver"
  )
    return Infinity;
  const truckCount = truckCountFromProfile(profile);
  return truckCount > 0 ? Math.max(6, truckCount * 2) : Infinity;
}
function activePickupCount() {
  return readJSON(storageKeys.activePickups, []).length;
}
function pickupStatus(profile = getProfile()) {
  const limit = pickupLimit(profile);
  const active = activePickupCount();
  if (limit === 0) return { mode: "request", active, limit };
  if (active >= limit) return { mode: "full", active, limit };
  return { mode: "open", active, limit };
}
function carrierLoadBookingAccess(profile = getProfile()) {
  return profile?.memberAccess?.carrierLoadBookingAccess || null;
}
function canClaimLoads(profile = getProfile()) {
  const access = carrierLoadBookingAccess(profile);
  if (access) return Boolean(access.allowed);
  return pickupStatus(profile).mode === "open";
}
function bookingChecklistComplete(profile = getProfile()) {
  const access = carrierLoadBookingAccess(profile);
  if (access) return Boolean(access.allowed);
  const dot = String(
    profile.dotMcStatus || profile.dotMcLookup || "",
  ).toLowerCase();
  const id = String(
    profile.idCheckStatus || profile.idCheck || "",
  ).toLowerCase();
  const insurance = String(
    profile.insuranceStatus || profile.insuranceUpload || "",
  ).toLowerCase();
  const customerBroker = String(
    profile.customerBrokerStatus || profile.customerBrokerVerification || "",
  ).toLowerCase();
  return (
    /(verified|complete|done|approved)/.test(dot) &&
    /(verified|complete|done|approved)/.test(id) &&
    /(uploaded|verified|complete|done|approved)/.test(insurance) &&
    /(verified|complete|done|approved)/.test(customerBroker)
  );
}
function bookingVerificationReady(profile = getProfile()) {
  const access = carrierLoadBookingAccess(profile);
  if (access) return Boolean(access.allowed);
  const approval = String(
    profile.adminApproval || profile.verification || "",
  ).toLowerCase();
  return (
    bookingChecklistComplete(profile) &&
    (/approved/.test(approval) ||
      /manual admin/.test(approval) ||
      /verified by admin/.test(approval))
  );
}
function bookingVerificationReason(profile = getProfile()) {
  const access = carrierLoadBookingAccess(profile);
  if (access && access.message) return access.message;
  return bookingVerificationReady(profile)
    ? "Approved for booking."
    : "Complete DOT/MC lookup, ID check, insurance upload, customer/broker verification, and manual admin approval before booking.";
}
function canPostLoads(profile = getProfile()) {
  const access = String(
    profile.loadAccess ||
      profile.subscriptionAccess ||
      loadAccessFromType(profile.type, profile.paymentStatus),
  ).toLowerCase();
  return (
    hasProfileIdentity(profile) &&
    isPaidProfile(profile) &&
    isProfileCompleteState(profile) &&
    (access === "request_post" || access === "claim_post" || access === "claim")
  );
}
function pushRecent(key, item, max = 8) {
  const current = readJSON(key, []);
  current.unshift(Object.assign({ savedAt: new Date().toISOString() }, item));
  writeJSON(key, current.slice(0, max));
  scheduleAccountSync();
}
function renderList(containerId, items, emptyHtml, renderItem) {
  const box = $(containerId);
  if (!box) return;
  box.innerHTML = items.length ? items.map(renderItem).join("") : emptyHtml;
}
function formatWhen(value) {
  if (!value) return "Planned soon";
  return value;
}
function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
}
function messageRecipientLabel(profile) {
  if (/customer/i.test(profile.type || "")) return "Driver";
  if (/broker/i.test(profile.type || "")) return "Customer or driver";
  return "Customer";
}
function messageThreadTitle(profile) {
  if (/customer/i.test(profile.type || "")) return "Customer ↔ Driver";
  if (/broker/i.test(profile.type || "")) return "Broker ↔ Customer";
  return "Driver ↔ Customer";
}
function pushMessage(message) {
  const current = readJSON(storageKeys.messages, []);
  current.unshift(
    Object.assign(
      { id: crypto.randomUUID(), savedAt: new Date().toISOString() },
      message,
    ),
  );
  writeJSON(storageKeys.messages, current.slice(0, 24));
  scheduleAccountSync();
}
function renderMessages(profile) {
  const box = $("#profileMessages");
  if (!box) return;
  const messages = readJSON(storageKeys.messages, []);
  const recipient = messageRecipientLabel(profile);
  const threadLabel = messageThreadTitle(profile);
  const title = $("#messageThreadLabel");
  if (title) title.textContent = threadLabel;
  const count = $("#messageCount");
  if (count) count.textContent = String(messages.length);
  const filtered = messages.filter(
    (msg) =>
      !msg.thread || msg.thread === threadLabel || msg.thread === "general",
  );
  box.innerHTML = filtered.length
    ? filtered
        .map(
          (msg) => `
        <article class="mini-item message-item">
          <strong>${msg.subject || "Message"}</strong>
          <span>${msg.body}</span>
          <small>${msg.fromName || "You"} → ${msg.toLabel || msg.to || recipient} · ${msg.savedAt ? new Date(msg.savedAt).toLocaleString() : ""}</small>
        </article>
      `,
        )
        .join("")
    : `<div class="empty-state"><h4>No messages yet</h4><p>${/customer/i.test(profile.type || "") ? "Send the driver your pickup details here so both sides stay on the same page." : "Use this space to answer the customer and keep the job details in one thread."}</p></div>`;
}
function bulletinLanguageLabel(code = "") {
  const map = {
    en: "English",
    es: "Español",
    fr: "Français",
    pt: "Português",
    pa: "Punjabi",
    hi: "Hindi",
    ur: "Urdu",
    ar: "العربية",
    zh: "中文",
    vi: "Tiếng Việt",
    ru: "Русский",
    uk: "Українська",
    pl: "Polski",
    ro: "Română",
    tr: "Türkçe",
    tl: "Tagalog",
    ht: "Kreyòl",
    auto: "Auto",
  };
  return (
    map[String(code || "").toLowerCase()] || String(code || "").toUpperCase()
  );
}
function normalizeLanguageList(value) {
  const list = Array.isArray(value)
    ? value
    : String(value || "").split(/[,;|]/);
  return [
    ...new Set(
      list
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .map((item) => item.toLowerCase()),
    ),
  ].slice(0, 12);
}
function profileLanguageCodes(profile = getProfile()) {
  const primary =
    String(profile.preferredLanguage || "en")
      .trim()
      .toLowerCase() || "en";
  const additional = normalizeLanguageList(profile.additionalLanguages || []);
  return [...new Set([primary, ...additional].filter(Boolean))];
}
function profileLanguageLabels(profile = getProfile()) {
  return profileLanguageCodes(profile)
    .map((code) => bulletinLanguageLabel(code))
    .filter(Boolean);
}
function profileLanguagesSummary(profile = getProfile()) {
  const labels = profileLanguageLabels(profile);
  return labels.length ? labels.join(" and ") : "";
}
function communicationTranslationSettings(profile = getProfile()) {
  return {
    primary:
      String(profile.preferredLanguage || "en")
        .trim()
        .toLowerCase() || "en",
    target:
      String(
        profile.preferredTranslationLanguage ||
          profile.preferredLanguage ||
          "en",
      )
        .trim()
        .toLowerCase() || "en",
    autoTranslate: Boolean(profile.autoTranslateMessages),
    alwaysShowOriginal: profile.alwaysShowOriginalMessages !== false,
    transcribeVoiceNotes: profile.transcribeAndTranslateVoiceNotes !== false,
    showLanguagesSpoken: Boolean(profile.showLanguagesSpoken),
  };
}
function communicationCriticalTranslationRequired(text = "") {
  const lowered = String(text || "").toLowerCase();
  return /\b(rate(?:s)?|load rates?|payment instructions?|bank(?:ing)?(?: information)?|wire(?: transfer)?|contract(?: terms?)?|haz(?:ard|mat)|hazardous[- ]material(?: instructions?)?|emergency instructions?|pickup address(?:es)?|delivery address(?:es)?|legal notices?|legal terms?)\b/i.test(
    lowered,
  );
}
function preferredBulletinLanguage(profile = getProfile()) {
  return (
    String(
      profile.preferredTranslationLanguage || profile.preferredLanguage || "en",
    )
      .trim()
      .toLowerCase() || "en"
  );
}
const bulletinTranslateTargets = ["en", "es", "fr", "ht", "ru", "ar"];
function bulletinPosts() {
  return readJSON(storageKeys.bulletinBoard, []);
}
function saveBulletinPosts(posts) {
  writeJSON(storageKeys.bulletinBoard, posts.slice(0, 40));
}
async function loadBulletinBoard() {
  try {
    const data = await apiRequest("/api/bulletin", { method: "GET" });
    if (data?.ok && Array.isArray(data.posts)) saveBulletinPosts(data.posts);
  } catch {}
  renderBulletinBoard();
}
async function postBulletin(post) {
  const data = await apiRequest("/api/bulletin", {
    method: "POST",
    body: { action: "post", post },
  });
  if (data?.ok && Array.isArray(data.posts)) saveBulletinPosts(data.posts);
  else if (data?.ok && data.post) {
    const posts = bulletinPosts();
    posts.unshift(data.post);
    saveBulletinPosts(posts);
  }
  renderBulletinBoard();
  return data?.post || bulletinPosts()[0] || null;
}
async function saveBulletinTranslation(id, language, translation) {
  try {
    await apiRequest("/api/bulletin", {
      method: "POST",
      body: { action: "translate", id, language, translation },
    });
  } catch {}
}
async function translateBulletinPost(id, target) {
  const posts = bulletinPosts();
  const post = posts.find((item) => item.id === id);
  if (!post) return;
  post.translations = post.translations || {};
  if (post.translations[target]) {
    renderBulletinBoard();
    return;
  }
  const data = await apiRequest("/api/translate", {
    method: "POST",
    body: { text: post.body, target, source: post.language || "auto" },
  });
  const translatedText = data?.translatedText || post.body;
  post.translations[target] = translatedText;
  saveBulletinPosts(posts);
  await saveBulletinTranslation(id, target, translatedText);
  renderBulletinBoard();
}
async function translateBulletinPostAll(id) {
  for (const target of bulletinTranslateTargets) {
    await translateBulletinPost(id, target);
  }
}
async function translateAllBulletinPosts(target = preferredBulletinLanguage()) {
  for (const post of bulletinPosts()) {
    await translateBulletinPost(post.id, target);
  }
  renderBulletinBoard();
}
const equipmentThumbMap = {
  "15–26 ft box truck": { x: "0%", y: "0%" },
  "15 ft box truck": { x: "0%", y: "0%" },
  "16 ft box truck": { x: "0%", y: "0%" },
  "20 ft box truck": { x: "0%", y: "0%" },
  "24 ft box truck": { x: "0%", y: "0%" },
  "26 ft box truck": { x: "0%", y: "0%" },
  "Box truck with liftgate": { x: "50%", y: "0%" },
  "Box truck with ramp": { x: "100%", y: "0%" },
  "Cargo van": { x: "0%", y: "25%" },
  "Truck + trailer": { x: "50%", y: "25%" },
  Hotshot: { x: "100%", y: "25%" },
  "53 ft dry van": { x: "0%", y: "50%" },
  "53 ft dry van with liftgate": { x: "0%", y: "50%" },
  "Dry van": { x: "0%", y: "50%" },
  Reefer: { x: "50%", y: "50%" },
  Flatbed: { x: "100%", y: "50%" },
  "53 ft flatbed": { x: "100%", y: "50%" },
  "Step deck": { x: "0%", y: "75%" },
  Conestoga: { x: "50%", y: "75%" },
  "53 ft Conestoga": { x: "50%", y: "75%" },
  "Lowboy / RGN": { x: "100%", y: "75%" },
  "Lowboy trailer": { x: "100%", y: "75%" },
  "Power-only": { x: "0%", y: "100%" },
  "Power only": { x: "0%", y: "100%" },
};
function equipmentThumbFor(value = "") {
  const text = String(value || "").toLowerCase();
  if (/53\s*ft.*flatbed|flatbed/.test(text))
    return equipmentThumbMap["53 ft flatbed"] || equipmentThumbMap.Flatbed;
  if (/conestoga/.test(text))
    return equipmentThumbMap["53 ft Conestoga"] || equipmentThumbMap.Conestoga;
  if (/lowboy|rgn/.test(text))
    return (
      equipmentThumbMap["Lowboy trailer"] || equipmentThumbMap["Lowboy / RGN"]
    );
  if (/dry van/.test(text)) return equipmentThumbMap["53 ft dry van"];
  if (/liftgate/.test(text))
    return equipmentThumbMap["Box truck with liftgate"];
  if (/ramp/.test(text)) return equipmentThumbMap["Box truck with ramp"];
  if (/cargo van/.test(text)) return equipmentThumbMap["Cargo van"];
  if (/truck \+ trailer/.test(text))
    return equipmentThumbMap["Truck + trailer"];
  if (/hotshot/.test(text)) return equipmentThumbMap["Hotshot"];
  if (/reefer/.test(text)) return equipmentThumbMap["Reefer"];
  if (/step deck/.test(text)) return equipmentThumbMap["Step deck"];
  if (/power only|power-only/.test(text))
    return equipmentThumbMap["Power only"];
  return equipmentThumbMap[value] || null;
}
function initEquipmentPickers() {
  $$("[data-equipment-picker]").forEach((picker) => {
    const targetId = picker.dataset.equipmentPicker;
    const select = targetId ? $("#" + targetId) : null;
    if (!select) return;
    const buttons = Array.from(
      picker.querySelectorAll("[data-equipment-choice]"),
    );
    buttons.forEach((btn) => {
      const thumb = equipmentThumbMap[btn.dataset.equipmentChoice];
      if (thumb) {
        btn.classList.add("thumbed");
        btn.style.setProperty("--thumb-x", thumb.x);
        btn.style.setProperty("--thumb-y", thumb.y);
        btn.style.setProperty(
          "--thumb-image",
          'url("assets/truck-equipment-gallery.png")',
        );
      }
    });
    const sync = () => {
      buttons.forEach((btn) =>
        btn.classList.toggle(
          "active",
          btn.dataset.equipmentChoice === select.value,
        ),
      );
    };
    picker.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-equipment-choice]");
      if (!btn || !picker.contains(btn)) return;
      select.value = btn.dataset.equipmentChoice;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      sync();
    });
    select.addEventListener("change", sync);
    sync();
  });
}
function renderBulletinBoard() {
  const box = $("#bulletinBoardList");
  if (!box) return;
  const profile = getProfile();
  const count = $("#bulletinCount");
  if (!canPostBulletin(profile)) {
    if (count) count.textContent = "Locked";
    box.innerHTML =
      '<div class="card"><h3>Members only</h3><p class="muted">Sign in, verify your email, and complete an active monthly plan to view and post on the bulletin board.</p></div>';
    return;
  }
  const posts = bulletinPosts();
  if (count) count.textContent = String(posts.length);
  const targetLang = preferredBulletinLanguage(profile);
  const targetLabel = bulletinLanguageLabel(targetLang);
  const allBtn = $("#bulletinTranslateAll");
  if (allBtn) {
    allBtn.textContent = `Show in ${targetLabel}`;
    allBtn.onclick = () => translateAllBulletinPosts(targetLang);
  }
  box.innerHTML = posts.length
    ? posts
        .map((post) => {
          const sourceLang = String(post.language || "en").toLowerCase();
          const translatedText =
            targetLang === sourceLang
              ? post.body || ""
              : post.translations && post.translations[targetLang];
          const visibleBlock =
            targetLang === sourceLang || !translatedText
              ? `<p class="bulletin-text">${escapeHtml(post.body || "")}</p>`
              : `<div class="bulletin-translation"><strong>${bulletinLanguageLabel(targetLang)}</strong><p>${escapeHtml(translatedText)}</p></div>`;
          const translateBtn =
            targetLang !== sourceLang && !translatedText
              ? `<div class="bulletin-actions"><button class="btn btn-soft" data-bulletin-translate="${post.id}" data-target="${targetLang}">Show in ${targetLabel}</button></div>`
              : "";
          const avatar =
            (post.authorName || "Community").trim().charAt(0).toUpperCase() ||
            "•";
          return `<article class="card bulletin-card"><div class="bulletin-thread"><div class="bulletin-avatar">${escapeHtml(avatar)}</div><div class="bulletin-bubble"><div class="bulletin-meta"><div><h3>${escapeHtml(post.subject || "Bulletin post")}</h3><p class="muted">${escapeHtml(post.authorName || "Community")} · ${escapeHtml(post.authorRole || "Member")} · ${bulletinLanguageLabel(post.language || "en")} · ${post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}</p></div><span class="tag">${bulletinLanguageLabel(post.language || "en")}</span></div>${visibleBlock}${translateBtn}</div></div></article>`;
        })
        .join("")
    : '<div class="empty-state"><h4>No bulletin posts yet</h4><p>Be the first to post an update, an ask, or a lane note for everyone.</p></div>';
  $$("[data-bulletin-translate]").forEach(
    (btn) =>
      (btn.onclick = () =>
        btn.dataset.target === "all"
          ? translateBulletinPostAll(btn.dataset.bulletinTranslate)
          : translateBulletinPost(
              btn.dataset.bulletinTranslate,
              btn.dataset.target,
            )),
  );
}
const communicationState = {
  hub: null,
  contacts: [],
  mentionSuggestions: [],
  notifications: [],
  activeThreadId: "",
  filter: "inbox",
  query: "",
  loading: false,
  lastLoadedAt: 0,
  refreshTimer: null,
  replyToMessageId: "",
  replyToPreview: "",
  mentionQuery: "",
  mentionOpen: false,
  attachmentDrafts: [],
  locationDraft: null,
  contactCardDraft: null,
  loadShareDraft: null,
  translationModeByMessageId: {},
};
async function loadCommunicationHub({ query = "", threadId = "" } = {}) {
  const profile = getProfile();
  if (
    !hasProfileIdentity(profile) ||
    !isPaidProfile(profile) ||
    !String(
      profile.emailVerifiedAt || profile.memberAccess?.emailVerifiedAt || "",
    ).trim()
  )
    return null;
  communicationState.loading = true;
  communicationState.query = query || communicationState.query || "";
  if (threadId) communicationState.activeThreadId = threadId;
  try {
    const params = new URLSearchParams();
    if (communicationState.query) params.set("q", communicationState.query);
    if (communicationState.activeThreadId)
      params.set("threadId", communicationState.activeThreadId);
    const data = await apiRequest(
      `/api/communication${params.toString() ? `?${params}` : ""}`,
      { method: "GET" },
    );
    if (data?.ok) {
      communicationState.hub = data.hub || {
        threads: [],
        seedChannels: [],
        updatedAt: "",
        notifications: [],
      };
      communicationState.contacts = Array.isArray(data.contacts)
        ? data.contacts
        : [];
      communicationState.mentionSuggestions = Array.isArray(
        data.mentionSuggestions,
      )
        ? data.mentionSuggestions
        : communicationState.contacts.slice(0, 12);
      communicationState.notifications = Array.isArray(data.hub?.notifications)
        ? data.hub.notifications
        : [];
      communicationState.lastLoadedAt = Date.now();
      if (!communicationState.activeThreadId && data.hub?.activeThread?.id)
        communicationState.activeThreadId = data.hub.activeThread.id;
      renderCommunicationHub();
    }
    return data;
  } catch (err) {
    communicationState.hub = communicationState.hub || {
      threads: [],
      seedChannels: [],
      updatedAt: "",
      notifications: [],
    };
    renderCommunicationHub();
    return {
      ok: false,
      error:
        (err && err.data && err.data.error) ||
        "Communication hub failed to load.",
    };
  } finally {
    communicationState.loading = false;
  }
}
function communicationThreads() {
  return Array.isArray(communicationState.hub?.threads)
    ? communicationState.hub.threads
    : [];
}
function communicationActiveThread() {
  return (
    communicationThreads().find(
      (thread) => thread.id === communicationState.activeThreadId,
    ) ||
    communicationState.hub?.activeThread ||
    null
  );
}
function communicationThreadTypeLabel(thread) {
  if (!thread) return "Conversation";
  if (thread.type === "channel") return "Channel";
  if (thread.type === "company") return "Company";
  if (thread.type === "load") return "Load";
  return "Direct message";
}
function communicationThreadSubtitle(thread) {
  if (!thread) return "Pick a conversation";
  if (thread.type === "channel")
    return thread.description || "Community channel";
  if (thread.type === "company")
    return thread.company || "Company conversation";
  if (thread.type === "load")
    return thread.loadId ? `Load ${thread.loadId}` : "Load conversation";
  return `${thread.memberCount || thread.members?.length || 0} member${(thread.memberCount || thread.members?.length || 0) === 1 ? "" : "s"}`;
}
function communicationUnreadCount(thread) {
  const profile = getProfile();
  const lastRead = thread?.lastReadAtByUserId?.[profile.userId] || "";
  return Array.isArray(thread?.messages)
    ? thread.messages.filter(
        (msg) => Date.parse(msg.createdAt || 0) > Date.parse(lastRead || 0),
      ).length
    : 0;
}
function communicationFilterThreads(filter) {
  const threads = communicationThreads();
  const q = String(communicationState.query || "").toLowerCase();
  const userId = getProfile().userId;
  return threads
    .filter((thread) => {
      const haystack = [
        thread.title,
        thread.description,
        thread.company,
        thread.channel,
        thread.loadId,
        thread.lastMessage,
        thread.lastSender,
        (thread.members || []).join(" "),
        (thread.messages || [])
          .map((msg) =>
            [
              msg.body,
              (msg.mentions || [])
                .map((item) => item.handle || item.name || "")
                .join(" "),
            ].join(" "),
          )
          .join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (filter === "inbox") return !thread.archivedBy?.[userId];
      if (filter === "dm") return thread.type === "dm";
      if (filter === "loads") return thread.type === "load";
      if (filter === "company") return thread.type === "company";
      if (filter === "channels") return thread.type === "channel";
      if (filter === "mentions")
        return (
          (thread.messages || []).some(
            (msg) =>
              Array.isArray(msg.mentions) &&
              msg.mentions.some(
                (item) =>
                  item.userId === userId ||
                  String(item.handle || "")
                    .toLowerCase()
                    .includes(q),
              ),
          ) ||
          /@|mention/i.test(thread.lastMessage || "") ||
          (thread.messages || []).some((msg) =>
            /@|mention/i.test(msg.body || ""),
          )
        );
      if (filter === "notifications")
        return communicationUnreadCount(thread) > 0;
      if (filter === "saved")
        return (
          (thread.savedMessages || 0) > 0 ||
          (thread.messages || []).some(
            (msg) => Array.isArray(msg.savedBy) && msg.savedBy.includes(userId),
          )
        );
      if (filter === "archived") return Boolean(thread.archivedBy?.[userId]);
      return true;
    })
    .sort(
      (a, b) =>
        Date.parse(b.lastMessageAt || b.updatedAt || 0) -
        Date.parse(a.lastMessageAt || a.updatedAt || 0),
    );
}
function communicationLanguage() {
  return (
    String(communicationTranslationSettings(getProfile()).target || "en")
      .trim()
      .toLowerCase() || "en"
  );
}
function communicationDisplayName(person) {
  return cleanString(
    person?.name || person?.username || person?.company || "Member",
    120,
  );
}
function communicationLocationLabel(person) {
  return (
    [person?.city, person?.state].filter(Boolean).join(", ") ||
    "Location hidden"
  );
}
function communicationHandle(person) {
  return `@${
    cleanString(
      person?.username ||
        person?.name ||
        person?.company ||
        person?.userId ||
        "member",
      40,
    )
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24) || "member"
  }`;
}
function communicationAvatarMarkup(person) {
  const src = person?.avatarUrl || person?.logoUrl || "";
  if (src)
    return `<img class="comm-avatar" src="${escapeHtml(src)}" alt="${escapeHtml(communicationDisplayName(person))}" />`;
  const initials =
    communicationDisplayName(person)
      .split(/\s+/)
      .slice(0, 2)
      .map((item) => item.charAt(0).toUpperCase())
      .join("") || "•";
  return `<span class="comm-avatar comm-avatar-fallback">${escapeHtml(initials)}</span>`;
}
function communicationAttachmentMarkup(att) {
  const kind = String(att?.kind || att?.type || "file").toLowerCase();
  const label = escapeHtml(att?.name || "Attachment");
  const url = escapeHtml(att?.url || "");
  if (kind === "photo" || String(att?.type || "").startsWith("image/"))
    return `<figure class="message-asset"><img src="${url}" alt="${label}" /><figcaption>${label}</figcaption></figure>`;
  if (
    kind === "voice" ||
    kind === "audio" ||
    String(att?.type || "").startsWith("audio/")
  )
    return `<figure class="message-asset"><audio controls src="${url}"></audio><figcaption>${label}</figcaption></figure>`;
  return `<a class="message-file" href="${url}" target="_blank" rel="noreferrer">${label}</a>`;
}
function communicationContactCardMarkup(card) {
  return `<div class="comm-contact-card"><strong>${escapeHtml(card.name || "Contact")}</strong><span>${escapeHtml([card.company, card.role].filter(Boolean).join(" · ") || "Contact card")}</span><small>${escapeHtml([card.city, card.state].filter(Boolean).join(", ") || "Location hidden")}</small></div>`;
}
function communicationLoadShareMarkup(load) {
  return `<div class="message-load-share"><strong>${escapeHtml(load.title || load.loadId || "Load share")}</strong><span>${escapeHtml([load.origin, load.destination].filter(Boolean).join(" → ") || load.company || "Load details")}</span><small>${escapeHtml([load.equipment, load.rate].filter(Boolean).join(" · "))}</small></div>`;
}
function readCommunicationFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return Promise.resolve([]);
  return Promise.all(
    files.slice(0, 6).map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              id: `att_${crypto.randomUUID().replace(/-/g, "")}`,
              kind: file.type.startsWith("image/")
                ? "photo"
                : file.type.startsWith("audio/")
                  ? "voice"
                  : file.type.startsWith("video/")
                    ? "video"
                    : "document",
              name: file.name,
              type: file.type,
              url: String(reader.result || ""),
              size: file.size,
            });
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        }),
    ),
  ).then((items) => items.filter(Boolean));
}
function readCommunicationLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("Location sharing is not available."));
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          label: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  });
}
function communicationNotificationMarkup(note) {
  const preferred = communicationLanguage();
  const sourceLanguage = String(note?.language || "en").toLowerCase() || "en";
  const translated = note?.translations?.[preferred] || "";
  const criticalNotice = communicationCriticalTranslationRequired(
    note?.body || "",
  )
    ? `<div class="notice">Critical details: confirm rates, payment, bank info, contract terms, hazardous-material instructions, emergency instructions, pickup and delivery addresses, and legal notices against the original message.</div>`
    : "";
  const visible =
    translated && translated !== note.body
      ? `<div class="message-translation"><strong>Translated from ${escapeHtml(bulletinLanguageLabel(sourceLanguage))}</strong><p>${escapeHtml(translated)}</p><small class="muted">Automatic translations may contain mistakes. Confirm critical details against the original message before acting.</small></div>`
      : `<span>${escapeHtml(note.body || "")}</span>`;
  return `<button class="comm-item comm-notification ${note.readAt ? "read" : ""}" type="button" data-communication-open-thread="${escapeHtml(note.threadId || "")}"><strong>${escapeHtml(note.type === "mention" ? "Mention" : note.threadTitle || "Conversation")}</strong><span>${escapeHtml(note.senderName || "Member")} · ${escapeHtml(note.senderCompany || "")} · ${criticalNotice}${visible}</span><small>${escapeHtml(note.createdAt ? new Date(note.createdAt).toLocaleString() : "")}</small><div class="comm-mini-actions"><button class="btn btn-soft" type="button" data-communication-notification-translate="${escapeHtml(note.id || "")}" data-message-text="${escapeHtml(note.body || "")}" data-message-language="${escapeHtml(note.language || "en")}">Translate</button></div></button>`;
}
function communicationMentionCandidates(query = "") {
  const text = String(query || "")
    .trim()
    .toLowerCase();
  const source = [
    ...(communicationState.mentionSuggestions || []),
    ...(communicationState.contacts || []),
  ];
  const list = source.filter(Boolean).filter((person) => {
    const haystack = [
      person.name,
      person.company,
      person.role,
      person.city,
      person.state,
      person.username,
      person.handle,
      person.locationLabel,
    ]
      .join(" ")
      .toLowerCase();
    return !text || haystack.includes(text);
  });
  return [
    ...new Map(list.map((person) => [person.userId, person])).values(),
  ].slice(0, 8);
}
function communicationMentionMenuMarkup(query = "") {
  const suggestions = communicationMentionCandidates(query);
  if (!suggestions.length)
    return '<div class="empty-state"><h4>No mention matches</h4><p>Try a name, company, role, or location.</p></div>';
  return suggestions
    .map(
      (person) =>
        `<button class="comm-item comm-mention" type="button" data-communication-mention="${escapeHtml(person.handle || communicationHandle(person))}" data-mention-user="${escapeHtml(person.userId)}"><div class="comm-avatar-wrap">${communicationAvatarMarkup(person)}</div><strong>${escapeHtml(communicationDisplayName(person))}</strong><span>${escapeHtml([person.company, person.role, communicationLocationLabel(person)].filter(Boolean).join(" · ") || "Verified member")}</span><small>${escapeHtml(person.verificationBadge || "Verified member")} · ${escapeHtml(person.handle || communicationHandle(person))}</small></button>`,
    )
    .join("");
}
function communicationMessagePreview(message) {
  const preferred = communicationLanguage();
  const sourceLanguage =
    String(message?.language || "en").toLowerCase() || "en";
  const sourceText = communicationMessageSourceText(message);
  const translated = (message?.translations || {})[preferred] || "";
  const mode = communicationTranslationMode(message);
  const visibleText =
    mode === "translated" && translated ? translated : sourceText;
  const reply = message.replyToPreview
    ? `<div class="message-reply"><strong>Replying to</strong><p>${escapeHtml(message.replyToPreview)}</p></div>`
    : "";
  const attachments =
    Array.isArray(message.attachments) && message.attachments.length
      ? `<div class="message-attachments">${message.attachments.map((att) => communicationAttachmentMarkup(att)).join("")}</div>`
      : "";
  const location = message.location?.label
    ? `<div class="message-location">📍 ${escapeHtml(message.location.label)}</div>`
    : "";
  const contactCard = message.contactCard
    ? communicationContactCardMarkup(message.contactCard)
    : "";
  const loadShare = message.loadShare
    ? communicationLoadShareMarkup(message.loadShare)
    : "";
  const criticalNotice = communicationCriticalTranslationRequired(sourceText)
    ? `<div class="notice">Critical details: confirm rates, payment, bank info, contract terms, hazardous-material instructions, emergency instructions, pickup and delivery addresses, and legal notices against the original message.</div>`
    : "";
  const rendered =
    mode === "translated" && translated
      ? `<div class="message-translation"><strong>Translated from ${escapeHtml(bulletinLanguageLabel(sourceLanguage))}</strong><p>${escapeHtml(visibleText)}</p><small class="muted">Automatic translations may contain mistakes. Confirm critical details against the original message before acting.</small></div>`
      : `<p>${escapeHtml(visibleText)}</p>`;
  const reactions =
    Array.isArray(message.reactions) && message.reactions.length
      ? `<div class="message-reactions">${Object.entries(
          message.reactionCounts ||
            message.reactions.reduce(
              (counts, reaction) => (
                (counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1),
                counts
              ),
              {},
            ),
        )
          .map(
            ([emoji, count]) =>
              `<button class="message-reaction" type="button" data-communication-react="${escapeHtml(message.id)}" data-emoji="${escapeHtml(emoji)}">${escapeHtml(emoji)} ${count}</button>`,
          )
          .join("")}</div>`
      : "";
  return `${reply}${criticalNotice}${rendered}${attachments}${location}${contactCard}${loadShare}${reactions}`;
}
function communicationFieldMarkup(label, value, secondary = "") {
  return `<div class="comm-field"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value || "Not set")}</span>${secondary ? `<small>${escapeHtml(secondary)}</small>` : ""}</div>`;
}
function communicationAuditMarkup(entry) {
  return `<article class="mini-item"><strong>${escapeHtml(entry.label || entry.kind || "Event")}</strong><span>${escapeHtml(entry.note || entry.status || "")} ${entry.createdAt ? `· ${new Date(entry.createdAt).toLocaleString()}` : ""}</span><small>${escapeHtml([entry.actorName, entry.kind].filter(Boolean).join(" · ") || "Audit record")}</small></article>`;
}
function communicationMemberMarkup(member) {
  const contact = [
    member.email && member.communicationPrivacy?.emailVisible
      ? member.email
      : "",
    member.phone && member.communicationPrivacy?.phoneVisible
      ? member.phone
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return `<article class="mini-item"><strong>${escapeHtml(member.name || "Member")}</strong><span>${escapeHtml([member.company, member.role, member.city, member.state].filter(Boolean).join(" · ") || "Verified member")}</span><small>${escapeHtml(member.verificationBadge || "Verified member")} · ${escapeHtml(member.handle || "@member")}${contact ? ` · ${escapeHtml(contact)}` : ""}</small></article>`;
}
function communicationChannelMarkup(channel) {
  const tags = [
    channel.topic,
    ...(Array.isArray(channel.equipmentTypes) ? channel.equipmentTypes : []),
    ...(Array.isArray(channel.locations) ? channel.locations : []),
    ...(Array.isArray(channel.languages) ? channel.languages : []),
    ...(Array.isArray(channel.roles) ? channel.roles : []),
  ]
    .filter(Boolean)
    .slice(0, 6);
  return `<article class="mini-item"><strong>${escapeHtml(channel.title || "Channel")}</strong><span>${escapeHtml(channel.description || channel.topic || "Community channel")}</span><small>${escapeHtml(channel.private ? "Private" : "Public")} · ${escapeHtml(channel.canPost || "members")}${tags.length ? ` · ${escapeHtml(tags.join(" · "))}` : ""}</small></article>`;
}
function communicationMessageSourceText(message) {
  const settings = communicationTranslationSettings();
  const voiceTranscript = String(
    message?.transcript || message?.voiceTranscript || "",
  ).trim();
  const body = String(message?.body || "").trim();
  if (
    (message?.transcript || message?.voiceTranscript) &&
    !settings.transcribeVoiceNotes
  )
    return body || "Voice note attached";
  return voiceTranscript || body || "";
}
function communicationTranslationMode(message) {
  const settings = communicationTranslationSettings();
  const preferred = communicationLanguage();
  const source = String(message?.language || "en").toLowerCase() || "en";
  const stored = communicationState.translationModeByMessageId?.[message?.id];
  if (settings.alwaysShowOriginal) return "original";
  if (stored) return stored;
  return message?.translations?.[preferred] && preferred !== source
    ? "translated"
    : "original";
}
function communicationSetTranslationMode(messageId, mode) {
  communicationState.translationModeByMessageId = {
    ...(communicationState.translationModeByMessageId || {}),
    [messageId]: mode,
  };
}
function renderCommunicationHub() {
  const hubRoot = $("#communicationHub");
  if (!hubRoot) return;
  const profile = getProfile();
  const gate =
    hasProfileIdentity(profile) &&
    isPaidProfile(profile) &&
    String(
      profile.emailVerifiedAt || profile.memberAccess?.emailVerifiedAt || "",
    ).trim();
  if (!gate) {
    hubRoot.innerHTML =
      '<div class="card"><h3>Communication Hub locked</h3><p class="muted">Sign in, verify your email, and keep an active monthly plan to use direct messages and team conversations.</p></div>';
    return;
  }
  const tabs = $$("[data-comm-tab]");
  tabs.forEach((btn) =>
    btn.classList.toggle(
      "active",
      btn.dataset.commTab === communicationState.filter,
    ),
  );
  const threads = communicationFilterThreads(communicationState.filter);
  const active = communicationActiveThread() || threads[0] || null;
  if (active && active.id !== communicationState.activeThreadId)
    communicationState.activeThreadId = active.id;
  const isLoad = active?.type === "load";
  const isCompany = active?.type === "company";
  const isChannel = active?.type === "channel";
  const listBox = $("#communicationThreadList");
  const contactBox = $("#communicationContacts");
  const contactCount = $("#communicationContactsCount");
  const messageBox = $("#communicationMessages");
  const infoBox = $("#communicationThreadInfo");
  const membersBox = $("#communicationMembers");
  const loadBox = $("#communicationLoadDetails");
  const filesBox = $("#communicationFiles");
  const countBox = $("#communicationCount");
  const notificationBox = $("#communicationNotifications");
  const mentionBox = $("#communicationMentionTray");
  const replyBar = $("#communicationReplyBar");
  if (countBox) countBox.textContent = String(threads.length);
  if (contactCount)
    contactCount.textContent = String(communicationState.contacts.length);
  if (listBox)
    listBox.innerHTML = threads.length
      ? threads
          .map(
            (thread) =>
              `<button class="comm-item ${thread.id === communicationState.activeThreadId ? "active" : ""}" data-communication-thread="${thread.id}"><strong>${escapeHtml(thread.title || "Conversation")}</strong><span>${escapeHtml(communicationThreadSubtitle(thread))}</span><small>${escapeHtml(communicationThreadTypeLabel(thread))} · ${thread.lastMessageAt ? new Date(thread.lastMessageAt).toLocaleString() : ""}${communicationUnreadCount(thread) ? ` · ${communicationUnreadCount(thread)} unread` : ""}</small></button>`,
          )
          .join("")
      : '<div class="empty-state"><h4>No conversations yet</h4><p>Start a direct message, load thread, or open a community channel.</p></div>';
  if (contactBox)
    contactBox.innerHTML = communicationState.contacts.length
      ? communicationState.contacts
          .map(
            (person) =>
              `<button class="comm-item" type="button" data-communication-contact="${escapeHtml(person.userId)}" data-mention-handle="${escapeHtml(person.handle || communicationHandle(person))}"><div class="comm-row"><div class="comm-avatar-wrap">${communicationAvatarMarkup(person)}</div><div><strong>${escapeHtml(communicationDisplayName(person))}</strong><span>${escapeHtml([person.company, person.role, communicationLocationLabel(person)].filter(Boolean).join(" · ") || "Verified member")}</span><small>${escapeHtml(person.verificationBadge || "Verified member")} · ${escapeHtml(person.handle || communicationHandle(person))}</small></div></div></button>`,
          )
          .join("")
      : '<div class="empty-state"><h4>Search a verified member</h4><p>Search by name, company, role, location, or equipment type.</p></div>';
  if (notificationBox)
    notificationBox.innerHTML = communicationState.notifications.length
      ? `<div class="section-head"><h3>Notifications</h3><span class="tag">${communicationState.notifications.length}</span></div><div class="comm-list">${communicationState.notifications
          .slice(0, 8)
          .map((note) => communicationNotificationMarkup(note))
          .join("")}</div>`
      : '<div class="empty-state"><h4>No notifications yet</h4><p>Mentions and messages will show up here.</p></div>';
  if (messageBox) {
    const messages = Array.isArray(active?.messages) ? active.messages : [];
    messageBox.innerHTML = active
      ? messages.length
        ? messages
            .slice()
            .reverse()
            .map(
              (msg) =>
                `<article class="message-row ${msg.senderUserId === profile.userId ? "mine" : ""}"><div class="message-meta"><strong>${escapeHtml(msg.senderName || "Member")}</strong><span>${escapeHtml([msg.senderCompany, msg.senderRole].filter(Boolean).join(" · ") || "Member")} · ${msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}</span></div><div class="message-body">${communicationMessagePreview(msg)}</div><div class="message-tools"><button class="btn btn-soft" data-communication-reply="${msg.id}" data-communication-reply-text="${escapeHtml([msg.senderName, msg.body].filter(Boolean).join(": "))}">Reply</button><button class="btn btn-soft" data-communication-save="${active.id}" data-message-id="${msg.id}">Save</button><button class="btn btn-soft" data-communication-translate="${active.id}" data-message-id="${msg.id}">Translate</button><button class="btn btn-soft" data-communication-view="original" data-message-id="${msg.id}">Original</button><button class="btn btn-soft" data-communication-view="translated" data-message-id="${msg.id}">Translated</button><button class="btn btn-soft" data-communication-react="${active.id}" data-message-id="${msg.id}" data-emoji="👍">👍</button><button class="btn btn-soft" data-communication-react="${active.id}" data-message-id="${msg.id}" data-emoji="❤️">❤️</button></div></article>`,
            )
            .join("")
        : '<div class="empty-state"><h4>No messages yet</h4><p>Send the first message to start the thread.</p></div>'
      : '<div class="empty-state"><h4>Select a conversation</h4><p>Choose a DM, company thread, load conversation, or community channel.</p></div>';
  }
  if (infoBox)
    infoBox.innerHTML = active
      ? `<div class="section-head"><h3>${escapeHtml(active.title || "Conversation")}</h3><span class="tag">${escapeHtml(communicationThreadTypeLabel(active))}</span></div><p class="muted">${escapeHtml(active.description || communicationThreadSubtitle(active))}</p><div class="profile-tags"><span class="profile-tag">${communicationUnreadCount(active)} unread</span><span class="profile-tag">${active.memberCount || active.members?.length || 0} members</span><span class="profile-tag">${active.lastMessageAt ? new Date(active.lastMessageAt).toLocaleString() : "No activity yet"}</span></div>${isLoad ? `<div class="profile-tags"><span class="profile-tag">Load # ${escapeHtml(active.loadId || "Not set")}</span><span class="profile-tag">Status: ${escapeHtml(active.currentStatus || "Booked")}</span><span class="profile-tag">Pickup: ${escapeHtml(active.scheduledPickupTime || "Not set")}</span><span class="profile-tag">Delivery: ${escapeHtml(active.scheduledDeliveryTime || "Not set")}</span></div>` : ""}${isCompany ? `<div class="profile-tags"><span class="profile-tag">Company workspace</span><span class="profile-tag">${escapeHtml((companyWorkspace(active).channels || []).length || 0)} channels</span><span class="profile-tag">${escapeHtml((companyWorkspace(active).memberIds || []).length || 0)} members</span></div>` : ""}${isChannel ? `<div class="profile-tags"><span class="profile-tag">Community channel</span><span class="profile-tag">${escapeHtml(active.channelMeta?.topic || active.topic || "topic")}</span><span class="profile-tag">${escapeHtml((active.channelMeta?.equipmentTypes || active.equipmentTypes || []).join(", ") || "equipment")}</span><span class="profile-tag">${escapeHtml((active.channelMeta?.locations || active.locations || []).join(", ") || "location")}</span><span class="profile-tag">${escapeHtml((active.channelMeta?.languages || active.languages || []).join(", ") || "language")}</span><span class="profile-tag">${escapeHtml((active.channelMeta?.roles || active.roles || []).join(", ") || "role")}</span></div><div class="comm-actions"><button class="btn btn-soft" type="button" data-communication-channel-follow="${active.id}">Follow channel</button><button class="btn btn-soft" type="button" data-communication-channel-leave="${active.id}">Leave channel</button></div>` : ""}`
      : '<div class="empty-state"><h4>No conversation selected</h4><p>Open a thread to see its members, load details, and settings.</p></div>';
  if (membersBox)
    membersBox.innerHTML = active
      ? `<div class="section-head"><h3>${isCompany ? "Company members" : "Members"}</h3></div><div class="mini-list">${
          Array.isArray(active.memberDirectory) && active.memberDirectory.length
            ? active.memberDirectory
                .map((member) => communicationMemberMarkup(member))
                .join("")
            : (active.members || []).length
              ? (active.members || [])
                  .slice(0, 8)
                  .map(
                    (id) =>
                      `<span class="profile-tag">${escapeHtml(id)}</span>`,
                  )
                  .join("")
              : '<span class="profile-tag empty">Public channel</span>'
        }</div>${isCompany ? `<div class="section-head"><h3>Company controls</h3></div><div class="comm-actions"><button class="btn btn-soft" type="button" data-communication-company-action="invite">Invite approved employee</button><button class="btn btn-soft" type="button" data-communication-company-action="remove">Remove user</button><button class="btn btn-soft" type="button" data-communication-company-action="role">Assign role</button><button class="btn btn-soft" type="button" data-communication-company-action="create-channel">Create channel</button><button class="btn btn-soft" type="button" data-communication-company-action="toggle-channel">Make channel private/public</button><button class="btn btn-soft" type="button" data-communication-company-action="pin">Pin announcement</button><button class="btn btn-soft" type="button" data-communication-company-action="moderate">Moderate conversation</button><button class="btn btn-soft" type="button" data-communication-company-action="post-policy">Control posting</button></div>` : ""}</div>`
      : "";
  if (loadBox)
    loadBox.innerHTML = isLoad
      ? (() => {
          const docs = Array.isArray(active.documents) ? active.documents : [];
          const photos = Array.isArray(active.photos) ? active.photos : [];
          const pod = Array.isArray(active.proofOfDelivery)
            ? active.proofOfDelivery
            : [];
          const checks = Array.isArray(active.checkIns) ? active.checkIns : [];
          const updates = Array.isArray(active.statusUpdates)
            ? active.statusUpdates
            : [];
          const activity = Array.isArray(active.loadActivity)
            ? active.loadActivity
            : [];
          const audit = Array.isArray(active.auditTrail)
            ? active.auditTrail
            : [];
          const contacts = (
            Array.isArray(active.memberDirectory) ? active.memberDirectory : []
          ).filter((member) => member.email || member.phone);
          return `<div class="section-head"><h3>Load workspace</h3><span class="tag">Immutable audit trail</span></div><div class="comm-grid">${communicationFieldMarkup("Load number", active.loadId || "Not set", active.title || "Load conversation")}${communicationFieldMarkup("Pickup location", active.origin || "Not set", active.scheduledPickupTime || "Scheduled time not set")}${communicationFieldMarkup("Delivery location", active.destination || "Not set", active.scheduledDeliveryTime || "Scheduled time not set")}${communicationFieldMarkup("Equipment type", active.equipmentType || active.equipment || "Not set", active.currentStatus || "Booked")}${communicationFieldMarkup("Assigned driver", active.assignedDriver || "Not assigned")}${communicationFieldMarkup("Assigned carrier", active.assignedCarrier || active.company || "Not assigned")}</div><div class="section-head"><h4>Quick actions</h4></div><div class="comm-actions">${[
            {
              action: "arrived-pickup",
              label: "Arrived at Pickup",
              status: "Arrived at Pickup",
              kind: "status",
            },
            {
              action: "loading-started",
              label: "Loading Started",
              status: "Loading Started",
              kind: "status",
            },
            {
              action: "loading-complete",
              label: "Loading Complete",
              status: "Loading Complete",
              kind: "status",
            },
            {
              action: "in-transit",
              label: "In Transit",
              status: "In Transit",
              kind: "status",
            },
            {
              action: "delayed",
              label: "Delayed",
              status: "Delayed",
              kind: "delay",
            },
            {
              action: "arrived-delivery",
              label: "Arrived at Delivery",
              status: "Arrived at Delivery",
              kind: "status",
            },
            {
              action: "unloading-started",
              label: "Unloading Started",
              status: "Unloading Started",
              kind: "status",
            },
            {
              action: "delivered",
              label: "Delivered",
              status: "Delivered",
              kind: "status",
            },
            {
              action: "upload-document",
              label: "Upload Document",
              status: "Document uploaded",
              kind: "document",
            },
            {
              action: "report-problem",
              label: "Report a Problem",
              status: "Problem reported",
              kind: "problem",
            },
            {
              action: "request-detention",
              label: "Request Detention",
              status: "Detention requested",
              kind: "detention",
            },
            {
              action: "contact-support",
              label: "Contact Support",
              status: "Support contacted",
              kind: "support",
            },
          ]
            .map(
              (item) =>
                `<button class="btn btn-soft" type="button" data-communication-load-action="${item.action}" data-communication-load-status="${item.status}" data-communication-load-kind="${item.kind}">${item.label}</button>`,
            )
            .join(
              "",
            )}</div><div class="section-head"><h4>Contact information allowed by privacy settings</h4></div><div class="mini-list">${contacts.length ? contacts.map((member) => communicationMemberMarkup(member)).join("") : '<div class="empty-state"><h4>No visible contact info</h4><p>Contact details only appear when the member allows them.</p></div>'}</div><div class="section-head"><h4>Documents, photos, POD, check-ins, and updates</h4></div><div class="mini-list">${docs.length ? docs.map((item) => communicationAttachmentMarkup(item)).join("") : '<div class="empty-state"><h4>No documents yet</h4><p>Upload rate con, BOL, or other documents here.</p></div>'}${photos.length ? photos.map((item) => communicationAttachmentMarkup(item)).join("") : '<div class="empty-state"><h4>No photos yet</h4><p>Pickup and delivery photos show up here.</p></div>'}${pod.length ? pod.map((item) => communicationAttachmentMarkup(item)).join("") : '<div class="empty-state"><h4>No proof of delivery yet</h4><p>PODs will be stored here.</p></div>'}${checks.length ? checks.map((item) => communicationAuditMarkup({ label: "Check-in", note: item.label || item.location || "Check-in", createdAt: item.createdAt || item.timestamp || "", actorName: item.actorName || item.by || "Member", kind: "check-in" })).join("") : '<div class="empty-state"><h4>No check-ins yet</h4><p>Arrival and departure timestamps will appear here.</p></div>'}${updates.length ? updates.map((item) => communicationAuditMarkup({ label: item.label || item.status || "Status update", note: item.note || item.status || "", createdAt: item.createdAt || item.timestamp || "", actorName: item.actorName || item.by || "Member", kind: "status" })).join("") : '<div class="empty-state"><h4>No status updates yet</h4><p>Status changes will be timestamped here.</p></div>'}</div><div class="section-head"><h4>Load activity</h4></div><div class="mini-list">${
            activity.length
              ? activity
                  .slice(0, 12)
                  .map((item) => communicationAuditMarkup(item))
                  .join("")
              : '<div class="empty-state"><h4>No load activity yet</h4><p>Activity history will appear as the load moves.</p></div>'
          }</div><div class="section-head"><h4>Audit trail</h4></div><div class="mini-list">${
            audit.length
              ? audit
                  .slice(0, 12)
                  .map((item) => communicationAuditMarkup(item))
                  .join("")
              : '<div class="empty-state"><h4>No audit history yet</h4><p>Important communications will be recorded here.</p></div>'
          }</div></div>`;
        })()
      : `<div class="empty-state"><h4>No load details</h4><p>This thread is not tied to a specific load.</p></div>`;
  if (filesBox)
    filesBox.innerHTML = isCompany
      ? (() => {
          const workspace = companyWorkspace(active);
          const channels = Array.isArray(workspace.channels)
            ? workspace.channels
            : [];
          const activity = Array.isArray(workspace.activityLog)
            ? workspace.activityLog
            : [];
          const moderation = Array.isArray(workspace.moderationLog)
            ? workspace.moderationLog
            : [];
          return `<div class="section-head"><h3>Company workspace</h3><span class="tag">Private by default</span></div><div class="comm-grid">${communicationFieldMarkup("Company", workspace.companyName || active.company || "Not set")}${communicationFieldMarkup("Posting policy", workspace.postingPolicy?.whoCanPost || "admins_and_staff", workspace.postingPolicy?.privateByDefault ? "Private by default" : "Public by default")}${communicationFieldMarkup("Pinned announcements", String((workspace.pinnedMessageIds || []).length))}${communicationFieldMarkup("Admins", String((workspace.adminIds || []).length))}</div><div class="section-head"><h4>Channels</h4></div><div class="mini-list">${channels.length ? channels.map((channel) => communicationChannelMarkup(channel)).join("") : '<div class="empty-state"><h4>No channels yet</h4><p>Create General, Dispatch, Drivers, Accounting, Safety, Maintenance, Available Loads, Human Resources, and Announcements.</p></div>'}</div><div class="section-head"><h4>Administrative activity log</h4></div><div class="mini-list">${
            activity.length
              ? activity
                  .slice(0, 12)
                  .map((item) => communicationAuditMarkup(item))
                  .join("")
              : '<div class="empty-state"><h4>No admin activity yet</h4><p>Invites, role changes, pins, and channel updates will appear here.</p></div>'
          }</div><div class="section-head"><h4>Moderation log</h4></div><div class="mini-list">${
            moderation.length
              ? moderation
                  .slice(0, 12)
                  .map((item) => communicationAuditMarkup(item))
                  .join("")
              : '<div class="empty-state"><h4>No moderation activity yet</h4><p>Moderation actions are tracked here.</p></div>'
          }</div>`;
        })()
      : '<div class="empty-state"><h4>Files</h4><p>Coming next: photos, PODs, BOLs, insurance docs, and rate confirmations.</p></div>';
  if (replyBar) replyBar.hidden = !communicationState.replyToPreview;
  if (replyBar && communicationState.replyToPreview)
    replyBar.innerHTML = `<strong>Replying to</strong><span>${escapeHtml(communicationState.replyToPreview)}</span>`;
  if (mentionBox)
    mentionBox.innerHTML = communicationState.mentionOpen
      ? communicationMentionMenuMarkup(communicationState.mentionQuery)
      : "";
  const composer = $("#communicationComposer");
  if (composer) {
    const input = composer.querySelector('[name="body"]');
    const threadIdInput = composer.querySelector('[name="threadId"]');
    const typeInput = composer.querySelector('[name="type"]');
    const titleInput = composer.querySelector('[name="title"]');
    const membersInput = composer.querySelector('[name="members"]');
    const loadIdInput = composer.querySelector('[name="loadId"]');
    const companyInput = composer.querySelector('[name="company"]');
    const channelInput = composer.querySelector('[name="channel"]');
    if (threadIdInput) threadIdInput.value = active?.id || "";
    if (typeInput) typeInput.value = active?.type || "dm";
    if (titleInput) titleInput.value = active?.title || "";
    if (membersInput)
      membersInput.value = Array.isArray(active?.members)
        ? active.members.join(",")
        : "";
    if (loadIdInput) loadIdInput.value = active?.loadId || "";
    if (companyInput) companyInput.value = active?.company || "";
    if (channelInput) channelInput.value = active?.channel || "";
    if (input && !active) input.placeholder = "Select a conversation first";
  }
  bindCommunicationHub();
}
async function sendCommunicationMessage(form) {
  const profile = getProfile();
  const bodyInput = form.querySelector('[name="body"]');
  const body = String(bodyInput?.value || "").trim();
  const fileInput = form.querySelector('[name="attachments"]');
  const shareLocation = form.querySelector('[name="shareLocation"]')?.checked;
  const threadId = String(
    form.querySelector('[name="threadId"]')?.value ||
      communicationState.activeThreadId ||
      "",
  ).trim();
  const title = String(
    form.querySelector('[name="title"]')?.value || "",
  ).trim();
  const type = String(
    form.querySelector('[name="type"]')?.value || "dm",
  ).trim();
  const members = String(
    form.querySelector('[name="members"]')?.value || "",
  ).trim();
  const loadId = String(
    form.querySelector('[name="loadId"]')?.value || "",
  ).trim();
  const company = String(
    form.querySelector('[name="company"]')?.value || profile.company || "",
  ).trim();
  const channel = String(
    form.querySelector('[name="channel"]')?.value || "",
  ).trim();
  const replyToMessageId = String(
    communicationState.replyToMessageId || "",
  ).trim();
  const attachments = await readCommunicationFiles(fileInput?.files);
  const location = shareLocation
    ? await readCommunicationLocation().catch(() => null)
    : null;
  const active = communicationActiveThread();
  const contactCard = communicationState.contactCardDraft || null;
  const loadShare =
    communicationState.loadShareDraft ||
    (active && active.type === "load"
      ? {
          loadId: active.loadId || loadId || "",
          title: active.title || title || "Load conversation",
          company: active.company || company || "",
          origin: active.origin || "",
          destination: active.destination || "",
          equipment: active.equipment || "",
          rate: active.rate || "",
        }
      : null);
  if (
    !body &&
    !attachments.length &&
    !location &&
    !replyToMessageId &&
    !contactCard &&
    !loadShare
  ) {
    toast("Write a message or add an attachment first.");
    return;
  }
  const data = await apiRequest("/api/communication", {
    method: "POST",
    body: {
      action: "send",
      threadId,
      type,
      title,
      members,
      loadId,
      company,
      channel,
      body,
      replyToMessageId,
      attachments,
      location,
      contactCard,
      loadShare,
    },
  });
  if (data?.ok) {
    form.reset();
    communicationState.activeThreadId =
      data.thread?.id || threadId || communicationState.activeThreadId;
    communicationState.replyToMessageId = "";
    communicationState.replyToPreview = "";
    communicationState.mentionQuery = "";
    communicationState.mentionOpen = false;
    communicationState.attachmentDrafts = [];
    communicationState.locationDraft = null;
    communicationState.contactCardDraft = null;
    communicationState.loadShareDraft = null;
    await loadCommunicationHub({ threadId: communicationState.activeThreadId });
    toast("Message sent.");
  }
}
async function communicationAction(action, payload = {}) {
  const data = await apiRequest("/api/communication", {
    method: "POST",
    body: { action, ...payload },
  });
  if (data?.ok) {
    if (action === "react" && payload.threadId)
      communicationState.activeThreadId = payload.threadId;
    await loadCommunicationHub({ threadId: communicationState.activeThreadId });
    return data;
  }
  throw new Error(data?.error || "Communication update failed.");
}
function bindCommunicationHub() {
  const search = $("#communicationSearch");
  if (search && !search.__bound) {
    search.__bound = true;
    search.addEventListener("input", () => {
      communicationState.query = search.value.trim();
      loadCommunicationHub({
        query: communicationState.query,
        threadId: communicationState.activeThreadId,
      });
    });
  }
  $$("[data-communication-thread]").forEach(
    (btn) =>
      (btn.onclick = () => {
        communicationState.activeThreadId = btn.dataset.communicationThread;
        communicationState.replyToMessageId = "";
        communicationState.replyToPreview = "";
        loadCommunicationHub({
          threadId: communicationState.activeThreadId,
          query: communicationState.query,
        });
      }),
  );
  $$("[data-communication-open-thread]").forEach(
    (btn) =>
      (btn.onclick = () => {
        communicationState.activeThreadId = btn.dataset.communicationOpenThread;
        loadCommunicationHub({
          threadId: communicationState.activeThreadId,
          query: communicationState.query,
        });
      }),
  );
  $$("[data-communication-contact]").forEach(
    (btn) =>
      (btn.onclick = () => {
        const userId = btn.dataset.communicationContact;
        const person = communicationState.contacts.find(
          (item) => item.userId === userId,
        );
        if (!person) return;
        communicationState.filter = "dm";
        communicationState.activeThreadId = `conv_dm_${userId}`;
        communicationState.replyToMessageId = "";
        communicationState.replyToPreview = "";
        communicationState.contactCardDraft = null;
        loadCommunicationHub({
          threadId: communicationState.activeThreadId,
          query: communicationState.query,
        });
      }),
  );
  $$("[data-comm-tab]").forEach(
    (btn) =>
      (btn.onclick = () => {
        communicationState.filter = btn.dataset.commTab;
        renderCommunicationHub();
      }),
  );
  const refresh = $("#communicationRefresh");
  if (refresh && !refresh.__bound) {
    refresh.__bound = true;
    refresh.onclick = () =>
      loadCommunicationHub({
        threadId: communicationState.activeThreadId,
        query: communicationState.query,
      });
  }
  const composer = $("#communicationComposer");
  if (composer && !composer.__bound) {
    composer.__bound = true;
    composer.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await sendCommunicationMessage(composer);
      } catch (err) {
        toast(
          (err && err.data && err.data.error) ||
            err.message ||
            "Message failed.",
        );
      }
    });
    const bodyInput = composer.querySelector('[name="body"]');
    if (bodyInput) {
      const updateMentions = () => {
        const cursor = bodyInput.selectionStart || bodyInput.value.length;
        const left = bodyInput.value.slice(0, cursor);
        const match = left.match(/(?:^|\s)@([a-z0-9._-]*)$/i);
        communicationState.mentionQuery = match ? match[1] : "";
        communicationState.mentionOpen = Boolean(match);
        renderCommunicationHub();
      };
      bodyInput.addEventListener("input", updateMentions);
      bodyInput.addEventListener("keyup", updateMentions);
    }
    const attachmentInput = composer.querySelector('[name="attachments"]');
    if (attachmentInput) {
      attachmentInput.addEventListener("change", () => {
        communicationState.attachmentDrafts = Array.from(
          attachmentInput.files || [],
        ).map((file) => file.name);
        renderCommunicationHub();
      });
    }
    const replyClear = $("[data-communication-reply-clear]");
    if (replyClear && !replyClear.__bound) {
      replyClear.__bound = true;
      replyClear.onclick = () => {
        communicationState.replyToMessageId = "";
        communicationState.replyToPreview = "";
        renderCommunicationHub();
      };
    }
    const shareCard = $("[data-communication-share-card]");
    if (shareCard && !shareCard.__bound) {
      shareCard.__bound = true;
      shareCard.onclick = () => {
        const profile = getProfile();
        communicationState.contactCardDraft = {
          userId: profile.userId,
          name: profile.name,
          company: profile.company,
          role: profile.role,
          city: profile.city,
          state: profile.state,
          handle: profile.username || profile.userId,
        };
        toast("Contact card added to the next message.");
      };
    }
    const shareLoad = $("[data-communication-share-load]");
    if (shareLoad && !shareLoad.__bound) {
      shareLoad.__bound = true;
      shareLoad.onclick = () => {
        const active = communicationActiveThread();
        if (!active || active.type !== "load") {
          toast("Open a load conversation to share load details.");
          return;
        }
        communicationState.loadShareDraft = {
          loadId: active.loadId || active.id,
          title: active.title || "Load conversation",
          company: active.company || "",
          origin: active.origin || "",
          destination: active.destination || "",
          equipment: active.equipment || "",
          rate: active.rate || "",
        };
        toast("Load details added to the next message.");
      };
    }
    const mentionTray = $("#communicationMentionTray");
    if (mentionTray && !mentionTray.__bound) {
      mentionTray.__bound = true;
      mentionTray.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-communication-mention]");
        if (!btn) return;
        const input = composer.querySelector('[name="body"]');
        if (!input) return;
        const handle = btn.dataset.communicationMention || "";
        const start = input.selectionStart || input.value.length;
        const value = input.value;
        const left = value.slice(0, start);
        const right = value.slice(input.selectionEnd || start);
        const nextLeft = left.replace(
          /(?:^|\s)@([a-z0-9._-]*)$/i,
          ` ${handle} `,
        );
        input.value = `${nextLeft}${right}`.replace(/^\s+/, "");
        input.focus();
        const pos = Math.min(
          input.value.length,
          Math.max(0, nextLeft.length + 1),
        );
        input.selectionStart = pos;
        input.selectionEnd = pos;
        communicationState.mentionOpen = false;
        communicationState.mentionQuery = "";
        renderCommunicationHub();
      });
    }
  }
  $$("[data-communication-save]").forEach(
    (btn) =>
      (btn.onclick = () =>
        communicationAction("save", {
          threadId: btn.dataset.communicationSave,
          messageId: btn.dataset.messageId,
        }).catch((err) =>
          toast(
            (err && err.data && err.data.error) || "Could not save message.",
          ),
        )),
  );
  $$("[data-communication-react]").forEach(
    (btn) =>
      (btn.onclick = () =>
        communicationAction("react", {
          threadId: btn.dataset.communicationReact,
          messageId: btn.dataset.messageId,
          emoji: btn.dataset.emoji,
        }).catch((err) =>
          toast((err && err.data && err.data.error) || "Could not react."),
        )),
  );
  $$("[data-communication-reply]").forEach(
    (btn) =>
      (btn.onclick = () => {
        communicationState.replyToMessageId = btn.dataset.communicationReply;
        communicationState.replyToPreview =
          btn.dataset.communicationReplyText || "";
        renderCommunicationHub();
        const composer = $("#communicationComposer");
        const bodyInput = composer?.querySelector('[name="body"]');
        if (bodyInput) bodyInput.focus();
      }),
  );
  $$("[data-communication-translate]").forEach(
    (btn) =>
      (btn.onclick = async () => {
        try {
          const lang = communicationLanguage();
          const thread = communicationThreads().find(
            (item) => item.id === btn.dataset.communicationTranslate,
          );
          const message = thread?.messages?.find(
            (item) => item.id === btn.dataset.messageId,
          );
          if (!thread || !message) return;
          const sourceText = communicationMessageSourceText(message);
          if (message.translations?.[lang]) {
            communicationSetTranslationMode(message.id, "translated");
            renderCommunicationHub();
            return;
          }
          const data = await apiRequest("/api/translate", {
            method: "POST",
            body: {
              text: sourceText,
              target: lang,
              source: message.language || "auto",
            },
          });
          await communicationAction("translate", {
            threadId: thread.id,
            messageId: message.id,
            language: lang,
            translation: data?.translatedText || sourceText,
          });
          communicationSetTranslationMode(message.id, "translated");
          renderCommunicationHub();
        } catch (err) {
          toast((err && err.data && err.data.error) || "Translation failed.");
        }
      }),
  );
  $$("[data-communication-view]").forEach(
    (btn) =>
      (btn.onclick = () => {
        communicationSetTranslationMode(
          btn.dataset.messageId,
          btn.dataset.communicationView || "original",
        );
        renderCommunicationHub();
      }),
  );
  $$("[data-communication-notification-translate]").forEach(
    (btn) =>
      (btn.onclick = async () => {
        try {
          const lang = communicationLanguage();
          const note = communicationState.notifications.find(
            (item) =>
              item.id === btn.dataset.communicationNotificationTranslate,
          );
          if (!note) return;
          const sourceText = String(note.body || btn.dataset.messageText || "");
          const data = await apiRequest("/api/translate", {
            method: "POST",
            body: {
              text: sourceText,
              target: lang,
              source: btn.dataset.messageLanguage || note.language || "auto",
            },
          });
          note.translations = note.translations || {};
          note.translations[lang] = data?.translatedText || sourceText;
          note.language =
            btn.dataset.messageLanguage || note.language || "auto";
          renderCommunicationHub();
        } catch (err) {
          toast((err && err.data && err.data.error) || "Translation failed.");
        }
      }),
  );
  $$("[data-communication-channel-follow]").forEach(
    (btn) =>
      (btn.onclick = () =>
        communicationAction("follow-channel", {
          threadId: btn.dataset.communicationChannelFollow,
        }).catch((err) =>
          toast(
            (err && err.data && err.data.error) || "Could not follow channel.",
          ),
        )),
  );
  $$("[data-communication-channel-leave]").forEach(
    (btn) =>
      (btn.onclick = () =>
        communicationAction("leave-channel", {
          threadId: btn.dataset.communicationChannelLeave,
        }).catch((err) =>
          toast(
            (err && err.data && err.data.error) || "Could not leave channel.",
          ),
        )),
  );
  const privacyForm = $("#communicationPrivacyForm");
  if (privacyForm && !privacyForm.__bound) {
    privacyForm.__bound = true;
    privacyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const next = {
        emailVisible: form.querySelector('[name="emailVisible"]')?.checked,
        phoneVisible: form.querySelector('[name="phoneVisible"]')?.checked,
        directMessages: form.querySelector('[name="directMessages"]')?.checked,
        loadMessages: form.querySelector('[name="loadMessages"]')?.checked,
        companyMessages: form.querySelector('[name="companyMessages"]')
          ?.checked,
        channelMessages: form.querySelector('[name="channelMessages"]')
          ?.checked,
        mentions: form.querySelector('[name="mentions"]')?.checked,
        notifications: {
          inApp: form.querySelector('[name="notifyInApp"]')?.checked,
          push: form.querySelector('[name="notifyPush"]')?.checked,
          email: form.querySelector('[name="notifyEmail"]')?.checked,
          sms: form.querySelector('[name="notifySms"]')?.checked,
        },
      };
      try {
        await communicationAction("privacy", { communicationPrivacy: next });
        toast("Privacy settings saved.");
      } catch (err) {
        toast(
          (err && err.data && err.data.error) ||
            "Could not save privacy settings.",
        );
      }
    });
  }
}
function profileViews(type) {
  const text = String(type || "").toLowerCase();
  if (/moving\s*company|mover|moving service|moving crew/.test(text))
    return [
      "Move requests",
      "Customer conversations",
      "Company profile and service details",
      "Trusted partner status",
    ];
  if (/customer|shipper|pickup/.test(text))
    return [
      "Post pickup requests",
      "Message the driver about timing and details",
      "Track request details and status",
      "Verification and payment status",
    ];
  if (/broker/.test(text))
    return [
      "Recent posted loads",
      "Open customer demand",
      "Fleet capacity and truck profiles",
      "Future dispatch planning",
    ];
  if (
    /service[- ]?provider|parking|tow|towing|repair|mechanic|warehouse|insurance|fuel|hotel/i.test(
      text,
    )
  )
    return [
      "Service requests",
      "Partner conversations",
      "Profile and service details",
      "Trusted partner status",
    ];
  return [
    "Recent booked loads",
    "Saved lanes and rate targets",
    "Future trips and return loads",
    "Truck profile and verification",
  ];
}
function normalizeWorkspace(view) {
  const text = String(view || "").toLowerCase();
  if (text === "shipper") return "customer";
  if (["customer", "broker", "driver", "provider", "moving"].includes(text))
    return text;
  return "driver";
}
function workspaceContent(view) {
  const map = {
    driver: {
      label: "Driver workspace",
      title: "Your driver dashboard",
      copy: "See recent loads, saved lanes, booking history, and planned trips all in one place.",
      metrics: [
        ["Loads", "Book and save work you want to come back to."],
        ["Lanes", "Keep your home base, target rate, and equipment fit ready."],
        [
          "Trips",
          "Plan future hauls and return runs before they hit the road.",
        ],
      ],
      bullets: [
        "Recent loads you booked or saved",
        "Saved lanes and rate targets",
        "Future trips and return loads",
        "Truck profile and verification",
      ],
    },
    customer: {
      label: "Customer dashboard",
      title: "Your customer dashboard",
      copy: "Post pickup requests, message the driver, review request details, and keep everything organized.",
      metrics: [
        ["Requests", "Create and track pickup requests."],
        ["Messages", "Talk to the driver about timing and handling."],
        ["Status", "Review verification and payment status."],
      ],
      bullets: [
        "Post pickup requests",
        "Message the driver from the profile",
        "Track request details and updates",
        "Verification and payment status",
      ],
    },
    moving: {
      label: "Moving company dashboard",
      title: "Your moving dashboard",
      copy: "See move requests, customer conversations, company details, and the helper tools that matter most.",
      metrics: [
        ["Moves", "Requests waiting for a reply."],
        ["Inbox", "Talk with customers and partners."],
        ["Trust", "Verified partner details and profile information."],
      ],
      bullets: [
        "Move requests",
        "Customer conversations",
        "Profile and service details",
        "Trusted partner status",
      ],
    },
    broker: {
      label: "Broker workspace",
      title: "Your broker dashboard",
      copy: "See active demand, fleet capacity, and the loads that are worth covering next.",
      metrics: [
        ["Demand", "Open customer loads waiting for coverage."],
        ["Fleet", "Truck capacity profiles and equipment fit."],
        ["Calendar", "Future dispatch and lane planning."],
      ],
      bullets: [
        "Recent posted loads",
        "Open customer demand",
        "Fleet capacity and truck profiles",
        "Future dispatch planning",
      ],
    },
    provider: {
      label: "Service provider workspace",
      title: "Your provider dashboard",
      copy: "See service requests, partner conversations, and the helper tools that matter to your business.",
      metrics: [
        ["Requests", "Service opportunities waiting for a reply."],
        ["Inbox", "Conversation threads with customers and partners."],
        ["Trust", "Verified partner details and profile information."],
      ],
      bullets: [
        "Service requests",
        "Partner conversations",
        "Profile and service details",
        "Trusted partner status",
      ],
    },
  };
  return map[normalizeWorkspace(view)] || map.driver;
}
function workspaceFromProfile(profile) {
  const type = String(profile.type || "").toLowerCase();
  if (/customer|shipper|pickup/.test(type)) return "customer";
  if (/moving\s*company|mover|moving service|moving crew/.test(type))
    return "moving";
  if (/broker|fleet/.test(type)) return "broker";
  if (
    /service[- ]?provider|parking|tow|towing|repair|mechanic|warehouse|insurance|fuel|hotel/i.test(
      type,
    )
  )
    return "provider";
  return "driver";
}
function route(id) {
  const profile = getProfile();
  if (id === "dashboard") id = "profile";
  if (["provider", "moving", "customer", "broker", "driver"].includes(id)) {
    writeJSON(storageKeys.profileView, normalizeWorkspace(id));
    id = "profile";
  }
  if (id === "profile-completion") id = "signup";
  if (id === "renewal") id = "billing";
  if (id === "plan-selection") id = "pricing";
  if (id === "signin") {
    location.href = "/signin";
    return;
  }
  const publicRoutes = new Set([
    "home",
    "pricing",
    "signin",
    "signup",
    "verify",
    "reset",
    "legal",
    "faq",
    "safety",
  ]);
  if (id === "ai-agents") {
    const gate = serviceAccessState(profile, "member");
    if (!gate.allowed) id = gate.route || "signin";
  }
  if (id === "billing") {
    if (!hasProfileIdentity(profile)) id = "signin";
    else if (
      !billingAttentionProfile(profile) &&
      !String(profile.subscriptionStatus || "")
        .toLowerCase()
        .includes("active")
    )
      id = "pricing";
  }
  if (!publicRoutes.has(id) && id !== "billing") {
    const service = ["loads", "requests", "alerts"].includes(id)
      ? "loads"
      : id === "request-form"
        ? "request"
        : id === "bulletin-form"
          ? "bulletin"
          : id === "communication"
            ? "member"
            : id === "post"
              ? "post"
              : "member";
    const gate = serviceAccessState(profile, service);
    if (!gate.allowed) id = gate.route || "signin";
  }
  if (id === "post") {
    const gate = serviceAccessState(profile, "post");
    if (!gate.allowed) id = gate.route || "signup";
  }
  if (id === "request-form") {
    const gate = serviceAccessState(profile, "request");
    if (!gate.allowed) id = gate.route || "signup";
  }
  if (id === "bulletin-form") {
    const gate = serviceAccessState(profile, "bulletin");
    if (!gate.allowed) id = gate.route || "pricing";
  }
  if (
    ["loads", "requests", "alerts"].includes(id) &&
    isRequestOnlyAccount(profile)
  )
    id = "post";
  if (id === "bulletin-form" && !canPostBulletin(profile)) id = "pricing";
  $$(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
  $$("[data-route]").forEach((a) =>
    a.classList.toggle("active", a.dataset.route === id),
  );
  location.hash = id;
  const menuBtn = $("#menuBtn");
  const mainNav = $("#mainNav");
  if (mainNav) mainNav.classList.remove("open");
  if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  if (id === "loads") renderLoads();
  if (id === "profile") renderProfile();
  if (id === "communication") {
    renderCommunicationHub();
    loadCommunicationHub({
      threadId: communicationState.activeThreadId,
      query: communicationState.query,
    });
  }
  if (id === "ratings") renderFraudDashboard();
  if (id === "tiers") renderRewardsCenter();
  if (id === "rewards") renderRewardsCenter();
  if (id === "fraud") renderFraudDashboard();
  if (id === "carrier-verification") renderCarrierVerification();
  if (id === "verify") renderAuthExtras();
  if (id === "reset") renderAuthExtras();
  if (id === "billing") renderAuthExtras();
  if (id === "signup") {
    $("#signupForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  scrollTo({ top: 0, behavior: "smooth" });
}
const carrierVerificationOfficialLinks = {
  safer: "https://safer.fmcsa.dot.gov/CompanySnapshot.aspx",
  licensing:
    "https://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_carrlist",
};
function carrierVerificationStore() {
  return readJSON(storageKeys.carrierVerification, {
    checklists: {},
    savedRecords: [],
    reports: [],
  });
}
function saveCarrierVerificationStore(store) {
  writeJSON(storageKeys.carrierVerification, store);
  scheduleAccountSync();
}
function carrierVerificationNormalizeCarrier(source = {}, label = "Carrier") {
  const company = String(
    source.company || source.legalName || source.name || source.dba || "",
  ).trim();
  const name = String(source.name || company || label || "Carrier").trim();
  const mcDot = String(
    source.mc_dot ||
      source.usdot ||
      source.usdotNumber ||
      source.dot ||
      source.mc ||
      "",
  ).trim();
  const city = String(
    source.city || source.metroArea || source.location || "",
  ).trim();
  const state = String(
    source.state || inferStateFromLocation(city) || "",
  ).trim();
  const key = String(
    source.userId || source.email || mcDot || company || name || label,
  )
    .trim()
    .toLowerCase();
  const summary = americanTruckersTrustScore(source || {});
  return {
    key,
    name,
    company: company || name,
    dba: String(source.dba || source.tradeName || company || name).trim(),
    mc_dot: mcDot || "Not set",
    city,
    state,
    authority: String(
      source.authorityVerification ||
        source.authorityStatus ||
        source.dotMcStatus ||
        source.authority ||
        "Pending",
    ).trim(),
    insurance: String(
      source.insuranceVerification ||
        source.insuranceStatus ||
        source.insurance ||
        "Pending",
    ).trim(),
    score: Number(source.score || summary.score || 0),
    summary,
    profile: source,
    sourceLabel: label,
    lastChecked: String(
      source.lastCheckedAt || source.updatedAt || source.createdAt || "",
    ).trim(),
  };
}
function carrierVerificationDirectory(profile = getProfile()) {
  const base = [
    carrierVerificationNormalizeCarrier(profile, "Current account"),
  ];
  const peers = Array.isArray(leaderboardPeers)
    ? leaderboardPeers.map((peer) =>
        carrierVerificationNormalizeCarrier(peer, "Leaderboard profile"),
      )
    : [];
  const items = base.concat(peers);
  const seen = new Set();
  return items.filter((item) => {
    const key = item.key || item.mc_dot || item.company || item.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function carrierVerificationSearch(query = "", profile = getProfile()) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  const items = carrierVerificationDirectory(profile);
  if (!q) return items.slice(0, 8);
  return items
    .filter((item) =>
      [
        item.name,
        item.company,
        item.dba,
        item.mc_dot,
        item.city,
        item.state,
        item.authority,
        item.insurance,
        String(item.score || ""),
        item.sourceLabel,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
    .slice(0, 8);
}
function carrierVerificationLoadOptions() {
  const catalog = loadCatalogItems()
    .slice(0, 12)
    .map((item, index) => ({
      value: item.id || `load-${index}`,
      label: `Verified load · ${item.from} → ${item.to}`,
    }));
  const active = readJSON(storageKeys.activePickups, []).map((item, index) => ({
    value: `active-${index}`,
    label: `Active pickup · ${item.title || item.detail || `Load ${index + 1}`}`,
  }));
  const recent = readJSON(storageKeys.recentLoads, []).map((item, index) => ({
    value: `recent-${index}`,
    label: `Recent load · ${item.title || item.detail || `Load ${index + 1}`}`,
  }));
  return catalog.concat(active, recent).slice(0, 12);
}
function carrierVerificationStepItems() {
  return [
    {
      key: "dot",
      label: "Match the carrier name",
      detail: "Make sure the legal name, DBA, USDOT, and MC details line up.",
    },
    {
      key: "safer",
      label: "Check the USDOT record",
      detail: "Review FMCSA status, address, and operating information.",
    },
    {
      key: "authority",
      label: "Confirm authority",
      detail: "Look for active authority and anything that needs attention.",
    },
    {
      key: "insurance",
      label: "Review insurance documents",
      detail: "Check effective dates, coverage limits, and company names.",
    },
    {
      key: "confirm",
      label: "Confirm with insurer",
      detail: "Call or verify with the insurer or agency when needed.",
    },
    {
      key: "driver",
      label: "Match the driver and truck",
      detail:
        "Confirm the equipment, driver, and company contact before booking.",
    },
    {
      key: "save",
      label: "Save the verification",
      detail:
        "Attach the result to the load and keep the record for the account.",
    },
  ];
}
function carrierVerificationChecklist(key) {
  const store = carrierVerificationStore();
  store.checklists = store.checklists || {};
  if (!store.checklists[key])
    store.checklists[key] = {
      steps: {},
      loadId: "",
      updatedAt: "",
      reportIds: [],
    };
  return store.checklists[key];
}
function carrierVerificationCompletedCount(checklist) {
  return carrierVerificationStepItems().filter(
    (step) => checklist?.steps?.[step.key],
  ).length;
}
function carrierVerificationAttach(candidate, loadId) {
  const store = carrierVerificationStore();
  const checklist = carrierVerificationChecklist(candidate.key);
  checklist.loadId = loadId || "";
  checklist.updatedAt = new Date().toISOString();
  checklist.candidate = {
    key: candidate.key,
    name: candidate.name,
    company: candidate.company,
    mc_dot: candidate.mc_dot,
    city: candidate.city,
    state: candidate.state,
    authority: candidate.authority,
    insurance: candidate.insurance,
    score: candidate.score,
  };
  store.checklists[candidate.key] = checklist;
  store.savedRecords = [
    {
      id: crypto.randomUUID(),
      candidateKey: candidate.key,
      loadId: checklist.loadId,
      candidate: checklist.candidate,
      createdAt: checklist.updatedAt,
    },
    ...(Array.isArray(store.savedRecords) ? store.savedRecords : []),
  ].slice(0, 25);
  saveCarrierVerificationStore(store);
  return checklist;
}
function carrierVerificationReport(candidate, reason, notes) {
  const store = carrierVerificationStore();
  const item = {
    id: crypto.randomUUID(),
    candidateKey: candidate.key,
    name: candidate.name,
    company: candidate.company,
    mc_dot: candidate.mc_dot,
    reason: String(reason || "")
      .trim()
      .slice(0, 120),
    notes: String(notes || "")
      .trim()
      .slice(0, 240),
    createdAt: new Date().toISOString(),
  };
  store.reports = [
    item,
    ...(Array.isArray(store.reports) ? store.reports : []),
  ].slice(0, 20);
  saveCarrierVerificationStore(store);
  return item;
}
function renderCarrierVerification() {
  const root = $("#carrierVerificationHub");
  if (!root) return;
  const profile = getProfile();
  const query = String(carrierVerificationState.query || "").trim();
  const results = carrierVerificationSearch(query, profile);
  let selected =
    results.find((item) => item.key === carrierVerificationState.selectedKey) ||
    results[0] ||
    null;
  if (selected) carrierVerificationState.selectedKey = selected.key;
  const store = carrierVerificationStore();
  const checklist = selected
    ? carrierVerificationChecklist(selected.key)
    : { steps: {}, loadId: "", updatedAt: "", reportIds: [] };
  const completed = carrierVerificationCompletedCount(checklist);
  const loadOptions = carrierVerificationLoadOptions();
  const selectedLoad =
    loadOptions.find((item) => item.value === checklist.loadId) || null;
  const reports = Array.isArray(store.reports) ? store.reports : [];
  const pct = Math.round(
    (completed / carrierVerificationStepItems().length) * 100,
  );
  root.innerHTML = `<div class="carrier-grid"><section class="card"><div class="section-head"><h3>Carrier search</h3><span class="tag">${results.length} match${results.length === 1 ? "" : "es"}</span></div><form class="form-grid" id="carrierVerificationSearchForm"><label>Search by name, company, USDOT, or MC<input name="query" value="${escapeHtml(query)}" placeholder="Company name, DBA, city, or number" /></label><label>Attach to load<select name="loadId"><option value="">Select a load</option>${loadOptions.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === checklist.loadId ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label><button class="btn btn-primary full" type="submit">Search carrier</button></form><div class="mini-list">${results.length ? results.map((item) => `<button class="comm-item ${item.key === selected?.key ? "active" : ""}" type="button" data-carrier-verification-select="${escapeHtml(item.key)}"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml([item.company, item.mc_dot, [item.city, item.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "No details yet")}</span><small>${escapeHtml(item.authority)} · ${escapeHtml(item.insurance)} · Trust ${escapeHtml(String(item.score || 0))}</small></button>`).join("") : '<div class="empty-state"><h4>No matches yet</h4><p>Try a company name, DBA, USDOT number, or MC number.</p></div>'}</div></section><section class="card" id="carrierVerificationProfile"><div class="section-head"><h3>Carrier verification card</h3><span class="tag">${selected ? escapeHtml(selected.sourceLabel) : "No carrier selected"}</span></div>${selected ? `<div class="profile-tags"><span class="profile-tag">Company: ${escapeHtml(selected.company || "Not set")}</span><span class="profile-tag">DBA: ${escapeHtml(selected.dba || "Not set")}</span><span class="profile-tag">USDOT/MC: ${escapeHtml(selected.mc_dot || "Not set")}</span><span class="profile-tag">Location: ${escapeHtml([selected.city, selected.state].filter(Boolean).join(", ") || "Not set")}</span><span class="profile-tag">Authority: ${escapeHtml(selected.authority)}</span><span class="profile-tag">Insurance: ${escapeHtml(selected.insurance)}</span><span class="profile-tag">Trust score: ${escapeHtml(String(selected.score || 0))}</span><span class="profile-tag">Last checked: ${escapeHtml(selected.lastChecked ? new Date(selected.lastChecked).toLocaleString() : "Not checked")}</span></div><div class="comm-actions"><button class="btn btn-soft" type="button" data-carrier-verification-link="safer">Open SAFER</button><button class="btn btn-soft" type="button" data-carrier-verification-link="licensing">Licensing & insurance</button><button class="btn btn-soft" type="button" data-carrier-verification-action="profile">View carrier profile</button><button class="btn btn-soft" type="button" data-carrier-verification-action="save">Save verification</button><button class="btn btn-soft" type="button" data-carrier-verification-action="report">Report mismatch</button></div>` : '<div class="empty-state"><h4>Select a carrier</h4><p>Search a carrier to review the profile, then save the verification to a load.</p></div>'}</section><section class="card" id="carrierVerificationGuide"><div class="section-head"><h3>Step-by-step verification guide</h3><span class="tag">${completed}/${carrierVerificationStepItems().length} complete</span></div><div class="progress"><div style="width:${pct}%"></div></div><div class="choice-grid">${carrierVerificationStepItems()
    .map(
      (step) =>
        `<label class="check"><input type="checkbox" data-carrier-verification-step="${step.key}" ${checklist.steps?.[step.key] ? "checked" : ""} /> <strong>${escapeHtml(step.label)}</strong><small>${escapeHtml(step.detail)}</small></label>`,
    )
    .join(
      "",
    )}</div></section><section class="card" id="carrierVerificationLoadBooking"><div class="section-head"><h3>Load-booking integration</h3><span class="tag">${selectedLoad ? escapeHtml(selectedLoad.label) : "No load selected"}</span></div><p class="muted">Verification stays attached to the load and the account. Booking can stay gated until the checks are done.</p><div class="profile-tags"><span class="profile-tag">Saved checks: ${Array.isArray(store.savedRecords) ? store.savedRecords.length : 0}</span><span class="profile-tag">Mismatch reports: ${reports.length}</span></div><div class="comm-actions"><button class="btn btn-soft" type="button" data-route="loads">Open load board</button><button class="btn btn-soft" type="button" data-route="profile">Open profile</button><button class="btn btn-soft" type="button" data-carrier-verification-action="insurance">Review insurance</button></div></section><section class="card" id="carrierVerificationReport"><div class="section-head"><h3>Report a mismatch</h3><span class="tag">${reports.length} reports</span></div><form class="form-grid" id="carrierVerificationReportForm"><label>Reason<textarea name="reason" rows="3" placeholder="What does not match?"></textarea></label><label>Notes<textarea name="notes" rows="3" placeholder="Add supporting details or a phone number to check."></textarea></label><button class="btn btn-primary full" type="submit">Submit mismatch report</button></form><div class="mini-list">${
    reports.length
      ? reports
          .slice(0, 5)
          .map(
            (report) =>
              `<article class="mini-item"><strong>${escapeHtml(report.name || "Carrier")} · ${escapeHtml(report.reason || "Mismatch")}</strong><span>${escapeHtml(report.company || "")} · ${escapeHtml(report.mc_dot || "")}</span><small>${escapeHtml(report.notes || "No notes")}</small></article>`,
          )
          .join("")
      : '<div class="empty-state"><h4>No mismatch reports yet</h4><p>Reports will show up here and can be reviewed in the admin fraud dashboard.</p></div>'
  }</div></section></div>`;
  bindCarrierVerification();
}
function bindCarrierVerification() {
  const searchForm = $("#carrierVerificationSearchForm");
  if (searchForm && !searchForm.__bound) {
    searchForm.__bound = true;
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      carrierVerificationState.query = String(
        form.querySelector('[name="query"]')?.value || "",
      ).trim();
      carrierVerificationState.loadId = String(
        form.querySelector('[name="loadId"]')?.value || "",
      ).trim();
      const results = carrierVerificationSearch(carrierVerificationState.query);
      if (results[0]) carrierVerificationState.selectedKey = results[0].key;
      const selected =
        results.find(
          (item) => item.key === carrierVerificationState.selectedKey,
        ) ||
        results[0] ||
        null;
      if (selected && carrierVerificationState.loadId) {
        carrierVerificationAttach(selected, carrierVerificationState.loadId);
        toast("Verification saved to the selected load.");
      }
      renderCarrierVerification();
    });
  }
  $$("[data-carrier-verification-select]").forEach((btn) => {
    btn.onclick = () => {
      carrierVerificationState.selectedKey = String(
        btn.dataset.carrierVerificationSelect || "",
      );
      renderCarrierVerification();
      const target = $("#carrierVerificationProfile");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  });
  $$("[data-carrier-verification-step]").forEach((input) => {
    input.onchange = () => {
      const selected =
        carrierVerificationSearch(carrierVerificationState.query).find(
          (item) => item.key === carrierVerificationState.selectedKey,
        ) ||
        carrierVerificationSearch(carrierVerificationState.query)[0] ||
        null;
      if (!selected) return;
      const store = carrierVerificationStore();
      const checklist = carrierVerificationChecklist(selected.key);
      checklist.steps = checklist.steps || {};
      checklist.steps[input.dataset.carrierVerificationStep] = Boolean(
        input.checked,
      );
      checklist.updatedAt = new Date().toISOString();
      store.checklists[selected.key] = checklist;
      saveCarrierVerificationStore(store);
      renderCarrierVerification();
    };
  });
  $$("[data-carrier-verification-link]").forEach((btn) => {
    btn.onclick = () => {
      const link =
        carrierVerificationOfficialLinks[
          btn.dataset.carrierVerificationLink || ""
        ];
      if (link) window.open(link, "_blank", "noopener");
    };
  });
  $$("[data-carrier-verification-action]").forEach((btn) => {
    btn.onclick = () => {
      const selected =
        carrierVerificationSearch(carrierVerificationState.query).find(
          (item) => item.key === carrierVerificationState.selectedKey,
        ) ||
        carrierVerificationSearch(carrierVerificationState.query)[0] ||
        null;
      if (!selected) return;
      const action = btn.dataset.carrierVerificationAction || "";
      if (action === "profile") {
        const target = $("#carrierVerificationProfile");
        if (target)
          target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (action === "insurance") {
        const target = $("#carrierVerificationGuide");
        if (target)
          target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (action === "report") {
        const target = $("#carrierVerificationReport");
        if (target)
          target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (action === "save") {
        const loadId = String(
          $('#carrierVerificationSearchForm [name="loadId"]')?.value ||
            carrierVerificationState.loadId ||
            "",
        ).trim();
        carrierVerificationAttach(selected, loadId);
        toast("Verification saved to the selected load.");
        renderCarrierVerification();
      }
    };
  });
  const reportForm = $("#carrierVerificationReportForm");
  if (reportForm && !reportForm.__bound) {
    reportForm.__bound = true;
    reportForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const selected =
        carrierVerificationSearch(carrierVerificationState.query).find(
          (item) => item.key === carrierVerificationState.selectedKey,
        ) ||
        carrierVerificationSearch(carrierVerificationState.query)[0] ||
        null;
      if (!selected) return;
      const reason = String(
        reportForm.querySelector('[name="reason"]')?.value || "",
      ).trim();
      if (!reason) {
        toast("Enter a mismatch reason.");
        return;
      }
      const notes = String(
        reportForm.querySelector('[name="notes"]')?.value || "",
      ).trim();
      carrierVerificationReport(selected, reason, notes);
      reportForm.reset();
      toast("Mismatch report saved.");
      renderCarrierVerification();
    });
  }
}

function renderAuthExtras() {
  const params = new URLSearchParams(location.search);
  const pendingVerify =
    params.get("verify_token") ||
    readJSON(storageKeys.profile, {}).pendingVerificationToken ||
    "";
  const pendingReset = params.get("reset_token") || "";
  const verifyInput = $('#verifyForm [name="verificationToken"]');
  if (verifyInput && pendingVerify && !verifyInput.value)
    verifyInput.value = pendingVerify;
  const resetInput = $('#resetForm [name="resetToken"]');
  if (resetInput && pendingReset && !resetInput.value)
    resetInput.value = pendingReset;
  const resetEmail = $('#resetForm [name="email"]');
  if (resetEmail && params.get("email") && !resetEmail.value)
    resetEmail.value = params.get("email");
  const verifyNotice = $("#verifyNotice");
  if (verifyNotice && pendingVerify) {
    verifyNotice.hidden = false;
    verifyNotice.textContent =
      "Paste the verification token from your email to activate the account.";
  }
  const resetNotice = $("#resetNotice");
  if (resetNotice && pendingReset) {
    resetNotice.hidden = false;
    resetNotice.textContent =
      "Use the reset token from your email to create a new password.";
  }
}
function favoriteLoadIds() {
  return new Set(readJSON(storageKeys.favoriteLoads, []).map(String));
}
function currentLoadSearch() {
  return {
    keyword: String($("#keywordFilter")?.value || "").trim(),
    pickup: String($("#pickupFilter")?.value || "").trim(),
    delivery: String($("#deliveryFilter")?.value || "").trim(),
    equipment: String($("#equipmentFilter")?.value || "all"),
    minimumRpm: Number($("#rateFilter")?.value || 0),
    quickPay: Boolean($("#quickPayFilter")?.checked),
    sort: String($("#loadSort")?.value || "best"),
  };
}
function renderSavedLoadSearches() {
  const box = $("#savedLoadSearches");
  const count = $("#savedSearchCount");
  const searches = readJSON(storageKeys.savedLoadSearches, []);
  if (count)
    count.textContent = `${searches.length} saved search${searches.length === 1 ? "" : "es"}`;
  if (!box) return;
  box.innerHTML = searches
    .map(
      (search) =>
        `<button class="saved-search" type="button" data-apply-search="${escapeHtml(search.id)}"><strong>${escapeHtml(search.pickup || "Anywhere")} → ${escapeHtml(search.delivery || "Anywhere")}</strong><span>${escapeHtml(search.equipment === "all" ? "All equipment" : search.equipment)}${search.minimumRpm ? ` · $${search.minimumRpm}+/mi` : ""}</span></button>`,
    )
    .join("");
  $$("[data-apply-search]").forEach((button) => {
    button.onclick = () => {
      const search = searches.find(
        (item) => item.id === button.dataset.applySearch,
      );
      if (!search) return;
      if ($("#keywordFilter")) $("#keywordFilter").value = search.keyword || "";
      if ($("#pickupFilter")) $("#pickupFilter").value = search.pickup || "";
      if ($("#deliveryFilter"))
        $("#deliveryFilter").value = search.delivery || "";
      if ($("#equipmentFilter"))
        $("#equipmentFilter").value = search.equipment || "all";
      if ($("#rateFilter"))
        $("#rateFilter").value = String(search.minimumRpm || 0);
      if ($("#quickPayFilter"))
        $("#quickPayFilter").checked = Boolean(search.quickPay);
      if ($("#loadSort")) $("#loadSort").value = search.sort || "best";
      renderLoads();
    };
  });
}
function saveCurrentLoadSearch() {
  const search = currentLoadSearch();
  const current = readJSON(storageKeys.savedLoadSearches, []);
  const signature = JSON.stringify(search);
  if (
    current.some(
      (item) =>
        JSON.stringify({ ...item, id: undefined, savedAt: undefined }) ===
        signature,
    )
  ) {
    toast("That search is already saved.");
    return;
  }
  current.unshift({
    ...search,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  });
  writeJSON(storageKeys.savedLoadSearches, current.slice(0, 12));
  renderSavedLoadSearches();
  toast("Search saved. Use it anytime from the load board.");
}
function loadPickupTimestamp(load = {}) {
  const time = Date.parse(load.pickupAt || load.pick || "");
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}
function loadCard(
  l,
  locked = false,
  hint = "Verify your account, then request the pickup.",
) {
  const favorites = favoriteLoadIds();
  const isFavorite = favorites.has(String(l.id));
  const chips = (Array.isArray(l.tags) ? l.tags : [])
    .map(
      (tag) =>
        `<span class="chip ${tag.includes("Quick") ? "warn" : tag.includes("Verified") ? "good" : tag.includes("Machinery") ? "risk" : ""}">${escapeHtml(tag)}</span>`,
    )
    .join("");
  const actionLabel = locked ? "Verification required" : "Request pickup";
  const actionClass = locked ? "btn btn-outline" : "btn btn-primary";
  const autoChip = l.autoMode
    ? `<span class="chip good">${escapeHtml(autoTransportModeLabel(l.autoMode))}</span>`
    : "";
  const summaryParts = [
    l.trust ? `Trust ${l.trust}/100` : "New posting",
    l.pay ? `Pay ${l.pay}` : "",
    l.insurance || "Insurance pending",
  ].filter(Boolean);
  const thumb = equipmentThumbFor(l.eq);
  const media = thumb
    ? `<div class="load-thumb thumbed" style="--thumb-x:${thumb.x};--thumb-y:${thumb.y};--thumb-image:url('assets/truck-equipment-gallery.png')"></div>`
    : '<div class="load-thumb empty"><span>🚚</span></div>';
  const rpmValue =
    l.mi > 0 ? `$${rpm(l).toFixed(2)}/mi · ${l.mi} mi` : "Mileage not provided";
  return `<article class="card load-card"><div class="load-top"><div class="load-media">${media}<div class="load-copy"><div class="route">${escapeHtml(l.from)} → ${escapeHtml(l.to)}</div><p class="muted">${escapeHtml(l.broker || "Verified member")} · ${escapeHtml(l.pick || "Pickup time pending")} · ${escapeHtml(l.eq)}</p></div></div><div class="rate">${money(l.rate)}<small>${rpmValue}</small></div></div><p>${summaryParts.join(" · ")}</p><div class="chips">${chips}${autoChip}<span class="chip">${escapeHtml(l.wt || "Weight pending")}</span><span class="chip good">${escapeHtml(l.status || "open")}</span></div><div class="load-actions"><span class="muted">${escapeHtml(hint)}</span><div class="load-action-buttons"><button class="btn btn-soft favorite-btn ${isFavorite ? "active" : ""}" type="button" data-favorite-load="${escapeHtml(l.id)}" aria-pressed="${isFavorite}">${isFavorite ? "★ Saved" : "☆ Favorite"}</button><button class="${actionClass}" type="button" data-book="${escapeHtml(l.id || "")}" ${locked ? 'disabled aria-disabled="true"' : ""}>${actionLabel}</button></div></div></article>`;
}
function renderLoads() {
  const profile = getProfile();
  const box = $("#loadList");
  const count = $("#loadCount");
  if (isRequestOnlyAccount(profile)) {
    if (box)
      box.innerHTML =
        '<div class="card"><h3>Shipper plans do not include load claiming</h3><p class="muted">Use Post a load on the $9.99 plan. Drivers and carriers can then request the pickup.</p><button class="btn btn-primary" type="button" data-route="post">Post a load</button></div>';
    if (count) count.textContent = "Posting access only";
    return;
  }
  if (!loadCatalogLoaded) {
    if (box)
      box.innerHTML =
        '<div class="card"><h3>Loading load board…</h3><p class="muted">Fetching verified load data from the server.</p></div>';
    if (count) count.textContent = "Loading loads…";
    if (!loadCatalogPromise)
      loadLoadCatalog()
        .then(() => renderLoads())
        .catch(() => {});
    return;
  }
  const filters = currentLoadSearch();
  const keyword = filters.keyword.toLowerCase();
  const pick = filters.pickup.toLowerCase();
  const delivery = filters.delivery.toLowerCase();
  const status = pickupStatus();
  const verificationReady = bookingVerificationReady(profile);
  const locked = status.mode !== "open" || !verificationReady;
  const hint = !verificationReady
    ? bookingVerificationReason(profile)
    : status.mode === "full"
      ? `Pickup cap reached (${status.active}/${status.limit}). Complete or release a pickup first.`
      : "Request the pickup and track confirmation in your dashboard.";
  const catalog = loadCatalogItems();
  let list = catalog.filter((l) => {
    const haystack = [
      l.from,
      l.to,
      l.eq,
      l.broker,
      l.pick,
      l.wt,
      (l.tags || []).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!keyword || haystack.includes(keyword)) &&
      (!pick || l.from.toLowerCase().includes(pick)) &&
      (!delivery || l.to.toLowerCase().includes(delivery)) &&
      (filters.equipment === "all" ||
        l.kind === filters.equipment ||
        (filters.equipment === "liftgate" && l.lift) ||
        (filters.equipment === "ramp" && l.ramp)) &&
      (!filters.minimumRpm || (l.mi > 0 && rpm(l) >= filters.minimumRpm)) &&
      (!filters.quickPay || l.quick)
    );
  });
  if (filters.sort === "rpm")
    list.sort((a, b) => (b.mi ? rpm(b) : 0) - (a.mi ? rpm(a) : 0));
  else if (filters.sort === "rate") list.sort((a, b) => b.rate - a.rate);
  else if (filters.sort === "soonest")
    list.sort((a, b) => loadPickupTimestamp(a) - loadPickupTimestamp(b));
  if (box)
    box.innerHTML =
      list.map((l) => loadCard(l, locked, hint)).join("") ||
      '<div class="card empty-state"><h3>No open loads match yet</h3><p>Save this search or create a lane alert. New real postings will appear here without demo freight mixed in.</p></div>';
  if (count) count.textContent = `Open loads (${list.length})`;
  $$("[data-favorite-load]").forEach((button) => {
    button.onclick = () => {
      const current = favoriteLoadIds();
      const id = String(button.dataset.favoriteLoad || "");
      if (current.has(id)) current.delete(id);
      else current.add(id);
      writeJSON(storageKeys.favoriteLoads, [...current]);
      renderLoads();
    };
  });
  $$("[data-book]").forEach((button) => {
    button.onclick = async () => {
      const currentStatus = pickupStatus();
      if (currentStatus.mode !== "open") {
        toast(
          currentStatus.mode === "full"
            ? `Pickup cap reached (${currentStatus.active}/${currentStatus.limit}).`
            : "Your plan cannot claim loads.",
        );
        return;
      }
      if (!bookingVerificationReady(profile)) {
        toast(bookingVerificationReason(profile));
        route("carrier-verification");
        return;
      }
      const load = catalog.find((item) => item.id === button.dataset.book);
      if (!load) {
        toast("That load is no longer available.");
        return;
      }
      try {
        await apiRequest("/api/loads", {
          method: "POST",
          body: { action: "claim", loadId: load.id },
        });
      } catch (err) {
        toast(
          err?.data?.error || err.message || "Could not request this pickup.",
        );
        return;
      }
      const now = new Date().toISOString();
      const active = readJSON(storageKeys.activePickups, []);
      active.unshift({
        id: load.id,
        title: `${load.from} → ${load.to}`,
        origin: load.from,
        destination: load.to,
        equipment: load.eq,
        status: "Pickup requested",
        pickupWindow: load.pick,
        detail: `${load.eq} · ${money(load.rate)} · ${load.pick}`,
        statusHistory: [{ status: "Pickup requested", at: now }],
        savedAt: now,
      });
      writeJSON(storageKeys.activePickups, active.slice(0, 20));
      pushRecent(storageKeys.recentLoads, {
        title: `${load.from} → ${load.to}`,
        detail: `Pickup requested · ${load.eq} · ${money(load.rate)} · ${load.pick}`,
      });
      scheduleAccountSync();
      communicationAction("ensure-load-thread", {
        loadId: cleanString(load.id, 120),
        title: `${load.from} → ${load.to}`,
        company: load.broker || "",
        origin: load.from,
        destination: load.to,
        equipment: load.eq,
        description: [load.broker, load.pick, load.wt]
          .filter(Boolean)
          .join(" · "),
        participants: [profile.userId, profile.name, profile.company].filter(
          Boolean,
        ),
        approvedParticipantRoles: [
          "customer",
          "shipper",
          "broker",
          "dispatcher",
          "carrier",
          "driver",
          "loader",
          "receiver",
          "support",
        ],
      }).catch(() => {});
      toast(`Pickup requested: ${load.from} → ${load.to}`);
      renderProfile();
      renderLoads();
    };
  });
  renderSavedLoadSearches();
}
function initStats() {
  const catalog = loadCatalogItems();
  const avg = catalog.length
    ? catalog.reduce((s, l) => s + rpm(l), 0) / catalog.length
    : 0;
  const loads = $("#statLoads");
  const avgRate = $("#statAvgRate");
  if (loads) loads.textContent = catalog.length;
  if (avgRate) avgRate.textContent = "$" + avg.toFixed(2);
}
function initTiers() {
  const grid = $("#tierGrid");
  if (grid)
    grid.innerHTML = tiers
      .map(
        (t) =>
          `<article class="card tier reputation-level"><div class="badge">${t.badge}</div><h3>${t.name}</h3><p class="muted">Trust Score ${t.score}</p><strong>${t.milestone}</strong><p>${t.benefit}</p></article>`,
      )
      .join("");
  const scorecard = $("#driverScorecard");
  if (scorecard) {
    const profileSummary = americanTruckersTrustScore(getProfile());
    scorecard.innerHTML = `<div class="section-head"><h3>American Truckers Trust Score</h3><span class="tag">${trustBand(profileSummary.score)}</span></div><div><strong class="score">${profileSummary.score}</strong><span>/ 1000</span></div><div class="score-bars">${Object.entries(
      profileSummary.breakdown,
    )
      .map(
        ([label, value]) =>
          `<label title="${escapeHtml(label)}">${label} <span style="width:${value}%"></span></label>`,
      )
      .join(
        "",
      )}</div><p class="muted">Reliability 40% · professionalism 20% · freight safety 20% · experience 10% · verified feedback 10%. New accounts cannot outrank experienced professionals from one review.</p><div class="trust-rules">${trustLeaderboardRules.map((rule) => `<div class="tag">${escapeHtml(rule)}</div>`).join("")}</div>`;
  }
}
function initVerification() {
  const grid = $("#verificationGrid");
  if (grid)
    grid.innerHTML = verificationItems
      .map(
        (v) =>
          `<article class="card"><h3>${v[0]}</h3><p class="muted">${v[1]}</p></article>`,
      )
      .join("");
  const ledger = $("#trustLedger");
  if (ledger)
    ledger.innerHTML = brokerTrust
      .map(
        (b) =>
          `<article class="card trust-row"><div><h3>${b.name}</h3><p class="muted">${b.notes}</p></div><div class="trust-score"><strong>${b.score}</strong><span>trust</span></div><div><span class="tag">Pay ${b.pay}</span> <span class="tag">${b.quick}</span> <span class="tag">${b.risk} risk</span></div></article>`,
      )
      .join("");
  const scale = $("#ratingScale");
  if (scale)
    scale.innerHTML = trustScale
      .map(
        (r) =>
          `<div class="rating-row"><strong>${r[0]}</strong><span>${r[1]}</span><small>${r[2]}</small></div>`,
      )
      .join("");
  renderTrustSummary();
  renderTrustNotes();
  renderRoleScorecards();
  renderPerformanceWindowSummary();
  renderLeaderboardBrowser();
  renderDisputeTargets();
  renderDisputeList();
}
function renderProfile() {
  const profile = getProfile();
  updateAccessChrome(profile);
  const laneAlerts = readJSON(storageKeys.laneAlerts, []);
  const recentLoads = readJSON(storageKeys.recentLoads, []);
  const recentRequests = readJSON(storageKeys.recentRequests, []);
  const messages = readJSON(storageKeys.messages, []);
  const plannedTrips = readJSON(storageKeys.plannedTrips, []);
  const activePickups = readJSON(storageKeys.activePickups, []);
  const workspaceKey = normalizeWorkspace(
    readJSON(storageKeys.profileView, workspaceFromProfile(profile)),
  );
  const workspace = workspaceContent(workspaceKey);
  const paymentLabel =
    profile.subscriptionStatus && profile.subscriptionStatus !== "unpaid"
      ? humanPaymentStatus(profile.subscriptionStatus)
      : "Not paid yet";
  const tags = Array.isArray(profile.tags) ? profile.tags : [];
  const status = pickupStatus(profile);
  const activeBox = $("#activePickupCount");
  if (activeBox)
    activeBox.textContent = `${status.active}/${status.limit === Infinity ? "∞" : status.limit}`;
  const pickupList = $("#profilePickups");
  if (pickupList) {
    pickupList.innerHTML = activePickups.length
      ? activePickups
          .map(
            (item, index) =>
              `<article class="mini-item pickup-tracker"><div class="section-head"><strong>${escapeHtml(item.title)}</strong><span class="tag good">${escapeHtml(item.status || "Pickup requested")}</span></div><span>${escapeHtml(item.detail)}</span><small>${item.savedAt ? new Date(item.savedAt).toLocaleString() : ""}</small><div class="pickup-status-rail"><span>Requested</span><span>Confirmed</span><span>Picked up</span><span>In transit</span><span>Delivered</span></div><div class="comm-actions"><button class="btn btn-soft" data-advance-pickup="${index}">Advance status</button><button class="btn btn-soft" data-dropoff="${index}">Complete delivery</button></div></article>`,
          )
          .join("")
      : `<div class="empty-state"><h4>No active pickups</h4><p>${status.mode === "request" ? "This account can request pickups only." : "Claim a load to see it here."}</p></div>`;
    $$("[data-advance-pickup]").forEach((btn) => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.advancePickup);
        const saved = readJSON(storageKeys.activePickups, []);
        const item = saved[idx];
        if (!item) return;
        const stages = [
          "Pickup requested",
          "Confirmed",
          "Picked up",
          "In transit",
          "Delivered",
        ];
        const current = Math.max(
          0,
          stages.indexOf(item.status || "Pickup requested"),
        );
        item.status = stages[Math.min(stages.length - 1, current + 1)];
        item.statusHistory = [
          ...(Array.isArray(item.statusHistory) ? item.statusHistory : []),
          { status: item.status, at: new Date().toISOString() },
        ].slice(-20);
        writeJSON(storageKeys.activePickups, saved);
        scheduleAccountSync();
        renderProfile();
        toast(`Pickup status: ${item.status}`);
      };
    });
    $$("[data-dropoff]").forEach(
      (btn) =>
        (btn.onclick = () => {
          const idx = Number(btn.dataset.dropoff);
          const saved = readJSON(storageKeys.activePickups, []);
          const done = saved.splice(idx, 1)[0];
          writeJSON(storageKeys.activePickups, saved);
          if (done) {
            const completedAt = new Date().toISOString();
            const reviewerId = String(
              profile.userId || profile.email || "",
            ).trim();
            const tx = {
              id: crypto.randomUUID(),
              verified: true,
              completedAt,
              completedBy: reviewerId,
              reviewerName: profile.name || "You",
              counterpartyName:
                done.broker ||
                done.customer ||
                done.title ||
                "Verified counterparty",
              reviewTargetType: "shipper",
              title:
                done.title ||
                `${done.origin || "Pickup"} → ${done.destination || "Delivery"}`,
              origin: done.origin || "",
              destination: done.destination || "",
              equipment: done.equipment || "",
              detail: done.detail || "",
              loadId: done.loadId || done.id || "",
              reviewWindowDays: 30,
            };
            const txs = verifiedTransactions();
            txs.unshift(tx);
            saveVerifiedTransactions(txs);
            const trips = readJSON(storageKeys.plannedTrips, []);
            trips.unshift({
              title: done.title,
              origin: done.origin || "",
              destination: done.destination || "",
              date: "",
              equipment: done.equipment || "",
              notes: "Completed pickup",
            });
            writeJSON(storageKeys.plannedTrips, trips.slice(0, 12));
          }
          scheduleAccountSync();
          renderProfile();
          toast("Marked pickup dropped off.");
        }),
    );
  }
  $$(".profile-tab").forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.profileView === workspaceKey),
  );
  $("#profileName").textContent = profile.name || "Guest";
  $("#profileRole").textContent = profileRoleLabel(profile.type);
  $("#profileStatus").textContent = bookingVerificationReady(profile)
    ? "Approved for booking"
    : !String(
          profile.emailVerifiedAt ||
            profile.memberAccess?.emailVerifiedAt ||
            "",
        ).trim() && !profile.memberAccess?.emailVerified
      ? "Email verification required"
      : !isPaidProfile(profile)
        ? "Payment required"
        : profile.adminApproval &&
            String(profile.adminApproval).toLowerCase() !== "pending"
          ? String(profile.adminApproval)
          : profile.verification || paymentLabel || "Not verified";
  $("#profileType").textContent = profileTypeLabel(profile.type);
  $("#profileEmail").textContent = profile.email || "Not set";
  const preferredLanguageLabel = bulletinLanguageLabel(
    profile.preferredLanguage || "en",
  );
  if ($("#profileLanguage"))
    $("#profileLanguage").textContent = preferredLanguageLabel;
  const languageSummary =
    profile.showLanguagesSpoken && profile.languagesSpokenLabel
      ? profile.languagesSpokenLabel
      : "";
  const profileLanguages = $("#profileLanguages");
  if (profileLanguages) {
    if (languageSummary) {
      profileLanguages.hidden = false;
      profileLanguages.textContent = languageSummary;
    } else {
      profileLanguages.hidden = true;
      profileLanguages.textContent = "";
    }
  }
  const profileLanguageForm = $("#profileLanguageForm");
  const profileLanguageSelect = profileLanguageForm?.querySelector(
    '[name="preferredLanguage"]',
  );
  const profileTranslationSelect = profileLanguageForm?.querySelector(
    '[name="preferredTranslationLanguage"]',
  );
  const additionalLanguagesField = profileLanguageForm?.querySelector(
    '[name="additionalLanguages"]',
  );
  const autoTranslateField = profileLanguageForm?.querySelector(
    '[name="autoTranslateMessages"]',
  );
  const alwaysShowOriginalField = profileLanguageForm?.querySelector(
    '[name="alwaysShowOriginalMessages"]',
  );
  const transcribeField = profileLanguageForm?.querySelector(
    '[name="transcribeAndTranslateVoiceNotes"]',
  );
  const showSpokenField = profileLanguageForm?.querySelector(
    '[name="showLanguagesSpoken"]',
  );
  if (profileLanguageSelect)
    profileLanguageSelect.value = profile.preferredLanguage || "en";
  if (profileTranslationSelect)
    profileTranslationSelect.value =
      profile.preferredTranslationLanguage || profile.preferredLanguage || "en";
  if (additionalLanguagesField)
    Array.from(additionalLanguagesField.options).forEach(
      (option) =>
        (option.selected =
          Array.isArray(profile.additionalLanguages) &&
          profile.additionalLanguages.includes(option.value)),
    );
  if (autoTranslateField)
    autoTranslateField.checked = Boolean(profile.autoTranslateMessages);
  if (alwaysShowOriginalField)
    alwaysShowOriginalField.checked =
      profile.alwaysShowOriginalMessages !== false;
  if (transcribeField)
    transcribeField.checked =
      profile.transcribeAndTranslateVoiceNotes !== false;
  if (showSpokenField)
    showSpokenField.checked = Boolean(profile.showLanguagesSpoken);
  $("#profileCompany").textContent = profile.company || "Not set";
  $("#profileNote").textContent =
    profile.note ||
    "Set up your account to keep your own loads, requests, and future trucking plans in one place.";
  $("#profileTags").innerHTML = tags.length
    ? tags.map((tag) => `<span class="profile-tag">${tag}</span>`).join("")
    : '<span class="profile-tag empty">No tags yet</span>';
  $("#profileLaneCount").textContent = laneAlerts.length;
  $("#profileViewList").innerHTML = workspace.bullets
    .map((text) => `<li>${text}</li>`)
    .join("");
  $("#profileWorkspaceLabel").textContent = workspace.label;
  $("#profileWorkspaceTitle").textContent = workspace.title;
  $("#profileWorkspaceCopy").textContent = workspace.copy;
  $("#profileWorkspaceMetrics").innerHTML = workspace.metrics
    .map(
      ([title, detail]) =>
        `<div><strong>${title}</strong><span>${detail}</span></div>`,
    )
    .join("");
  const messageCount = $("#messageCount");
  if (messageCount) messageCount.textContent = String(messages.length);
  const manageBillingBtn = $("#manageBillingBtn");
  if (manageBillingBtn) {
    const billingVisible = hasProfileIdentity(profile);
    manageBillingBtn.hidden = !billingVisible;
    manageBillingBtn.disabled = !billingVisible;
    manageBillingBtn.onclick = async () => {
      try {
        manageBillingBtn.disabled = true;
        toast("Opening Stripe Billing Portal…");
        await openBillingPortal();
      } catch (err) {
        toast(
          (err && err.data && err.data.error) ||
            "Could not open billing portal.",
        );
      } finally {
        manageBillingBtn.disabled = !hasProfileIdentity(getProfile());
      }
    };
  }
  const logoutBtn = $("#logoutBtn");
  if (logoutBtn) logoutBtn.onclick = () => logoutAccount();
  renderMessages(profile);
  renderTrustSummary();
  renderPublicProfileCard();
  renderRoleScorecards();
  renderPerformanceWindowSummary();
  renderLeaderboardBrowser();
  renderTrustBadges();
  renderReviewTargets();
  renderTrustNotes();
  renderRewardsCenter();
  renderDisputeTargets();
  renderDisputeList();
  renderFraudDashboard();
  const fraudBox = $("#fraudWarning");
  const fraud = fraudRiskSummary(profile, leaderboardPeers);
  if (fraudBox) {
    fraudBox.hidden = !fraud.flagged;
    fraudBox.textContent = fraud.summary;
  }
  const postForm = $("#postForm");
  if (postForm) {
    const submit = postForm.querySelector('button[type="submit"]');
    const gate = serviceAccessState(profile, "post");
    const allowed = gate.allowed;
    const notice = postForm.querySelector(".notice");
    if (submit) {
      submit.disabled = !allowed;
      submit.setAttribute("aria-disabled", String(!allowed));
      submit.textContent = allowed
        ? "Preview load before posting"
        : gate.route === "signup"
          ? "Sign in or create an account"
          : "Upgrade to post loads";
      submit.title = allowed
        ? ""
        : gate.message || "Fleet or broker access required to post loads";
    }
    if (notice)
      notice.textContent = allowed
        ? "🛡️ Load goes live only to verified carriers. Add photos and handling details to prevent surprise labor issues."
        : `🔒 ${gate.message || "Sign in and complete checkout before posting loads."}`;
  }
  const requestForm = $("#directRequestForm");
  if (requestForm) {
    const submit = requestForm.querySelector('button[type="submit"]');
    const gate = serviceAccessState(profile, "request");
    const allowed = gate.allowed;
    const notice = requestForm.querySelector(".notice");
    if (submit) {
      submit.disabled = !allowed;
      submit.setAttribute("aria-disabled", String(!allowed));
      submit.textContent = allowed
        ? "Submit request"
        : "Sign in or create account";
      submit.title = allowed
        ? ""
        : gate.message || "Complete checkout to submit a request";
    }
    if (notice)
      notice.textContent = allowed
        ? "🧾 Request-only customers can submit pickup requests after checkout."
        : `🔒 ${gate.message || "Complete checkout before submitting a request."}`;
  }
  const bulletinForm = $("#bulletinForm");
  if (bulletinForm) {
    const submit = bulletinForm.querySelector('button[type="submit"]');
    const gate = serviceAccessState(profile, "bulletin");
    const allowed = gate.allowed;
    const notice = bulletinForm.querySelector(".notice");
    if (submit) {
      submit.disabled = !allowed;
      submit.setAttribute("aria-disabled", String(!allowed));
      submit.textContent = allowed
        ? "Post to bulletin board"
        : "Sign in or complete checkout";
      submit.title = allowed
        ? ""
        : gate.message || "Paid access required to post on the bulletin board";
    }
    if (notice)
      notice.textContent = allowed
        ? "🌍 Everyone can see this. Keep it useful, short, and clear."
        : `🔒 ${gate.message || "Paid access required to post on the bulletin board."}`;
  }
  $("#recentLoadCount").textContent = recentLoads.length;
  $("#recentRequestCount").textContent = recentRequests.length;
  $("#plannedTripCount").textContent = plannedTrips.length;
  renderList(
    "#profileLoads",
    recentLoads,
    `<div class="empty-state"><h4>No recent loads yet</h4><p>Book or save a load from the board and it will show up here.</p></div>`,
    (item) =>
      `<article class="mini-item"><strong>${item.title}</strong><span>${item.detail}</span></article>`,
  );
  renderList(
    "#profileRequests",
    recentRequests,
    `<div class="empty-state"><h4>No recent requests yet</h4><p>Customer requests you respond to will appear here.</p></div>`,
    (item) =>
      `<article class="mini-item"><strong>${item.title}</strong><span>${item.detail}</span></article>`,
  );
  renderList(
    "#profileTrips",
    plannedTrips,
    `<div class="empty-state"><h4>No planned trips yet</h4><p>Save a future trip below so you can track upcoming trucking work.</p></div>`,
    (item) =>
      `<article class="mini-item"><strong>${item.title}</strong><span>${formatWhen(item.date)} · ${item.origin} → ${item.destination}</span><small>${item.equipment || "Any equipment"}${item.notes ? ` · ${item.notes}` : ""}</small></article>`,
  );
}
function humanPaymentStatus(value = "") {
  const map = {
    active: "Paid",
    trialing: "Trialing",
    past_due: "Past due",
    canceled: "Canceled",
    unpaid: "Not paid",
    paid_shipper: "Paid Shippers Plan",
    paid_driver: "Paid Driver Plan",
    paid_fleet_starter: "Paid Fleet Starter",
    paid_fleet_growth: "Paid Fleet Growth",
    paid_fleet_pro: "Paid Fleet Pro",
    paid: "Paid",
  };
  return map[String(value || "").toLowerCase()] || value;
}
function checkoutStatusFromParams() {
  const params = new URLSearchParams(location.search);
  const raw = String(
    params.get("plan") || params.get("tier") || params.get("type") || "",
  )
    .trim()
    .toLowerCase();
  const compact = raw.replace(/\s+/g, "-").replace(/[()]/g, "");
  if (compact === "driver" || /driver/.test(raw)) return "paid_driver";
  if (compact === "fleet-starter" || /1[-–]3/.test(raw))
    return "paid_fleet_starter";
  if (compact === "fleet-growth" || /4[-–]7/.test(raw))
    return "paid_fleet_growth";
  if (compact === "fleet-pro" || /7[-–]12/.test(raw)) return "paid_fleet_pro";
  return raw ? "paid_shipper" : null;
}
function applyCheckoutStateFromUrl() {
  const params = new URLSearchParams(location.search);
  const profile = getProfile();
  const next = Object.assign({}, profile);
  const email = params.get("email");
  if (email) next.email = email;
  const verifyToken = params.get("verify_token");
  if (verifyToken) next.pendingVerificationToken = verifyToken;
  const resetToken = params.get("reset_token");
  if (resetToken) next.pendingResetToken = resetToken;
  writeJSON(storageKeys.profile, next);
}

const checkoutPlans = {
  shipper: {
    label: "Customer Pickup Request",
    price: "$9.99/mo",
    href: "https://buy.stripe.com/fZu4gA5B06AH6UWepqaVa00",
    copy: "Post freight or pickup requests on the $9.99 plan, but do not view or claim other people’s loads.",
    tags: ["Post loads", "For shippers", "No load claiming"],
    cta: "Continue to checkout",
  },
  driver: {
    label: "Independent Driver",
    price: "$29.99/mo",
    href: "https://buy.stripe.com/28EdRa9RgcZ53IKbdeaVa01",
    copy: "For self-insured drivers and owner-operators who need to post loads and find work.",
    tags: ["Post loads", "Browse and claim loads", "Saved lanes"],
    cta: "Continue to checkout",
  },
  "fleet-starter": {
    label: "Broker 1–3 Trucks",
    price: "$59.99/mo",
    href: "https://buy.stripe.com/3cI4gA8Nc6AH6UW6WYaVa02",
    copy: "For small brokers and fleets covering early demand.",
    tags: ["View demand", "Claim loads", "Post covered freight"],
    cta: "Continue to checkout",
  },
  "fleet-growth": {
    label: "Broker 4–7 Trucks",
    price: "$79.99/mo",
    href: "https://buy.stripe.com/00w00kfbAcZ52EG5SUaVa04",
    copy: "For growing teams with more truck coverage.",
    tags: ["Post loads", "Priority visibility", "Saved lanes"],
    cta: "Continue to checkout",
  },
  "fleet-pro": {
    label: "Broker 7–12 Trucks",
    price: "$149.99/mo",
    href: "https://buy.stripe.com/3cIcN69RgaQXbbcftuaVa03",
    copy: "For higher-capacity teams covering more lanes.",
    tags: ["Post loads", "Priority matching", "Early broker access"],
    cta: "Continue to checkout",
  },
};

function initPlanChooser() {
  const wrap = $("#planChooser");
  if (!wrap) return;
  const title = $("#planChoiceTitle");
  const copy = $("#planChoiceCopy");
  const meta = $("#planChoiceMeta");
  const cta = $("#planChoiceCta");
  const signupType = $('form#signupForm [name="type"]');
  const buttons = Array.from(wrap.querySelectorAll("[data-plan-choice]"));
  const cards = Array.from(document.querySelectorAll("[data-plan-card]"));
  const setPlan = (key) => {
    const planKey = checkoutPlans[key] ? key : "shipper";
    const plan = checkoutPlans[planKey];
    writeJSON(storageKeys.checkoutPlan, planKey);
    if (title) title.textContent = plan.label;
    if (copy) copy.textContent = plan.copy;
    if (cta) {
      cta.href = "#signup";
      cta.textContent = "Save account & continue to payment";
      cta.target = "_self";
      cta.rel = "";
    }
    if (signupType)
      signupType.value =
        planKey === "driver"
          ? "Independent driver / self-insured - $29.99/mo"
          : planKey === "fleet-starter"
            ? "Broker 1–3 trucks - $59.99/mo"
            : planKey === "fleet-growth"
              ? "Broker 4–7 trucks - $79.99/mo"
              : planKey === "fleet-pro"
                ? "Broker 7–12 trucks - $149.99/mo"
                : "Customer needing pickup (request-only) - $9.99/mo";
    if (meta)
      meta.innerHTML = [plan.price, ...plan.tags]
        .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join("");
    buttons.forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.planChoice === planKey),
    );
    cards.forEach((card) =>
      card.classList.toggle("active", card.dataset.planCard === planKey),
    );
  };
  const choose = (key) => () => setPlan(key);
  buttons.forEach((btn) =>
    btn.addEventListener("click", choose(btn.dataset.planChoice)),
  );
  cards.forEach((card) => {
    card.addEventListener("click", () => setPlan(card.dataset.planCard));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setPlan(card.dataset.planCard);
      }
    });
  });
  setPlan(readJSON(storageKeys.checkoutPlan, "shipper") || "shipper");
}

function requestBidStore() {
  return readJSON(storageKeys.requestBids, {});
}
function saveRequestBidStore(store) {
  writeJSON(storageKeys.requestBids, store);
  scheduleAccountSync();
}
function requestBidsFor(id) {
  const store = requestBidStore();
  return Array.isArray(store[id]) ? store[id] : [];
}
function placeRequestBid(req) {
  const profile = getProfile();
  const entered = prompt(
    `What price will you haul ${req.from} → ${req.to} for?`,
    req.budget.replace(/[^\d.]/g, ""),
  );
  if (entered === null) return;
  const amount = Number(String(entered).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    toast("Enter a real bid amount.");
    return;
  }
  const note = prompt("Optional note (equipment, timing, questions)", "") || "";
  const bid = {
    id: crypto.randomUUID(),
    requestId: req.id,
    bidderName: profile.name || "Driver",
    bidderRole: profileRoleLabel(profile.type),
    amount,
    note,
    createdAt: new Date().toISOString(),
    accepted: false,
  };
  const store = requestBidStore();
  store[req.id] = [
    bid,
    ...requestBidsFor(req.id).filter((item) => !item.accepted),
  ].slice(0, 12);
  saveRequestBidStore(store);
  toast(`Bid saved: ${money(amount)} on ${req.from} → ${req.to}`);
  renderRequests();
  renderProfile();
}
function acceptRequestBid(req, bid) {
  const store = requestBidStore();
  const current = requestBidsFor(req.id);
  store[req.id] = current.map((item) =>
    Object.assign({}, item, { accepted: item.id === bid.id }),
  );
  saveRequestBidStore(store);
  toast(`Accepted ${money(bid.amount)} for ${req.from} → ${req.to}`);
  renderRequests();
  renderProfile();
}
function renderRequests() {
  const box = $("#requestList");
  if (!box) return;
  box.innerHTML = directRequests
    .map((r, index) => {
      const bids = requestBidsFor(r.id);
      const acceptedBid = bids.find((bid) => bid.accepted);
      const bestBid = bids.length
        ? bids.reduce(
            (best, bid) => (!best || bid.amount < best.amount ? bid : best),
            null,
          )
        : null;
      const bidHtml = bids.length
        ? `<div class="request-bids">${bids.map((bid) => `<article class="mini-item ${bid.accepted ? "accepted" : ""}"><strong>${money(bid.amount)} · ${escapeHtml(bid.bidderName || "Driver")}</strong><span>${escapeHtml(bid.note || "No note")}</span><small>${bid.bidderRole || "Driver"}${bid.accepted ? " · Accepted by shipper" : ""} · ${bid.createdAt ? new Date(bid.createdAt).toLocaleString() : ""}</small><button class="btn btn-soft" data-accept-bid="${r.id}" data-bid-id="${bid.id}">${bid.accepted ? "Accepted" : "Accept this bid"}</button></article>`).join("")}</div>`
        : "";
      const autoChip = r.transportMode
        ? `<span class="chip good">${escapeHtml(autoTransportModeLabel(r.transportMode))}</span>`
        : "";
      const thumb = equipmentThumbFor(r.equipment);
      const media = thumb
        ? `<div class="request-thumb thumbed" style="--thumb-x:${thumb.x};--thumb-y:${thumb.y};--thumb-image:url('assets/truck-equipment-gallery.png')"></div>`
        : '<div class="request-thumb empty"><span>📦</span></div>';
      return `<article class="card request-card"><div class="request-top"><div class="request-media">${media}<div><div class="request-badge">Direct load</div><div class="route">${r.from} → ${r.to}</div><p class="muted request-meta">${r.customer} · ${r.when} · ${r.equipment}</p></div></div><div class="request-rate">${r.budget}<small>customer target</small></div></div><p class="request-copy">${r.details}</p><div class="chips request-chips"><span class="chip good">Needs coverage</span>${autoChip}<span class="chip warn">Needs verification</span><span class="chip">Broker/carrier visible</span>${bestBid ? `<span class="chip good">Best bid ${money(bestBid.amount)}</span>` : ""}${acceptedBid ? `<span class="chip good">Accepted ${money(acceptedBid.amount)}</span>` : ""}<span class="chip">${bids.length} bid${bids.length === 1 ? "" : "s"}</span></div><div class="load-actions request-actions"><span class="muted">Shippers can choose any bid that fits their company needs.</span><button class="btn btn-soft" data-bid="${index}">Place bid</button><button class="btn btn-primary" data-request="${index}">Respond</button></div>${bidHtml}</article>`;
    })
    .join("");
  $$("[data-bid]").forEach(
    (b) =>
      (b.onclick = () =>
        placeRequestBid(directRequests[Number(b.dataset.bid)])),
  );
  $$("[data-accept-bid]").forEach(
    (b) =>
      (b.onclick = () => {
        const req = directRequests.find(
          (item) => item.id === b.dataset.acceptBid,
        );
        if (!req) return;
        const bid = requestBidsFor(req.id).find(
          (item) => item.id === b.dataset.bidId,
        );
        if (!bid) return;
        acceptRequestBid(req, bid);
      }),
  );
  $$("[data-request]").forEach(
    (b) =>
      (b.onclick = () => {
        const req = directRequests[Number(b.dataset.request)];
        pushRecent(storageKeys.recentRequests, {
          title: `${req.from} → ${req.to}`,
          detail: `${req.customer} · ${req.equipment} · ${req.when}`,
        });
        toast(`Saved to your profile: ${req.from} → ${req.to}`);
        renderProfile();
        renderLoads();
      }),
  );
}
function initRoadmap() {
  $("#roadmapList").innerHTML = roadmap
    .map(
      (r) =>
        `<article class="card roadmap-item"><div class="priority">${r[0]}</div><div><h3>${r[1]}</h3><p class="muted">${r[2]}</p></div><span class="tag">${r[3]}</span></article>`,
    )
    .join("");
}
function initForms() {
  const newsletter = $("#newsletterForm");
  if (newsletter)
    newsletter.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const status = $("#newsletterStatus");
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      if (status) status.textContent = "Joining…";
      try {
        await apiRequest("/api/leads", {
          method: "POST",
          body: {
            type: "Morning trucking newsletter",
            name: String(
              form.querySelector('[name="name"]')?.value || "",
            ).trim(),
            email: String(
              form.querySelector('[name="email"]')?.value || "",
            ).trim(),
            notes: "Weekday morning educational trucking newsletter",
            consent: Boolean(form.querySelector('[name="consent"]')?.checked),
          },
        });
        form.reset();
        if (status)
          status.textContent =
            "You are on the list. Watch your inbox for practical trucking updates.";
        toast("Newsletter signup saved.");
      } catch (err) {
        if (status)
          status.textContent =
            err?.data?.error || "Newsletter signup failed. Please try again.";
        toast("Newsletter signup could not be saved.");
      } finally {
        button.disabled = false;
      }
    });
  const signup = $("#signupForm");
  if (signup)
    signup.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const email = String(
        form.querySelector('[name="email"]').value || "",
      ).trim();
      const password = String(
        form.querySelector('[name="password"]').value || "",
      ).trim();
      if (!email || !password) {
        toast("Enter your email and password.");
        return;
      }
      const planKey =
        readJSON(storageKeys.checkoutPlan, "shipper") || "shipper";
      const plan = checkoutPlans[planKey] || checkoutPlans.shipper;
      const type = String(
        form.querySelector('[name="type"]').value || "",
      ).trim();
      const profile = {
        name: String(form.querySelector('[name="name"]').value || "").trim(),
        company: String(
          form.querySelector('[name="company"]').value || "",
        ).trim(),
        email,
        type,
        truckCount:
          Number(form.querySelector('[name="truck_count"]').value || 0) || 0,
        mc_dot: String(
          form.querySelector('[name="mc_dot"]').value || "",
        ).trim(),
        preferredLanguage: String(
          form.querySelector('[name="preferredLanguage"]')?.value || "en",
        ).trim(),
        checkoutPlan: readJSON(storageKeys.checkoutPlan, "") || "",
        profileView: workspaceFromProfile({ type }),
      };
      try {
        const data = await registerAccount(profile, password);
        if (data?.verificationToken) {
          writeJSON(
            storageKeys.profile,
            Object.assign(readJSON(storageKeys.profile, {}), {
              pendingVerificationToken: data.verificationToken,
              pendingVerificationEmail: email,
            }),
          );
        }
        const accountNotice = $("#accountNotice");
        if (accountNotice) {
          accountNotice.hidden = false;
          accountNotice.textContent = data?.verificationRequired
            ? `Verify ${email} before member access opens. We prepared a verification link for this account.`
            : "Account saved. Continue to Stripe to finish payment.";
        }
        toast(
          data?.verificationRequired
            ? "Account saved. Verify your email, then continue to payment."
            : "Account saved. Continue to Stripe to finish payment.",
        );
        if (!data?.memberAccess?.entitled) location.href = plan.href;
      } catch {
        toast("Could not save your profile right now.");
      }
    });
  const signin = $("#signinForm");
  if (signin)
    signin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const email = String(
        form.querySelector('[name="email"]').value || "",
      ).trim();
      const secret = String(
        form.querySelector('[name="password"]')?.value ||
          form.querySelector('[name="access_code"]')?.value ||
          "",
      ).trim();
      if (!email || !secret) {
        toast("Email and password are required.");
        return;
      }
      try {
        const data = await loginAccount(email, secret);
        const dashboardRoute = String(
          data?.dashboardRoute || data?.memberAccess?.dashboardRoute || "",
        ).trim();
        const accessRoute = String(
          data?.accessRoute || data?.memberAccess?.accessRoute || "",
        ).trim();
        const redirectTarget = String(
          new URLSearchParams(location.search).get("redirect") || "",
        ).trim();
        const nextView = normalizeWorkspace(
          data?.profileView || dashboardRoute || "",
        );
        if (dashboardRoute === "admin") {
          location.href = "/admin.html";
          return;
        }
        if (dashboardRoute === "profile-completion") {
          route("signup");
          toast(data?.notice || "Signed in.");
          return;
        }
        if (dashboardRoute === "renewal" || accessRoute === "billing") {
          route("billing");
          toast(data?.notice || "Signed in.");
          return;
        }
        if (dashboardRoute === "plan-selection" || accessRoute === "pricing") {
          route("pricing");
          toast(data?.notice || "Signed in.");
          return;
        }
        if (accessRoute === "verify" || dashboardRoute === "verify") {
          route("verify");
          toast(data?.notice || "Signed in.");
          return;
        }
        if (
          ["provider", "moving", "customer", "broker", "driver"].includes(
            nextView,
          )
        ) {
          writeJSON(storageKeys.profileView, nextView);
          location.hash = "profile";
          route("profile");
          return;
        }
        if (redirectTarget) {
          try {
            const nextUrl = new URL(redirectTarget, location.origin);
            if (
              nextUrl.origin === location.origin &&
              !/^\/(pricing|account\/billing|signin|sign-in|login|admin)(\.html)?(\/|$)/i.test(
                nextUrl.pathname,
              )
            ) {
              location.href = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
              return;
            }
          } catch {}
        }
        toast(data?.notice || "Welcome back to Relocation Manager USA.");
        location.hash = "profile";
        route("profile");
      } catch (err) {
        toast(
          "We couldn't sign you in. Check your email and password, then try again.",
        );
      }
    });
  const logoutBtn = $("#logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutAccount);
  const verifyForm = $("#verifyForm");
  if (verifyForm)
    verifyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = String(
        verifyForm.querySelector('[name="verificationToken"]')?.value ||
          readJSON(storageKeys.profile, {}).pendingVerificationToken ||
          new URLSearchParams(location.search).get("verify_token") ||
          "",
      ).trim();
      if (!token) {
        toast("Enter your verification token.");
        return;
      }
      try {
        const data = await apiRequest("/api/account", {
          method: "POST",
          body: { action: "verify-email", token },
        });
        mergeAccountState(data);
        const notice = $("#accountNotice");
        if (notice) {
          notice.hidden = false;
          notice.textContent =
            "Email verified. You can continue to checkout or sign in again.";
        }
        toast("Email verified.");
        route("signin");
      } catch (err) {
        toast((err && err.data && err.data.error) || "Verification failed.");
      }
    });
  const resetForm = $("#resetForm");
  if (resetForm)
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = String(
        resetForm.querySelector('[name="resetToken"]')?.value ||
          new URLSearchParams(location.search).get("reset_token") ||
          "",
      ).trim();
      const email = String(
        resetForm.querySelector('[name="email"]')?.value || "",
      ).trim();
      const password = String(
        resetForm.querySelector('[name="newPassword"]')?.value || "",
      ).trim();
      if (!email || !token || !password) {
        toast("Enter your reset token and new password.");
        return;
      }
      try {
        const data = await apiRequest("/api/account", {
          method: "POST",
          body: { action: "reset-password", token, password, email },
        });
        mergeAccountState(data);
        toast(data?.notice || "Password updated. Please sign in again.");
        route("signin");
      } catch (err) {
        toast((err && err.data && err.error) || "Password reset failed.");
      }
    });
  const bulletinForm = $("#bulletinForm");
  if (bulletinForm)
    bulletinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const profile = getProfile();
      if (!canPostBulletin(profile)) {
        toast("Sign in and complete checkout to post on the bulletin board.");
        return;
      }
      const authorName =
        bulletinForm.querySelector('[name="authorName"]').value ||
        profile.name ||
        "Community";
      const language =
        preferredBulletinLanguage(profile) ||
        bulletinForm.querySelector('[name="language"]').value ||
        "en";
      const subject =
        bulletinForm.querySelector('[name="subject"]').value || "Board update";
      const body = bulletinForm.querySelector('[name="body"]').value || "";
      if (!body.trim()) {
        toast("Add a bulletin message first.");
        return;
      }
      const post = {
        authorName,
        authorRole: profileRoleLabel(profile.type),
        authorEmail: profile.email || "",
        language,
        subject,
        body,
        createdAt: new Date().toISOString(),
        translations: {},
      };
      try {
        await postBulletin(post);
        bulletinForm.reset();
        toast("Posted to the bulletin board.");
      } catch {
        toast("Bulletin post failed. Please try again.");
      }
    });
  const messageForm = $("#messageForm");
  if (messageForm)
    messageForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const profile = getProfile();
      const recipient =
        messageForm.querySelector('[name="recipient"]').value ||
        messageRecipientLabel(profile);
      const subject =
        messageForm.querySelector('[name="subject"]').value || "Pickup details";
      const body = messageForm.querySelector('[name="body"]').value || "";
      if (!body.trim()) {
        toast("Add a message first.");
        return;
      }
      pushMessage({
        thread: messageThreadTitle(profile),
        to: recipient,
        toLabel: recipient,
        fromName: profile.name || "You",
        fromRole: profileRoleLabel(profile.type),
        fromEmail: profile.email || "",
        subject,
        body,
        read: false,
      });
      messageForm.reset();
      renderProfile();
      toast(`Message sent to ${recipient}.`);
    });
  ["postForm", "ratingForm", "disputeForm", "directRequestForm"].forEach(
    (id) => {
      const form = $("#" + id);
      if (form)
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const profile = getProfile();
          if (id === "postForm") {
            const gate = serviceAccessState(profile, "post");
            if (!gate.allowed) {
              toast(gate.message || "Complete checkout first.");
              route(gate.route || "signup");
              return;
            }
            const field = (name) => form.querySelector(`[name="${name}"]`);
            const autoMode = field("auto_transport_mode")?.value || "";
            const directLoad = field("direct_load")?.checked !== false;
            const equipment =
              field("equipment_needed")?.value || "Equipment needed";
            const detailParts = [
              equipment,
              field("weight")?.value || "Weight not set",
              field("rate_offered")?.value || "Rate not set",
              directLoad ? "Direct load" : "Multi-stop / not direct",
            ];
            if (autoMode) detailParts.push(autoTransportModeLabel(autoMode));
            const data = {
              title: `${field("pickup_city")?.value || "Pickup"} → ${field("delivery_city")?.value || "Delivery"}`,
              detail: detailParts.join(" · "),
              notes: field("notes")?.value || "",
              autoMode: autoMode || undefined,
              directLoad,
            };
            try {
              const posted = await apiRequest("/api/loads", {
                method: "POST",
                body: {
                  action: "post",
                  from: field("pickup_city")?.value || "",
                  to: field("delivery_city")?.value || "",
                  pickupDate: field("pickup_date")?.value || "",
                  pickupTime: field("pickup_time")?.value || "",
                  deliveryDate: field("delivery_date")?.value || "",
                  equipment,
                  weight: field("weight")?.value || "",
                  rate: parseMoney(field("rate_offered")?.value || ""),
                  miles: Number(field("miles")?.value || 0),
                  notes: field("notes")?.value || "",
                  autoMode,
                  directLoad,
                },
              });
              data.id = posted?.load?.id || "";
              data.status = "Open";
            } catch (err) {
              toast(err?.data?.error || "The load could not be posted.");
              return;
            }
            pushRecent(storageKeys.recentLoads, data);
            renderProfile();
            scheduleAccountSync();
            form.reset();
            await loadLoadCatalog(true).catch(() => {});
            toast("Load posted. Verified carriers can now request the pickup.");
            return;
          } else if (id === "ratingForm") {
            const review = buildVerifiedReviewEntry(profile, form);
            if (review.error) {
              toast(review.error);
              return;
            }
            const saved = readJSON(storageKeys.customerRatings, []);
            saved.unshift(review.entry);
            writeJSON(storageKeys.customerRatings, saved.slice(0, 20));
            auditTrustScoreChange(
              profile,
              americanTruckersTrustScore(profile).score,
              review.entry.score,
              "review submitted",
            );
            renderTrustNotes();
            renderTrustBadges();
            renderDisputeTargets();
            renderDisputeList();
            renderProfile();
            scheduleAccountSync();
            const publicSuffix =
              review.entry.publicScore === null
                ? ""
                : " · public " + review.entry.publicScore + "/100";
            toast(
              "Saved " +
                (review.entry.kind || "rating").toLowerCase() +
                " rating for " +
                (review.entry.name || "Unknown") +
                " · " +
                review.entry.confidenceLabel +
                publicSuffix,
            );
          } else if (id === "disputeForm") {
            const result = buildDisputeEntry(profile, form);
            if (result.error) {
              toast(result.error);
              return;
            }
            auditTrustScoreChange(
              profile,
              americanTruckersTrustScore(profile).score,
              americanTruckersTrustScore(profile).score,
              "dispute filed",
            );
            renderTrustNotes();
            renderTrustBadges();
            renderDisputeTargets();
            renderDisputeList();
            renderProfile();
            toast("Dispute filed. The review is now under review.");
          } else if (id === "directRequestForm") {
            const gate = serviceAccessState(profile, "request");
            if (!gate.allowed) {
              toast(gate.message || "Complete checkout first.");
              route(gate.route || "signup");
              return;
            }
            const data = {
              title: `${form.querySelectorAll("input, select, textarea")[0].value} → ${form.querySelectorAll("input, select, textarea")[1].value}`,
              detail: `${form.querySelectorAll("input, select, textarea")[3].value} · ${form.querySelectorAll("input, select, textarea")[5].value}`,
            };
            pushRecent(storageKeys.recentRequests, data);
            renderProfile();
            scheduleAccountSync();
          }
          toast(
            id === "ratingForm"
              ? "Trust note saved. Payment status, quick-pay, and dispute notes logged."
              : id === "disputeForm"
                ? "Dispute filed. The review is under review."
                : "Direct load request submitted. Ralph would review it before brokers/carriers see it.",
          );
        });
    },
  );
  const profileLanguageForm = $("#profileLanguageForm");
  if (profileLanguageForm)
    profileLanguageForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const preferredLanguage =
        String(
          form.querySelector('[name="preferredLanguage"]')?.value || "en",
        ).trim() || "en";
      const preferredTranslationLanguage =
        String(
          form.querySelector('[name="preferredTranslationLanguage"]')?.value ||
            preferredLanguage,
        ).trim() || preferredLanguage;
      const additionalLanguages = Array.from(
        form.querySelector('[name="additionalLanguages"]')?.selectedOptions ||
          [],
      )
        .map((option) => option.value)
        .filter(Boolean);
      const autoTranslateMessages = form.querySelector(
        '[name="autoTranslateMessages"]',
      )?.checked;
      const alwaysShowOriginalMessages = form.querySelector(
        '[name="alwaysShowOriginalMessages"]',
      )?.checked;
      const transcribeAndTranslateVoiceNotes = form.querySelector(
        '[name="transcribeAndTranslateVoiceNotes"]',
      )?.checked;
      const showLanguagesSpoken = form.querySelector(
        '[name="showLanguagesSpoken"]',
      )?.checked;
      try {
        const data = await apiRequest("/api/account", {
          method: "POST",
          body: {
            action: "save",
            profile: {
              preferredLanguage,
              additionalLanguages,
              preferredTranslationLanguage,
              autoTranslateMessages,
              alwaysShowOriginalMessages,
              transcribeAndTranslateVoiceNotes,
              showLanguagesSpoken,
            },
          },
        });
        mergeAccountState(data);
        toast("Language preferences saved.");
        renderProfile();
        renderCommunicationHub();
      } catch (err) {
        toast(
          (err && err.data && err.error) ||
            "Could not save language preferences.",
        );
      }
    });
  const future = $("#futureTripForm");
  if (future)
    future.addEventListener("submit", (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const trip = {
        title: form.querySelector('[name="title"]').value || "Future trip",
        origin: form.querySelector('[name="origin"]').value || "Unknown",
        destination:
          form.querySelector('[name="destination"]').value || "Unknown",
        date: form.querySelector('[name="date"]').value || "",
        equipment: form.querySelector('[name="equipment"]').value || "",
        notes: form.querySelector('[name="notes"]').value || "",
      };
      const saved = readJSON(storageKeys.plannedTrips, []);
      saved.unshift(trip);
      writeJSON(storageKeys.plannedTrips, saved.slice(0, 8));
      renderProfile();
      scheduleAccountSync();
      toast(`Saved future trip: ${trip.title}`);
    });

  const lane = $("#laneAlertForm");
  if (lane) {
    const originEl = $("#alertOrigin");
    const dieselEl = $("#alertDiesel");
    const dieselHint = $("#alertDieselHint");
    const lanesEl = $("#alertLanes");
    const deadheadEl = $("#alertDeadhead");
    const datesEl = $("#alertDates");
    const notifyInAppEl = $("#laneNotifyInApp");
    const notifyPushEl = $("#laneNotifyPush");
    const notifyEmailEl = $("#laneNotifyEmail");
    const notifySmsEl = $("#laneNotifySms");
    const adminPanel = $("#laneAlertAdminPanel");
    const adminTestResults = $("#laneAlertTestResults");
    const adminEnabled = isAdministratorProfile(getProfile());
    if (adminPanel) adminPanel.hidden = !adminEnabled;
    const syncDieselHint = () => {
      const suggestion = suggestedDieselPriceForLocation(originEl?.value || "");
      if (dieselHint)
        dieselHint.textContent = `Suggested diesel price for ${originEl?.value || "your area"}: $${suggestion.toFixed(2)}/gal`;
      if (dieselEl && !dieselEl.value.trim())
        dieselEl.value = suggestion.toFixed(2);
    };
    originEl?.addEventListener("input", syncDieselHint);
    originEl?.addEventListener("change", syncDieselHint);
    syncDieselHint();
    const laneAlertNotificationChannels = () => ({
      inApp: Boolean(notifyInAppEl?.checked),
      push: Boolean(notifyPushEl?.checked),
      email: Boolean(notifyEmailEl?.checked),
      sms: Boolean(notifySmsEl?.checked),
    });
    const currentProfile = () => getProfile();
    const laneMatchLabel = (alert, load) =>
      `${load.from} → ${load.to} · ${load.eq} · ${money(load.rate)} · ${load.pick}`;
    const roughDeadheadMiles = (start = "", loadStart = "") => {
      const a = String(start || "")
        .trim()
        .toLowerCase();
      const b = String(loadStart || "")
        .trim()
        .toLowerCase();
      if (!a || !b || a === "anywhere") return 0;
      if (a === b) return 0;
      const stateA = inferStateFromLocation(a);
      const stateB = inferStateFromLocation(b);
      if (stateA && stateA === stateB) return 35;
      const cityA = a.split(",")[0].trim();
      const cityB = b.split(",")[0].trim();
      if (cityA && cityB && cityA === cityB) return 0;
      return 180;
    };
    const laneTokens = (value) =>
      String(value || "")
        .split(/[\n,;|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    const datesMatch = (available = "", pick = "") => {
      const text = String(available || "")
        .trim()
        .toLowerCase();
      if (!text) return true;
      const pickText = String(pick || "").toLowerCase();
      if (/any/.test(text)) return true;
      return laneTokens(text).some((token) =>
        pickText.includes(token.toLowerCase()),
      );
    };
    const alertMatchesLoad = (alert, load) => {
      if (!alert || !load) return false;
      const alertEquip = String(alert.equipment || "")
        .trim()
        .toLowerCase();
      const loadEquip = String(load.eq || "")
        .trim()
        .toLowerCase();
      const loadRoute = `${String(load.from || "").toLowerCase()} → ${String(load.to || "").toLowerCase()}`;
      const currentLocation = String(alert.origin || "").trim();
      const destination = String(alert.destination || "").trim();
      const preferredLanes = laneTokens(
        alert.preferredLanes || alert.lanes || "",
      );
      const targetRate = Number(alert.rate || 0);
      const maxDeadhead = Number(
        alert.maxDeadheadMiles || alert.deadheadMiles || 0,
      );
      const rateMatch = !targetRate || Number(load.rate || 0) >= targetRate;
      const equipmentMatch =
        !alertEquip ||
        alertEquip === "any" ||
        loadEquip.includes(alertEquip) ||
        String(load.kind || "").toLowerCase() ===
          equipmentKindFromAlert(alertEquip);
      const currentMatch =
        !currentLocation ||
        currentLocation.toLowerCase() === "anywhere" ||
        loadRoute.includes(
          String(currentLocation).toLowerCase().split(",")[0].trim(),
        );
      const destinationMatch =
        !destination ||
        destination.toLowerCase() === "anywhere" ||
        String(load.to || "")
          .toLowerCase()
          .includes(destination.toLowerCase().split(",")[0].trim());
      const laneMatch =
        !preferredLanes.length ||
        preferredLanes.some(
          (lane) =>
            loadRoute.includes(lane.toLowerCase()) ||
            `${load.from} → ${load.to}`
              .toLowerCase()
              .includes(lane.toLowerCase()),
        );
      const deadheadMatch =
        !maxDeadhead ||
        roughDeadheadMiles(currentLocation, load.from) <= maxDeadhead;
      const dateMatch = datesMatch(alert.availableDates || "", load.pick || "");
      const verifiedMatch =
        String(load.insurance || "").toLowerCase() === "verified" ||
        Number(load.trust || 0) >= 85;
      return (
        rateMatch &&
        equipmentMatch &&
        currentMatch &&
        destinationMatch &&
        laneMatch &&
        deadheadMatch &&
        dateMatch &&
        verifiedMatch
      );
    };
    const makeLaneNotification = (alert, load) => ({
      id: crypto.randomUUID(),
      type: "lane-match",
      title: `${alert.origin || "Your lane"} matched an opportunity`,
      body: `${laneMatchLabel(alert, load)} matched your lane preferences.`,
      lane: `${alert.origin || "Anywhere"} → ${alert.destination || "Anywhere"}`,
      loadId: `${load.from}-${load.to}-${load.pick}`,
      createdAt: new Date().toISOString(),
      channels: laneAlertNotificationChannels(),
      readAt: "",
    });
    const saveLaneNotifications = (items) => {
      const current = readJSON(storageKeys.notifications, []);
      writeJSON(storageKeys.notifications, [...items, ...current].slice(0, 30));
    };
    lane.addEventListener("submit", (e) => {
      e.preventDefault();
      const alert = {
        origin: originEl?.value || "Atlanta, GA",
        destination: $("#alertDestination").value || "Anywhere",
        equipment: $("#alertEquipment").value,
        rate: parseMoney($("#alertRate").value),
        weight: parseWeight($("#alertWeight").value),
        dieselPrice:
          parseMoney(dieselEl?.value || "") ||
          suggestedDieselPriceForLocation(originEl?.value || ""),
        preferredLanes: String(lanesEl?.value || "").trim(),
        availableDates: String(datesEl?.value || "").trim(),
        maxDeadheadMiles: Number(deadheadEl?.value || 0) || 0,
        notificationPreferences: laneAlertNotificationChannels(),
        updatedAt: new Date().toISOString(),
      };
      const saved = readJSON(storageKeys.laneAlerts, []);
      saved.unshift(alert);
      writeJSON(storageKeys.laneAlerts, saved.slice(0, 6));
      const matches = loadCatalogItems().filter((load) =>
        alertMatchesLoad(alert, load),
      );
      if (matches.length)
        saveLaneNotifications(
          matches.slice(0, 6).map((load) => makeLaneNotification(alert, load)),
        );
      renderAlerts();
      renderProfile();
      scheduleAccountSync();
      const mpg = estimateMpg(alert.equipment, alert.weight);
      const fuelPerMi = estimateFuelCostPerMile(
        alert.equipment,
        alert.weight,
        alert.dieselPrice,
      );
      toast(
        `Saved lane alert: ${alert.origin} → ${alert.destination} · MPG ${mpg} · fuel $${fuelPerMi.toFixed(2)}/mi`,
      );
    });
    if (adminEnabled && adminTestResults) {
      $("#laneAlertTestMatch")?.addEventListener("click", () => {
        const saved = readJSON(storageKeys.laneAlerts, []);
        const results = saved
          .slice(0, 4)
          .map((alert) => {
            const matches = loadCatalogItems().filter((load) =>
              alertMatchesLoad(alert, load),
            );
            return `<article class="mini-item"><strong>${escapeHtml(alert.origin || "Lane")} → ${escapeHtml(alert.destination || "Anywhere")}</strong><span>${escapeHtml(alert.equipment || "Equipment")}${alert.maxDeadheadMiles ? ` · ${alert.maxDeadheadMiles} mi max deadhead` : ""}${alert.availableDates ? ` · ${escapeHtml(alert.availableDates)}` : ""}</span><small>${matches.length ? `${matches.length} verified opportunity${matches.length === 1 ? "" : "ies"} matched` : "No verified opportunities matched yet"}</small></article>`;
          })
          .join("");
        adminTestResults.innerHTML =
          results ||
          '<div class="empty-state"><h4>No lane alerts saved</h4><p>Save an alert first so the admin tester can evaluate it.</p></div>';
      });
      $("#laneAlertSeedNotification")?.addEventListener("click", () => {
        const sample = makeLaneNotification(
          { origin: "Atlanta, GA", destination: "Nashville, TN" },
          loadCatalogItems()[0] || loadSeed[0],
        );
        saveLaneNotifications([sample]);
        renderAlerts();
        toast("Seeded a sample lane notification.");
      });
      $("#laneAlertClearInbox")?.addEventListener("click", () => {
        writeJSON(storageKeys.notifications, []);
        renderAlerts();
        toast("Lane alert inbox cleared.");
      });
    }
  }
}
function alertMatchesLoad(alert, load) {
  if (!alert || !load) return false;
  const origin = String(alert.origin || "").trim();
  const destination = String(alert.destination || "").trim();
  const alertEquip = String(alert.equipment || "").toLowerCase();
  const loadEquip = String(load.eq || "").toLowerCase();
  const loadKind = String(load.kind || "").toLowerCase();
  const targetRate = Number(alert.rate || 0);
  const preferredLanes = String(alert.preferredLanes || alert.lanes || "")
    .split(/[\n,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const rateMatch = !targetRate || Number(load.rate || 0) >= targetRate;
  const equipmentMatch =
    alertEquip === "any" ||
    !alertEquip ||
    loadEquip.includes(alertEquip) ||
    loadKind === equipmentKindFromAlert(alertEquip);
  const originMatch =
    !origin ||
    origin.toLowerCase() === "anywhere" ||
    String(load.from || "")
      .toLowerCase()
      .includes(origin.toLowerCase().split(",")[0].trim());
  const destinationMatch =
    !destination ||
    destination.toLowerCase() === "anywhere" ||
    String(load.to || "")
      .toLowerCase()
      .includes(destination.toLowerCase().split(",")[0].trim());
  const laneMatch =
    !preferredLanes.length ||
    preferredLanes.some((lane) =>
      `${String(load.from || "").toLowerCase()} → ${String(load.to || "").toLowerCase()}`.includes(
        lane.toLowerCase(),
      ),
    );
  const maxDeadhead = Number(
    alert.maxDeadheadMiles || alert.deadheadMiles || 0,
  );
  const deadheadMatch =
    !maxDeadhead ||
    String(origin || "")
      .trim()
      .toLowerCase() ===
      String(load.from || "")
        .trim()
        .toLowerCase() ||
    inferStateFromLocation(origin) === inferStateFromLocation(load.from) ||
    maxDeadhead >= 180;
  const dateMatch =
    !String(alert.availableDates || "").trim() ||
    String(load.pick || "")
      .toLowerCase()
      .includes(
        String(alert.availableDates || "")
          .trim()
          .toLowerCase(),
      ) ||
    /any/i.test(String(alert.availableDates || ""));
  const verifiedMatch =
    String(load.insurance || "").toLowerCase() === "verified" ||
    Number(load.trust || 0) >= 85;
  return (
    rateMatch &&
    equipmentMatch &&
    originMatch &&
    destinationMatch &&
    laneMatch &&
    deadheadMatch &&
    dateMatch &&
    verifiedMatch
  );
}
function equipmentKindFromAlert(text = "") {
  const t = String(text).toLowerCase();
  if (t.includes("box")) return "box";
  if (t.includes("liftgate")) return "box";
  if (t.includes("ramp")) return "box";
  if (t.includes("cargo van")) return "van";
  if (t.includes("truck + trailer") || t.includes("hotshot"))
    return "trucktrailer";
  if (t.includes("car carrier") || t.includes("auto transport"))
    return "carcarrier";
  if (t.includes("flatbed")) return "flatbed";
  if (t.includes("step deck")) return "stepdeck";
  if (t.includes("conestoga")) return "conestoga";
  if (t.includes("lowboy") || t.includes("rgn")) return "lowboy";
  if (t.includes("power")) return "poweronly";
  return "";
}
function renderAlerts() {
  const box = $("#savedAlerts");
  const inbox = $("#laneAlertNotifications");
  if (!box && !inbox) return;
  const profile = getProfile();
  const adminPanel = $("#laneAlertAdminPanel");
  const adminTestResults = $("#laneAlertTestResults");
  const adminEnabled = isAdministratorProfile(profile);
  const saved = readJSON(storageKeys.laneAlerts, []);
  const notifications = readJSON(storageKeys.notifications, []);
  if (box) {
    box.innerHTML = saved.length
      ? "<h2>Saved alerts</h2>" +
        saved
          .map((a) => {
            const mpg = estimateMpg(a.equipment, a.weight);
            const fuelPerMi = estimateFuelCostPerMile(
              a.equipment,
              a.weight,
              a.dieselPrice,
            );
            const netPerMi = Math.max(0, (a.rate || 0) - fuelPerMi).toFixed(2);
            const matches = loadCatalogItems().filter((load) =>
              alertMatchesLoad(a, load),
            );
            const details = [
              a.preferredLanes
                ? `Preferred lanes: ${escapeHtml(a.preferredLanes)}`
                : "",
              a.availableDates
                ? `Available: ${escapeHtml(a.availableDates)}`
                : "",
              a.maxDeadheadMiles
                ? `Max deadhead: ${a.maxDeadheadMiles} mi`
                : "",
              a.notificationPreferences
                ? `Alerts: ${
                    Object.entries(a.notificationPreferences)
                      .filter(([, v]) => v)
                      .map(([k]) => k)
                      .join(", ") || "in-app"
                  }`
                : "",
            ]
              .filter(Boolean)
              .join(" · ");
            const matchHtml = matches.length
              ? `<div class="alert-matches"><strong>${matches.length} verified load${matches.length === 1 ? "" : "s"} matched</strong>${matches
                  .slice(0, 3)
                  .map(
                    (load) =>
                      `<div class="mini-item"><strong>${load.from} → ${load.to}</strong><span>${load.eq} · ${money(load.rate)} · ${load.pick}</span></div>`,
                  )
                  .join("")}</div>`
              : '<p class="muted">No verified loads match yet. Keep the alert active.</p>';
            return `<article class="card saved-alert"><strong>${escapeHtml(a.origin)} → ${escapeHtml(a.destination)}</strong><span>${escapeHtml(a.equipment)} · ${a.weight || "weight n/a"} · MPG ${mpg} · fuel $${fuelPerMi.toFixed(2)}/mi · net $${netPerMi}/mi</span><p class="muted">${details || "Saved preference"}</p>${matchHtml}</article>`;
          })
          .join("")
      : '<div class="card"><h3>No saved lane alerts yet</h3><p class="muted">Create one above. This will become the job-getting engine for drivers.</p></div>';
  }
  if (inbox) {
    inbox.innerHTML = notifications.length
      ? "<h2>Lane alert inbox</h2>" +
        notifications
          .slice(0, 8)
          .map(
            (note) =>
              `<article class="card saved-alert"><strong>${escapeHtml(note.title || "Lane match")}</strong><span>${escapeHtml(note.body || "New alert")}</span><p class="muted">${escapeHtml(note.lane || "")} ${
                note.channels
                  ? `· channels: ${
                      Object.entries(note.channels)
                        .filter(([, v]) => v)
                        .map(([k]) => k)
                        .join(", ") || "in-app"
                    }`
                  : ""
              }</p></article>`,
          )
          .join("")
      : '<div class="card"><h3>No lane notifications yet</h3><p class="muted">Matched opportunities and admin test notifications will appear here.</p></div>';
  }
  if (adminPanel) adminPanel.hidden = !adminEnabled;
  if (adminTestResults && adminEnabled && !adminTestResults.innerHTML.trim()) {
    adminTestResults.innerHTML =
      '<div class="empty-state"><h4>Run a match test</h4><p>Use the admin buttons to evaluate saved alerts against demo loads.</p></div>';
  }
}
function renderTrustedPartners() {
  const box = $("#trustedPartnerResults");
  if (!box) return;
  const search = String($("#trustedPartnerSearch")?.value || "")
    .trim()
    .toLowerCase();
  const category = String($("#trustedPartnerCategory")?.value || "All").trim();
  const locQuery = String($("#trustedPartnerLocation")?.value || "")
    .trim()
    .toLowerCase();
  const reports = readJSON(storageKeys.partnerReports, []);
  const isAdmin = isAdministratorProfile(getProfile());
  const filtered = trustedPartners.filter((partner) => {
    const text = [
      partner.name,
      partner.category,
      partner.city,
      partner.serviceArea,
      partner.hours,
      partner.contact,
      partner.services,
      partner.recommendation,
      partner.verificationStatus,
    ]
      .join(" ")
      .toLowerCase();
    if (search && !text.includes(search)) return false;
    if (category && category !== "All" && partner.category !== category)
      return false;
    if (locQuery && !text.includes(locQuery)) return false;
    return true;
  });
  box.innerHTML = filtered.length
    ? filtered
        .map((partner) => {
          const reportCount = reports.filter(
            (item) => item.partnerId === partner.id,
          ).length;
          const verifiedLabel = partner.approved
            ? "Verified by admin"
            : partner.verificationStatus || "Pending review";
          return `<article class="card saved-alert" data-partner-id="${escapeHtml(partner.id)}"><strong>${escapeHtml(partner.name)}</strong><span>${escapeHtml(partner.category)} · ${escapeHtml(partner.city)}</span><p class="muted">${escapeHtml(partner.serviceArea || "Service area not set")} · Hours: ${escapeHtml(partner.hours || "Not set")} · Contact: ${escapeHtml(partner.contact || "Not set")}</p><p class="muted">${escapeHtml(partner.recommendation || "")}${partner.reviews ? ` · ${partner.reviews} recommendations` : ""}</p><div class="profile-tags"><span class="profile-tag">${escapeHtml(verifiedLabel)}</span><span class="profile-tag">${reportCount} reports</span><span class="profile-tag">${escapeHtml(partner.services || "Services not set")}</span></div><div class="comm-actions"><a class="btn btn-soft" href="tel:${encodeURIComponent(partner.contact || "")}">Call</a><a class="btn btn-soft" href="mailto:${encodeURIComponent(partner.contact || "")}">Email</a><a class="btn btn-soft" href="${escapeHtml(partner.website || "#")}" target="_blank" rel="noreferrer">Website</a><button class="btn btn-soft" type="button" data-partner-report="${escapeHtml(partner.id)}">Report a problem</button>${isAdmin ? `<button class="btn btn-soft" type="button" data-partner-approve="${escapeHtml(partner.id)}">${partner.approved ? "Unapprove" : "Approve & verify"}</button>` : ""}</div></article>`;
        })
        .join("")
    : '<div class="card"><h3>No partners match your search</h3><p class="muted">Try a different city, category, or service type.</p></div>';
  $$("[data-partner-report]").forEach(
    (btn) =>
      (btn.onclick = () => {
        const id = btn.dataset.partnerReport;
        const partner = trustedPartners.find((item) => item.id === id);
        if (!partner) return;
        const reports = readJSON(storageKeys.partnerReports, []);
        reports.unshift({
          id: crypto.randomUUID(),
          partnerId: partner.id,
          partnerName: partner.name,
          category: partner.category,
          createdAt: new Date().toISOString(),
          reason: `User report for ${partner.name}`,
          status: "Needs review",
        });
        writeJSON(storageKeys.partnerReports, reports.slice(0, 30));
        partner.reported = true;
        renderTrustedPartners();
        toast("Problem report saved for review.");
      }),
  );
  $$("[data-partner-approve]").forEach(
    (btn) =>
      (btn.onclick = () => {
        const id = btn.dataset.partnerApprove;
        trustedPartners = trustedPartners.map((partner) =>
          partner.id === id
            ? {
                ...partner,
                approved: !partner.approved,
                verificationStatus: !partner.approved
                  ? "Verified by admin"
                  : "Pending review",
              }
            : partner,
        );
        renderTrustedPartners();
        toast("Partner verification updated.");
      }),
  );
}
async function renderAgentClassroom() {
  const summary = $("#agentTelemetrySummary");
  const agentsBox = $("#agentTelemetryAgents");
  const log = $("#agentClassroomLog");
  if (!summary || !agentsBox || !log) return;

  summary.innerHTML = `<div><span>Connection</span><strong>Checking</strong></div><div><span>Agents monitored</span><strong>—</strong></div><div><span>Running tasks</span><strong>—</strong></div><div><span>Failed tasks</span><strong>—</strong></div>`;
  agentsBox.innerHTML = `<article class="card agent-status-card agent-loading-card"><div class="section-head"><h3>Connecting to OpenClaw</h3><span class="agent-pill setup">Checking</span></div><p>Loading the latest secure telemetry snapshot.</p></article>`;

  const displayTime = (value) => {
    const date = new Date(value || "");
    return Number.isNaN(date.getTime())
      ? "Not reported"
      : date.toLocaleString();
  };
  const statusView = (status = "") => {
    const normalized = ["ready", "working", "setup", "attention"].includes(
      status,
    )
      ? status
      : "setup";
    const labels = {
      ready: "Ready",
      working: "Working",
      setup: "Needs setup",
      attention: "Attention",
    };
    return { className: normalized, label: labels[normalized] };
  };

  try {
    const response = await fetch("/api/agent-telemetry", {
      headers: { accept: "application/json" },
      credentials: "include",
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.error || `Telemetry returned ${response.status}.`);
    if (!result.telemetry)
      throw new Error(result.error || "OpenClaw has not sent telemetry yet.");

    const telemetry = result.telemetry;
    const telemetrySummary = telemetry.summary || {};
    const connected = Boolean(result.connected && telemetry.gateway?.reachable);
    const connectionLabel = connected
      ? "Live"
      : result.stale
        ? "Stale"
        : "Attention";
    summary.innerHTML = `<div><span>Connection</span><strong class="${connected ? "status-good" : "status-warn"}">${connectionLabel}</strong></div><div><span>Agents monitored</span><strong>${Number(telemetrySummary.agents || 0)}</strong></div><div><span>Running tasks</span><strong>${Number(telemetrySummary.runningTasks || 0)}</strong></div><div><span>Failed tasks</span><strong class="${telemetrySummary.failedTasks ? "status-warn" : "status-good"}">${Number(telemetrySummary.failedTasks || 0)}</strong></div>`;

    const agents = Array.isArray(telemetry.agents) ? telemetry.agents : [];
    agentsBox.innerHTML = agents.length
      ? agents
          .map((agent) => {
            const view = statusView(agent.status);
            const progress = Math.max(
              0,
              Math.min(100, Number(agent.progress || 0)),
            );
            return `<article class="card agent-status-card"><div class="section-head"><h3>${escapeHtml(agent.emoji || "⚙️")} ${escapeHtml(agent.name || agent.id || "Agent")}</h3><span class="agent-pill ${view.className}">${view.label}</span></div><div class="agent-progress"><span style="width:${progress}%"></span></div><p>${escapeHtml(agent.task || "Ready for an assignment.")}</p><div class="agent-card-meta"><span>${escapeHtml(agent.role || "OpenClaw agent")}</span><span>${Number(agent.sessions || 0)} sessions</span><span>${Number(agent.errors || 0)} errors</span></div><small>Model: ${escapeHtml(agent.model || "Not reported")}<br>Last active: <time datetime="${escapeHtml(agent.lastActiveAt || "")}">${escapeHtml(displayTime(agent.lastActiveAt))}</time></small></article>`;
          })
          .join("")
      : `<article class="card agent-status-card agent-loading-card"><h3>No agents reported</h3><p>The bridge is connected, but the OpenClaw roster is empty.</p></article>`;

    const events = Array.isArray(telemetry.events) ? telemetry.events : [];
    const tasks = Array.isArray(telemetry.tasks) ? telemetry.tasks : [];
    const entries = [
      ...events.map((event) => ({
        title: event.title,
        detail: event.detail,
        timestamp: event.timestamp,
        label: event.severity || "event",
      })),
      ...tasks.slice(0, 10).map((task) => ({
        title: task.label,
        detail: task.detail || `${task.agentId || "Agent"} task`,
        timestamp: task.updatedAt,
        label: task.status || "task",
      })),
    ];
    log.innerHTML = `<p><strong>${connected ? "Secure feed live" : "Feed needs attention"}.</strong> Snapshot received ${escapeHtml(displayTime(telemetry.receivedAt))}; generated ${escapeHtml(displayTime(telemetry.generatedAt))}. Gateway ${telemetry.gateway?.reachable ? "reachable" : "unavailable"}${telemetry.gateway?.latencyMs ? ` in ${Number(telemetry.gateway.latencyMs)} ms` : ""}; ${escapeHtml(telemetry.channel?.name || "channel")} ${telemetry.channel?.connected === true ? "connected" : telemetry.channel?.connected === false ? "disconnected" : "not reported"}.</p>${entries.length ? `<div class="agent-log-list">${entries.map((entry) => `<div class="agent-log-entry"><strong>${escapeHtml(entry.title || "OpenClaw event")}</strong> <span class="tag">${escapeHtml(entry.label)}</span><p>${escapeHtml(entry.detail || "No additional detail.")}</p><small>${escapeHtml(displayTime(entry.timestamp))}</small></div>`).join("")}</div>` : "<p>No recent tasks or errors were reported.</p>"}`;
    toast("Live OpenClaw status refreshed.");
  } catch (error) {
    const message = String(error?.message || "Could not load agent telemetry.");
    const adminRequired = /administrator|sign in|subscription|profile/i.test(
      message,
    );
    summary.innerHTML = `<div><span>Connection</span><strong class="status-warn">Unavailable</strong></div><div><span>Agents monitored</span><strong>—</strong></div><div><span>Running tasks</span><strong>—</strong></div><div><span>Failed tasks</span><strong>—</strong></div>`;
    agentsBox.innerHTML = `<article class="card agent-status-card agent-loading-card"><div class="section-head"><h3>${adminRequired ? "Administrator access required" : "Telemetry unavailable"}</h3><span class="agent-pill attention">Attention</span></div><p>${escapeHtml(message)}</p></article>`;
    log.innerHTML = `<p>The dashboard did not invent placeholder data. ${escapeHtml(message)}</p>`;
  }
}
function bind() {
  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    const target = document.getElementById(id);
    if (target && !target.classList.contains("active")) route(id);
  });
  $$("[data-route]").forEach((el) =>
    el.addEventListener("click", (e) => {
      const routeId = el.dataset.route || "";
      const href = String(el.getAttribute("href") || "");
      if (
        routeId === "signin" &&
        (href.startsWith("/sign-in") || href.startsWith("/signin"))
      )
        return;
      e.preventDefault();
      route(routeId);
    }),
  );
  $$("[data-profile-view]").forEach((btn) =>
    btn.addEventListener("click", () => {
      writeJSON(storageKeys.profileView, btn.dataset.profileView);
      renderProfile();
    }),
  );
  const menuBtn = $("#menuBtn");
  const mainNav = $("#mainNav");
  if (menuBtn && mainNav) {
    menuBtn.onclick = () => {
      const open = mainNav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
    };
  }
  [
    "keywordFilter",
    "pickupFilter",
    "deliveryFilter",
    "equipmentFilter",
    "rateFilter",
    "loadSort",
    "quickPayFilter",
  ].forEach((id) => {
    const el = $("#" + id);
    if (el) {
      el.addEventListener("input", renderLoads);
      el.addEventListener("change", renderLoads);
    }
  });
  const resetFilters = $("#resetFilters");
  if (resetFilters)
    resetFilters.onclick = () => {
      if ($("#keywordFilter")) $("#keywordFilter").value = "";
      if ($("#pickupFilter")) $("#pickupFilter").value = "";
      if ($("#deliveryFilter")) $("#deliveryFilter").value = "";
      if ($("#equipmentFilter")) $("#equipmentFilter").value = "all";
      if ($("#rateFilter")) $("#rateFilter").value = "0";
      if ($("#loadSort")) $("#loadSort").value = "best";
      if ($("#quickPayFilter")) $("#quickPayFilter").checked = false;
      renderLoads();
    };
  const saveSearch = $("#saveLoadSearch");
  if (saveSearch) saveSearch.onclick = saveCurrentLoadSearch;
  $$("[data-billing-portal]").forEach((button) => {
    button.onclick = async () => {
      try {
        button.disabled = true;
        toast("Opening secure billing controls…");
        await openBillingPortal();
      } catch (err) {
        toast(err?.data?.error || "Could not open billing controls.");
      } finally {
        button.disabled = false;
      }
    };
  });
  const refreshAgents = $("#refreshAgentClassroom");
  if (refreshAgents) refreshAgents.onclick = renderAgentClassroom;
  [
    "trustedPartnerSearch",
    "trustedPartnerCategory",
    "trustedPartnerLocation",
  ].forEach((id) => {
    const el = $("#" + id);
    if (el) el.addEventListener("input", renderTrustedPartners);
  });
  const resetPartners = $("#trustedPartnerReset");
  if (resetPartners)
    resetPartners.onclick = () => {
      $("#trustedPartnerSearch").value = "";
      $("#trustedPartnerCategory").value = "All";
      $("#trustedPartnerLocation").value = "";
      renderTrustedPartners();
    };
}
(async () => {
  const account = await loadAccountState();
  applyCheckoutStateFromUrl();
  renderAuthExtras();
  await loadLoadCatalog();
  await loadBulletinBoard();
  await loadCommunicationHub();
  await loadLeaderboardPeers();
  initStats();
  initTiers();
  initVerification();
  initRoadmap();
  initForms();
  initEquipmentPickers();
  initPlanChooser();
  renderAlerts();
  renderTrustedPartners();
  renderRequests();
  renderBulletinBoard();
  renderProfile();
  bind();
  renderAgentClassroom();
  renderLoads();
  if (location.hash) {
    const id = location.hash.slice(1);
    if (document.getElementById(id)) route(id);
  } else {
    const next = String(
      account?.dashboardRoute ||
        account?.memberAccess?.dashboardRoute ||
        account?.accessRoute ||
        account?.memberAccess?.accessRoute ||
        "",
    );
    if (next === "admin") {
      location.href = "/admin.html";
    } else if (
      ["provider", "moving", "customer", "broker", "driver"].includes(next)
    ) {
      writeJSON(storageKeys.profileView, normalizeWorkspace(next));
      route("profile");
    } else if (next === "profile-completion") {
      route("signup");
    } else if (next === "renewal") {
      route("billing");
    } else if (next === "plan-selection" || next === "pricing") {
      route("pricing");
    } else if (next === "verify") {
      route("verify");
    } else {
      route(hasProfileIdentity(getProfile()) ? "profile" : "home");
    }
  }
})();
