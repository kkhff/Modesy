"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation?: (location: string) => void;
}

interface APIData {
  id: number;
  name: string;
  iso2: string;
}

export default function LocationModal({
  isOpen,
  onClose,
  onSelectLocation,
}: LocationModalProps) {
  const [countries, setCountries] = useState<APIData[]>([]);
  const [states, setStates] = useState<APIData[]>([]);
  const [cities, setCities] = useState<APIData[]>([]);

  const [selectedCountry, setSelectedCountry] = useState({ name: "", iso2: "" });
  const [selectedState, setSelectedState] = useState({ name: "", iso2: "" });
  const [selectedCity, setSelectedCity] = useState("");

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const headers = {
    "X-CSCAPI-KEY": process.env.NEXT_PUBLIC_CSC_API_KEY || "",
  };

  // 1. Fetch semua negara pas modal pertama kali dibuka
  useEffect(() => {
    if (!isOpen) return;

    const fetchCountries = async () => {
      try {
        const res = await fetch("https://api.countrystatecity.in/v1/countries", { headers });
        if (!res.ok) throw new Error("Failed to fetch countries");
        const data = await res.json();
        setCountries(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load countries data");
      }
    };

    fetchCountries();
  }, [isOpen]);

  // 2. Fetch Provinsi (States) pas Negara dipilih
  useEffect(() => {
    if (!selectedCountry.iso2) {
      setStates([]);
      setCities([]);
      return;
    }

    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await fetch(
          `https://api.countrystatecity.in/v1/countries/${selectedCountry.iso2}/states`,
          { headers }
        );
        const data = await res.json();
        setStates(data);
        setSelectedState({ name: "", iso2: "" }); // Reset state & city di atasnya
        setSelectedCity("");
        setCities([]);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load regional data");
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, [selectedCountry.iso2]);

  // 3. Fetch Kota (Cities) pas Provinsi dipilih
  useEffect(() => {
    if (!selectedCountry.iso2 || !selectedState.iso2) {
      setCities([]);
      return;
    }

    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const res = await fetch(
          `https://api.countrystatecity.in/v1/countries/${selectedCountry.iso2}/states/${selectedState.iso2}/cities`,
          { headers }
        );
        const data = await res.json();
        setCities(data);
        setSelectedCity(""); // Reset kota sebelumnya
      } catch (err) {
        console.error(err);
        toast.error("Failed to load cities data");
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, [selectedCountry.iso2, selectedState.iso2]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSelectLocation) {
      // Gabungkan text lokasi, abaikan nilai kosong jika ada negara yang tidak punya data state/city
      const displayLocation = [selectedCity, selectedState.name, selectedCountry.name]
        .filter(Boolean)
        .join(", ");
      onSelectLocation(displayLocation);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[430px] p-6 rounded-sm bg-white border border-gray-200 shadow-md font-sans">
        
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-medium text-center text-[#222]">
            Select Location
          </DialogTitle>
          <p className="text-xs text-center text-gray-400 !mt-1">
            Filter products by location
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          
          {/* ================= STEP 1: COUNTRY ================= */}
          <div className="relative">
            <select
              value={selectedCountry.iso2}
              onChange={(e) => {
                const option = e.target.options[e.target.selectedIndex];
                setSelectedCountry({
                  iso2: e.target.value,
                  name: option.text,
                });
              }}
              className="w-full h-11 px-4 bg-white border border-gray-300 rounded-sm text-sm text-gray-700 appearance-none focus:outline-none focus:border-gray-400 focus:ring-0 cursor-pointer"
            >
              <option value="" disabled hidden>Country</option>
              {countries.map((c) => (
                <option key={c.id} value={c.iso2}>{c.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* ================= STEP 2: STATE ================= */}
          {selectedCountry.iso2 && (
            <div className="relative animate-in fade-in duration-200">
              <select
                value={selectedState.iso2}
                onChange={(e) => {
                  const option = e.target.options[e.target.selectedIndex];
                  setSelectedState({
                    iso2: e.target.value,
                    name: option.text,
                  });
                }}
                disabled={loadingStates}
                className="w-full h-11 px-4 bg-white border border-gray-300 rounded-sm text-sm text-gray-700 appearance-none focus:outline-none focus:border-gray-400 focus:ring-0 cursor-pointer disabled:bg-gray-50"
              >
                <option value="" disabled hidden>
                  {loadingStates ? "Loading regions..." : "State"}
                </option>
                {states.map((s) => (
                  <option key={s.id} value={s.iso2}>{s.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}

          {/* ================= STEP 3: CITY ================= */}
          {selectedCountry.iso2 && selectedState.iso2 && (
            <div className="relative animate-in fade-in duration-200">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={loadingCities}
                className="w-full h-11 px-4 bg-white border border-gray-300 rounded-sm text-sm text-gray-700 appearance-none focus:outline-none focus:border-gray-400 focus:ring-0 cursor-pointer disabled:bg-gray-50"
              >
                <option value="" disabled hidden>
                  {loadingCities ? "Loading cities..." : "City"}
                </option>
                {cities.map((ct) => (
                  <option key={ct.id} value={ct.name}>{ct.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!selectedCountry.iso2}
            className="w-full h-11 bg-[#00a896] hover:bg-[#009282] text-white text-sm font-medium rounded-sm transition-colors cursor-pointer !mt-6 shadow-xs disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Select Location
          </Button>

        </form>
      </DialogContent>
    </Dialog>
  );
}