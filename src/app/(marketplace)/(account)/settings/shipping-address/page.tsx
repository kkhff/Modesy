"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, CirclePlus, SquarePen, Truck } from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { getAddressesRoute, saveAddressRoute, deleteAddressRoute } from "./action";
import AddressModal from "@/components/modals/AddressModal"; // Import modal yang dipisah

export default function ShippingAddressPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);

  const fetchAddresses = async () => {
    setLoading(true);
    const res = await getAddressesRoute();
    if (res.success && res.data) {
      setAddresses(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSaveAddress = async (formData: any) => {
    setSaving(true);
    const res = await saveAddressRoute(formData);
    setSaving(false);

    if (res.success) {
      toast.success(formData.id ? "Address updated!" : "Address added successfully!");
      setIsModalOpen(false);
      fetchAddresses();
    } else {
      toast.error(res.error || "Something went wrong");
    }
  };

  const handleEditClick = (address: any) => {
    setSelectedAddress({
      id: address.id,
      addressType: address.address_type,
      addressTitle: address.address_title,
      firstName: address.first_name,
      lastName: address.last_name || "",
      email: address.email,
      phoneNumber: address.phone_number,
      country: address.country,
      state: address.state,
      city: address.city,
      zipCode: address.zip_code,
      address: address.address,
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#00a896", // Warna toska tema kita
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "rounded-sm text-sm font-sans", // Menyesuaikan dengan style UI kita
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        // Tampilkan loading kecil saat proses hapus berlangsung
        const loadingToast = toast.loading("Deleting address...");
        
        const res = await deleteAddressRoute(id);
        
        toast.dismiss(loadingToast);

        if (res.success) {
          Swal.fire({
            title: "Deleted!",
            text: "Your address has been deleted.",
            icon: "success",
            confirmButtonColor: "#00a896",
            customClass: {
              popup: "rounded-sm text-sm font-sans",
            }
          });
          fetchAddresses(); // Refresh data list
        } else {
          toast.error(res.error || "Failed to delete");
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="w-full bg-white border border-gray-200 rounded-sm p-12 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#00a896] animate-spin mb-2" />
        <p className="text-sm text-gray-500">Loading your addresses...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">

      {addresses.length === 0 ? (
        <p className="text-sm text-gray-400">You have not added a shipping address yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-white border border-gray-200 rounded-sm p-5 shadow-xs relative flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded-sm inline-flex items-center gap-1 mb-3">
                  <Truck className="w-3 h-3" /> {addr.address_type}
                </span>
                <h3 className="text-sm font-bold text-gray-800 mb-1">{addr.address_title}</h3>
                <p className="text-sm text-gray-600 font-medium">{addr.first_name} {addr.last_name}</p>
                <p className="text-xs text-gray-500 mt-1">{addr.address}, {addr.city}, {addr.state}, {addr.country}</p>
                <p className="text-xs text-gray-400 mt-2">{addr.email} | {addr.phone_number}</p>
              </div>

              <div className="flex items-center gap-4 mt-5 pt-3 border-t border-gray-100 text-gray-400">
                <button onClick={() => handleEditClick(addr)} className="hover:text-[#00a896] transition-colors cursor-pointer">
                  <SquarePen className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteClick(addr.id)} className="hover:text-red-500 transition-colors cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={() => { setSelectedAddress(null); setIsModalOpen(true); }}
        className="h-10 bg-[#00a896] hover:bg-[#009282] text-white text-xs font-semibold px-5 rounded-sm transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
      >
        <CirclePlus className="w-4 h-4" /> Add New Address
      </Button>

      {/* RENDER MODAL YANG SUDAH DIPISAH */}
      <AddressModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAddress}
        saving={saving}
        editData={selectedAddress}
      />

    </div>
  );
}