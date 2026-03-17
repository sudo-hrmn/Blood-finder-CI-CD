import { useState, useMemo } from "react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const BLOOD_COLORS = {
  "A+":  { bg: "bg-red-600",    text: "text-white",      light: "bg-red-50",   border: "border-red-200",  hex: "#dc2626" },
  "A-":  { bg: "bg-red-800",    text: "text-white",      light: "bg-red-50",   border: "border-red-300",  hex: "#991b1b" },
  "B+":  { bg: "bg-orange-500", text: "text-white",      light: "bg-orange-50",border: "border-orange-200",hex: "#f97316" },
  "B-":  { bg: "bg-orange-700", text: "text-white",      light: "bg-orange-50",border: "border-orange-300",hex: "#c2410c" },
  "AB+": { bg: "bg-purple-600", text: "text-white",      light: "bg-purple-50",border: "border-purple-200",hex: "#9333ea" },
  "AB-": { bg: "bg-purple-800", text: "text-white",      light: "bg-purple-50",border: "border-purple-300",hex: "#6b21a8" },
  "O+":  { bg: "bg-rose-500",   text: "text-white",      light: "bg-rose-50",  border: "border-rose-200", hex: "#f43f5e" },
  "O-":  { bg: "bg-rose-700",   text: "text-white",      light: "bg-rose-50",  border: "border-rose-300", hex: "#be123c" },
};

const COMPATIBILITY = {
  "A+":  { canDonateTo: ["A+","AB+"],                       canReceiveFrom: ["A+","A-","O+","O-"],              universal: false },
  "A-":  { canDonateTo: ["A+","A-","AB+","AB-"],            canReceiveFrom: ["A-","O-"],                        universal: false },
  "B+":  { canDonateTo: ["B+","AB+"],                       canReceiveFrom: ["B+","B-","O+","O-"],              universal: false },
  "B-":  { canDonateTo: ["B+","B-","AB+","AB-"],            canReceiveFrom: ["B-","O-"],                        universal: false },
  "AB+": { canDonateTo: ["AB+"],                            canReceiveFrom: ["A+","A-","B+","B-","AB+","AB-","O+","O-"], universal: false },
  "AB-": { canDonateTo: ["AB+","AB-"],                      canReceiveFrom: ["A-","B-","AB-","O-"],             universal: false },
  "O+":  { canDonateTo: ["A+","B+","O+","AB+"],             canReceiveFrom: ["O+","O-"],                        universal: false },
  "O-":  { canDonateTo: ["A+","A-","B+","B-","AB+","AB-","O+","O-"], canReceiveFrom: ["O-"],                   universal: true  },
};

const RARE_GROUPS = ["AB-", "B-", "A-", "O-"];

const MOCK_DONORS = [
  { id:1,  name:"Arjun Mehta",      bloodGroup:"O-",  city:"Mumbai",    phone:"+91 98201 11234", lastDonation:"2024-11-10", available:true  },
  { id:2,  name:"Priya Sharma",     bloodGroup:"A+",  city:"Delhi",     phone:"+91 99101 22345", lastDonation:"2025-01-05", available:true  },
  { id:3,  name:"Rahul Gupta",      bloodGroup:"B+",  city:"Bangalore", phone:"+91 97301 33456", lastDonation:"2025-02-14", available:false },
  { id:4,  name:"Sneha Patel",      bloodGroup:"AB+", city:"Chennai",   phone:"+91 96201 44567", lastDonation:"2024-10-20", available:true  },
  { id:5,  name:"Vikram Singh",     bloodGroup:"O+",  city:"Mumbai",    phone:"+91 95101 55678", lastDonation:"2025-01-28", available:false },
  { id:6,  name:"Ananya Reddy",     bloodGroup:"A-",  city:"Hyderabad", phone:"+91 94001 66789", lastDonation:"2024-09-15", available:true  },
  { id:7,  name:"Karthik Nair",     bloodGroup:"B-",  city:"Bangalore", phone:"+91 93201 77890", lastDonation:"2024-12-01", available:true  },
  { id:8,  name:"Deepika Joshi",    bloodGroup:"AB-", city:"Pune",      phone:"+91 92101 88901", lastDonation:"2024-08-20", available:true  },
  { id:9,  name:"Amit Verma",       bloodGroup:"O-",  city:"Delhi",     phone:"+91 91001 99012", lastDonation:"2025-01-10", available:true  },
  { id:10, name:"Meera Krishnan",   bloodGroup:"A+",  city:"Chennai",   phone:"+91 90201 10123", lastDonation:"2025-02-20", available:false },
  { id:11, name:"Suresh Babu",      bloodGroup:"O+",  city:"Hyderabad", phone:"+91 89101 21234", lastDonation:"2024-11-30", available:true  },
  { id:12, name:"Pooja Agarwal",    bloodGroup:"B+",  city:"Jaipur",    phone:"+91 88001 32345", lastDonation:"2024-10-05", available:true  },
  { id:13, name:"Ravi Chandran",    bloodGroup:"AB+", city:"Mumbai",    phone:"+91 87201 43456", lastDonation:"2025-01-15", available:true  },
  { id:14, name:"Lakshmi Iyer",     bloodGroup:"A-",  city:"Bangalore", phone:"+91 86101 54567", lastDonation:"2024-07-22", available:true  },
  { id:15, name:"Naveen Kumar",     bloodGroup:"O-",  city:"Pune",      phone:"+91 85001 65678", lastDonation:"2024-06-18", available:true  },
  { id:16, name:"Sita Devi",        bloodGroup:"B-",  city:"Kolkata",   phone:"+91 84201 76789", lastDonation:"2024-12-10", available:false },
  { id:17, name:"Mohan Das",        bloodGroup:"AB-", city:"Mumbai",    phone:"+91 83101 87890", lastDonation:"2024-05-30", available:true  },
];

