-- Seed data mirroring knowledge/doctors.json, services.json, faq.json.
-- Run after schema-dental.sql. Safe to re-run (upserts on natural keys).

insert into doctors (slug, name, specialty, qualification, experience_years, biography, treatments, languages, working_days, working_hours_start, working_hours_end, image_path)
values
  ('sarah-johnson', 'Dr. Sarah Johnson', 'General Dentist', 'BDS, MDS (Conservative Dentistry)', 12,
   'Dr. Johnson leads our general dentistry practice with a gentle, prevention-first approach, helping patients maintain healthy smiles for life.',
   array['Dental Check-up','Cleaning','Tooth Filling','Extraction','Preventive Dentistry'],
   array['English','Tamil','Hindi'], array['Mon','Tue','Wed','Thu','Fri'], '09:00', '17:00', '/doctors/sarah-johnson.jpg'),

  ('david-wilson', 'Dr. David Wilson', 'Orthodontist', 'BDS, MDS (Orthodontics)', 10,
   'Dr. Wilson specializes in modern alignment solutions, from traditional braces to Invisalign, tailored to each patient''s lifestyle.',
   array['Braces','Invisalign','Teeth Alignment','Jaw Alignment'],
   array['English','Tamil'], array['Mon','Wed','Fri','Sat'], '10:00', '18:00', '/doctors/david-wilson.jpg'),

  ('emily-brown', 'Dr. Emily Brown', 'Endodontist', 'BDS, MDS (Endodontics)', 9,
   'Dr. Brown focuses on root canal therapy and urgent tooth pain relief, known for a calm, reassuring chairside manner.',
   array['Root Canal','Emergency Tooth Pain','Dental Infection'],
   array['English','Hindi'], array['Tue','Thu','Sat'], '09:00', '16:00', '/doctors/emily-brown.jpg'),

  ('michael-lee', 'Dr. Michael Lee', 'Periodontist', 'BDS, MDS (Periodontology)', 14,
   'Dr. Lee is our most experienced specialist, treating gum disease and placing dental implants with a meticulous, long-term-health focus.',
   array['Scaling','Root Planing','Gum Disease','Dental Implants'],
   array['English','Tamil'], array['Mon','Tue','Thu','Fri'], '09:00', '17:00', '/doctors/michael-lee.jpg'),

  ('olivia-davis', 'Dr. Olivia Davis', 'Pediatric Dentist', 'BDS, MDS (Pediatric Dentistry)', 8,
   'Dr. Davis makes dental visits stress-free for children, specializing in gentle care from first teeth through adolescence.',
   array['Children Dentistry','Baby Teeth','Fluoride','Dental Sealants'],
   array['English','Tamil'], array['Mon','Wed','Thu','Sat'], '09:00', '15:00', '/doctors/olivia-davis.jpg'),

  ('james-anderson', 'Dr. James Anderson', 'Cosmetic Dentist', 'BDS, MDS (Prosthodontics)', 11,
   'Dr. Anderson designs smile transformations, combining artistry and dental science for natural-looking cosmetic results.',
   array['Smile Makeover','Teeth Whitening','Veneers','Smile Design'],
   array['English','Hindi'], array['Tue','Wed','Fri','Sat'], '10:00', '18:00', '/doctors/james-anderson.jpg')
on conflict (slug) do nothing;

insert into services (name, category, duration_minutes) values
  ('Dental Check-up', 'General Dentistry', 30),
  ('Cleaning', 'General Dentistry', 30),
  ('Tooth Filling', 'General Dentistry', 45),
  ('Extraction', 'General Dentistry', 45),
  ('Preventive Dentistry', 'General Dentistry', 30),
  ('Braces', 'Orthodontics', 60),
  ('Invisalign', 'Orthodontics', 60),
  ('Teeth Alignment', 'Orthodontics', 45),
  ('Jaw Alignment', 'Orthodontics', 45),
  ('Root Canal', 'Endodontics', 60),
  ('Emergency Tooth Pain', 'Endodontics', 30),
  ('Dental Infection', 'Endodontics', 30),
  ('Scaling', 'Periodontics', 30),
  ('Root Planing', 'Periodontics', 45),
  ('Gum Disease', 'Periodontics', 45),
  ('Dental Implants', 'Periodontics', 90),
  ('Children Dentistry', 'Pediatric Dentistry', 30),
  ('Baby Teeth', 'Pediatric Dentistry', 30),
  ('Fluoride', 'Pediatric Dentistry', 20),
  ('Dental Sealants', 'Pediatric Dentistry', 20),
  ('Smile Makeover', 'Cosmetic Dentistry', 90),
  ('Teeth Whitening', 'Cosmetic Dentistry', 45),
  ('Veneers', 'Cosmetic Dentistry', 60),
  ('Smile Design', 'Cosmetic Dentistry', 60)
on conflict (name) do nothing;

insert into faq (question, answer, category) values
  ('What are your clinic timings?', 'We''re open Monday to Friday 9:00 AM - 7:00 PM, Saturday 9:00 AM - 4:00 PM, and closed on Sunday.', 'General'),
  ('Where is the clinic located?', '221 Marina Boulevard, Velankanni, Tamil Nadu.', 'General'),
  ('Do you accept insurance?', 'We accept Star Health, HDFC Ergo, ICICI Lombard, and self-pay.', 'Billing'),
  ('How do I book an appointment?', 'Chat with our AI receptionist — it can book, reschedule, or cancel appointments directly.', 'Booking'),
  ('Can I reschedule or cancel my appointment?', 'Yes, share your appointment ID or phone number in the chat and the receptionist will help.', 'Booking'),
  ('Do you treat dental emergencies?', 'Yes, Dr. Emily Brown handles emergency tooth pain and dental infections.', 'Emergency')
on conflict do nothing;
