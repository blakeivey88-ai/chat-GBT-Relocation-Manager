import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUTS = [ROOT, path.join(ROOT, 'dist')];

const states = [
  ['alabama', 'Alabama'], ['alaska', 'Alaska'], ['arizona', 'Arizona'], ['arkansas', 'Arkansas'], ['california', 'California'],
  ['colorado', 'Colorado'], ['connecticut', 'Connecticut'], ['delaware', 'Delaware'], ['florida', 'Florida'], ['georgia', 'Georgia'],
  ['hawaii', 'Hawaii'], ['idaho', 'Idaho'], ['illinois', 'Illinois'], ['indiana', 'Indiana'], ['iowa', 'Iowa'],
  ['kansas', 'Kansas'], ['kentucky', 'Kentucky'], ['louisiana', 'Louisiana'], ['maine', 'Maine'], ['maryland', 'Maryland'],
  ['massachusetts', 'Massachusetts'], ['michigan', 'Michigan'], ['minnesota', 'Minnesota'], ['mississippi', 'Mississippi'], ['missouri', 'Missouri'],
  ['montana', 'Montana'], ['nebraska', 'Nebraska'], ['nevada', 'Nevada'], ['new-hampshire', 'New Hampshire'], ['new-jersey', 'New Jersey'],
  ['new-mexico', 'New Mexico'], ['new-york', 'New York'], ['north-carolina', 'North Carolina'], ['north-dakota', 'North Dakota'], ['ohio', 'Ohio'],
  ['oklahoma', 'Oklahoma'], ['oregon', 'Oregon'], ['pennsylvania', 'Pennsylvania'], ['rhode-island', 'Rhode Island'], ['south-carolina', 'South Carolina'],
  ['south-dakota', 'South Dakota'], ['tennessee', 'Tennessee'], ['texas', 'Texas'], ['utah', 'Utah'], ['vermont', 'Vermont'],
  ['virginia', 'Virginia'], ['washington', 'Washington'], ['west-virginia', 'West Virginia'], ['wisconsin', 'Wisconsin'], ['wyoming', 'Wyoming'],
];

const cities = [
  ['phoenix', 'Phoenix, AZ', 'Arizona'], ['atlanta', 'Atlanta, GA', 'Georgia'], ['dallas', 'Dallas, TX', 'Texas'], ['houston', 'Houston, TX', 'Texas'],
  ['los-angeles', 'Los Angeles, CA', 'California'], ['chicago', 'Chicago, IL', 'Illinois'], ['new-york-city', 'New York City, NY', 'New York'],
  ['miami', 'Miami, FL', 'Florida'], ['seattle', 'Seattle, WA', 'Washington'], ['denver', 'Denver, CO', 'Colorado'],
  ['charlotte', 'Charlotte, NC', 'North Carolina'], ['nashville', 'Nashville, TN', 'Tennessee'], ['indianapolis', 'Indianapolis, IN', 'Indiana'],
  ['san-antonio', 'San Antonio, TX', 'Texas'], ['san-diego', 'San Diego, CA', 'California'], ['philadelphia', 'Philadelphia, PA', 'Pennsylvania'],
  ['boston', 'Boston, MA', 'Massachusetts'], ['detroit', 'Detroit, MI', 'Michigan'], ['columbus', 'Columbus, OH', 'Ohio'],
  ['memphis', 'Memphis, TN', 'Tennessee'], ['portland', 'Portland, OR', 'Oregon'], ['las-vegas', 'Las Vegas, NV', 'Nevada'],
  ['oklahoma-city', 'Oklahoma City, OK', 'Oklahoma'], ['kansas-city', 'Kansas City, MO', 'Missouri'], ['austin', 'Austin, TX', 'Texas'],
  ['fort-worth', 'Fort Worth, TX', 'Texas'], ['san-jose', 'San Jose, CA', 'California'], ['sacramento', 'Sacramento, CA', 'California'],
  ['tampa', 'Tampa, FL', 'Florida'], ['orlando', 'Orlando, FL', 'Florida'], ['raleigh', 'Raleigh, NC', 'North Carolina'],
];

const directories = [
  ['truck-repair', 'Truck Repair'], ['tires', 'Tires'], ['towing', 'Towing'], ['mobile-mechanics', 'Mobile Mechanics'],
  ['truck-washes', 'Truck Washes'], ['hotels', 'Hotels'], ['cdl-schools', 'CDL Schools'], ['freight-brokers', 'Freight Brokers'],
  ['carriers', 'Carriers'], ['moving-companies', 'Moving Companies'], ['dispatch-services', 'Dispatch Services'],
  ['factoring-companies', 'Factoring Companies'], ['insurance-agents', 'Insurance Agents'],
];

const blogPosts = [
  {
    slug: 'freight-fraud-prevention-guide',
    title: 'Freight Fraud Prevention Guide for Small Carriers',
    description: 'A practical checklist to reduce double brokering, fake loads, and payment problems.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Trust & Fraud',
    sources: [
      'FMCSA consumer and safety resources',
      'Truckstop and load board fraud guidance',
      'Industry carrier verification best practices',
    ],
    intro: 'Freight fraud usually shows up as rushed booking, mismatched authority, missing contact details, or payment confusion. The fix is a repeatable verification process.',
  },
  {
    slug: 'truck-parking-guide',
    title: 'Truck Parking Guide: How to Find Safe Parking Faster',
    description: 'How drivers can find reliable parking, reduce wasted miles, and plan overnight stops.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Operations',
    sources: [
      'State trucking safety resources',
      'Truck parking vendor directories',
      'Driver community parking reports',
    ],
    intro: 'Parking is a search problem, a timing problem, and a planning problem. The best results come from planning before the clock gets tight.',
  },
  {
    slug: 'best-load-boards-for-owner-operators',
    title: 'Best Load Boards for Owner-Operators',
    description: 'What to compare when choosing a load board, and how to avoid low-value subscriptions.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Freight',
    sources: [
      'Public load board feature pages',
      'Carrier review discussions',
      'FMCSA and broker verification sources',
    ],
    intro: 'The best load board is not the one with the flashiest pitch. It is the one that fits your equipment, lanes, and payment tolerance.',
  },
  {
    slug: 'fuel-savings-for-truckers',
    title: 'Fuel Savings for Truckers: Simple Ways to Cut Waste',
    description: 'Practical habits that reduce fuel burn without turning dispatch into a science project.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Operations',
    sources: [
      'DOE fuel economy best practices',
      'Fleet maintenance guidance',
      'Driver efficiency checklists',
    ],
    intro: 'Fuel savings usually come from route discipline, idle control, tire health, and avoiding deadhead. Tiny improvements add up fast.',
  },
];

