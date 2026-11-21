-- ============================================================================
-- 014_seed_government_agencies.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Seeds authentic, verified Philippine transport & law enforcement authority
-- channels. Pamasahe Tracker is an independent monitoring tool and NOT an
-- official LTFRB, LTO, PNP, or LGU electronic filing gateway.
-- ============================================================================

INSERT INTO public.government_agencies (
  agency_code, agency_name, jurisdiction, categories_handled,
  official_website, official_complaint_url, verified_contact_information,
  submission_instructions, last_verified_at, is_active
)
VALUES
  (
    'ltfrb',
    'LTFRB – Land Transportation Franchising and Regulatory Board',
    'National & Region IV-B (MIMAROPA) – Public Utility Vehicles (Jeepneys, Buses, UV Express, Multicabs)',
    ARRAY[
      'Overcharging',
      'Charging an incorrect fare',
      'Refusal to honor applicable passenger discounts',
      'Unreasonable additional charges',
      'Suspected unauthorized route',
      'Suspected unauthorized operation',
      'Route violations',
      'Refusal to provide service'
    ],
    'https://ltfrb.gov.ph',
    'https://ltfrb.gov.ph',
    '24/7 Hotline: 1342 | Globe/TM: 0917-550-1342 | Smart/TNT/Sun: 0998-550-1342 | Email: complaints@ltfrb.gov.ph / pacd@ltfrb.gov.ph',
    'Download your complaint summary and attach supporting photos/videos. File directly through LTFRB Hotline 1342 or email complaints@ltfrb.gov.ph with plate/body number, date, time, route, and evidence.',
    '2026-11-21',
    true
  ),
  (
    'lto',
    'LTO – Land Transportation Office',
    'National & Region IV-B (MIMAROPA) – Vehicle Registration, Driver Licensing & Roadworthiness',
    ARRAY[
      'Reckless driving',
      'Dangerous overtaking',
      'Distracted driving',
      'Unsafe vehicle condition',
      'Defective vehicle equipment',
      'Suspected lack of required safety equipment',
      'Overloading',
      'Dangerous passenger loading or unloading'
    ],
    'https://lto.gov.ph',
    'https://portal.lto.gov.ph',
    'Aksyon on the Spot SMS/Hotline: (0929) 292-0865 | Trunkline: (02) 8542-4600 | Mobile: 0919-062-4600 | Email: servicecenter@lto.gov.ph',
    'Send your downloaded complaint summary with license plate number, incident date/time, location, and clear photo/video evidence to LTO Aksyon on the Spot (0929) 292-0865 or servicecenter@lto.gov.ph.',
    '2026-11-21',
    true
  ),
  (
    'lgu_ormindoro',
    'Oriental Mindoro Municipal / City LGU (Tricycle Regulatory Boards)',
    'Calapan City & 14 Municipalities of Oriental Mindoro – Municipal Tricycle Franchises & Local Ordinances',
    ARRAY[
      'Overcharging',
      'Charging an incorrect fare',
      'Refusal to honor applicable passenger discounts',
      'Unreasonable additional charges',
      'Refusal to provide service',
      'Suspected unauthorized operation',
      'Lost belongings'
    ],
    'https://ormindoro.gov.ph',
    'https://cityofcalapan.gov.ph',
    'Contact the respective Municipal Hall Sangguniang Bayan / Municipal Tricycle Regulatory Board (MTFRB) or Calapan City Public Safety Department (CPSD) / TFRB where the tricycle operates.',
    'Municipal tricycle franchises and local fare ordinances are enforced by each City or Municipal LGU. Submit your complaint reference summary and TODA/body/plate number directly to the local LGU Public Safety or Tricycle Regulatory desk.',
    '2026-11-21',
    true
  ),
  (
    'pnp_hpg',
    'PNP – Highway Patrol Group (PNP HPG)',
    'National & Provincial Highways – Traffic-Related Criminal Incidents & Urgent Road Safety',
    ARRAY[
      'Verbal harassment',
      'Passenger discrimination',
      'Reckless driving',
      'Dangerous overtaking',
      'Other inappropriate behavior',
      'Other incidents'
    ],
    'https://pnp.gov.ph',
    'https://hpgims-mvcd.pnp.gov.ph/',
    'Emergency Dispatch: 911 | PNP HPG Direct: (02) 8723-0401 | Mobile: 0998-598-6626 / 0917-683-3333 | Email: hpg@pnp.gov.ph',
    'For urgent safety threats, harassment, or active traffic crimes, call 911 or coordinate with the nearest Oriental Mindoro Municipal Police Station / PNP HPG desk with your complaint summary and evidence.',
    '2026-11-21',
    true
  )
ON CONFLICT (agency_code) DO UPDATE
  SET agency_name = EXCLUDED.agency_name,
      jurisdiction = EXCLUDED.jurisdiction,
      categories_handled = EXCLUDED.categories_handled,
      official_website = EXCLUDED.official_website,
      official_complaint_url = EXCLUDED.official_complaint_url,
      verified_contact_information = EXCLUDED.verified_contact_information,
      submission_instructions = EXCLUDED.submission_instructions,
      last_verified_at = EXCLUDED.last_verified_at,
      is_active = true;
