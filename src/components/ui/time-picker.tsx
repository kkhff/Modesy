"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function DateTimePicker({ value, onChange, disabled }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Sinkronisasi Date object dari string value
  const date = value ? new Date(value) : undefined;

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const baseDate = date ? new Date(date) : new Date();
      selectedDate.setHours(baseDate.getHours());
      selectedDate.setMinutes(baseDate.getMinutes());
      selectedDate.setSeconds(0);
      
      onChange(selectedDate.toISOString());
    }
  };

  const handleTimeChange = (type: "hour" | "minute" | "ampm", timeVal: string) => {
    const baseDate = date ? new Date(date) : new Date();

    if (type === "hour") {
      const isPM = baseDate.getHours() >= 12;
      const h = parseInt(timeVal);
      baseDate.setHours(isPM ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h));
    } else if (type === "minute") {
      baseDate.setMinutes(parseInt(timeVal));
    } else if (type === "ampm") {
      const h = baseDate.getHours() % 12;
      if (timeVal === "PM") {
        baseDate.setHours(h === 0 ? 12 : h + 12);
      } else {
        baseDate.setHours(h === 0 ? 0 : h);
      }
    }

    onChange(baseDate.toISOString());
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {/* 🌟 PERBAIKAN 1: PopoverTrigger langsung dirender sebagai Button bawaan Tailwind murni tanpa asChild agar terhindar dari type mismatch */}
      <PopoverTrigger
        disabled={disabled}
        type="button"
        className={cn(
          "w-full justify-start text-left font-normal border border-gray-200 bg-white rounded-sm text-xs h-9 px-3 text-slate-800 focus:border-[#00a896] hover:bg-slate-50 flex items-center inline-flex transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
          !date && "text-muted-foreground"
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
        {date ? (
          format(date, "MM/dd/yyyy hh:mm aa")
        ) : (
          <span>MM/DD/YYYY hh:mm aa</span>
        )}
      </PopoverTrigger>
      
      <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-lg rounded-sm z-50" align="start">
        <div className="sm:flex">
          {/* 🌟 PERBAIKAN 2: Mengubah initialFocus menjadi autoFocus bawaan React standard */}
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            autoFocus
          />
          <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x divide-gray-100 font-sans">
            
            {/* 1. SEKTOR SCROLL AREA JAM */}
            <ScrollArea className="w-full sm:w-auto overflow-y-auto">
              <div className="flex sm:flex-col p-2 gap-1">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    size="icon"
                    type="button"
                    variant={
                      date && ((date.getHours() % 12 === 0 ? 12 : date.getHours() % 12) === hour)
                        ? "default"
                        : "ghost"
                    }
                    className={cn(
                      "sm:w-full shrink-0 aspect-square h-8 w-8 text-xs font-bold flex items-center justify-center",
                      date && ((date.getHours() % 12 === 0 ? 12 : date.getHours() % 12) === hour) && "bg-[#00a896] text-white hover:bg-[#009282]"
                    )}
                    onClick={() => handleTimeChange("hour", hour.toString())}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>

            {/* 2. SEKTOR SCROLL AREA MENIT */}
            <ScrollArea className="w-full sm:w-auto overflow-y-auto">
              <div className="flex sm:flex-col p-2 gap-1">
                {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                  <Button
                    key={minute}
                    size="icon"
                    type="button"
                    variant={
                      date && date.getMinutes() === minute
                        ? "default"
                        : "ghost"
                    }
                    className={cn(
                      "sm:w-full shrink-0 aspect-square h-8 w-8 text-xs font-bold flex items-center justify-center",
                      date && date.getMinutes() === minute && "bg-[#00a896] text-white hover:bg-[#009282]"
                    )}
                    onClick={() => handleTimeChange("minute", minute.toString())}
                  >
                    {String(minute).padStart(2, "0")}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="sm:hidden" />
            </ScrollArea>

            {/* 3. SEKTOR PENGATUR AM / PM */}
            <ScrollArea className="overflow-y-auto">
              <div className="flex sm:flex-col p-2 gap-1">
                {["AM", "PM"].map((ampm) => (
                  <Button
                    key={ampm}
                    size="icon"
                    type="button"
                    variant={
                      date &&
                      ((ampm === "AM" && date.getHours() < 12) ||
                        (ampm === "PM" && date.getHours() >= 12))
                        ? "default"
                        : "ghost"
                    }
                    className={cn(
                      "sm:w-full shrink-0 aspect-square h-8 w-8 text-xs font-bold flex items-center justify-center",
                      date &&
                      ((ampm === "AM" && date.getHours() < 12) ||
                        (ampm === "PM" && date.getHours() >= 12)) && "bg-[#00a896] text-white hover:bg-[#009282]"
                    )}
                    onClick={() => handleTimeChange("ampm", ampm)}
                  >
                    {ampm}
                  </Button>
                ))}
              </div>
            </ScrollArea>

          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}