const knowledgePages = [
  {
    slug: 'how-to-verify-dot-number',
    title: 'How to Verify a DOT Number',
    description: 'A practical checklist for checking a DOT number and spotting bad carrier records.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Trust & Compliance',
    answer: 'Look up the DOT number in FMCSA, confirm the legal name, operating status, and safety history, and compare it against the carrier’s documents and contact details.',
    sources: ['FMCSA SAFER / company snapshot', 'FMCSA registration guidance', 'Carrier verification best practices'],
  },
  {
    slug: 'best-factoring-companies',
    title: 'Best Factoring Companies for Truckers',
    description: 'What to compare before choosing a factoring company.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Money & Cash Flow',
    answer: 'Compare funding speed, reserve rules, fees, contract length, recourse vs. non-recourse terms, and how they handle disputes.',
    sources: ['Factoring company fee schedules', 'Carrier reviews', 'Small-business finance guides'],
  },
  {
    slug: 'average-freight-rates',
    title: 'Average Freight Rates: How to Read Them Correctly',
    description: 'Why freight rates vary and how carriers should interpret rate averages.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Freight Rates',
    answer: 'Average rates are only useful when you compare lane, equipment, season, accessorials, and deadhead against your real operating cost.',
    sources: ['Market rate reports', 'Broker/carrier rate discussions', 'Equipment-specific pricing examples'],
  },
  {
    slug: 'truck-parking-near-dallas',
    title: 'Truck Parking Near Dallas',
    description: 'How to find safe parking around Dallas and plan stops before you run out of time.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Local SEO',
    answer: 'Use truck-stop directories, warehouse areas, and route planning tools before you get close to your hours limit.',
    sources: ['Truck stop directories', 'Texas trucking resources', 'Driver parking communities'],
  },
  {
    slug: 'how-to-become-an-owner-operator',
    title: 'How to Become an Owner-Operator',
    description: 'A step-by-step overview of the business side of becoming an owner-operator.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Business Setup',
    answer: 'Start with equipment, authority, insurance, bookkeeping, dispatch strategy, and a cash-flow cushion before you buy a truck or chase freight.',
    sources: ['Small-business trucking guides', 'FMCSA registration steps', 'Owner-operator finance resources'],
  },
  {
    slug: 'how-to-check-mc-number',
    title: 'How to Check an MC Number',
    description: 'How to confirm whether an MC number is active and tied to the right company.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Trust & Compliance',
    answer: 'Confirm the MC number in FMCSA, then match the legal name, authority type, and operating status against the documents you were given.',
    sources: ['FMCSA registration tools', 'Broker authority lookup resources', 'Identity verification checklists'],
  },
  {
    slug: 'cargo-insurance-guide',
    title: 'Cargo Insurance Guide for Truckers',
    description: 'How cargo insurance works and what to ask before booking freight.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Insurance',
    answer: 'Know the cargo value, exclusions, deductible, claim process, and whether the policy actually fits the load you want to move.',
    sources: ['Insurance policy examples', 'Carrier insurance checklists', 'FMCSA safety resources'],
  },
  {
    slug: 'best-load-boards',
    title: 'Best Load Boards for Truckers',
    description: 'What to compare when choosing a load board and how to avoid paying for the wrong one.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Freight',
    answer: 'Pick a board that matches your equipment, lane strategy, payment risk tolerance, and need for speed versus volume.',
    sources: ['Load board feature pages', 'Carrier reviews', 'Equipment-specific freight discussions'],
  },
  {
    slug: 'broker-setup-guide',
    title: 'Broker Setup Guide',
    description: 'A simple overview of the startup steps for new freight brokers.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Broker Resources',
    answer: 'Set up authority, surety bond, insurance, carrier vetting, contract templates, and a clean back-office workflow before booking loads.',
    sources: ['FMCSA broker authority guidance', 'Surety bond resources', 'Broker compliance guides'],
  },
  {
    slug: 'dispatch-services-guide',
    title: 'Dispatch Services Guide',
    description: 'How dispatch services help carriers and what to look for before hiring one.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Operations',
    answer: 'The best dispatch service improves lane fit, communication, and back-office efficiency without taking control away from the carrier.',
    sources: ['Dispatch service agreements', 'Carrier operations guides', 'Small-fleet management resources'],
  },
  {
    slug: 'fuel-savings-for-truckers',
    title: 'Fuel Savings for Truckers',
    description: 'Real-world ways to reduce fuel waste and improve margins.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Operations',
    answer: 'Use route discipline, idle control, tire checks, and fewer empty miles to save fuel consistently.',
    sources: ['DOE efficiency guidance', 'Fleet maintenance guides', 'Driver efficiency checklists'],
  },
  {
    slug: 'how-to-verify-insurance',
    title: 'How to Verify Trucking Insurance',
    description: 'A practical way to check insurance before you accept a load or release freight.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Trust & Compliance',
    answer: 'Ask for the COI, confirm the insured name, policy limits, coverage dates, and exclusions, then verify it with the insurer when needed.',
    sources: ['Certificate of insurance examples', 'Insurance verification checklists', 'Industry risk guidance'],
  },
  {
    slug: 'how-much-does-a-local-move-cost',
    title: 'How Much Does a Local Move Cost?',
    description: 'How to estimate a local move and what affects the final price.',
    updated: '2026-07-20',
    author: 'Ralph Ivey',
    category: 'Moving Cost',
    answer: 'Local move pricing usually depends on labor, truck size, stairs, distance, and how much packing or special handling is needed.',
    sources: ['Moving company pricing pages', 'Consumer moving guides', 'Quote-estimate resources'],
  },
  { slug: 'how-much-does-long-distance-moving-cost', title: 'How Much Does Long-Distance Moving Cost?', description: 'What drives long-distance moving prices and quotes.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Moving Cost', answer: 'Long-distance costs usually reflect miles, weight, access issues, timing, and service level.', sources: ['Long-distance moving guides', 'Quote estimate resources', 'Interstate move checklists'] },
  { slug: 'how-much-does-commercial-moving-cost', title: 'How Much Does Commercial Moving Cost?', description: 'A practical overview of commercial moving price drivers.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Commercial Moving', answer: 'Commercial moves depend on office size, equipment, coordination, after-hours work, and downtime risk.', sources: ['Commercial moving quotes', 'Office move guides', 'Business relocation resources'] },
  { slug: 'how-to-choose-a-moving-company', title: 'How to Choose a Moving Company', description: 'A checklist for comparing movers before you book.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Trust & Moving', answer: 'Choose based on licensing, reviews, estimates, insurance, responsiveness, and clear written terms.', sources: ['Mover comparison checklists', 'Consumer protection guides', 'Licensing lookup resources'] },
  { slug: 'moving-checklist', title: 'Moving Checklist: What to Do Before, During, and After Your Move', description: 'A complete moving checklist you can use to plan a move.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Moving Checklist', answer: 'Use a phased checklist that covers prep, packing, move day, and post-move cleanup so nothing gets missed.', sources: ['Moving checklist templates', 'Packing guides', 'Move-day planning resources'] },
  { slug: 'packing-tips-for-moving', title: 'Packing Tips for Moving', description: 'Simple packing habits that reduce damage and stress.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Packing', answer: 'Pack by room, label clearly, protect fragile items, and avoid overfilling boxes.', sources: ['Packing guides', 'Mover education resources', 'Fragile item tips'] },
  { slug: 'how-to-pack-a-moving-truck', title: 'How to Pack a Moving Truck', description: 'How to load a moving truck efficiently.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Packing & Loading', answer: 'Load the heaviest items first, balance the weight, and keep the load tight so nothing shifts.', sources: ['Truck-loading guides', 'Mover training content', 'Safe loading resources'] },
  { slug: 'how-to-load-a-moving-truck', title: 'How to Load a Moving Truck Safely and Efficiently', description: 'A safe loading process for moving trucks.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Packing & Loading', answer: 'Plan the order, protect the walls, distribute weight evenly, and secure everything before driving.', sources: ['Safe loading guides', 'Moving truck manuals', 'Mover best practices'] },
  { slug: 'how-big-of-a-moving-truck-do-i-need', title: 'What Size Moving Truck Do I Need?', description: 'How to pick the right truck size for a move.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Truck Size', answer: 'Choose truck size based on home size, furniture volume, and whether you want one trip or multiple trips.', sources: ['Truck size charts', 'Rental company guides', 'Moving estimate tools'] },
  { slug: 'moving-truck-size-guide', title: 'Moving Truck Sizes Guide', description: 'A reference for common moving truck sizes and use cases.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Truck Size', answer: 'Use size guides to match truck capacity with the amount of furniture, boxes, and equipment you need to move.', sources: ['Rental truck charts', 'Mover resources', 'Load planning guides'] },
  { slug: 'how-many-movers-do-i-need', title: 'How Many Movers Do I Need?', description: 'How to estimate the number of movers for a job.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Labor Planning', answer: 'The right crew size depends on home size, stairs, distance, and how fast you need the move finished.', sources: ['Moving labor guides', 'Crew planning resources', 'Quote calculators'] },
  { slug: 'how-long-does-it-take-to-move', title: 'How Long Does It Take to Move?', description: 'How to estimate move duration and plan your day.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Planning', answer: 'Move time depends on packing status, distance, crew size, and access conditions at both locations.', sources: ['Moving timelines', 'Labor planning guides', 'Move-day checklists'] },
  { slug: 'best-day-to-move', title: 'What Is the Best Day to Move?', description: 'How moving day choice affects cost and availability.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Planning', answer: 'Midweek days often provide better availability and lower pressure than weekends or month-end.', sources: ['Moving seasonality guides', 'Mover availability resources', 'Scheduling advice'] },
  { slug: 'best-time-of-year-to-move', title: 'What Is the Best Time of Year to Move?', description: 'Seasonality advice for moving and relocation planning.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Planning', answer: 'The best time depends on weather, demand, school schedules, and your budget.', sources: ['Seasonal moving guides', 'Weather resources', 'Relocation planning content'] },
  { slug: 'moving-quote-vs-estimate', title: 'Moving Quote vs Estimate: What’s the Difference?', description: 'How quotes and estimates differ in the moving industry.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Trust & Pricing', answer: 'A quote is more specific, while an estimate can change if the scope changes or the inventory differs.', sources: ['Quote vs estimate guides', 'Consumer moving resources', 'Pricing explanations'] },
  { slug: 'binding-vs-nonbinding-moving-estimate', title: 'Binding vs Nonbinding Moving Estimate', description: 'How binding and nonbinding moving estimates work.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Trust & Pricing', answer: 'Binding estimates cap price under the stated scope, while nonbinding estimates can change with final weight or services.', sources: ['Estimate rule guides', 'Mover pricing resources', 'Consumer protection pages'] },
  { slug: 'what-is-a-binding-moving-estimate', title: 'What Is a Binding Moving Estimate?', description: 'A plain-English explanation of binding estimates.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Trust & Pricing', answer: 'A binding moving estimate is a written price commitment based on the agreed inventory and services.', sources: ['Binding estimate resources', 'Moving law guides', 'Consumer education content'] },
  { slug: 'what-is-an-in-home-moving-estimate', title: 'What Is an In-Home Moving Estimate?', description: 'Why in-home estimates matter and what they include.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Trust & Pricing', answer: 'An in-home estimate lets a mover see the inventory, access, and handling needs before quoting the job.', sources: ['In-home estimate guides', 'Mover sales resources', 'Quote process pages'] },
  { slug: 'how-to-decline-extra-moving-charges', title: 'How to Avoid Extra Moving Charges', description: 'How to reduce surprise fees on a move.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Trust & Pricing', answer: 'Get terms in writing, confirm inventory, ask about stairs and access, and keep communication clear.', sources: ['Fee avoidance guides', 'Moving contract tips', 'Consumer rights resources'] },
  { slug: 'moving-insurance-options', title: 'Moving Insurance Options Explained', description: 'A guide to common moving insurance choices.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Insurance', answer: 'Review replacement value, declared value, exclusions, and how claims are handled before you buy coverage.', sources: ['Moving insurance guides', 'Policy examples', 'Consumer protection content'] },
  { slug: 'what-do-moving-companies-insure', title: 'What Do Moving Companies Insure?', description: 'What moving coverage usually includes and excludes.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Insurance', answer: 'Coverage often depends on the contract, valuation option, and what the mover explicitly agrees to protect.', sources: ['Valuation guides', 'Moving insurance basics', 'Contract explanation pages'] },
  { slug: 'how-to-label-boxes-for-moving', title: 'How to Label Boxes for Moving', description: 'Labeling tips that make unpacking easier.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Packing', answer: 'Label each box with room, contents, and priority so movers can place items correctly and you can unpack faster.', sources: ['Packing labels guides', 'Move organization resources', 'Unpacking checklists'] },
  { slug: 'how-to-pack-fragile-items-for-moving', title: 'How to Pack Fragile Items for Moving', description: 'How to protect fragile items during a move.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Packing', answer: 'Use strong boxes, enough padding, and careful stacking so fragile items are protected from crush and impact.', sources: ['Fragile item packing guides', 'Mover training resources', 'Packing supply pages'] },
  { slug: 'how-to-move-heavy-furniture', title: 'How to Move Heavy Furniture Safely', description: 'How to move heavy furniture without injury or damage.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Heavy Items', answer: 'Use proper lifting, dollies, straps, and enough help to avoid injury and protect floors and walls.', sources: ['Safe lifting guides', 'Furniture moving resources', 'Labor safety pages'] },
  { slug: 'how-to-move-a-piano', title: 'How to Move a Piano Safely', description: 'Why piano moves need special handling.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Specialty Moves', answer: 'Pianos need protective wrapping, proper equipment, and experienced handling because of weight and delicate components.', sources: ['Piano moving guides', 'Specialty mover resources', 'Equipment handling pages'] },
  { slug: 'how-to-move-an-appliance', title: 'How to Move Appliances Safely', description: 'How to prepare large appliances for a move.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Specialty Moves', answer: 'Disconnect, secure, protect, and move appliances with the right tools and enough manpower.', sources: ['Appliance moving guides', 'Safety checklists', 'Mover prep pages'] },
  { slug: 'how-to-move-office-furniture', title: 'How to Move Office Furniture', description: 'Best practices for moving desks, chairs, and office pieces.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Commercial Moving', answer: 'Label, plan the sequence, protect surfaces, and coordinate access to reduce downtime.', sources: ['Office furniture move guides', 'Commercial moving resources', 'Business relocation pages'] },
  { slug: 'how-to-plan-an-office-move', title: 'How to Plan an Office Move', description: 'How to organize an office relocation without chaos.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Commercial Moving', answer: 'Build a timeline, assign owners, notify vendors, and plan IT, furniture, and access steps in order.', sources: ['Office move planning guides', 'Business relocation checklists', 'Project planning content'] },
  { slug: 'office-move-checklist', title: 'Office Move Checklist', description: 'A practical office move checklist for business teams.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Commercial Moving', answer: 'Use a checklist that covers planning, packing, vendors, IT, move day, and post-move setup.', sources: ['Office move templates', 'Business moving guides', 'Project checklists'] },
  { slug: 'warehouse-moving-services', title: 'What Are Warehouse Moving Services?', description: 'An overview of warehouse relocation services.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Commercial Moving', answer: 'Warehouse moves often need equipment handling, coordination, and careful staging to minimize downtime.', sources: ['Warehouse moving resources', 'Commercial logistics pages', 'Equipment relocation guides'] },
  { slug: 'freight-vs-moving-company', title: 'Freight Shipping vs Moving Company', description: 'How to choose between freight shipping and a moving company.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Comparison', answer: 'Choose based on flexibility, handling, inventory type, insurance, and whether the job is household or freight-focused.', sources: ['Shipping comparison guides', 'Moving company resources', 'Freight service pages'] },
  { slug: 'how-to-move-across-country', title: 'How to Move Across the Country', description: 'A planning guide for long-distance moves.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Long Distance Moving', answer: 'Plan timing, inventory, service level, and transport method before you commit to a cross-country move.', sources: ['Long-distance moving resources', 'Relocation planning guides', 'Inventory checklists'] },
  { slug: 'how-to-move-to-another-state', title: 'How to Move to Another State', description: 'What to plan when relocating across state lines.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Long Distance Moving', answer: 'Check timing, paperwork, housing, transport, and state-specific moving considerations before the move.', sources: ['Interstate moving guides', 'State relocation resources', 'Planning checklists'] },
  { slug: 'how-to-move-senior-citizen', title: 'How to Help a Senior Move', description: 'How to plan a senior move with care and less stress.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Specialized Moving', answer: 'Simplify the move, reduce clutter, and coordinate support, timing, and comfort throughout the process.', sources: ['Senior moving guides', 'Family relocation resources', 'Checklist pages'] },
  { slug: 'how-to-downsize-before-a-move', title: 'How to Downsize Before a Move', description: 'How to reduce inventory before moving day.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Planning', answer: 'Sort items by keep, donate, sell, or discard before packing to save money and time.', sources: ['Downsizing guides', 'Moving prep resources', 'Declutter checklists'] },
  { slug: 'how-to-store-items-during-a-move', title: 'How to Store Items During a Move', description: 'How to plan short-term storage during relocation.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Storage', answer: 'Pick the right storage size, packing plan, and access rules so items stay protected and easy to retrieve.', sources: ['Storage planning guides', 'Moving and storage resources', 'Packing tips'] },
  { slug: 'moving-storage-vs-self-storage', title: 'Moving Storage vs Self-Storage', description: 'How moving storage compares with self-storage.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Storage', answer: 'Choose based on convenience, access, duration, and whether you want the mover to handle the items.', sources: ['Storage comparison guides', 'Moving logistics pages', 'Consumer resources'] },
  { slug: 'what-items-cant-be-moved', title: 'What Items Can’t Be Moved by Movers?', description: 'Common items movers may not take.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Safety & Rules', answer: 'Hazardous, illegal, or highly restricted items often need special handling or cannot be moved at all.', sources: ['Moving restrictions guides', 'Safety regulations', 'Consumer protection pages'] },
  { slug: 'moving-day-preparation-tips', title: 'Moving Day Preparation Tips', description: 'How to get ready for move day without scrambling.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Planning', answer: 'Prep essentials, confirm access, protect items, and keep important documents and valuables separate.', sources: ['Move-day prep guides', 'Packing checklists', 'Logistics resources'] },
  { slug: 'moving-company-red-flags', title: 'Moving Company Red Flags to Watch For', description: 'How to spot bad movers before booking.', updated: '2026-07-20', author: 'Ralph Ivey', category: 'Trust & Safety', answer: 'Watch for vague pricing, poor communication, missing credentials, and pressure tactics.', sources: ['Mover red-flag checklists', 'Consumer complaint guidance', 'Trust resources'] },
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const prettyList = (items) => items.map((item) => `        <li>${item}</li>`).join('\n');
const rel = (p) => p.replace(/\\/g, '/');
const analyticsConfig = {
  ga4Id: process.env.RM_GA4_ID || '',
  clarityId: process.env.RM_CLARITY_ID || '',
  googleSiteVerification: process.env.RM_GOOGLE_SITE_VERIFICATION || '',
  bingSiteVerification: process.env.RM_BING_SITE_VERIFICATION || '',
};

function navLinks() {
  return `
      <a href="/resources.html">Resources</a>
      <a href="/knowledge/index.html">Knowledge Center</a>
      <a href="/states/index.html">States</a>
      <a href="/cities/index.html">Cities</a>
      <a href="/directories/index.html">Directories</a>
      <a href="/blog/index.html">Blog</a>`;
}

function pageShell({ title, description, canonical, body, extraHead = '', jsonld = '' }) {
  const verificationMeta = [
    analyticsConfig.googleSiteVerification ? `  <meta name="google-site-verification" content="${analyticsConfig.googleSiteVerification}" />` : '',
    analyticsConfig.bingSiteVerification ? `  <meta name="msvalidate.01" content="${analyticsConfig.bingSiteVerification}" />` : '',
  ].filter(Boolean).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${description}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="https://relocationmanagerusa.com${canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="https://relocationmanagerusa.com${canonical}" />
  <meta name="twitter:card" content="summary_large_image" />
  <title>${title}</title>
  <link rel="stylesheet" href="/styles.css?v=20260720-1" />
${verificationMeta ? verificationMeta + '\n' : ''}  <script>window.RELOCATION_MANAGER_ANALYTICS_CONFIG = ${JSON.stringify(analyticsConfig)};</script>
  <script defer src="/analytics-loader.js"></script>
  ${extraHead}
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/" aria-label="Relocation Manager home">
      <span class="brand-mark">🦅</span>
      <span>Relocation <b>Manager USA</b></span>
    </a>
    <nav class="nav" aria-label="Local SEO navigation">${navLinks()}</nav>
    <a class="btn btn-outline" href="/resources.html">Resources</a>
  </header>
  <main>
${body}
  </main>
  ${jsonld}
</body>
</html>`;
}

function crumbs(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb">${items.map((i, idx) => idx < items.length - 1 ? `<a href="${i.href}">${i.label}</a> <span aria-hidden="true">›</span>` : `<span>${i.label}</span>`).join(' ')}</nav>`;
}

function statePage(name, slug) {
  const body = `
    <section class="container narrow section-pad">
      ${crumbs([{ href: '/', label: 'Home' }, { href: '/states/index.html', label: 'States' }, { label: name }])}
      <div class="page-head"><div><div class="eyebrow dark">State resources</div><h1>${name} trucking resources</h1><p class="muted">Local trucking and moving information for ${name}. Find parking, freight brokers, repair shops, insurance contacts, and route planning basics.</p></div></div>

      <section class="card" style="margin-bottom:18px;">
        <h2>What drivers usually search for in ${name}</h2>
        <ul class="muted">
          <li>Truck parking and overnight stops</li>
          <li>Freight brokers and dispatch support</li>
          <li>Truck repair, tires, towing, and mobile mechanics</li>
          <li>CDL schools and moving company resources</li>
        </ul>
      </section>

      <section class="card" style="margin-bottom:18px;">
        <h2>Popular local links</h2>
        <div class="profile-tags" style="margin-top:12px;">
          <a class="profile-tag" href="/directories/truck-repair.html">Truck Repair</a>
          <a class="profile-tag" href="/directories/tires.html">Tires</a>
          <a class="profile-tag" href="/directories/towing.html">Towing</a>
          <a class="profile-tag" href="/directories/mobile-mechanics.html">Mobile Mechanics</a>
          <a class="profile-tag" href="/directories/truck-washes.html">Truck Washes</a>
          <a class="profile-tag" href="/directories/freight-brokers.html">Freight Brokers</a>
          <a class="profile-tag" href="/directories/dispatch-services.html">Dispatch Services</a>
        </div>
      </section>

      <section class="card">
        <h2>Related local city pages</h2>
        <p class="muted">Use the city pages to target metro-level trucking searches and local buyer intent.</p>
        <p><a href="/cities/index.html">Browse city pages →</a></p>
      </section>
    </section>`;
  const jsonldData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${name} Trucking Resources`,
    url: `https://relocationmanagerusa.com/states/${slug}.html`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Relocation Manager USA',
      url: 'https://relocationmanagerusa.com/',
    },
    about: 'State-level trucking resources and local SEO landing page.',
  };
  const jsonld = `<script type="application/ld+json">${JSON.stringify(jsonldData)}</script>`;
  return pageShell({ title: `${name} Trucking Resources · Relocation Manager USA`, description: `Local trucking and moving resources for ${name}.`, canonical: `/states/${slug}.html`, body, jsonld });
}