function daysSince(dateStr) {
  const d = new Date(dateStr);
  return Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
}

function DropIcon({ size = 20, color = "#dc2626", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className}>
      <path d="M12 2C12 2 5 10.5 5 15a7 7 0 0014 0C19 10.5 12 2 12 2z"/>
    </svg>
  );
}

function HeartIcon({ size = 16, color = "#dc2626" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function PhoneIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.15a16 16 0 006.95 6.95l1.51-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );
}

function MapPinIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function ClockIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function UserIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function BloodGroupBadge({ group, size = "md" }) {
  const c = BLOOD_COLORS[group];
  const sz = size === "lg" ? "text-lg px-4 py-1.5 font-black" : size === "sm" ? "text-xs px-2 py-0.5 font-bold" : "text-sm px-3 py-1 font-bold";
  return (
    <span className={`${c.bg} ${c.text} ${sz} rounded-full inline-flex items-center gap-1 shadow-sm`}>
      <DropIcon size={size === "lg" ? 14 : 10} color="white" />
      {group}
    </span>
  );
}

function DonorCard({ donor, onContact }) {
  const days = daysSince(donor.lastDonation);
  const isUrgent = RARE_GROUPS.includes(donor.bloodGroup);
  const isUniversal = donor.bloodGroup === "O-";
  const c = BLOOD_COLORS[donor.bloodGroup];

  return (
    <div className={`relative bg-white rounded-2xl border-2 ${donor.available ? "border-gray-100" : "border-gray-100"} shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group`}
      style={{ animation: "fadeSlideIn 0.4s ease both" }}>
      {/* Top accent bar */}
      <div className={`h-1 w-full ${c.bg}`} />

      {/* Urgent ribbon */}
      {isUrgent && donor.available && (
        <div className="absolute z-10 top-3 right-3">
          <span className="bg-red-600 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
            ⚡ URGENT
          </span>
        </div>
      )}
      {isUniversal && (
        <div className="absolute z-10 top-3 right-3">
          <span className="bg-gradient-to-r from-rose-600 to-red-800 text-white text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1">
            🌐 UNIVERSAL
          </span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-xl ${c.light} ${c.border} border-2 flex items-center justify-center flex-shrink-0`}>
            <DropIcon size={22} color={c.hex} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-base font-bold text-gray-900 truncate">{donor.name}</h3>
              <BloodGroupBadge group={donor.bloodGroup} size="sm" />
            </div>

            <div className="flex items-center gap-1 mb-2 text-sm text-gray-500">
              <MapPinIcon size={12} />
              <span>{donor.city}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Availability */}
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                donor.available
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${donor.available ? "bg-emerald-500" : "bg-amber-500"}`} />
                {donor.available ? "Available" : "Donated Recently"}
              </span>

              {/* Days since donation */}
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <ClockIcon />
                {days}d ago
              </span>
            </div>
          </div>
        </div>

        {/* Contact button */}
        {donor.available && (
          <button
            onClick={() => onContact(donor)}
            className="mt-4 w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md group-hover:scale-[1.01]"
          >
            <PhoneIcon size={14} />
            Contact Donor
          </button>
        )}
        {!donor.available && (
          <div className="mt-4 w-full bg-gray-50 border border-gray-200 text-gray-400 text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2">
            <ClockIcon size={14} />
            Not Available (donated {days}d ago)
          </div>
        )}
      </div>
    </div>
  );
}

function ContactModal({ donor, onClose }) {
  if (!donor) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm p-8 bg-white shadow-2xl rounded-3xl" onClick={e => e.stopPropagation()}
        style={{ animation: "scaleIn 0.25s ease both" }}>
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-3 bg-red-50 rounded-2xl">
            <DropIcon size={32} color="#dc2626" />
          </div>
          <h3 className="text-xl font-black text-gray-900">{donor.name}</h3>
          <div className="flex justify-center mt-2">
            <BloodGroupBadge group={donor.bloodGroup} size="lg" />
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <MapPinIcon size={16} />
            <span className="font-medium text-gray-700">{donor.city}</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
            <PhoneIcon size={16} />
            <span className="text-base font-bold text-red-700">{donor.phone}</span>
          </div>
          <div className="p-3 text-xs leading-relaxed text-blue-700 bg-blue-50 rounded-xl">
            <strong>Compatibility:</strong> {donor.bloodGroup} can donate to {COMPATIBILITY[donor.bloodGroup].canDonateTo.join(", ")}
          </div>
        </div>

        <a href={`tel:${donor.phone}`} className="flex items-center justify-center w-full gap-2 py-3 mt-5 font-bold text-white transition-all bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl hover:from-red-700 hover:to-rose-700">
          <PhoneIcon size={16} />
          Call Now
        </a>
        <button onClick={onClose} className="w-full py-2 mt-3 text-sm text-gray-400 transition-colors hover:text-gray-600">
          Close
        </button>
      </div>
    </div>
  );
}

