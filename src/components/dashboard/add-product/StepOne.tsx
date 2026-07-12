"use client";

import React, { useState, useRef, useEffect } from "react";
import { UploadCloud, ChevronDown, Sparkles, Image as ImageIcon, CircleAlert, Trash2 } from "lucide-react";
import { Editor } from "@tinymce/tinymce-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import AIWriterModal from "./AIWriterModal";

interface StepOneProps {
  data: any;
  updateData: React.Dispatch<React.SetStateAction<any>>;
  onNext: () => void;
}

export default function StepOne({ data, updateData, onNext }: StepOneProps) {
  const [activeLangModal, setActiveLangModal] = useState<"en" | "id" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [dbBrands, setDbBrands] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
                        
  const [selectedGrandparent, setSelectedGrandparent] = useState("");
  const [selectedParent, setSelectedParent] = useState("");

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        const [catRes, brandRes] = await Promise.all([
          supabase.from("categories").select("*").eq("status", true).order("order_number", { ascending: true }),
          supabase.from("brands").select("*")
        ]);

        if (catRes.data) {
          setDbCategories(catRes.data);
          
          // --- REKONSTRUKSI STATE KATEGORI SAAT BACK DARI STEP 2 ---
          if (data.category) {
            const currentCatId = Number(data.category);
            const currentCat = catRes.data.find(c => c.id === currentCatId);
            
            if (currentCat) {
              // Jika ini kategori level 3 (Child)
              if (currentCat.parent_id !== null) {
                const parentCat = catRes.data.find(c => c.id === currentCat.parent_id);
                
                if (parentCat && parentCat.parent_id !== null) {
                  // Berarti fix 3 level: Grandparent -> Parent -> Child
                  setSelectedGrandparent(String(parentCat.parent_id));
                  setSelectedParent(String(parentCat.id));
                } else if (parentCat) {
                  // Berarti cuma 2 level: Grandparent -> Parent (Kategori saat ini adalah Child)
                  setSelectedGrandparent(String(parentCat.id));
                  setSelectedParent(String(currentCat.id));
                }
              } else {
                // Jika user cuma milih Grandparent saja sejak awal
                setSelectedGrandparent(String(currentCat.id));
              }
            }
          }
        }
        if (brandRes.data) setDbBrands(brandRes.data);
      } catch (err) {
        console.error("Gagal memuat metadata e-commerce:", err);
      } finally {
        setLoadingDb(false);
      }
    };
    fetchMetadata();
  }, [data.category]); // <--- Tambahkan data.category sebagai dependency tracking

  const grandparents = dbCategories.filter(c => c.parent_id === null);
  const parents = dbCategories.filter(c => c.parent_id === Number(selectedGrandparent));
  const children = dbCategories.filter(c => c.parent_id === Number(selectedParent));

  const handleChange = (field: string, value: any) => {
    updateData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Drag and Drop Event Handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files.length) return;
    handleFiles(files);
  };

  // Penggabungan file baru ke dalam state array images global
  const handleFiles = async (files: FileList) => {
    const selectedFiles = Array.from(files);
    
    // Proses semua gambar secara paralel untuk dikompresi ke .webp
    const processedFiles = await Promise.all(
      selectedFiles.map((file) => processImageToWebp(file))
    );

    // Simpan hasil kompresi .webp yang ringan ke state parent
    handleChange("images", [...(data.images || []), ...processedFiles]);
  };

  const handleBrowseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    handleFiles(e.target.files);
    e.target.value = ""; // Reset input value biar file yang sama bisa dipilih ulang
  };

  // Fungsi menghapus gambar dari list preview
  const removeImage = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Biar gak memicu event browse box
    const filteredImages = (data.images || []).filter((_: any, idx: number) => idx !== indexToRemove);
    handleChange("images", filteredImages);
  };

  const handleAiOutput = (text: string) => {
    if (activeLangModal === "en") handleChange("descEn", text);
    if (activeLangModal === "id") handleChange("descId", text);
  };

  const processImageToWebp = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Atur batas resolusi maksimum (misalnya maks lebar/tinggi 1200px)
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          // Konversi ke blob format webp dengan kualitas kompresi 0.8 (80%)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Ubah ekstensi nama file asli menjadi .webp
                const newName = file.name.substring(0, file.name.lastIndexOf(".")) + ".webp";
                const processedFile = new File([blob], newName, {
                  type: "image/webp",
                  lastModified: Date.now(),
                });
                resolve(processedFile);
              } else {
                resolve(file); // Fallback ke file asli jika blob gagal
              }
            },
            "image/webp",
            0.8
          );
        };
      };
    });
  };

  return (
    <div className="space-y-6 font-sans text-sm text-slate-600">
      
      {/* 1. IMAGES UPLOAD AREA */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2">Images</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <div
          onClick={handleBrowseClick}
          onDragEnter={() => setIsDragging(true)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-sm p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 select-none group
            ${isDragging ? "border-[#00a896] bg-teal-50" : "border-slate-200 bg-slate-50/50 hover:border-[#00a896]"}`}
        >
          <UploadCloud className={`w-10 h-10 mb-2 transition-colors duration-200 ${isDragging ? "text-[#00a896]" : "text-slate-400 group-hover:text-[#00a896]"}`} />
          <p className="text-xs text-slate-500 text-center">
            Drag and drop images here or{" "}
            <span className="text-[#00a896] font-medium underline hover:text-[#009282]">Browse Files</span>
          </p>
          {isDragging && <p className="mt-2 text-xs font-medium text-[#00a896]">Release to upload images</p>}
        </div>

        {/* COMPONENT IMAGE PREVIEW GRID */}
        {data.images && data.images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 p-3 bg-slate-50/50 border border-slate-200 rounded-sm">
            {data.images.map((file: File, idx: number) => {
              const previewUrl = URL.createObjectURL(file);
              return (
                <div key={idx} className="relative aspect-square border border-slate-200 bg-white rounded-sm overflow-hidden group shadow-2xs">
                  <img 
                    src={previewUrl} 
                    alt={`Preview ${idx}`} 
                    className="w-full h-full object-cover"
                    onLoad={() => URL.revokeObjectURL(previewUrl)} // Bersihkan memori blob setelah dimuat
                  />
                  {/* Tombol Delete Overlap */}
                  <button
                    type="button"
                    onClick={(e) => removeImage(idx, e)}
                    className="absolute top-1 right-1 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 bg-[#00a896] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-xs">
                      Main
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-start gap-2 mt-2 text-slate-400">
          <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="text-xs">
            You can click on the <strong>"Main"</strong> button on the images to select the main image of your product.
          </span>
        </div>
      </div>

      {/* 2. PRODUCT TYPE */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-3">Product Type</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={`border rounded-sm p-4 flex items-start gap-3 cursor-pointer transition-all ${data.productType === "physical" ? "border-[#00a896] bg-teal-50/10" : "border-slate-200"}`}>
            <input type="radio" name="productType" checked={data.productType === "physical"} onChange={() => handleChange("productType", "physical")} className="mt-1 accent-[#00a896]" />
            <div>
              <p className="font-bold text-slate-800 text-xs">Physical</p>
              <p className="text-[11px] text-slate-400">A tangible product that you will ship to buyers</p>
            </div>
          </label>
          <label className={`border rounded-sm p-4 flex items-start gap-3 cursor-pointer transition-all ${data.productType === "digital" ? "border-[#00a896] bg-teal-50/10" : "border-slate-200"}`}>
            <input type="radio" name="productType" checked={data.productType === "digital"} onChange={() => handleChange("productType", "digital")} className="mt-1 accent-[#00a896]" />
            <div>
              <p className="font-bold text-slate-800 text-xs">Digital</p>
              <p className="text-[11px] text-slate-400">A digital file that buyers will download</p>
            </div>
          </label>
        </div>
      </div>

      {/* 3. LISTING TYPE */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-3">Listing Type</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { id: "sale", title: "Add a Product for Sale", desc: "Add a product to sell on the site" },
            { id: "ordinary", title: "Add a Product or Service as an Ordinary Listing", desc: "Add a product or service without buy option" },
            { id: "quote", title: "Add a Product to Receive Quote (Price) Requests", desc: "Add a product without adding a price to get price requests from customers" },
            { id: "license", title: "Add a Product to Sell License Keys", desc: "Add a product to sell only license keys" }
          ].map((type) => (
            <label key={type.id} className={`border rounded-sm p-4 flex items-start gap-3 cursor-pointer transition-all ${data.listingType === type.id ? "border-[#00a896] bg-teal-50/10" : "border-slate-200"}`}>
              <input type="radio" name="listingType" checked={data.listingType === type.id} onChange={() => handleChange("listingType", type.id)} className="mt-1 accent-[#00a896]" />
              <div>
                <p className="font-bold text-slate-800 text-xs">{type.title}</p>
                <p className="text-[11px] text-slate-400">{type.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 4. CATEGORY & BRAND */}
      {/* 4. CHAIRED CATEGORIES (3-LEVEL) & BRAND SELECTION */}
      <div className="space-y-4 bg-slate-50/40 p-4 border border-slate-100 rounded-sm">
        <p className="text-xs font-bold text-slate-700 mb-2">Classification & Brand</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Level 1: Kategori Utama (Grandparent) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Main Category</label>
            <div className="relative">
              <select 
                value={selectedGrandparent} 
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedGrandparent(val);
                  setSelectedParent("");
                  handleChange("category", val); // Reset value utama di parent state
                }}
                disabled={loadingDb}
                className="w-full bg-white border border-slate-200 h-10 px-3 rounded-sm text-xs appearance-none focus:outline-none focus:border-[#00a896] cursor-pointer text-slate-700"
              >
                <option value="">{loadingDb ? "Loading..." : "Select Category"}</option>
                {grandparents.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Level 2: Sub-Kategori (Parent) - Muncul jika Level 1 Terpilih */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Sub Category</label>
            <div className="relative">
              <select 
                value={selectedParent} 
                disabled={!selectedGrandparent}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedParent(val);
                  handleChange("category", val);
                }}
                className="w-full bg-white border border-slate-200 h-10 px-3 rounded-sm text-xs appearance-none focus:outline-none focus:border-[#00a896] cursor-pointer text-slate-700 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Sub Category</option>
                {parents.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Level 3: Sub Sub-Kategori (Child) - Muncul jika Level 2 Memiliki Sub-Item */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Specific Type (Child)</label>
            <div className="relative">
              <select 
                value={data.category || ""} 
                disabled={!selectedParent || children.length === 0}
                onChange={(e) => handleChange("category", e.target.value)}
                className="w-full bg-white border border-slate-200 h-10 px-3 rounded-sm text-xs appearance-none focus:outline-none focus:border-[#00a896] cursor-pointer text-slate-700 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">{selectedParent && children.length === 0 ? "No deeper sub-category" : "Select Specific Type"}</option>
                {children.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Baris Pilihan Merek (Brand) Terintegrasi ID Dinamis */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Brand (Optional)</label>
          <div className="relative">
            <select 
              value={data.brand || ""} 
              onChange={(e) => handleChange("brand", e.target.value)}
              disabled={loadingDb}
              className="w-full bg-white border border-slate-200 h-10 px-3 rounded-sm text-xs appearance-none focus:outline-none focus:border-[#00a896] cursor-pointer text-slate-700"
            >
              <option value="">Select Brand</option>
              {dbBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* EXTERNAL LINK */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">External Link (Optional)</label>
        <input 
          type="url" 
          placeholder="e.g. https://domain.com/product_url" 
          value={data.externalLink || ""} 
          onChange={(e) => handleChange("externalLink", e.target.value)}
          className="w-full border border-slate-200 h-10 px-3 rounded-sm text-xs focus:outline-none focus:border-[#00a896]" 
        />
      </div>

      {/* 5. DETAILS: ENGLISH */}
      <div className="border border-slate-200 rounded-sm bg-white overflow-hidden">
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-slate-700 text-xs">
          Details: English
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Title</label>
            <input type="text" placeholder="Title" value={data.titleEn || ""} onChange={(e) => handleChange("titleEn", e.target.value)} className="w-full border border-slate-200 h-10 px-3 rounded-sm text-xs focus:outline-none focus:border-[#00a896]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={handleBrowseClick} className="flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-sm font-semibold hover:bg-slate-200/60 transition-colors cursor-pointer shadow-2xs"><ImageIcon className="w-3.5 h-3.5 text-slate-500" /> Add Image</button>
              <button type="button" onClick={() => setActiveLangModal("en")} className="flex items-center gap-1.5 text-xs bg-[#00a896] text-white px-3 py-1.5 rounded-sm font-semibold hover:bg-[#009282] transition-colors cursor-pointer shadow-2xs"><Sparkles className="w-3.5 h-3.5" /> AI Writer</button>
            </div>
            
            <Editor
              tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js"
              init={{
                height: 250,
                menubar: "file insert format table",
                plugins: "lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table code help wordcount",
                toolbar: "fullscreen code preview | undo redo | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | numlist bullist | forecolor backcolor | image media link",
                content_style: "body { font-family:Inter,sans-serif; font-size:12px; color:#475569 }",
                branding: false,
                promotion: false,
                setup: (editor: any) => {
                  editor.on('init', () => {
                    const notifications = document.querySelectorAll('.tox-notification');
                    notifications.forEach(n => (n as HTMLElement).style.display = 'none');
                  });
                }
              }}
              value={data.descEn || ""}
              onEditorChange={(content) => handleChange("descEn", content)}
            />
          </div>
        </div>
      </div>

      {/* 6. DETAILS: INDONESIAN */}
      <Accordion className="border border-slate-200 rounded-sm bg-white overflow-hidden">
        <AccordionItem value="indonesian" className="border-none">
          <AccordionTrigger className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 hover:no-underline font-bold text-slate-700 text-xs py-0 h-10">
            Details: Indonesian (Optional)
          </AccordionTrigger>
          <AccordionContent className="p-4 space-y-4 pb-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Judul (Title)</label>
              <input type="text" placeholder="Judul" value={data.titleId || ""} onChange={(e) => handleChange("titleId", e.target.value)} className="w-full border border-slate-200 h-10 px-3 rounded-sm text-xs focus:outline-none focus:border-[#00a896]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button type="button" onClick={handleBrowseClick} className="flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-sm font-semibold hover:bg-slate-200/60 transition-colors cursor-pointer shadow-2xs"><ImageIcon className="w-3.5 h-3.5 text-slate-500" /> Add Image</button>
                <button type="button" onClick={() => setActiveLangModal("id")} className="flex items-center gap-1.5 text-xs bg-[#00a896] text-white px-3 py-1.5 rounded-sm font-semibold hover:bg-[#009282] transition-colors cursor-pointer shadow-2xs"><Sparkles className="w-3.5 h-3.5" /> AI Writer</button>
              </div>

              <Editor
                tinymceScriptSrc="https://cdn.jsdelivr.net/npm/tinymce@6/tinymce.min.js"
                init={{
                  height: 250,
                  menubar: "file insert format table",
                  plugins: "lists link image charmap preview anchor code table wordcount",
                  toolbar: "undo redo | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | numlist bullist",
                  branding: false,
                  promotion: false,
                  content_style: "body { font-family:Inter,sans-serif; font-size:12px; color:#475569 }",
                  setup: (editor: any) => {
                    editor.on('init', () => {
                      const notifications = document.querySelectorAll('.tox-notification');
                      notifications.forEach(n => (n as HTMLElement).style.display = 'none');
                    });
                  }
                }}
                value={data.descId || ""}
                onEditorChange={(content) => handleChange("descId", content)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* NAV BUTTON */}
      <div className="flex justify-end pt-4">
        <button type="button" onClick={onNext} className="bg-[#00a896] hover:bg-[#009282] text-white font-semibold text-xs px-6 h-10 rounded-sm cursor-pointer transition-colors shadow-xs">
          Save and Continue
        </button>
      </div>

      <AIWriterModal 
        isOpen={activeLangModal !== null} 
        onClose={() => setActiveLangModal(null)} 
        onGenerate={handleAiOutput} 
        lang={activeLangModal || "en"}
      />
    </div>
  );
}