function stateIndex() {
  const cards = states.map(([slug, name]) => `<a class="card" href="/states/${slug}.html"><h3>${name} Trucking Resources</h3><p class="muted">Parking, repair, brokers, and local trucking search intent.</p></a>`).join('\n');
  return pageShell({
    title: 'State Trucking Resources · Relocation Manager USA',
    description: 'Browse trucking resources for every U.S. state.',
    canonical: '/states/index.html',
    body: `
    <section class="container section-pad">
      ${crumbs([{ href: '/', label: 'Home' }, { label: 'States' }])}
      <div class="page-head"><div><div class="eyebrow dark">State SEO hub</div><h1>Truck and moving resources for every state.</h1><p class="muted">State pages help capture local search intent for drivers, carriers, movers, dispatchers, brokers, and fleets.</p></div></div>
      <div class="grid-3">${cards}</div>
    </section>`
  });
}

function cityPage(citySlug, cityLabel, stateName) {
  const [city, st] = cityLabel.split(', ');
  const body = `
    <section class="container narrow section-pad">
      ${crumbs([{ href: '/', label: 'Home' }, { href: '/cities/index.html', label: 'Cities' }, { label: city }])}
      <div class="page-head"><div><div class="eyebrow dark">City resources</div><h1>${city} trucking resources</h1><p class="muted">Local SEO page for ${city}, built for trucking, moving, parking, brokers, and dispatch searches in ${stateName}.</p></div></div>
      <div class="grid-3">
        <article class="card"><h3>${city} truck parking</h3><p class="muted">Parking options, overnight planning, and route-aware stop selection.</p></article>
        <article class="card"><h3>${city} freight brokers</h3><p class="muted">Broker and shipper discovery with trust-first matching.</p></article>
        <article class="card"><h3>${city} repair & service</h3><p class="muted">Truck repair, tires, towing, and mobile mechanic search intent.</p></article>
      </div>
      <section class="card" style="margin-top:18px;">
        <h2>Local trucking intelligence</h2>
        <div class="profile-tags" style="margin-top:12px;">
          <span class="profile-tag">Loads available</span>
          <span class="profile-tag">Truck stops</span>
          <span class="profile-tag">Fuel prices</span>
          <span class="profile-tag">Truck repair</span>
          <span class="profile-tag">Mobile mechanics</span>
          <span class="profile-tag">Hotels</span>
          <span class="profile-tag">Warehouses</span>
          <span class="profile-tag">Freight brokers</span>
          <span class="profile-tag">Local weather</span>
          <span class="profile-tag">Road conditions</span>
          <span class="profile-tag">Local trucking news</span>
        </div>
        <p class="muted" style="margin-top:12px;">These pages are designed so the load, fuel, weather, and service data can be refreshed automatically over time.</p>
      </section>
      <section class="card" style="margin-top:18px;">
        <h2>Nearby directories</h2>
        <div class="profile-tags" style="margin-top:12px;">
          <a class="profile-tag" href="/directories/truck-repair.html">Truck Repair</a>
          <a class="profile-tag" href="/directories/towing.html">Towing</a>
          <a class="profile-tag" href="/directories/freight-brokers.html">Freight Brokers</a>
          <a class="profile-tag" href="/directories/dispatch-services.html">Dispatch Services</a>
          <a class="profile-tag" href="/directories/truck-washes.html">Truck Washes</a>
        </div>
      </section>
      <section class="card" style="margin-top:18px;">
        <h2>Free public CTA</h2>
        <p class="muted">Want access to thousands of verified trucking companies, live load tools, AI assistants, trusted partners, and premium business resources? Join Relocation Manager USA today.</p>
      </section>
    </section>`;
  const jsonldData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${city} Trucking Resources`,
    url: `https://relocationmanagerusa.com/cities/${citySlug}.html`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Relocation Manager USA',
      url: 'https://relocationmanagerusa.com/',
    },
    about: 'City-level trucking resources and local SEO landing page.',
  };
  const jsonld = `<script type="application/ld+json">${JSON.stringify(jsonldData)}</script>`;
  return pageShell({ title: `${city} Trucking Resources · Relocation Manager USA`, description: `Local trucking and moving resources for ${city}, ${stateName}.`, canonical: `/cities/${citySlug}.html`, body, jsonld });
}

