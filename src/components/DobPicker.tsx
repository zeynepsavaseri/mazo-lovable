import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type View = "year" | "month" | "day";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);

interface DobPickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
}

export function DobPicker({ value, onChange }: DobPickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("year");
  const [selectedYear, setSelectedYear] = useState<number | null>(value?.getFullYear() ?? null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(value != null ? value.getMonth() : null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(value ?? new Date());

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      // Reset to year view when opening if no value set
      if (!value) {
        setView("year");
        setSelectedYear(null);
        setSelectedMonth(null);
      } else {
        setView("day");
        setSelectedYear(value.getFullYear());
        setSelectedMonth(value.getMonth());
        setCalendarMonth(value);
      }
    }
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setView("month");
  };

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
    const newMonth = new Date(selectedYear!, month, 1);
    setCalendarMonth(newMonth);
    setView("day");
  };

  const handleDaySelect = (date: Date | undefined) => {
    onChange(date);
    if (date) setOpen(false);
  };

  const handleHeaderClick = () => {
    if (view === "day") setView("month");
    else if (view === "month") setView("year");
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "mt-1.5 w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : <span>Select date of birth</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        {view === "year" && (
          <div className="p-3 w-[280px]">
            <p className="text-sm font-semibold text-center mb-3">Select Year</p>
            <div className="grid grid-cols-4 gap-1.5 max-h-[280px] overflow-y-auto">
              {years.map((y) => (
                <Button
                  key={y}
                  variant={y === selectedYear ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => handleYearSelect(y)}
                >
                  {y}
                </Button>
              ))}
            </div>
          </div>
        )}

        {view === "month" && (
          <div className="p-3 w-[280px]">
            <div className="flex items-center gap-2 mb-3">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView("year")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-sm font-semibold flex-1 text-center">{selectedYear}</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((m, i) => (
                <Button
                  key={m}
                  variant={i === selectedMonth ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-9"
                  onClick={() => handleMonthSelect(i)}
                >
                  {m.slice(0, 3)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {view === "day" && (
          <div>
            <div className="flex items-center justify-center pt-2 px-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold hover:bg-muted"
                onClick={handleHeaderClick}
              >
                {selectedYear && selectedMonth != null
                  ? `${MONTHS[selectedMonth]} ${selectedYear}`
                  : "Select date"}
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDaySelect}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
