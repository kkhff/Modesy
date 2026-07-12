"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import toast from "react-hot-toast";

interface APIData {
  id: number;
  name: string;
  iso2: string;
}

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => Promise<void>;
  saving: boolean;
  editData: any;
}

export default function AddressModal({ isOpen, onClose, onSave, saving, editData }: AddAddressModalProps) {
  // State data API wilayah
  const [countries, setCountries] = useState<APIData[]>([]);
  const [states, setStates] = useState<APIData[]>([]);
  const [cities, setCities] = useState<APIData[]>([]);

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [countryIso, setCountryIso] = useState("");
  const [stateIso, setStateIso] = useState("");

  const [form, setForm] = useState({
    id: "",
    addressType: "Shipping Address",
    addressTitle: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    country: "",
    state: "",
    city: "",
    zipCode: "",
    address: "",
  });

  const headers = {
    "X-CSCAPI-KEY": process.env.NEXT_PUBLIC_CSC_API_KEY || "",
  };

  // 1. Sinkronisasi data saat mode edit dibuka
  useEffect(() => {
    if (isOpen) {
      // Load daftar negara pertama kali modal kebuka
      fetch("https://api.countrystatecity.in/v1/countries", { headers })
        .then((res) => res.json())
        .then((data) => {
          setCountries(data);
          
          if (editData && editData.id) {
            setForm(editData);
            const matchedCountry = data.find((c: APIData) => c.name === editData.country);
            if (matchedCountry) setCountryIso(matchedCountry.iso2);
          } else {
            // Reset form jika mode tambah baru
            setForm({
              id: "",
              addressType: "Shipping Address",
              addressTitle: "",
              firstName: "",
              lastName: "",
              email: "",
              phoneNumber: "",
              country: "",
              state: "",
              city: "",
              zipCode: "",
              address: "",
            });
            setCountryIso("");
            setStateIso("");
            setStates([]);
            setCities([]);
          }
        })
        .catch((err) => console.error("Error load countries:", err));
    }
  }, [isOpen, editData]);

  // 2. Fetch Provinsi pas Negara berubah
  useEffect(() => {
    if (!countryIso) return;

    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await fetch(`https://api.countrystatecity.in/v1/countries/${countryIso}/states`, { headers });
        const data = await res.json();
        setStates(data);

        if (editData && editData.state && form.state === editData.state) {
          const matchedState = data.find((s: APIData) => s.name === editData.state);
          if (matchedState) setStateIso(matchedState.iso2);
        }
      } catch (err) {
        console.error(err);
      } {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, [countryIso]);

  // 3. Fetch Kota pas Provinsi berubah
  useEffect(() => {
    if (!countryIso || !stateIso) return;

    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const res = await fetch(`https://api.countrystatecity.in/v1/countries/${countryIso}/states/${stateIso}/cities`, { headers });
        const data = await res.json();
        setCities(data);
      } catch (err) {
        console.error(err);
      } {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, [countryIso, stateIso]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-sm w-full max-w-[600px] shadow-xl overflow-hidden relative border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 text-center w-full ml-6">
            {form.id ? "Edit Address" : "Add New Address"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Isi Data */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-semibold text-gray-600">
          
          <div className="space-y-1">
            <label>Address Type</label>
            <select name="addressType" value={form.addressType} onChange={handleInputChange} className="w-full h-10 px-3 bg-white border border-gray-300 rounded-sm text-sm text-gray-700 outline-none focus:border-gray-400 cursor-pointer">
              <option value="Shipping Address">Shipping Address</option>
              <option value="Billing Address">Billing Address</option>
            </select>
          </div>

          <div className="space-y-1">
            <label>Address Title</label>
            <Input type="text" name="addressTitle" placeholder="Address Title (e.g. Home, Office)" value={form.addressTitle} onChange={handleInputChange} required className="h-10 border-gray-300 focus-visible:ring-[#00a896]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label>First Name</label>
              <Input type="text" name="firstName" placeholder="First Name" value={form.firstName} onChange={handleInputChange} required className="h-10 border-gray-300 focus-visible:ring-[#00a896]" />
            </div>
            <div className="space-y-1">
              <label>Last Name</label>
              <Input type="text" name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleInputChange} className="h-10 border-gray-300 focus-visible:ring-[#00a896]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label>Email</label>
              <Input type="email" name="email" placeholder="Email" value={form.email} onChange={handleInputChange} required className="h-10 border-gray-300 focus-visible:ring-[#00a896]" />
            </div>
            <div className="space-y-1">
              <label>Phone Number</label>
              <Input type="text" name="phoneNumber" placeholder="Phone Number" value={form.phoneNumber} onChange={handleInputChange} required className="h-10 border-gray-300 focus-visible:ring-[#00a896]" />
            </div>
          </div>

          {/* Dinamifikasi Kolom Wilayah Bertingkat */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label>Country</label>
              <select
                value={countryIso}
                onChange={(e) => {
                  const option = e.target.options[e.target.selectedIndex];
                  setCountryIso(e.target.value);
                  setStateIso("");
                  setStates([]);
                  setCities([]);
                  setForm((p) => ({ ...p, country: option.text, state: "", city: "" }));
                }}
                className="w-full h-10 px-3 bg-white border border-gray-300 rounded-sm text-sm text-gray-700 outline-none focus:border-gray-400 cursor-pointer"
                required
              >
                <option value="">Select Country</option>
                {countries.map((c) => <option key={c.id} value={c.iso2}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label>State</label>
              <select
                value={stateIso}
                disabled={!countryIso || loadingStates}
                onChange={(e) => {
                  const option = e.target.options[e.target.selectedIndex];
                  setStateIso(e.target.value);
                  setCities([]);
                  setForm((p) => ({ ...p, state: option.text, city: "" }));
                }}
                className="w-full h-10 px-3 bg-white border border-gray-300 rounded-sm text-sm text-gray-700 outline-none focus:border-gray-400 cursor-pointer disabled:bg-gray-50"
                required
              >
                <option value="">{loadingStates ? "Loading..." : "Select State"}</option>
                {states.map((s) => <option key={s.id} value={s.iso2}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label>City</label>
              <select
                name="city"
                value={form.city}
                disabled={!stateIso || loadingCities}
                onChange={handleInputChange}
                className="w-full h-10 px-3 bg-white border border-gray-300 rounded-sm text-sm text-gray-700 outline-none focus:border-gray-400 cursor-pointer disabled:bg-gray-50"
                required
              >
                <option value="">{loadingCities ? "Loading..." : "Select City"}</option>
                {cities.map((city) => <option key={city.id} value={city.name}>{city.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label>Zip Code</label>
              <Input type="text" name="zipCode" placeholder="Zip Code" value={form.zipCode} onChange={handleInputChange} required className="h-10 border-gray-300 focus-visible:ring-[#00a896]" />
            </div>
          </div>

          <div className="space-y-1">
            <label>Address</label>
            <Input type="text" name="address" placeholder="Address" value={form.address} onChange={handleInputChange} required className="h-10 border-gray-300 focus-visible:ring-[#00a896]" />
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={saving} className="h-10 bg-[#00a896] hover:bg-[#009282] text-white text-xs font-semibold px-8 rounded-sm transition-colors shadow-xs">
              {saving ? "Submitting..." : "Submit"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}