function cityIndex() {
  const cards = cities.map(([slug, label]) => `<a class="card" href="/cities/${slug}.html"><h3>${label} Trucking Resources</h3><p class="muted">Local parking, brokers, repair, dispatch, and moving search intent.</p></a>`).join('\n');
  return pageShell({
    title: 'City Trucking Resources · Relocation Manager USA',
    description: 'Browse trucking resources for major U.S. cities, including loads, truck stops, fuel, repair, weather, and brokers.',
    canonical: '/cities/index.html',
    body: `
    <section class="container section-pad">
      ${crumbs([{ href: '/', label: 'Home' }, { label: 'Cities' }])}
      <div class="page-head"><div><div class="eyebrow dark">City SEO hub</div><h1>Major city trucking pages.</h1><p class="muted">These pages target city-level searches such as truck parking, load boards, freight brokers, dispatch services, and moving companies.</p></div></div>
      <div class="grid-3">${cards}</div>
    </section>`
  });
}

function directoryPage(slug, label) {
  const body = `
    <section class="container narrow section-pad">
      ${crumbs([{ href: '/', label: 'Home' }, { href: '/directories/index.html', label: 'Directories' }, { label: label }])}
      <div class="page-head"><div><div class="eyebrow dark">Directory page</div><h1>${label} directory</h1><p class="muted">Searchable directory page for ${label.toLowerCase()} near truck routes, yards, and freight corridors.</p></div></div>

      <section class="card" style="margin-bottom:18px;">
        <h2>What to include on this directory page</h2>
        <ul class="muted">
          <li>Business name, phone, website, and service area</li>
          <li>Hours, truck access notes, and parking details</li>
          <li>Ratings, photos, and fast contact buttons</li>
        </ul>
      </section>

      <section class="card">
        <h2>Related pages</h2>
        <div class="profile-tags" style="margin-top:12px;">
          <a class="profile-tag" href="/states/index.html">State pages</a>
          <a class="profile-tag" href="/cities/index.html">City pages</a>
          <a class="profile-tag" href="/blog/index.html">Blog</a>
          <a class="profile-tag" href="/resources.html">SEO hub</a>
        </div>
      </section>
    </section>`;
  const jsonldData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${label} Directory`,
    url: `https://relocationmanagerusa.com/directories/${slug}.html`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Relocation Manager USA',
      url: 'https://relocationmanagerusa.com/',
    },
  };
  const jsonld = `<script type="application/ld+json">${JSON.stringify(jsonldData)}</script>`;
  return pageShell({ title: `${label} Directory · Relocation Manager USA`, description: `Searchable directory for ${label.toLowerCase()}.`, canonical: `/directories/${slug}.html`, body, jsonld });
}

