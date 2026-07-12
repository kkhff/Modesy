"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { updateLocationRoute } from "./action";

interface APIData {
  id: number;
  name: string;
  iso2: string;
}

export default function LocationSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State data API wilayah
  const [countries, setCountries] = useState<APIData[]>([]);
  const [states, setStates] = useState<APIData[]>([]);
  const [cities, setCities] = useState<APIData[]>([]);

  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [countryIso, setCountryIso] = useState("");
  const [stateIso, setStateIso] = useState("");

  const [locationForm, setLocationForm] = useState({
    country: "",
    state: "",
    city: "", 
    address: "",
    zipCode: "",
  });

  const headers = {
    "X-CSCAPI-KEY": process.env.NEXT_PUBLIC_CSC_API_KEY || "",
  };

  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("country, state_or_province,city, address, zip_code")
          .eq("id", session.user.id)
          .single();

        if (error) throw error;

        const resCountries = await fetch("https://api.countrystatecity.in/v1/countries", { headers });
        const countriesData = await resCountries.json();
        setCountries(countriesData);

        if (data) {
          setLocationForm({
            country: data.country || "",
            state: data.state_or_province || "",
            city: data.city || "",
            address: data.address || "",
            zipCode: data.zip_code || "",
          });

          const matchedCountry = countriesData.find((c: APIData) => c.name === data.country);
          if (matchedCountry) {
            setCountryIso(matchedCountry.iso2);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load location data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserLocation();
  }, []);

  useEffect(() => {
    if (!countryIso) return;

    const fetchStates = async () => {
      setLoadingStates(true);
      try {
        const res = await fetch(`https://api.countrystatecity.in/v1/countries/${countryIso}/states`, { headers });
        const data = await res.json();
        setStates(data);

        const matchedState = data.find((s: APIData) => s.name === locationForm.state);
        if (matchedState) {
          setStateIso(matchedState.iso2);
        } else {
          setCities([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, [countryIso, locationForm.country]);

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
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, [countryIso, stateIso, locationForm.state]);

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const result = await updateLocationRoute(locationForm);
    setSaving(false);

    if (result.success) {
      toast.success("Location settings saved successfully!");
    } else {
      toast.error(result.error || "Failed to update location");
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-sm p-12 flex flex-col items-center justify-center min-h-[350px]">
        <Loader2 className="w-8 h-8 text-[#00a896] animate-spin mb-2" />
        <p className="text-sm text-gray-500">Loading location parameters...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-200 rounded-sm p-6 sm:p-8 shadow-sm font-sans mb-12">
      <form onSubmit={handleSaveLocation} className="space-y-5">
        
        <label className="text-sm font-semibold text-gray-700 block mb-1">Location</label>

        {/* ================= BARIS 1: DROPDOWNS HORIZONTAL (3 KOLOM) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Country */}
          <div className="relative">
            <select
              value={countryIso}
              onChange={(e) => {
                const option = e.target.options[e.target.selectedIndex];
                setCountryIso(e.target.value);
                setStateIso("");
                setStates([]);
                setCities([]);
                setLocationForm((prev) => ({ ...prev, country: option.text, state: "", city: "" }));
              }}
              className="w-full h-10 px-4 bg-white border border-gray-300 rounded-sm text-sm text-gray-700 appearance-none focus:outline-none focus:border-gray-400 cursor-pointer"
              required
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

          {/* State */}
          <div className="relative">
            <select
              value={stateIso}
              disabled={!countryIso || loadingStates}
              onChange={(e) => {
                const option = e.target.options[e.target.selectedIndex];
                setStateIso(e.target.value);
                setCities([]);
                setLocationForm((prev) => ({ ...prev, state: option.text, city: "" }));
              }}
              className="w-full h-10 px-4 bg-white border border-gray-300 rounded-sm text-sm text-gray-700 appearance-none focus:outline-none focus:border-gray-400 cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed"
              required
            >
              <option value="" disabled hidden>
                {loadingStates ? "Loading..." : "State"}
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

          {/* City */}
          <div className="relative">
            <select
              value={locationForm.city}
              disabled={!stateIso || loadingCities}
              onChange={(e) => setLocationForm((prev) => ({ ...prev, city: e.target.value }))}
              className="w-full h-10 px-4 bg-white border border-gray-300 rounded-sm text-sm text-gray-700 appearance-none focus:outline-none focus:border-gray-400 cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              <option value="">City</option>
              {cities.map((city) => (
                <option key={city.id} value={city.name}>{city.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

        </div>

        {/* ================= BARIS 2: TEXT INPUTS HORIZONTAL (ASIMETRIS) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Address (Memakan space 3/4 lebar baris) */}
          <div className="md:col-span-3">
            <Input
              type="text"
              placeholder="Address"
              value={locationForm.address}
              onChange={(e) => setLocationForm((p) => ({ ...p, address: e.target.value }))}
              className="h-10 border-gray-300 text-gray-700 focus-visible:ring-[#00a896] rounded-sm placeholder:text-gray-400"
            />
          </div>

          {/* Zip Code (Memakan space 1/4 lebar baris Sisanya) */}
          <div className="md:col-span-1">
            <Input
              type="text"
              placeholder="Zip Code"
              value={locationForm.zipCode}
              onChange={(e) => setLocationForm((p) => ({ ...p, zipCode: e.target.value }))}
              className="h-10 border-gray-300 text-gray-700 focus-visible:ring-[#00a896] rounded-sm placeholder:text-gray-400"
            />
          </div>

        </div>

        {/* Checkbox privasi persis Gambar 34 */}
        <div className="flex items-center gap-2 pt-1">
          <input 
            type="checkbox"
            id="showLocation" 
            className="border border-gray-300 w-4 h-4 rounded-xs transition-colors accent-[#00a896] cursor-pointer" 
          />
          <label htmlFor="showLocation" className="text-xs text-gray-500 cursor-pointer select-none">
            Show my location
          </label>
        </div>

        {/* Tombol Simpan */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="h-10 bg-[#00a896] hover:bg-[#009282] text-white text-xs font-semibold px-6 rounded-sm transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {saving ? "Saving changes..." : "Save Changes"}
          </Button>
        </div>

      </form>
    </div>
  );
}