function RegistrationForm({ onRegister, onClose }) {
  const [form, setForm] = useState({ name:"", bloodGroup:"A+", city:"", phone:"", lastDonation:"" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!form.name || !form.city || !form.phone) return;
    onRegister({ ...form, id: Date.now(), available: true });
    setSubmitted(true);
    setTimeout(onClose, 1800);
  };

  if (submitted) {
    return (
      <div className="py-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100">
          <span className="text-3xl">✓</span>
        </div>
        <h3 className="text-xl font-black text-emerald-700">Registered!</h3>
        <p className="mt-1 text-sm text-gray-500">Thank you for being a lifesaver 💗</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="flex items-center gap-2 mb-1 text-xl font-black text-gray-900">
        <DropIcon size={20} color="#dc2626" /> Register as Donor
      </h2>
      <p className="mb-6 text-sm text-gray-500">Your donation can save up to 3 lives</p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name *</label>
          <div className="relative">
            <span className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2"><UserIcon /></span>
            <input type="text" placeholder="Your full name" value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="w-full py-3 pl-10 pr-4 text-sm font-medium transition-colors border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Blood Group *</label>
            <select value={form.bloodGroup} onChange={e => setForm({...form, bloodGroup: e.target.value})}
              className="w-full px-3 py-3 text-sm font-bold transition-colors bg-white border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none">
              {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">City *</label>
            <input type="text" placeholder="Your city" value={form.city}
              onChange={e => setForm({...form, city: e.target.value})}
              className="w-full px-3 py-3 text-sm font-medium transition-colors border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Phone Number *</label>
          <div className="relative">
            <span className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2"><PhoneIcon /></span>
            <input type="tel" placeholder="+91 98XXX XXXXX" value={form.phone}
              onChange={e => setForm({...form, phone: e.target.value})}
              className="w-full py-3 pl-10 pr-4 text-sm font-medium transition-colors border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Last Donation Date</label>
          <input type="date" value={form.lastDonation}
            onChange={e => setForm({...form, lastDonation: e.target.value})}
            className="w-full px-4 py-3 text-sm font-medium transition-colors border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none" />
        </div>

        <button onClick={handleSubmit}
          disabled={!form.name || !form.city || !form.phone}
          className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-200 mt-2">
          <HeartIcon size={16} color="white" />
          Register as Donor
        </button>
      </div>
    </div>
  );
}

export default function BloodDonationFinder() {
  const [donors, setDonors] = useState(MOCK_DONORS);
  const [searchGroup, setSearchGroup] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [contactDonor, setContactDonor] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const filtered = useMemo(() => {
    return donors
      .filter(d =>
        (!searchGroup || d.bloodGroup === searchGroup) &&
        (!searchCity || d.city.toLowerCase().includes(searchCity.toLowerCase()) || d.name.toLowerCase().includes(searchCity.toLowerCase()))
      )
      .sort((a, b) => {
        if (a.available !== b.available) return a.available ? -1 : 1;
        return daysSince(a.lastDonation) - daysSince(b.lastDonation);
      });
  }, [donors, searchGroup, searchCity]);

  const groupCounts = useMemo(() => {
    const counts = {};
    BLOOD_GROUPS.forEach(g => {
      counts[g] = donors.filter(d => d.bloodGroup === g && d.available).length;
    });
    return counts;
  }, [donors]);

  const handleRegister = (donor) => {
    setDonors(prev => [donor, ...prev]);
  };

  const availableCount = filtered.filter(d => d.available).length;

  return (
    <div className="min-h-screen" style={{
      background: "linear-gradient(135deg, #fff5f5 0%, #ffffff 40%, #fff1f2 100%)",
      fontFamily: "'Georgia', serif"
    }}>
      <style>{`
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
        @keyframes dropFall { 0% { transform:translateY(-10px); opacity:0; } 100% { transform:translateY(0); opacity:1; } }
        .drop-pulse { animation: dropFall 0.6s ease both; }
        ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:#fff5f5; } ::-webkit-scrollbar-thumb { background:#fca5a5; border-radius:999px; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-30 text-white shadow-2xl bg-gradient-to-r from-red-700 via-red-600 to-rose-600">
        <div className="flex items-center justify-between max-w-6xl px-4 py-4 mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-xl backdrop-blur-sm">
              <DropIcon size={22} color="white" />
            </div>
            <div>
              <h1 className="text-xl font-black leading-tight tracking-tight">BloodLink</h1>
              <p className="text-xs font-medium text-red-200">Donor Finder Network</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold">{donors.filter(d=>d.available).length} Donors Active</span>
            </div>
            <button onClick={() => setShowRegister(true)}
              className="bg-white text-red-700 font-black text-sm px-4 py-2 rounded-xl hover:bg-red-50 transition-colors shadow-lg flex items-center gap-1.5">
              <HeartIcon size={14} color="#dc2626" />
              Register
            </button>
          </div>
        </div>
      </header>

      {/* Hero stats bar */}
      <div className="bg-white border-b border-red-100 shadow-sm">
        <div className="grid max-w-6xl grid-cols-4 gap-2 px-4 py-3 mx-auto md:flex md:items-center md:gap-8">
          {[
            { label:"Total Donors", val: donors.length, icon:"🩸" },
            { label:"Available Now", val: donors.filter(d=>d.available).length, icon:"✅" },
            { label:"Cities Covered", val: [...new Set(donors.map(d=>d.city))].length, icon:"🏙️" },
            { label:"Blood Groups", val: BLOOD_GROUPS.length, icon:"💉" },
          ].map(s => (
            <div key={s.label} className="text-center md:text-left">
              <div className="text-lg font-black text-red-700 md:text-2xl">{s.icon} {s.val}</div>
              <div className="text-xs font-medium leading-tight text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl px-4 py-8 mx-auto">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">

          {/* Sidebar */}
          <div className="space-y-5 lg:col-span-1">

            {/* Search filters */}
            <div className="p-5 bg-white border shadow-sm rounded-2xl border-red-50">
              <h2 className="flex items-center gap-2 mb-4 text-base font-black text-gray-900">
                <SearchIcon size={16} /> Find a Donor
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Blood Group</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {BLOOD_GROUPS.map(g => (
                      <button key={g} onClick={() => setSearchGroup(searchGroup === g ? "" : g)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
                          searchGroup === g
                            ? `${BLOOD_COLORS[g].bg} ${BLOOD_COLORS[g].text} border-transparent shadow-md scale-105`
                            : "border-gray-100 text-gray-600 hover:border-red-200 bg-white"
                        }`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">City / Area</label>
                  <div className="relative">
                    <span className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2"><SearchIcon size={14} /></span>
                    <input type="text" placeholder="Search city..." value={searchCity}
                      onChange={e => setSearchCity(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none text-sm transition-colors" />
                  </div>
                </div>

                {(searchGroup || searchCity) && (
                  <button onClick={() => { setSearchGroup(""); setSearchCity(""); }}
                    className="w-full py-2 text-sm font-bold text-red-600 transition-colors border border-red-200 hover:bg-red-50 rounded-xl">
                    ✕ Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Blood group availability */}
            <div className="p-5 bg-white border shadow-sm rounded-2xl border-red-50">
              <h3 className="mb-3 text-sm font-black tracking-wide text-gray-800 uppercase">Availability by Group</h3>
              <div className="space-y-2">
                {BLOOD_GROUPS.map(g => (
                  <div key={g} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BloodGroupBadge group={g} size="sm" />
                      {RARE_GROUPS.includes(g) && <span className="text-xs font-bold text-red-500">RARE</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-12 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${BLOOD_COLORS[g].bg} rounded-full`}
                          style={{ width: `${Math.min(100, (groupCounts[g] / 4) * 100)}%` }} />
                      </div>
                      <span className={`text-xs font-black ${groupCounts[g] === 0 ? "text-red-500" : "text-gray-700"}`}>
                        {groupCounts[g]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compatibility card */}
            {searchGroup && (
              <div className={`${BLOOD_COLORS[searchGroup].light} ${BLOOD_COLORS[searchGroup].border} border-2 rounded-2xl p-4`}
                style={{ animation:"fadeSlideIn 0.3s ease both" }}>
                <h3 className="flex items-center gap-2 mb-3 text-sm font-black text-gray-800">
                  <DropIcon size={14} color={BLOOD_COLORS[searchGroup].hex} />
                  {searchGroup} Compatibility
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="block mb-1 font-bold text-gray-600">Can Donate To:</span>
                    <div className="flex flex-wrap gap-1">
                      {COMPATIBILITY[searchGroup].canDonateTo.map(g => <BloodGroupBadge key={g} group={g} size="sm" />)}
                    </div>
                  </div>
                  <div>
                    <span className="block mb-1 font-bold text-gray-600">Can Receive From:</span>
                    <div className="flex flex-wrap gap-1">
                      {COMPATIBILITY[searchGroup].canReceiveFrom.map(g => <BloodGroupBadge key={g} group={g} size="sm" />)}
                    </div>
                  </div>
                  {searchGroup === "O-" && (
                    <div className="p-2 mt-2 font-bold text-center text-white rounded-lg bg-rose-600">
                      🌐 Universal Donor!
                    </div>
                  )}
                  {searchGroup === "AB+" && (
                    <div className="p-2 mt-2 font-bold text-center text-white bg-purple-600 rounded-lg">
                      🩺 Universal Recipient!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            {/* Results header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  {searchGroup || searchCity ? "Search Results" : "All Donors"}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  <span className="font-bold text-emerald-600">{availableCount} available</span>
                  {" "}· {filtered.length} total match{filtered.length !== 1 ? "es" : ""}
                  {(searchGroup || searchCity) && <span className="font-medium text-red-500"> (filtered)</span>}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {RARE_GROUPS.filter(g => groupCounts[g] === 0).length > 0 && (
                  <div className="hidden md:flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5 text-red-700 text-xs font-bold">
                    ⚠️ {RARE_GROUPS.filter(g => groupCounts[g] === 0).length} groups critically low
                  </div>
                )}
              </div>
            </div>

            {/* Donor grid */}
            {filtered.length === 0 ? (
              <div className="py-20 text-center bg-white border rounded-2xl border-red-50">
                <DropIcon size={48} color="#fca5a5" className="mx-auto mb-4" />
                <h3 className="mb-2 text-lg font-black text-gray-700">No Donors Found</h3>
                <p className="text-sm text-gray-400">Try a different blood group or location</p>
                <button onClick={() => { setSearchGroup(""); setSearchCity(""); }}
                  className="mt-4 text-sm font-bold text-red-600 hover:underline">
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((donor, i) => (
                  <div key={donor.id} style={{ animationDelay: `${i * 50}ms` }}>
                    <DonorCard donor={donor} onContact={setContactDonor} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowRegister(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()} style={{ animation:"scaleIn 0.25s ease both" }}>
            <button onClick={() => setShowRegister(false)}
              className="absolute flex items-center justify-center w-8 h-8 text-xl font-bold text-gray-400 rounded-full top-4 right-4 hover:text-gray-600 hover:bg-gray-100">×</button>
            <RegistrationForm onRegister={handleRegister} onClose={() => setShowRegister(false)} />
          </div>
        </div>
      )}

      {/* Contact Modal */}
      <ContactModal donor={contactDonor} onClose={() => setContactDonor(null)} />

      {/* Footer */}
      <footer className="py-8 mt-16 text-white bg-gradient-to-r from-red-800 to-rose-700">
        <div className="max-w-6xl px-4 mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DropIcon size={20} color="white" />
            <span className="text-lg font-black">BloodLink</span>
          </div>
          <p className="text-sm text-red-200">Connecting donors with those in need · Every drop counts</p>
          <p className="mt-2 text-xs text-red-300 opacity-70">One blood donation can save up to 3 lives ❤️</p>
        </div>
      </footer>
    </div>
  );
}