function directoryIndex() {
  const cards = directories.map(([slug, label]) => `<a class="card" href="/directories/${slug}.html"><h3>${label}</h3><p class="muted">Searchable directory page for local SEO and service discovery.</p></a>`).join('\n');
  return pageShell({
    title: 'Truck Directory Pages · Relocation Manager USA',
    description: 'Searchable directories for trucking and moving businesses.',
    canonical: '/directories/index.html',
    body: `
    <section class="container section-pad">
      ${crumbs([{ href: '/', label: 'Home' }, { label: 'Directories' }])}
      <div class="page-head"><div><div class="eyebrow dark">Directory hub</div><h1>Searchable trucking directories.</h1><p class="muted">Use these pages to rank for service-intent searches and connect local users to real businesses.</p></div></div>
      <div class="grid-3">${cards}</div>
    </section>`
  });
}

function blogIndex() {
  const cards = blogPosts.map((post) => `<a class="card" href="/blog/${post.slug}.html"><h3>${post.title}</h3><p class="muted">${post.description}</p><small>Updated ${post.updated} · ${post.author}</small></a>`).join('\n');
  return pageShell({
    title: 'Trucking Blog · Relocation Manager USA',
    description: 'Trucking articles with sources, authorship, and last updated dates.',
    canonical: '/blog/index.html',
    body: `
    <section class="container section-pad">
      ${crumbs([{ href: '/', label: 'Home' }, { label: 'Blog' }])}
      <div class="page-head"><div><div class="eyebrow dark">AI blog</div><h1>Useful trucking articles every week.</h1><p class="muted">This blog is built for current trucking news and common search questions, with author info, sources, and last-updated dates on every post.</p></div></div>
      <div class="grid-3">${cards}</div>
    </section>`
  });
}

function blogPost(post) {
  const sources = post.sources.map((s) => `<li>${s}</li>`).join('\n');
  const body = `
    <article class="container narrow section-pad">
      ${crumbs([{ href: '/', label: 'Home' }, { href: '/blog/index.html', label: 'Blog' }, { label: post.title }])}
      <div class="page-head"><div><div class="eyebrow dark">${post.category}</div><h1>${post.title}</h1><p class="muted">${post.description}</p></div></div>
      <div class="card" style="margin-bottom:18px;">
        <p><strong>Author:</strong> ${post.author}</p>
        <p><strong>Last updated:</strong> ${post.updated}</p>
        <p><strong>Experience:</strong> Written for working carriers, brokers, dispatchers, and movers.</p>
      </div>
      <section class="card" style="margin-bottom:18px;">
        <h2>Why this matters</h2>
        <p class="muted">${post.intro}</p>
      </section>
      <section class="card" style="margin-bottom:18px;">
        <h2>Key takeaways</h2>
        <ul class="muted">
          <li>Use a repeatable checklist.</li>
          <li>Verify contacts, authority, and business details before booking.</li>
          <li>Link every article to related local and service pages.</li>
        </ul>
      </section>
      <section class="card">
        <h2>Sources</h2>
        <ul class="muted">${sources}</ul>
      </section>
    </article>`;
  const jsonldData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    author: { '@type': 'Person', name: post.author },
    datePublished: post.updated,
    dateModified: post.updated,
    mainEntityOfPage: `https://relocationmanagerusa.com/blog/${post.slug}.html`,
    publisher: { '@type': 'Organization', name: 'Relocation Manager USA', url: 'https://relocationmanagerusa.com/' },
  };
  const jsonld = `<script type="application/ld+json">${JSON.stringify(jsonldData)}</script>`;
  return pageShell({ title: `${post.title} · Relocation Manager USA`, description: post.description, canonical: `/blog/${post.slug}.html`, body, jsonld });
}

function knowledgeIndex() {
  const cards = knowledgePages.map((page) => `<a class="card" href="/knowledge/${page.slug}.html"><h3>${page.title}</h3><p class="muted">${page.description}</p><small>Updated ${page.updated} · ${page.author}</small></a>`).join('\n');
  return pageShell({
    title: 'Free Public Knowledge Center · Relocation Manager USA',
    description: 'Free trucking and moving answers for searchers, carriers, brokers, dispatchers, and owner-operators.',
    canonical: '/knowledge/index.html',
    body: `
    <section class="container section-pad">
      ${crumbs([{ href: '/', label: 'Home' }, { label: 'Knowledge Center' }])}
      <div class="page-head"><div><div class="eyebrow dark">Free public knowledge center</div><h1>Answers people search for on Google.</h1><p class="muted">This is the free part of Relocation Manager USA — built to earn search traffic, build trust, and lead readers toward the paid platform when they need more tools.</p></div></div>
      <div class="grid-3">${cards}</div>
    </section>`,
  });
}

function knowledgePage(page) {
  const sources = page.sources.map((s) => `<li>${s}</li>`).join('\n');
  const body = `
    <article class="container narrow section-pad">
      ${crumbs([{ href: '/', label: 'Home' }, { href: '/knowledge/index.html', label: 'Knowledge Center' }, { label: page.title }])}
      <div class="page-head"><div><div class="eyebrow dark">${page.category}</div><h1>${page.title}</h1><p class="muted">${page.description}</p></div></div>
      <div class="card" style="margin-bottom:18px;">
        <p><strong>Author:</strong> ${page.author}</p>
        <p><strong>Last updated:</strong> ${page.updated}</p>
        <p><strong>Experience:</strong> Written for working trucking and moving businesses.</p>
      </div>
      <section class="card" style="margin-bottom:18px;">
        <h2>Answer</h2>
        <p class="muted">${page.answer}</p>
      </section>
      <section class="card" style="margin-bottom:18px;">
        <h2>What to do next</h2>
        <ul class="muted">
          <li>Use this advice as a starting point, then confirm the details for your lane or business.</li>
          <li>Compare the information against the companies and routes you actually work.</li>
          <li>Link into related state, city, or directory pages for more local help.</li>
        </ul>
      </section>
      <section class="card" style="margin-bottom:18px;">
        <h2>Sources</h2>
        <ul class="muted">${sources}</ul>
      </section>
      <section class="card">
        <h2>Want more?</h2>
        <p class="muted">Want access to thousands of verified trucking companies, live load tools, AI assistants, trusted partners, and premium business resources? Join Relocation Manager USA today.</p>
      </section>
    </article>`;
  const jsonldData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.description,
    author: { '@type': 'Person', name: page.author },
    datePublished: page.updated,
    dateModified: page.updated,
    mainEntityOfPage: `https://relocationmanagerusa.com/knowledge/${page.slug}.html`,
    publisher: { '@type': 'Organization', name: 'Relocation Manager USA', url: 'https://relocationmanagerusa.com/' },
  };
  const jsonld = `<script type="application/ld+json">${JSON.stringify(jsonldData)}</script>`;
  return pageShell({ title: `${page.title} · Relocation Manager USA`, description: page.description, canonical: `/knowledge/${page.slug}.html`, body, jsonld });
}

function write(relPath, content) {
  for (const base of OUTS) {
    const full = path.join(base, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
}

write('states/index.html', stateIndex());
for (const [slug, name] of states) write(`states/${slug}.html`, statePage(name, slug));
write('cities/index.html', cityIndex());
for (const [slug, label] of cities) write(`cities/${slug}.html`, cityPage(slug, label, label.split(', ')[1]));
write('directories/index.html', directoryIndex());
for (const [slug, label] of directories) write(`directories/${slug}.html`, directoryPage(slug, label));
write('blog/index.html', blogIndex());
for (const post of blogPosts) write(`blog/${post.slug}.html`, blogPost(post));
write('knowledge/index.html', knowledgeIndex());
for (const page of knowledgePages) write(`knowledge/${page.slug}.html`, knowledgePage(page));

const publicUrls = [
  '/', '/resources.html', '/states/index.html', '/cities/index.html', '/directories/index.html', '/blog/index.html', '/knowledge/index.html',
  ...states.map(([slug]) => `/states/${slug}.html`),
  ...cities.map(([slug]) => `/cities/${slug}.html`),
  ...directories.map(([slug]) => `/directories/${slug}.html`),
  ...blogPosts.map((post) => `/blog/${post.slug}.html`),
  ...knowledgePages.map((page) => `/knowledge/${page.slug}.html`),
  '/stage-one.html', '/legal.html', '/demo.html'
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicUrls.map((u) => `  <url><loc>https://relocationmanagerusa.com${u}</loc></url>`).join('\n')}\n</urlset>\n`;
const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account/\nDisallow: /api/\nDisallow: /dashboard\nDisallow: /launch/\nDisallow: /success\nDisallow: /thank-you\nDisallow: /signin\nDisallow: /sign-in\nDisallow: /login\nDisallow: /forgot-password\nDisallow: /reset-password\nSitemap: https://relocationmanagerusa.com/sitemap.xml\n`;
for (const base of OUTS) {
  fs.writeFileSync(path.join(base, 'sitemap.xml'), sitemap);
  fs.writeFileSync(path.join(base, 'robots.txt'), robots);
}
console.log(`Generated ${states.length} state pages, ${cities.length} city pages, ${directories.length} directory pages, ${blogPosts.length} blog posts, and ${knowledgePages.length} knowledge pages.`);
